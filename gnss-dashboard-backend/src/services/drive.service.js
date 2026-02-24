const { getOAuthDrive } = require("./drive.oauth");

async function listFilesInFolder(folderId) {
  const drive = getOAuthDrive();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, parents, modifiedTime, size)"
  });

  return res.data.files;
}

module.exports = {
  listFilesInFolder
};