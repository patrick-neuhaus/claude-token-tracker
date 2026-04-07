import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { listUsers, updateUserRole } from "../services/settingsService.js";

const router = Router();

router.use(authMiddleware, requireRole("super_admin", "admin"));

router.get("/users", async (_req, res) => {
  const users = await listUsers();
  res.json(users);
});

router.patch("/users/:id", async (req, res) => {
  const { role } = req.body;
  if (!role || !["user", "admin", "pending"].includes(role)) {
    res.status(400).json({ status: "error", message: "Invalid role" });
    return;
  }

  // Protect super_admin from demotion
  const { query: dbQuery } = await import("../config/database.js");
  const target = await dbQuery(
    "SELECT role FROM user_settings WHERE user_id = $1",
    [req.params.id]
  );
  if (target.rows[0]?.role === "super_admin") {
    res.status(403).json({ status: "error", message: "Cannot change super_admin role" });
    return;
  }

  const result = await updateUserRole(req.params.id, role);
  if (!result) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }

  res.json(result);
});

export default router;
