const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const KmzActivity = require("../models/KmzActivity");
const {
  parseKmz,
  getParsedKmz,
  saveEditedKmzCopy
} = require("../controllers/kmz.controller");

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
module.exports = router;
