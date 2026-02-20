const fs = require("fs");
const path = require("path");
const { getOAuthDrive } = require("./drive.oauth");

async function uploadKmzCopy({ localPath, name }) {
  if (!localPath) {
    throw new Error("localPath missing");
  }

  const drive = getOAuthDrive();

  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GDRIVE_FOLDER_ID not set");
  }

  console.log("Uploading to Drive folder:", folderId);

  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
      mimeType: "application/vnd.google-earth.kmz"
    },
    media: {
      mimeType: "application/vnd.google-earth.kmz",
      body: fs.createReadStream(path.resolve(localPath))
    }
  });

  return res.data;
}

module.exports = { uploadKmzCopy };
