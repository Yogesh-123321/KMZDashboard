const express = require("express");
const router = express.Router();

const {
  getSurveyorReliability,
} = require("../controllers/reliability.controller");

// GET /api/surveyors/:userId/reliability
router.get("/:userId/reliability", getSurveyorReliability);

module.exports = router;