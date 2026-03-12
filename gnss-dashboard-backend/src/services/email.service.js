const { Resend } = require("resend");
const fs = require("fs");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendReportEmail(filePath) {
  try {

    const managers = process.env.MANAGER_EMAILS.split(",");

    const fileBuffer = fs.readFileSync(filePath);

    const response = await resend.emails.send({
      from: "TechnoGNSS <onboarding@resend.dev>",
      to: managers,
      subject: "GNSS Daily Field Activity Report",
      html: "<p>Attached is today's GNSS field activity report.</p>",
      attachments: [
        {
          filename: "daily-report.xlsx",
          content: fileBuffer
        }
      ]
    });

    console.log("Report email sent:", response);

  } catch (error) {
    console.error("Report email error:", error);
  }
}

module.exports = {
  sendReportEmail
};