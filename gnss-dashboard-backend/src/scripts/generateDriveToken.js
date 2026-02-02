const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(
  __dirname,
  "../credentials/oauth.credentials.json"
);

const TOKEN_PATH = path.join(
  __dirname,
  "../credentials/token.json"
);

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

async function generateToken() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });

  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl, "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Paste the code here: ", async (code) => {
    rl.close();

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("\n✅ Token stored at:", TOKEN_PATH);
  });
}

generateToken();
