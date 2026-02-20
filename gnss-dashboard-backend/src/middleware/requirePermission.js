const permissions = require("../config/permissions");

module.exports = function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.user.role;

    if (!permissions[role]) {
      return res.status(403).json({ error: "Role not configured" });
    }

    if (
      permissions[role].includes("*") ||
      permissions[role].includes(permission)
    ) {
      return next();
    }

    return res.status(403).json({ error: "Permission denied" });
  };
};
