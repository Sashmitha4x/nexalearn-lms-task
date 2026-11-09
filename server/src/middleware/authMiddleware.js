import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { isDbConnected } from "../config/db.js";
import {
  memoryUsers,
  deletedUserEmails,
  ensureCoreAccounts,
} from "../controllers/authController.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "nexalearn_enterprise_jwt_secret_2026";

export const signToken = (userId, role) =>
  jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const requireAuth = async (req, res, next) => {
  try {
    await ensureCoreAccounts();

    let token = null;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    const headerEmail = String(req.headers["x-user-email"] || "")
      .toLowerCase()
      .trim();

    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }

    if (!decoded && !headerEmail) {
      return res.status(401).json({
        success: false,
        code: "NO_TOKEN",
        message: "Authentication required. Please sign in.",
      });
    }

    if (headerEmail && deletedUserEmails.has(headerEmail)) {
      return res.status(401).json({
        success: false,
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted by the Platform Administrator.",
      });
    }

    if (isDbConnected()) {
      let user = null;
      if (decoded?.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
        user = await User.findById(decoded.id);
      }
      if (!user && headerEmail) {
        user = await User.findOne({ email: headerEmail });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted by the Platform Administrator.",
        });
      }

      if (deletedUserEmails.has(user.email.toLowerCase())) {
        return res.status(401).json({
          success: false,
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted by the Platform Administrator.",
        });
      }

      if (user.status === "Suspended") {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "Session revoked: Your account has been suspended by a Platform Administrator.",
        });
      }

      req.user = user;
      return next();
    }

    const memUser = memoryUsers.find(
      (u) =>
        (decoded?.id && String(u._id) === String(decoded.id)) ||
        (headerEmail && u.email?.toLowerCase() === headerEmail)
    );

    if (!memUser) {
      return res.status(401).json({
        success: false,
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted by the Platform Administrator.",
      });
    }

    if (memUser.status === "Suspended") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message:
          "Session revoked: Your account has been suspended by a Platform Administrator.",
      });
    }

    req.user = memUser;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid or expired session token. Please sign in again.",
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};