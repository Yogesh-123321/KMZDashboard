const express = require("express");
const router = express.Router();

const { listFiles, uploadKmz } = require("../controllers/files.controller");

router.get("/", listFiles);
router.post("/upload", uploadKmz);

module.exports = router;
