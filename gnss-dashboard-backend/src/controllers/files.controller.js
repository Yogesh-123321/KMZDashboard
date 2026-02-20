const User = require("../models/User");
const { getUserFiles } = require("../providers/drive.provider");
const { uploadFileToDrive } = require("../providers/drive.provider");
const fs = require("fs");
const path = require("path");
const { uploadKmzCopy } = require("../services/drive.upload");

async function listFiles(req, res) {
  // TEMP: static user (auth comes later)
  const user = await User.findOne({ email: "test@gnss.local" });
  if (!user) return res.status(404).json({ message: "User not found" });

  const files = await getUserFiles(user.driveFolderId);
  res.json(files);
  console.log("Using folderId:", user.driveFolderId);

}
async function uploadKmz(req, res) {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;

    const uploadDir = path.join(__dirname, "../../uploads");
    const localPath = path.join(uploadDir, file.name);

    // ensure uploads folder exists
    const fs = require("fs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    await file.mv(localPath);

    console.log("Saved locally:", localPath);

    const driveFile = await uploadKmzCopy({
      localPath,
      name: file.name
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

