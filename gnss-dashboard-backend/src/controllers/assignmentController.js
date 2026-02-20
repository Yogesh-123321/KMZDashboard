const Assignment = require("../models/Assignment");
const KmzParsed = require("../models/KmzParsed");
exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({
      assignedTo: req.user.id
    }).sort({ createdAt: -1 });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAssignmentTrack = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Load parsed KMZ by surveyId (Drive file id)
    const parsed = await KmzParsed.findOne({
      driveFileId: assignment.surveyId
    });

    if (!parsed || !parsed.tracks) {
      return res.json({ tracks: [] });
    }

    // Convert to a simple structure Android can consume
    const tracks = parsed.tracks.map(t =>
      (t.coordinates || []).map(p => ({
        lat: p.lat,
        lon: p.lon
      }))
    );

    res.json({ tracks });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


