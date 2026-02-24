const fs = require("fs");
const { getOAuthDrive } = require("./drive.oauth");

async function downloadFile(fileId, destPath) {
  const drive = getOAuthDrive();

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