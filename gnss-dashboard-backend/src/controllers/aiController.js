const Assignment = require("../models/Assignment");
const { calculateDeviation } = require("./deviation.controller");

exports.getAIAnalysis = async (req, res) => {
  try {

const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found"
      });
    }

    const threshold = Number(req.query.threshold || 3);

    const surveyId = assignment.surveyId;

    /* ───────── FETCH ALL SEGMENTS OF SURVEY ───────── */

    const assignments = await Assignment.find({
  assignmentGroupId: assignment.assignmentGroupId,
  status: { $in: ["completed", "approved"] }
}).sort({ segmentIndex: 1 });

    console.log("AI SURVEY:", surveyId);
    console.log("SEGMENTS FOUND:", assignments.length);

    if (!assignments.length) {
      return res.json({ aiAnalysis: null });
    }

    /* ───────── MERGE TRACKS ───────── */

    let referenceTrack = [];
    let recordedTrack = [];

    for (const a of assignments) {

      /* reference segments */

      if (Array.isArray(a.segmentReferenceTracks)) {

        for (const seg of a.segmentReferenceTracks) {

          if (!Array.isArray(seg)) continue;

          const cleaned = seg.filter(
            p => typeof p.lat === "number" && typeof p.lon === "number"
          );

          if (cleaned.length > 1) {
            referenceTrack.push(...cleaned);
          }

        }

      }

      /* recorded segments */

      if (Array.isArray(a.recordedTrack)) {

        for (const seg of a.recordedTrack) {

          if (!Array.isArray(seg)) continue;

          const cleaned = seg.filter(
            p => typeof p.lat === "number" && typeof p.lon === "number"
          );

          if (cleaned.length > 1) {
            recordedTrack.push(...cleaned);
          }

        }

      }

    }

    console.log("REFERENCE POINTS:", referenceTrack.length);
    console.log("RECORDED POINTS:", recordedTrack.length);

    /* ───────── SAFETY CHECK ───────── */

    if (!referenceTrack.length || !recordedTrack.length) {
      return res.json({ aiAnalysis: null });
    }

    /* ───────── CALCULATE DEVIATION ───────── */

    const deviationData = calculateDeviation(
      referenceTrack,
      recordedTrack,
      threshold
    );

    const {
      totalPoints,
      deviatedPoints,
      deviationPercent,
      maxDeviation,
      avgDeviation
    } = deviationData;

    /* ───────── AI PROMPT ───────── */

    const prompt = `
You are a professional GNSS survey quality auditor.

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT wrap in triple backticks.
Do NOT add explanation text outside JSON.

Use EXACTLY this structure:

{
  "classification": "Excellent | Acceptable | Rejected Quality",
  "severity": "Low | Moderate | Critical",
  "recommendation": "Approve | Review | Reject",
  "confidenceScore": number,
  "summary": "short professional explanation under 80 words"
}

Deviation Metrics:
Total Points: ${totalPoints}
Deviated Points: ${deviatedPoints}
Deviation Percent: ${deviationPercent.toFixed(2)}%
Max Deviation: ${maxDeviation.toFixed(2)} meters
Average Deviation: ${avgDeviation.toFixed(2)} meters
Threshold: ${threshold}
`;

    /* ───────── CALL OPENROUTER ───────── */

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a professional GNSS survey auditor. Respond strictly with valid JSON."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      }
    );

    const data = await response.json();

    const rawContent =
      data?.choices?.[0]?.message?.content || "";

    let aiParsed;

    try {
      aiParsed = JSON.parse(rawContent);
    } catch (err) {

      console.error("AI JSON parse failed:");
      console.error(rawContent);

      aiParsed = {
        classification: "Format Error",
        severity: "Unknown",
        recommendation: "Review",
        confidenceScore: 0,
        summary: "AI returned invalid format."
      };

    }

    /* ───────── VALIDATE STRUCTURE ───────── */

    const requiredFields = [
      "classification",
      "severity",
      "recommendation",
      "confidenceScore",
      "summary"
    ];

    const isValid =
      requiredFields.every(field => field in aiParsed);

    if (!isValid) {

      console.error("AI response missing required fields.");
      console.error(rawContent);

      aiParsed = {
        classification: "Format Error",
        severity: "Unknown",
        recommendation: "Review",
        confidenceScore: 0,
        summary: "AI returned incomplete structure."
      };

    }

    return res.json({
      aiAnalysis: aiParsed
    });

  } catch (err) {

    console.error("AI analysis failed:", err);

    return res.status(500).json({
      message: "AI analysis failed"
    });

  }
};