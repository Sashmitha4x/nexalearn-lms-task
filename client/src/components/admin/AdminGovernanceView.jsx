import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import NexaSelect from "../ui/NexaSelect.jsx";
import {
  exportAdminLedgerPDF,
  exportAdminLedgerExcel,
  exportAdminLedgerCSV,
} from "../../services/nexaService.js";

const formatLocalAuditTimestamp = (isoString) => {
  const d = new Date(isoString || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  const tzShort =
    Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(d)
      .find((part) => part.type === "timeZoneName")?.value || "LOCAL";
  return `${year}-${month}-${day} ${hours}:${mins}:${secs} ${tzShort}`;
};

export default function AdminGovernanceView({
  user,
  serverHealth,
  courses = [],
  platformUsers = [],
  auditLogs = [],
  onModerateCourse,
  onToggleUserStatus,
  onDeleteUser,
  onOpenPublicCatalog,
  onLogout,
  onShowToast,
}) {
  const adminDisplayName = user?.name || "Sashmitha N.";
  const adminEmail = user?.email || "admin@nexalearn.io";
  const isServerOnline = Boolean(serverHealth?.serverOnline);

  const [activeSidebarItem, setActiveSidebarItem] = useState("moderation");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Active courses in the Admin Moderation Table (excludes courses already marked "Removed")
  const govCourses = useMemo(
    () => courses.filter((c) => c.status !== "Removed"),
    [courses]
  );

  // Cross-check user roles against course authors so instructors never appear as students
  const govUsers = useMemo(() => {
    const courseAuthorEmails = new Set(
      courses
        .map((c) => (c.instructorEmail || "").toLowerCase().trim())
        .filter(Boolean)
    );
    return platformUsers
      .filter((u) => u.role !== "admin")
      .map((u) => {
        const emailKey = (u.email || "").toLowerCase().trim();
        const isAuthor = courseAuthorEmails.has(emailKey);
        const resolvedRole =
          u.role === "instructor" || isAuthor ? "instructor" : "student";
        return {
          ...u,
          role: resolvedRole,
          activitySummary:
            resolvedRole === "instructor" &&
            u.activitySummary?.includes("Learner")
              ? "Verified Instructor"
              : u.activitySummary,
        };
      });
  }, [platformUsers, courses]);

  const ledgerLogs = auditLogs;

  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState("ALL");

  // ===========================================================================
  // DYNAMIC LISTS FOR HIDE FORM & RESOLUTION/UNHIDE DROPDOWN
  // ===========================================================================
  const publishedCourses = useMemo(
    () => govCourses.filter((c) => c.status === "Published"),
    [govCourses]
  );
  const awaitingReApprovalCourses = useMemo(
    () => govCourses.filter((c) => c.status === "Pending Review"),
    [govCourses]
  );
  const hiddenCourses = useMemo(
    () => govCourses.filter((c) => c.status === "Hidden"),
    [govCourses]
  );
  const pausedCoursesCount = useMemo(
    () => govCourses.filter((c) => c.status === "Paused").length,
    [govCourses]
  );

  // Prioritize "Pending Review" (where instructor submitted verification note) first in the dropdown
  const hiddenOrPendingCourses = useMemo(
    () => [
      ...govCourses.filter((c) => c.status === "Pending Review"),
      ...govCourses.filter((c) => c.status === "Hidden"),
    ],
    [govCourses]
  );

  const moderationQueueCount = hiddenOrPendingCourses.length;

  // Card 1: "Hide This Course?" Target Selection
  const [selectedCourseIdToHide, setSelectedCourseIdToHide] = useState(
    () => publishedCourses[0]?.courseId || govCourses[0]?.courseId || ""
  );
  const targetCourseToHide = useMemo(() => {
    return (
      govCourses.find((c) => c.courseId === selectedCourseIdToHide) ||
      publishedCourses[0] ||
      govCourses[0] ||
      null
    );
  }, [govCourses, publishedCourses, selectedCourseIdToHide]);

  const [hideReasonCategory, setHideReasonCategory] = useState(
    "Incomplete Syllabus / Assessments"
  );
  const [hideFeedbackText, setHideFeedbackText] = useState(
    "Missing quiz grading rubric in Module 1."
  );

  // Card 2: "Moderation Resolution & Unhide" Dropdown Selection
  const [selectedHiddenCourseId, setSelectedHiddenCourseId] = useState(
    () => hiddenOrPendingCourses[0]?.courseId || ""
  );

  useEffect(() => {
    if (hiddenOrPendingCourses.length === 0) {
      setSelectedHiddenCourseId("");
    } else if (
      !hiddenOrPendingCourses.some(
        (c) => c.courseId === selectedHiddenCourseId
      )
    ) {
      setSelectedHiddenCourseId(hiddenOrPendingCourses[0].courseId);
    }
  }, [hiddenOrPendingCourses, selectedHiddenCourseId]);

  const activeResolutionCourse = useMemo(() => {
    if (hiddenOrPendingCourses.length === 0) return null;
    return (
      hiddenOrPendingCourses.find(
        (c) => c.courseId === selectedHiddenCourseId
      ) || hiddenOrPendingCourses[0]
    );
  }, [hiddenOrPendingCourses, selectedHiddenCourseId]);

  // User Governance Filter State
  const [userSearch, setUserSearch] = useState("");
  const [userTabFilter, setUserTabFilter] = useState("ALL");

  // Audit Ledger Filter State
  const [ledgerFilterAction, setLedgerFilterAction] = useState("ALL");

  // Modals 1 & 2: Inspect Course & Inspect User Dossier
  const [inspectedCourse, setInspectedCourse] = useState(null);
  const [inspectedUser, setInspectedUser] = useState(null);

  // Modal 3: Admin Course Deletion Confirmation (Yes / No + Reason sent to Instructor)
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleteCourseReasonCategory, setDeleteCourseReasonCategory] = useState(
    "Policy / Academic Integrity Violation"
  );
  const [deleteCourseReasonNote, setDeleteCourseReasonNote] = useState(
    "This course violated platform academic standards and has been permanently removed from the catalog."
  );

  // Modal 4: Admin User Account Deletion Confirmation (Yes / No for Student or Instructor)
  const [userToDelete, setUserToDelete] = useState(null);

  // ===========================================================================
  // 100% REAL DYNAMIC METRICS
  // ===========================================================================
  const totalStudentsCount = useMemo(
    () => govUsers.filter((u) => u.role === "student").length,
    [govUsers]
  );
  const totalInstructorsCount = useMemo(
    () => govUsers.filter((u) => u.role === "instructor").length,
    [govUsers]
  );
  const activeUsersCount = useMemo(
    () => govUsers.filter((u) => u.status === "Active").length,
    [govUsers]
  );
  const suspendedUsersCount = useMemo(
    () => govUsers.filter((u) => u.status === "Suspended").length,
    [govUsers]
  );

  const publishedCoursesCount = publishedCourses.length;
  const publishedRatioPercent =
    govCourses.length > 0
      ? Math.round((publishedCoursesCount / govCourses.length) * 100)
      : 100;

  // Dynamic Category Breakdown for Donut Chart
  const categoryBreakdown = useMemo(() => {
    const total = Math.max(1, govCourses.length);
    const countCat = (cat) =>
      govCourses.filter((c) => c.category === cat).length;
    return {
      seCount: countCat("Software Engineering"),
      sePct: Math.round((countCat("Software Engineering") / total) * 100),
      aiCount: countCat("AI & Data Science"),
      aiPct: Math.round((countCat("AI & Data Science") / total) * 100),
      cloudCount: countCat("Cloud & DevOps"),
      cloudPct: Math.round((countCat("Cloud & DevOps") / total) * 100),
      uxCount: countCat("UI/UX Design"),
      uxPct: Math.round((countCat("UI/UX Design") / total) * 100),
    };
  }, [govCourses]);

  // Filtered Courses for Moderation Table
  const filteredGovCourses = useMemo(() => {
    const q = (courseSearch || globalSearch).toLowerCase().trim();
    return govCourses.filter((c) => {
      if (courseStatusFilter !== "ALL" && c.status !== courseStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.courseId.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.instructorName || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q)
      );
    });
  }, [govCourses, courseSearch, globalSearch, courseStatusFilter]);

  // Filtered Users for User Governance Table
  const filteredGovUsers = useMemo(() => {
    const q = (userSearch || globalSearch).toLowerCase().trim();
    return govUsers.filter((u) => {
      if (userTabFilter === "student" && u.role !== "student") return false;
      if (userTabFilter === "instructor" && u.role !== "instructor")
        return false;
      if (userTabFilter === "Active" && u.status !== "Active") return false;
      if (userTabFilter === "Suspended" && u.status !== "Suspended")
        return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [govUsers, userSearch, globalSearch, userTabFilter]);

  // Filtered Audit Ledger Logs
  const filteredLedgerLogs = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    return ledgerLogs.filter((l) => {
      if (ledgerFilterAction !== "ALL" && l.action !== ledgerFilterAction) {
        return false;
      }
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    });
  }, [ledgerLogs, ledgerFilterAction, globalSearch]);

  const handleSelectCourseForHideForm = (course) => {
    setSelectedCourseIdToHide(course.courseId);
    setHideReasonCategory("Incomplete Syllabus / Assessments");
    setHideFeedbackText(
      course.moderationReason || "Missing quiz grading rubric in Module 1."
    );
    document
      .getElementById("governance-hide-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleConfirmHideCourse = async () => {
    if (!targetCourseToHide) return;
    if (!hideFeedbackText.trim()) {
      onShowToast(
        "Audit Feedback Required",
        "Please enter specific instructional feedback for the instructor.",
        true
      );
      return;
    }

    const targetId = targetCourseToHide.courseId;
    if (onModerateCourse) {
      await onModerateCourse(targetId, {
        status: "Hidden",
        reason: `${hideReasonCategory}: ${hideFeedbackText.trim()}`,
      });
    }
    setSelectedHiddenCourseId(targetId);

    onShowToast(
      `Course #${targetId} Hidden`,
      `Removed from public catalog and sent audit feedback to ${targetCourseToHide.instructorName}.`
    );
  };

  const handleApproveAndUnhideCourse = async (course) => {
    if (!course) return;
    const targetId = course.courseId;
    if (onModerateCourse) {
      await onModerateCourse(targetId, {
        status: "Published",
        reason: course.instructorResolutionNote
          ? `Verified Instructor Resolution: "${course.instructorResolutionNote}"`
          : "Approved and unhidden by Platform Admin",
      });
    }
    onShowToast(
      `Course #${targetId} Approved & Unhidden!`,
      `"${course.title}" is now Published on the public catalog.`
    );
  };

  // Opens the Yes/No + Reason confirmation modal before deleting a course
  const handleDeleteCourseRow = (course) => {
    setCourseToDelete(course);
    setDeleteCourseReasonCategory("Policy / Academic Integrity Violation");
    setDeleteCourseReasonNote(
      "This course violated platform academic standards and has been permanently removed from the catalog."
    );
  };

  // Confirms course deletion and sends the deletion reason to the Instructor Studio
  const handleConfirmDeleteCourse = async (e) => {
    e.preventDefault();
    if (!courseToDelete) return;
    const targetId = courseToDelete.courseId;
    const fullReason = `${deleteCourseReasonCategory}: ${
      deleteCourseReasonNote.trim() || "Deleted by Platform Administrator."
    }`;

    if (onModerateCourse) {
      await onModerateCourse(targetId, {
        status: "Removed",
        reason: fullReason,
      });
    }
    setCourseToDelete(null);
    onShowToast(
      `Course #${targetId} Deleted`,
      `"${courseToDelete.title}" removed from catalog. Deletion reason sent to ${courseToDelete.instructorName}.`,
      true
    );
  };

  const handleToggleUserStatusClick = async (targetUser) => {
    const nextStatus =
      targetUser.status === "Suspended" ? "Active" : "Suspended";

    if (onToggleUserStatus) {
      await onToggleUserStatus(targetUser.id || targetUser.email, {
        status: nextStatus,
        reason:
          nextStatus === "Suspended"
            ? "Admin session security suspension"
            : "Account privileges restored",
      });
    }

    onShowToast(
      nextStatus === "Suspended"
        ? `Suspended: ${targetUser.name}`
        : `Reactivated: ${targetUser.name}`,
      nextStatus === "Suspended"
        ? "All active JWT tokens for this user have been invalidated."
        : "User account access restored.",
      nextStatus === "Suspended"
    );
  };

  // Confirms permanent deletion of a Student or Instructor account
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (onDeleteUser) {
      await onDeleteUser(
        userToDelete,
        `Account (${userToDelete.role}) permanently deleted by Platform Admin`
      );
    }
    onShowToast(
      `Account Deleted: ${userToDelete.name}`,
      `${userToDelete.email} (${userToDelete.role.toUpperCase()}) has been permanently removed.`,
      true
    );
    setUserToDelete(null);
  };

  const handleSidebarNavigation = (id, hash) => {
    setActiveSidebarItem(id);
    setMobileMenuOpen(false);
    if (id === "students") setUserTabFilter("student");
    if (id === "instructors") setUserTabFilter("instructor");
    if (hash) {
      document
        .querySelector(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* ===================================================================
          MODAL 1: INSPECT COURSE SYLLABUS & MODERATION DOSSIER
         =================================================================== */}
      {inspectedCourse &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectedCourse(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 animate-pop-in"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-[#4F46E5]">
                    #{inspectedCourse.courseId} • {inspectedCourse.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#0F172A] mt-0.5">
                    {inspectedCourse.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instructor: {inspectedCourse.instructorName} (
                    {inspectedCourse.instructorEmail})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedCourse(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Modules
                  </span>
                  <span className="font-bold text-sm text-[#0F172A]">
                    {inspectedCourse.modules?.length || 2} Modules
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Quiz Qs
                  </span>
                  <span className="font-bold text-sm text-[#0F172A]">
                    {inspectedCourse.quiz?.questions?.length || 3} Questions
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Visibility
                  </span>
                  <span className="font-bold text-sm text-[#4F46E5]">
                    {inspectedCourse.status === "Pending Review"
                      ? "Resolution Submitted"
                      : inspectedCourse.status}
                  </span>
                </div>
              </div>

              {inspectedCourse.moderationReason && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>Admin Hide Reason:</strong>{" "}
                  {inspectedCourse.moderationReason}
                </div>
              )}

              {inspectedCourse.instructorResolutionNote && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                  <strong>✓ Instructor Verification Note:</strong> &ldquo;
                  {inspectedCourse.instructorResolutionNote}&rdquo;
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                {(inspectedCourse.status === "Hidden" ||
                  inspectedCourse.status === "Pending Review") && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveAndUnhideCourse(inspectedCourse);
                      setInspectedCourse(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-bold"
                  >
                    Approve &amp; Unhide
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedCourse;
                    setInspectedCourse(null);
                    handleDeleteCourseRow(target);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-50 text-[#DC2626] border border-red-200 text-xs font-bold"
                >
                  Delete Course
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedCourse(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MODAL 2: INSPECT USER DOSSIER MODAL
         =================================================================== */}
      {inspectedUser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectedUser(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 animate-pop-in"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  {inspectedUser.avatar ? (
                    <img
                      src={inspectedUser.avatar}
                      alt={inspectedUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#4F46E5] font-bold flex items-center justify-center text-sm">
                      {inspectedUser.initials}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {inspectedUser.name}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">
                      {inspectedUser.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedUser(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Role Classification:</span>
                  <span className="font-bold uppercase text-[#4F46E5]">
                    {inspectedUser.role}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Joined Date:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {inspectedUser.joinedDate}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Account Status:</span>
                  <span
                    className={`font-bold ${
                      inspectedUser.status === "Suspended"
                        ? "text-[#DC2626]"
                        : "text-[#16A34A]"
                    }`}
                  >
                    {inspectedUser.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleUserStatusClick(inspectedUser);
                    setInspectedUser(null);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white ${
                    inspectedUser.status === "Suspended"
                      ? "bg-[#16A34A]"
                      : "bg-[#D97706]"
                  }`}
                >
                  {inspectedUser.status === "Suspended"
                    ? "Reactivate"
                    : "Suspend"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedUser;
                    setInspectedUser(null);
                    setUserToDelete(target);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
                >
                  Delete Account
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedUser(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MODAL 3: ADMIN DELETE COURSE CONFIRMATION MODAL (YES / NO + REASON)
         =================================================================== */}
      {courseToDelete &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[130] bg-[#0F172A]/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCourseToDelete(null)}
          >
            <form
              onSubmit={handleConfirmDeleteCourse}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-red-200 space-y-4 animate-pop-in"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-[#DC2626] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      delete_forever
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                      Confirm Course Deletion
                    </span>
                    <h3 className="text-base font-extrabold text-[#0F172A]">
                      Are you sure you want to delete #{courseToDelete.courseId}
                      ?
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCourseToDelete(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-[#0F172A]">
                  {courseToDelete.title}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Instructor: {courseToDelete.instructorName} (
                  {courseToDelete.instructorEmail})
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for Deletion (Sent to Instructor){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <NexaSelect
                  size="sm"
                  icon="gavel"
                  value={deleteCourseReasonCategory}
                  onChange={setDeleteCourseReasonCategory}
                  options={[
                    "Policy / Academic Integrity Violation",
                    "Copyright / Plagiarism Infringement",
                    "Unresolved Moderation Issues",
                    "Duplicate or Obsolete Curriculum",
                    "Other Governance Reason",
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Detailed Explanation for Instructor{" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={deleteCourseReasonNote}
                  onChange={(e) => setDeleteCourseReasonNote(e.target.value)}
                  placeholder="Explain why this course is being deleted so the instructor is notified..."
                  className="w-full text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg p-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCourseToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                  <span>Yes, Delete Course</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MODAL 4: ADMIN DELETE USER ACCOUNT CONFIRMATION MODAL (YES / NO)
         =================================================================== */}
      {userToDelete &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[130] bg-[#0F172A]/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setUserToDelete(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-red-200 space-y-4 animate-pop-in"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-[#DC2626] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">
                    person_remove
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                    Confirm Account Deletion
                  </span>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    Are you sure you want to delete this account?
                  </h3>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] text-sm">
                    {userToDelete.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-[#4F46E5]">
                    {userToDelete.role}
                  </span>
                </div>
                <p className="font-mono text-slate-500">{userToDelete.email}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Deleting this {userToDelete.role} account permanently removes
                their credentials from MongoDB and revokes all platform access.
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete_forever
                  </span>
                  <span>Yes, Delete Account</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          LEFT SIDEBAR (256px Desktop / Slide-Down Drawer Responsive)
         =================================================================== */}
      <aside className="w-full lg:w-64 lg:min-w-[256px] lg:max-w-[256px] bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen z-30">
        <div className="h-[72px] px-6 flex items-center justify-between border-b border-[#E2E8F0]">
          <button
            type="button"
            onClick={onOpenPublicCatalog}
            className="flex items-center space-x-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-indigo-100 font-bold text-lg shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                menu_book
              </span>
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-[#0F172A] leading-tight block">
                NexaLearn
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                Admin Console
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Admin Menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        <nav
          className={`flex-1 px-3 py-4 space-y-1 overflow-y-auto ${
            mobileMenuOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Governance &amp; Core
          </div>

          {[
            {
              id: "dashboard",
              label: "Dashboard",
              icon: "home",
              hash: "#admin-top",
            },
            {
              id: "moderation",
              label: "Course Moderation",
              icon: "verified_user",
              badge: moderationQueueCount,
              hash: "#moderation",
            },
            {
              id: "students",
              label: `Students (${totalStudentsCount})`,
              icon: "group",
              hash: "#users",
            },
            {
              id: "instructors",
              label: `Instructors (${totalInstructorsCount})`,
              icon: "record_voice_over",
              hash: "#users",
            },
            {
              id: "courses",
              label: `All Courses (${govCourses.length})`,
              icon: "inventory_2",
              hash: "#moderation",
            },
            {
              id: "analytics",
              label: "Analytics",
              icon: "bar_chart",
              hash: "#analytics-charts",
            },
            {
              id: "audit-ledger",
              label: `Audit Ledger (${ledgerLogs.length})`,
              icon: "history",
              hash: "#audit-ledger",
            },
          ].map((item) => {
            const active = activeSidebarItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSidebarNavigation(item.id, item.hash)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  active
                    ? "bg-[#EEF2FF] text-[#4F46E5] shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] mr-3 ${
                    active ? "text-[#4F46E5]" : "text-slate-400"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#D97706]/10 text-[#D97706]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 pb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            System
          </div>

          <button
            type="button"
            onClick={onOpenPublicCatalog}
            className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] mr-3 text-slate-400">
              public
            </span>
            <span>Public Catalog</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg text-[#DC2626] hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] mr-3 text-[#DC2626]">
              logout
            </span>
            <span>Logout</span>
          </button>
        </nav>

        {/* DYNAMIC SIDEBAR CLUSTER STATUS */}
        <div className="hidden lg:block p-4 border-t border-[#E2E8F0] bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isServerOnline
                    ? "bg-[#16A34A] animate-pulse"
                    : "bg-[#DC2626]"
                }`}
              ></div>
              {isServerOnline && (
                <div className="absolute -inset-0.5 rounded-full bg-[#16A34A]/30 animate-ping"></div>
              )}
            </div>
            <div>
              <p
                className={`text-xs font-semibold ${
                  isServerOnline ? "text-slate-800" : "text-[#DC2626]"
                }`}
              >
                {isServerOnline
                  ? `Cluster: Active (${serverHealth?.cluster || "Connected"})`
                  : "Cluster: Offline (Server Stopped)"}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {isServerOnline
                  ? "Real-Time API Synced"
                  : "Local Browser Storage Mode"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===================================================================
          MAIN BODY CONTENT AREA
         =================================================================== */}
      <div id="admin-top" className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER (72px Sticky) */}
        <header className="h-[72px] bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-4 sm:space-x-6 flex-1 max-w-2xl">
            <div className="hidden sm:flex items-center text-sm font-medium text-slate-500 space-x-2 shrink-0">
              <span>Admin</span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                chevron_right
              </span>
              <span className="text-[#0F172A] font-semibold">
                Platform Governance
              </span>
            </div>

            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </div>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search courses, instructors, users, audit logs..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-slate-800 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-4 ml-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("moderation")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Moderation Alerts"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {moderationQueueCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97706]"></span>
                </span>
              )}
            </button>

            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setExportDropdownOpen((p) => !p)}
                className="inline-flex items-center justify-center px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[17px] mr-1.5 text-slate-500">
                  download
                </span>
                <span className="hidden xs:inline">Export Ledger</span>
                <span className="material-symbols-outlined text-[16px] ml-1 text-slate-400">
                  expand_more
                </span>
              </button>

              {exportDropdownOpen && (
                <div
                  onMouseLeave={() => setExportDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#E2E8F0] shadow-lg py-1.5 z-40 animate-pop-in"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExportDropdownOpen(false);
                      exportAdminLedgerPDF(ledgerLogs, govCourses);
                      onShowToast(
                        "Governance PDF Generated",
                        "Printable platform audit ledger opened."
                      );
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2.5"></span>
                    Export as PDF (.pdf)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportDropdownOpen(false);
                      exportAdminLedgerExcel(ledgerLogs);
                      onShowToast(
                        "Excel Ledger Downloaded",
                        "NexaLearn_Governance_Audit_Ledger.xls saved."
                      );
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2.5"></span>
                    Export as Excel (.xls)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportDropdownOpen(false);
                      exportAdminLedgerCSV(ledgerLogs);
                      onShowToast(
                        "CSV Ledger Downloaded",
                        "NexaLearn_Governance_Audit_Ledger.csv saved."
                      );
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-[#4F46E5] text-left"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2.5"></span>
                    Export as CSV (.csv)
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0F172A] to-[#334155] border border-slate-200 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  SN
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    isServerOnline ? "bg-[#16A34A]" : "bg-[#DC2626]"
                  }`}
                ></span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-[#0F172A]">
                  {adminDisplayName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {adminEmail}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1440px] w-full mx-auto animate-fade-up">
          {/* SECTION 1: HEADER TITLE BANNER WITH LIVE GATEWAY STATUS */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Platform Governance &amp; Moderation
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Real-time supervision of instructional catalog compliance, user
                account status, and cryptographic audit records.
              </p>
            </div>
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {isServerOnline ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mr-1.5 animate-pulse"></span>
                  Live Gateway Connected
                  {serverHealth?.latency ? ` (${serverHealth.latency}ms)` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-[#DC2626] border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mr-1.5"></span>
                  Server Disconnected (Offline Mode)
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                Checked:{" "}
                {serverHealth?.lastSync || new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* SECTION 2: 4 KPI CARDS (SOFT TRANSLUCENT CORNER GLOW) */}
          <section id="analytics-charts" className="space-y-6 scroll-mt-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-md group-hover:scale-110 transition-transform z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Students
                    </span>
                    <span className="p-2 bg-indigo-50 text-[#4F46E5] rounded-xl">
                      <span className="material-symbols-outlined text-[20px]">
                        group
                      </span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                      {totalStudentsCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50/90 text-xs font-bold text-[#16A34A]">
                      {
                        govUsers.filter(
                          (u) => u.role === "student" && u.status === "Active"
                        ).length
                      }{" "}
                      Active
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Registered student learner accounts
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 bg-teal-500/10 rounded-full blur-md group-hover:scale-110 transition-transform z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Instructors
                    </span>
                    <span className="p-2 bg-teal-50 text-[#14B8A6] rounded-xl">
                      <span className="material-symbols-outlined text-[20px]">
                        record_voice_over
                      </span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                      {totalInstructorsCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50/90 text-xs font-bold text-[#16A34A]">
                      Verified Faculty
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Authoring {govCourses.length} total courses
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-md group-hover:scale-110 transition-transform z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active Courses
                    </span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <span className="material-symbols-outlined text-[20px]">
                        menu_book
                      </span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                      {publishedCoursesCount}{" "}
                      <span className="text-sm font-semibold text-slate-400">
                        / {govCourses.length}
                      </span>
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/90 text-xs font-bold text-slate-600">
                      {publishedRatioPercent}% Published
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Live in public course catalog
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl border-2 border-[#D97706]/30 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
                      Moderation Queue
                    </span>
                    <span className="p-2 bg-amber-100 text-[#D97706] rounded-xl">
                      <span className="material-symbols-outlined text-[20px]">
                        warning
                      </span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#D97706] tracking-tight">
                      {moderationQueueCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#D97706] text-white">
                      {moderationQueueCount > 0 ? "Action Req." : "All Clear"}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-[#D97706]">
                    {moderationQueueCount} Awaiting Review (
                    {hiddenCourses.length} Hidden,{" "}
                    {awaitingReApprovalCourses.length} Resubmitted)
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Clean Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Platform Activity &amp; Catalog Growth
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tracking {govCourses.length} courses and {govUsers.length}{" "}
                      registered accounts
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center text-xs font-semibold text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-[#4F46E5] mr-1.5"></span>
                      2026 Activity
                    </span>
                  </div>
                </div>

                <div className="py-4">
                  <svg
                    viewBox="0 0 640 220"
                    className="w-full h-48 sm:h-56 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="indigoGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4F46E5"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#4F46E5"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 50 160 Q 150 145 220 120 T 360 85 T 480 60 T 610 35 L 610 195 L 50 195 Z"
                      fill="url(#indigoGradient)"
                    />
                    <path
                      d="M 50 160 Q 150 145 220 120 T 360 85 T 480 60 T 610 35"
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="610"
                      cy="35"
                      r="5"
                      fill="#4F46E5"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    <g transform="translate(540, 6)">
                      <rect
                        x="0"
                        y="0"
                        width="86"
                        height="22"
                        rx="4"
                        fill="#0F172A"
                      />
                      <text
                        x="43"
                        y="15"
                        fill="#FFFFFF"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {govCourses.length} Courses
                      </text>
                    </g>
                  </svg>

                  <div className="flex justify-between pl-4 pr-2 pt-2 text-[11px] sm:text-xs font-semibold text-slate-500">
                    <span>Term Start</span>
                    <span>Q1 2026</span>
                    <span>Q2 2026</span>
                    <span>Q3 2026</span>
                    <span className="text-[#4F46E5] font-bold">
                      Current ({govUsers.length} Users)
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Courses by Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Catalog distribution ({govCourses.length} Total)
                  </p>
                </div>

                <div className="relative py-4 flex items-center justify-center">
                  <svg
                    viewBox="0 0 160 160"
                    className="w-44 h-44 -rotate-90 transform"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#F1F5F9"
                      strokeWidth="20"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#4F46E5"
                      strokeWidth="20"
                      fill="transparent"
                      strokeDasharray={`${Math.round(
                        (categoryBreakdown.sePct / 100) * 377
                      )} 377`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#14B8A6"
                      strokeWidth="20"
                      fill="transparent"
                      strokeDasharray={`${Math.round(
                        (categoryBreakdown.aiPct / 100) * 377
                      )} 377`}
                      strokeDashoffset={`-${Math.round(
                        (categoryBreakdown.sePct / 100) * 377
                      )}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-[#0F172A]">
                      {govCourses.length}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Courses
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]"></span>
                    <span className="text-slate-600 font-medium">
                      Software ({categoryBreakdown.seCount})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]"></span>
                    <span className="text-slate-600 font-medium">
                      AI &amp; Data ({categoryBreakdown.aiCount})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
                    <span className="text-slate-600 font-medium">
                      Cloud ({categoryBreakdown.cloudCount})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
                    <span className="text-slate-600 font-medium">
                      UI/UX ({categoryBreakdown.uxCount})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 3: COURSE MODERATION TABLE & HIDE / APPROVE WORKFLOW
             ================================================================= */}
          <section id="moderation" className="space-y-4 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] flex items-center flex-wrap gap-2">
                  <span>Course Moderation &amp; Quality Enforcement</span>
                  {moderationQueueCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-[#D97706] border border-amber-200">
                      {moderationQueueCount} Active Review(s)
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  Audit instructional syllabus standards, manage course public
                  visibility, and review instructor verification notes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT 8 COLUMNS: COURSE MODERATION TABLE (ZERO BUTTON CLIPPING!) */}
              <div className="lg:col-span-8 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] space-y-3 bg-slate-50/40">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">
                          search
                        </span>
                      </span>
                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="Search course name, instructor, or #CRS ID..."
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold shrink-0">
                      <span>
                        Showing {filteredGovCourses.length} of{" "}
                        {govCourses.length}
                      </span>
                    </div>
                  </div>

                  {/* Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { id: "ALL", label: `All (${govCourses.length})` },
                      {
                        id: "Published",
                        label: `Published (${publishedCoursesCount})`,
                      },
                      {
                        id: "Pending Review",
                        label: `🔔 Verification Received (${awaitingReApprovalCourses.length})`,
                      },
                      {
                        id: "Hidden",
                        label: `Hidden (${hiddenCourses.length})`,
                      },
                      {
                        id: "Paused",
                        label: `Paused (${pausedCoursesCount})`,
                      },
                    ].map((pill) => {
                      const active = courseStatusFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setCourseStatusFilter(pill.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            active
                              ? "bg-slate-800 text-white shadow-xs"
                              : pill.id === "Pending Review"
                              ? "bg-[#EEF2FF] border border-indigo-200 text-[#4F46E5] font-bold"
                              : pill.id === "Hidden"
                              ? "bg-amber-50 border border-amber-200 text-[#D97706]"
                              : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MOBILE CARD LIST (<768px) */}
                <div className="md:hidden divide-y divide-[#E2E8F0]">
                  {filteredGovCourses.map((course) => {
                    const isPublished = course.status === "Published";
                    const isHidden = course.status === "Hidden";
                    const isPending = course.status === "Pending Review";

                    return (
                      <div
                        key={course.courseId}
                        className={`p-4 space-y-3 ${
                          isHidden
                            ? "bg-amber-50/30 border-l-4 border-l-[#D97706]"
                            : isPending
                            ? "bg-indigo-50/30 border-l-4 border-l-[#4F46E5]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#4F46E5]">
                            #{course.courseId}
                          </span>
                          {isPublished ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                              Published
                            </span>
                          ) : isHidden ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-[#D97706] border border-amber-300">
                              Hidden
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200">
                              Verification Received
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-[#0F172A]">
                            {course.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Instructor: {course.instructorName} •{" "}
                            {course.enrolledCount || 0} Enrolled
                          </p>
                          {(isHidden || isPending) &&
                            course.moderationReason && (
                              <p className="mt-1.5 px-2 py-1 rounded bg-red-50 text-[#DC2626] text-[11px] font-semibold border border-red-200">
                                Admin Reason: {course.moderationReason}
                              </p>
                            )}
                          {course.instructorResolutionNote && (
                            <p className="mt-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-300">
                              ✓ Instructor Verification Note: &ldquo;
                              {course.instructorResolutionNote}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setInspectedCourse(course)}
                            className="h-8 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center justify-center"
                          >
                            View
                          </button>
                          {isPending || isHidden ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleApproveAndUnhideCourse(course)
                              }
                              className="h-8 rounded-lg bg-[#16A34A] text-white font-bold text-xs flex items-center justify-center shadow-xs"
                            >
                              Unhide
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectCourseForHideForm(course)
                              }
                              className="h-8 rounded-lg border border-amber-200 bg-amber-50 text-[#D97706] font-semibold text-xs flex items-center justify-center"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCourseRow(course)}
                            className="h-8 rounded-lg border border-red-200 bg-red-50/50 text-[#DC2626] font-semibold text-xs flex items-center justify-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP TABLE (md+) — Zero Horizontal Scrollbar & Zero Clipping on Delete Button */}
                <div className="hidden md:block w-full">
                  <table className="w-full table-fixed text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 pl-4 pr-2 w-[13%]">Course ID</th>
                        <th className="py-3 px-2.5 w-[29%]">
                          Course Title &amp; Verification Note
                        </th>
                        <th className="py-3 px-2.5 w-[17%]">Instructor</th>
                        <th className="py-3 px-1.5 w-[8%] text-center">
                          Enrolled
                        </th>
                        <th className="py-3 px-2 w-[12%]">Status</th>
                        <th className="py-3 pl-2 pr-4 w-[21%] text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {filteredGovCourses.map((course) => {
                        const isPublished = course.status === "Published";
                        const isHidden = course.status === "Hidden";
                        const isPending = course.status === "Pending Review";

                        return (
                          <tr
                            key={course.courseId}
                            className={`transition-colors ${
                              isHidden
                                ? "bg-amber-50/20 hover:bg-amber-50/40 border-l-4 border-l-[#D97706]"
                                : isPending
                                ? "bg-indigo-50/30 hover:bg-indigo-50/50 border-l-4 border-l-[#4F46E5]"
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td
                              className={`py-3.5 pl-4 pr-2 font-mono text-[11px] font-bold whitespace-nowrap ${
                                isHidden
                                  ? "text-[#D97706]"
                                  : isPending
                                  ? "text-[#4F46E5]"
                                  : "text-slate-600 font-medium"
                              }`}
                            >
                              #{course.courseId}
                            </td>

                            <td className="py-3.5 px-2.5">
                              <div className="font-bold text-[#0F172A] text-xs sm:text-sm leading-snug line-clamp-1">
                                {course.title}
                              </div>
                              {(isHidden || isPending) &&
                                course.moderationReason && (
                                  <div className="mt-1 px-1.5 py-0.5 rounded bg-red-50 text-[#DC2626] text-[10px] font-semibold border border-red-200 truncate">
                                    Hidden: {course.moderationReason}
                                  </div>
                                )}
                              {course.instructorResolutionNote ? (
                                <div className="mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 text-[10px] font-bold border border-emerald-300 break-words">
                                  ✓ Instructor Note: &ldquo;
                                  {course.instructorResolutionNote}&rdquo;
                                </div>
                              ) : (
                                !isHidden && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {course.category} •{" "}
                                    {course.modules?.length || 2} Modules
                                  </div>
                                )
                              )}
                            </td>

                            <td className="py-3.5 px-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {course.instructorAvatar && (
                                  <img
                                    src={course.instructorAvatar}
                                    alt={course.instructorName}
                                    className="w-6 h-6 rounded-full object-cover shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-800 truncate">
                                    {course.instructorName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {course.instructorEmail}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-1.5 text-center font-bold text-slate-700">
                              {course.enrolledCount || 0}
                            </td>

                            <td className="py-3.5 px-2">
                              {isPublished ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mr-1"></span>
                                  Published
                                </span>
                              ) : isHidden ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#D97706] border border-amber-300 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mr-1"></span>
                                  Hidden
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mr-1 animate-pulse"></span>
                                  Verified Note
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  {course.status}
                                </span>
                              )}
                            </td>

                            {/* COMPACT NON-CLIPPING ACTION TOOLBAR */}
                            <td className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1 flex-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setInspectedCourse(course)}
                                  className="h-7 px-2 text-slate-600 hover:text-slate-900 font-semibold border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-[11px] inline-flex items-center justify-center transition-colors"
                                >
                                  View
                                </button>

                                {isPending || isHidden ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApproveAndUnhideCourse(course)
                                    }
                                    title="Approve & Unhide Course"
                                    className="h-7 px-2 bg-[#16A34A] text-white hover:bg-emerald-700 font-bold rounded-md text-[11px] shadow-xs inline-flex items-center justify-center transition-colors"
                                  >
                                    Unhide
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectCourseForHideForm(course)
                                    }
                                    className="h-7 px-2 text-[#D97706] hover:bg-amber-50 font-semibold border border-amber-200 rounded-md bg-white text-[11px] inline-flex items-center justify-center transition-colors"
                                  >
                                    Hide
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourseRow(course)}
                                  className="h-7 px-2 text-[#DC2626] hover:bg-red-50 font-semibold border border-red-200 rounded-md bg-white text-[11px] inline-flex items-center justify-center transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =============================================================
                  RIGHT 4 COLUMNS: HIDE COURSE FORM & INSTRUCTOR VERIFICATION REVIEW
                 ============================================================= */}
              <div className="lg:col-span-4 space-y-4">
                {/* CARD 1: HIDE COURSE GOVERNANCE FORM */}
                <div
                  id="governance-hide-form"
                  className="bg-[#FFFFFF] rounded-2xl border-2 border-[#DC2626]/20 shadow-md p-5 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-[#DC2626] border border-red-200 uppercase tracking-wider">
                      Governance Action Form
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{targetCourseToHide?.courseId}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">
                      Hide This Course?
                    </h3>
                    <div className="mt-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Select Course to Hide
                      </label>
                      <NexaSelect
                        size="sm"
                        icon="menu_book"
                        value={targetCourseToHide?.courseId || ""}
                        onChange={(val) => setSelectedCourseIdToHide(val)}
                        options={govCourses.map((c) => ({
                          value: c.courseId,
                          label: `#${c.courseId} — ${c.title} (${c.status})`,
                        }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Instructor: {targetCourseToHide?.instructorName}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Governance Reason{" "}
                      <span className="text-[#DC2626]">*</span>
                    </label>
                    <NexaSelect
                      size="sm"
                      icon="gavel"
                      value={hideReasonCategory}
                      onChange={setHideReasonCategory}
                      options={[
                        "Incomplete Syllabus / Assessments",
                        "Inappropriate Content",
                        "Copyright Concern",
                        "Policy Violation",
                        "Other",
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Instructional Audit Feedback{" "}
                      <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      rows="3"
                      value={hideFeedbackText}
                      onChange={(e) => setHideFeedbackText(e.target.value)}
                      placeholder="Provide specific, actionable steps for the instructor to resolve..."
                      className="w-full text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setHideFeedbackText("")}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmHideCourse}
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        visibility_off
                      </span>
                      <span>Hide Course</span>
                    </button>
                  </div>
                </div>

                {/* CARD 2: MODERATION RESOLUTION REVIEW & UNHIDE (SHOWS INSTRUCTOR VERIFICATION NOTE!) */}
                <div className="bg-gradient-to-br from-indigo-50/60 to-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hiddenOrPendingCourses.length > 0
                            ? "bg-[#16A34A] animate-ping"
                            : "bg-slate-300"
                        }`}
                      ></span>
                      <span className="text-xs font-bold text-[#4F46E5] uppercase tracking-wider">
                        Moderation Resolution Review
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {hiddenOrPendingCourses.length} Hidden
                    </span>
                  </div>

                  {hiddenOrPendingCourses.length === 0 ? (
                    <>
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 text-center space-y-1">
                        <span className="material-symbols-outlined text-[22px] text-emerald-600">
                          verified
                        </span>
                        <p className="font-bold text-[#0F172A]">
                          No Hidden Courses Pending Unhide
                        </p>
                        <p className="text-[11px]">
                          All courses in the catalog are currently Published and
                          compliant.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={true}
                        className="w-full py-2.5 px-3 text-xs font-bold text-slate-400 bg-slate-200 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          check_circle
                        </span>
                        <span>Approve &amp; Unhide (No Hidden Items)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Select Hidden Course ({hiddenOrPendingCourses.length})
                        </label>
                        <NexaSelect
                          size="sm"
                          icon="visibility_off"
                          value={activeResolutionCourse?.courseId || ""}
                          onChange={(val) => setSelectedHiddenCourseId(val)}
                          options={hiddenOrPendingCourses.map((c) => ({
                            value: c.courseId,
                            label: `#${c.courseId} — ${c.title} (${
                              c.status === "Pending Review" ||
                              c.instructorResolutionNote
                                ? "✓ Verification Received"
                                : "Hidden"
                            })`,
                          }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Instructor:{" "}
                            <strong className="text-[#0F172A]">
                              {activeResolutionCourse?.instructorName}
                            </strong>
                          </span>
                          <span className="font-mono font-bold text-[#4F46E5]">
                            #{activeResolutionCourse?.courseId}
                          </span>
                        </div>

                        {/* Admin's Original Hide Reason */}
                        <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-950">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block">
                            Admin Hide Reason:
                          </span>
                          <span>
                            &ldquo;
                            {activeResolutionCourse?.moderationReason ||
                              "Missing quiz grading rubric"}
                            &rdquo;
                          </span>
                        </div>

                        {/* Instructor's Submitted Verification Note */}
                        {activeResolutionCourse?.instructorResolutionNote ? (
                          <div className="p-3 bg-emerald-50 rounded-lg border-2 border-emerald-300 text-xs text-emerald-950 space-y-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                mark_email_read
                              </span>
                              Instructor Verification Note Received:
                            </span>
                            <p className="font-semibold italic">
                              &ldquo;
                              {activeResolutionCourse.instructorResolutionNote}
                              &rdquo;
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 italic">
                            ⏳ Waiting for instructor to submit their
                            verification &amp; resolution note.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleApproveAndUnhideCourse(activeResolutionCourse)
                        }
                        className="w-full py-2.5 px-3 text-xs font-bold text-white bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-emerald-600 hover:to-emerald-800 rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          check_circle
                        </span>
                        <span>
                          Approve &amp; Unhide #
                          {activeResolutionCourse?.courseId}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 4: USER MANAGEMENT & LOCAL-TIME IMMUTABLE AUDIT LEDGER
             ================================================================= */}
          <section id="users" className="space-y-8 scroll-mt-20">
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A] flex items-center flex-wrap gap-2">
                    <span>User Account Governance &amp; Session Security</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Excludes Admin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage student &amp; instructor privileges. Suspend or
                    permanently delete accounts below.
                  </p>
                </div>

                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[17px]">
                      search
                    </span>
                  </span>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-slate-800"
                  />
                </div>
              </div>

              <div className="px-5 pt-3 border-b border-[#E2E8F0] flex items-center space-x-2 overflow-x-auto text-xs font-semibold">
                {[
                  { id: "ALL", label: `All Users (${govUsers.length})` },
                  {
                    id: "student",
                    label: `Students (${totalStudentsCount})`,
                  },
                  {
                    id: "instructor",
                    label: `Instructors (${totalInstructorsCount})`,
                  },
                  {
                    id: "Active",
                    label: `Active (${activeUsersCount})`,
                  },
                  {
                    id: "Suspended",
                    label: `Suspended (${suspendedUsersCount})`,
                  },
                ].map((tab) => {
                  const active = userTabFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUserTabFilter(tab.id)}
                      className={`pb-2.5 px-3 whitespace-nowrap transition-colors ${
                        active
                          ? "text-[#4F46E5] border-b-2 border-[#4F46E5] font-bold"
                          : tab.id === "Suspended"
                          ? "text-[#DC2626] hover:text-red-800"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-[#E2E8F0]">
                      <th className="py-3 px-5">Avatar &amp; Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role Badge</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Activity Summary</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {filteredGovUsers.map((u) => {
                      const isSuspended = u.status === "Suspended";
                      const isInstructor = u.role === "instructor";

                      return (
                        <tr
                          key={u.id || u.email}
                          className={`transition-colors ${
                            isSuspended
                              ? "bg-red-50/20 hover:bg-red-50/40"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-3 px-5 flex items-center space-x-3">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                  isSuspended
                                    ? "bg-red-100 text-[#DC2626]"
                                    : isInstructor
                                    ? "bg-teal-100 text-[#14B8A6]"
                                    : "bg-indigo-100 text-[#4F46E5]"
                                }`}
                              >
                                {u.initials}
                              </div>
                            )}
                            <span className="font-bold text-slate-900">
                              {u.name}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-600">
                            {u.email}
                          </td>

                          <td className="py-3 px-4">
                            {isInstructor ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#14B8A6] border border-teal-200">
                                Instructor
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Student
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {u.joinedDate}
                          </td>

                          <td
                            className={`py-3 px-4 ${
                              isSuspended
                                ? "text-red-600 font-medium"
                                : "text-slate-600"
                            }`}
                          >
                            {u.activitySummary}
                          </td>

                          <td className="py-3 px-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mr-1.5"></span>
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#16A34A] border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mr-1.5"></span>
                                Active
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectedUser(u)}
                                className="h-7 px-2.5 text-slate-600 hover:text-slate-900 font-semibold border border-slate-200 rounded-md text-[11px] bg-white hover:bg-slate-50 transition-colors"
                              >
                                View
                              </button>
                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatusClick(u)}
                                  className="h-7 px-2.5 text-[#16A34A] hover:bg-green-50 font-bold border border-green-300 rounded-md text-[11px] bg-white transition-colors"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatusClick(u)}
                                  className="h-7 px-2.5 text-[#D97706] hover:bg-amber-50 font-semibold border border-amber-200 rounded-md text-[11px] bg-white transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="h-7 px-2.5 text-[#DC2626] hover:bg-red-50 font-semibold border border-red-200 rounded-md text-[11px] bg-white transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LOCAL-TIME IMMUTABLE AUDIT LEDGER */}
            <div
              id="audit-ledger"
              className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden scroll-mt-20"
            >
              <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded bg-[#0F172A] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">
                        verified_user
                      </span>
                    </span>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Local-Time Immutable Governance Audit Ledger (
                      {filteredLedgerLogs.length} Records)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cryptographically stamped chain of custody for all admin
                    and instructor governance actions.
                  </p>
                </div>

                <div className="w-56">
                  <NexaSelect
                    size="sm"
                    icon="filter_list"
                    value={ledgerFilterAction}
                    onChange={setLedgerFilterAction}
                    options={[
                      { value: "ALL", label: "All Actions" },
                      { value: "Course Hidden", label: "Course Hidden" },
                      {
                        value: "Resolution Submitted",
                        label: "Resolution Submitted",
                      },
                      {
                        value: "Course Approved & Unhidden",
                        label: "Course Approved & Unhidden",
                      },
                      {
                        value: "Course Deleted",
                        label: "Course Deleted",
                      },
                      {
                        value: "Account Suspended",
                        label: "Account Suspended",
                      },
                      {
                        value: "Account Reactivated",
                        label: "Account Reactivated",
                      },
                      {
                        value: "Account Deleted",
                        label: "Account Deleted",
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-[#E2E8F0]">
                      <th className="py-3 px-4 w-[190px]">
                        Timestamp (Local Time)
                      </th>
                      <th className="py-3 px-4 w-[150px]">Actor</th>
                      <th className="py-3 px-4 w-[190px]">Action Pill</th>
                      <th className="py-3 px-4 w-[160px]">Target Entity</th>
                      <th className="py-3 px-4 min-w-[200px]">Reason / Note</th>
                      <th className="py-3 px-4 w-[120px] text-right">
                        Outcome
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium">
                    {filteredLedgerLogs.map((log) => {
                      const pillStyle =
                        log.action === "Course Hidden"
                          ? "bg-amber-50 text-[#D97706] border-amber-200"
                          : log.action === "Resolution Submitted"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : log.action === "Course Approved & Unhidden"
                          ? "bg-indigo-50 text-[#4F46E5] border-indigo-200"
                          : log.action === "Account Suspended" ||
                            log.action === "Account Deleted" ||
                            log.action === "Course Deleted"
                          ? "bg-red-50 text-[#DC2626] border-red-200"
                          : log.action === "Account Reactivated"
                          ? "bg-green-50 text-[#16A34A] border-green-200"
                          : "bg-slate-100 text-slate-700 border-slate-300";

                      return (
                        <tr
                          key={log.logId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {formatLocalAuditTimestamp(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#0F172A]">
                            {log.adminName || "Sashmitha N."}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${pillStyle}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800">
                            {log.target}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {log.reason}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center text-xs font-bold text-[#16A34A]">
                              ✓ {log.outcome || "SUCCESS"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}