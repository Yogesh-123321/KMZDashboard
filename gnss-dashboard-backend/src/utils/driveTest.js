const { google } = require("googleapis");
const path = require("path");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/google-drive.json"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"]
});

async function listFiles() {
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: "trashed = false",
    fields: "files(id, name, mimeType)"
  });

  console.log("Files visible to service account:");
  res.data.files.forEach(file => {
    console.log(`- ${file.name} (${file.mimeType})`);
  });
}

listFiles().catch(console.error);
