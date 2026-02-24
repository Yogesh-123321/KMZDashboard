const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* 🔥 Use /tmp for Render */
const uploadDir = path.join("/tmp", "kmz");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith(".kmz")) {
      return cb(new Error("Only KMZ files allowed"));
    }
    cb(null, true);
  }
});

module.exports = upload;