const { google } = require("googleapis");
const path = require("path");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/google-drive.json"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"]
});

async function resolveFolderId(folderName) {
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: "files(id, name)"
  });

  if (!res.data.files.length) {
    throw new Error("Folder not found");
  }

  console.log("Folder ID:", res.data.files[0].id);
}

resolveFolderId("GNSS_DASHBOARD_UPLOADS").catch(console.error);
