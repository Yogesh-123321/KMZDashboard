const express = require("express");
const router = express.Router();

const DeviceInventory = require("../models/DeviceInventory");
const DeviceUsageLog = require("../models/DeviceUsageLog");

const { verifyToken } = require("../middleware/auth");

/* ───────── DEVICE CONNECT (AUTO) ───────── */

router.post("/connect", verifyToken, async (req, res) => {

  try {

    const { deviceId, deviceName } = req.body;

let device = await DeviceInventory.findOne({ deviceId });

if (!device) {
  device = await DeviceInventory.create({
    deviceId,
    deviceName: deviceName || deviceId, // ✅ fallback
    status: "in_use",
    currentUser: userId,
    connectedAt: new Date(),
    lastSeen: new Date()
  });
} else {
  device.status = "in_use";
  device.currentUser = userId;
  device.connectedAt = new Date();
  device.lastSeen = new Date();

  // ✅ only update name if provided
  if (deviceName) device.deviceName = deviceName;

  await device.save();
}

    /* Check if usage session already exists */

    const existingLog = await DeviceUsageLog.findOne({
      deviceId,
      userId,
      endTime: null
    });

    if (!existingLog) {

      await DeviceUsageLog.create({
        deviceId,
        userId,
        startTime: new Date()
      });

    }

    res.json({ success: true });

  } catch (err) {

    console.error("DEVICE CONNECT ERROR:", err);

    res.status(500).json({ error: err.message });

  }

});


/* ───────── DEVICE DISCONNECT ───────── */

router.post("/disconnect", verifyToken, async (req, res) => {

  try {

    const { deviceId } = req.body;

    const userId = req.user.id;

    const device = await DeviceInventory.findOne({ deviceId });

    if (!device) {
      return res.json({ success: true });
    }

    const log = await DeviceUsageLog.findOne({
      deviceId,
      userId,
      endTime: null
    });

    if (log) {

      const now = new Date();

      log.endTime = now;

      log.durationMinutes =
        Math.round((now - log.startTime) / 60000);

      await log.save();

    }

    device.status = "available";
    device.currentUser = null;

    await device.save();

    res.json({ success: true });

  } catch (err) {

    console.error("DEVICE DISCONNECT ERROR:", err);

    res.status(500).json({ error: err.message });

  }

});
/* ───────── GET DEVICE INVENTORY ───────── */

router.get("/", verifyToken, async (req, res) => {

  try {

    const devices = await DeviceInventory.find()
      .populate("currentUser", "username")
      .sort({ updatedAt: -1 });

    res.json(devices);

  } catch (err) {

    console.error("DEVICE INVENTORY ERROR:", err);

    res.status(500).json({ error: err.message });

  }

});
/* ───────── DEVICE USAGE HISTORY ───────── */

router.get("/:deviceId/history", verifyToken, async (req, res) => {

  try {

    const logs = await DeviceUsageLog.find({
      deviceId: req.params.deviceId
    })
      .populate("userId", "username")
      .sort({ startTime: -1 });

    res.json(logs);

  } catch (err) {

    console.error("DEVICE HISTORY ERROR:", err);

    res.status(500).json({ error: err.message });

  }

});
module.exports = router;