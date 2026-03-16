const mongoose = require("mongoose");

const deviceUsageLogSchema = new mongoose.Schema(
{
  deviceId: {
    type: String,
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuthUser"
  },

  startTime: Date,
  endTime: Date,

  durationMinutes: Number

},
{ timestamps: true }
);

module.exports = mongoose.model("DeviceUsageLog", deviceUsageLogSchema);