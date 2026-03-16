const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AuthUser = require("../models/AuthUser");
const { verifyToken } = require("../middleware/auth");
const UserSession = require("../models/UserSession");
const router = express.Router();
const DeviceUsageLog = require("../models/DeviceUsageLog");
const DeviceInventory = require("../models/DeviceInventory");
const JWT_SECRET = "supersecretkey";
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await AuthUser.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    // ✅ Mark surveyor active safely
   // 🔥 Close any previous open session (safety)
await UserSession.updateMany(
  { userId: user._id, logoutAt: null },
  { $set: { logoutAt: new Date() } }
);

// 🔥 Create new session
await UserSession.create({
  userId: user._id,
  loginAt: new Date()
});

// Mark active and update last active timestamp
await AuthUser.updateOne(
  { _id: user._id },
  {
    $set: {
      isActive: true,
      lastLocationAt: new Date()
    }
  }
);

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
  id: user._id,
  role: user.role,
  language: user.language,
  username: user.username
});

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
router.post("/logout", verifyToken, async (req, res) => {
  try {

    console.log("Logout user:", req.user);

    const userId = req.user.id;

    // 1️⃣ Update user active state
    await AuthUser.updateOne(
      { _id: userId },
      { $set: { isActive: false, activeAssignment: null } }
    );

    // 2️⃣ Close user session
    await UserSession.findOneAndUpdate(
      { userId: userId, logoutAt: null },
      { $set: { logoutAt: new Date() } }
    );

    // ⭐ NEW: close active device usage
    await DeviceUsageLog.updateMany(
      { userId: userId, disconnectedAt: null },
      { $set: { disconnectedAt: new Date() } }
    );

    // ⭐ NEW: free devices used by this user
    await DeviceInventory.updateMany(
      { currentUser: userId },
      {
        $set: {
          status: "available",
          currentUser: null
        }
      }
    );

    res.json({ success: true });

  } catch (err) {

    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ error: err.message });

  }
});
router.patch("/location", verifyToken, async (req, res) => {
  try {

    console.log("LOCATION REQUEST FROM:", req.user.id);
    console.log("BODY:", req.body);

    const { lat, lng } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        error: "lat and lng must be numbers"
      });
    }

    await AuthUser.updateOne(
      { _id: req.user.id },
      {
        $set: {
          lastLocation: { lat, lng },
          lastLocationAt: new Date()
        }
      }
    );

    console.log("LOCATION UPDATED");

    res.json({ success: true });

  } catch (err) {
    console.error("LOCATION UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
router.post("/break", verifyToken, async (req, res) => {
  try {

    const { onBreak } = req.body;

    if (onBreak) {

      await AuthUser.updateOne(
        { _id: req.user.id },
        {
          $set: {
            isOnBreak: true,
            breakStartTime: new Date()
          }
        }
      );

    } else {

      await AuthUser.updateOne(
        { _id: req.user.id },
        {
          $set: {
            isOnBreak: false,
            breakStartTime: null
          }
        }
      );

    }

    res.json({ success: true });

  } catch (err) {
    console.error("BREAK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
