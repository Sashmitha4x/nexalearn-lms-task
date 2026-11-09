import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Submission from "../models/Submission.js";
import AuditLog from "../models/AuditLog.js";
import { isDbConnected } from "../config/db.js";
import {
  memoryUsers,
  deletedUserEmails,
  formatUser,
  ensureCoreAccounts,
} from "./authController.js";
import { memoryCourses } from "./courseController.js";

export let memoryAuditLogs = [
  {
    logId: "AUD-2026-001",
    adminName: "Sashmitha N.",
    adminEmail: "admin@nexalearn.io",
    action: "Course Hidden",
    target: "#CRS-2026-002",
    reason: "Missing quiz grading rubric in Module 1.",
    outcome: "SUCCESS",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const recordAdminAudit = async ({
  adminName = "Sashmitha N.",
  adminEmail = "admin@nexalearn.io",
  action,
  target,
  reason,
  outcome = "SUCCESS",
}) => {
  const entry = {
    logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
    adminName,
    adminEmail,
    action,
    target,
    reason,
    outcome,
    createdAt: new Date().toISOString(),
  };
  memoryAuditLogs = [entry, ...memoryAuditLogs];
  if (isDbConnected()) {
    await AuditLog.create(entry).catch(() => {});
  }
  return entry;
};

export const getAdminUsers = async (_req, res, next) => {
  try {
    await ensureCoreAccounts();
    if (isDbConnected()) {
      const users = await User.find({ role: { $ne: "admin" } })
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({
        success: true,
        data: users
          .filter((u) => !deletedUserEmails.has((u.email || "").toLowerCase()))
          .map(formatUser),
      });
    }
    const list = memoryUsers
      .filter(
        (u) =>
          u.role !== "admin" &&
          !deletedUserEmails.has((u.email || "").toLowerCase())
      )
      .map(formatUser);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatusAdmin = async (req, res, next) => {
  try {
    const rawParam = decodeURIComponent(req.params.userId || "").trim();
    const { status, reason, email } = req.body;
    const nextStatus = status === "Suspended" ? "Suspended" : "Active";
    const lookupEmail = (email || rawParam).toLowerCase().trim();

    // Also update in-memory array so hybrid mode stays consistent
    memoryUsers.forEach((u) => {
      if (
        String(u._id) === rawParam ||
        u.email?.toLowerCase() === lookupEmail
      ) {
        u.status = nextStatus;
      }
    });

    if (isDbConnected()) {
      const user =
        (await User.findById(rawParam).catch(() => null)) ||
        (await User.findOne({ email: lookupEmail }));

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User account not found." });
      }
      if (user.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Root administrator accounts cannot be suspended.",
        });
      }
      user.status = nextStatus;
      await user.save();

      await recordAdminAudit({
        adminName: req.user?.name || "Sashmitha N.",
        adminEmail: req.user?.email || "admin@nexalearn.io",
        action:
          nextStatus === "Suspended"
            ? "Account Suspended"
            : "Account Reactivated",
        target: `${user.name} (${user.email})`,
        reason:
          reason ||
          (nextStatus === "Suspended"
            ? "Security & policy governance enforcement"
            : "Account privileges restored after verification"),
        outcome: nextStatus === "Suspended" ? "REVOKED" : "RESTORED",
      });

      return res.status(200).json({ success: true, data: formatUser(user) });
    }

    const updatedMem = memoryUsers.find(
      (u) =>
        String(u._id) === rawParam || u.email?.toLowerCase() === lookupEmail
    );

    await recordAdminAudit({
      adminName: req.user?.name || "Sashmitha N.",
      adminEmail: req.user?.email || "admin@nexalearn.io",
      action:
        nextStatus === "Suspended"
          ? "Account Suspended"
          : "Account Reactivated",
      target: updatedMem
        ? `${updatedMem.name} (${updatedMem.email})`
        : `User ${rawParam}`,
      reason:
        reason ||
        (nextStatus === "Suspended"
          ? "Security & policy governance enforcement"
          : "Account privileges restored"),
      outcome: nextStatus === "Suspended" ? "REVOKED" : "RESTORED",
    });

    res.status(200).json({
      success: true,
      data: updatedMem ? formatUser(updatedMem) : null,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUserAdmin = async (req, res, next) => {
  try {
    const rawParam = decodeURIComponent(req.params.userId || "").trim();
    const reason =
      req.body?.reason || "Account permanently deleted by Platform Admin";
    const bodyEmail = (req.body?.email || rawParam).toLowerCase().trim();

    deletedUserEmails.add(bodyEmail);

    // Remove from in-memory array
    const memIdx = memoryUsers.findIndex(
      (u) =>
        String(u._id) === rawParam || u.email?.toLowerCase() === bodyEmail
    );
    if (memIdx !== -1) {
      deletedUserEmails.add(memoryUsers[memIdx].email.toLowerCase());
      memoryUsers.splice(memIdx, 1);
    }

    if (isDbConnected()) {
      const user =
        (await User.findById(rawParam).catch(() => null)) ||
        (await User.findOne({ email: bodyEmail }));

      if (user) {
        if (user.role === "admin") {
          return res.status(403).json({
            success: false,
            message: "Root administrator accounts cannot be deleted.",
          });
        }
        const cleanEmail = user.email.toLowerCase().trim();
        deletedUserEmails.add(cleanEmail);

        const targetLabel = `${user.name} (${user.email} • ${user.role.toUpperCase()})`;
        await Enrollment.deleteMany({ studentEmail: cleanEmail }).catch(
          () => {}
        );
        await Submission.deleteMany({ studentEmail: cleanEmail }).catch(
          () => {}
        );
        await User.deleteOne({ _id: user._id });

        await recordAdminAudit({
          adminName: req.user?.name || "Sashmitha N.",
          adminEmail: req.user?.email || "admin@nexalearn.io",
          action: "Account Deleted",
          target: targetLabel,
          reason,
          outcome: "PURGED",
        });

        return res.status(200).json({
          success: true,
          deletedEmail: cleanEmail,
          message: `Account ${cleanEmail} permanently deleted.`,
        });
      }
    }

    await recordAdminAudit({
      adminName: req.user?.name || "Sashmitha N.",
      adminEmail: req.user?.email || "admin@nexalearn.io",
      action: "Account Deleted",
      target: bodyEmail,
      reason,
      outcome: "PURGED",
    });

    res.status(200).json({
      success: true,
      deletedEmail: bodyEmail,
      message: "User account permanently deleted.",
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (_req, res, next) => {
  try {
    if (isDbConnected()) {
      const count = await AuditLog.countDocuments();
      if (count === 0) {
        await AuditLog.insertMany(memoryAuditLogs).catch(() => {});
      }
      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      return res.status(200).json({
        success: true,
        data: logs.length > 0 ? logs : memoryAuditLogs,
      });
    }
    res.status(200).json({ success: true, data: memoryAuditLogs });
  } catch (err) {
    next(err);
  }
};

export const moderateCourseAdmin = async (req, res, next) => {
  try {
    const courseId = req.params.courseId.toUpperCase().trim();
    const { status, reason } = req.body; // "Hidden" | "Published" | "Removed"

    const actionLabel =
      status === "Hidden"
        ? "Course Hidden"
        : status === "Removed"
        ? "Course Deleted"
        : "Course Approved & Unhidden";

    const outcomeLabel = status === "Removed" ? "PURGED" : "SUCCESS";

    const updateFields =
      status === "Published"
        ? {
            status: "Published",
            moderationReason: "",
            instructorResolutionNote: "",
          }
        : status === "Removed"
        ? {
            status: "Removed",
            moderationReason:
              reason || "Course deleted by Platform Administrator.",
            instructorResolutionNote: "",
          }
        : {
            status: "Hidden",
            moderationReason: reason || "Incomplete Syllabus / Assessments",
            instructorResolutionNote: "",
          };

    // Keep memoryCourses in sync
    memoryCourses.forEach((c) => {
      if (c.courseId === courseId) {
        Object.assign(c, updateFields);
      }
    });

    if (isDbConnected()) {
      const updatedDoc = await Course.findOneAndUpdate(
        { courseId },
        { $set: updateFields },
        { returnDocument: "after" }
      ).lean();

      await recordAdminAudit({
        adminName: req.user?.name || "Sashmitha N.",
        adminEmail: req.user?.email || "admin@nexalearn.io",
        action: actionLabel,
        target: `#${courseId}`,
        reason:
          reason ||
          (status === "Published"
            ? "Instructor resolution verified and approved by Admin"
            : "Governance moderation applied"),
        outcome: outcomeLabel,
      });

      return res.status(200).json({ success: true, data: updatedDoc });
    }

    const updated = memoryCourses.find((c) => c.courseId === courseId);

    await recordAdminAudit({
      adminName: req.user?.name || "Sashmitha N.",
      adminEmail: req.user?.email || "admin@nexalearn.io",
      action: actionLabel,
      target: `#${courseId}`,
      reason:
        reason ||
        (status === "Published"
          ? "Instructor resolution verified and approved by Admin"
          : "Governance moderation applied"),
      outcome: outcomeLabel,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};