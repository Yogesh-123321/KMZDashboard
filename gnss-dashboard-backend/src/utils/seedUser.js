require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await User.findOneAndUpdate(
    { email: "test@gnss.local" },
    {
      driveFolderId: "153L0L9qtqCBNPsc35jmEoY-H1mKBKv-L"
    },
    { new: true, upsert: true }
  );

  console.log("User updated:", result);
  process.exit(0);
}

seed().catch(console.error);
