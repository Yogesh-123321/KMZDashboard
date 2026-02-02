const express = require("express");
const router = express.Router();
const {
  parseKmz,
  getParsedKmz,
  saveEditedKmzCopy
} = require("../controllers/kmz.controller");


router.post("/:fileId/parse", parseKmz);
router.get("/:fileId/parsed", getParsedKmz);
router.post(
  "/:fileId/save-copy",
  saveEditedKmzCopy
);

module.exports = router;
