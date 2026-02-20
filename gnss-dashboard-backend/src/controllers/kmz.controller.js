const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const { downloadFile } = require("../services/drive.download");
const { uploadKmzCopy } = require("../services/drive.upload");
const { extractKmlFromKmz } = require("../utils/kmz.extract");

const {
  replacePhotoPoints,
  appendEditedTrackPlacemark,
  appendOriginalTrackAsLineString
} = require("../utils/kml.write");

const KmzParsed = require("../models/KmzParsed");
const kmzParserService = require("../services/kmz.parse.service");

const Assignment = require("../models/Assignment");
const AssignmentActivity = require("../models/AssignmentActivity");
const KmzActivity = require("../models/KmzActivity"); // NEW

/* ───────── Parse KMZ ───────── */
async function parseKmz(req, res) {
  const { fileId } = req.params;
  const { fileName } = req.body;

  const data = await kmzParserService.parseAndStoreKmz(
    fileId,
    fileName
  );

  /* KMZ-level log (always) */
  await KmzActivity.create({
    fileId,
    fileName,
    userId: req.user?.id || null,
    action: "KMZ_PARSED"
  });

  /* Assignment log (only if assigned) */
  const assignment = await Assignment.findOne({ surveyId: fileId });

  if (assignment) {
    await AssignmentActivity.create({
      assignmentId: assignment._id,
      userId: req.user?.id || null,
      action: "KMZ_PARSED",
      meta: { fileId, fileName }
    });
  }

  res.json({ status: "parsed", data });
}

/* ───────── Get Parsed KMZ ───────── */
async function getParsedKmz(req, res) {
  const { fileId } = req.params;
  const data = await KmzParsed.findOne({ driveFileId: fileId });

  if (!data) {
    return res.status(404).json({ message: "KMZ not parsed yet" });
  }

  const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

  const pointsWithUrls = data.points.map(p => ({
    ...p.toObject(),
    imageUrl: p.imageFile
      ? `${BASE_URL}/kmz-images/${fileId}/${p.imageFile}`
      : null
  }));

  res.json({
    ...data.toObject(),
    points: pointsWithUrls
  });
}

/* ───────── Save Edited KMZ Copy ───────── */
async function saveEditedKmzCopy(req, res) {
  try {
    const { fileId } = req.params;

    const {
      editedTracks = [],
      editedPoints = [],
      fileName
    } = req.body;

    function normalizeKmzName(name) {
      return name
        .trim()
        .replace(/\.kmz$/i, "")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .replace(/_+/g, "_")
        .toLowerCase();
    }

    const baseName = fileName
      ? normalizeKmzName(fileName)
      : `edited-${fileId}`;

    const outputName = `${baseName}.kmz`;

    const tmpDir = path.join(__dirname, "../../tmp");
    fs.mkdirSync(tmpDir, { recursive: true });

    const originalKmzPath = path.join(tmpDir, `${fileId}.kmz`);
    const editedKmlPath = path.join(tmpDir, `${baseName}.kml`);
    const editedKmzPath = path.join(tmpDir, outputName);

    await downloadFile(fileId, originalKmzPath);

    const kmlPath = extractKmlFromKmz(originalKmzPath, fileId);
    let kml = fs.readFileSync(kmlPath, "utf-8");

    const originalParsed = await KmzParsed.findOne({
      driveFileId: fileId
    });

    const originalTrackCoords =
      originalParsed.tracks[0].coordinates;

    kml = kml.replace(/<gx:Track>[\s\S]*?<\/gx:Track>/g, "");

    if (!kml.includes("Original Track (Static)")) {
      kml = appendOriginalTrackAsLineString(
        kml,
        originalTrackCoords
      );
    }

    if (Array.isArray(editedTracks) && editedTracks.length > 0) {
      editedTracks.forEach((t, index) => {
        if (!Array.isArray(t.coordinates) || t.coordinates.length < 2) return;

        kml = appendEditedTrackPlacemark(
          kml,
          t.coordinates,
          t.name || `Edited Track ${index + 1}`
        );
      });
    }

    if (Array.isArray(editedPoints) && editedPoints.length > 0) {
      kml = replacePhotoPoints(kml, editedPoints);
    }

    fs.writeFileSync(editedKmlPath, kml);

    const zip = new AdmZip();
    zip.addFile("doc.kml", Buffer.from(kml, "utf-8"));

    const imageDir = path.join(
      __dirname,
      "../../public/kmz-images",
      fileId
    );

    if (fs.existsSync(imageDir)) {
      fs.readdirSync(imageDir).forEach(img => {
        zip.addLocalFile(path.join(imageDir, img), "", img);
      });
    }

    zip.writeZip(editedKmzPath);

    const uploaded = await uploadKmzCopy({
      localPath: editedKmzPath,
      name: outputName
    });

    await kmzParserService.parseAndStoreKmz(
      uploaded.id,
      uploaded.name
    );

    /* KMZ log (always) */
    await KmzActivity.create({
      fileId,
      fileName,
      userId: req.user.id,
      action: "KMZ_EDITED_COPY_SAVED",
      meta: {
        newFileId: uploaded.id,
        newFileName: uploaded.name,
        tracksEdited: editedTracks.length,
        photoPointsEdited: editedPoints.length
      }
    });

    /* Assignment log (if exists) */
    const assignment = await Assignment.findOne({
      surveyId: fileId
    });

    if (assignment) {
      await AssignmentActivity.create({
        assignmentId: assignment._id,
        userId: req.user.id,
        action: "KMZ_EDITED_COPY_SAVED",
        meta: {
          originalFileId: fileId,
          newFileId: uploaded.id,
          newFileName: uploaded.name
        }
      });
    }

    res.json({
      status: "ok",
      message: "Edited KMZ saved as copy",
      file: {
        id: uploaded.id,
        name: uploaded.name
      }
    });

  } catch (err) {
    console.error("SAVE COPY ERROR:", err);
    res.status(500).json({
      message: "Failed to save edited KMZ",
      error: err.message
    });
  }
}

module.exports = {
  parseKmz,
  getParsedKmz,
  saveEditedKmzCopy
};
