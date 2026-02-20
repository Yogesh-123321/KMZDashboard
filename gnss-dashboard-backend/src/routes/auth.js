const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AuthUser = require("../models/AuthUser");

const router = express.Router();

const JWT_SECRET = "supersecretkey";

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await AuthUser.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
    username: user.username
  },
  JWT_SECRET,
  { expiresIn: "7d" }
);


    res.json({
      token,
      role: user.role,
      language: user.language,
      username: user.username
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
