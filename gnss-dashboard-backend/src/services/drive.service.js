const { google } = require("googleapis");
const path = require("path");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/google-drive.json"),
  scopes: ["https://www.googleapis.com/auth/drive"]
});

const drive = google.drive({ version: "v3", auth });

async function listFilesInFolder(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, parents, modifiedTime, size)"
  });

  return res.data.files;
}


module.exports = {
  listFilesInFolder
};
