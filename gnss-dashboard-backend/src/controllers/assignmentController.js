const Assignment = require("../models/Assignment");
const KmzParsed = require("../models/KmzParsed");
const AssignmentActivity = require("../models/AssignmentActivity");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");
exports.getAssignmentTrack = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({
      referenceTrack: assignment.referenceTrack || [],
      recordedTrack: assignment.recordedTrack || [],
      photos: assignment.photos || []   // 🔥 ADD THIS
    });

  } catch (err) {
    console.error("TRACK CONTROLLER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.rejectAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // 🔥 Only allow reject if currently completed
    if (assignment.status !== "completed") {
      return res.status(400).json({
        message: "Only completed assignments can be rejected"
      });
    }

    // 🔥 1. Change status
    assignment.status = "pending";

    // 🔥 2. Invalidate previous submission
    assignment.submissionVersion =
      (assignment.submissionVersion || 1) + 1;

    // 🔥 3. Clear recorded tracks on server
    assignment.recordedTrackSegments = [];

    // 🔥 4. Clear deviation cache
    assignment.deviationAnalyses = new Map();

    await assignment.save();

    res.json({
      message: "Assignment rejected successfully",
      submissionVersion: assignment.submissionVersion
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reject failed" });
  }
};
exports.submitKmz = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "KMZ file missing" });
    }

    const BASE_URL =
      process.env.BASE_URL || "http://localhost:5000";

    const kmzPath = req.file.path;

    /* ───────── UNZIP KMZ ───────── */
    const zip = new AdmZip(kmzPath);

    const extractPath = path.join(
      path.dirname(kmzPath),
      `extract_${Date.now()}`
    );

    zip.extractAllTo(extractPath, true);

    const kmlPath = path.join(extractPath, "doc.kml");

    if (!fs.existsSync(kmlPath)) {
      return res.status(400).json({ message: "doc.kml not found" });
    }

    const kmlContent = fs.readFileSync(kmlPath, "utf8");
    const parsed = await xml2js.parseStringPromise(kmlContent);

    const placemarks =
      parsed.kml.Document[0].Placemark || [];

    const referenceTrack = [];
    const recordedTrack = [];
    const photos = [];

    /* ───────── CREATE PUBLIC IMAGE DIR ───────── */
    const publicDir = path.join(
      process.cwd(),
      "public",
      "submitted-kmz",
      assignment._id.toString()
    );

    fs.mkdirSync(publicDir, { recursive: true });

    /* ───────── PARSE PLACEMARKS ───────── */

    for (const pm of placemarks) {

      const name = pm.name ? pm.name[0] : "";

      /* TRACKS */
      if (pm.LineString) {

        const coords =
          pm.LineString[0].coordinates[0]
            .trim()
            .split(/\s+/);

        const segment = coords.map(c => {
          const [lon, lat] = c.split(",");
          return {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
          };
        });

        if (name === "Reference Track") {
          referenceTrack.push(segment);
        }

        if (name === "Recorded Track") {
          recordedTrack.push(segment);
        }
      }

      /* MEDIA POINTS (PHOTO / VIDEO) */
if (pm.Point && pm.description) {

  const coordText = pm.Point[0].coordinates[0];
  const [lon, lat] = coordText.split(",");

let descriptionRaw = pm.description[0] || "";

/* Decode escaped HTML from xml2js */
descriptionRaw = descriptionRaw
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"');
  let imageUrl = null;
  let videoUrl = null;

  /* ───────── IMAGE DETECTION ───────── */
  const imgMatch = descriptionRaw.match(/images\/([^"]+)/);

  if (imgMatch) {

    const imageFile = imgMatch[1];

    const sourceImagePath =
      path.join(extractPath, "images", imageFile);

    const targetImagePath =
      path.join(publicDir, imageFile);

    if (fs.existsSync(sourceImagePath)) {

      fs.copyFileSync(sourceImagePath, targetImagePath);

      imageUrl =
        `${BASE_URL}/submitted-kmz/${assignment._id}/${imageFile}`;
    }
  }

  /* ───────── VIDEO DETECTION ───────── */
const vidMatch = descriptionRaw.match(/videos\/([^\s"]+\.mp4)/i);
  if (vidMatch) {

    const videoFile = vidMatch[1];

    const sourceVideoPath =
      path.join(extractPath, "videos", videoFile);

    const targetVideoDir =
      path.join(publicDir, "videos");

    fs.mkdirSync(targetVideoDir, { recursive: true });

    const targetVideoPath =
      path.join(targetVideoDir, videoFile);

    if (fs.existsSync(sourceVideoPath)) {

      fs.copyFileSync(sourceVideoPath, targetVideoPath);

      videoUrl =
        `${BASE_URL}/submitted-kmz/${assignment._id}/videos/${videoFile}`;
    }
  }

  /* ───────── CLEAN DESCRIPTION ───────── */

  let cleanDescription = "";

  if (descriptionRaw) {

    cleanDescription = descriptionRaw
      .replace(/<img[^>]*>/, "")
      .replace(/<video[^>]*>/, "")
      .replace(/<source[^>]*>/, "")
      .replace(/<br\/?>/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  photos.push({
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    imageUrl,
    videoUrl,
    timestamp: Date.now(),
    description: cleanDescription
  });
}
    }
    /* ───────── SAVE TO DB ───────── */

    assignment.recordedTrack = recordedTrack;

    // ⚠️ DO NOT overwrite referenceTrack unless needed
    // assignment.referenceTrack = referenceTrack;

    assignment.photos = photos;
    assignment.status = "completed";
assignment.submittedKmzPath = kmzPath;
    await assignment.save();

    await AssignmentActivity.create({
      assignmentId: assignment._id,
      userId: req.user.id,
      action: "KMZ_SUBMITTED",
      meta: {
        recordedSegments: recordedTrack.length,
        photos: photos.length
      }
    });

    res.json({
      message: "KMZ parsed and stored",
      recordedSegments: recordedTrack.length,
      photos: photos.length
    });

  } catch (err) {
    console.error("SUBMIT KMZ ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};