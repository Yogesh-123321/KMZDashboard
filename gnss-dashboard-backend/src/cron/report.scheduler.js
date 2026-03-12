const cron = require("node-cron");
const { generateDailyReportData, generateExcelReport } = require("../services/dailyReportService");
const { sendReportEmail } = require("../services/email.service");
console.log("Report scheduler started");
cron.schedule("0 12 * * *", async () => {
// cron.schedule("* * * * *", async () => {      
    try{

    console.log("Running daily report job...");

    const data = await generateDailyReportData();
    const filePath = await generateExcelReport(data);

    await sendReportEmail(filePath);

    console.log("Daily report sent successfully");

  } catch (err) {
    console.error("Daily report job error:", err);
  }
});