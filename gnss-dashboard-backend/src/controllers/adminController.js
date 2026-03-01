const AuthUser = require("../models/AuthUser");
const Assignment = require("../models/Assignment");
const UserSession = require("../models/UserSession");
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await AuthUser.findById(userId).select(
      "username role createdAt isActive lastLocationAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ---------- ASSIGNMENT COUNTS ---------- */

    const assignedCount = await Assignment.countDocuments({
      assignedTo: userId
    });

    const pendingCount = await Assignment.countDocuments({
      assignedTo: userId,
      status: "pending"
    });

    const inProgressCount = await Assignment.countDocuments({
      assignedTo: userId,
      status: "in_progress"
    });

    const completedCount = await Assignment.countDocuments({
      assignedTo: userId,
      status: "completed"
    });

    const approvedCount = await Assignment.countDocuments({
      assignedTo: userId,
      status: "approved"
    });

    /* ---------- SESSION HISTORY ---------- */

    const sessions = await UserSession.find({ userId })
      .sort({ loginAt: -1 })
      .limit(10);

    /* ---------- TODAY WORK CALCULATION ---------- */

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySessions = await UserSession.find({
      userId,
      loginAt: { $gte: todayStart }
    });

    let todayWorkMs = 0;

    todaySessions.forEach(session => {
      const end = session.logoutAt || new Date();
      todayWorkMs += (end - session.loginAt);
    });

    const todayWorkMinutes = Math.floor(todayWorkMs / 60000);

    /* ---------- RESPONSE ---------- */

    res.json({
      ...user.toObject(),
      assignedCount,
      pendingCount,
      inProgressCount,
      completedCount,
      approvedCount,
      todayWorkMinutes,
      sessions
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
