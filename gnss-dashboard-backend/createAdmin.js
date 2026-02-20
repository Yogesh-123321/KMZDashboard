require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AuthUser = require("./src/models/AuthUser");

mongoose.connect(process.env.MONGO_URI);

async function run() {
  const hash = await bcrypt.hash("admin123", 10);

  await AuthUser.create({
    username: "admin",
    passwordHash: hash,
    role: "ADMIN"
  });

  console.log("Admin created");
  process.exit();
}

run();
