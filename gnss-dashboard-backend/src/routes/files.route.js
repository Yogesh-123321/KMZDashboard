const express = require("express");
const router = express.Router();
const { listFiles } = require("../controllers/files.controller");

router.get("/", listFiles);

module.exports = router;
