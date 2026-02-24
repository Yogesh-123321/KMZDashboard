const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const KmzActivity = require("../models/KmzActivity");
const {
  parseKmz,
  getParsedKmz,
  saveEditedKmzCopy
} = require("../controllers/kmz.controller");
const KmzParsed = require("../models/KmzParsed");
const kmzParserService = require("../services/kmz.parse.service");
router.post("/:fileId/parse", verifyToken, parseKmz);
router.get("/:fileId/parsed", verifyToken, getParsedKmz);
router.post("/:fileId/save-copy", verifyToken, saveEditedKmzCopy);
router.get("/:fileId/activity", verifyToken, async (req, res) => {
  try {
    const logs = await KmzActivity.find({
      fileId: req.params.fileId
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ───────── KMZ PREVIEW (AUTO PARSE IF NEEDED) ───────── */
router.get("/:fileId/preview", verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    // 1️⃣ Check if already parsed
    let parsed = await KmzParsed.findOne({
      driveFileId: fileId
    });

    // 2️⃣ If not parsed → parse using service
    if (!parsed) {
      console.log("Preview: Parsing KMZ first...");

      parsed = await kmzParserService.parseAndStoreKmz(
        fileId,
        null   // fileName optional for preview
      );
    }

    if (!parsed) {
      return res.status(404).json({
        message: "KMZ parsing failed"
      });
    }

    const BASE_URL =
      process.env.BASE_URL || "http://localhost:5000";

    const pointsWithUrls = parsed.points.map(p => ({
      ...p.toObject(),
      imageUrl: p.imageFile
        ? `${BASE_URL}/kmz-images/${fileId}/${p.imageFile}`
        : null
    }));

    res.json({
      ...parsed.toObject(),
      points: pointsWithUrls
    });

  } catch (err) {
    console.error("KMZ Preview Error:", err);
    res.status(500).json({
      message: "KMZ preview failed"
    });
  }
});
module.exports = router;
