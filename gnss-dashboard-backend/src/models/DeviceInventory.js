
const mongoose = require("mongoose");

const deviceInventorySchema = new mongoose.Schema(
{
  deviceId: {
    type: String,
    required: true,
    unique: true
  },

  deviceName: String,

  status: {
    type: String,
    enum: ["available", "in_use"],
    default: "available"
  },

  currentUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuthUser",
    default: null
  },

  connectedAt: Date,
  lastSeen: Date

},
{ timestamps: true }
);

module.exports = mongoose.model("DeviceInventory", deviceInventorySchema);