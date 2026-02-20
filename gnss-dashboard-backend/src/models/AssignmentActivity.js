const mongoose = require("mongoose");

const AssignmentActivitySchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser"
    },

    action: {
      type: String,
      required: true
    },

    meta: {
      type: Object
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AssignmentActivity",
  AssignmentActivitySchema
);
