import express from "express";
import {
  getAdminUsers,
  toggleUserStatusAdmin,
  deleteUserAdmin,
  getAuditLogs,
  moderateCourseAdmin,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));
router.get("/users", getAdminUsers);
router.put("/users/:userId/status", toggleUserStatusAdmin);
router.delete("/users/:userId", deleteUserAdmin);
router.get("/audit-logs", getAuditLogs);
router.put("/courses/:courseId/moderate", moderateCourseAdmin);

export default router;