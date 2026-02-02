const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.route");
const filesRoutes = require("./routes/files.route");
const kmzRoutes = require("./routes/kmz.route");
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/kmz", kmzRoutes);
app.use("/kmz-images", express.static("public/kmz-images"));

module.exports = app;
