const express = require("express");
const router = express.Router();

const { generateDailyReportData, generateExcelReport } = require("../services/dailyReportService");
const { sendReportEmail } = require("../services/email.service");

router.get("/test-report-email", async (req, res) => {

  try {
    const data = await generateDailyReportData();

    const filePath = await generateExcelReport(data);

    await sendReportEmail(filePath);

    res.json({
      message: "Report email sent"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }

});

module.exports = router;