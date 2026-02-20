const KmzParsed = require("../models/KmzParsed");

async function getKmzTrackFromSurveyId(surveyId) {
  try {
    const parsed = await KmzParsed.findOne({
      driveFileId: surveyId
    });

    if (!parsed || !parsed.tracks || !parsed.tracks.length) {
      console.log("No parsed KMZ track found for:", surveyId);
      return [];
    }

    let chosenTrack = null;

// Prefer edited track
chosenTrack = parsed.tracks.find(t => t.name?.includes("Edited Track"));

// fallback to original static track
if (!chosenTrack) {
  chosenTrack = parsed.tracks.find(t => t.name?.includes("Original"));
}

// fallback to first track
if (!chosenTrack) {
  chosenTrack = parsed.tracks[0];
}

if (!chosenTrack) return [];

return chosenTrack.coordinates.map(p => ({
  lat: p.lat,
  lon: p.lon
}));


  } catch (err) {
    console.error("KMZ TRACK LOAD ERROR:", err);
    return [];
  }
}

module.exports = { getKmzTrackFromSurveyId };
