import express from "express";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import { getPublicInstructors } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getCourses);
router.get("/instructors", getPublicInstructors);
router.post("/", requireAuth, requireRole("instructor", "admin"), createCourse);
router.put(
  "/:courseId",
  requireAuth,
  requireRole("instructor", "admin"),
  updateCourse
);
router.delete(
  "/:courseId",
  requireAuth,
  requireRole("instructor", "admin"),
  deleteCourse
);

export default router;