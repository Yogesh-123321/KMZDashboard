const Assignment = require("../models/Assignment");
const UserSession = require("../models/UserSession");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

async function generateDailyReportData() {

  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);

  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);

  const sessions = await UserSession.find({
    loginAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate("userId","username");

  const assignments = await Assignment.find({
    status: "completed",
    updatedAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate("assignedTo","username");

  return { sessions, assignments };

}

function calculateDuration(login, logout) {

  if(!logout) return "-";

  const diff = logout - login;

  const hours = Math.floor(diff / (1000*60*60));
  const mins = Math.floor((diff % (1000*60*60)) / (1000*60));

  return `${hours}h ${mins}m`;

}

function calculatePerformance(avgDeviation){

  if(avgDeviation === null) return "No Data";

  if(avgDeviation < 0.75) return "Excellent";
  if(avgDeviation < 1.5) return "Good";

  return "Needs Review";
}

async function generateExcelReport(data){

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("GNSS Field Performance");

  sheet.columns = [
    { header:"Date", key:"date", width:18 },
    { header:"Surveyor", key:"user", width:22 },
    { header:"Login Time", key:"login", width:24 },
    { header:"Logout Time", key:"logout", width:24 },
    { header:"Work Duration", key:"duration", width:18 },
    { header:"Surveys Completed", key:"surveys", width:20 },
    { header:"Avg Deviation (m)", key:"deviation", width:20 },
    { header:"Performance", key:"performance", width:18 }
  ];

  /* HEADER STYLE */

  sheet.getRow(1).eachCell(cell=>{
    cell.font = { bold:true, color:{argb:"FFFFFFFF"} };

    cell.fill = {
      type:"pattern",
      pattern:"solid",
      fgColor:{argb:"FF1F4E78"}
    };

    cell.alignment = { horizontal:"center" };
  });

  const rows = [];

  for(const session of data.sessions){

    const userId = session.userId?._id;

    const userAssignments = data.assignments.filter(a=>
      a.assignedTo && a.assignedTo._id.toString() === userId.toString()
    );

    const surveysCompleted = userAssignments.length;

    let avgDeviation = null;

    if(surveysCompleted > 0){

      let deviations = [];

      userAssignments.forEach(a=>{
        const dev = Object.values(a.deviationAnalyses || {});
        dev.forEach(d=>{
          if(d.avgDeviation) deviations.push(d.avgDeviation);
        });
      });

      if(deviations.length > 0){

        const total = deviations.reduce((a,b)=>a+b,0);
        avgDeviation = (total / deviations.length).toFixed(2);

      }
    }

    const performance = calculatePerformance(avgDeviation);

    rows.push({

      date: new Date(session.loginAt).toLocaleDateString(),

      user: session.userId?.username || "Unknown",

      login: new Date(session.loginAt).toLocaleString(),

      logout: session.logoutAt
        ? new Date(session.logoutAt).toLocaleString()
        : "-",

      duration: calculateDuration(session.loginAt, session.logoutAt),

      surveys: surveysCompleted,

      deviation: avgDeviation || "-",

      performance

    });

  }

  rows.forEach(r=>sheet.addRow(r));

  /* COLOR CODING */

  sheet.eachRow((row,rowNumber)=>{

    if(rowNumber === 1) return;

    const perf = row.getCell(8).value;

    let color = "FFFFFFFF";

    if(perf === "Excellent") color = "FFC6EFCE";
    if(perf === "Good") color = "FFFFEB9C";
    if(perf === "Needs Review") color = "FFFFC7CE";

    row.eachCell(cell=>{
      cell.fill = {
        type:"pattern",
        pattern:"solid",
        fgColor:{argb:color}
      };

      cell.border = {
        top:{style:"thin"},
        left:{style:"thin"},
        bottom:{style:"thin"},
        right:{style:"thin"}
      };
    });

  });

  const reportsDir = path.join(__dirname,"../reports");

  if(!fs.existsSync(reportsDir))
    fs.mkdirSync(reportsDir);

  const today = new Date().toISOString().split("T")[0];

  const filePath = path.join(
    reportsDir,
    `gnss-performance-report-${today}.xlsx`
  );

  await workbook.xlsx.writeFile(filePath);

  console.log("GNSS Performance Report Generated:",filePath);

  return filePath;

}

module.exports = {
  generateDailyReportData,
  generateExcelReport
};