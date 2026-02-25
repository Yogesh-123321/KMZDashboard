const express = require("express");
const router = express.Router();

const { listFiles, uploadKmz } = require("../controllers/files.controller");
const upload = require("../middleware/upload");  // adjust path if needed

router.post(
  "/upload",
  (req, res, next) => {
    console.log("🔥 Upload route hit");
    console.log("Content-Type:", req.headers["content-type"]);
    next();
  },
  upload.single("file"),
  (req, res, next) => {
    console.log("After multer, req.file =", req.file);
    next();
  },
  uploadKmz
);
router.get("/", listFiles);
// router.post("/upload", uploadKmz);

module.exports = router;
