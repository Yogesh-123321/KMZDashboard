const AuthUser = require("../models/AuthUser");
const Assignment = require("../models/Assignment");

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await AuthUser.findById(userId).select(
      "username role createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

    /* NEW */
    const approvedCount = await Assignment.countDocuments({
      assignedTo: userId,
      status: "approved"
    });

    res.json({
      ...user.toObject(),
      assignedCount,
      pendingCount,
      inProgressCount,
      completedCount,
      approvedCount
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
