import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { isDbConnected } from "../config/db.js";
import { signToken } from "../middleware/authMiddleware.js";

const UNIFIED_INSTRUCTOR_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI";

const UNIFIED_STUDENT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBVbLK5zv3fCGI0LQY3JcseIH2cV3Y1SDQBFPuJBlN50W320ALlNXGY_VRIMZU2iLPTAXbfsJ4jomQ3KIZs6i0jtZjIJ3b8kHBB7-PhLvgXqJE2Ve1jfZrEWU41RFCDfuEfEtfL8mMsZGloU-M9XeTxYmhM7cXg1u9csmmpuigpVmDGvsi46ufavs61NL1fdGbguOx8h3sjl7KGM5VVWA64aUr8JHnvJi_yxDPe9kU";

export let memoryUsers = [
  {
    _id: "nl-admin-001",
    name: "Sashmitha N.",
    email: "admin@nexalearn.io",
    passwordHash: bcrypt.hashSync("Admin@2026!", 10),
    role: "admin",
    status: "Active",
    headline: "Platform Admin • Academic Governance",
    specialty: "System Architecture",
    institution: "NexaLearn Core",
    avatar: UNIFIED_STUDENT_AVATAR,
    createdAt: new Date(Date.now() - 40 * 86400 * 1000).toISOString(),
  },
  {
    _id: "nl-student-001",
    name: "Sarah Jenkins",
    email: "student@nexalearn.io",
    passwordHash: bcrypt.hashSync("Student@2026!", 10),
    role: "student",
    status: "Active",
    headline: "Full-Stack Engineering Learner",
    specialty: "Software Engineering",
    institution: "NexaLearn Cohort 2026",
    avatar: UNIFIED_STUDENT_AVATAR,
    createdAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
  },
  {
    _id: "nl-inst-001",
    name: "Alex Morgan",
    email: "alex.morgan@nexalearn.io",
    passwordHash: bcrypt.hashSync("Instructor@2026!", 10),
    role: "instructor",
    status: "Active",
    headline: "Staff Engineer & Lead Instructor",
    specialty: "Software Engineering",
    institution: "HyperScale Engineering",
    rating: 4.9,
    studentsMentored: "1,240 Students",
    bio: "Former Principal Architect at HyperScale and lead full-stack engineering educator on NexaLearn.",
    avatar: UNIFIED_INSTRUCTOR_AVATAR,
    createdAt: new Date(Date.now() - 35 * 86400 * 1000).toISOString(),
  },
];

// Track emails deleted by Admin so they are never re-seeded
export const deletedUserEmails = new Set();

let hasInitializedAccounts = false;

export const formatUser = (u) => ({
  id: String(u._id || u.id),
  name: u.name,
  email: u.email,
  role: u.role || "student",
  status: u.status || "Active",
  avatar:
    u.avatar ||
    (u.role === "instructor"
      ? UNIFIED_INSTRUCTOR_AVATAR
      : UNIFIED_STUDENT_AVATAR),
  headline: u.headline || "",
  specialty: u.specialty || "Software Engineering",
  bio: u.bio || "",
  institution: u.institution || "NexaLearn Academy",
  rating: u.rating || 4.9,
  studentsMentored: u.studentsMentored || "1,240 Students",
  createdAt: u.createdAt,
});

export const ensureCoreAccounts = async () => {
  if (!isDbConnected() || hasInitializedAccounts) return;
  hasInitializedAccounts = true;

  // Remove legacy Phase 1 dummy instructors from MongoDB
  await User.deleteMany({
    email: {
      $in: [
        "elena.rostova@nexalearn.io",
        "marcus.vance@nexalearn.io",
        "sarah.chen@nexalearn.io",
      ],
    },
  }).catch(() => {});

  for (const seed of memoryUsers) {
    if (deletedUserEmails.has(seed.email.toLowerCase())) continue;
    const exists = await User.findOne({ email: seed.email });
    if (!exists) {
      await User.create({
        name: seed.name,
        email: seed.email,
        password:
          seed.role === "admin"
            ? "Admin@2026!"
            : seed.role === "instructor"
            ? "Instructor@2026!"
            : "Student@2026!",
        role: seed.role,
        status: seed.status,
        avatar: seed.avatar,
        headline: seed.headline,
        specialty: seed.specialty,
        bio: seed.bio || "",
        institution: seed.institution,
        rating: seed.rating || 4.9,
        studentsMentored: seed.studentsMentored || "1,240 Students",
      }).catch(() => {});
    }
  }
};

export const getPublicInstructors = async (_req, res, next) => {
  try {
    await ensureCoreAccounts();
    if (isDbConnected()) {
      const instructors = await User.find({
        role: "instructor",
        status: "Active",
      })
        .sort({ createdAt: 1 })
        .lean();
      return res.status(200).json({
        success: true,
        data: instructors.map(formatUser),
      });
    }
    const list = memoryUsers
      .filter((u) => u.role === "instructor" && u.status === "Active")
      .map(formatUser);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, headline, specialty, bio, avatar } =
      req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email address, and password are required.",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const assignedRole = role === "instructor" ? "instructor" : "student";
    const cleanEmail = email.toLowerCase().trim();
    deletedUserEmails.delete(cleanEmail);

    const defaultAvatar =
      avatar ||
      (assignedRole === "instructor"
        ? UNIFIED_INSTRUCTOR_AVATAR
        : UNIFIED_STUDENT_AVATAR);

    if (isDbConnected()) {
      await ensureCoreAccounts();
      const exists = await User.findOne({ email: cleanEmail });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please Sign In.",
        });
      }

      const created = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: assignedRole,
        status: "Active",
        avatar: defaultAvatar,
        headline:
          headline ||
          (assignedRole === "instructor"
            ? "Senior Educator & Architect"
            : "Software Engineering Learner"),
        specialty: specialty || "Software Engineering",
        bio: bio || "",
      });

      const token = signToken(created._id, created.role);
      return res.status(201).json({
        success: true,
        token,
        user: formatUser(created),
      });
    }

    const existsMem = memoryUsers.find((u) => u.email === cleanEmail);
    if (existsMem) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please Sign In.",
      });
    }

    const newMem = {
      _id: `nl-usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: assignedRole,
      status: "Active",
      avatar: defaultAvatar,
      headline:
        headline ||
        (assignedRole === "instructor"
          ? "Senior Educator & Architect"
          : "Software Engineering Learner"),
      specialty: specialty || "Software Engineering",
      bio: bio || "",
      createdAt: new Date().toISOString(),
    };
    memoryUsers.push(newMem);

    const token = signToken(newMem._id, newMem.role);
    res.status(201).json({
      success: true,
      token,
      user: formatUser(newMem),
    });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      await ensureCoreAccounts();
      const user = await User.findOne({ email: cleanEmail }).select(
        "+password"
      );
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password. Please verify your credentials.",
        });
      }
      if (user.status === "Suspended") {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "This account has been suspended by a Platform Administrator.",
        });
      }
      const token = signToken(user._id, user.role);
      return res.status(200).json({
        success: true,
        token,
        user: formatUser(user),
      });
    }

    const memUser = memoryUsers.find((u) => u.email === cleanEmail);
    if (!memUser || !(await bcrypt.compare(password, memUser.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password. Please verify your credentials.",
      });
    }
    if (memUser.status === "Suspended") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "This account has been suspended by a Platform Administrator.",
      });
    }

    const token = signToken(memUser._id, memUser.role);
    res.status(200).json({
      success: true,
      token,
      user: formatUser(memUser),
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: formatUser(req.user) });
};

export const updateProfile = async (req, res, next) => {
  try {
    const fields = [
      "name",
      "headline",
      "specialty",
      "bio",
      "institution",
      "avatar",
    ];
    const { currentPassword, newPassword } = req.body;

    if (isDbConnected()) {
      const user = await User.findById(req.user._id).select("+password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          return res.status(400).json({
            success: false,
            message: "New password must be at least 6 characters long.",
          });
        }
        if (
          currentPassword &&
          !(await user.comparePassword(currentPassword))
        ) {
          return res.status(401).json({
            success: false,
            message: "Current password is incorrect.",
          });
        }
        user.password = newPassword;
      }

      fields.forEach((f) => {
        if (req.body[f] !== undefined) user[f] = req.body[f];
      });
      await user.save();

      if (user.role === "instructor") {
        await Course.updateMany(
          { instructorEmail: user.email },
          {
            $set: {
              instructorName: user.name,
              instructorAvatar: user.avatar,
              instructorTitle: user.headline,
              instructorBio: user.bio,
            },
          }
        ).catch(() => {});
      }

      return res.status(200).json({ success: true, user: formatUser(user) });
    }

    const memIdx = memoryUsers.findIndex(
      (u) =>
        String(u._id) === String(req.user._id) || u.email === req.user.email
    );
    const targetMem = memIdx !== -1 ? memoryUsers[memIdx] : req.user;

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long.",
        });
      }
      if (
        currentPassword &&
        targetMem.passwordHash &&
        !(await bcrypt.compare(currentPassword, targetMem.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }
      targetMem.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    fields.forEach((f) => {
      if (req.body[f] !== undefined) targetMem[f] = req.body[f];
    });

    res.status(200).json({ success: true, user: formatUser(targetMem) });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide your registered account email address.",
      });
    }
    res.status(200).json({
      success: true,
      message: `Password recovery instructions dispatched to ${email
        .toLowerCase()
        .trim()}.`,
    });
  } catch (err) {
    next(err);
  }
};