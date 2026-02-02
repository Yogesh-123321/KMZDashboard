const { listFilesInFolder } = require("../services/drive.service");

async function getUserFiles(driveFolderId) {
  const files = await listFilesInFolder(driveFolderId);

  return files.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    modifiedTime: f.modifiedTime
  }));
}

module.exports = {
  getUserFiles
};
