import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import NexaSelect from "../ui/NexaSelect.jsx";
import {
  exportGradebookPDF,
  exportGradebookExcel,
  exportGradebookCSV,
} from "../../services/nexaService.js";

const INSTRUCTOR_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI";

const STUDENT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBVbLK5zv3fCGI0LQY3JcseIH2cV3Y1SDQBFPuJBlN50W320ALlNXGY_VRIMZU2iLPTAXbfsJ4jomQ3KIZs6i0jtZjIJ3b8kHBB7-PhLvgXqJE2Ve1jfZrEWU41RFCDfuEfEtfL8mMsZGloU-M9XeTxYmhM7cXg1u9csmmpuigpVmDGvsi46ufavs61NL1fdGbguOx8h3sjl7KGM5VVWA64aUr8JHnvJi_yxDPe9kU";

const DEFAULT_COURSE_THUMBNAIL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAaswXgfmOIH-Y5sPi1RShq7iP21Impmjw-VwhBja1N-rh0_C5q2SmLl-nXwLSUbGivAXrRySJXXknxgecSk1qnzvSPd8WsEhvPht1eND5QqjEpweeKR-NXV1W1rKhZfJ6i3EC516gckdNTj9YgO2up0r5lhg0mPxBNWFs6pf_qaZMlfK8ApEO4d0_qT_iyXsXGewtrvWWEJ9bRkHBciu4W54jXfhG4vil6vWtRA7U";

// Client-side 16:9 Course Thumbnail Compressor
const compressCourseThumbnail = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetW = 960;
        const targetH = 540;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Client-side Square Profile Photo Compressor
const compressAvatarPhoto = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 256, 256);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getLetterGradeBadge = (score) => {
  const n = Number(score || 0);
  if (n >= 95) return "Grade: A+ (Outstanding)";
  if (n >= 90) return "Grade: A (Distinction)";
  if (n >= 80) return "Grade: B+ (Merit)";
  if (n >= 70) return "Grade: B (Pass)";
  return "Grade: C (Revision Needed)";
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function InstructorStudioView({
  user,
  courses = [],
  enrollments = [],
  submissions = [],
  onSaveCourse,
  onUpdateCourseStatus,
  onDeleteCourse,
  onGradeSubmission,
  onUpdateProfile,
  onOpenPublicCatalog,
  onLogout,
  onShowToast,
}) {
  const instructorDisplayName = user?.name || "Instructor";
  const instructorHeadline =
    user?.headline || "Staff Engineer & Lead Instructor";
  const instructorEmailClean = (user?.email || "").toLowerCase().trim();
  const instructorAvatar = user?.avatar || INSTRUCTOR_AVATAR;

  // Navigation & Mobile Drawer State
  const [activeNav, setActiveNav] = useState("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [studioSearch, setStudioSearch] = useState("");

  // Strictly Scoped Courses Owned by the Logged-In Instructor (Matches Email or Name)
  const studioCourses = useMemo(() => {
    if (!instructorEmailClean && !instructorDisplayName) return [];
    const owned = courses.filter(
      (c) =>
        (instructorEmailClean &&
          c.instructorEmail?.toLowerCase() === instructorEmailClean) ||
        (instructorDisplayName &&
          c.instructorName?.toLowerCase() ===
            instructorDisplayName.toLowerCase())
    );
    return owned.map((c) => ({
      ...c,
      instructorName: instructorDisplayName,
      instructorAvatar,
      instructorTitle: instructorHeadline,
      modulesCount: c.modules?.length || 2,
      enrolledCount: c.enrolledCount ?? 0,
      completionAvg: c.completionAvg ?? 0,
      assignments:
        Array.isArray(c.assignments) && c.assignments.length > 0
          ? c.assignments
          : c.assignment?.title
          ? [
              {
                assignmentId: `ASN-${c.courseId}-1`,
                title: c.assignment.title,
                instructions:
                  c.assignment.instructions ||
                  "Upload your project deliverable archive (.zip, .pdf, or .docx) demonstrating all module requirements.",
                dueDate: c.assignment.dueDate || "2026-12-15",
                maxScore: c.assignment.maxScore || 100,
                deliverableFormat: "ZIP, PDF, or DOCX",
              },
            ]
          : [],
    }));
  }, [
    courses,
    instructorEmailClean,
    instructorDisplayName,
    instructorAvatar,
    instructorHeadline,
  ]);

  const [courseFilter, setCourseFilter] = useState("ALL");

  // Simple Yes/No Course Deletion Confirmation Modal for Instructor
  const [courseToDeleteConfirm, setCourseToDeleteConfirm] = useState(null);

  // Modal for Resolving Admin-Hidden Course & Sending Verification Note
  const [resolveModalCourse, setResolveModalCourse] = useState(null);
  const [resolutionRubricNote, setResolutionRubricNote] = useState(
    "Added Module 1 automated quiz grading rubric (70% pass threshold) and verified all multiple-choice answer keys."
  );

  // ===========================================================================
  // ORGANIZED STUDIO WORKSPACE STATE (SEPARATE TABS + PER-COURSE ISOLATION)
  // ===========================================================================
  const [activeBuilderTab, setActiveBuilderTab] = useState("quiz"); // "basic" | "curriculum" | "quiz" | "assignments"
  const [selectedCourseId, setSelectedCourseId] = useState(
    () =>
      studioCourses.find((c) => c.status !== "Removed")?.courseId ||
      studioCourses[0]?.courseId ||
      ""
  );
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);

  const currentCourseObj = useMemo(() => {
    if (isCreatingNewCourse) {
      return {
        courseId: selectedCourseId,
        title: "",
        shortDescription: "",
        category: "Software Engineering",
        difficulty: "Intermediate",
        durationText: "16 Hours (4 Weeks)",
        expiryDate: "2026-12-31",
        thumbnail: DEFAULT_COURSE_THUMBNAIL,
        modules: [],
        quiz: {
          title: "Course Mastery Evaluation Quiz",
          passingScore: 70,
          timeLimitMinutes: 5,
          questions: [],
        },
        assignments: [],
      };
    }
    return (
      studioCourses.find((c) => c.courseId === selectedCourseId) ||
      studioCourses.find((c) => c.status !== "Removed") ||
      studioCourses[0] ||
      null
    );
  }, [studioCourses, selectedCourseId, isCreatingNewCourse]);

  // Basic Info Form Fields
  const [courseTitle, setCourseTitle] = useState(
    () => currentCourseObj?.title || ""
  );
  const [courseShortDescription, setCourseShortDescription] = useState(
    () => currentCourseObj?.shortDescription || ""
  );
  const [courseCategory, setCourseCategory] = useState(
    () => currentCourseObj?.category || "Software Engineering"
  );
  const [courseDifficulty, setCourseDifficulty] = useState(
    () => currentCourseObj?.difficulty || "Intermediate"
  );
  const [courseDurationText, setCourseDurationText] = useState(
    () =>
      currentCourseObj?.durationText ||
      currentCourseObj?.durationLabel ||
      "24 Hours (6 Weeks)"
  );
  const [courseExpiryDate, setCourseExpiryDate] = useState(
    () => currentCourseObj?.expiryDate || "2026-12-15"
  );
  const thumbnailInputRef = useRef(null);
  const [courseThumbnail, setCourseThumbnail] = useState(
    () => currentCourseObj?.thumbnail || DEFAULT_COURSE_THUMBNAIL
  );
  const [courseThumbnailName, setCourseThumbnailName] = useState(
    () => `${(currentCourseObj?.courseId || "course").toLowerCase()}-cover.jpg`
  );

  // Curriculum Modules State
  const [builderModules, setBuilderModules] = useState(
    () => currentCourseObj?.modules || []
  );
  const [addingLessonModuleId, setAddingLessonModuleId] = useState(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("Video");
  const [newLessonDuration, setNewLessonDuration] = useState("25m");

  // Dedicated Quiz Studio State
  const [quizTitle, setQuizTitle] = useState(
    () => currentCourseObj?.quiz?.title || "Course Mastery Evaluation Quiz"
  );
  const [passingScore, setPassingScore] = useState(
    () => currentCourseObj?.quiz?.passingScore ?? 70
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    () => currentCourseObj?.quiz?.timeLimitMinutes ?? 5
  );
  const [quizQuestions, setQuizQuestions] = useState(
    () => currentCourseObj?.quiz?.questions || []
  );

  // Dedicated Assignment Studio State
  const [courseAssignments, setCourseAssignments] = useState(
    () => currentCourseObj?.assignments || []
  );

  const [savingCourse, setSavingCourse] = useState(false);

  // Sync selectedCourseId if studioCourses changes and none is selected
  useEffect(() => {
    if (
      !isCreatingNewCourse &&
      (!selectedCourseId ||
        !studioCourses.some((c) => c.courseId === selectedCourseId)) &&
      studioCourses.length > 0
    ) {
      const target =
        studioCourses.find((c) => c.status !== "Removed") || studioCourses[0];
      if (target) {
        handleSelectCourseForStudio(target.courseId);
      }
    }
  }, [studioCourses.length, isCreatingNewCourse, selectedCourseId]);

  // Keep form fields synced when switching existing courses
  const handleSelectCourseForStudio = (targetCourseId, targetTab = null) => {
    const found = studioCourses.find((c) => c.courseId === targetCourseId);
    if (!found) return;
    setIsCreatingNewCourse(false);
    setSelectedCourseId(found.courseId);
    setCourseTitle(found.title || "");
    setCourseShortDescription(found.shortDescription || "");
    setCourseCategory(found.category || "Software Engineering");
    setCourseDifficulty(found.difficulty || "Intermediate");
    setCourseDurationText(
      found.durationText || found.durationLabel || "24 Hours (6 Weeks)"
    );
    setCourseExpiryDate(found.expiryDate || "2026-12-15");
    setCourseThumbnail(found.thumbnail || DEFAULT_COURSE_THUMBNAIL);
    setCourseThumbnailName(`${found.courseId.toLowerCase()}-cover.jpg`);
    setBuilderModules(
      (found.modules || []).map((m, idx) => ({
        ...m,
        moduleId: m.moduleId || `MOD-0${idx + 1}`,
        number: m.number || String(idx + 1).padStart(2, "0"),
        expanded: m.expanded ?? true,
        lessons: (m.lessons || []).map((l, lIdx) => ({
          ...l,
          lessonId: l.lessonId || `LES-${idx + 1}0${lIdx + 1}`,
          badge: l.badge || "Ready",
        })),
      }))
    );
    setQuizTitle(found.quiz?.title || `${found.title} Quiz`);
    setPassingScore(found.quiz?.passingScore ?? 70);
    setTimeLimitMinutes(found.quiz?.timeLimitMinutes ?? 5);
    setQuizQuestions(found.quiz?.questions || []);
    setCourseAssignments(found.assignments || []);
    setActiveSubmissionIndex(0);
    if (targetTab) {
      setActiveBuilderTab(targetTab);
    }
  };

  // Confirm Permanent Course Deletion from Instructor Side
  const handleConfirmInstructorDelete = async () => {
    if (!courseToDeleteConfirm) return;
    const deletedId = courseToDeleteConfirm.courseId;
    setCourseToDeleteConfirm(null);
    if (onDeleteCourse) {
      await onDeleteCourse(deletedId);
    }
    const remaining = studioCourses.filter(
      (c) => c.courseId !== deletedId && c.status !== "Removed"
    );
    if (remaining.length > 0) {
      handleSelectCourseForStudio(remaining[0].courseId);
    } else {
      setSelectedCourseId("");
    }
  };

  // Initialize a brand-new course with clean templates
  const handleStartCreateNewCourse = () => {
    const maxNum = courses.reduce((acc, c) => {
      const m = String(c.courseId || "").match(/CRS-\d{4}-(\d+)/i);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > acc ? n : acc;
    }, 2);
    const nextCode = `CRS-2026-${String(maxNum + 1).padStart(3, "0")}`;

    setIsCreatingNewCourse(true);
    setSelectedCourseId(nextCode);
    setCourseTitle("");
    setCourseShortDescription("");
    setCourseCategory("Software Engineering");
    setCourseDifficulty("Intermediate");
    setCourseDurationText("16 Hours (4 Weeks)");
    setCourseExpiryDate("2026-12-31");
    setCourseThumbnail(DEFAULT_COURSE_THUMBNAIL);
    setCourseThumbnailName("default-course-cover.jpg");
    setBuilderModules([
      {
        moduleId: `MOD-${Date.now()}`,
        number: "01",
        title: "Module 1: Core Architecture & System Foundations",
        durationSummary: "1 Lesson • 25m",
        expanded: true,
        lessons: [
          {
            lessonId: `LES-${Date.now()}`,
            title: "1.1 Getting Started & Environment Setup",
            type: "Video",
            duration: "25m",
            isFreePreview: true,
            badge: "Ready",
          },
        ],
      },
    ]);
    setQuizTitle("Course Mastery Evaluation Quiz");
    setPassingScore(70);
    setTimeLimitMinutes(5);
    setQuizQuestions([
      {
        questionId: `Q-${Date.now()}`,
        concept: "Core Architecture",
        question: "Enter your first multiple-choice question prompt here...",
        options: [
          "Option A answer choice",
          "Option B answer choice (Correct)",
          "Option C answer choice",
          "Option D answer choice",
        ],
        correctIndex: 1,
        explanation:
          "Explain why the selected option is correct so students can review it after submitting.",
      },
    ]);
    setCourseAssignments([
      {
        assignmentId: `ASN-${Date.now()}`,
        title: "Capstone Project Deliverable",
        instructions:
          "Describe the project requirements, evaluation criteria, and files students must upload.",
        dueDate: "2026-12-30",
        maxScore: 100,
        deliverableFormat: "ZIP, PDF, or DOCX",
      },
    ]);
    setActiveBuilderTab("basic");
    setTimeout(() => {
      document
        .getElementById("course-builder")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    onShowToast(
      `Creating New Course #${nextCode}`,
      "Fill in Basic Info, Curriculum, Quiz Questions, and Assignments."
    );
  };

  // ===========================================================================
  // QUIZ BUILDER HANDLERS
  // ===========================================================================
  const handleUpdateQuizQuestionField = (qIdx, field, value) => {
    setQuizQuestions((prev) =>
      prev.map((q, idx) => (idx === qIdx ? { ...q, [field]: value } : q))
    );
  };

  const handleUpdateQuizOptionText = (qIdx, optIdx, newText) => {
    setQuizQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        const nextOptions = [...(q.options || ["", "", "", ""])];
        nextOptions[optIdx] = newText;
        return { ...q, options: nextOptions };
      })
    );
  };

  const handleAddQuizQuestion = () => {
    const nextIdx = quizQuestions.length + 1;
    const newQ = {
      questionId: `${selectedCourseId}-Q${Date.now().toString().slice(-3)}`,
      concept: `Question ${nextIdx} Concept`,
      question: "",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      explanation: "",
    };
    setQuizQuestions((prev) => [...prev, newQ]);
    onShowToast(
      `Question Q${nextIdx} Added to #${selectedCourseId}`,
      "Type your question prompt, edit Options A–D, and select the correct answer."
    );
  };

  const handleDeleteQuizQuestion = (qIdx) => {
    if (quizQuestions.length <= 1) {
      onShowToast(
        "Minimum 1 Question",
        "A course quiz must contain at least 1 question.",
        true
      );
      return;
    }
    setQuizQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
    onShowToast("Question Removed", "Deleted question from this course's quiz.");
  };

  // ===========================================================================
  // ASSIGNMENT BUILDER HANDLERS
  // ===========================================================================
  const handleUpdateAssignmentField = (asnIdx, field, value) => {
    setCourseAssignments((prev) =>
      prev.map((a, idx) => (idx === asnIdx ? { ...a, [field]: value } : a))
    );
  };

  const handleAddCourseAssignment = () => {
    const nextNum = courseAssignments.length + 1;
    const newAsn = {
      assignmentId: `ASN-${selectedCourseId}-${Date.now().toString().slice(-3)}`,
      title: `Practical Lab Assignment #${nextNum}`,
      instructions:
        "Specify the coding task, architectural diagram, or report students need to upload.",
      dueDate: "2026-12-20",
      maxScore: 100,
      deliverableFormat: "ZIP, PDF, or DOCX",
    };
    setCourseAssignments((prev) => [...prev, newAsn]);
    onShowToast(
      `Assignment #${nextNum} Added to #${selectedCourseId}`,
      "Customize the title, instructions, due date, and max points below."
    );
  };

  const handleDeleteCourseAssignment = (asnIdx) => {
    if (courseAssignments.length <= 1) {
      onShowToast(
        "Minimum 1 Assignment",
        "Each course keeps at least 1 primary assignment.",
        true
      );
      return;
    }
    setCourseAssignments((prev) => prev.filter((_, idx) => idx !== asnIdx));
    onShowToast("Assignment Removed", "Removed assignment from this course.");
  };

  // ===========================================================================
  // SAVE ALL CHANGES TO COURSE (PRESERVES MODERATION & VERIFICATION NOTES)
  // ===========================================================================
  const handleSaveAndPublishCourse = async (customToastTitle = null) => {
    const cleanTitle =
      courseTitle.trim() || `${instructorDisplayName} Engineering Course`;
    setSavingCourse(true);

    const parsedHours =
      parseInt(String(courseDurationText).match(/\d+/)?.[0] || "20", 10) || 20;

    const primaryAssignment = courseAssignments[0] || {
      title: "Capstone Engineering Project",
      instructions: "Upload your completed project archive.",
      dueDate: "2026-12-15",
      maxScore: 100,
    };

    const isCurrentlyModerated =
      !isCreatingNewCourse &&
      (currentCourseObj?.status === "Hidden" ||
        currentCourseObj?.status === "Pending Review");

    const updatedCourseData = {
      courseId: selectedCourseId,
      title: cleanTitle,
      shortDescription:
        courseShortDescription.trim() ||
        `Master ${cleanTitle} with interactive video modules, auto-graded quizzes, and instructor-reviewed assignments.`,
      overview:
        courseShortDescription.trim() ||
        `An end-to-end production curriculum for ${cleanTitle}, designed and mentored by ${instructorDisplayName}.`,
      category: courseCategory,
      difficulty: courseDifficulty,
      durationHours: parsedHours,
      durationLabel: `${parsedHours} Hours`,
      durationText: courseDurationText,
      expiryDate: courseExpiryDate,
      modulesCount: builderModules.length,
      enrolledCount: currentCourseObj?.enrolledCount || 0,
      completionAvg: currentCourseObj?.completionAvg || 0,
      status: isCurrentlyModerated ? "Pending Review" : "Published",
      instructorEmail: instructorEmailClean,
      instructorName: instNameInput.trim() || instructorDisplayName,
      instructorAvatar: instAvatarPreview || instructorAvatar,
      instructorTitle: instHeadlineInput.trim() || instructorHeadline,
      instructorBio:
        instBioInput.trim() ||
        user?.bio ||
        "Subject-matter educator on NexaLearn Academy.",
      moderationReason: isCurrentlyModerated
        ? currentCourseObj?.moderationReason || ""
        : "",
      instructorResolutionNote: isCurrentlyModerated
        ? currentCourseObj?.instructorResolutionNote ||
          "Instructor updated course syllabus and quiz rubric for Admin verification."
        : "",
      thumbnail: courseThumbnail || DEFAULT_COURSE_THUMBNAIL,
      modules: builderModules,
      quiz: {
        title: quizTitle.trim() || `${cleanTitle} Quiz`,
        passingScore: Number(passingScore || 70),
        timeLimitMinutes: Number(timeLimitMinutes || 5),
        questions: quizQuestions.map((q, i) => ({
          questionId: q.questionId || `${selectedCourseId}-Q${i + 1}`,
          concept: q.concept || `Question ${i + 1}`,
          question:
            q.question?.trim() || `Question ${i + 1} for ${cleanTitle}`,
          options: (
            q.options || ["Option A", "Option B", "Option C", "Option D"]
          ).map(
            (opt, oIdx) => opt?.trim() || `Option ${OPTION_LETTERS[oIdx]}`
          ),
          correctIndex: Number(q.correctIndex ?? 0),
          explanation:
            q.explanation?.trim() || "Verified by course instructor.",
        })),
      },
      assignment: {
        title: primaryAssignment.title,
        instructions: primaryAssignment.instructions,
        dueDate: primaryAssignment.dueDate,
        maxScore: Number(primaryAssignment.maxScore || 100),
      },
      assignments: courseAssignments,
    };

    setIsCreatingNewCourse(false);

    if (onSaveCourse) {
      await onSaveCourse(updatedCourseData);
    }

    setTimeout(() => {
      setSavingCourse(false);
      onShowToast(
        customToastTitle || `Saved & Published #${updatedCourseData.courseId}!`,
        isCurrentlyModerated
          ? `Changes saved to #${updatedCourseData.courseId} and queued for Admin re-approval.`
          : `Updated "${updatedCourseData.title}" (${updatedCourseData.quiz.questions.length} quiz questions & ${updatedCourseData.assignments.length} assignments synced).`
      );
    }, 250);
  };

  // ===========================================================================
  // COURSE-CATEGORIZED STUDENT SUBMISSIONS & QUIZ MARKS (ZERO DUMMY FALLBACKS)
  // ===========================================================================
  const allOwnedSubmissions = useMemo(() => {
    const ownedIds = new Set(studioCourses.map((c) => c.courseId));
    const relevant = submissions.filter(
      (s) =>
        ownedIds.has(s.courseId) ||
        s.instructorEmail?.toLowerCase() === instructorEmailClean
    );
    return relevant.map((s) => ({
      ...s,
      studentAvatar: s.studentAvatar || STUDENT_AVATAR,
      fileSizeLabel:
        s.fileSizeLabel ||
        `${((s.fileSizeKB || 1840) / 1024).toFixed(1)} MB • Submitted`,
    }));
  }, [submissions, studioCourses, instructorEmailClean]);

  const courseScopedSubmissions = useMemo(() => {
    if (!selectedCourseId) return [];
    return allOwnedSubmissions.filter((s) => s.courseId === selectedCourseId);
  }, [allOwnedSubmissions, selectedCourseId]);

  const [activeSubmissionIndex, setActiveSubmissionIndex] = useState(0);
  const activeSubmission =
    courseScopedSubmissions[activeSubmissionIndex] ||
    courseScopedSubmissions[0] ||
    null;

  const [scoreInput, setScoreInput] = useState(activeSubmission?.grade ?? 95);
  const [feedbackInput, setFeedbackInput] = useState(
    activeSubmission?.feedback ||
      "Exceptional architectural implementation and clean security practices."
  );
  const [publishingGrade, setPublishingGrade] = useState(false);

  useEffect(() => {
    if (activeSubmission) {
      setScoreInput(activeSubmission.grade ?? 95);
      setFeedbackInput(
        activeSubmission.feedback ||
          "Exceptional architectural implementation and clean security practices."
      );
    }
  }, [activeSubmission?.submissionId, selectedCourseId]);

  // Student Quiz Marks & Assessment Results for the Selected Course
  const courseStudentQuizMarks = useMemo(() => {
    if (!selectedCourseId || studioCourses.length === 0) return [];
    const courseEnr = enrollments.filter(
      (e) => e.courseId === selectedCourseId
    );
    const totalQs = Math.max(1, quizQuestions.length);
    const passReq = Number(passingScore || 70);

    return courseEnr.map((enr) => {
      const hasTakenQuiz =
        Boolean(enr.quizCompleted) || typeof enr.bestQuizScore === "number";
      const scorePct =
        typeof enr.bestQuizScore === "number" ? enr.bestQuizScore : null;
      const correctCount =
        scorePct !== null ? Math.round((scorePct / 100) * totalQs) : 0;
      const passed = scorePct !== null ? scorePct >= passReq : false;

      const matchingSub = courseScopedSubmissions.find(
        (s) =>
          s.studentEmail?.toLowerCase() === enr.studentEmail?.toLowerCase()
      );

      return {
        enrollmentId: enr.enrollmentId || enr.studentEmail,
        studentName: enr.studentName || "Learner",
        studentEmail: enr.studentEmail || "",
        quizCompleted: hasTakenQuiz,
        scorePct,
        correctCount,
        totalQs,
        passed,
        passReq,
        assignmentStatus:
          matchingSub?.status || enr.assignmentStatus || "Pending",
        assignmentGrade: matchingSub?.grade ?? enr.assignmentGrade ?? null,
      };
    });
  }, [
    enrollments,
    selectedCourseId,
    studioCourses.length,
    quizQuestions.length,
    passingScore,
    courseScopedSubmissions,
  ]);

  // ===========================================================================
  // INSTRUCTOR PROFILE, PHOTO UPLOAD & PASSWORD CHANGE MODAL STATE
  // ===========================================================================
  const avatarFileInputRef = useRef(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [instNameInput, setInstNameInput] = useState(instructorDisplayName);
  const [instHeadlineInput, setInstHeadlineInput] = useState(
    instructorHeadline
  );
  const [instAvatarPreview, setInstAvatarPreview] = useState(instructorAvatar);
  const [instBioInput, setInstBioInput] = useState(
    user?.bio ||
      "Former Principal Architect at HyperScale and lead full-stack engineering educator on NexaLearn."
  );
  const [instCurrentPassword, setInstCurrentPassword] = useState("");
  const [instNewPassword, setInstNewPassword] = useState("");
  const [instConfirmPassword, setInstConfirmPassword] = useState("");
  const [instPasswordError, setInstPasswordError] = useState("");

  useEffect(() => {
    setInstNameInput(user?.name || "Instructor");
    setInstHeadlineInput(
      user?.headline || "Staff Engineer & Lead Instructor"
    );
    setInstAvatarPreview(user?.avatar || INSTRUCTOR_AVATAR);
  }, [user?.name, user?.headline, user?.avatar]);

  const handleInstructorAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAvatarPhoto(file);
      setInstAvatarPreview(dataUrl);
      onShowToast(
        "Profile Picture Staged",
        "Click 'Save Profile & Security' to apply your new photo across all courses."
      );
    } catch {
      onShowToast("Image Error", "Could not process selected photo.", true);
    }
    e.target.value = "";
  };

  // Filtered Courses for Section 2 ("Hidden" tab shows Hidden, Pending Review, and Admin-Deleted!)
  const displayedCourses = useMemo(() => {
    const q = studioSearch.toLowerCase().trim();
    return studioCourses.filter((c) => {
      if (courseFilter === "Hidden") {
        if (
          c.status !== "Hidden" &&
          c.status !== "Pending Review" &&
          c.status !== "Removed"
        )
          return false;
      } else if (courseFilter !== "ALL" && c.status !== courseFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.courseId.toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q)
      );
    });
  }, [studioCourses, courseFilter, studioSearch]);

  const handleSelectSubmission = (index) => {
    const target = courseScopedSubmissions[index];
    if (!target) return;
    setActiveSubmissionIndex(index);
    setScoreInput(target.grade ?? 95);
    setFeedbackInput(
      target.feedback ||
        "Exceptional architectural implementation and clean security practices."
    );
  };

  const handleSidebarNav = (navId, targetHash, builderTab = null) => {
    setActiveNav(navId);
    setMobileSidebarOpen(false);
    if (navId === "profile" || navId === "settings") {
      setProfileModalOpen(true);
      return;
    }
    if (builderTab) {
      setActiveBuilderTab(builderTab);
    }
    if (targetHash) {
      setTimeout(() => {
        document
          .querySelector(targetHash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTogglePauseCourse = async (course) => {
    const nextStatus = course.status === "Paused" ? "Published" : "Paused";
    if (onUpdateCourseStatus) {
      await onUpdateCourseStatus(course.courseId, { status: nextStatus });
    }
    onShowToast(
      nextStatus === "Published"
        ? `Course #${course.courseId} Published`
        : `Course #${course.courseId} Paused`,
      nextStatus === "Published"
        ? `"${course.title}" is now live in the public catalog.`
        : `"${course.title}" is temporarily paused.`
    );
  };

  const handleConfirmResolveHiddenCourse = async (e) => {
    e.preventDefault();
    if (!resolveModalCourse) return;
    const targetId = resolveModalCourse.courseId;

    if (onUpdateCourseStatus) {
      await onUpdateCourseStatus(targetId, {
        status: "Pending Review",
        instructorResolutionNote: resolutionRubricNote.trim(),
      });
    }

    setResolveModalCourse(null);
    onShowToast(
      `Verification Note Sent for #${targetId}`,
      "Your verification note has been sent to the Platform Admin's Moderation Resolution Review card."
    );
  };

  const handleThumbnailFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressCourseThumbnail(file);
      const kb = Math.max(120, Math.round(file.size / 1024));
      setCourseThumbnail(dataUrl);
      setCourseThumbnailName(`${file.name} (${kb} KB)`);
      onShowToast(
        "16:9 Thumbnail Attached",
        `${file.name} optimized and attached to #${selectedCourseId}.`
      );
    } catch {
      onShowToast("Image Error", "Could not process selected image.", true);
    }
    e.target.value = "";
  };

  const handleAddModule = () => {
    const nextNum = builderModules.length + 1;
    const newMod = {
      moduleId: `MOD-${Date.now()}`,
      number: String(nextNum).padStart(2, "0"),
      title: `Module ${nextNum}: System Scaling & Production Observability`,
      durationSummary: "1 Lesson • 45m",
      expanded: true,
      lessons: [
        {
          lessonId: `LES-${nextNum}01`,
          title: `${nextNum}.1 Edge Middleware & Latency Telemetry`,
          type: "Video",
          duration: "45m",
          isFreePreview: false,
          badge: "Ready",
        },
      ],
    };
    setBuilderModules((prev) => [...prev, newMod]);
    onShowToast(
      "Module Added",
      `Module ${nextNum} added to #${selectedCourseId}.`
    );
  };

  const handleAddLessonConfirm = (moduleId) => {
    if (!newLessonTitle.trim()) return;
    setBuilderModules((prev) =>
      prev.map((m, mIdx) => {
        if (m.moduleId !== moduleId) return m;
        const lessonIdx = (m.lessons || []).length + 1;
        const added = {
          lessonId: `LES-${Date.now()}`,
          title: `${mIdx + 1}.${lessonIdx} ${newLessonTitle.trim()}`,
          type: newLessonType,
          duration: newLessonDuration || "25m",
          isFreePreview: false,
          badge: "Ready",
        };
        const nextLessons = [...(m.lessons || []), added];
        return {
          ...m,
          lessons: nextLessons,
          durationSummary: `${nextLessons.length} Lessons`,
        };
      })
    );
    setNewLessonTitle("");
    setAddingLessonModuleId(null);
    onShowToast("Lesson Added", "New lesson appended to module.");
  };

  const handleDeleteLesson = (moduleId, lessonId) => {
    setBuilderModules((prev) =>
      prev.map((m) => {
        if (m.moduleId !== moduleId) return m;
        const nextLessons = (m.lessons || []).filter(
          (l) => l.lessonId !== lessonId
        );
        return {
          ...m,
          lessons: nextLessons,
          durationSummary: `${nextLessons.length} Lessons`,
        };
      })
    );
  };

  const handlePublishStudentGrade = async () => {
    if (!activeSubmission) return;
    setPublishingGrade(true);
    const cleanScore = Math.min(100, Math.max(0, Number(scoreInput || 95)));

    if (onGradeSubmission) {
      await onGradeSubmission(activeSubmission.submissionId, {
        grade: cleanScore,
        feedback: feedbackInput,
        status: "Graded",
      });
    }

    setTimeout(() => {
      setPublishingGrade(false);
      onShowToast(
        `Grade Published (${cleanScore}/100)`,
        `${activeSubmission.studentName}'s grade (${getLetterGradeBadge(
          cleanScore
        )}) has been published to their Student Dashboard.`
      );
    }, 250);
  };

  const handleDownloadStudentArtifact = (sub) => {
    const content = `NexaLearn Student Submission Artifact\nSubmission ID: ${sub.submissionId}\nStudent: ${sub.studentName} (${sub.studentEmail})\nCourse: #${sub.courseId}\nAssignment: ${sub.assignmentTitle}\nStudent Notes:\n${sub.notes}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sub.fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(
      "Artifact Downloaded",
      `Downloaded ${sub.fileName} from ${sub.studentName}.`
    );
  };

  const totalQuizzesCount = useMemo(
    () =>
      studioCourses.reduce(
        (acc, c) => acc + (c.quiz?.questions?.length || 0),
        0
      ),
    [studioCourses]
  );

  const totalAssignmentsCount = useMemo(
    () =>
      studioCourses.reduce((acc, c) => acc + (c.assignments?.length || 0), 0),
    [studioCourses]
  );

  const pendingSubmissionsCount = useMemo(
    () => allOwnedSubmissions.filter((g) => g.status === "Pending").length,
    [allOwnedSubmissions]
  );

  const moderatedCoursesCount = useMemo(
    () =>
      studioCourses.filter(
        (c) =>
          c.status === "Hidden" ||
          c.status === "Pending Review" ||
          c.status === "Removed"
      ).length,
    [studioCourses]
  );

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-700 pb-16 lg:pb-0">
      {/* ===================================================================
          MODAL 0: INSTRUCTOR SIMPLE YES / NO COURSE DELETION MODAL
         =================================================================== */}
      {courseToDeleteConfirm &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[130] bg-[#0F172A]/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCourseToDeleteConfirm(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-200 space-y-4 animate-pop-in"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">
                    delete_forever
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                    Confirm Course Deletion
                  </span>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Are you sure you want to delete this course?
                  </h3>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-mono font-bold text-[#4F46E5]">
                  #{courseToDeleteConfirm.courseId}
                </span>
                <p className="font-bold text-sm text-[#0F172A] mt-0.5">
                  {courseToDeleteConfirm.title}
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This action will permanently remove{" "}
                <strong>#{courseToDeleteConfirm.courseId}</strong> and its
                syllabus, quizzes, and assignments from your studio.
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCourseToDeleteConfirm(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInstructorDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                  <span>Yes, Delete Course</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MODAL 1: RESOLVE ADMIN-HIDDEN COURSE & SEND VERIFICATION NOTE MODAL
         =================================================================== */}
      {resolveModalCourse &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setResolveModalCourse(null)}
          >
            <form
              onSubmit={handleConfirmResolveHiddenCourse}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-amber-200 space-y-5 animate-pop-in"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      build
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Send Verification Note to Admin • #
                      {resolveModalCourse.courseId}
                    </span>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      {resolveModalCourse.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResolveModalCourse(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold uppercase tracking-wide text-[11px] text-amber-950">
                  Admin Hide Reason:
                </p>
                <p className="font-semibold text-rose-700">
                  &ldquo;
                  {resolveModalCourse.moderationReason ||
                    "Missing quiz grading rubric in Module 1."}
                  &rdquo;
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Verification &amp; Resolution Note for Platform Admin{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={resolutionRubricNote}
                  onChange={(e) => setResolutionRubricNote(e.target.value)}
                  placeholder="Describe the fixes you made so the Admin can verify and unhide your course..."
                  className="w-full rounded-xl bg-slate-50 border border-[#E2E8F0] p-3 text-xs sm:text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#4F46E5]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note appears directly inside the Admin&apos;s Moderation
                  Resolution Review card and Course Moderation Table.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalCourse(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    send
                  </span>
                  <span>Submit Verification Note to Admin</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MODAL 2: INSTRUCTOR PROFILE, PHOTO UPLOAD & PASSWORD CHANGE MODAL
         =================================================================== */}
      {profileModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setProfileModalOpen(false)}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setInstPasswordError("");
                if (instNewPassword) {
                  if (instNewPassword.length < 6) {
                    setInstPasswordError(
                      "New password must be at least 6 characters."
                    );
                    return;
                  }
                  if (instNewPassword !== instConfirmPassword) {
                    setInstPasswordError("New passwords do not match.");
                    return;
                  }
                }
                if (onUpdateProfile) {
                  const res = await onUpdateProfile({
                    name: instNameInput.trim(),
                    headline: instHeadlineInput.trim(),
                    bio: instBioInput.trim(),
                    avatar: instAvatarPreview,
                    currentPassword: instCurrentPassword || undefined,
                    newPassword: instNewPassword || undefined,
                  });
                  if (res && !res.ok) {
                    setInstPasswordError(
                      res.message || "Could not update password."
                    );
                    return;
                  }
                }
                setInstCurrentPassword("");
                setInstNewPassword("");
                setInstConfirmPassword("");
                setProfileModalOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8F0] space-y-4 my-auto animate-pop-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative group">
                    <img
                      src={instAvatarPreview}
                      alt={instNameInput}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Change Profile Picture"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        photo_camera
                      </span>
                    </button>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Instructor Profile &amp; Security
                    </h3>
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="mt-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        upload
                      </span>
                      <span>Upload Profile Photo</span>
                    </button>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleInstructorAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Faculty Name
                  </label>
                  <input
                    type="text"
                    required
                    value={instNameInput}
                    onChange={(e) => setInstNameInput(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-sm font-medium text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Academic Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={instHeadlineInput}
                    onChange={(e) => setInstHeadlineInput(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-sm font-medium text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Public Educator Bio (Synced to All Authored Courses)
                </label>
                <textarea
                  rows="2"
                  value={instBioInput}
                  onChange={(e) => setInstBioInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs sm:text-sm text-[#0F172A] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5] block">
                  Change Account Password (Optional)
                </span>

                {instPasswordError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {instPasswordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={instCurrentPassword}
                      onChange={(e) => setInstCurrentPassword(e.target.value)}
                      placeholder="Current..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={instNewPassword}
                      onChange={(e) => setInstNewPassword(e.target.value)}
                      placeholder="Min 6 chars..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={instConfirmPassword}
                      onChange={(e) => setInstConfirmPassword(e.target.value)}
                      placeholder="Repeat new..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Profile &amp; Security
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Mobile Drawer Backdrop Overlay (<1024px) */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-30"
        />
      )}

      {/* ===================================================================
          FIXED 256PX LEFT SIDEBAR
         =================================================================== */}
      <aside
        className={`w-64 bg-white border-r border-[#E2E8F0] flex-shrink-0 flex flex-col justify-between transition-transform duration-300 z-40 fixed inset-y-0 left-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div>
          <div className="h-[72px] px-5 flex items-center justify-between border-b border-[#E2E8F0]">
            <button
              type="button"
              onClick={onOpenPublicCatalog}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  layers
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-[#0F172A]">
                  NexaLearn
                </span>
                <span className="text-[10px] font-semibold text-[#4F46E5] tracking-widest uppercase">
                  Studio
                </span>
              </div>
            </button>

            <span className="bg-indigo-50 text-[#4F46E5] text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              INSTRUCTOR
            </span>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-150px)]">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Main Menu
            </div>

            {[
              {
                id: "overview",
                label: "Overview",
                icon: "dashboard",
                hash: "#studio-top",
              },
              {
                id: "my-courses",
                label: "My Courses",
                icon: "menu_book",
                badge: studioCourses.length,
                hash: "#my-courses-section",
              },
              {
                id: "create-course",
                label: "Course & Syllabus",
                icon: "add_circle",
                hash: "#course-builder",
                builderTab: "basic",
              },
              {
                id: "quizzes",
                label: "Quizzes Studio",
                icon: "quiz",
                badge: `${totalQuizzesCount} Qs`,
                hash: "#course-builder",
                builderTab: "quiz",
              },
              {
                id: "assignments",
                label: "Assignments Studio",
                icon: "assignment_turned_in",
                badge: totalAssignmentsCount,
                hash: "#course-builder",
                builderTab: "assignments",
              },
              {
                id: "grading",
                label: "Grading & Quiz Marks",
                icon: "workspace_premium",
                amberBadge: pendingSubmissionsCount,
                hash: "#grading-section",
              },
              {
                id: "analytics",
                label: "Quiz Marks Table",
                icon: "monitoring",
                hash: "#quiz-marks-section",
              },
            ].map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleSidebarNav(item.id, item.hash, item.builderTab)
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold shadow-xs"
                      : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        active ? "text-[#4F46E5]" : "text-slate-400"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {item.amberBadge !== undefined && (
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      {item.amberBadge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Settings &amp; Account
            </div>

            <button
              type="button"
              onClick={() => handleSidebarNav("profile")}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 font-medium text-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                person
              </span>
              <span>Profile &amp; Password</span>
            </button>

            <button
              type="button"
              onClick={onOpenPublicCatalog}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 font-medium text-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                open_in_new
              </span>
              <span>Public Course Catalog</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-medium text-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ===================================================================
          MAIN CONTENT WRAPPER (lg:pl-64)
         =================================================================== */}
      <div id="studio-top" className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* TOP HEADER (72px Sticky) */}
        <header className="sticky top-0 h-[72px] bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open Studio Menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                menu
              </span>
            </button>

            <div className="flex items-center gap-2 text-xs md:text-sm truncate">
              <span className="text-slate-400 font-medium hidden sm:inline">
                Instructor Studio
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-[#0F172A] font-semibold truncate">
                {selectedCourseId
                  ? `Editing #${selectedCourseId}`
                  : "Studio Overview"}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center relative max-w-xs w-full mx-4">
            <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3.5 pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={studioSearch}
              onChange={(e) => setStudioSearch(e.target.value)}
              placeholder="Search your courses or submissions..."
              className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-[#0F172A] placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Export Gradebook Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] text-slate-700 hover:border-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px] text-[#14B8A6]">
                  table_view
                </span>
                <span className="hidden sm:inline">Export Gradebook</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                  expand_more
                </span>
              </button>

              {exportMenuOpen && (
                <div
                  onMouseLeave={() => setExportMenuOpen(false)}
                  className="absolute right-0 mt-1.5 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 z-50 animate-pop-in"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Format Options
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportGradebookPDF(
                        allOwnedSubmissions,
                        instructorDisplayName
                      );
                      onShowToast(
                        "Gradebook PDF Ready",
                        "Printable PDF gradebook generated."
                      );
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="material-symbols-outlined text-[16px] text-rose-500">
                      picture_as_pdf
                    </span>
                    <span>Export PDF (.pdf)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportGradebookExcel(
                        allOwnedSubmissions,
                        instructorDisplayName
                      );
                      onShowToast(
                        "Excel Gradebook Downloaded",
                        "NexaLearn_Instructor_Gradebook.xls saved."
                      );
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      grid_on
                    </span>
                    <span>Export Excel (.xls)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportGradebookCSV(allOwnedSubmissions);
                      onShowToast(
                        "CSV Gradebook Downloaded",
                        "NexaLearn_Instructor_Gradebook.csv saved."
                      );
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="material-symbols-outlined text-[16px] text-blue-500">
                      csv
                    </span>
                    <span>Export CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Single Clean Plus Icon + "Create New Course" Text */}
            <button
              type="button"
              onClick={handleStartCreateNewCourse}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Create New Course</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Instructor Avatar */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#E2E8F0] text-left"
              title="Edit Instructor Profile, Photo & Password"
            >
              <div className="relative shrink-0">
                <img
                  alt={instructorDisplayName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-100"
                  src={instructorAvatar}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#16A34A] rounded-full ring-2 ring-white"></span>
              </div>
              <div className="hidden xl:flex flex-col">
                <span className="text-xs font-bold text-[#0F172A] leading-tight">
                  {instructorDisplayName}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                  {instructorHeadline}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE BODY */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1440px] w-full mx-auto animate-fade-up">
          {/* =================================================================
              SECTION 1: INSTRUCTOR KPI ROW (4 CARDS)
             ================================================================= */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                  Instructor Executive Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Welcome back, {instructorDisplayName.split(" ")[0]}. Manage
                  separate syllabuses, quizzes, assignments, and student marks
                  for each course below.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-bold text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#4F46E5]">
                    photo_camera
                  </span>
                  <span>Edit Profile &amp; Photo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* KPI 1: Authored Courses */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      My Authored Courses
                    </p>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] mt-1">
                      {studioCourses.length}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Isolated Scope
                      </span>
                      <span className="text-[11px] text-slate-400">
                        per-course studio
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
                    <span className="material-symbols-outlined text-[24px]">
                      menu_book
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 2: Course Quizzes & Questions */}
              <div
                onClick={() =>
                  handleSidebarNav("quizzes", "#course-builder", "quiz")
                }
                className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Active Course Quizzes
                    </p>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] mt-1">
                      {studioCourses.length} Quizzes
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-semibold text-[#4F46E5] bg-indigo-50 px-1.5 py-0.5 rounded">
                        {totalQuizzesCount} Total Questions
                      </span>
                      <span className="text-[11px] text-slate-400">
                        click to edit →
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#14B8A6]">
                    <span className="material-symbols-outlined text-[24px]">
                      quiz
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 3: Course Assignments */}
              <div
                onClick={() =>
                  handleSidebarNav(
                    "assignments",
                    "#course-builder",
                    "assignments"
                  )
                }
                className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Course Assignments
                    </p>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] mt-1">
                      {totalAssignmentsCount} Tasks
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {pendingSubmissionsCount} to grade
                      </span>
                      <span className="text-[11px] text-slate-400">
                        click to manage →
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#D97706]">
                    <span className="material-symbols-outlined text-[24px]">
                      assignment_turned_in
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 4: Student Submissions & Marks */}
              <div
                onClick={() =>
                  handleSidebarNav("analytics", "#quiz-marks-section")
                }
                className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Course Submissions
                    </p>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] mt-1">
                      {allOwnedSubmissions.length}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {
                          allOwnedSubmissions.filter(
                            (s) => s.status === "Graded"
                          ).length
                        }{" "}
                        Graded
                      </span>
                      <span className="text-[11px] text-slate-400">
                        view marks →
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16A34A]">
                    <span className="material-symbols-outlined text-[24px]">
                      fact_check
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 2: MY COURSES MANAGEMENT ROW
             ================================================================= */}
          <section id="my-courses-section" className="scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  My Courses Management ({instructorDisplayName})
                </h2>
                <p className="text-xs text-slate-500">
                  Select any course below to manage its specific{" "}
                  <strong className="text-[#0F172A]">Quiz</strong>,{" "}
                  <strong className="text-[#0F172A]">Assignments</strong>,{" "}
                  <strong className="text-[#0F172A]">
                    Submitted Deliverables
                  </strong>
                  , and{" "}
                  <strong className="text-[#0F172A]">Student Quiz Marks</strong>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "ALL", label: `All (${studioCourses.length})` },
                  { id: "Published", label: "Published" },
                  { id: "Paused", label: "Paused" },
                  {
                    id: "Hidden",
                    label: `Hidden / In Review (${moderatedCoursesCount})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCourseFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      courseFilter === f.id
                        ? "bg-[#4F46E5] text-white shadow-xs"
                        : "bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {displayedCourses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
                <span className="material-symbols-outlined text-[38px] text-[#4F46E5]">
                  post_add
                </span>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {studioCourses.length === 0
                    ? "You Have Not Authored Any Courses Yet"
                    : "No authored courses match this filter"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click below to create and publish your first course with its
                  own modules, timed quiz, and assignments.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreateNewCourse}
                  className="px-5 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    add
                  </span>
                  <span>Create New Course</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedCourses.map((course) => {
                  const isPublished = course.status === "Published";
                  const isPaused = course.status === "Paused";
                  const isHidden = course.status === "Hidden";
                  const isPendingReview = course.status === "Pending Review";
                  const isRemovedByAdmin = course.status === "Removed";
                  const isSelectedInStudio =
                    course.courseId === selectedCourseId &&
                    !isCreatingNewCourse;
                  const courseSubCount = allOwnedSubmissions.filter(
                    (s) => s.courseId === course.courseId
                  ).length;

                  return (
                    <div
                      key={course.courseId}
                      className={`bg-white rounded-2xl shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                        isRemovedByAdmin
                          ? "border-2 border-rose-400 ring-2 ring-rose-100"
                          : isHidden
                          ? "border-2 border-amber-300 ring-2 ring-amber-100"
                          : isPendingReview
                          ? "border-2 border-indigo-300 ring-2 ring-indigo-100"
                          : isSelectedInStudio
                          ? "border-2 border-[#4F46E5] ring-2 ring-indigo-100"
                          : "border border-[#E2E8F0]"
                      }`}
                    >
                      <div>
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-900 group">
                          <img
                            alt={course.title}
                            src={course.thumbnail || DEFAULT_COURSE_THUMBNAIL}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              isRemovedByAdmin ? "opacity-55 grayscale" : ""
                            }`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                          <div className="absolute top-3 right-3">
                            {isPublished && (
                              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                Published
                              </span>
                            )}
                            {isPaused && (
                              <span className="bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                Paused
                              </span>
                            )}
                            {isHidden && (
                              <span className="bg-[#DC2626] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                Hidden by Admin
                              </span>
                            )}
                            {isPendingReview && (
                              <span className="bg-[#4F46E5] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                Verification Sent to Admin
                              </span>
                            )}
                            {isRemovedByAdmin && (
                              <span className="bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">
                                  delete_forever
                                </span>
                                Deleted by Admin
                              </span>
                            )}
                          </div>

                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white border border-white/30">
                              #{course.courseId}
                            </span>
                            {isSelectedInStudio && !isRemovedByAdmin && (
                              <span className="text-[10px] font-bold bg-[#4F46E5] px-2 py-0.5 rounded text-white">
                                Selected Course
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ADMIN DELETION REASON BANNER (When Admin Deletes a Course!) */}
                        {isRemovedByAdmin && (
                          <div className="bg-rose-50 border-b border-rose-200 text-rose-950 px-4 py-3 text-xs space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                                report
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[11px] uppercase tracking-wide text-rose-800">
                                  Course Deleted by Platform Admin
                                </p>
                                <p className="mt-0.5 leading-relaxed">
                                  Reason for Deletion:{" "}
                                  <strong className="font-bold text-rose-700">
                                    &ldquo;
                                    {course.moderationReason ||
                                      "Removed due to platform policy violation."}
                                    &rdquo;
                                  </strong>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MODERATION & VERIFICATION NOTICE BANNER (For Hidden & Pending Review) */}
                        {(isHidden || isPendingReview) && (
                          <div
                            className={`${
                              isPendingReview
                                ? "bg-indigo-50 border-b border-indigo-200 text-indigo-950"
                                : "bg-amber-50 border-b border-amber-200 text-amber-900"
                            } px-4 py-3 text-xs space-y-1.5`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                                  isPendingReview
                                    ? "text-[#4F46E5]"
                                    : "text-amber-600"
                                }`}
                              >
                                {isPendingReview
                                  ? "mark_email_read"
                                  : "warning"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[11px] uppercase tracking-wide">
                                  {isPendingReview
                                    ? "Verification Sent to Admin (Pending Unhide)"
                                    : "Moderation Alert Notice (Hidden by Admin)"}
                                </p>
                                <p className="mt-0.5 leading-relaxed">
                                  Admin Reason:{" "}
                                  <strong className="font-semibold text-rose-700">
                                    &ldquo;
                                    {course.moderationReason ||
                                      "Missing quiz grading rubric in Module 1."}
                                    &rdquo;
                                  </strong>
                                </p>
                                {course.instructorResolutionNote && (
                                  <p className="mt-1.5 p-2 rounded-lg bg-white/90 border border-indigo-200 text-[11px] text-indigo-950 font-medium break-words">
                                    ✓ Your Verification Note: &ldquo;
                                    {course.instructorResolutionNote}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-[#4F46E5] bg-indigo-50">
                              {course.category}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {course.quiz?.questions?.length || 0} Qs •{" "}
                              {courseSubCount} Submissions
                            </span>
                          </div>

                          <h3 className="font-bold text-base text-[#0F172A] line-clamp-1">
                            {course.title}
                          </h3>

                          <div className="mt-3 flex items-center gap-2.5 py-2.5 border-y border-slate-100">
                            <img
                              src={instructorAvatar}
                              alt={instructorDisplayName}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {instructorDisplayName}
                            </span>
                            <span className="ml-auto text-xs font-bold text-emerald-700">
                              Pass: {course.quiz?.passingScore || 70}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0 space-y-2">
                        {!isRemovedByAdmin && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCourseForStudio(
                                  course.courseId,
                                  "quiz"
                                );
                                document
                                  .getElementById("course-builder")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }}
                              className="py-2 px-2.5 bg-indigo-50 hover:bg-[#4F46E5] text-[#4F46E5] hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                quiz
                              </span>
                              <span>
                                Quiz ({course.quiz?.questions?.length || 0})
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCourseForStudio(
                                  course.courseId,
                                  "assignments"
                                );
                                document
                                  .getElementById("course-builder")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }}
                              className="py-2 px-2.5 bg-teal-50 hover:bg-[#14B8A6] text-teal-800 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                assignment
                              </span>
                              <span>
                                Tasks ({course.assignments?.length || 0})
                              </span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {isRemovedByAdmin ? (
                            <button
                              type="button"
                              onClick={() => setCourseToDeleteConfirm(course)}
                              className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete_forever
                              </span>
                              <span>Acknowledge &amp; Delete from Studio</span>
                            </button>
                          ) : isHidden || isPendingReview ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setResolutionRubricNote(
                                    course.instructorResolutionNote ||
                                      "Added Module 1 automated quiz grading rubric (70% pass threshold) and verified all multiple-choice answer keys."
                                  );
                                  setResolveModalCourse(course);
                                }}
                                className={`flex-1 py-2 px-3 ${
                                  isPendingReview
                                    ? "bg-[#4F46E5] hover:bg-indigo-700"
                                    : "bg-amber-600 hover:bg-amber-700"
                                } text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5`}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  {isPendingReview ? "edit_note" : "build"}
                                </span>
                                <span>
                                  {isPendingReview
                                    ? "Update Note"
                                    : "Resolve Issue"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCourseToDeleteConfirm(course)}
                                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs rounded-xl transition-all"
                                title="Delete Course"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectCourseForStudio(
                                    course.courseId,
                                    "basic"
                                  );
                                  document
                                    .getElementById("grading-section")
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                }}
                                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs rounded-xl transition-all"
                              >
                                Marks ({courseSubCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTogglePauseCourse(course)}
                                className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                              >
                                {isPaused ? "Resume" : "Pause"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCourseToDeleteConfirm(course)}
                                className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs rounded-xl transition-all"
                                title="Delete Course"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* =================================================================
              SECTION 3: ORGANIZED COURSE, SYLLABUS, QUIZ & ASSIGNMENT STUDIO
             ================================================================= */}
          {studioCourses.filter((c) => c.status !== "Removed").length === 0 &&
          !isCreatingNewCourse ? (
            <section
              id="course-builder"
              className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-10 text-center space-y-4 scroll-mt-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[34px]">
                  add_circle
                </span>
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-[#0F172A]">
                  Welcome to Your Instructor Studio, {instructorDisplayName}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  You have not created any active courses yet. Click below to
                  launch the Course, Curriculum, Quiz &amp; Assignment Builder
                  for your first course.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartCreateNewCourse}
                className="px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                <span>Create My First Course</span>
              </button>
            </section>
          ) : (
            <section id="course-builder" className="space-y-6 pt-2 scroll-mt-20">
              {/* TOP TARGET COURSE SELECTOR & 4-TAB WORKSPACE HEADER */}
              <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 sm:p-6 shadow-sm space-y-5 overflow-hidden">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5] text-[11px] font-bold uppercase tracking-wider">
                        Per-Course Studio Workspace
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{selectedCourseId}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] truncate">
                      {isCreatingNewCourse
                        ? `Creating New Course (#${selectedCourseId})`
                        : `Managing: ${
                            courseTitle || currentCourseObj?.title || ""
                          }`}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Switching the course selector updates the Quiz Builder,
                      Assignment Builder, Submitted Assignments, and Quiz Marks
                      for that specific course.
                    </p>
                  </div>

                  {/* Contained Course Switcher Dropdown + New Course Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto xl:max-w-[460px] shrink-0">
                    {studioCourses.filter((c) => c.status !== "Removed")
                      .length > 0 && (
                      <div className="flex-1 min-w-0">
                        <NexaSelect
                          label="Course"
                          icon="school"
                          value={selectedCourseId}
                          onChange={(val) => handleSelectCourseForStudio(val)}
                          options={studioCourses
                            .filter((c) => c.status !== "Removed")
                            .map((c) => ({
                              value: c.courseId,
                              label: `#${c.courseId} — ${c.title}`,
                            }))}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleStartCreateNewCourse}
                      className="h-10 px-4 rounded-[10px] bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        add_circle
                      </span>
                      <span>New Course</span>
                    </button>
                  </div>
                </div>

                {/* 4-Step Segmented Studio Tabs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: "basic",
                      step: "Step 1",
                      title: "Basic Info & Cover",
                      subtitle: "Title, category & schedule",
                      icon: "info",
                    },
                    {
                      id: "curriculum",
                      step: "Step 2",
                      title: `Curriculum (${builderModules.length} Modules)`,
                      subtitle: "Video & reading lessons",
                      icon: "layers",
                    },
                    {
                      id: "quiz",
                      step: "Step 3 • Separate",
                      title: `Quiz Studio (${quizQuestions.length} Qs)`,
                      subtitle: "Editable questions & A–D answers",
                      icon: "quiz",
                    },
                    {
                      id: "assignments",
                      step: "Step 4 • Separate",
                      title: `Assignment Studio (${courseAssignments.length})`,
                      subtitle: "Project tasks, rubrics & deadlines",
                      icon: "assignment_turned_in",
                    },
                  ].map((tab) => {
                    const active = activeBuilderTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveBuilderTab(tab.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          active
                            ? "bg-[#EEF2FF] border-[#4F46E5] ring-2 ring-[#4F46E5]/15 shadow-xs"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            active
                              ? "bg-[#4F46E5] text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {tab.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider block ${
                              active ? "text-[#4F46E5]" : "text-slate-400"
                            }`}
                          >
                            {tab.step}
                          </span>
                          <span className="text-xs font-bold text-[#0F172A] block truncate">
                            {tab.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {tab.subtitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 12-COLUMN MAIN WORKSPACE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 7 COLUMNS: ACTIVE STUDIO WORKSPACE */}
                <div className="lg:col-span-7 space-y-6">
                  {/* TAB 1: BASIC INFORMATION & THUMBNAIL */}
                  {activeBuilderTab === "basic" && (
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6 animate-fade-up">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                            <span className="material-symbols-outlined text-[18px]">
                              info
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-[#0F172A]">
                              1. Course Basic Information (#{selectedCourseId})
                            </h3>
                            <p className="text-xs text-slate-500">
                              Define course title, summary, category,
                              difficulty, and 16:9 cover artwork.
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#4F46E5] bg-indigo-50 px-2.5 py-1 rounded-lg">
                          #{selectedCourseId}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Course Title <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                            placeholder="e.g. Full-Stack Web Development with MERN"
                            className="w-full bg-slate-50 border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:bg-white font-medium text-[#0F172A]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Course Summary / Overview
                          </label>
                          <textarea
                            rows="2"
                            value={courseShortDescription}
                            onChange={(e) =>
                              setCourseShortDescription(e.target.value)
                            }
                            placeholder="Brief summary shown on the public Course Catalog and Curriculum Spotlight..."
                            className="w-full bg-slate-50 border border-[#E2E8F0] rounded-[10px] p-3 text-xs sm:text-sm focus:outline-none focus:border-[#4F46E5] focus:bg-white text-[#0F172A]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Category <span className="text-rose-500">*</span>
                            </label>
                            <NexaSelect
                              icon="category"
                              value={courseCategory}
                              onChange={setCourseCategory}
                              options={[
                                "Software Engineering",
                                "AI & Data Science",
                                "Cloud & DevOps",
                                "UI/UX Design",
                              ]}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Difficulty Level{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <NexaSelect
                              icon="signal_cellular_alt"
                              value={courseDifficulty}
                              onChange={setCourseDifficulty}
                              options={["Beginner", "Intermediate", "Advanced"]}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Estimated Duration
                            </label>
                            <input
                              type="text"
                              value={courseDurationText}
                              onChange={(e) =>
                                setCourseDurationText(e.target.value)
                              }
                              className="w-full bg-slate-50 border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-[#0F172A]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Enrollment Expiry Date
                            </label>
                            <input
                              type="date"
                              value={courseExpiryDate}
                              onChange={(e) =>
                                setCourseExpiryDate(e.target.value)
                              }
                              className="w-full bg-slate-50 border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-[#0F172A]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            16:9 Course Thumbnail Upload
                          </label>
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailFileChange}
                            className="hidden"
                          />
                          <div
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="border-2 border-dashed border-[#C7D2FE] bg-indigo-50/40 rounded-2xl p-6 text-center hover:bg-indigo-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-[#4F46E5] shadow-xs mb-3 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[24px]">
                                  cloud_upload
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-[#0F172A]">
                                <span className="text-[#4F46E5] underline">
                                  Click to Browse Computer
                                </span>{" "}
                                or Drag &amp; drop image
                              </p>
                              <div className="mt-4 flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs max-w-full">
                                <img
                                  alt="Thumbnail preview"
                                  className="w-10 h-6 object-cover rounded shrink-0"
                                  src={courseThumbnail}
                                />
                                <span className="text-xs font-medium text-slate-700 truncate">
                                  {courseThumbnailName}
                                </span>
                                <span className="text-xs text-emerald-600 font-bold ml-1 shrink-0">
                                  ✓ Verified
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={savingCourse}
                            onClick={() =>
                              handleSaveAndPublishCourse(
                                `Saved Course #${selectedCourseId}!`
                              )
                            }
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                          >
                            {savingCourse
                              ? "Saving..."
                              : `Save & Publish #${selectedCourseId}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveBuilderTab("curriculum")}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <span>Next: 2. Curriculum Modules</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CURRICULUM MODULES BUILDER */}
                  {activeBuilderTab === "curriculum" && (
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-5 animate-fade-up">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#14B8A6] flex items-center justify-center font-bold text-xs">
                            <span className="material-symbols-outlined text-[18px]">
                              layers
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-[#0F172A]">
                              2. Curriculum Modules for #{selectedCourseId}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Organize lessons for{" "}
                              <strong className="text-[#0F172A]">
                                {courseTitle ||
                                  currentCourseObj?.title ||
                                  selectedCourseId}
                              </strong>
                              .
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddModule}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            create_new_folder
                          </span>
                          <span>Add Module</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {builderModules.map((mod) => (
                          <div
                            key={mod.moduleId}
                            className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white shadow-xs"
                          >
                            <div
                              onClick={() =>
                                setBuilderModules((prev) =>
                                  prev.map((m) =>
                                    m.moduleId === mod.moduleId
                                      ? { ...m, expanded: !m.expanded }
                                      : m
                                  )
                                )
                              }
                              className="bg-slate-50 px-4 py-3.5 flex items-center justify-between border-b border-[#E2E8F0] cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {mod.number}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-sm text-[#0F172A] truncate">
                                    {mod.title}
                                  </h4>
                                  <span className="text-[11px] text-slate-500">
                                    {mod.durationSummary}
                                  </span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[18px] text-slate-400">
                                {mod.expanded ? "expand_less" : "expand_more"}
                              </span>
                            </div>

                            {mod.expanded && (
                              <div className="p-4 space-y-3">
                                {(mod.lessons || []).map((les) => (
                                  <div
                                    key={les.lessonId}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 gap-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#4F46E5] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">
                                          {les.type === "Video"
                                            ? "play_arrow"
                                            : "description"}
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-xs font-bold text-[#0F172A] block truncate">
                                          {les.title}
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          {les.type} • {les.duration}
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteLesson(
                                          mod.moduleId,
                                          les.lessonId
                                        )
                                      }
                                      className="p-1 text-slate-400 hover:text-rose-600 self-end sm:self-center"
                                      title="Delete Lesson"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                ))}

                                {addingLessonModuleId === mod.moduleId ? (
                                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        value={newLessonTitle}
                                        onChange={(e) =>
                                          setNewLessonTitle(e.target.value)
                                        }
                                        placeholder="Lesson title..."
                                        className="sm:col-span-2 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs"
                                      />
                                      <NexaSelect
                                        size="sm"
                                        value={newLessonType}
                                        onChange={setNewLessonType}
                                        options={[
                                          "Video",
                                          "Text/Code Guide",
                                          "PDF Download",
                                        ]}
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAddingLessonModuleId(null)
                                        }
                                        className="px-3 py-1 rounded-lg bg-white text-slate-600 text-xs font-semibold"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddLessonConfirm(mod.moduleId)
                                        }
                                        className="px-3 py-1 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold"
                                      >
                                        Save Lesson
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAddingLessonModuleId(mod.moduleId)
                                    }
                                    className="w-full py-2 border border-dashed border-indigo-300 hover:border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      add
                                    </span>
                                    <span>
                                      Add Lesson to Module {mod.number}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveAndPublishCourse(
                              `Curriculum Saved for #${selectedCourseId}!`
                            )
                          }
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          Save Curriculum Modules
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBuilderTab("quiz")}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <span>Next: 3. Quiz Studio</span>
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DEDICATED QUIZ STUDIO */}
                  {activeBuilderTab === "quiz" && (
                    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 shadow-sm space-y-6 animate-fade-up">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-[22px]">
                              quiz
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5]">
                                Dedicated Quiz Studio • #{selectedCourseId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                {quizQuestions.length} Questions
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-[#0F172A]">
                              Quiz Builder for &ldquo;
                              {courseTitle ||
                                currentCourseObj?.title ||
                                selectedCourseId}
                              &rdquo;
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddQuizQuestion}
                          className="px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            add_circle
                          </span>
                          <span>Add Question</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Quiz Title
                          </label>
                          <input
                            type="text"
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder="e.g. Module 1 Mastery Quiz"
                            className="w-full h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="100"
                            value={passingScore}
                            onChange={(e) => setPassingScore(e.target.value)}
                            className="w-full h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Time Limit (Mins)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={timeLimitMinutes}
                            onChange={(e) =>
                              setTimeLimitMinutes(e.target.value)
                            }
                            className="w-full h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                          />
                        </div>
                      </div>

                      <div className="space-y-5">
                        {quizQuestions.map((qItem, qIdx) => {
                          const currentOptions =
                            Array.isArray(qItem.options) &&
                            qItem.options.length === 4
                              ? qItem.options
                              : ["Option A", "Option B", "Option C", "Option D"];
                          const correctIdx = Number(qItem.correctIndex ?? 0);

                          return (
                            <div
                              key={qItem.questionId || qIdx}
                              className="border border-[#E2E8F0] rounded-2xl p-5 bg-slate-50/60 space-y-4 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center">
                                    Q{qIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={qItem.concept || ""}
                                    onChange={(e) =>
                                      handleUpdateQuizQuestionField(
                                        qIdx,
                                        "concept",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Concept tag (e.g. React Hooks)"
                                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#4F46E5]"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuizQuestion(qIdx)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    delete
                                  </span>
                                  <span>Delete</span>
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Question {qIdx + 1} Prompt{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                  rows="2"
                                  value={qItem.question}
                                  onChange={(e) =>
                                    handleUpdateQuizQuestionField(
                                      qIdx,
                                      "question",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Type the question students will answer..."
                                  className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:border-[#4F46E5] text-[#0F172A] font-medium"
                                />
                              </div>

                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">
                                    Edit Answer Choices (A, B, C, D) &amp;
                                    Select Correct Option:
                                  </span>
                                  <span className="text-[11px] font-semibold text-emerald-700">
                                    Correct Answer: Option{" "}
                                    {OPTION_LETTERS[correctIdx]}
                                  </span>
                                </div>

                                {currentOptions.map((optText, optIdx) => {
                                  const isCorrect = correctIdx === optIdx;
                                  const letter = OPTION_LETTERS[optIdx];

                                  return (
                                    <div
                                      key={letter}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                        isCorrect
                                          ? "bg-emerald-50/70 border-2 border-emerald-500"
                                          : "bg-white border-[#E2E8F0]"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateQuizQuestionField(
                                            qIdx,
                                            "correctIndex",
                                            optIdx
                                          )
                                        }
                                        title={`Mark Option ${letter} as Correct Answer`}
                                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                                          isCorrect
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        {letter}
                                      </button>

                                      <input
                                        type="text"
                                        value={optText}
                                        onChange={(e) =>
                                          handleUpdateQuizOptionText(
                                            qIdx,
                                            optIdx,
                                            e.target.value
                                          )
                                        }
                                        placeholder={`Type answer text for Option ${letter}...`}
                                        className={`flex-1 h-9 px-3 rounded-lg border text-xs sm:text-sm focus:outline-none ${
                                          isCorrect
                                            ? "bg-white border-emerald-300 font-bold text-emerald-950"
                                            : "bg-slate-50 focus:bg-white border-slate-200 font-medium text-[#0F172A]"
                                        }`}
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateQuizQuestionField(
                                            qIdx,
                                            "correctIndex",
                                            optIdx
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                                          isCorrect
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-[#4F46E5]"
                                        }`}
                                      >
                                        {isCorrect ? "✓ Correct" : "Set Correct"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Answer Explanation (Shown to Students on
                                  Review)
                                </label>
                                <input
                                  type="text"
                                  value={qItem.explanation || ""}
                                  onChange={(e) =>
                                    handleUpdateQuizQuestionField(
                                      qIdx,
                                      "explanation",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Explain why the selected option is correct..."
                                  className="w-full h-10 bg-white border border-[#E2E8F0] rounded-xl px-3 text-xs text-slate-700 focus:outline-none focus:border-[#4F46E5]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddQuizQuestion}
                        className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-[#4F46E5] bg-indigo-50/40 hover:bg-indigo-50 text-[#4F46E5] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add_circle
                        </span>
                        <span>
                          Add Another Question to #{selectedCourseId} Quiz
                        </span>
                      </button>

                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveBuilderTab("assignments")}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <span>Go to Step 4: Assignment Studio →</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingCourse}
                          onClick={() =>
                            handleSaveAndPublishCourse(
                              `Quiz Saved for #${selectedCourseId}!`
                            )
                          }
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            save
                          </span>
                          <span>
                            {savingCourse
                              ? "Saving Quiz..."
                              : `Save Quiz to #${selectedCourseId}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: DEDICATED ASSIGNMENT STUDIO */}
                  {activeBuilderTab === "assignments" && (
                    <div className="bg-white rounded-2xl border-2 border-teal-200 p-6 shadow-sm space-y-6 animate-fade-up">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#14B8A6] flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-[22px]">
                              assignment_turned_in
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                                Dedicated Assignment Studio • #{selectedCourseId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold">
                                {courseAssignments.length} Assignments
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-[#0F172A]">
                              Assignments for &ldquo;
                              {courseTitle ||
                                currentCourseObj?.title ||
                                selectedCourseId}
                              &rdquo;
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCourseAssignment}
                          className="px-3.5 py-2 rounded-xl bg-[#14B8A6] hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            add_circle
                          </span>
                          <span>Add Assignment</span>
                        </button>
                      </div>

                      <div className="space-y-5">
                        {courseAssignments.map((asn, asnIdx) => (
                          <div
                            key={asn.assignmentId || asnIdx}
                            className="p-5 rounded-2xl bg-slate-50/70 border border-[#E2E8F0] space-y-4 shadow-xs"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-[#14B8A6] text-white text-xs font-bold flex items-center justify-center">
                                  #{asnIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                                  Course Assignment Specification
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteCourseAssignment(asnIdx)
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  delete
                                </span>
                                <span>Remove</span>
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Assignment Title{" "}
                                <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={asn.title}
                                onChange={(e) =>
                                  handleUpdateAssignmentField(
                                    asnIdx,
                                    "title",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. REST API Authentication & JWT Middleware"
                                className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Technical Instructions &amp; Grading Rubric{" "}
                                <span className="text-rose-500">*</span>
                              </label>
                              <textarea
                                rows="3"
                                value={asn.instructions}
                                onChange={(e) =>
                                  handleUpdateAssignmentField(
                                    asnIdx,
                                    "instructions",
                                    e.target.value
                                  )
                                }
                                placeholder="Describe what students must build and upload..."
                                className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                  Due Date
                                </label>
                                <input
                                  type="date"
                                  value={asn.dueDate || "2026-12-15"}
                                  onChange={(e) =>
                                    handleUpdateAssignmentField(
                                      asnIdx,
                                      "dueDate",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-xs font-semibold text-[#0F172A]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                  Max Grade Points
                                </label>
                                <input
                                  type="number"
                                  min="10"
                                  max="500"
                                  value={asn.maxScore || 100}
                                  onChange={(e) =>
                                    handleUpdateAssignmentField(
                                      asnIdx,
                                      "maxScore",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-xs font-bold text-[#0F172A]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                  Allowed Formats
                                </label>
                                <NexaSelect
                                  size="md"
                                  value={
                                    asn.deliverableFormat || "ZIP, PDF, or DOCX"
                                  }
                                  onChange={(val) =>
                                    handleUpdateAssignmentField(
                                      asnIdx,
                                      "deliverableFormat",
                                      val
                                    )
                                  }
                                  options={[
                                    "ZIP, PDF, or DOCX",
                                    "ZIP Code Archive Only",
                                    "PDF Architecture Report",
                                  ]}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCourseAssignment}
                        className="w-full py-3 border-2 border-dashed border-teal-300 hover:border-[#14B8A6] bg-teal-50/40 hover:bg-teal-50 text-teal-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add_circle
                        </span>
                        <span>
                          Add Another Assignment to #{selectedCourseId}
                        </span>
                      </button>

                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveBuilderTab("quiz")}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                        >
                          ← Back to Step 3: Quiz Studio
                        </button>

                        <button
                          type="button"
                          disabled={savingCourse}
                          onClick={() =>
                            handleSaveAndPublishCourse(
                              `Assignments Saved for #${selectedCourseId}!`
                            )
                          }
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            rocket_launch
                          </span>
                          <span>
                            {savingCourse
                              ? "Publishing..."
                              : `Save & Publish Assignments to #${selectedCourseId}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* =============================================================
                    RIGHT 5 COLUMNS: COURSE-SCOPED SUBMISSIONS & STUDENT QUIZ MARKS
                   ============================================================= */}
                <div
                  id="grading-section"
                  className="lg:col-span-5 space-y-6 lg:sticky lg:top-20 scroll-mt-20"
                >
                  {/* COURSE FILTER PILLS FOR RIGHT COLUMN */}
                  {studioCourses.filter((c) => c.status !== "Removed").length >
                    0 && (
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Filter Submissions &amp; Quiz Marks by Course
                        </span>
                        <span className="text-xs font-mono font-bold text-[#4F46E5]">
                          #{selectedCourseId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {studioCourses
                          .filter((c) => c.status !== "Removed")
                          .map((c) => {
                            const isCurrent = c.courseId === selectedCourseId;
                            const subCountForCourse =
                              allOwnedSubmissions.filter(
                                (s) => s.courseId === c.courseId
                              ).length;
                            return (
                              <button
                                key={c.courseId}
                                type="button"
                                onClick={() =>
                                  handleSelectCourseForStudio(c.courseId)
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                  isCurrent
                                    ? "bg-[#4F46E5] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span>#{c.courseId}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    isCurrent
                                      ? "bg-white/20 text-white"
                                      : "bg-white text-slate-700"
                                  }`}
                                >
                                  {subCountForCourse}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 3.4 COURSE-SCOPED GRADE STUDENT SUBMISSION CARD */}
                  <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md p-6 space-y-5 relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            school
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-[#0F172A] truncate">
                            Submissions for #{selectedCourseId}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {courseTitle ||
                              currentCourseObj?.title ||
                              selectedCourseId}
                          </p>
                        </div>
                      </div>
                      {activeSubmission && (
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                            activeSubmission.status === "Graded"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activeSubmission.status === "Graded"
                                ? "bg-emerald-600"
                                : "bg-amber-600"
                            }`}
                          ></span>
                          {activeSubmission.status === "Graded"
                            ? "Graded"
                            : "Pending"}
                        </span>
                      )}
                    </div>

                    {courseScopedSubmissions.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                        <span className="material-symbols-outlined text-[32px] text-slate-400">
                          inbox
                        </span>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          No Assignment Submissions Yet for #{selectedCourseId}
                        </h4>
                        <p className="text-xs text-slate-500">
                          When a student uploads a deliverable for{" "}
                          <strong>
                            {courseTitle ||
                              currentCourseObj?.title ||
                              selectedCourseId}
                          </strong>
                          , it will appear right here for grading.
                        </p>
                      </div>
                    ) : (
                      <>
                        {courseScopedSubmissions.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {courseScopedSubmissions.map((sub, idx) => (
                              <button
                                key={sub.submissionId}
                                type="button"
                                onClick={() => handleSelectSubmission(idx)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                  idx === activeSubmissionIndex
                                    ? "bg-[#4F46E5] text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {sub.studentName} • {sub.assignmentTitle}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="p-3.5 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <img
                                alt={activeSubmission.studentName}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-200"
                                src={
                                  activeSubmission.studentAvatar ||
                                  STUDENT_AVATAR
                                }
                              />
                              <div>
                                <span className="text-xs font-bold text-[#0F172A]">
                                  {activeSubmission.studentName}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {activeSubmission.studentEmail}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-white text-[#4F46E5] px-2 py-0.5 rounded border border-indigo-100">
                              #{activeSubmission.courseId}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 text-xs">
                            <span className="text-slate-400 block text-[11px]">
                              Assignment Task:
                            </span>
                            <span className="font-bold text-slate-800">
                              {activeSubmission.assignmentTitle}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Submitted Artifact
                          </label>
                          <div className="flex items-center justify-between p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs hover:border-[#4F46E5] transition-all group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">
                                  folder_zip
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors truncate">
                                  {activeSubmission.fileName}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {activeSubmission.fileSizeLabel}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadStudentArtifact(activeSubmission)
                              }
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-[#4F46E5] hover:text-white text-[#4F46E5] text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                download
                              </span>
                              <span>Download</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Student Note
                          </label>
                          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 leading-relaxed italic">
                            &ldquo;{activeSubmission.notes}&rdquo;
                          </div>
                        </div>

                        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                              Assignment Score
                            </label>
                            <span className="text-xs font-bold text-[#4F46E5]">
                              Grade Scale: 0 – 100
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-28">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={scoreInput}
                                onChange={(e) => setScoreInput(e.target.value)}
                                className="w-full bg-white border-2 border-[#4F46E5] rounded-[10px] px-3 py-2 text-2xl font-black text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center"
                              />
                            </div>
                            <span className="text-xl font-bold text-slate-400">
                              / 100
                            </span>
                            <div className="ml-auto">
                              <span className="text-xs font-extrabold bg-emerald-600 text-white px-2.5 py-1 rounded-md shadow-xs">
                                {getLetterGradeBadge(scoreInput)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Instructor Qualitative Feedback
                          </label>
                          <textarea
                            rows="3"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder="Provide constructive architectural feedback..."
                            className="w-full bg-slate-50 border border-[#E2E8F0] rounded-[10px] p-3 text-xs sm:text-sm focus:outline-none focus:border-[#4F46E5] focus:bg-white text-[#0F172A] font-medium"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              onShowToast(
                                "Evaluation Draft Saved",
                                `Draft score (${scoreInput}/100) saved for ${activeSubmission.studentName}.`
                              )
                            }
                            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            disabled={publishingGrade}
                            onClick={handlePublishStudentGrade}
                            className="flex-1 py-2.5 px-4 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              check
                            </span>
                            <span>
                              {publishingGrade
                                ? "Publishing..."
                                : "Publish Grade"}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3.5 STUDENT QUIZ MARKS & RESULTS CARD (SCOPED BY COURSE!) */}
                  <div
                    id="quiz-marks-section"
                    className="bg-white rounded-2xl border-2 border-teal-200 p-6 shadow-sm space-y-4 scroll-mt-20"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#14B8A6] flex items-center justify-center font-bold shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            quiz
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#0F172A]">
                            Student Quiz Marks (#{selectedCourseId})
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Auto-graded quiz scores for{" "}
                            {courseTitle ||
                              currentCourseObj?.title ||
                              selectedCourseId}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold">
                        Pass: {passingScore}%
                      </span>
                    </div>

                    {courseStudentQuizMarks.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                        No students have enrolled or attempted the quiz for #
                        {selectedCourseId} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {courseStudentQuizMarks.map((row) => (
                          <div
                            key={row.enrollmentId}
                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={STUDENT_AVATAR}
                                alt={row.studentName}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-[#0F172A] block truncate">
                                  {row.studentName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 block truncate">
                                  {row.studentEmail}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {row.quizCompleted && row.scorePct !== null ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-extrabold text-[#0F172A]">
                                      {row.scorePct}%
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        row.passed
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-rose-100 text-rose-700"
                                    }`}
                                    >
                                      {row.passed ? "PASSED" : "FAILED"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {row.correctCount} / {row.totalQs} Correct •{" "}
                                    {row.assignmentGrade !== null
                                      ? `Task: ${row.assignmentGrade}/100`
                                      : `Task: ${row.assignmentStatus}`}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    Quiz Not Attempted
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {row.totalQs} Questions Assigned
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* MOBILE PERSISTENT BOTTOM BAR (<1024px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] z-30 grid grid-cols-5 items-center px-1 select-none">
        {[
          {
            id: "overview",
            label: "Courses",
            icon: "menu_book",
            hash: "#my-courses-section",
          },
          {
            id: "create-course",
            label: "Syllabus",
            icon: "layers",
            hash: "#course-builder",
            builderTab: "curriculum",
          },
          {
            id: "quizzes",
            label: "Quizzes",
            icon: "quiz",
            hash: "#course-builder",
            builderTab: "quiz",
          },
          {
            id: "assignments",
            label: "Tasks",
            icon: "assignment_turned_in",
            hash: "#course-builder",
            builderTab: "assignments",
          },
          {
            id: "grading",
            label: "Marks",
            icon: "workspace_premium",
            hash: "#grading-section",
          },
        ].map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                handleSidebarNav(item.id, item.hash, item.builderTab)
              }
              className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
                active ? "text-[#4F46E5] font-bold" : "text-slate-500"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}