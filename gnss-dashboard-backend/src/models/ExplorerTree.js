const mongoose = require("mongoose");

const ExplorerSchema = new mongoose.Schema({
  folders: { type: Array, default: [] },
  fileFolderMap: { type: Object, default: {} }
});

module.exports = mongoose.model("ExplorerTree", ExplorerSchema);
