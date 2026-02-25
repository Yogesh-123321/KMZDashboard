const User = require("../models/User");
const { getUserFiles } = require("../providers/drive.provider");
const { uploadKmzCopy } = require("../services/drive.upload");
const path = require("path");

async function listFiles(req, res) {
  const user = await User.findOne({ email: "test@gnss.local" });
  if (!user) return res.status(404).json({ message: "User not found" });

  const files = await getUserFiles(user.driveFolderId);
  console.log("Using folderId:", user.driveFolderId);
  res.json(files);
}

async function uploadKmz(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const localPath = req.file.path;
    const originalName = req.file.originalname;

    console.log("Saved locally:", localPath);

    const driveFile = await uploadKmzCopy({
      localPath,
      name: originalName
    });

    res.json(driveFile);

  } catch (err) {
    console.error("UPLOAD ERROR FULL:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listFiles,
  uploadKmz
};