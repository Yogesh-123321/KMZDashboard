const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");

async function mergeKmzFiles(assignments, finalName) {

  const tempRoot = path.join(process.cwd(), "temp_merge_" + Date.now());
  fs.mkdirSync(tempRoot, { recursive: true });

  const imagesDir = path.join(tempRoot, "images");
  const videosDir = path.join(tempRoot, "videos");

  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const mergedPlacemarks = [];

  for (const assignment of assignments) {

    if (!assignment.submittedKmzPath) continue;

    const zip = new AdmZip(assignment.submittedKmzPath);

    const extractDir = path.join(
      tempRoot,
      assignment._id.toString()
    );

    zip.extractAllTo(extractDir, true);

    const kmlPath = path.join(extractDir, "doc.kml");

    if (!fs.existsSync(kmlPath)) continue;

    const kml = fs.readFileSync(kmlPath, "utf8");

    const parsed = await xml2js.parseStringPromise(kml);

    const placemarks =
      parsed.kml.Document[0].Placemark || [];

    mergedPlacemarks.push(...placemarks);

    /* COPY IMAGES */

    const srcImages = path.join(extractDir, "images");

    if (fs.existsSync(srcImages)) {

      for (const file of fs.readdirSync(srcImages)) {

        fs.copyFileSync(
          path.join(srcImages, file),
          path.join(imagesDir, file)
        );
      }
    }

    /* COPY VIDEOS */

    const srcVideos = path.join(extractDir, "videos");

    if (fs.existsSync(srcVideos)) {

      for (const file of fs.readdirSync(srcVideos)) {

        fs.copyFileSync(
          path.join(srcVideos, file),
          path.join(videosDir, file)
        );
      }
    }
  }

  /* BUILD MERGED KML */

  const builder = new xml2js.Builder();

  const mergedKml = builder.buildObject({
    kml: {
      $: { xmlns: "http://www.opengis.net/kml/2.2" },
      Document: [
        {
          Placemark: mergedPlacemarks
        }
      ]
    }
  });

  const kmlFile = path.join(tempRoot, "doc.kml");

  fs.writeFileSync(kmlFile, mergedKml);

  /* CREATE FINAL KMZ */

  const finalKmzPath = path.join(
    process.cwd(),
    "temp",
    `${finalName}_merged.kmz`
  );

  const zip = new AdmZip();

  zip.addLocalFile(kmlFile);
  zip.addLocalFolder(imagesDir, "images");
  zip.addLocalFolder(videosDir, "videos");

  zip.writeZip(finalKmzPath);

  return finalKmzPath;
}

module.exports = { mergeKmzFiles };