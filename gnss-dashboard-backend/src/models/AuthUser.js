const mongoose = require("mongoose");

const AuthUserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },

    passwordPlain: { type: String, required: true },   // NEW
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "ADMIN",
        "ROLE_1",
        "ROLE_2",
        "ROLE_3",
        "ROLE_4",
        "ROLE_5",
        "ROLE_6",
        "ROLE_7"
      ],
      default: "ROLE_1"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuthUser", AuthUserSchema);
