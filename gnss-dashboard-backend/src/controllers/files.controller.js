const User = require("../models/User");
const { getUserFiles } = require("../providers/drive.provider");

async function listFiles(req, res) {
  // TEMP: static user (auth comes later)
  const user = await User.findOne({ email: "test@gnss.local" });
  if (!user) return res.status(404).json({ message: "User not found" });

  const files = await getUserFiles(user.driveFolderId);
  res.json(files);
  console.log("Using folderId:", user.driveFolderId);

}

module.exports = {
  listFiles
};
