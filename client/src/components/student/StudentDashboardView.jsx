import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { exportCertificatePDF } from "../../services/nexaService.js";
import {
  HERO_LEARNER_IMAGE,
  FALLBACK_COURSES,
} from "../../constants/nexaConstants.js";

const compressStudentAvatar = (file) =>
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

export default function StudentDashboardView({
  user,
  courses = [],
  enrollments = [],
  submissions = [],
  onExploreCatalog,
  onEnrollCourse,
  onOpenClassroom,
  onSubmitAssignment,
  onUpdateProfile,
  onLogout,
  onShowToast,
}) {
  const studentDisplayName = user?.name || "Learner";
  const studentFirstName = studentDisplayName.split(" ")[0] || "Learner";
  const studentEmail = (user?.email || "").toLowerCase().trim();
  const studentAvatar = user?.avatar || HERO_LEARNER_IMAGE;

  const [activeMenu, setActiveMenu] = useState("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState("ALL");
  const [rubricModalItem, setRubricModalItem] = useState(null);

  // Selected Certificate ID for the Landscape Certificate Showcase
  const [selectedCertCourseId, setSelectedCertCourseId] = useState(null);

  // ===========================================================================
  // 1. ALL STUDENT ENROLLMENTS (INCLUDING COMPLETED COURSES EVEN IF DELETED!)
  // ===========================================================================
  const studentEnrollmentsList = useMemo(() => {
    if (!studentEmail) return [];
    return enrollments.filter(
      (e) => e.studentEmail?.toLowerCase() === studentEmail
    );
  }, [enrollments, studentEmail]);

  // Active & Completed Courses (Keeps completed courses even if the instructor/admin later deleted the course!)
  const myCourses = useMemo(() => {
    const list = studentEnrollmentsList
      .map((enr) => {
        const crs = courses.find((c) => c.courseId === enr.courseId);
        const progress = enr.progressPercent ?? 15;
        const isCompleted =
          progress >= 100 ||
          Boolean(enr.certificateIssued) ||
          Boolean(enr.quizPassed && enr.assignmentStatus === "Graded") ||
          Boolean(enr.quizCompleted && progress >= 85);

        const isCourseDeletedOrRemoved = !crs || crs.status === "Removed";

        // If the course was deleted AND the student had NOT completed it, hide it from active courses
        if (isCourseDeletedOrRemoved && !isCompleted) {
          return null;
        }

        const suffix = (enr.courseId || "001").split("-").pop() || "001";

        return {
          ...(crs || {}),
          courseId: enr.courseId,
          title: crs?.title || enr.courseTitle || `Course #${enr.courseId}`,
          category:
            crs?.category || enr.courseCategory || "Software Engineering",
          thumbnail:
            crs?.thumbnail ||
            enr.courseThumbnail ||
            FALLBACK_COURSES[0].thumbnail,
          instructorName:
            crs?.instructorName || enr.instructorName || "Alex Morgan",
          instructorEmail:
            crs?.instructorEmail ||
            enr.instructorEmail ||
            "alex.morgan@nexalearn.io",
          instructorAvatar:
            crs?.instructorAvatar || FALLBACK_COURSES[0].instructorAvatar,
          progress: isCompleted ? 100 : progress,
          status: isCompleted ? "Completed" : "In Progress",
          isArchivedCourse: isCourseDeletedOrRemoved,
          quizCompleted: Boolean(enr.quizCompleted),
          bestQuizScore: enr.bestQuizScore ?? null,
          assignmentGrade: enr.assignmentGrade ?? null,
          certificateId: enr.certificateId || `#CERT-NL-2026-${suffix}`,
          completedDateLabel: enr.updatedAt
            ? new Date(enr.updatedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
        };
      })
      .filter(Boolean);

    const q = dashboardSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.courseId.toLowerCase().includes(q) ||
        (c.instructorName || "").toLowerCase().includes(q)
    );
  }, [courses, studentEnrollmentsList, dashboardSearch]);

  // ===========================================================================
  // 2. ALL EARNED CERTIFICATES (PERMANENT — NEVER LOST WHEN COURSES ARE DELETED)
  // ===========================================================================
  const earnedCertificates = useMemo(() => {
    return myCourses.filter((c) => c.status === "Completed");
  }, [myCourses]);

  // Currently selected certificate for the large landscape preview
  const activeCertificateCourse = useMemo(() => {
    if (earnedCertificates.length === 0) return null;
    return (
      earnedCertificates.find((c) => c.courseId === selectedCertCourseId) ||
      earnedCertificates[0]
    );
  }, [earnedCertificates, selectedCertCourseId]);

  // All published courses in the catalog that this student has NOT enrolled in yet
  const availableCatalogCourses = useMemo(() => {
    const enrolledIds = new Set(
      studentEnrollmentsList.map((e) => e.courseId)
    );
    const q = dashboardSearch.toLowerCase().trim();
    return courses
      .filter(
        (c) =>
          (c.status || "Published") === "Published" &&
          !enrolledIds.has(c.courseId)
      )
      .filter((c) => {
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.courseId.toLowerCase().includes(q) ||
          (c.instructorName || "").toLowerCase().includes(q)
        );
      });
  }, [courses, studentEnrollmentsList, dashboardSearch]);

  // Featured Hero Course for "Continue Learning" (prefers In-Progress live courses)
  const featuredCourse = useMemo(() => {
    const liveCourses = myCourses.filter((c) => !c.isArchivedCourse);
    if (liveCourses.length === 0) return null;
    return (
      liveCourses.find((c) => c.status === "In Progress") ||
      liveCourses[0] ||
      null
    );
  }, [myCourses]);

  // Derive Assignments ONLY from live enrolled courses
  const allAssignments = useMemo(() => {
    const list = [];
    myCourses
      .filter((crs) => !crs.isArchivedCourse)
      .forEach((crs) => {
        const courseAsnList =
          Array.isArray(crs.assignments) && crs.assignments.length > 0
            ? crs.assignments
            : crs.assignment?.title
            ? [
                {
                  assignmentId: `ASN-${crs.courseId}-1`,
                  title: crs.assignment.title,
                  instructions: crs.assignment.instructions,
                  dueDate: crs.assignment.dueDate || "2026-12-15",
                  maxScore: crs.assignment.maxScore || 100,
                },
              ]
            : [];

        courseAsnList.forEach((asn, idx) => {
          const sub = submissions.find(
            (s) =>
              s.courseId === crs.courseId &&
              s.assignmentTitle?.toLowerCase() === asn.title?.toLowerCase() &&
              s.studentEmail?.toLowerCase() === studentEmail
          );

          const isGraded = sub?.status === "Graded";
          const isSubmitted = !isGraded && Boolean(sub);

          list.push({
            id: asn.assignmentId || `ASN-${crs.courseId}-${idx + 1}`,
            courseId: crs.courseId,
            courseTitle: `${crs.title} (#${crs.courseId})`,
            title: asn.title,
            instructions:
              asn.instructions ||
              "Requirement: Upload your completed project deliverable (.zip, .pdf, or .docx).",
            dueDate: asn.dueDate || "2026-12-15",
            maxScore: asn.maxScore || 100,
            instructorName: crs.instructorName || "Alex Morgan",
            instructorEmail: crs.instructorEmail || "alex.morgan@nexalearn.io",
            status: isGraded ? "Graded" : isSubmitted ? "Submitted" : "Pending",
            submittedFileName: sub?.fileName || "",
            submittedNotes: sub?.notes || "",
            grade: sub?.grade ?? null,
            feedback: sub?.feedback || "",
            evaluatedDate: sub?.gradedAt
              ? `Evaluated ${new Date(sub.gradedAt).toLocaleDateString()}`
              : "Evaluated Recently",
            rubricBreakdown: [
              {
                criterion: "System Architecture & Implementation",
                score: "38 / 40",
              },
              { criterion: "Security & Validation Standards", score: "30 / 30" },
              {
                criterion: "Code Cleanliness & Documentation",
                score: `${Math.max(20, (sub?.grade || 95) - 68)} / 30`,
              },
            ],
          });
        });
      });
    return list;
  }, [myCourses, submissions, studentEmail]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const activeTargetAssignment = useMemo(() => {
    if (allAssignments.length === 0) return null;
    return (
      allAssignments.find((a) => a.id === selectedAssignmentId) ||
      allAssignments.find((a) => a.status === "Pending") ||
      allAssignments[0]
    );
  }, [allAssignments, selectedAssignmentId]);

  const filteredAssignments = useMemo(() => {
    const q = dashboardSearch.toLowerCase().trim();
    return allAssignments.filter((a) => {
      if (assignmentFilter !== "ALL" && a.status !== assignmentFilter)
        return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.courseTitle.toLowerCase().includes(q)
      );
    });
  }, [allAssignments, assignmentFilter, dashboardSearch]);

  // Drag & Drop File Upload State
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFile, setStagedFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submittingNow, setSubmittingNow] = useState(false);

  // Student Profile, Photo Upload & Password Change Modal State
  const avatarInputRef = useRef(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(studentDisplayName);
  const [profileHeadline, setProfileHeadline] = useState(
    user?.headline || "Full-Stack Engineering Learner"
  );
  const [profileInstitution, setProfileInstitution] = useState(
    user?.institution || "NexaLearn Cohort 2026"
  );
  const [profileAvatarPreview, setProfileAvatarPreview] =
    useState(studentAvatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleStudentAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressStudentAvatar(file);
      setProfileAvatarPreview(dataUrl);
      onShowToast(
        "Profile Photo Staged",
        "Click 'Save Profile & Security' to update your student photo."
      );
    } catch {
      onShowToast("Image Error", "Could not process selected photo.", true);
    }
    e.target.value = "";
  };

  const handleFilePick = (file) => {
    if (!file) return;
    const sizeMB = Math.max(
      0.1,
      Number((file.size / (1024 * 1024)).toFixed(1))
    );
    setStagedFile({
      name: file.name,
      sizeLabel: `${sizeMB} MB`,
      sizeKB: Math.max(100, Math.round(file.size / 1024)),
    });
    onShowToast("File Attached", `${file.name} staged and ready to submit.`);
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFilePick(file);
  };

  const handleSubmitAssignmentClick = async (e) => {
    if (e) e.preventDefault();
    if (!activeTargetAssignment) {
      onShowToast(
        "No Active Assignment",
        "Please enroll in a course first to submit assignments.",
        true
      );
      return;
    }
    if (!stagedFile) {
      onShowToast(
        "File Required",
        "Please select or drag & drop a file (.zip, .pdf, or .docx) from your device before submitting.",
        true
      );
      return;
    }

    setSubmittingNow(true);
    await onSubmitAssignment({
      courseId: activeTargetAssignment.courseId,
      courseTitle: activeTargetAssignment.courseTitle,
      assignmentTitle: activeTargetAssignment.title,
      instructorEmail: activeTargetAssignment.instructorEmail,
      fileName: stagedFile.name,
      fileSizeKB: stagedFile.sizeKB,
      notes:
        submissionNotes.trim() ||
        "Submitted project archive from Student Learning Hub.",
    });
    setSubmittingNow(false);
    setStagedFile(null);
    setSubmissionNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Real Dynamic KPI Calculations
  const completedCoursesCount = earnedCertificates.length;
  const pendingCount = allAssignments.filter(
    (a) => a.status === "Pending"
  ).length;
  const submittedCount = allAssignments.filter(
    (a) => a.status === "Submitted"
  ).length;
  const gradedCount = allAssignments.filter(
    (a) => a.status === "Graded"
  ).length;

  const avgQuizScore = useMemo(() => {
    const scored = myCourses.filter((c) => typeof c.bestQuizScore === "number");
    if (scored.length === 0) return "—";
    const sum = scored.reduce((acc, c) => acc + c.bestQuizScore, 0);
    return `${Math.round(sum / scored.length)}%`;
  }, [myCourses]);

  const handleDownloadSpecificCertificate = (certCourse) => {
    if (!certCourse) return;
    exportCertificatePDF({
      studentName: studentDisplayName,
      courseTitle: certCourse.title,
      issueDate: certCourse.completedDateLabel,
      instructorName: certCourse.instructorName || "Alex Morgan",
      instructorRole: "Lead Course Instructor",
      credentialId: certCourse.certificateId || "#CERT-NL-2026-001",
    });
    onShowToast(
      "Certificate PDF Ready",
      `Opened printable PDF certificate for "${certCourse.title}" (${certCourse.certificateId}).`
    );
  };

  const menuItems = [
    {
      id: "overview",
      label: "Overview",
      icon: "grid_view",
      hash: "#student-top",
    },
    { id: "explore-courses", label: "Explore Courses", icon: "explore" },
    {
      id: "my-learning",
      label: "My Learning",
      icon: "auto_stories",
      hash: "#my-active-courses",
    },
    {
      id: "quizzes",
      label: "Quizzes",
      icon: "quiz",
      hash: "#student-quizzes-section",
    },
    {
      id: "assignments",
      label: "Assignments",
      icon: "assignment",
      hash: "#student-assignments",
    },
    {
      id: "my-grades",
      label: "My Grades",
      icon: "grade",
      hash: "#student-assignments",
    },
    {
      id: "certificates",
      label: `Certificates (${earnedCertificates.length})`,
      icon: "workspace_premium",
      hash: "#student-certificates",
    },
    {
      id: "profile-settings",
      label: "Profile & Settings",
      icon: "settings",
    },
  ];

  const handleMenuNavigation = (item) => {
    setActiveMenu(item.id);
    setMobileSidebarOpen(false);
    if (item.id === "explore-courses") {
      onExploreCatalog();
      return;
    }
    if (item.id === "profile-settings") {
      setProfileModalOpen(true);
      return;
    }
    if (item.id === "my-grades") {
      setAssignmentFilter("Graded");
    } else if (item.id === "assignments") {
      setAssignmentFilter("ALL");
    }
    if (item.hash) {
      document
        .querySelector(item.hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      id="student-top"
      className="bg-[#f8f9ff] font-body-md text-[#0b1c30] antialiased min-h-screen pb-16 md:pb-0"
    >
      {/* MODAL 1: RUBRIC & INSTRUCTOR FEEDBACK DETAILS MODAL */}
      {rubricModalItem &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0b1c30]/45 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRubricModalItem(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-outline-variant/30 space-y-5 animate-pop-in"
            >
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#7cf994] text-[#006e2d] font-label-sm text-label-sm font-semibold">
                    Graded &amp; Verified • {rubricModalItem.grade}/
                    {rubricModalItem.maxScore}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-[#0b1c30] mt-2">
                    {rubricModalItem.title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {rubricModalItem.courseTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRubricModalItem(null)}
                  className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-label-md text-label-md uppercase tracking-wider text-outline">
                  Rubric Evaluation Breakdown
                </h4>
                {(rubricModalItem.rubricBreakdown || []).map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#eff4ff] flex items-center justify-between"
                  >
                    <span className="font-body-md text-body-md text-[#0b1c30] font-medium">
                      {row.criterion}
                    </span>
                    <span className="font-label-md text-label-md text-[#006e2d] font-bold">
                      {row.score}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#f8f9ff] border border-outline-variant/25 space-y-1.5">
                <div className="flex items-center gap-2 font-label-sm text-label-sm text-[#006e2d]">
                  <span className="material-symbols-outlined text-[16px]">
                    verified
                  </span>
                  <span>
                    Evaluator Note ({rubricModalItem.instructorName}):
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                  &ldquo;{rubricModalItem.feedback}&rdquo;
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setRubricModalItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-white font-label-md text-label-md"
                >
                  Close Evaluation
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 2: STUDENT PROFILE, PHOTO UPLOAD & PASSWORD CHANGE MODAL */}
      {profileModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0b1c30]/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setProfileModalOpen(false)}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordError("");
                if (newPassword) {
                  if (newPassword.length < 6) {
                    setPasswordError(
                      "New password must be at least 6 characters."
                    );
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError("New passwords do not match.");
                    return;
                  }
                }
                const res = await onUpdateProfile({
                  name: profileName.trim(),
                  headline: profileHeadline.trim(),
                  institution: profileInstitution.trim(),
                  avatar: profileAvatarPreview,
                  currentPassword: currentPassword || undefined,
                  newPassword: newPassword || undefined,
                });
                if (res && !res.ok) {
                  setPasswordError(
                    res.message || "Failed to update password."
                  );
                  return;
                }
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setProfileModalOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-outline-variant/30 space-y-4 my-auto animate-pop-in"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative group">
                    <img
                      src={profileAvatarPreview}
                      alt={profileName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Upload New Photo"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        photo_camera
                      </span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-[#0b1c30]">
                      Learner Profile &amp; Security
                    </h3>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="mt-1 px-3 py-1 rounded-lg bg-[#e5eeff] hover:bg-[#dce9ff] text-primary font-label-sm text-label-sm inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        upload
                      </span>
                      <span>Upload Profile Photo</span>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleStudentAvatarPick}
                      className="hidden"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-label-md text-[#0b1c30] mb-1">
                    Full Name (On Certificates)
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-[#0b1c30] font-body-md focus:bg-white focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-[#0b1c30] mb-1">
                    Academic Headline
                  </label>
                  <input
                    type="text"
                    value={profileHeadline}
                    onChange={(e) => setProfileHeadline(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-[#0b1c30] font-body-md focus:bg-white focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-[#0b1c30] mb-1">
                  Cohort / Institution
                </label>
                <input
                  type="text"
                  value={profileInstitution}
                  onChange={(e) => setProfileInstitution(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-[#0b1c30] font-body-md focus:bg-white focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant/20 space-y-3">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary block">
                  Change Account Password (Optional)
                </span>

                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs font-semibold">
                    {passwordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current..."
                      className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 chars..."
                      className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new..."
                      className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-outline-variant/40 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-white font-label-md text-label-md shadow-sm"
                >
                  Save Profile &amp; Security
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Mobile Sidebar Backdrop Overlay (<768px) */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-[#0b1c30]/40 backdrop-blur-xs z-40"
        />
      )}

      {/* FIXED 256PX LEFT SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-outline-variant/30 z-50 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col">
          <div className="h-[72px] px-space-lg flex items-center justify-between border-b border-outline-variant/20">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[22px]">
                  school
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-[#0b1c30] font-bold tracking-tight">
                NexaLearn
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-[#eff4ff]"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          </div>

          <div className="px-space-md py-space-sm">
            <span className="px-space-sm font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Academic Menu
            </span>
          </div>

          <nav className="px-space-sm flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuNavigation(item)}
                  className={`w-full flex items-center gap-3 px-space-md h-10 rounded-lg transition-colors text-left ${
                    isActive
                      ? "bg-[#eff4ff] text-primary font-semibold font-label-lg text-label-lg"
                      : "text-on-surface-variant hover:bg-[#eff4ff] hover:text-[#0b1c30] font-label-lg text-label-lg"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-space-md border-t border-outline-variant/20">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#eff4ff]">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-3 min-w-0 text-left"
            >
              <img
                src={studentAvatar}
                alt={studentDisplayName}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white"
              />
              <div className="flex flex-col truncate">
                <span className="font-label-md text-label-md text-[#0b1c30] truncate">
                  {studentDisplayName}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  Student
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (md:pl-64) */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Sticky 72px Top Header */}
        <header className="fixed top-0 right-0 left-0 md:left-64 h-[72px] bg-white/90 backdrop-blur-xl border-b border-outline-variant/30 z-30 px-4 sm:px-space-lg flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-lg bg-[#eff4ff] text-[#0b1c30] flex items-center justify-center"
              aria-label="Open Menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                menu
              </span>
            </button>

            <div className="flex items-center gap-2 font-label-lg text-label-lg">
              <span className="text-on-surface-variant hidden xs:inline">
                Dashboard
              </span>
              <span className="text-outline-variant text-[12px] hidden xs:inline">
                /
              </span>
              <span className="text-[#0b1c30] font-semibold">
                Student Overview
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-space-md relative">
            <div className="relative hidden sm:flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Search my courses & certificates..."
                className="w-52 lg:w-64 h-10 pl-9 pr-4 rounded-[10px] bg-[#f8f9ff] border border-outline-variant/40 font-body-md text-body-md text-[#0b1c30] placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setNotificationsOpen((p) => !p)}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-[#eff4ff] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
              {pendingCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-white"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-outline-variant/30 p-4 z-50 space-y-3 animate-pop-in">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                  <span className="font-label-md text-[#0b1c30] font-bold">
                    Academic Alerts
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-primary font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-[#eff4ff] text-xs space-y-0.5">
                  <p className="font-semibold text-primary">
                    {myCourses.length} Course(s) • {earnedCertificates.length}{" "}
                    Earned Certificate(s)
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#e5eeff] shrink-0"
              title="Edit Profile & Photo"
            >
              <img
                src={studentAvatar}
                alt={studentDisplayName}
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="w-full pt-[72px] bg-[#f8f9ff] flex-1">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-space-lg py-6 sm:py-space-xl">
            <div className="flex flex-col w-full animate-fade-up">
              {/* TOP GREETING ROW */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8">
                <div className="space-y-1">
                  <h1 className="font-display text-display-mobile sm:text-display text-[#0b1c30] tracking-tight">
                    Good Morning, {studentFirstName}!
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    {myCourses.length === 0
                      ? "Welcome to NexaLearn! Browse our course catalog to enroll in your first course."
                      : "Let's keep your learning momentum going."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-outline-variant/40 text-[#0b1c30] font-label-md text-label-md hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      manage_accounts
                    </span>
                    <span>Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={onExploreCatalog}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-white font-label-lg text-label-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      explore
                    </span>
                    <span>Explore Courses</span>
                  </button>
                </div>
              </div>

              {/* 4 OVERVIEW METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-10">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Enrolled Courses
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#e5eeff] flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[22px]">
                        menu_book
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-display text-[#0b1c30] leading-none mb-2">
                      {myCourses.length}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e5eeff] text-primary-container font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">
                        trending_up
                      </span>
                      <span>
                        {myCourses.length === 0
                          ? "Not enrolled yet"
                          : "Saved in your transcript"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() =>
                    document
                      .getElementById("student-certificates")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Earned Certificates
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#d3e4fe] flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">
                        workspace_premium
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-display text-[#0b1c30] leading-none mb-2">
                      {completedCoursesCount}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eff4ff] text-primary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">
                        download
                      </span>
                      <span>Click to view &amp; download all</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Pending Assignments
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#ffdcc3] flex items-center justify-center text-[#934e00]">
                      <span className="material-symbols-outlined text-[22px]">
                        pending_actions
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-display text-[#0b1c30] leading-none mb-2">
                      {pendingCount}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffdad6] text-[#93000a] font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">
                        schedule
                      </span>
                      <span>{submittedCount} submitted for review</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Average Quiz Score
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#7cf994] flex items-center justify-center text-[#006e2d]">
                      <span className="material-symbols-outlined text-[22px]">
                        verified
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-display text-[#0b1c30] leading-none mb-2">
                      {avgQuizScore}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7cf994]/60 text-[#006e2d] font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">
                        insights
                      </span>
                      <span>Auto-graded mastery</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTINUE LEARNING HERO CARD */}
              {featuredCourse && (
                <div className="pb-10">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        play_circle
                      </span>
                      <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                        Continue Learning
                      </h2>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 shadow-sm border border-[#e2e8f0]/60 transition-all hover:shadow-md">
                    <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                      <div className="w-full lg:w-72 h-44 rounded-xl overflow-hidden relative shrink-0">
                        <img
                          src={featuredCourse.thumbnail}
                          alt={featuredCourse.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/60 via-transparent to-transparent flex items-end p-3">
                          <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur font-label-sm text-label-sm text-[#0b1c30]">
                            {featuredCourse.modules?.length || 2} Modules
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-5 min-w-0">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#e5eeff] text-primary font-label-sm text-label-sm">
                              #{featuredCourse.courseId}
                            </span>
                            <span className="font-body-sm text-body-sm text-outline">
                              • {featuredCourse.category}
                            </span>
                          </div>
                          <h3 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-[#0b1c30] mb-2 tracking-tight">
                            {featuredCourse.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-on-surface-variant font-body-sm text-body-sm">
                            <div className="flex items-center gap-2">
                              <img
                                src={featuredCourse.instructorAvatar}
                                alt={featuredCourse.instructorName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-[#0b1c30] font-medium">
                                {featuredCourse.instructorName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                          <div className="flex-1 max-w-md">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                                Course Progress
                              </span>
                              <span className="font-label-sm text-label-sm text-primary-container font-semibold">
                                {featuredCourse.progress}% Complete
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-[#dce9ff] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-container rounded-full transition-all duration-500"
                                style={{ width: `${featuredCourse.progress}%` }}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenClassroom(featuredCourse, "video")
                            }
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-container text-white font-label-lg text-label-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap"
                          >
                            <span>Continue Learning</span>
                            <span className="material-symbols-outlined text-[18px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MY ACTIVE & COMPLETED COURSES GRID */}
              <div id="my-active-courses" className="pb-10 scroll-mt-20">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                    My Enrolled &amp; Completed Courses ({myCourses.length})
                  </h2>
                </div>

                {myCourses.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center border border-[#e2e8f0]/60 text-on-surface-variant text-sm">
                    No enrolled courses yet. Enroll in a course below or from
                    the public catalog to start learning.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myCourses.map((course) => {
                      const isCompleted = course.status === "Completed";
                      return (
                        <div
                          key={course.courseId}
                          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group"
                        >
                          <div>
                            <div className="h-40 w-full relative overflow-hidden">
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div
                                className={`absolute top-3 right-3 px-2.5 py-1 rounded-md backdrop-blur font-label-sm text-label-sm font-semibold ${
                                  isCompleted
                                    ? "bg-[#7cf994]/95 text-[#006e2d]"
                                    : "bg-white/90 text-primary-container"
                                }`}
                              >
                                {isCompleted ? "Completed ✓" : course.status}
                              </div>
                              {course.isArchivedCourse && (
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
                                  Archived Course • Certificate Preserved
                                </div>
                              )}
                            </div>
                            <div className="p-5">
                              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                                #{course.courseId}
                              </span>
                              <h3 className="font-headline-sm text-headline-sm text-[#0b1c30] mt-1 mb-2 line-clamp-1">
                                {course.title}
                              </h3>
                              <div className="flex items-center gap-2 mb-4">
                                <img
                                  src={course.instructorAvatar}
                                  alt={course.instructorName}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                                  {course.instructorName}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between font-label-sm text-label-sm">
                                  <span className="text-on-surface-variant">
                                    Progress
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      isCompleted
                                        ? "text-[#006e2d]"
                                        : "text-primary-container"
                                    }`}
                                  >
                                    {course.progress}%
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-[#dce9ff] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isCompleted
                                        ? "bg-[#006e2d]"
                                        : "bg-primary-container"
                                    }`}
                                    style={{ width: `${course.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCertCourseId(course.courseId);
                                  document
                                    .getElementById("student-certificates")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-[#006e2d] hover:bg-emerald-100 font-label-md text-label-md transition-colors text-center font-bold flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  workspace_premium
                                </span>
                                <span>View Certificate</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenClassroom(course, "video")
                                }
                                className="flex-1 py-2.5 rounded-xl bg-[#e5eeff] text-primary font-label-md text-label-md hover:bg-[#dce9ff] transition-colors text-center font-medium"
                              >
                                Resume Course
                              </button>
                            )}
                            {!course.isArchivedCourse && (
                              <button
                                type="button"
                                onClick={() => onOpenClassroom(course, "quiz")}
                                className="px-3.5 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-primary-container text-primary hover:text-white font-label-md text-label-md transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  quiz
                                </span>
                                <span>
                                  {course.quizCompleted
                                    ? `${course.bestQuizScore}%`
                                    : "Quiz"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AVAILABLE COURSES IN CATALOG (1-CLICK ENROLL FOR STUDENTS) */}
              {availableCatalogCourses.length > 0 && (
                <div className="pb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">
                          explore
                        </span>
                        <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                          Available Courses to Enroll (
                          {availableCatalogCourses.length})
                        </h2>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Published courses ready for immediate enrollment
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableCatalogCourses.map((course) => (
                      <div
                        key={course.courseId}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="h-40 w-full relative overflow-hidden">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/90 text-primary font-label-sm text-label-sm font-semibold">
                              {course.category}
                            </span>
                            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-[#0b1c30]/80 text-white text-[11px] font-medium">
                              {course.durationLabel ||
                                `${course.durationHours || 20} Hours`}
                            </span>
                          </div>
                          <div className="p-5">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-mono font-bold text-outline">
                                #{course.courseId}
                              </span>
                              <span className="font-semibold text-primary">
                                {course.difficulty}
                              </span>
                            </div>
                            <h3 className="font-headline-sm text-headline-sm text-[#0b1c30] mt-1 mb-2 line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-3">
                              {course.shortDescription}
                            </p>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <img
                                src={course.instructorAvatar}
                                alt={course.instructorName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-xs font-medium text-[#0b1c30] truncate">
                                {course.instructorName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onEnrollCourse
                                ? onEnrollCourse(course)
                                : onExploreCatalog()
                            }
                            className="flex-1 py-2.5 rounded-xl bg-primary-container text-white font-label-md text-label-md hover:opacity-95 transition-all text-center font-semibold shadow-xs"
                          >
                            Enroll in Course
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DEDICATED COURSE QUIZZES SECTION */}
              <div id="student-quizzes-section" className="pb-10 scroll-mt-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        quiz
                      </span>
                      <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                        Course Quizzes &amp; Knowledge Assessments
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Start a timed quiz for your enrolled courses below or
                      inspect your completed answer breakdown.
                    </p>
                  </div>
                </div>

                {myCourses.filter((c) => !c.isArchivedCourse).length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center border border-[#e2e8f0]/60 text-on-surface-variant text-sm">
                    No active quizzes unlocked yet. Enroll in an active course
                    to access its quizzes.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {myCourses
                      .filter((c) => !c.isArchivedCourse)
                      .map((crs) => (
                        <div
                          key={crs.courseId}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 flex flex-col justify-between gap-4 hover:shadow-md transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#e5eeff] text-primary font-label-sm text-label-sm">
                                #{crs.courseId}
                              </span>
                              {crs.quizCompleted ? (
                                <span className="px-2.5 py-0.5 rounded-md bg-[#7cf994] text-[#006e2d] font-label-sm text-label-sm font-bold">
                                  Completed • {crs.bestQuizScore}% ✓
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-md bg-[#ffdcc3] text-[#934e00] font-label-sm text-label-sm font-semibold">
                                  Ready to Start
                                </span>
                              )}
                            </div>
                            <h3 className="font-headline-sm text-headline-sm text-[#0b1c30] line-clamp-1">
                              {crs.quiz?.title || `${crs.title} Quiz`}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                              Course: {crs.title}
                            </p>
                            <div className="pt-2 flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                              <span>
                                {crs.quiz?.questions?.length || 3} Questions
                              </span>
                              <span>•</span>
                              <span>Pass: {crs.quiz?.passingScore || 70}%</span>
                              <span>•</span>
                              <span>
                                {crs.quiz?.timeLimitMinutes || 5} Mins
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenClassroom(crs, "quiz")}
                            className={`w-full py-2.5 rounded-xl font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                              crs.quizCompleted
                                ? "bg-[#e5eeff] text-primary hover:bg-[#dce9ff]"
                                : "bg-primary-container text-white hover:opacity-95"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              {crs.quizCompleted ? "visibility" : "play_arrow"}
                            </span>
                            <span>
                              {crs.quizCompleted
                                ? "View Completed Quiz Answers"
                                : "Start Course Quiz"}
                            </span>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* MY ASSIGNMENTS & DRAG-AND-DROP SUBMISSION WORKSPACE */}
              <div id="student-assignments" className="pb-12 scroll-mt-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                        My Assignments &amp; Recent Grades
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Manage submissions and review instructor evaluation
                        marks for your enrolled courses
                      </p>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setAssignmentFilter("ALL")}
                        className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                          assignmentFilter === "ALL"
                            ? "bg-[#e5eeff] text-primary font-semibold"
                            : "bg-white text-on-surface-variant hover:text-[#0b1c30] shadow-xs"
                        }`}
                      >
                        All ({allAssignments.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignmentFilter("Pending")}
                        className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                          assignmentFilter === "Pending"
                            ? "bg-[#e5eeff] text-primary font-semibold"
                            : "bg-white text-on-surface-variant hover:text-[#0b1c30] shadow-xs"
                        }`}
                      >
                        <span>Pending</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-[#ffdcc3] text-[#934e00] font-bold text-[10px]">
                          {pendingCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignmentFilter("Submitted")}
                        className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                          assignmentFilter === "Submitted"
                            ? "bg-[#e5eeff] text-primary font-semibold"
                            : "bg-white text-on-surface-variant hover:text-[#0b1c30] shadow-xs"
                        }`}
                      >
                        <span>Submitted</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-[#e5eeff] text-primary font-bold text-[10px]">
                          {submittedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignmentFilter("Graded")}
                        className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                          assignmentFilter === "Graded"
                            ? "bg-[#e5eeff] text-primary font-semibold"
                            : "bg-white text-on-surface-variant hover:text-[#0b1c30] shadow-xs"
                        }`}
                      >
                        <span>Graded</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-[#7cf994] text-[#006e2d] font-bold text-[10px]">
                          {gradedCount}
                        </span>
                      </button>
                    </div>

                    {filteredAssignments.length === 0 ? (
                      <div className="bg-white rounded-2xl p-6 text-center border border-[#e2e8f0]/60 text-on-surface-variant text-sm">
                        {allAssignments.length === 0
                          ? "No assignments available yet. Enroll in an active course to view its assignments."
                          : "No assignments match the selected filter."}
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {filteredAssignments.map((asn) => {
                          if (asn.status === "Graded") {
                            return (
                              <div
                                key={asn.id}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]/60 hover:shadow-md transition-shadow"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-md bg-[#7cf994] text-[#006e2d] font-label-sm text-label-sm font-medium">
                                        Graded &amp; Verified
                                      </span>
                                      <span className="font-body-sm text-body-sm text-outline">
                                        {asn.evaluatedDate}
                                      </span>
                                    </div>
                                    <h4 className="font-headline-sm text-headline-sm text-[#0b1c30] pt-1">
                                      {asn.title}
                                    </h4>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                      Course: {asn.courseTitle}
                                    </p>
                                  </div>
                                  <div className="sm:text-right sm:self-center">
                                    <div className="font-headline-md text-headline-md text-[#006e2d] font-bold">
                                      {asn.grade}/{asn.maxScore}
                                    </div>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                      {asn.grade >= 90 ? "Grade A" : "Passed"}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-[#eff4ff] flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2 text-[#0b1c30] font-label-sm text-label-sm font-medium">
                                    <span className="material-symbols-outlined text-[16px] text-[#006e2d]">
                                      forum
                                    </span>
                                    <span>
                                      Instructor Feedback ({asn.instructorName}
                                      ):
                                    </span>
                                  </div>
                                  <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                                    &ldquo;{asn.feedback}&rdquo;
                                  </p>
                                </div>

                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setRubricModalItem(asn)}
                                    className="px-3.5 py-1.5 rounded-lg bg-[#e5eeff] text-primary font-label-sm text-label-sm hover:bg-[#dce9ff] transition-colors font-medium"
                                  >
                                    View Rubric &amp; Feedback Details
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          const isSelected =
                            activeTargetAssignment?.id === asn.id;
                          return (
                            <div
                              key={asn.id}
                              className={`bg-white rounded-2xl p-5 shadow-sm border transition-shadow hover:shadow-md ${
                                isSelected
                                  ? "border-primary-container ring-2 ring-primary-container/10"
                                  : "border-[#e2e8f0]/60"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm font-medium ${
                                        asn.status === "Submitted"
                                          ? "bg-[#e5eeff] text-primary"
                                          : "bg-[#ffdcc3] text-[#934e00]"
                                      }`}
                                    >
                                      {asn.status === "Submitted"
                                        ? "Submitted for Review"
                                        : "Pending Submission"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#ffdad6] text-[#93000a] font-label-sm text-label-sm font-semibold">
                                      Due {asn.dueDate}
                                    </span>
                                  </div>
                                  <h4 className="font-headline-sm text-headline-sm text-[#0b1c30] pt-1">
                                    {asn.title}
                                  </h4>
                                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    Course: {asn.courseTitle}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAssignmentId(asn.id);
                                    document
                                      .getElementById("submit-assignment-card")
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      });
                                  }}
                                  className="sm:self-center px-4 py-2 rounded-xl bg-primary-container text-white font-label-md text-label-md shadow-sm hover:opacity-95 whitespace-nowrap"
                                >
                                  {asn.status === "Submitted"
                                    ? "Update Submission"
                                    : "Submit Now"}
                                </button>
                              </div>

                              <div className="p-3 rounded-xl bg-[#eff4ff] flex items-center justify-between gap-2 text-on-surface-variant font-body-sm text-body-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="material-symbols-outlined text-[18px] text-outline shrink-0">
                                    {asn.status === "Submitted"
                                      ? "folder_zip"
                                      : "description"}
                                  </span>
                                  <span className="truncate">
                                    {asn.status === "Submitted"
                                      ? `Uploaded: ${asn.submittedFileName}`
                                      : asn.instructions}
                                  </span>
                                </div>
                                <span className="font-label-sm text-label-sm text-primary font-medium shrink-0">
                                  {asn.maxScore} Pts
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right 5 Columns: Assignment Submission Card */}
                  <form
                    id="submit-assignment-card"
                    onSubmit={handleSubmitAssignmentClick}
                    className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]/60 lg:sticky lg:top-24"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#e5eeff] flex items-center justify-center text-primary-container">
                          <span className="material-symbols-outlined text-[18px]">
                            upload_file
                          </span>
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-[#0b1c30]">
                          Submit Assignment
                        </h3>
                      </div>
                      {activeTargetAssignment && (
                        <span className="px-2 py-0.5 rounded-md bg-[#ffdad6] text-[#93000a] font-label-sm text-label-sm">
                          #{activeTargetAssignment.courseId}
                        </span>
                      )}
                    </div>

                    {!activeTargetAssignment ? (
                      <div className="p-6 rounded-xl bg-[#eff4ff] text-center space-y-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[28px] text-primary">
                          lock
                        </span>
                        <p className="font-semibold text-[#0b1c30]">
                          No Active Assignment Selected
                        </p>
                        <p>
                          Enroll in a course from the catalog to unlock
                          assignment uploads.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                          Target:{" "}
                          <strong className="text-[#0b1c30]">
                            {activeTargetAssignment.title}
                          </strong>
                        </p>

                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDropFile}
                          className={`rounded-xl p-6 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2 mb-4 group border-2 border-dashed ${
                            isDragging
                              ? "bg-[#e5eeff] border-primary-container"
                              : "bg-[#eff4ff] hover:bg-[#e5eeff] border-[#c7c4d8]/60"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[26px]">
                              cloud_upload
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-label-md text-label-md text-[#0b1c30] font-semibold">
                              Drag &amp; drop files here
                            </p>
                            <p className="font-body-sm text-body-sm text-primary-container hover:underline font-medium">
                              or browse files from device
                            </p>
                          </div>
                          <span className="font-label-sm text-label-sm text-outline">
                            Supported: ZIP, PDF, DOCX (Max 50MB)
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip,.pdf,.docx"
                            onChange={(e) =>
                              handleFilePick(e.target.files?.[0])
                            }
                            className="hidden"
                          />
                        </div>

                        {stagedFile && (
                          <div className="mb-4 p-3.5 rounded-xl bg-[#eff4ff] flex items-center justify-between animate-fade-up">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary-container shadow-sm shrink-0">
                                <span className="material-symbols-outlined text-[20px]">
                                  folder_zip
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-label-md text-label-md text-[#0b1c30] truncate font-medium">
                                  {stagedFile.name}
                                </span>
                                <span className="font-body-sm text-body-sm text-[#006e2d] font-medium flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    check_circle
                                  </span>
                                  <span>
                                    {stagedFile.sizeLabel} • Ready to submit
                                  </span>
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStagedFile(null);
                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";
                              }}
                              title="Remove file"
                              className="p-1.5 text-outline hover:text-error transition-colors rounded-lg shrink-0"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          </div>
                        )}

                        <div className="space-y-1.5 mb-5">
                          <label
                            htmlFor="submission-notes"
                            className="block font-label-sm text-label-sm text-[#0b1c30] font-medium"
                          >
                            Student Notes for Instructor
                          </label>
                          <textarea
                            id="submission-notes"
                            rows="3"
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            placeholder="Include repository URL, test credentials, or comments for your instructor..."
                            className="w-full p-3 rounded-xl bg-[#f8f9ff] border border-outline-variant/40 font-body-md text-body-md text-[#0b1c30] placeholder:text-outline focus:outline-none focus:bg-white focus:border-primary-container transition-all resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingNow}
                          className="w-full py-3 rounded-xl bg-primary-container text-white font-label-lg text-label-lg shadow-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            send
                          </span>
                          <span>
                            {submittingNow
                              ? "Submitting Work..."
                              : "Submit Assignment Now"}
                          </span>
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>

              {/* =============================================================
                  EARNED CERTIFICATES & CREDENTIALS (ALL COMPLETED COURSES!)
                 ============================================================= */}
              <div id="student-certificates" className="pb-12 scroll-mt-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#934e00] text-[24px]">
                        workspace_premium
                      </span>
                      <h2 className="font-headline-md text-headline-md text-[#0b1c30]">
                        Earned Certificates &amp; Credentials (
                        {earnedCertificates.length})
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      All certificates earned from your completed courses are
                      permanently preserved here. Select any certificate below
                      to preview or download its PDF.
                    </p>
                  </div>
                </div>

                {earnedCertificates.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-[#e2e8f0]/80 space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-[#934e00]">
                      workspace_premium
                    </span>
                    <h3 className="font-headline-sm text-base font-bold text-[#0b1c30]">
                      No Certificates Unlocked Yet
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                      Complete a course&apos;s lessons or pass its quiz to
                      unlock your official verifiable PDF certificate.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* ALL EARNED CERTIFICATES GALLERY GRID (View & Download Any Certificate) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {earnedCertificates.map((cert, idx) => {
                        const isSelectedForPreview =
                          activeCertificateCourse?.courseId === cert.courseId;

                        return (
                          <div
                            key={cert.courseId}
                            onClick={() =>
                              setSelectedCertCourseId(cert.courseId)
                            }
                            className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                              isSelectedForPreview
                                ? "border-primary-container ring-2 ring-primary-container/15 shadow-md"
                                : "border-[#e2e8f0]/80 hover:border-primary/40 shadow-xs"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#934e00] font-label-sm text-[11px] font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined material-fill-1 text-[14px]">
                                    verified
                                  </span>
                                  Certificate #{idx + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-primary">
                                  {cert.certificateId}
                                </span>
                              </div>

                              <h3 className="font-headline-sm text-base font-bold text-[#0b1c30] line-clamp-2">
                                {cert.title}
                              </h3>

                              <div className="text-xs text-on-surface-variant space-y-1 pt-1 border-t border-slate-100">
                                <div className="flex justify-between">
                                  <span>Course ID:</span>
                                  <strong className="font-mono text-[#0b1c30]">
                                    #{cert.courseId}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Instructor:</span>
                                  <strong className="text-[#0b1c30]">
                                    {cert.instructorName}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Issued:</span>
                                  <span className="text-[#006e2d] font-semibold">
                                    {cert.completedDateLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className="grid grid-cols-2 gap-2 pt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCertCourseId(cert.courseId)
                                }
                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                                  isSelectedForPreview
                                    ? "bg-[#e5eeff] text-primary"
                                    : "bg-slate-100 text-slate-700 hover:bg-[#eff4ff]"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  visibility
                                </span>
                                <span>
                                  {isSelectedForPreview
                                    ? "Previewing"
                                    : "Preview"}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadSpecificCertificate(cert)
                                }
                                className="py-2 px-3 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  download
                                </span>
                                <span>Download PDF</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* FULL LANDSCAPE CERTIFICATE SHOWCASE FOR THE SELECTED CERTIFICATE */}
                    {activeCertificateCourse && (
                      <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-md border border-[#e2e8f0]/80 relative overflow-hidden">
                        <div className="relative bg-white rounded-2xl p-4 sm:p-8 flex flex-col justify-between border border-[#e5eeff]">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 text-center sm:text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm shrink-0">
                                <span className="material-symbols-outlined text-[28px]">
                                  school
                                </span>
                              </div>
                              <div className="text-left">
                                <div className="font-headline-sm text-headline-sm text-[#0b1c30] tracking-tight font-bold">
                                  NEXALEARN ACADEMY
                                </div>
                                <div className="font-label-sm text-label-sm text-outline tracking-widest uppercase">
                                  Verified Certificate of Completion
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffdcc3] text-[#934e00] shadow-xs">
                              <span className="material-symbols-outlined material-fill-1 text-[20px]">
                                verified
                              </span>
                              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                                Distinction Honor
                              </span>
                            </div>
                          </div>

                          <div className="text-center py-6 sm:py-8 space-y-4">
                            <span className="font-label-sm text-label-sm text-outline uppercase tracking-widest">
                              This credential is proudly awarded to
                            </span>
                            <h3 className="font-display text-display-mobile sm:text-display text-[#0b1c30] tracking-tight font-serif italic py-1">
                              {studentDisplayName}
                            </h3>
                            <p className="max-w-xl mx-auto font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                              for successfully mastering all rigorous academic
                              coursework, peer evaluations, and final portfolio
                              defense in
                            </p>
                            <div className="inline-block px-5 py-2 rounded-xl bg-[#e5eeff] text-primary font-headline-sm text-headline-sm">
                              {activeCertificateCourse.title}
                            </div>
                          </div>

                          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center sm:text-left">
                            <div className="space-y-1">
                              <span className="font-label-sm text-label-sm text-outline uppercase">
                                Issue Date
                              </span>
                              <div className="font-label-md text-label-md text-[#0b1c30] font-semibold">
                                {activeCertificateCourse.completedDateLabel}
                              </div>
                              <span className="font-label-sm text-label-sm text-outline">
                                Academic Term 2026
                              </span>
                            </div>

                            <div className="space-y-1 text-center">
                              <div className="font-display text-[1.5rem] text-primary italic font-serif leading-none select-none">
                                {activeCertificateCourse.instructorName ||
                                  "Alex Morgan"}
                              </div>
                              <div className="w-32 h-0.5 bg-outline-variant/60 mx-auto my-1"></div>
                              <span className="font-label-sm text-label-sm text-[#0b1c30] font-semibold block">
                                {activeCertificateCourse.instructorName ||
                                  "Alex Morgan"}
                              </span>
                              <span className="font-body-sm text-body-sm text-outline block">
                                Lead Course Instructor
                              </span>
                            </div>

                            <div className="space-y-1 sm:text-right">
                              <span className="font-label-sm text-label-sm text-outline uppercase">
                                Credential ID
                              </span>
                              <div className="text-label-md text-primary font-mono font-bold">
                                {activeCertificateCourse.certificateId}
                              </div>
                              <span className="font-label-sm text-label-sm text-[#006e2d] font-semibold flex items-center justify-center sm:justify-end gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  check_circle
                                </span>
                                <span>Permanent Academic Record</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-4">
                          <span className="font-label-sm text-label-sm text-primary flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined text-[16px]">
                              verified_user
                            </span>
                            <span>
                              Previewing:{" "}
                              <strong>{activeCertificateCourse.title}</strong> (
                              {activeCertificateCourse.certificateId})
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadSpecificCertificate(
                                activeCertificateCourse
                              )
                            }
                            className="px-5 py-2.5 rounded-xl bg-primary-container text-white font-label-md text-label-md shadow-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              download
                            </span>
                            <span>
                              Download PDF ({activeCertificateCourse.courseId})
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE PERSISTENT BOTTOM NAVIGATION BAR (<768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-outline-variant/30 z-40 grid grid-cols-5 items-center px-1 select-none">
        {menuItems.slice(0, 5).map((item) => {
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMenuNavigation(item)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
                isActive ? "text-primary-container font-bold" : "text-outline"
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