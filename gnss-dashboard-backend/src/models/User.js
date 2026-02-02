const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    driveFolderId: { type: String, required: true },
    provider: { type: String, default: "drive" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
