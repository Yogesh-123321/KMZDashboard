const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.route");
const filesRoutes = require("./routes/files.route");
const kmzRoutes = require("./routes/kmz.route");
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
// const fileUpload = require("express-fileupload");
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",   // local dev frontend
      "https://your-frontend-domain.com" // later production frontend
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());
// app.use(
//   fileUpload({
//    useTempFiles: true,
//     tempFileDir: "/tmp/"
//   })
// );
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin/users", require("./routes/adminUsers"));
app.use("/api/assignments", require("./routes/assignments"));
app.use("/api/health", healthRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/kmz", kmzRoutes);
app.use("/kmz-images", express.static("public/kmz-images"));
app.use(
  "/submitted-kmz",
  express.static("public/submitted-kmz")
);
app.use("/api/explorer", require("./routes/explorer.routes"));

module.exports = app;
