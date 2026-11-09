import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.get("/me", requireAuth, getMe);
router.put("/profile", requireAuth, updateProfile);

export default router;