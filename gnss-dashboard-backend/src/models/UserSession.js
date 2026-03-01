const mongoose = require("mongoose");

const UserSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuthUser",
    required: true
  },
  loginAt: {
    type: Date,
    required: true
  },
  logoutAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("UserSession", UserSessionSchema);