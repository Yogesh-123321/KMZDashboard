const Assignment = require("../models/Assignment");
const { calculateReliability } = require("../utils/reliability.util");

exports.getSurveyorReliability = async (req, res) => {
  try {
    const { userId } = req.params;

    // fetch assignments for this surveyor
const assignments = await Assignment.find({
  assignedTo: userId
});
    const score = calculateReliability({ assignments });

    res.json(score);
  } catch (err) {
    console.error("Reliability error:", err);
    res.status(500).json({ message: "Failed to compute reliability" });
  }
};