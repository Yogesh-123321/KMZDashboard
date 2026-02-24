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

    // Return array of segments
    return parsed.tracks.map(track =>
      (track.coordinates || []).map(p => ({
        lat: p.lat,
        lon: p.lon
      }))
    );

  } catch (err) {
    console.error("KMZ TRACK LOAD ERROR:", err);
    return [];
  }
}

module.exports = { getKmzTrackFromSurveyId };
