const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/google-drive.json"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"]
});

const drive = google.drive({ version: "v3", auth });

async function downloadFile(fileId, destPath) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data.pipe(dest);
    dest.on("finish", resolve);
    dest.on("error", reject);
  });
}

module.exports = { downloadFile };
