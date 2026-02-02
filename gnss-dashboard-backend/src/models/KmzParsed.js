const mongoose = require("mongoose");

const coordinateSchema = new mongoose.Schema({
  lat: Number,
  lon: Number,
  ele: Number
}, { _id: false });

const trackSchema = new mongoose.Schema({
  name: String,
  coordinates: [coordinateSchema]
}, { _id: false });

const pointSchema = new mongoose.Schema({
  name: String,
  lat: Number,
  lon: Number,
  ele: Number,
  imageFile: String   // ✅ REQUIRED
}, { _id: false });


const kmzParsedSchema = new mongoose.Schema(
  {
    driveFileId: { type: String, unique: true, required: true },
    fileName: String,
    tracks: [trackSchema],
    points: [pointSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("KmzParsed", kmzParsedSchema);
