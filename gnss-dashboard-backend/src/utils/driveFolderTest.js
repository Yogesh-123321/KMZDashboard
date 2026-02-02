const { listFilesInFolder } = require("../services/drive.service");

const FOLDER_ID = "153L0L9qtqCBNPsc35jmEoY-H1mKBKv-L";

async function test() {
  const files = await listFilesInFolder(FOLDER_ID);
  console.log("Files inside folder:");
  files.forEach(f => {
    console.log(`- ${f.name} (${f.mimeType})`);
  });
}

test().catch(console.error);
