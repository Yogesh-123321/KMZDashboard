const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "../credentials/oauth-client.json");
const TOKEN_PATH = path.join(__dirname, "../credentials/token.json");

function getOAuthDrive() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

  const { client_secret, client_id, redirect_uris } =
    credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  oAuth2Client.setCredentials(token);

  return google.drive({
    version: "v3",
    auth: oAuth2Client
  });
}

module.exports = { getOAuthDrive };
