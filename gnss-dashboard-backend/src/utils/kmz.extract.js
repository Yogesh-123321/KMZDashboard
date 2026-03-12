const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

function extractKmlFromKmz(kmzPath, kmzId) {
  const zip = new AdmZip(kmzPath);
  const entries = zip.getEntries();

  // ─── Extract KML ─────────────────────────────
  const kmlEntry = entries.find(e => e.entryName.endsWith(".kml"));
  if (!kmlEntry) throw new Error("No KML found in KMZ");

  const tmpDir = path.join(__dirname, "../../tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const kmlPath = path.join(tmpDir, "doc.kml");
  fs.writeFileSync(kmlPath, kmlEntry.getData());

  // ─── Extract images ──────────────────────────
  const imageDir = path.join(
    __dirname,
    "../../public/kmz-images",
    kmzId
  );

  fs.mkdirSync(imageDir, { recursive: true });

  // ─── Extract videos ──────────────────────────
  const videoDir = path.join(
    __dirname,
    "../../public/kmz-videos",
    kmzId
  );

  fs.mkdirSync(videoDir, { recursive: true });

  entries.forEach(entry => {
    const fileName = path.basename(entry.entryName);

    // Extract images
    if (/\.(jpg|jpeg|png)$/i.test(fileName)) {
      const outputPath = path.join(imageDir, fileName);
      fs.writeFileSync(outputPath, entry.getData());
    }

    // Extract videos
    if (/\.(mp4|mov|webm)$/i.test(fileName)) {
      const outputPath = path.join(videoDir, fileName);
      fs.writeFileSync(outputPath, entry.getData());
    }
  });

  console.log("KMZ media extracted:");
  console.log("Images →", imageDir);
  console.log("Videos →", videoDir);

  return kmlPath;
}

module.exports = { extractKmlFromKmz };