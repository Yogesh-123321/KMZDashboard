const mongoose = require("mongoose");

const TrackPointSchema = new mongoose.Schema(
  {
    lat: Number,
    lon: Number
  },
  { _id: false }
);

const AssignmentSchema = new mongoose.Schema(
  {
    surveyId: {
      type: String,
      required: true
    },
assignmentGroupId: {
  type: String,
  required: true,
  index: true
},
    surveyName: String,
    segmentIndex: {
      type: Number,
      default: 0
    },

    totalSegments: {
      type: Number,
      default: 1
    },

    segmentReferenceTracks: {
      type: [[TrackPointSchema]],
      default: []
    }, 
    
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "approved"],
      default: "pending"
    },

    approvedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser"
    },

    /* BLUE TRACK (KMZ reference track) */
    referenceTrack: {
  type: [[TrackPointSchema]],   // 🔥 segmented
  default: []
},

    /* RED TRACK (recorded GNSS path) */
    recordedTrack: {
      type: [[TrackPointSchema]],   // 🔥 change this
      default: []
    },
   submittedKmzPath: String,
    photos: [
  {
    lat: Number,
    lon: Number,
    imageUrl: String,
    videoUrl: String,
    timestamp: Number,
    description: String
  }
],

    submissionVersion: {
      type: Number,
      default: 1
    },
    /* CACHED DEVIATION RESULTS */
    deviationAnalyses: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", AssignmentSchema);