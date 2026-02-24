const express = require("express");
const Assignment = require("../models/Assignment");
const AssignmentActivity = require("../models/AssignmentActivity"); // NEW
const { verifyToken } = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");
const router = express.Router();
const { getAssignmentTrack } = require("../controllers/assignmentController");
const { getKmzTrackFromSurveyId } = require("../services/kmzTrackService");
const { getDeviationAnalysis } = require("../controllers/deviation.controller");
const { getAIAnalysis } = require("../controllers/aiController");
const upload = require("../middleware/upload");
const { submitKmz } = require("../controllers/assignmentController");
const { uploadKmzCopy } = require("../services/drive.upload.js");
/* ───────── ASSIGN SURVEY ───────── */
router.post(
  "/assign",
  verifyToken,
  requirePermission("ASSIGN_SURVEY"),
  async (req, res) => {
    try {
      const { surveyId, surveyName, userId } = req.body;

      const referenceTrack = await getKmzTrackFromSurveyId(surveyId);

      const assignment = await Assignment.create({
        surveyId,
        surveyName,
        assignedTo: userId,
        status: "pending",
        referenceTrack,
        recordedTrack: []
      });

      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "ASSIGNED",
        meta: {
          surveyName,
          assignedTo: userId
        }
      });

      res.json(assignment);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ───────── MY ASSIGNMENTS ───────── */
router.get(
  "/my",
  verifyToken,
  async (req, res) => {
    try {
      const assignments = await Assignment.find({
        assignedTo: req.user.id,
        status: { $ne: "approved" }
      });

      const stats = {
        assigned: assignments.length,
        pending: assignments.filter(a => a.status === "pending").length,
        completed: assignments.filter(a => a.status === "completed").length,
        in_progress: assignments.filter(a => a.status === "in_progress").length
      };

      res.json({ stats, assignments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ───────── ALL ASSIGNMENTS ───────── */
router.get(
  "/all",
  verifyToken,
  async (req, res) => {
    try {
      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const assignments = await Assignment.find()
        .populate("assignedTo", "username")
        .populate("approvedBy", "username")
        .sort({ createdAt: -1 });

      res.json(assignments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ───────── APPROVE ASSIGNMENT ───────── */
router.patch(
  "/:id/approve",
  verifyToken,
  async (req, res) => {
    try {

      const { finalName } = req.body;

      if (!finalName) {
        return res.status(400).json({
          error: "Final file name required"
        });
      }

      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          error: "Assignment not found"
        });
      }

      if (assignment.status !== "completed") {
        return res.status(400).json({
          error: "Only completed assignments can be approved"
        });
      }

      if (!assignment.submittedKmzPath) {
        return res.status(400).json({
          error: "No submitted KMZ found"
        });
      }

      /* 🔥 UPLOAD TO GOOGLE DRIVE */

      const driveFile = await uploadKmzCopy({
        localPath: assignment.submittedKmzPath,
        name: finalName.trim() + ".kmz"
      });

      /* 🔥 SAVE DRIVE FILE INFO */

      assignment.status = "approved";
      assignment.approvedAt = new Date();
      assignment.approvedBy = req.user.id;
      assignment.approvedDriveFileId = driveFile.id;

      await assignment.save();

      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "APPROVED",
        meta: {
          driveFileId: driveFile.id,
          fileName: finalName
        }
      });

      res.json({
        success: true,
        driveFileId: driveFile.id
      });

    } catch (err) {
      console.error("APPROVE ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── REJECT ASSIGNMENT ───────── */
router.patch(
  "/:id/reject",
  verifyToken,
  async (req, res) => {
    try {
      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (assignment.status !== "completed") {
        return res.status(400).json({
          error: "Only completed assignments can be rejected"
        });
      }

      // Move back to pending
      assignment.status = "pending";
      assignment.recordedTrack = [];
      assignment.recordedTrackSegments = [];
      assignment.deviationAnalyses = new Map();

      // Optional: clear completion metadata
      assignment.completedAt = null;
      assignment.approvedAt = null;
      assignment.approvedBy = null;

      await assignment.save();

      /* ACTIVITY LOG */
      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "REJECTED"
      });

      res.json({ success: true, assignment });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── APPROVAL QUEUE ───────── */
router.get(
  "/approval-queue",
  verifyToken,
  async (req, res) => {
    try {
      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const assignments = await Assignment.find({
        status: "completed"
      })
        .populate("assignedTo", "username")
        .populate("approvedBy", "username")
        .sort({ createdAt: -1 });

      res.json(assignments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
router.get(
  "/:id/activity",
  verifyToken,
  async (req, res) => {
    try {
      const activities = await AssignmentActivity.find({
        assignmentId: req.params.id
      })
        .populate("userId", "username")
        .sort({ createdAt: -1 });

      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
router.get(
  "/by-survey/:fileId/activity",
  verifyToken,
  async (req, res) => {
    try {
      const { fileId } = req.params;

      const assignment = await Assignment.findOne({
        surveyId: fileId
      });

      let logs = [];

      if (assignment) {
        logs = await AssignmentActivity.find({
          $or: [
            { assignmentId: assignment._id },
            { surveyId: fileId }
          ]
        })
          .populate("userId", "username")
          .sort({ createdAt: -1 });
      } else {
        logs = await AssignmentActivity.find({
          surveyId: fileId
        })
          .populate("userId", "username")
          .sort({ createdAt: -1 });
      }

      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── MARK ASSIGNMENT COMPLETED ───────── */
router.patch(
  "/:id/complete",
  verifyToken,
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // only assigned surveyor can complete
      if (assignment.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      assignment.status = "completed";
      await assignment.save();

      /* ACTIVITY LOG */
      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "COMPLETED"
      });

      res.json({ success: true, assignment });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── DEVIATION ANALYSIS ───────── */
router.get(
  "/:id/deviation-analysis",
  verifyToken,
  async (req, res, next) => {
    const role = req.user.role;

    if (role !== "ADMIN" && role !== "ROLE_5") {
      return res.status(403).json({
        error: "Not allowed"
      });
    }

    next();
  },
  getDeviationAnalysis
);
router.get("/:id/track", getAssignmentTrack);
/* ───────── UPDATE RECORDED TRACK ───────── */
router.patch(
  "/:id/recorded-track",
  verifyToken,
  async (req, res) => {

    console.log("🔥 RECORDED TRACK API HIT");

    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (assignment.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const { recordedTrack } = req.body;

      if (!Array.isArray(recordedTrack) || recordedTrack.length === 0) {
        return res.status(400).json({
          error: "recordedTrack must contain segments"
        });
      }

      // ✅ DO NOT WRAP AGAIN
      assignment.recordedTrack = recordedTrack;

      await assignment.save();

      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "TRACK_UPLOADED",
        meta: { segments: recordedTrack.length }
      });

      res.json({
        success: true,
        segmentsStored: assignment.recordedTrack.length
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
router.get("/:id/ai-analysis", getAIAnalysis);
router.post(
  "/:id/submit-kmz",
  verifyToken,
  upload.single("kmz"),
  submitKmz
);
module.exports = router;
