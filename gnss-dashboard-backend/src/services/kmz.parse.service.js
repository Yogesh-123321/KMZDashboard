const path = require("path");
const fs = require("fs");
const KmzParsed = require("../models/KmzParsed");
const { downloadFile } = require("./drive.download");
const { extractKmlFromKmz } = require("../utils/kmz.extract");
const { parseKml } = require("../parsers/kml.parser");

async function parseAndStoreKmz(fileId, fileName) {
  const kmzId = fileId;

  const tmpDir = path.join(__dirname, "../../tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const kmzPath = path.join(tmpDir, `${fileId}.kmz`);

  // ─── Download KMZ ─────────────────────────────
  await downloadFile(fileId, kmzPath);

  // ─── Extract KML + images ─────────────────────
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

  // 🔍 DEBUG (IMPORTANT — do NOT remove yet)
  console.log("KMZ IMAGE DIR:", imageDir);
  console.log("EXTRACTED IMAGE FILES:", imageFiles);

  // ─── Attach images ONLY to photo placemarks ────
  const photoPoints = parsed.points.filter(
    p => p.name && p.name.startsWith("Photo @")
  );

  photoPoints.forEach((p, index) => {
    if (imageFiles[index]) {
      p.imageFile = imageFiles[index];
    }
  });

  // ─── Save to MongoDB ───────────────────────────
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
