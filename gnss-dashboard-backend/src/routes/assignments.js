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
const { calculateMinDistance } = require("../utils/geoDistance");
const { mergeKmzFiles } = require("../services/kmzMergeService");
const { 
  calculateDeviation
} = require("../controllers/deviation.controller");
async function areAllSegmentsCompleted(groupId) {

  const assignments = await Assignment.find({
    assignmentGroupId: groupId
  });

  if (!assignments.length) return false;

  return assignments.every(a => a.status === "completed");
}
/* ───────── ASSIGN SURVEY ───────── */
/* ───────── ASSIGN SURVEY ───────── */
router.post(
  "/assign",
  verifyToken,
  requirePermission("ASSIGN_SURVEY"),
  async (req, res) => {
    try {

      const {
        surveyId,
        surveyName,
        userId,
        segmentIndex = 0,
        totalSegments = 1,
        segmentTracks = []
      } = req.body;
const assignmentGroupId =
  req.body.assignmentGroupId ||
  `${surveyId}_${Date.now()}`;
      const existingSegmentForUser = await Assignment.findOne({
  assignmentGroupId,
  segmentIndex,
  assignedTo: userId,
  status: { $in: ["pending", "in_progress"] }
});

if (existingSegmentForUser) {
  return res.status(400).json({
    error: `Segment ${segmentIndex + 1} already assigned to this user`
  });
}

      /* 3️⃣ Get full reference track (unchanged) */
      const referenceTrack =
        await getKmzTrackFromSurveyId(surveyId);

      /* 4️⃣ Create assignment */
     const assignment = await Assignment.create({
  surveyId,
  assignmentGroupId,
  surveyName,
  assignedTo: userId,
  status: "pending",
  recordedTrack: [],
  segmentIndex,
  totalSegments,
  segmentReferenceTracks: segmentTracks
});
      /* 5️⃣ Activity log */
      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "ASSIGNED",
        meta: {
          surveyName,
          assignedTo: userId,
          segmentIndex,
          totalSegments
        }
      });

      res.json(assignment);

    } catch (err) {
      console.error("ASSIGN ERROR:", err);
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

      /* ✅ CHECK ASSIGNMENT EXISTS */

      if (!assignment) {
        return res.status(404).json({
          error: "Assignment not found"
        });
      }

      /* ✅ ENSURE ALL SEGMENTS COMPLETED */

     const allCompleted = await areAllSegmentsCompleted(
  assignment.assignmentGroupId
);

      if (!allCompleted) {
        return res.status(400).json({
          error: "All segments must be completed before approval"
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

const surveyAssignments = await Assignment.find({
  assignmentGroupId: assignment.assignmentGroupId,
  status: "completed"
}).sort({ segmentIndex: 1 });

      if (!surveyAssignments.length) {
        return res.status(400).json({
          error: "No completed segment KMZ files found"
        });
      }

      /* 🔥 MERGE KMZ FILES */

      const mergedKmzPath = await mergeKmzFiles(
        surveyAssignments,
        finalName
      );

      /* 🔥 UPLOAD MERGED KMZ TO GOOGLE DRIVE */

      const driveFile = await uploadKmzCopy({
        localPath: mergedKmzPath,
        name: finalName.trim() + ".kmz"
      });

      /* 🔥 MARK ALL SEGMENTS APPROVED */

  await Assignment.updateMany(
{
  assignmentGroupId: assignment.assignmentGroupId
},
{
  status: "pending",
  recordedTrack: [],
  photos: [],
  submittedKmzPath: null,
  deviationAnalyses: new Map(),
  completedAt: null,
  approvedAt: null,
  approvedBy: null
}
);
      /* 🔥 ACTIVITY LOG */

      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "SURVEY_APPROVED",
        meta: {
          surveyId: assignment.surveyId,
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

      res.status(500).json({
        error: err.message
      });

    }
  }
);
/* ───────── REJECT ASSIGNMENT ───────── */
router.patch("/:id/reject", verifyToken, async (req, res) => {
  try {

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const { segmentIndex } = req.body;

    if (segmentIndex === undefined) {
      return res.status(400).json({
        error: "segmentIndex required"
      });
    }

    const targetSegment = await Assignment.findOne({
      assignmentGroupId: assignment.assignmentGroupId,
      segmentIndex
    });

    if (!targetSegment) {
      return res.status(404).json({
        error: "Segment not found"
      });
    }

    if (targetSegment.status !== "completed") {
      return res.status(400).json({
        error: "Segment is not completed yet"
      });
    }

    targetSegment.status = "pending";
    targetSegment.recordedTrack = [];
    targetSegment.deviationAnalyses = new Map();
    targetSegment.completedAt = null;

    await targetSegment.save();

    res.json({
      success: true,
      segmentIndex
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

      const queue = await Assignment.aggregate([
  {
    $match: {
      status: { $in: ["pending","in_progress","completed"] }
    }
  },
  {
  $group: {
      _id: "$assignmentGroupId",
      sampleAssignmentId: { $first: "$_id" },
    assignmentGroupId: { $first: "$assignmentGroupId" },
    surveyId: { $first: "$surveyId" },
    surveyName: { $first: "$surveyName" },
    createdAt: { $first: "$createdAt" },

    totalSegments: { $sum: 1 },

    completedSegments: {
      $sum: {
        $cond: [
          { $eq: ["$status", "completed"] },
          1,
          0
        ]
      }
    }
  }
},
  {
    $addFields: {
      status: {
        $cond: [
          { $eq: ["$completedSegments", "$totalSegments"] },
          "completed",
          {
            $cond: [
              { $gt: ["$completedSegments", 0] },
              "in_progress",
              "pending"
            ]
          }
        ]
      }
    }
  },
  {
    $sort: { createdAt: -1 }
  }
]);
     const populated = await Assignment.populate(queue, [
  { path: "surveyors", select: "username" }
]);

      res.json(populated);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
router.get("/:id/ai-analysis", getAIAnalysis);
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
  "/by-group/:groupId/activity",
  verifyToken,
  async (req, res) => {
    try {

      const assignments = await Assignment.find({
        assignmentGroupId: req.params.groupId
      }).select("_id");

      const ids = assignments.map(a => a._id);

      const logs = await AssignmentActivity.find({
        assignmentId: { $in: ids }
      })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

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
/* ───────── MERGED SURVEY TRACK (ALL SEGMENTS) ───────── */
router.get(
  "/survey-group/:groupId/merged-track",
  verifyToken,
  async (req, res) => {
    try{
    const assignments = await Assignment.find({
      assignmentGroupId: req.params.groupId,
      status: { $in: ["completed", "approved"] }
    }).sort({ segmentIndex: 1 });

      let referenceTrack = [];
      let recordedTrack = [];
      let photos = [];

      for (const a of assignments) {

        /* reference segments */
        if (Array.isArray(a.segmentReferenceTracks)) {

          for (const seg of a.segmentReferenceTracks) {

            if (!Array.isArray(seg)) continue;

            const cleaned = seg.filter(
              p => typeof p.lat === "number" && typeof p.lon === "number"
            );

            if (cleaned.length > 1) {
              referenceTrack.push(cleaned);
            }

          }

        }

        /* recorded segments */
        if (Array.isArray(a.recordedTrack)) {

          for (const seg of a.recordedTrack) {

            if (!Array.isArray(seg)) continue;

            const cleaned = seg.filter(
              p => typeof p.lat === "number" && typeof p.lon === "number"
            );

            if (cleaned.length > 1) {
              recordedTrack.push(cleaned);
            }

          }

        }

        /* photos */
        if (Array.isArray(a.photos)) {
          photos.push(...a.photos);
        }

      }
console.log("REFERENCE SEGMENTS:", referenceTrack.length);
console.log("RECORDED SEGMENTS:", recordedTrack.length);
      res.json({
        referenceTrack,
        recordedTrack,
        photos
      });

    } catch (err) {

      console.error("MERGED TRACK ERROR:", err);

      res.status(500).json({
        error: err.message
      });

    }
  }
);
router.get(
  "/survey-group/:groupId/deviation-analysis",
  verifyToken,
  async (req, res) => {
    try {

      const threshold = Number(req.query.threshold) || 3;

      const assignments = await Assignment.find({
        assignmentGroupId: req.params.groupId,
        status: { $in: ["completed", "approved"] }
      }).sort({ segmentIndex: 1 });

      if (!assignments.length) {
        return res.json({
          deviations: [],
          totalPoints: 0,
          deviatedPoints: 0,
          deviationPercent: 0
        });
      }

      let referenceTrack = [];
      let recordedTrack = [];

      for (const a of assignments) {

        /* reference segments */
        if (a.segmentReferenceTracks?.length) {
          for (const seg of a.segmentReferenceTracks) {
            referenceTrack.push(...seg);
          }
        }

        /* recorded segments */
        if (a.recordedTrack?.length) {
          for (const seg of a.recordedTrack) {
            recordedTrack.push(...seg);
          }
        }

      }

      if (!referenceTrack.length || !recordedTrack.length) {
        return res.json({
          deviations: [],
          totalPoints: 0,
          deviatedPoints: 0,
          deviationPercent: 0
        });
      }

      const result = calculateDeviation(
        referenceTrack,
        recordedTrack,
        threshold
      );

      res.json(result);

    } catch (err) {

      console.error("SURVEY DEVIATION ERROR:", err);

      res.status(500).json({
        error: err.message
      });

    }
  }
);
router.post(
  "/:id/submit-kmz",
  verifyToken,
  upload.single("kmz"),
  submitKmz
);
router.get(
  "/live-surveyors",
  verifyToken,
  async (req, res) => {
    try {

      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const AuthUser = require("../models/AuthUser");

      const TWO_MINUTES = 2 * 60 * 1000;
      const cutoff = new Date(Date.now() - TWO_MINUTES);

      const surveyors = await AuthUser.find({})
  .select("username role lastLocation lastLocationAt activeAssignment isActive isOnBreak breakStartTime")
  .populate("activeAssignment", "surveyName status");

      const result = surveyors.map(user => {

        const recentlyUpdated =
          user.lastLocationAt &&
          user.lastLocationAt >= cutoff;

        const online =
          user.isActive && recentlyUpdated;

        return {
  ...user.toObject(),
  online,
  isOnBreak: user.isOnBreak || false
};
      });

      res.json(result);

    } catch (err) {
      console.error("LIVE SURVEYORS ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
router.get(
  "/live-surveyors/:userId/proximity",
  verifyToken,
  async (req, res) => {
    try {

      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const { userId } = req.params;

      const AuthUser = require("../models/AuthUser");

      const user = await AuthUser.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "Surveyor not found" });
      }

      if (!user.lastLocation?.lat || !user.lastLocation?.lng) {
        return res.status(400).json({
          error: "Surveyor has no live location"
        });
      }

      // 🔥 Normalize user location (convert lng → lon)
      const userPoint = {
        lat: user.lastLocation.lat,
        lon: user.lastLocation.lng
      };

      const assignments = await Assignment.find({
        assignedTo: userId,
        status: { $in: ["pending", "in_progress"] }
      }).select("surveyName segmentReferenceTracks status");

      if (!assignments.length) {
        return res.json({
          nearestAssignment: null,
          minDistance: null,
          message: "No active assignments"
        });
      }

      let results = [];

      for (const assignment of assignments) {

        if (!assignment.segmentReferenceTracks?.length) {
          continue;
        }

        const track = assignment.segmentReferenceTracks;
        const minDistance = calculateMinDistance(
          userPoint,
          track
        );

        results.push({
          assignmentId: assignment._id,
          surveyName: assignment.surveyName,
          status: assignment.status,
          minDistance: Math.round(minDistance)
        });
      }

      if (!results.length) {
        return res.json({
          nearestAssignment: null,
          minDistance: null,
          message: "No valid reference tracks"
        });
      }

      // Sort by nearest
      results.sort((a, b) => a.minDistance - b.minDistance);

      res.json({
        nearestAssignment: results[0],
        allAssignments: results
      });

    } catch (err) {
      console.error("PROXIMITY ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
router.delete(
  "/:id/unassign",
  verifyToken,
  requirePermission("ASSIGN_SURVEY"),
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Optional safety: only allow unassign if not approved
      if (assignment.status === "approved") {
        return res.status(400).json({
          error: "Approved assignments cannot be unassigned"
        });
      }

      // Log activity before delete (optional but recommended)
      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "UNASSIGNED",
        meta: {
          surveyName: assignment.surveyName,
          previousUser: assignment.assignedTo
        }
      });

      await assignment.deleteOne();

      res.json({ success: true });

    } catch (err) {
      console.error("UNASSIGN ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── SURVEYOR PENDING COUNTS ───────── */
router.get(
  "/surveyor-pending-counts",
  verifyToken,
  async (req, res) => {
    try {

      const role = req.user.role;

      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const AuthUser = require("../models/AuthUser");

      // Get all surveyors
      const surveyors = await AuthUser.find({
        role: { $in: ["ROLE_4"] }   // adjust if your surveyor role is different
      }).select("username role");

      // Aggregate pending assignments
      const pendingCounts = await Assignment.aggregate([
        {
          $match: {
            status: "pending"
          }
        },
        {
          $group: {
            _id: "$assignedTo",
            pendingCount: { $sum: 1 }
          }
        }
      ]);

      const pendingMap = {};

      pendingCounts.forEach(p => {
        pendingMap[p._id.toString()] = p.pendingCount;
      });

      const result = surveyors.map(user => ({
        _id: user._id,
        username: user.username,
        pendingAssignments: pendingMap[user._id.toString()] || 0
      }));

      res.json(result);

    } catch (err) {
      console.error("SURVEYOR COUNT ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
router.get(
  "/group/:groupId/surveyors",
  verifyToken,
  async (req, res) => {
    try {

      const assignments = await Assignment.find({
        assignmentGroupId: req.params.groupId
      })
      .populate("assignedTo", "username")
      .select("assignedTo segmentIndex status");

      const result = assignments.map(a => ({
        username: a.assignedTo?.username,
        segmentIndex: a.segmentIndex,
        status: a.status
      }));

      res.json(result);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
/* ───────── SURVEY STATUS (FOR FIELD DASHBOARD) ───────── */
router.get(
  "/survey-status",
  verifyToken,
  async (req, res) => {
    try {

      const role = req.user.role;
      if (role !== "ADMIN" && role !== "ROLE_5") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const surveys = await Assignment.aggregate([
        {
  $group: {
    _id: "$assignmentGroupId",

    assignmentGroupId: { $first: "$assignmentGroupId" },
    surveyId: { $first: "$surveyId" },
    surveyName: { $first: "$surveyName" },
    createdAt: { $first: "$createdAt" },

    totalSegments: { $sum: 1 },

    completedSegments: {
      $sum: {
        $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
      }
    },

    approvedSegments: {
      $sum: {
        $cond: [{ $eq: ["$status", "approved"] }, 1, 0]
      }
    },

    users: {
      $push: {
        userId: "$assignedTo",
        segmentIndex: "$segmentIndex",
        status: "$status"
      }
    }
  }
},

        {
          $addFields: {
            status: {
              $cond: [
                { $eq: ["$approvedSegments", "$totalSegments"] },
                "approved",
                {
                  $cond: [
                    { $eq: ["$completedSegments", "$totalSegments"] },
                    "completed",
                    {
                      $cond: [
                        { $gt: ["$completedSegments", 0] },
                        "in_progress",
                        "pending"
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },

        { $sort: { createdAt: -1 } }
      ]);

      const populated = await Assignment.populate(
        surveys,
        { path: "users.userId", select: "username" }
      );

      res.json(populated);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
module.exports = router;
