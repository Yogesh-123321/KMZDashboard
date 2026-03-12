const express = require("express");
const bcrypt = require("bcryptjs");
const AuthUser = require("../models/AuthUser");
const { verifyToken } = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");
const { getUserProfile } = require("../controllers/adminController");

const router = express.Router();

/* GET USERS */
router.get(
  "/",
  verifyToken,
  requirePermission("MANAGE_USERS"),
  async (req, res) => {
    const users = await AuthUser.find();
    res.json(users);
  }
);

/* CREATE USER */
router.post(
  "/create",
  verifyToken,
  requirePermission("MANAGE_USERS"),
  async (req, res) => {
    try {
      const { username, password, role } = req.body;

      const hash = await bcrypt.hash(password, 10);

      const user = await AuthUser.create({
        username,
        passwordPlain: password,
        passwordHash: hash,
        role
      });

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* UPDATE USER */
router.put(
  "/:id",
  verifyToken,
  requirePermission("MANAGE_USERS"),
  async (req, res) => {
    try {

      const { username, role, password } = req.body;

      const update = {
        username,
        role
      };

      // If password is provided → hash it
      if (password) {
        const hash = await bcrypt.hash(password, 10);

        update.passwordHash = hash;
        update.passwordPlain = password; // keep if you want to display it
      }

      const updated = await AuthUser.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true }
      );

      res.json(updated);

    } catch (err) {
      console.error("USER UPDATE ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* DELETE USER */
router.delete(
  "/:id",
  verifyToken,
  requirePermission("MANAGE_USERS"),
  async (req, res) => {
    await AuthUser.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }
);

/* USER PROFILE (NEW) */
router.get(
  "/:id/profile",
  verifyToken,
  requirePermission("MANAGE_USERS"),
  getUserProfile
);

module.exports = router;
