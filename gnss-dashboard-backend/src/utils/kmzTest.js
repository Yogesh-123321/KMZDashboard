const path = require("path");
const fs = require("fs");
const { downloadFile } = require("../services/drive.download");
const { extractKmlFromKmz } = require("./kmz.extract");
const { parseKml } = require("../parsers/kml.parser");

const KMZ_FILE_ID = "1yOP7XC9cUbGBZenPchd5zqcy4ynRQC00";

async function run() {
  const tmpDir = path.join(__dirname, "../../tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const kmzPath = path.join(tmpDir, "test.kmz");

  await downloadFile(KMZ_FILE_ID, kmzPath);
  const kmlPath = extractKmlFromKmz(kmzPath);

  const data = parseKml(kmlPath);
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
