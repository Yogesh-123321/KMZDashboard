const mongoose = require("mongoose");

const KmzActivitySchema = new mongoose.Schema(
  {
    fileId: String,
    fileName: String,

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",   // ← FIX
      default: null
    },

    action: String,
    meta: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model("KmzActivity", KmzActivitySchema);
