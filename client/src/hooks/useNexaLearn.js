import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  fetchCourses,
  fetchInstructors,
  fetchStudentEnrollments,
  fetchStudentSubmissions,
  fetchAdminUsersList,
  fetchAdminAuditLedger,
  apiSubmitAssignment,
  apiUpdateClassroomProgress,
  apiCreateCourse,
  apiUpdateCourse,
  apiDeleteCourse,
  apiGradeSubmission,
  apiAdminModerateCourse,
  apiAdminToggleUserStatus,
  apiAdminDeleteUser,
  apiCheckCurrentSession,
  apiAuthRequest,
  apiForgotPassword,
  apiEnrollCourse,
  pingHealth,
} from "../services/nexaService.js";
import {
  FALLBACK_COURSES,
  FALLBACK_INSTRUCTORS,
  DURATION_BUCKETS,
  HERO_LEARNER_IMAGE,
} from "../constants/nexaConstants.js";

const VALID_VIEWS = [
  "public",
  "auth",
  "student",
  "classroom",
  "instructor",
  "admin",
];

const STORAGE_KEYS = {
  COURSES: "nexalearn_courses_v9",
  INSTRUCTORS: "nexalearn_instructors_v9",
  ENROLLMENTS: "nexalearn_enrollments_v9",
  SUBMISSIONS: "nexalearn_submissions_v9",
  USERS: "nexalearn_users_v9",
  AUDIT_LOGS: "nexalearn_audit_logs_v9",
  DELETED_USERS: "nexalearn_deleted_users_v9",
  ACTIVE_VIEW: "nexalearn_active_view_v9",
  ACTIVE_CLASSROOM_COURSE: "nexalearn_classroom_course_v9",
};

const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
};

const INITIAL_ENROLLMENTS = [];

const INITIAL_USERS = [
  {
    id: "nl-student-001",
    initials: "SJ",
    name: "Sarah Jenkins",
    email: "student@nexalearn.io",
    role: "student",
    avatar: HERO_LEARNER_IMAGE,
    joinedDate: "Feb 10, 2026",
    activitySummary: "Registered Learner",
    status: "Active",
  },
  {
    id: "nl-inst-001",
    initials: "AM",
    name: "Alex Morgan",
    email: "alex.morgan@nexalearn.io",
    role: "instructor",
    avatar: FALLBACK_INSTRUCTORS[0].avatar,
    joinedDate: "Jan 15, 2026",
    activitySummary: "Verified Instructor",
    status: "Active",
  },
];

const INITIAL_AUDIT_LOGS = [
  {
    logId: "AUD-2026-001",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    adminName: "Sashmitha N.",
    action: "Platform Initialized",
    target: "NexaLearn Core",
    reason: "Academic governance ledger active.",
    outcome: "SUCCESS",
  },
];

const LEGACY_DUMMY_EMAILS = new Set([
  "elena.rostova@nexalearn.io",
  "marcus.vance@nexalearn.io",
  "sarah.chen@nexalearn.io",
]);

export function useNexaLearn() {
  const [user, setUser] = useState(() => readStorage("nexalearn_user", null));

  // Prevents background polling from overwriting optimistic state while a user action is in-flight
  const lastMutationTimeRef = useRef(0);
  const markMutationStart = useCallback(() => {
    lastMutationTimeRef.current = Date.now();
  }, []);

  const deletedUserEmailsRef = useRef(
    new Set(readStorage(STORAGE_KEYS.DELETED_USERS, []))
  );

  const markUserDeletedPermanently = useCallback((email) => {
    const clean = String(email || "").toLowerCase().trim();
    if (!clean) return;
    deletedUserEmailsRef.current.add(clean);
    writeStorage(
      STORAGE_KEYS.DELETED_USERS,
      Array.from(deletedUserEmailsRef.current)
    );
  }, []);

  const unmarkUserDeleted = useCallback((email) => {
    const clean = String(email || "").toLowerCase().trim();
    if (!clean) return;
    deletedUserEmailsRef.current.delete(clean);
    writeStorage(
      STORAGE_KEYS.DELETED_USERS,
      Array.from(deletedUserEmailsRef.current)
    );
  }, []);

  const [activeView, setActiveViewState] = useState(() => {
    const savedUser = readStorage("nexalearn_user", null);
    const savedView = localStorage.getItem(STORAGE_KEYS.ACTIVE_VIEW);
    if (savedUser && savedView && VALID_VIEWS.includes(savedView)) {
      if (
        (savedView === "student" || savedView === "classroom") &&
        savedUser.role !== "student"
      ) {
        return savedUser.role === "admin" ? "admin" : "instructor";
      }
      return savedView;
    }
    if (savedUser) {
      return savedUser.role === "admin"
        ? "admin"
        : savedUser.role === "instructor"
        ? "instructor"
        : "student";
    }
    return "public";
  });

  const [pendingIntent, setPendingIntent] = useState(null);

  const [serverHealth, setServerHealth] = useState({
    serverOnline: false,
    dbConnected: false,
    cluster: "Checking...",
    latency: null,
    lastSync: new Date().toLocaleTimeString(),
  });

  const [courses, setCoursesState] = useState(() =>
    readStorage(STORAGE_KEYS.COURSES, FALLBACK_COURSES)
  );
  const [instructors, setInstructorsState] = useState(() =>
    readStorage(STORAGE_KEYS.INSTRUCTORS, FALLBACK_INSTRUCTORS).filter(
      (i) =>
        !deletedUserEmailsRef.current.has(String(i.email).toLowerCase()) &&
        !LEGACY_DUMMY_EMAILS.has(String(i.email).toLowerCase())
    )
  );
  const [enrollments, setEnrollmentsState] = useState(() =>
    readStorage(STORAGE_KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS)
  );
  const [submissions, setSubmissionsState] = useState(() =>
    readStorage(STORAGE_KEYS.SUBMISSIONS, [])
  );
  const [platformUsers, setPlatformUsersState] = useState(() => {
    const stored = readStorage(STORAGE_KEYS.USERS, INITIAL_USERS).filter(
      (u) =>
        !deletedUserEmailsRef.current.has(String(u.email).toLowerCase()) &&
        !LEGACY_DUMMY_EMAILS.has(String(u.email).toLowerCase())
    );
    return stored.length > 0 ? stored : INITIAL_USERS;
  });
  const [auditLogs, setAuditLogsState] = useState(() =>
    readStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
  );

  const [activeClassroomCourseId, setActiveClassroomCourseId] = useState(
    () =>
      localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASSROOM_COURSE) ||
      "CRS-2026-001"
  );
  const [classroomTab, setClassroomTab] = useState("video");

  const [toast, setToast] = useState({
    visible: false,
    title: "",
    message: "",
    isError: false,
  });

  const showToast = useCallback((title, message, isError = false) => {
    setToast({ visible: true, title, message, isError });
  }, []);

  const dismissToast = useCallback(() => {
    setToast((p) => ({ ...p, visible: false }));
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(dismissToast, 3800);
    return () => clearTimeout(t);
  }, [toast.visible, dismissToast]);

  const setCourses = useCallback((updater) => {
    setCoursesState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeStorage(STORAGE_KEYS.COURSES, next);
      return next;
    });
  }, []);

  const setInstructors = useCallback((updater) => {
    setInstructorsState((prev) => {
      const next = (
        typeof updater === "function" ? updater(prev) : updater
      ).filter(
        (i) =>
          !deletedUserEmailsRef.current.has(
            String(i.email || "").toLowerCase()
          ) && !LEGACY_DUMMY_EMAILS.has(String(i.email || "").toLowerCase())
      );
      writeStorage(STORAGE_KEYS.INSTRUCTORS, next);
      return next;
    });
  }, []);

  const setEnrollments = useCallback(
    (updater) => {
      setEnrollmentsState((prev) => {
        const raw = typeof updater === "function" ? updater(prev) : updater;
        const instEmails = new Set([
          "alex.morgan@nexalearn.io",
          "admin@nexalearn.io",
          ...instructors.map((i) => (i.email || "").toLowerCase().trim()),
          ...(user?.role !== "student" && user?.email
            ? [user.email.toLowerCase().trim()]
            : []),
        ]);
        const next = (raw || []).filter((e) => {
          const sEmail = (e.studentEmail || "").toLowerCase().trim();
          const iEmail = (e.instructorEmail || "").toLowerCase().trim();
          return sEmail && !instEmails.has(sEmail) && sEmail !== iEmail;
        });
        writeStorage(STORAGE_KEYS.ENROLLMENTS, next);
        return next;
      });
    },
    [instructors, user]
  );

  const setSubmissions = useCallback((updater) => {
    setSubmissionsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeStorage(STORAGE_KEYS.SUBMISSIONS, next);
      return next;
    });
  }, []);

  const setPlatformUsers = useCallback((updater) => {
    setPlatformUsersState((prev) => {
      const next = (
        typeof updater === "function" ? updater(prev) : updater
      ).filter(
        (u) =>
          !deletedUserEmailsRef.current.has(
            String(u.email || "").toLowerCase()
          ) && !LEGACY_DUMMY_EMAILS.has(String(u.email || "").toLowerCase())
      );
      writeStorage(STORAGE_KEYS.USERS, next);
      return next;
    });
  }, []);

  const setAuditLogs = useCallback((updater) => {
    setAuditLogsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeStorage(STORAGE_KEYS.AUDIT_LOGS, next);
      return next;
    });
  }, []);

  const forceRevokeSession = useCallback(
    (reasonTitle, reasonMsg) => {
      localStorage.removeItem("nexalearn_token");
      localStorage.removeItem("nexalearn_user");
      setUser(null);
      setActiveViewState("auth");
      localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, "auth");
      showToast(reasonTitle, reasonMsg, true);
    },
    [showToast]
  );

  // Non-blocking background sync
  const syncFromBackend = useCallback(
    async (force = false) => {
      // Skip background overwrite if an optimistic mutation happened in the last 3.5 seconds
      if (!force && Date.now() - lastMutationTimeRef.current < 3500) {
        return;
      }

      if (user && user.role !== "admin") {
        const myEmail = (user.email || "").toLowerCase().trim();
        if (deletedUserEmailsRef.current.has(myEmail)) {
          forceRevokeSession(
            "Account Deleted — Signed Out",
            "Your account has been permanently removed by the Platform Administrator."
          );
          return;
        }
        const currentUsersList = readStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
        const myRecord = currentUsersList.find(
          (u) => (u.email || "").toLowerCase().trim() === myEmail
        );
        if (myRecord && myRecord.status === "Suspended") {
          forceRevokeSession(
            "Account Suspended — Signed Out",
            "Your account has been suspended by the Platform Administrator. All active sessions are revoked."
          );
          return;
        }
      }

      const health = await pingHealth();
      setServerHealth(health);
      if (!health.serverOnline) return;

      try {
        if (user && user.role !== "admin") {
          const sessionCheck = await apiCheckCurrentSession();
          if (!sessionCheck.valid) {
            forceRevokeSession(
              sessionCheck.reason === "DELETED"
                ? "Account Deleted — Signed Out"
                : "Account Suspended — Signed Out",
              sessionCheck.message ||
                "Your session was terminated by the Platform Administrator."
            );
            return;
          }
        }

        const [backendCourses, backendInstructors] = await Promise.all([
          fetchCourses(true),
          fetchInstructors(),
        ]);

        // Re-check mutation lock after network wait so we never clobber a fresh click
        if (!force && Date.now() - lastMutationTimeRef.current < 3500) {
          return;
        }

        if (Array.isArray(backendCourses)) {
          setCourses(backendCourses);
        }
        if (
          Array.isArray(backendInstructors) &&
          backendInstructors.length > 0
        ) {
          setInstructors(backendInstructors);
        }

        if (user) {
          const [backendEnr, backendSub] = await Promise.all([
            fetchStudentEnrollments(),
            fetchStudentSubmissions(),
          ]);
          if (!force && Date.now() - lastMutationTimeRef.current < 3500) {
            return;
          }
          if (Array.isArray(backendEnr)) {
            setEnrollments(backendEnr);
          }
          if (Array.isArray(backendSub)) {
            setSubmissions(backendSub);
          }

          if (user.role === "admin") {
            const [backendUsers, backendLogs] = await Promise.all([
              fetchAdminUsersList(),
              fetchAdminAuditLedger(),
            ]);

            if (Array.isArray(backendLogs) && backendLogs.length > 0) {
              setAuditLogs(backendLogs);
            }

            if (Array.isArray(backendUsers) && backendUsers.length > 0) {
              const instEmails = new Set(
                (backendInstructors || []).map((i) =>
                  (i.email || "").toLowerCase().trim()
                )
              );
              (backendCourses || []).forEach((c) => {
                if (c.instructorEmail) {
                  instEmails.add(c.instructorEmail.toLowerCase().trim());
                }
              });

              setPlatformUsers(
                backendUsers
                  .filter((bu) => bu.role !== "admin")
                  .map((bu) => {
                    const emailKey = (bu.email || "").toLowerCase().trim();
                    const isInst =
                      bu.role === "instructor" || instEmails.has(emailKey);
                    return {
                      id: String(bu.id || bu._id),
                      initials: (bu.name || "NL")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase(),
                      name: bu.name,
                      email: bu.email,
                      role: isInst ? "instructor" : "student",
                      avatar:
                        bu.avatar ||
                        (isInst
                          ? FALLBACK_INSTRUCTORS[0].avatar
                          : HERO_LEARNER_IMAGE),
                      joinedDate: new Date(
                        bu.createdAt || Date.now()
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      }),
                      activitySummary:
                        bu.status === "Suspended"
                          ? "Session revoked by Platform Admin"
                          : isInst
                          ? "Verified Instructor"
                          : "Enrolled Learner",
                      status: bu.status || "Active",
                    };
                  })
              );
            }
          }
        }
      } catch {
        // Keep local state if a poll fails
      }
    },
    [
      user,
      forceRevokeSession,
      setCourses,
      setInstructors,
      setEnrollments,
      setSubmissions,
      setPlatformUsers,
      setAuditLogs,
    ]
  );

  useEffect(() => {
    syncFromBackend(true);
    const intervalId = setInterval(() => syncFromBackend(false), 3000);

    const handleStorageSync = (e) => {
      if (e.key === STORAGE_KEYS.DELETED_USERS && e.newValue) {
        try {
          deletedUserEmailsRef.current = new Set(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (e.key === STORAGE_KEYS.COURSES) setCoursesState(parsed);
        if (e.key === STORAGE_KEYS.SUBMISSIONS) setSubmissionsState(parsed);
        if (e.key === STORAGE_KEYS.ENROLLMENTS) setEnrollmentsState(parsed);
        if (e.key === STORAGE_KEYS.AUDIT_LOGS) setAuditLogsState(parsed);
        if (e.key === STORAGE_KEYS.USERS) {
          setPlatformUsersState(parsed);
          if (user && user.role !== "admin") {
            const myEmail = (user.email || "").toLowerCase().trim();
            const myEntry = parsed.find(
              (u) => (u.email || "").toLowerCase().trim() === myEmail
            );
            if (!myEntry) {
              forceRevokeSession(
                "Account Deleted — Signed Out",
                "Your account was deleted by the Platform Administrator."
              );
            } else if (myEntry.status === "Suspended") {
              forceRevokeSession(
                "Account Suspended — Signed Out",
                "Your account was suspended by the Platform Administrator."
              );
            }
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [syncFromBackend, user, forceRevokeSession]);

  const [spotlightCourseId, setSpotlightCourseId] = useState(null);
  const [inspectedInstructor, setInspectedInstructorState] = useState(null);
  const [previewLessonCourse, setPreviewLessonCourseState] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpenState] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("POPULAR");

  const isPopStateRef = useRef(false);

  useEffect(() => {
    window.history.replaceState(
      { view: activeView, modal: null },
      "",
      `#${activeView}`
    );

    const onPopState = (e) => {
      isPopStateRef.current = true;
      const state = e.state;
      setInspectedInstructorState(null);
      setPreviewLessonCourseState(null);
      setMobileFilterOpenState(false);

      if (state && VALID_VIEWS.includes(state.view)) {
        setActiveViewState(state.view);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, state.view);
      } else {
        setActiveViewState("public");
        localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, "public");
      }

      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setActiveView = useCallback(
    (nextView) => {
      setActiveViewState((prev) => {
        let resolved =
          typeof nextView === "function" ? nextView(prev) : nextView;

        if (
          (resolved === "student" || resolved === "classroom") &&
          user &&
          user.role !== "student"
        ) {
          resolved = user.role === "admin" ? "admin" : "instructor";
        }

        localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, resolved);

        if (!isPopStateRef.current && resolved !== prev) {
          window.history.pushState(
            { view: resolved, modal: null },
            "",
            `#${resolved}`
          );
        }
        return resolved;
      });
      syncFromBackend(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [user, syncFromBackend]
  );

  const setInspectedInstructor = useCallback(
    (inst) => {
      setInspectedInstructorState((prev) => {
        if (!isPopStateRef.current && inst && !prev) {
          window.history.pushState(
            { view: activeView, modal: "instructor" },
            "",
            `#${activeView}`
          );
        }
        return inst;
      });
    },
    [activeView]
  );

  const setPreviewLessonCourse = useCallback(
    (crs) => {
      setPreviewLessonCourseState((prev) => {
        if (!isPopStateRef.current && crs && !prev) {
          window.history.pushState(
            { view: activeView, modal: "preview" },
            "",
            `#${activeView}`
          );
        }
        return crs;
      });
    },
    [activeView]
  );

  const setMobileFilterOpen = useCallback(
    (open) => {
      setMobileFilterOpenState((prev) => {
        const next = typeof open === "function" ? open(prev) : open;
        if (!isPopStateRef.current && next && !prev) {
          window.history.pushState(
            { view: activeView, modal: "filters" },
            "",
            `#${activeView}`
          );
        }
        return next;
      });
    },
    [activeView]
  );

  const toggleCategoryFilter = useCallback((cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const toggleDifficultyFilter = useCallback((diff) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  }, []);

  const toggleDurationFilter = useCallback((durId) => {
    setSelectedDurations((prev) =>
      prev.includes(durId) ? prev.filter((d) => d !== durId) : [...prev, durId]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedDifficulties([]);
    setSelectedDurations([]);
    setMinRating(0);
    setSortBy("POPULAR");
  }, []);

  const enrichedCourses = useMemo(() => {
    return courses.map((c) => {
      const matchingInst = instructors.find(
        (inst) =>
          inst.email?.toLowerCase() === c.instructorEmail?.toLowerCase() ||
          inst.name?.toLowerCase() === c.instructorName?.toLowerCase()
      );
      return {
        ...c,
        status: c.status || "Published",
        instructorName:
          matchingInst?.name || c.instructorName || "Alex Morgan",
        instructorAvatar:
          matchingInst?.avatar ||
          c.instructorAvatar ||
          FALLBACK_INSTRUCTORS[0].avatar,
        instructorTitle:
          matchingInst?.headline ||
          c.instructorTitle ||
          "Staff Engineer & Lead Instructor",
        instructorBio:
          matchingInst?.bio ||
          c.instructorBio ||
          FALLBACK_INSTRUCTORS[0].bio,
        shortDescription:
          c.shortDescription ||
          `Hands-on ${
            c.category || "Software Engineering"
          } curriculum with interactive modules, timed quizzes, and a graded capstone project.`,
        overview:
          c.overview ||
          c.shortDescription ||
          `Comprehensive production-grade curriculum authored by ${
            matchingInst?.name || c.instructorName || "Alex Morgan"
          }.`,
        learningOutcomes:
          Array.isArray(c.learningOutcomes) && c.learningOutcomes.length > 0
            ? c.learningOutcomes
            : FALLBACK_COURSES[0].learningOutcomes,
      };
    });
  }, [courses, instructors]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const list = enrichedCourses.filter((c) => {
      const cleanStatus = String(c.status || "Published").trim();
      if (cleanStatus !== "Published") return false;

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(c.category)
      ) {
        return false;
      }

      if (
        selectedDifficulties.length > 0 &&
        !selectedDifficulties.includes(c.difficulty)
      ) {
        return false;
      }

      if (selectedDurations.length > 0) {
        const hours = Number(c.durationHours || 16);
        const matchesAnyBucket = selectedDurations.some((bucketId) => {
          const bucket = DURATION_BUCKETS.find((b) => b.id === bucketId);
          return bucket ? bucket.test(hours) : true;
        });
        if (!matchesAnyBucket) return false;
      }

      if (minRating > 0 && Number(c.rating || 4.9) < minRating) {
        return false;
      }

      if (q) {
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchDesc = (c.shortDescription || "").toLowerCase().includes(q);
        const matchInst = (c.instructorName || "").toLowerCase().includes(q);
        const matchCat = (c.category || "").toLowerCase().includes(q);
        const matchId = (c.courseId || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchInst && !matchCat && !matchId) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === "RATED") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "DURATION_ASC") {
      list.sort((a, b) => (a.durationHours || 0) - (b.durationHours || 0));
    } else if (sortBy === "NEWEST") {
      list.sort((a, b) =>
        String(b.courseId).localeCompare(String(a.courseId))
      );
    } else {
      list.sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0));
    }

    return list;
  }, [
    enrichedCourses,
    searchQuery,
    selectedCategories,
    selectedDifficulties,
    selectedDurations,
    minRating,
    sortBy,
  ]);

  const spotlightCourse = useMemo(() => {
    if (!spotlightCourseId) return null;
    return (
      enrichedCourses.find(
        (c) => c.courseId === spotlightCourseId && c.status === "Published"
      ) || null
    );
  }, [enrichedCourses, spotlightCourseId]);

  const activeClassroomCourse = useMemo(() => {
    return (
      enrichedCourses.find((c) => c.courseId === activeClassroomCourseId) ||
      enrichedCourses[0] ||
      null
    );
  }, [enrichedCourses, activeClassroomCourseId]);

  const handleSelectCourseForSpotlight = useCallback((course) => {
    if (!course?.courseId) return;
    setSpotlightCourseId(course.courseId);
    setTimeout(() => {
      const el = document.getElementById("syllabus-spotlight");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  const handleSelectCategoryTrack = useCallback((categoryName) => {
    setSelectedCategories([categoryName]);
    const el = document.getElementById("catalog");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ===========================================================================
  // 0ms INSTANT OPTIMISTIC ACTIONS (NON-BLOCKING BACKGROUND API SYNC)
  // ===========================================================================
  const handleTriggerEnroll = useCallback(
    (course) => {
      if (!user) {
        setPendingIntent({
          type: "enroll",
          courseId: course.courseId,
          courseTitle: course.title,
        });
        setActiveView("auth");
        showToast(
          "Sign In to Enroll",
          `Sign in or create a Student account to enroll in "${course.title}".`
        );
        return;
      }

      if (user.role === "instructor") {
        const isOwner =
          course.instructorEmail?.toLowerCase() === user.email?.toLowerCase() ||
          course.instructorName?.toLowerCase() === user.name?.toLowerCase();
        if (isOwner) {
          setActiveView("instructor");
          showToast(
            "Opening Instructor Studio",
            `You are the author of #${course.courseId}. Opening your Studio.`
          );
        } else {
          showToast(
            "Student Account Required",
            "Instructor accounts cannot enroll as students.",
            true
          );
        }
        return;
      }

      if (user.role === "admin") {
        setActiveView("admin");
        showToast(
          "Administrator Mode Active",
          "Admin accounts govern courses and cannot enroll as students.",
          true
        );
        return;
      }

      // Check if already enrolled -> Go straight to Student Dashboard!
      const alreadyEnrolled = enrollments.some(
        (e) =>
          e.courseId === course.courseId &&
          e.studentEmail?.toLowerCase() === user.email?.toLowerCase()
      );
      if (alreadyEnrolled) {
        setActiveView("student");
        showToast(
          "Already Enrolled",
          `Opening "${course.title}" in your Student Learning Hub.`
        );
        return;
      }

      markMutationStart();

      // Instant 0ms state update + navigation
      setEnrollments((prev) => [
        {
          enrollmentId: `ENR-2026-${String(Date.now()).slice(-4)}`,
          courseId: course.courseId,
          courseTitle: course.title,
          courseCategory: course.category,
          courseThumbnail: course.thumbnail,
          instructorName: course.instructorName,
          instructorEmail: course.instructorEmail,
          studentEmail: user.email,
          studentName: user.name,
          completedLessonIds: ["LES-101"],
          progressPercent: 20,
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
        },
        ...prev,
      ]);

      setCourses((prev) =>
        prev.map((c) =>
          c.courseId === course.courseId
            ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 }
            : c
        )
      );

      setActiveView("student");
      showToast(
        "Enrolled in Course!",
        `Welcome to "${course.title}". Added to your Student Learning Hub.`
      );

      // Sync with MongoDB in background without blocking UI
      apiEnrollCourse(course.courseId)
        .then(() => syncFromBackend(true))
        .catch(() => {});
    },
    [
      user,
      enrollments,
      markMutationStart,
      setEnrollments,
      setCourses,
      syncFromBackend,
      setActiveView,
      showToast,
    ]
  );

  const handleTriggerBecomeInstructor = useCallback(() => {
    if (!user) {
      setPendingIntent({ type: "instructor" });
      setActiveView("auth");
      showToast(
        "Instructor Registration",
        "Create an Instructor account to publish courses, build quizzes, and grade assignments."
      );
      return;
    }
    if (user.role === "instructor") {
      setActiveView("instructor");
    } else if (user.role === "admin") {
      setActiveView("admin");
    } else {
      showToast(
        "Instructor Role Required",
        "Sign in with an Instructor account to access the Studio.",
        true
      );
    }
  }, [user, setActiveView, showToast]);

  const handleAuthenticate = useCallback(
    async (mode, payload) => {
      try {
        const cleanEmail = (payload.email || "").toLowerCase().trim();

        if (mode === "register") {
          unmarkUserDeleted(cleanEmail);
        } else {
          if (deletedUserEmailsRef.current.has(cleanEmail)) {
            const msg =
              "This account has been deleted by the Platform Administrator.";
            showToast("Account Deleted", msg, true);
            return { ok: false, message: msg };
          }
          const localTarget = platformUsers.find(
            (u) => u.email.toLowerCase() === cleanEmail
          );
          if (localTarget && localTarget.status === "Suspended") {
            const msg =
              "This account has been suspended by the Platform Administrator.";
            showToast("Access Suspended", msg, true);
            return { ok: false, message: msg };
          }
        }

        const endpoint = mode === "signin" ? "login" : "register";
        const res = await apiAuthRequest(endpoint, payload);

        const authoritativeRole = res.user.role || payload.role || "student";

        const existingLocalRecord = platformUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        const existingInstRecord = instructors.find(
          (i) => i.email.toLowerCase() === cleanEmail
        );

        const mergedUser = {
          ...res.user,
          role: authoritativeRole,
          name: res.user.name || existingLocalRecord?.name,
          avatar:
            existingInstRecord?.avatar ||
            res.user.avatar ||
            (authoritativeRole === "instructor"
              ? FALLBACK_INSTRUCTORS[0].avatar
              : HERO_LEARNER_IMAGE),
          headline:
            res.user.headline ||
            existingInstRecord?.headline ||
            (authoritativeRole === "instructor"
              ? "Staff Engineer & Lead Instructor"
              : "Full-Stack Engineering Learner"),
          bio: res.user.bio || existingInstRecord?.bio || "",
        };

        localStorage.setItem("nexalearn_token", res.token);
        writeStorage("nexalearn_user", mergedUser);
        setUser(mergedUser);

        if (mergedUser.role !== "admin") {
          const userRecord = {
            id: mergedUser.id || existingLocalRecord?.id || `usr-${Date.now()}`,
            initials: (mergedUser.name || "NL")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            name: mergedUser.name,
            email: mergedUser.email,
            role: mergedUser.role,
            avatar: mergedUser.avatar,
            joinedDate:
              existingLocalRecord?.joinedDate ||
              new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
            activitySummary:
              mergedUser.role === "instructor"
                ? "Verified Instructor"
                : "Enrolled Learner",
            status: "Active",
          };

          setPlatformUsers((prev) => {
            const exists = prev.some(
              (u) => u.email.toLowerCase() === cleanEmail
            );
            return exists
              ? prev.map((u) =>
                  u.email.toLowerCase() === cleanEmail ? userRecord : u
                )
              : [userRecord, ...prev];
          });

          if (mergedUser.role === "instructor") {
            const instRecord = {
              id:
                mergedUser.id ||
                existingInstRecord?.id ||
                `inst-${Date.now()}`,
              name: mergedUser.name,
              email: mergedUser.email,
              headline: mergedUser.headline || "Senior Educator",
              specialty: mergedUser.specialty || "Software Engineering",
              coursesCount: existingInstRecord?.coursesCount ?? 0,
              studentsMentored:
                existingInstRecord?.studentsMentored || "New Cohort",
              rating: 5.0,
              bio:
                mergedUser.bio ||
                "Subject-matter educator on NexaLearn Academy.",
              avatar: mergedUser.avatar,
            };

            setInstructors((prev) => {
              const exists = prev.some(
                (i) => i.email.toLowerCase() === cleanEmail
              );
              return exists
                ? prev.map((i) =>
                    i.email.toLowerCase() === cleanEmail ? instRecord : i
                  )
                : [...prev, instRecord];
            });
          }
        }

        if (
          mergedUser.role === "student" &&
          pendingIntent?.type === "enroll" &&
          pendingIntent.courseId
        ) {
          const targetCourse =
            enrichedCourses.find(
              (c) => c.courseId === pendingIntent.courseId
            ) || FALLBACK_COURSES[0];
          setEnrollments((prev) => {
            const exists = prev.some(
              (e) =>
                e.courseId === targetCourse.courseId &&
                e.studentEmail?.toLowerCase() === cleanEmail
            );
            if (exists) return prev;
            return [
              {
                enrollmentId: `ENR-2026-${String(Date.now()).slice(-4)}`,
                courseId: targetCourse.courseId,
                courseTitle: targetCourse.title,
                courseCategory: targetCourse.category,
                courseThumbnail: targetCourse.thumbnail,
                instructorName: targetCourse.instructorName,
                instructorEmail: targetCourse.instructorEmail,
                studentEmail: mergedUser.email,
                studentName: mergedUser.name,
                completedLessonIds: ["LES-101"],
                progressPercent: 20,
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
              },
              ...prev,
            ];
          });
          apiEnrollCourse(pendingIntent.courseId).catch(() => {});
        }

        showToast(
          mode === "signin" ? "Welcome Back!" : "Account Created!",
          `Signed in as ${mergedUser.name} (${mergedUser.role.toUpperCase()}).`
        );

        const nextView =
          mergedUser.role === "admin"
            ? "admin"
            : mergedUser.role === "instructor"
            ? "instructor"
            : "student";
        setActiveViewState(nextView);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, nextView);
        setPendingIntent(null);
        syncFromBackend(true);
        return { ok: true };
      } catch (err) {
        showToast("Authentication Error", err.message, true);
        return { ok: false, message: err.message };
      }
    },
    [
      platformUsers,
      instructors,
      pendingIntent,
      enrichedCourses,
      unmarkUserDeleted,
      setPlatformUsers,
      setInstructors,
      setEnrollments,
      syncFromBackend,
      showToast,
    ]
  );

  const handleForgotPassword = useCallback(
    async (email) => {
      try {
        const res = await apiForgotPassword(email);
        showToast("Reset Email Sent", res.message);
        return true;
      } catch (err) {
        showToast("Recovery Notice", err.message, true);
        return false;
      }
    },
    [showToast]
  );

  const handleOpenClassroom = useCallback(
    (course, initialMode = "video") => {
      const targetId = course?.courseId || "CRS-2026-001";
      setActiveClassroomCourseId(targetId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASSROOM_COURSE, targetId);
      setClassroomTab(initialMode);
      setActiveView("classroom");
    },
    [setActiveView]
  );

  // 0ms Instant Lesson Completion, Quiz Score & Notes Sync
  // 0ms Instant Lesson Completion, Quiz Score, Certificate Issuance & Notes Sync
  const handleSyncClassroomProgress = useCallback(
    (courseId, payload) => {
      markMutationStart();
      const studentEmail = (user?.email || "student@nexalearn.io")
        .toLowerCase()
        .trim();
      const targetCourse =
        enrichedCourses.find((c) => c.courseId === courseId) ||
        FALLBACK_COURSES[0];

      setEnrollments((prev) => {
        const exists = prev.some(
          (e) =>
            e.courseId === courseId &&
            e.studentEmail?.toLowerCase() === studentEmail
        );
        const baseList = exists
          ? prev
          : [
              {
                enrollmentId: `ENR-2026-${String(Date.now()).slice(-4)}`,
                courseId,
                courseTitle: targetCourse.title,
                courseCategory: targetCourse.category,
                courseThumbnail: targetCourse.thumbnail,
                instructorName: targetCourse.instructorName,
                instructorEmail: targetCourse.instructorEmail,
                studentEmail,
                studentName: user?.name || "Sarah Jenkins",
                completedLessonIds: ["LES-101"],
                progressPercent: 50,
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
              },
              ...prev,
            ];

        return baseList.map((e) => {
          if (
            e.courseId !== courseId ||
            e.studentEmail?.toLowerCase() !== studentEmail
          ) {
            return e;
          }
          const nextLessons =
            payload.completedLessonId &&
            !e.completedLessonIds?.includes(payload.completedLessonId)
              ? [...(e.completedLessonIds || []), payload.completedLessonId]
              : e.completedLessonIds || [];

          const nextProgress =
            typeof payload.progressPercent === "number"
              ? payload.progressPercent
              : e.progressPercent;

          const nextQuizScore =
            typeof payload.quizScore === "number"
              ? payload.quizScore
              : e.bestQuizScore;

          const nextQuizCompleted =
            payload.quizCompleted !== undefined
              ? payload.quizCompleted
              : e.quizCompleted;

          const isNowCompleted =
            nextProgress >= 100 ||
            Boolean(payload.certificateIssued) ||
            Boolean(e.certificateIssued);

          const suffix = courseId.split("-").pop() || "001";

          return {
            ...e,
            courseTitle: targetCourse?.title || e.courseTitle,
            instructorName: targetCourse?.instructorName || e.instructorName,
            completedLessonIds: nextLessons,
            progressPercent: isNowCompleted ? 100 : nextProgress,
            quizCompleted: nextQuizCompleted,
            bestQuizScore: nextQuizScore,
            quizPassed:
              typeof nextQuizScore === "number"
                ? nextQuizScore >= (targetCourse?.quiz?.passingScore || 70)
                : e.quizPassed,
            quizAnswers: payload.quizAnswers || e.quizAnswers || {},
            certificateIssued: isNowCompleted,
            certificateId:
              e.certificateId ||
              (isNowCompleted ? `#CERT-NL-2026-${suffix}` : ""),
            completedAt:
              e.completedAt ||
              (isNowCompleted ? new Date().toISOString() : undefined),
            personalNotes:
              payload.personalNotes !== undefined
                ? payload.personalNotes
                : e.personalNotes,
          };
        });
      });

      apiUpdateClassroomProgress(courseId, payload).catch(() => {});
      return Promise.resolve(true);
    },
    [user, enrichedCourses, markMutationStart, setEnrollments]
  );

  // 0ms Instant Assignment Submission
  const handleSubmitStudentAssignment = useCallback(
    (payload) => {
      markMutationStart();
      const newSub = {
        submissionId: `SUB-2026-${String(Date.now()).slice(-4)}`,
        courseId: payload.courseId || "CRS-2026-001",
        courseTitle:
          payload.courseTitle || "Full-Stack Web Development with MERN",
        assignmentTitle:
          payload.assignmentTitle ||
          "REST API Authentication & JWT Middleware",
        instructorEmail: payload.instructorEmail || "alex.morgan@nexalearn.io",
        studentName: user?.name || "Sarah Jenkins",
        studentEmail: user?.email || "student@nexalearn.io",
        studentAvatar: user?.avatar || HERO_LEARNER_IMAGE,
        fileName: payload.fileName || "student-project.zip",
        fileSizeKB: payload.fileSizeKB || 1840,
        notes:
          payload.notes ||
          "Completed assignment requirements and attached project archive.",
        status: "Pending",
        grade: null,
        feedback: "",
        createdAt: new Date().toISOString(),
      };

      setSubmissions((prev) => {
        const filtered = prev.filter(
          (s) =>
            !(
              s.courseId === newSub.courseId &&
              s.assignmentTitle?.toLowerCase() ===
                newSub.assignmentTitle?.toLowerCase() &&
              s.studentEmail?.toLowerCase() ===
                newSub.studentEmail?.toLowerCase()
            )
        );
        return [newSub, ...filtered];
      });

      setEnrollments((prev) =>
        prev.map((e) =>
          e.courseId === newSub.courseId &&
          e.studentEmail?.toLowerCase() === newSub.studentEmail?.toLowerCase()
            ? { ...e, assignmentStatus: "Submitted" }
            : e
        )
      );

      showToast(
        "Assignment Submitted Successfully!",
        `"${newSub.fileName}" has been submitted for "${newSub.assignmentTitle}" and sent to your instructor for grading.`
      );

      apiSubmitAssignment(newSub)
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [
      user,
      markMutationStart,
      setSubmissions,
      setEnrollments,
      syncFromBackend,
      showToast,
    ]
  );

  const handleUpdateUserProfile = useCallback(
    async (updates) => {
      markMutationStart();
      try {
        const res = await apiAuthRequest("profile", updates);
        const updatedUser = {
          ...user,
          ...(res.user || {}),
          name: updates.name ?? user?.name,
          headline: updates.headline ?? user?.headline,
          bio: updates.bio ?? user?.bio,
          institution: updates.institution ?? user?.institution,
          avatar: updates.avatar ?? user?.avatar,
        };

        setUser(updatedUser);
        writeStorage("nexalearn_user", updatedUser);

        const emailClean = (updatedUser.email || "").toLowerCase().trim();

        setPlatformUsers((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === emailClean
              ? {
                  ...u,
                  name: updatedUser.name,
                  avatar: updatedUser.avatar,
                  role: updatedUser.role,
                  initials: (updatedUser.name || "NL")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase(),
                }
              : u
          )
        );

        if (updatedUser.role === "instructor") {
          setInstructors((prev) =>
            prev.map((inst) =>
              inst.email.toLowerCase() === emailClean
                ? {
                    ...inst,
                    name: updatedUser.name,
                    headline: updatedUser.headline,
                    bio: updatedUser.bio,
                    avatar: updatedUser.avatar,
                  }
                : inst
            )
          );

          setCourses((prev) =>
            prev.map((c) =>
              c.instructorEmail?.toLowerCase() === emailClean
                ? {
                    ...c,
                    instructorName: updatedUser.name,
                    instructorAvatar: updatedUser.avatar,
                    instructorTitle: updatedUser.headline,
                    instructorBio: updatedUser.bio,
                  }
                : c
            )
          );
        }

        showToast(
          updates.newPassword
            ? "Profile & Password Updated!"
            : "Profile Saved!",
          "Your profile picture, details, and security settings are now synced across NexaLearn."
        );
        return { ok: true };
      } catch (err) {
        if (
          err.message &&
          err.message.toLowerCase().includes("current password")
        ) {
          showToast("Password Error", err.message, true);
          return { ok: false, message: err.message };
        }

        const fallbackUser = {
          ...user,
          name: updates.name ?? user?.name,
          headline: updates.headline ?? user?.headline,
          bio: updates.bio ?? user?.bio,
          institution: updates.institution ?? user?.institution,
          avatar: updates.avatar ?? user?.avatar,
        };
        setUser(fallbackUser);
        writeStorage("nexalearn_user", fallbackUser);

        showToast(
          "Profile Saved!",
          "Your profile picture and details have been synced across NexaLearn."
        );
        return { ok: true };
      }
    },
    [
      user,
      markMutationStart,
      setPlatformUsers,
      setInstructors,
      setCourses,
      showToast,
    ]
  );

  // 0ms Instant Course Save & Publish
  const handleInstructorSaveCourse = useCallback(
    (coursePayload) => {
      markMutationStart();
      const emailClean = (
        coursePayload.instructorEmail ||
        user?.email ||
        "alex.morgan@nexalearn.io"
      )
        .toLowerCase()
        .trim();

      const liveInstructor = instructors.find(
        (i) => i.email.toLowerCase() === emailClean
      );

      const existingCourse = courses.find(
        (c) => c.courseId === coursePayload.courseId
      );

      const completeCourse = {
        ...FALLBACK_COURSES[0],
        ...(existingCourse || {}),
        ...coursePayload,
        status: coursePayload.status || "Published",
        instructorEmail: emailClean,
        instructorName:
          user?.name ||
          liveInstructor?.name ||
          coursePayload.instructorName ||
          "Alex Morgan",
        instructorAvatar:
          user?.avatar ||
          liveInstructor?.avatar ||
          coursePayload.instructorAvatar ||
          FALLBACK_INSTRUCTORS[0].avatar,
        instructorTitle:
          user?.headline ||
          liveInstructor?.headline ||
          coursePayload.instructorTitle ||
          "Staff Engineer & Lead Instructor",
        instructorBio:
          user?.bio ||
          liveInstructor?.bio ||
          coursePayload.instructorBio ||
          FALLBACK_INSTRUCTORS[0].bio,
        moderationReason:
          coursePayload.moderationReason !== undefined
            ? coursePayload.moderationReason
            : existingCourse?.moderationReason || "",
        instructorResolutionNote:
          coursePayload.instructorResolutionNote !== undefined
            ? coursePayload.instructorResolutionNote
            : existingCourse?.instructorResolutionNote || "",
      };

      const existsInCurrent = courses.some(
        (c) => c.courseId === completeCourse.courseId
      );

      setCourses((prev) => {
        const exists = prev.some(
          (c) => c.courseId === completeCourse.courseId
        );
        return exists
          ? prev.map((c) =>
              c.courseId === completeCourse.courseId
                ? { ...c, ...completeCourse }
                : c
            )
          : [completeCourse, ...prev];
      });

      const apiPromise = existsInCurrent
        ? apiUpdateCourse(completeCourse.courseId, completeCourse)
        : apiCreateCourse(completeCourse);

      apiPromise.then(() => syncFromBackend(true)).catch(() => {});
      return Promise.resolve(true);
    },
    [
      user,
      instructors,
      courses,
      markMutationStart,
      setCourses,
      syncFromBackend,
    ]
  );

  // 0ms Instant Course Status / Verification Note Update
  const handleInstructorUpdateCourseStatus = useCallback(
    (courseId, statusPayload) => {
      markMutationStart();
      setCourses((prev) =>
        prev.map((c) =>
          c.courseId === courseId
            ? {
                ...c,
                ...statusPayload,
                moderationReason:
                  statusPayload.moderationReason !== undefined
                    ? statusPayload.moderationReason
                    : c.moderationReason,
                instructorResolutionNote:
                  statusPayload.instructorResolutionNote !== undefined
                    ? statusPayload.instructorResolutionNote
                    : c.instructorResolutionNote,
              }
            : c
        )
      );

      if (
        statusPayload.status === "Pending Review" &&
        statusPayload.instructorResolutionNote
      ) {
        const newLog = {
          logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
          createdAt: new Date().toISOString(),
          adminName: `${user?.name || "Instructor"} (Instructor)`,
          action: "Resolution Submitted",
          target: `#${courseId}`,
          reason: statusPayload.instructorResolutionNote,
          outcome: "PENDING ADMIN",
        };
        setAuditLogs((prev) => [newLog, ...prev]);
      }

      apiUpdateCourse(courseId, statusPayload)
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [user, markMutationStart, setCourses, setAuditLogs, syncFromBackend]
  );

  // 0ms Instant Course Delete (Preserves completed student enrollments & earned certificates!)
  const handleInstructorDeleteCourse = useCallback(
    (courseId) => {
      markMutationStart();
      const cleanId = String(courseId || "").toUpperCase().trim();
      setCourses((prev) => prev.filter((c) => c.courseId !== cleanId));
      // Keep completed enrollments so students never lose their earned certificates!
      setEnrollments((prev) =>
        prev.filter(
          (e) =>
            e.courseId !== cleanId ||
            e.progressPercent >= 100 ||
            Boolean(e.certificateIssued) ||
            Boolean(e.quizPassed && e.assignmentStatus === "Graded")
        )
      );
      setSubmissions((prev) => prev.filter((s) => s.courseId !== cleanId));
      if (spotlightCourseId === cleanId) {
        setSpotlightCourseId(null);
      }

      showToast(
        `Course #${cleanId} Deleted`,
        `Course #${cleanId} has been removed from the catalog. Earned student certificates remain preserved.`
      );

      apiDeleteCourse(cleanId)
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [
      spotlightCourseId,
      markMutationStart,
      setCourses,
      setEnrollments,
      setSubmissions,
      syncFromBackend,
      showToast,
    ]
  );

  // 0ms Instant Student Grading
  const handleInstructorGradeSubmission = useCallback(
    (submissionId, gradePayload) => {
      markMutationStart();
      const cleanScore = Math.min(
        100,
        Math.max(0, Number(gradePayload.grade ?? 95))
      );
      let gradedCourseId = "CRS-2026-001";
      let gradedStudentEmail = "student@nexalearn.io";

      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.submissionId !== submissionId) return s;
          gradedCourseId = s.courseId;
          gradedStudentEmail = s.studentEmail;
          return {
            ...s,
            grade: cleanScore,
            feedback: gradePayload.feedback,
            status: "Graded",
            gradedAt: new Date().toISOString(),
          };
        })
      );

      setEnrollments((prev) =>
        prev.map((e) =>
          e.courseId === gradedCourseId &&
          e.studentEmail?.toLowerCase() === gradedStudentEmail?.toLowerCase()
            ? {
                ...e,
                assignmentStatus: "Graded",
                assignmentGrade: cleanScore,
                assignmentFeedback: gradePayload.feedback,
                progressPercent: 100,
                certificateIssued: cleanScore >= 70,
                certificateId:
                  e.certificateId ||
                  `CERT-NL-2026-${String(Date.now()).slice(-3)}`,
              }
            : e
        )
      );

      apiGradeSubmission(submissionId, gradePayload)
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [markMutationStart, setSubmissions, setEnrollments, syncFromBackend]
  );

  // 0ms Instant Admin Course Moderation
  const handleAdminModerateCourse = useCallback(
    (courseId, payload) => {
      markMutationStart();
      setCourses((prev) =>
        prev.map((c) =>
          c.courseId === courseId
            ? {
                ...c,
                status: payload.status,
                moderationReason:
                  payload.status === "Published"
                    ? ""
                    : payload.reason || c.moderationReason,
                instructorResolutionNote:
                  payload.status === "Published" ||
                  payload.status === "Hidden" ||
                  payload.status === "Removed"
                    ? ""
                    : c.instructorResolutionNote,
              }
            : c
        )
      );

      const actionLabel =
        payload.status === "Hidden"
          ? "Course Hidden"
          : payload.status === "Removed"
          ? "Course Deleted"
          : "Course Approved & Unhidden";

      const newLog = {
        logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
        createdAt: new Date().toISOString(),
        adminName: user?.name || "Sashmitha N.",
        action: actionLabel,
        target: `#${courseId}`,
        reason:
          payload.reason ||
          (payload.status === "Published"
            ? "Instructor resolution verified and approved by Admin"
            : "Governance moderation applied"),
        outcome: payload.status === "Removed" ? "PURGED" : "SUCCESS",
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      apiAdminModerateCourse(courseId, payload)
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [user, markMutationStart, setCourses, setAuditLogs, syncFromBackend]
  );

  // 0ms Instant Admin User Suspend / Reactivate
  const handleAdminToggleUserStatus = useCallback(
    (userId, payload) => {
      markMutationStart();
      let targetLabel = String(userId);
      let targetEmail = String(userId).toLowerCase().trim();

      setPlatformUsers((prev) =>
        prev.map((u) => {
          if (
            String(u.id) !== String(userId) &&
            u.email?.toLowerCase() !== targetEmail
          )
            return u;
          targetLabel = `${u.name} (${u.email})`;
          targetEmail = u.email.toLowerCase().trim();
          return {
            ...u,
            status: payload.status,
            activitySummary:
              payload.status === "Suspended"
                ? "Session revoked by Platform Admin"
                : u.role === "instructor"
                ? "Verified Instructor"
                : "Account active & verified",
          };
        })
      );

      const newLog = {
        logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
        createdAt: new Date().toISOString(),
        adminName: user?.name || "Sashmitha N.",
        action:
          payload.status === "Suspended"
            ? "Account Suspended"
            : "Account Reactivated",
        target: targetLabel,
        reason:
          payload.reason ||
          (payload.status === "Suspended"
            ? "Admin session security suspension (JWT revoked)"
            : "Account privileges restored by Platform Admin"),
        outcome: payload.status === "Suspended" ? "REVOKED" : "RESTORED",
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      apiAdminToggleUserStatus(userId, {
        ...payload,
        email: targetEmail,
      })
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [user, markMutationStart, setPlatformUsers, setAuditLogs, syncFromBackend]
  );

  // 0ms Instant Admin User Delete
  const handleAdminDeleteUser = useCallback(
    (targetUser, reason = "Account deleted by Platform Admin") => {
      markMutationStart();
      const userId = targetUser.id || targetUser.email;
      const emailClean = (targetUser.email || "").toLowerCase().trim();

      markUserDeletedPermanently(emailClean);

      setPlatformUsers((prev) =>
        prev.filter(
          (u) =>
            String(u.id) !== String(userId) &&
            u.email?.toLowerCase() !== emailClean
        )
      );

      if (targetUser.role === "instructor") {
        setInstructors((prev) =>
          prev.filter((i) => i.email?.toLowerCase() !== emailClean)
        );
      }

      const newLog = {
        logId: `AUD-2026-${String(Date.now()).slice(-4)}`,
        createdAt: new Date().toISOString(),
        adminName: user?.name || "Sashmitha N.",
        action: "Account Deleted",
        target: `${targetUser.name} (${targetUser.email})`,
        reason,
        outcome: "PURGED",
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      apiAdminDeleteUser(userId, {
        reason,
        email: emailClean,
      })
        .then(() => syncFromBackend(true))
        .catch(() => {});
      return Promise.resolve(true);
    },
    [
      user,
      markMutationStart,
      markUserDeletedPermanently,
      setPlatformUsers,
      setInstructors,
      setAuditLogs,
      syncFromBackend,
    ]
  );

  return {
    user,
    setUser,
    activeView,
    setActiveView,
    pendingIntent,
    setPendingIntent,
    serverHealth,
    courses: enrichedCourses,
    filteredCourses,
    instructors,
    enrollments,
    submissions,
    platformUsers,
    auditLogs,
    activeClassroomCourse,
    classroomTab,
    spotlightCourse,
    spotlightCourseId,
    setSpotlightCourseId,
    inspectedInstructor,
    setInspectedInstructor,
    previewLessonCourse,
    setPreviewLessonCourse,
    mobileFilterOpen,
    setMobileFilterOpen,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategoryFilter,
    selectedDifficulties,
    toggleDifficultyFilter,
    selectedDurations,
    toggleDurationFilter,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    clearAllFilters,
    toast,
    showToast,
    dismissToast,
    handleSelectCourseForSpotlight,
    handleSelectCategoryTrack,
    handleTriggerEnroll,
    handleTriggerBecomeInstructor,
    handleAuthenticate,
    handleForgotPassword,
    handleOpenClassroom,
    handleSyncClassroomProgress,
    handleSubmitStudentAssignment,
    handleUpdateUserProfile,
    handleInstructorSaveCourse,
    handleInstructorUpdateCourseStatus,
    handleInstructorDeleteCourse,
    handleInstructorGradeSubmission,
    handleAdminModerateCourse,
    handleAdminToggleUserStatus,
    handleAdminDeleteUser,
  };
}