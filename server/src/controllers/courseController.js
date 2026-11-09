import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Submission from "../models/Submission.js";
import AuditLog from "../models/AuditLog.js";
import { isDbConnected } from "../config/db.js";

const UNIFIED_INSTRUCTOR_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI";

export const INITIAL_COURSES = [
  {
    courseId: "CRS-2026-001",
    title: "Full-Stack Web Development with MERN",
    shortDescription:
      "Master MongoDB, Express, React 19, and Node.js with JWT security, REST APIs, and production deployment.",
    overview:
      "An end-to-end engineering course covering modern ESNext JavaScript, React 19 hooks, Node.js/Express REST APIs, and MongoDB schema architecture.",
    category: "Software Engineering",
    difficulty: "Intermediate",
    durationHours: 24,
    durationLabel: "24 Hours",
    durationText: "24 Hours (6 Weeks)",
    expiryDate: "2026-12-15",
    rating: 4.9,
    reviewsCount: "120",
    enrolledCount: 148,
    completionAvg: 78,
    price: 49,
    originalPrice: 189,
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAaswXgfmOIH-Y5sPi1RShq7iP21Impmjw-VwhBja1N-rh0_C5q2SmLl-nXwLSUbGivAXrRySJXXknxgecSk1qnzvSPd8WsEhvPht1eND5QqjEpweeKR-NXV1W1rKhZfJ6i3EC516gckdNTj9YgO2up0r5lhg0mPxBNWFs6pf_qaZMlfK8ApEO4d0_qT_iyXsXGewtrvWWEJ9bRkHBciu4W54jXfhG4vil6vWtRA7U",
    instructorEmail: "alex.morgan@nexalearn.io",
    instructorName: "Alex Morgan",
    instructorTitle: "Staff Engineer & Lead Instructor",
    instructorAvatar: UNIFIED_INSTRUCTOR_AVATAR,
    instructorBio:
      "Former Principal Architect at HyperScale and lead full-stack engineering educator on NexaLearn.",
    learningOutcomes: [
      "Architect modular full-stack web apps with React 19 and Node.js.",
      "Implement JWT authentication, bcrypt hashing, and RBAC middleware.",
      "Model production MongoDB schemas with compound indexes.",
      "Build, test, and deploy a full-stack capstone project.",
    ],
    modules: [
      {
        moduleId: "MOD-01",
        number: "01",
        title: "Module 1: Modern JavaScript & React 19 Foundations",
        durationSummary: "2 Lessons • 1h 15m",
        expanded: true,
        lessons: [
          {
            lessonId: "LES-101",
            title: "1.1 Scope, Closures & Component Architecture",
            type: "Video",
            duration: "20m",
            isFreePreview: true,
          },
          {
            lessonId: "LES-102",
            title: "1.2 React State, Props & useEffect Lifecycle",
            type: "Video",
            duration: "25m",
            isFreePreview: false,
          },
        ],
      },
      {
        moduleId: "MOD-02",
        number: "02",
        title: "Module 2: Node.js, Express REST APIs & MongoDB",
        durationSummary: "2 Lessons • 1h 30m",
        expanded: true,
        lessons: [
          {
            lessonId: "LES-201",
            title: "2.1 Express Routing, Middleware & JWT Security",
            type: "Video",
            duration: "30m",
            isFreePreview: false,
          },
          {
            lessonId: "LES-202",
            title: "2.2 Mongoose Schemas & Compound Indexing",
            type: "Text/Code Guide",
            duration: "35m",
            isFreePreview: false,
          },
        ],
      },
    ],
    quiz: {
      title: "MERN Stack & React 19 Mastery Quiz",
      passingScore: 70,
      timeLimitMinutes: 5,
      questions: [
        {
          questionId: "Q-101",
          concept: "React Hooks",
          question:
            "Which React hook is used to synchronize a component with an external system or side effect?",
          options: ["useState", "useEffect", "useMemo", "useRef"],
          correctIndex: 1,
          explanation:
            "useEffect lets you synchronize a component with an external system (such as API calls or timers) after rendering.",
        },
        {
          questionId: "Q-102",
          concept: "Local State",
          question:
            "Which React hook declares a state variable that triggers a re-render when updated?",
          options: ["useState", "useContext", "useCallback", "useId"],
          correctIndex: 0,
          explanation:
            "useState returns the current state value and a setter function that triggers a component re-render.",
        },
        {
          questionId: "Q-103",
          concept: "Backend Security",
          question:
            "Why must Role-Based Access Control (RBAC) be checked inside Express API middleware?",
          options: [
            "Because client-side UI checks can be bypassed via direct HTTP requests",
            "Because React does not support buttons",
            "To make images load faster",
            "Because MongoDB requires it",
          ],
          correctIndex: 0,
          explanation:
            "Frontend checks are only for UX; true security requires verifying the JWT token and role on the backend server.",
        },
      ],
    },
    assignment: {
      title: "REST API Authentication & JWT Middleware",
      instructions:
        "Upload your project deliverable (.zip, .pdf, or .docx) demonstrating Express JWT authentication and protected routes.",
      dueDate: "2026-12-15",
      maxScore: 100,
    },
    assignments: [
      {
        assignmentId: "ASN-2026-001",
        title: "REST API Authentication & JWT Middleware",
        instructions:
          "Upload your project deliverable (.zip, .pdf, or .docx) demonstrating Express JWT authentication and protected routes.",
        dueDate: "2026-12-15",
        maxScore: 100,
        deliverableFormat: "ZIP, PDF, or DOCX",
      },
    ],
    status: "Published",
    moderationReason: "",
    instructorResolutionNote: "",
  },
];

export let memoryCourses = [...INITIAL_COURSES];

let hasCleanedLegacySeed = false;

const ensureCoursesSeeded = async () => {
  if (!isDbConnected() || hasCleanedLegacySeed) return;
  hasCleanedLegacySeed = true;

  await Course.deleteMany({
    title: {
      $in: [
        "Python for Data Science & Machine Learning",
        "Cloud Native Kubernetes & DevOps Pipelines",
        "Modern UI/UX Design Systems in Figma",
        "Next.js 15 & TypeScript Enterprise Patterns",
        "Applied Generative AI & LLM Engineering",
      ],
    },
  }).catch(() => {});
};

export const generateNextCourseId = async () => {
  if (isDbConnected()) {
    const docs = await Course.find({}, { courseId: 1 }).lean();
    const max = docs.reduce((acc, d) => {
      const m = String(d.courseId || "").match(/CRS-\d{4}-(\d+)/i);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > acc ? n : acc;
    }, 0);
    return `CRS-2026-${String(max + 1).padStart(3, "0")}`;
  }
  const maxMem = memoryCourses.reduce((acc, d) => {
    const m = String(d.courseId || "").match(/CRS-\d{4}-(\d+)/i);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `CRS-2026-${String(maxMem + 1).padStart(3, "0")}`;
};

export const getCourses = async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const { includeAll = "false" } = req.query;

    let courses = [];
    if (isDbConnected()) {
      const filter = includeAll === "true" ? {} : { status: "Published" };
      courses = await Course.find(filter).sort({ courseId: 1 }).lean();
    } else {
      courses =
        includeAll === "true"
          ? [...memoryCourses]
          : memoryCourses.filter((c) => c.status === "Published");
    }

    res.status(200).json({
      success: true,
      dbConnected: isDbConnected(),
      count: courses.length,
      data: courses,
    });
  } catch (err) {
    next(err);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const requestedId = req.body.courseId
      ? String(req.body.courseId).toUpperCase().trim()
      : await generateNextCourseId();

    const hours = Number(req.body.durationHours || 20);
    const payload = {
      courseId: requestedId,
      title: req.body.title || "Untitled Engineering Course",
      shortDescription:
        req.body.shortDescription ||
        `Master ${
          req.body.title || "modern engineering"
        } with interactive video modules, auto-graded quizzes, and capstone projects.`,
      overview:
        req.body.overview ||
        req.body.shortDescription ||
        "Comprehensive curriculum designed for production engineering mastery.",
      category: req.body.category || "Software Engineering",
      difficulty: req.body.difficulty || "Intermediate",
      durationHours: hours,
      durationLabel: req.body.durationLabel || `${hours} Hours`,
      durationText: req.body.durationText || `${hours} Hours`,
      expiryDate: req.body.expiryDate || "2026-12-31",
      rating: 4.9,
      reviewsCount: "New",
      enrolledCount: Number(req.body.enrolledCount ?? 0),
      completionAvg: Number(req.body.completionAvg ?? 75),
      price: Number(req.body.price || 49),
      originalPrice: Number(req.body.originalPrice || 179),
      thumbnail: req.body.thumbnail || INITIAL_COURSES[0].thumbnail,
      instructorEmail: (
        req.body.instructorEmail ||
        req.user?.email ||
        "alex.morgan@nexalearn.io"
      )
        .toLowerCase()
        .trim(),
      instructorName:
        req.body.instructorName || req.user?.name || "Alex Morgan",
      instructorTitle:
        req.body.instructorTitle ||
        req.user?.headline ||
        "Staff Engineer & Lead Instructor",
      instructorAvatar:
        req.body.instructorAvatar ||
        req.user?.avatar ||
        UNIFIED_INSTRUCTOR_AVATAR,
      instructorBio:
        req.body.instructorBio ||
        req.user?.bio ||
        INITIAL_COURSES[0].instructorBio,
      learningOutcomes:
        Array.isArray(req.body.learningOutcomes) &&
        req.body.learningOutcomes.length > 0
          ? req.body.learningOutcomes
          : INITIAL_COURSES[0].learningOutcomes,
      modules:
        Array.isArray(req.body.modules) && req.body.modules.length > 0
          ? req.body.modules
          : INITIAL_COURSES[0].modules,
      quiz: req.body.quiz || INITIAL_COURSES[0].quiz,
      assignment: req.body.assignment || INITIAL_COURSES[0].assignment,
      assignments:
        Array.isArray(req.body.assignments) && req.body.assignments.length > 0
          ? req.body.assignments
          : INITIAL_COURSES[0].assignments,
      status: "Published",
      moderationReason: "",
      instructorResolutionNote: "",
    };

    if (isDbConnected()) {
      const existingCourseDoc = await Course.findOne({ courseId: requestedId });
      if (!existingCourseDoc) {
        await Enrollment.deleteMany({ courseId: requestedId }).catch(() => {});
        await Submission.deleteMany({ courseId: requestedId }).catch(() => {});
      }

      const created = await Course.findOneAndUpdate(
        { courseId: requestedId },
        { $set: payload },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
      return res.status(201).json({ success: true, data: created });
    }

    const existsMem = memoryCourses.some((c) => c.courseId === requestedId);
    memoryCourses = existsMem
      ? memoryCourses.map((c) =>
          c.courseId === requestedId ? { ...c, ...payload } : c
        )
      : [payload, ...memoryCourses];

    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const courseId = req.params.courseId.toUpperCase().trim();

    if (isDbConnected()) {
      let course = await Course.findOne({ courseId });

      if (!course) {
        req.body.courseId = courseId;
        return createCourse(req, res, next);
      }

      if (
        (course.status === "Hidden" || course.status === "Pending Review") &&
        req.user?.role === "instructor"
      ) {
        req.body.status = "Pending Review";
        if (req.body.instructorResolutionNote) {
          course.instructorResolutionNote = req.body.instructorResolutionNote;
        } else if (!course.instructorResolutionNote) {
          course.instructorResolutionNote =
            "Instructor updated course syllabus and quiz rubric for Admin verification.";
        }
      }

      if (req.body.moderationReason === undefined) {
        delete req.body.moderationReason;
      }

      Object.assign(course, req.body);
      if (req.body.durationHours) {
        course.durationLabel = `${req.body.durationHours} Hours`;
      }
      await course.save();

      if (req.body.instructorResolutionNote && req.user?.role === "instructor") {
        await AuditLog.create({
          logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
          adminName: `${req.user.name || "Instructor"} (Instructor)`,
          adminEmail: req.user.email || "instructor@nexalearn.io",
          action: "Resolution Submitted",
          target: `#${courseId}`,
          reason: req.body.instructorResolutionNote,
          outcome: "PENDING ADMIN",
        }).catch(() => {});
      }

      return res.status(200).json({ success: true, data: course });
    }

    const existsMem = memoryCourses.some((c) => c.courseId === courseId);
    if (!existsMem) {
      req.body.courseId = courseId;
      return createCourse(req, res, next);
    }

    memoryCourses = memoryCourses.map((c) => {
      if (c.courseId !== courseId) return c;
      const isModerated =
        c.status === "Hidden" || c.status === "Pending Review";
      const nextStatus =
        isModerated && req.user?.role === "instructor"
          ? "Pending Review"
          : req.body.status || c.status;
      return {
        ...c,
        ...req.body,
        status: nextStatus,
        moderationReason:
          req.body.moderationReason !== undefined
            ? req.body.moderationReason
            : c.moderationReason,
        instructorResolutionNote:
          req.body.instructorResolutionNote !== undefined
            ? req.body.instructorResolutionNote
            : c.instructorResolutionNote,
      };
    });

    const updated = memoryCourses.find((c) => c.courseId === courseId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.courseId.toUpperCase().trim();
    memoryCourses = memoryCourses.filter((c) => c.courseId !== courseId);

    if (isDbConnected()) {
      await Course.deleteMany({ courseId });
      // Only remove incomplete enrollments; preserve completed enrollments so students keep their earned certificates!
      await Enrollment.deleteMany({
        courseId,
        progressPercent: { $lt: 100 },
        certificateIssued: { $ne: true },
      }).catch(() => {});
      await Submission.deleteMany({ courseId }).catch(() => {});
    }
    return res.status(200).json({
      success: true,
      deletedCourseId: courseId,
      message: `Course #${courseId} permanently deleted.`,
    });
  } catch (err) {
    next(err);
  }
};