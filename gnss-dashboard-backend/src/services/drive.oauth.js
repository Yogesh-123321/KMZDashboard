const { google } = require("googleapis");

function getOAuthDrive() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth environment variables");
  }

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN
  });

  return google.drive({
    version: "v3",
    auth: oAuth2Client
  });
}

module.exports = { getOAuthDrive };