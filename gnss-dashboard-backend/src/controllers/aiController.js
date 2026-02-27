const Assignment = require("../models/Assignment");

function extractJson(text) {
  if (!text) return null;

  // Remove markdown code fences if present
  text = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) return null;

  const jsonString = text.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    return null;
  }
}

exports.getAIAnalysis = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const threshold = Number(req.query.threshold || 3);
    const thresholdKey = String(threshold);

const deviationData =
  assignment.deviationAnalyses?.get(thresholdKey);
    if (!deviationData) {
      return res.status(400).json({
        message: "Deviation analysis not available"
      });
    }

    const {
      totalPoints,
      deviatedPoints,
      deviationPercent,
      maxDeviation,
      avgDeviation
    } = deviationData;

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
          content: "You are a professional GNSS survey auditor. Respond strictly with valid JSON."
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
    // 🔒 Structure validation
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

    return res.json({ aiAnalysis: aiParsed });

  } catch (err) {
    console.error("AI analysis failed:", err);
    return res.status(500).json({
      message: "AI analysis failed"
    });
  }
};