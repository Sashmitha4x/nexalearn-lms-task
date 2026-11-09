import express from "express";
import {
  getEnrollments,
  enrollInCourse,
  getSubmissions,
  submitAssignment,
  updateClassroomProgress,
  gradeSubmission,
} from "../controllers/enrollmentController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getEnrollments);
router.post("/enroll", requireRole("student"), enrollInCourse);
router.get("/submissions", getSubmissions);
router.post("/submissions", requireRole("student"), submitAssignment);
router.put(
  "/:courseId/progress",
  requireRole("student"),
  updateClassroomProgress
);
router.put(
  "/submissions/:submissionId/grade",
  requireRole("instructor", "admin"),
  gradeSubmission
);

export default router;