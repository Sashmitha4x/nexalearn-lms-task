import Enrollment from "../models/Enrollment.js";
import Submission from "../models/Submission.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { isDbConnected } from "../config/db.js";
import { INITIAL_COURSES } from "./courseController.js";

export let memoryEnrollments = [];
export let memorySubmissions = [];

let hasPurgedOnce = false;

const purgeInvalidEnrollments = async () => {
  if (!isDbConnected() || hasPurgedOnce) return;
  hasPurgedOnce = true;

  try {
    const staffUsers = await User.find(
      { role: { $in: ["instructor", "admin"] } },
      { email: 1 }
    ).lean();

    const staffEmails = Array.from(
      new Set([
        "alex.morgan@nexalearn.io",
        "admin@nexalearn.io",
        ...staffUsers.map((u) => (u.email || "").toLowerCase().trim()),
      ])
    ).filter(Boolean);

    await Enrollment.deleteMany({
      $or: [
        { studentEmail: { $in: staffEmails } },
        { $expr: { $eq: ["$studentEmail", "$instructorEmail"] } },
      ],
    });

    await Submission.deleteMany({
      studentEmail: { $in: staffEmails },
    });
  } catch {
    // Ignore cleanup errors
  }
};

export const getEnrollments = async (req, res, next) => {
  try {
    await purgeInvalidEnrollments();

    if (isDbConnected()) {
      const filter =
        req.user.role === "student"
          ? { studentEmail: req.user.email.toLowerCase().trim() }
          : {};
      const list = await Enrollment.find(filter).sort({ createdAt: -1 }).lean();

      // Double-filter so an instructor's email is never returned as a student
      const cleanList = list.filter(
        (e) =>
          e.studentEmail?.toLowerCase() !== "alex.morgan@nexalearn.io" &&
          e.studentEmail?.toLowerCase() !== "admin@nexalearn.io" &&
          e.studentEmail?.toLowerCase() !== e.instructorEmail?.toLowerCase()
      );

      return res.status(200).json({ success: true, data: cleanList });
    }

    const list =
      req.user.role === "student"
        ? memoryEnrollments.filter(
            (e) =>
              e.studentEmail?.toLowerCase() ===
              req.user.email?.toLowerCase().trim()
          )
        : memoryEnrollments.filter(
            (e) =>
              e.studentEmail?.toLowerCase() !== "alex.morgan@nexalearn.io" &&
              e.studentEmail?.toLowerCase() !== e.instructorEmail?.toLowerCase()
          );

    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

export const enrollInCourse = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only student accounts can enroll in courses.",
      });
    }

    const courseId = String(req.body.courseId || "").toUpperCase().trim();
    if (!courseId) {
      return res
        .status(400)
        .json({ success: false, message: "Course ID is required." });
    }

    const cleanStudentEmail = req.user.email.toLowerCase().trim();

    if (isDbConnected()) {
      const existing = await Enrollment.findOne({
        courseId,
        studentEmail: cleanStudentEmail,
      });
      if (existing) {
        return res.status(200).json({ success: true, data: existing });
      }
      const course =
        (await Course.findOne({ courseId })) || INITIAL_COURSES[0];
      const created = await Enrollment.create({
        enrollmentId: `ENR-2026-${String(Date.now()).slice(-4)}`,
        courseId,
        courseTitle: course.title,
        courseCategory: course.category,
        courseThumbnail:
          course.thumbnail || INITIAL_COURSES[0]?.thumbnail || "",
        instructorName: course.instructorName || "Alex Morgan",
        instructorEmail: course.instructorEmail || "alex.morgan@nexalearn.io",
        studentEmail: cleanStudentEmail,
        studentName: req.user.name,
        completedLessonIds: ["LES-101"],
        progressPercent: 15,
        quizCompleted: false,
        bestQuizScore: null,
        quizPassed: false,
        quizAnswers: {},
      });
      await Course.updateOne({ courseId }, { $inc: { enrolledCount: 1 } });
      return res.status(201).json({ success: true, data: created });
    }

    const existingMem = memoryEnrollments.find(
      (e) =>
        e.courseId === courseId &&
        e.studentEmail?.toLowerCase() === cleanStudentEmail
    );
    if (existingMem) {
      return res.status(200).json({ success: true, data: existingMem });
    }
    const course =
      INITIAL_COURSES.find((c) => c.courseId === courseId) ||
      INITIAL_COURSES[0];
    const createdMem = {
      enrollmentId: `ENR-2026-${String(Date.now()).slice(-4)}`,
      courseId,
      courseTitle: course.title,
      courseCategory: course.category,
      courseThumbnail: course.thumbnail || "",
      instructorName: course.instructorName || "Alex Morgan",
      instructorEmail: course.instructorEmail || "alex.morgan@nexalearn.io",
      studentEmail: cleanStudentEmail,
      studentName: req.user.name,
      completedLessonIds: ["LES-101"],
      progressPercent: 15,
      quizCompleted: false,
      bestQuizScore: null,
      quizPassed: false,
      quizAnswers: {},
      assignmentStatus: "Pending",
      assignmentGrade: null,
      assignmentFeedback: "",
      certificateIssued: false,
      certificateId: "",
      personalNotes: "",
    };
    memoryEnrollments = [createdMem, ...memoryEnrollments];
    res.status(201).json({ success: true, data: createdMem });
  } catch (err) {
    next(err);
  }
};

export const getSubmissions = async (req, res, next) => {
  try {
    await purgeInvalidEnrollments();
    if (isDbConnected()) {
      const filter =
        req.user.role === "student"
          ? { studentEmail: req.user.email.toLowerCase().trim() }
          : {};
      const list = await Submission.find(filter).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: list });
    }
    const list =
      req.user.role === "student"
        ? memorySubmissions.filter(
            (s) =>
              s.studentEmail?.toLowerCase() ===
              req.user.email?.toLowerCase().trim()
          )
        : memorySubmissions;
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

export const submitAssignment = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only student accounts can submit assignments.",
      });
    }

    const {
      courseId = "CRS-2026-001",
      courseTitle = "Full-Stack Web Development with MERN",
      assignmentTitle = "REST API Authentication & JWT Middleware",
      instructorEmail = "alex.morgan@nexalearn.io",
      fileName = "student-project.zip",
      fileSizeKB = 1840,
      fileDataUrl = "",
      notes = "",
    } = req.body;

    const cleanCourseId = String(courseId).toUpperCase().trim();
    const cleanStudentEmail = req.user.email.toLowerCase().trim();

    const payload = {
      submissionId: `SUB-2026-${String(Date.now()).slice(-4)}`,
      courseId: cleanCourseId,
      courseTitle,
      assignmentTitle,
      instructorEmail,
      studentName: req.user.name,
      studentEmail: cleanStudentEmail,
      fileName,
      fileSizeKB: Number(fileSizeKB || 1420),
      fileDataUrl,
      notes,
      status: "Pending",
      grade: null,
      feedback: "",
      createdAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      await Submission.deleteMany({
        courseId: cleanCourseId,
        assignmentTitle,
        studentEmail: cleanStudentEmail,
      }).catch(() => {});

      const created = await Submission.create(payload);
      await Enrollment.findOneAndUpdate(
        { courseId: cleanCourseId, studentEmail: cleanStudentEmail },
        { $set: { assignmentStatus: "Submitted" } }
      ).catch(() => {});
      return res.status(201).json({ success: true, data: created });
    }

    memorySubmissions = [
      payload,
      ...memorySubmissions.filter(
        (s) =>
          !(
            s.courseId === cleanCourseId &&
            s.assignmentTitle === assignmentTitle &&
            s.studentEmail === cleanStudentEmail
          )
      ),
    ];
    memoryEnrollments = memoryEnrollments.map((e) =>
      e.courseId === cleanCourseId && e.studentEmail === cleanStudentEmail
        ? { ...e, assignmentStatus: "Submitted" }
        : e
    );
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

export const updateClassroomProgress = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only student accounts can record classroom progress.",
      });
    }

    const courseId = String(req.params.courseId || "CRS-2026-001")
      .toUpperCase()
      .trim();
    const cleanStudentEmail = req.user.email.toLowerCase().trim();
    const {
      completedLessonId,
      progressPercent,
      quizCompleted,
      quizScore,
      quizAnswers,
      certificateIssued,
      personalNotes,
    } = req.body;

    if (isDbConnected()) {
      let enrollment = await Enrollment.findOne({
        courseId,
        studentEmail: cleanStudentEmail,
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Student is not enrolled in this course.",
        });
      }

      if (
        completedLessonId &&
        !enrollment.completedLessonIds.includes(completedLessonId)
      ) {
        enrollment.completedLessonIds.push(completedLessonId);
      }
      if (typeof progressPercent === "number") {
        enrollment.progressPercent = Math.min(
          100,
          Math.max(0, progressPercent)
        );
      }
      if (quizCompleted !== undefined) {
        enrollment.quizCompleted = Boolean(quizCompleted);
      }
      if (typeof quizScore === "number") {
        enrollment.bestQuizScore = quizScore;
        enrollment.quizPassed = quizScore >= 70;
      }
      if (quizAnswers && typeof quizAnswers === "object") {
        enrollment.quizAnswers = quizAnswers;
      }
      if (personalNotes !== undefined) {
        enrollment.personalNotes = personalNotes;
      }

      // Automatically issue certificate when progress reaches 100% or certificateIssued is true
      if (enrollment.progressPercent >= 100 || certificateIssued) {
        enrollment.progressPercent = 100;
        enrollment.certificateIssued = true;
        if (!enrollment.certificateId) {
          const suffix = courseId.split("-").pop() || "001";
          enrollment.certificateId = `#CERT-NL-2026-${suffix}`;
        }
      }

      await enrollment.save();
      return res.status(200).json({ success: true, data: enrollment });
    }

    memoryEnrollments = memoryEnrollments.map((e) => {
      if (e.courseId !== courseId || e.studentEmail !== cleanStudentEmail)
        return e;
      const nextLessons =
        completedLessonId && !e.completedLessonIds.includes(completedLessonId)
          ? [...e.completedLessonIds, completedLessonId]
          : e.completedLessonIds;
      const nextQuiz =
        typeof quizScore === "number" ? quizScore : e.bestQuizScore;
      const nextProgress =
        typeof progressPercent === "number"
          ? progressPercent
          : e.progressPercent;
      const isNowComplete =
        nextProgress >= 100 || Boolean(certificateIssued) || e.certificateIssued;

      return {
        ...e,
        completedLessonIds: nextLessons,
        progressPercent: isNowComplete ? 100 : nextProgress,
        quizCompleted:
          quizCompleted !== undefined
            ? Boolean(quizCompleted)
            : e.quizCompleted,
        bestQuizScore: nextQuiz,
        quizPassed: (nextQuiz || 0) >= 70,
        quizAnswers: quizAnswers || e.quizAnswers || {},
        certificateIssued: isNowComplete,
        certificateId:
          e.certificateId ||
          (isNowComplete
            ? `#CERT-NL-2026-${courseId.split("-").pop() || "001"}`
            : ""),
        personalNotes:
          personalNotes !== undefined ? personalNotes : e.personalNotes,
      };
    });

    const updated = memoryEnrollments.find(
      (e) => e.courseId === courseId && e.studentEmail === cleanStudentEmail
    );
    res.status(200).json({ success: true, data: updated || {} });
  } catch (err) {
    next(err);
  }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const submissionId = String(req.params.submissionId || "")
      .toUpperCase()
      .trim();
    const { grade, feedback, status = "Graded" } = req.body;
    const numericGrade = Math.min(100, Math.max(0, Number(grade ?? 95)));

    if (isDbConnected()) {
      const sub = await Submission.findOne({ submissionId });
      if (!sub) {
        return res
          .status(404)
          .json({ success: false, message: "Student submission not found." });
      }
      sub.grade = numericGrade;
      sub.feedback =
        feedback ||
        "Exceptional architectural implementation and clean security practices.";
      sub.status = status;
      sub.gradedAt = new Date();
      await sub.save();

      await Enrollment.findOneAndUpdate(
        { courseId: sub.courseId, studentEmail: sub.studentEmail },
        {
          $set: {
            assignmentStatus: "Graded",
            assignmentGrade: numericGrade,
            assignmentFeedback: sub.feedback,
            progressPercent: 100,
            certificateIssued: numericGrade >= 70,
            certificateId: `CERT-NL-2026-${String(Date.now()).slice(-3)}`,
          },
        }
      ).catch(() => {});

      return res.status(200).json({ success: true, data: sub });
    }

    memorySubmissions = memorySubmissions.map((s) =>
      s.submissionId === submissionId
        ? {
            ...s,
            grade: numericGrade,
            feedback:
              feedback ||
              "Exceptional architectural implementation and clean security practices.",
            status,
            gradedAt: new Date().toISOString(),
          }
        : s
    );

    const updatedSub = memorySubmissions.find(
      (s) => s.submissionId === submissionId
    );

    if (updatedSub) {
      memoryEnrollments = memoryEnrollments.map((e) =>
        e.courseId === updatedSub.courseId &&
        e.studentEmail === updatedSub.studentEmail
          ? {
              ...e,
              assignmentStatus: "Graded",
              assignmentGrade: numericGrade,
              assignmentFeedback: updatedSub.feedback,
              progressPercent: 100,
              certificateIssued: numericGrade >= 70,
              certificateId:
                e.certificateId ||
                `CERT-NL-2026-${String(Date.now()).slice(-3)}`,
            }
          : e
      );
    }

    res.status(200).json({ success: true, data: updatedSub });
  } catch (err) {
    next(err);
  }
};