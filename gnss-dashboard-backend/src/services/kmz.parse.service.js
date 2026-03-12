const path = require("path");
const fs = require("fs");
const KmzParsed = require("../models/KmzParsed");
const { downloadFile } = require("./drive.download");
const { extractKmlFromKmz } = require("../utils/kmz.extract");
const { parseKml } = require("../parsers/kml.parser");
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
async function parseAndStoreKmz(fileId, fileName) {
  const kmzId = fileId;

  const tmpDir = path.join(__dirname, "../../tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const kmzPath = path.join(tmpDir, `${fileId}.kmz`);

  // ─── Download KMZ ─────────────────────────────
  await downloadFile(fileId, kmzPath);

  // ─── Extract KML + media ──────────────────────
  const kmlPath = extractKmlFromKmz(kmzPath, kmzId);

  // ─── Parse KML ────────────────────────────────
  const parsed = parseKml(kmlPath);

  // ─── Locate extracted images ──────────────────
  const imageDir = path.join(
    __dirname,
    "../../public/kmz-images",
    kmzId
  );

  let imageFiles = [];
  if (fs.existsSync(imageDir)) {
    imageFiles = fs
      .readdirSync(imageDir)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .sort();
  }

  // ─── Locate extracted videos ──────────────────
  const videoDir = path.join(
    __dirname,
    "../../public/kmz-videos",
    kmzId
  );

  let videoFiles = [];
  if (fs.existsSync(videoDir)) {
    videoFiles = fs
      .readdirSync(videoDir)
      .filter(f => /\.(mp4|mov|webm)$/i.test(f))
      .sort();
  }

  // 🔍 DEBUG
  console.log("KMZ IMAGE DIR:", imageDir);
  console.log("IMAGE FILES:", imageFiles);

  console.log("KMZ VIDEO DIR:", videoDir);
  console.log("VIDEO FILES:", videoFiles);

// ─── Attach images to photo placemarks ────────
const photoPoints = parsed.points.filter(
  p => p.name && p.name.startsWith("Photo @")
);

photoPoints.forEach((p, index) => {
  if (imageFiles[index]) {
    p.imageFile = imageFiles[index];
    p.imageUrl = `${BASE_URL}/kmz-images/${kmzId}/${imageFiles[index]}`;
  }
});

// ─── Attach videos to video placemarks ────────
const videoPoints = parsed.points.filter(
  p => p.name && p.name.startsWith("Video @")
);

videoPoints.forEach((p, index) => {
  if (videoFiles[index]) {
    p.videoFile = videoFiles[index];
    p.videoUrl = `${BASE_URL}/kmz-videos/${kmzId}/${videoFiles[index]}`;
  }
});

  // ─── Save to MongoDB ──────────────────────────
  const record = await KmzParsed.findOneAndUpdate(
    { driveFileId: fileId },
    {
      driveFileId: fileId,
      fileName,
      tracks: parsed.tracks,
      points: parsed.points
    },
    { upsert: true, new: true }
  );

  return record;
}

module.exports = { parseAndStoreKmz };