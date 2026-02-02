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

/* ───────── Helpers ───────── */

/**
 * Count ALL track types safely
 */
function countTracks(kml) {
  const lineStrings = (kml.match(/<LineString>/g) || []).length;
  const gxTracks = (kml.match(/<gx:Track>/g) || []).length;
  return lineStrings + gxTracks;
}

/* ───────────── Parse KMZ ───────────── */
async function parseKmz(req, res) {
  const { fileId } = req.params;
  const { fileName } = req.body;

  const data = await kmzParserService.parseAndStoreKmz(
    fileId,
    fileName
  );

  res.json({ status: "parsed", data });
}

/* ───────────── Get Parsed KMZ ───────────── */
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

/* ───────────── Save Edited KMZ as Copy ───────────── */
function normalizeKmzName(name) {
  return name
    .trim()
    .replace(/\.kmz$/i, "")          // remove .kmz if user typed it
    .replace(/[^a-zA-Z0-9-_]/g, "_") // safe characters only
    .replace(/_+/g, "_")
    .toLowerCase();
}

async function saveEditedKmzCopy(req, res) {
  try {
    const { fileId } = req.params;
const {
  editedTracks = [],
  editedPoints = [],
  fileName
} = req.body;

    console.log("🧩 SAVE COPY REQUEST");
    console.log("Original fileId:", fileId);
    console.log("Custom fileName:", fileName);
    console.log("Edited photo points:", editedPoints?.length || 0);

    /* ───────── Filename handling ───────── */
    function normalizeKmzName(name) {
      return name
        .trim()
        .replace(/\.kmz$/i, "")          // remove .kmz if provided
        .replace(/[^a-zA-Z0-9-_]/g, "_") // safe chars
        .replace(/_+/g, "_")
        .toLowerCase();
    }

    const baseName = fileName
      ? normalizeKmzName(fileName)
      : `edited-${fileId}`;

    const outputName = `${baseName}.kmz`;

    /* ───────── Temp setup ───────── */
    const tmpDir = path.join(__dirname, "../../tmp");
    fs.mkdirSync(tmpDir, { recursive: true });

    const originalKmzPath = path.join(tmpDir, `${fileId}.kmz`);
    const editedKmlPath = path.join(tmpDir, `${baseName}.kml`);
    const editedKmzPath = path.join(tmpDir, outputName);

    /* 1️⃣ Download original KMZ */
    await downloadFile(fileId, originalKmzPath);

    /* 2️⃣ Extract original KML */
    const kmlPath = extractKmlFromKmz(originalKmzPath, fileId);
    let kml = fs.readFileSync(kmlPath, "utf-8");

    /* 3️⃣ Load ORIGINAL parsed track from DB */
    const originalParsed = await KmzParsed.findOne({
      driveFileId: fileId
    });

    if (!originalParsed || !originalParsed.tracks?.length) {
      return res.status(400).json({
        message: "Original track not found in database"
      });
    }

    const originalTrackCoords = originalParsed.tracks[0].coordinates;

    /* 5️⃣ REMOVE gx:Track completely */
    kml = kml.replace(/<gx:Track>[\s\S]*?<\/gx:Track>/g, "");

    /* 6️⃣ Append ORIGINAL track as static LineString */
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


console.log("Edited tracks received:", editedTracks.length);


    /* 8️⃣ Replace photo points */
    if (Array.isArray(editedPoints) && editedPoints.length > 0) {
      kml = replacePhotoPoints(kml, editedPoints);
    }

    /* 9️⃣ Write edited KML */
    fs.writeFileSync(editedKmlPath, kml);

    /* 🔟 Create edited KMZ */
    const zip = new AdmZip();

    // KML must be named doc.kml
    zip.addFile("doc.kml", Buffer.from(kml, "utf-8"));

    // Include images from BOTH original and edited source
// Include images from ORIGINAL file only
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

    console.log("✅ Edited KMZ created:", editedKmzPath);

    /* 1️⃣1️⃣ Upload KMZ copy to Drive */
    const uploaded = await uploadKmzCopy({
      localPath: editedKmzPath,
      name: outputName
    });

    /* 1️⃣2️⃣ Re-parse uploaded KMZ */
    const parsed = await kmzParserService.parseAndStoreKmz(
      uploaded.id,
      uploaded.name
    );

    console.log("PARSED TRACK COUNT:", parsed.tracks.length);

    /* ✅ Respond */
    res.json({
      status: "ok",
      message: "Edited KMZ saved as copy",
      file: {
        id: uploaded.id,
        name: uploaded.name
      }
    });

  } catch (err) {
    console.error("❌ SAVE COPY ERROR:", err);
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
