const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

function extractKmlFromKmz(kmzPath, kmzId) {
  const zip = new AdmZip(kmzPath);
  const entries = zip.getEntries();

  // ─── Extract KML ─────────────────────────────
  const kmlEntry = entries.find(e => e.entryName.endsWith(".kml"));
  if (!kmlEntry) throw new Error("No KML found in KMZ");

  const outDir = path.join(__dirname, "../../tmp");
  fs.mkdirSync(outDir, { recursive: true });

  const kmlPath = path.join(outDir, "doc.kml");
  fs.writeFileSync(kmlPath, kmlEntry.getData());

  // ─── Extract images ──────────────────────────
  const imageDir = path.join(
    __dirname,
    "../../public/kmz-images",
    kmzId
  );

  fs.mkdirSync(imageDir, { recursive: true });

  entries.forEach(entry => {
    if (/\.(jpg|jpeg|png)$/i.test(entry.entryName)) {
      const outputPath = path.join(
        imageDir,
        path.basename(entry.entryName)
      );
      fs.writeFileSync(outputPath, entry.getData());
    }
  });

  return kmlPath;
}

module.exports = { extractKmlFromKmz };
