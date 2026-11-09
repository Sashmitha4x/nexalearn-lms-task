import React, { useState, useEffect, useMemo, useRef } from "react";

const STUDENT_HEADER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD9MM_B9sGQWLMWwYZ7u1scUfnDt7EZN8ORrhoBbu5cVAZuWgFW2J1G1_QLr4pvtMvGKIs2PrtyFrooQ3tC6p5d4yDlLgVYxkcCNSOhgVdRRv5mxdq6ifCF0geHiRqqEC3FhXh_Dqld8bCAC7v-o1zt2ItQm0gGX7-xCj-VYmkNpwTJqr7zv-au6uyvGqCfpfuT4cP7I5yOI88Z6GS1sVNoHLhHHsOGDAw9A9gec1Q";

const INSTRUCTOR_OVERLAY_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI";

const CODE_SNIPPET_TEXT = `function UserProfileCard({ title, role = "Developer", badgeCount }) {
  return (
    <section className="profile-badge-node">
      <h3>{title}</h3>
      <span>{role} • Active Quests: {badgeCount}</span>
    </section>
  );
}`;

const formatSeconds = (totalSec) => {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function ClassroomQuizView({
  user,
  course,
  enrollments = [],
  initialMode = "video",
  onBackToDashboard,
  onSyncProgress,
  onShowToast,
}) {
  const playerContainerRef = useRef(null);
  const quizSectionRef = useRef(null);
  const courseId = course?.courseId || "CRS-2026-001";

  // Smooth scroll helper that NEVER alters window.location.hash
  const scrollToQuizSection = () => {
    quizSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Find current student's persistent enrollment for this course
  const currentEnrollment = useMemo(() => {
    const emailClean = (user?.email || "student@nexalearn.io")
      .toLowerCase()
      .trim();
    return enrollments.find(
      (e) =>
        e.courseId === courseId &&
        e.studentEmail?.toLowerCase() === emailClean
    );
  }, [enrollments, courseId, user]);

  // Dynamically load the course's instructor-authored quiz questions
  const activeQuizQuestions = useMemo(() => {
    const customQuestions = course?.quiz?.questions;
    const keys = ["A", "B", "C", "D"];
    if (Array.isArray(customQuestions) && customQuestions.length > 0) {
      return customQuestions.map((q, idx) => {
        const opts =
          Array.isArray(q.options) && q.options.length >= 2
            ? q.options
            : ["Option A", "Option B", "Option C", "Option D"];
        const correctIdx = Number(q.correctIndex ?? 0);
        return {
          number: idx + 1,
          concept: q.concept || `Question ${idx + 1}`,
          question: q.question,
          options: opts.slice(0, 4).map((label, oIdx) => ({
            key: keys[oIdx],
            label,
          })),
          correctKey: keys[correctIdx] || "A",
          explanation:
            q.explanation ||
            "Verified against the course instructor's assessment rubric.",
        };
      });
    }
    return [
      {
        number: 1,
        concept: "React Hooks",
        question:
          "Which React hook is used to synchronize a component with an external system or side effect?",
        options: [
          { key: "A", label: "useState" },
          { key: "B", label: "useEffect" },
          { key: "C", label: "useMemo" },
          { key: "D", label: "useRef" },
        ],
        correctKey: "B",
        explanation:
          "useEffect synchronizes a component with external systems after rendering.",
      },
    ];
  }, [course]);

  const totalQuestionsCount = activeQuizQuestions.length;
  const passingThreshold = Number(course?.quiz?.passingScore || 70);
  const timeLimitSecs = Number(course?.quiz?.timeLimitMinutes || 5) * 60;

  // Curriculum Modules from Course
  const courseModules = useMemo(() => {
    if (Array.isArray(course?.modules) && course.modules.length > 0) {
      return course.modules.map((m, mIdx) => ({
        moduleId: m.moduleId || `MOD-0${mIdx + 1}`,
        number: m.number || String(mIdx + 1).padStart(2, "0"),
        title: m.title,
        durationSummary: m.durationSummary || "2 Lessons",
        lessons: (m.lessons || []).map((l, lIdx) => ({
          id: l.lessonId || `LES-${mIdx + 1}0${lIdx + 1}`,
          title: l.title,
          duration: l.duration || "20m",
          durationSec: 1095,
        })),
      }));
    }
    return [];
  }, [course]);

  const [expandedModuleIds, setExpandedModuleIds] = useState(() =>
    courseModules.map((m) => m.moduleId)
  );
  const [activeLessonId, setActiveLessonId] = useState(
    () => courseModules[0]?.lessons?.[0]?.id || "LES-101"
  );
  const [curriculumSearch, setCurriculumSearch] = useState("");

  const completedLessonIds = currentEnrollment?.completedLessonIds || [
    "LES-101",
  ];
  const courseProgressPercent = currentEnrollment?.progressPercent ?? 50;

  // Video Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(140);
  const [durationSec, setDurationSec] = useState(1095);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.25);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  // Study Notes
  const [activeInfoTab, setActiveInfoTab] = useState("overview");
  const [noteInput, setNoteInput] = useState("");

  // 3-Stage Quiz State: "not_started" | "in_progress" | "completed"
  const [quizStage, setQuizStage] = useState(() =>
    currentEnrollment?.quizCompleted ? "completed" : "not_started"
  );
  const [selectedAnswers, setSelectedAnswers] = useState(
    () => currentEnrollment?.quizAnswers || {}
  );
  const [quizSecondsLeft, setQuizSecondsLeft] = useState(timeLimitSecs);

  useEffect(() => {
    if (currentEnrollment?.quizCompleted) {
      setQuizStage("completed");
      setSelectedAnswers(currentEnrollment.quizAnswers || {});
    } else {
      setQuizStage("not_started");
      setSelectedAnswers({});
      setQuizSecondsLeft(timeLimitSecs);
    }
  }, [
    courseId,
    currentEnrollment?.quizCompleted,
    currentEnrollment?.quizAnswers,
    timeLimitSecs,
  ]);

  useEffect(() => {
    if (initialMode === "quiz") {
      setTimeout(() => {
        scrollToQuizSection();
      }, 120);
    }
  }, [initialMode]);

  // Video Playback Timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => {
        if (prev + 1 >= durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return prev + 1;
      });
    }, Math.round(1000 / playbackSpeed));
    return () => clearInterval(interval);
  }, [isPlaying, durationSec, playbackSpeed]);

  // Submit Quiz Handler (Manual Submit or Timer Auto-Submit)
  const finalizeQuizSubmission = (isAutoTimeout = false) => {
    let correctCount = 0;
    activeQuizQuestions.forEach((q) => {
      if (selectedAnswers[q.number] === q.correctKey) {
        correctCount += 1;
      }
    });
    const percent = Math.round((correctCount / totalQuestionsCount) * 100);
    const passed = percent >= passingThreshold;

    setQuizStage("completed");

    if (onSyncProgress) {
      onSyncProgress(courseId, {
        quizCompleted: true,
        quizScore: percent,
        quizAnswers: selectedAnswers,
        progressPercent: 100,
        certificateIssued: true,
      });
    }
    onShowToast(
      isAutoTimeout
        ? `Time's Up! Quiz Auto-Submitted (${percent}%)`
        : `Quiz Submitted! Score: ${correctCount}/${totalQuestionsCount} (${percent}%)`,
      passed
        ? `Congratulations! You passed the quiz (${percent}%). Review your answers below.`
        : `You scored ${percent}% (Passing score: ${passingThreshold}%). Review the correct and wrong answers below.`,
      !passed
    );
  };

  // Quiz Countdown Timer (ONLY runs when quizStage === "in_progress")
  useEffect(() => {
    if (quizStage !== "in_progress") return;

    const timer = setInterval(() => {
      setQuizSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeQuizSubmission(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  });

  // Final Score Summary for Stage 3 ("completed")
  const completedScoreSummary = useMemo(() => {
    let correctCount = 0;
    activeQuizQuestions.forEach((q) => {
      if (selectedAnswers[q.number] === q.correctKey) {
        correctCount += 1;
      }
    });
    const percent =
      currentEnrollment?.bestQuizScore ??
      Math.round((correctCount / totalQuestionsCount) * 100);
    return {
      correctCount,
      wrongCount: totalQuestionsCount - correctCount,
      total: totalQuestionsCount,
      percent,
      passed: percent >= passingThreshold,
    };
  }, [
    activeQuizQuestions,
    selectedAnswers,
    currentEnrollment?.bestQuizScore,
    totalQuestionsCount,
    passingThreshold,
  ]);

  const activeLesson = useMemo(() => {
    for (const mod of courseModules) {
      const found = mod.lessons.find((l) => l.id === activeLessonId);
      if (found) return found;
    }
    return {
      id: "LES-101",
      title: "1.1 Scope, Closures & Component Architecture",
      duration: "20m",
    };
  }, [courseModules, activeLessonId]);

  const filteredModules = useMemo(() => {
    const q = curriculumSearch.toLowerCase().trim();
    if (!q) return courseModules;
    return courseModules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.lessons.some((l) => l.title.toLowerCase().includes(q))
    );
  }, [courseModules, curriculumSearch]);

  const playedPercent = Math.min(
    100,
    Math.max(0, Math.round((currentTimeSec / durationSec) * 100))
  );

  const handleMarkLessonCompleted = async () => {
    const totalLessonsInCourse = Math.max(
      1,
      courseModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)
    );
    const updatedCompletedIds = completedLessonIds.includes(activeLesson.id)
      ? completedLessonIds
      : [...completedLessonIds, activeLesson.id];

    const calculatedPct = Math.min(
      100,
      Math.round((updatedCompletedIds.length / totalLessonsInCourse) * 100)
    );
    const nextProgress = Math.max(
      courseProgressPercent + 25,
      calculatedPct,
      quizStage === "completed" ? 100 : 0
    );
    const clampedProgress = Math.min(100, nextProgress);

    if (onSyncProgress) {
      await onSyncProgress(courseId, {
        completedLessonId: activeLesson.id,
        progressPercent: clampedProgress,
        certificateIssued: clampedProgress >= 100,
      });
    }
    onShowToast(
      clampedProgress >= 100
        ? "Course 100% Completed! Certificate Unlocked!"
        : "Lesson Completed!",
      `"${activeLesson.title}" marked complete (${clampedProgress}% course progress).`
    );
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    const stamped = `[${formatSeconds(currentTimeSec)}] ${noteInput.trim()}`;
    const nextNotes = currentEnrollment?.personalNotes
      ? `${stamped}\n${currentEnrollment.personalNotes}`
      : stamped;
    setNoteInput("");
    if (onSyncProgress) {
      await onSyncProgress(courseId, { personalNotes: nextNotes });
    }
    onShowToast("Note Saved", "Saved to your persistent course journal.");
  };

  const handleStartQuiz = () => {
    setSelectedAnswers({});
    setQuizSecondsLeft(timeLimitSecs);
    setQuizStage("in_progress");
    onShowToast(
      "Quiz Timer Started!",
      `You have ${
        course?.quiz?.timeLimitMinutes || 5
      } minutes to complete ${totalQuestionsCount} questions.`
    );
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="bg-[#f8f9ff] font-body-md text-[#0b1c30] antialiased min-h-screen flex flex-col">
      {/* FOCUSED CLASSROOM TOP BAR (68px Height) */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-[68px] w-full px-4 sm:px-gutter flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-2 shrink-0 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white shadow-xs shrink-0">
                <span className="material-symbols-outlined material-fill-1 text-[18px]">
                  school
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-[#0b1c30] hidden sm:inline-block tracking-tight font-bold">
                NexaLearn
              </span>
            </button>

            <div className="h-5 w-px bg-outline-variant/40 shrink-0 hidden md:block"></div>

            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-[#0b1c30] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              <span>Back to Student Hub</span>
            </button>

            <div className="h-5 w-px bg-outline-variant/40 shrink-0 hidden lg:block"></div>

            <div className="min-w-0 hidden md:block">
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                #{courseId} • {course?.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end gap-1 w-44 md:w-52">
              <div className="flex items-center justify-between w-full font-label-sm text-label-sm text-on-surface-variant">
                <span className="font-semibold text-primary">
                  {courseProgressPercent}% Completed
                </span>
                <span>
                  {quizStage === "completed" ? "Quiz Done ✓" : "In Progress"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-300"
                  style={{ width: `${courseProgressPercent}%` }}
                ></div>
              </div>
            </div>

            <img
              alt="Student"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#e5eeff]"
              src={user?.avatar || STUDENT_HEADER_AVATAR}
            />
          </div>
        </div>
      </header>

      {/* MAIN CLASSROOM & 3-STAGE QUIZ WORKSPACE */}
      <main className="w-full pt-[68px] bg-[#f8f9ff] flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
          {/* UPPER WORKSPACE: 70/30 CLASSROOM SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 70% REGION: VIDEO PLAYER & LESSON CONTENT */}
            <section className="lg:col-span-8 flex flex-col space-y-6">
              <div
                ref={playerContainerRef}
                className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#213145] shadow-md group flex flex-col justify-between select-none"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#213145] via-[#213145]/80 to-[#213145]/40 z-0"></div>

                {/* Video Top Header */}
                <div className="relative z-10 p-4 flex items-center justify-between gap-3 bg-gradient-to-b from-[#213145]/90 to-transparent">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white font-label-sm text-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#71f8e4] animate-ping"></span>
                    HD 1080p • #{courseId}
                  </span>

                  <div className="flex items-center gap-2 bg-[#213145]/80 backdrop-blur-md px-3 py-1 rounded-full">
                    <img
                      className="w-6 h-6 rounded-full object-cover"
                      alt="Instructor"
                      src={course?.instructorAvatar || INSTRUCTOR_OVERLAY_AVATAR}
                    />
                    <span className="text-white font-label-sm text-label-sm">
                      Instructor: {course?.instructorName || "Alex Morgan"}
                    </span>
                  </div>
                </div>

                {/* Center Play/Pause Action */}
                <div className="relative z-10 self-center flex flex-col items-center gap-3 px-4">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-white shadow-xl hover:scale-105 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[36px] ml-0.5">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  <div className="px-4 py-1.5 rounded-full bg-[#213145]/90 backdrop-blur text-white font-headline-sm text-xs sm:text-headline-sm text-center">
                    {activeLesson.title}
                  </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="relative z-10 w-full px-4 pb-3 pt-6 bg-gradient-to-t from-[#213145] to-transparent flex flex-col gap-2">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.min(
                        1,
                        Math.max(0, (e.clientX - rect.left) / rect.width)
                      );
                      setCurrentTimeSec(Math.round(ratio * durationSec));
                    }}
                    className="relative w-full h-2 cursor-pointer flex items-center"
                  >
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${playedPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlaying((p) => !p)}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <span>
                        {formatSeconds(currentTimeSec)} /{" "}
                        {formatSeconds(durationSec)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPlaybackSpeed((s) => (s >= 2 ? 1 : s + 0.25))
                        }
                        className="px-2 py-0.5 rounded bg-white/15"
                      >
                        {playbackSpeed}x
                      </button>
                      <button
                        type="button"
                        onClick={() => setCaptionsEnabled((p) => !p)}
                        className={`px-2 py-0.5 rounded ${
                          captionsEnabled ? "bg-primary" : "bg-white/15"
                        }`}
                      >
                        CC
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar Below Video Player */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#e2e8f0]/60">
                <div>
                  <h1 className="font-headline-lg text-lg sm:text-xl text-[#0b1c30] font-bold">
                    {activeLesson.title}
                  </h1>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Duration: {activeLesson.duration} • {course?.category}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkLessonCompleted}
                    className="px-4 py-2 rounded-lg bg-[#006d62] hover:bg-[#00534a] text-white font-label-md text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      check_circle
                    </span>
                    <span>
                      {completedLessonIds.includes(activeLesson.id)
                        ? "Lesson Completed ✓"
                        : "Mark Lesson Completed"}
                    </span>
                  </button>

                  {/* FIXED BUTTON: Smoothly scrolls to Quiz section without changing URL hash */}
                  <button
                    type="button"
                    onClick={scrollToQuizSection}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white font-label-md text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      quiz
                    </span>
                    <span>Go to Course Quiz ↓</span>
                  </button>
                </div>
              </div>

              {/* Lesson Overview & Notes Card */}
              <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0]/60 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab("overview")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                      activeInfoTab === "overview"
                        ? "bg-primary text-white"
                        : "bg-[#eff4ff] text-[#0b1c30]"
                    }`}
                  >
                    Lesson Code &amp; Outcomes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab("notes")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                      activeInfoTab === "notes"
                        ? "bg-primary text-white"
                        : "bg-[#eff4ff] text-[#0b1c30]"
                    }`}
                  >
                    Study Notes
                  </button>
                </div>

                {activeInfoTab === "overview" ? (
                  <pre className="bg-[#213145] text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    {CODE_SNIPPET_TEXT}
                  </pre>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows="2"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Write a study note for this lesson..."
                      className="w-full rounded-lg border border-slate-200 p-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                    >
                      Save Note
                    </button>
                    {currentEnrollment?.personalNotes && (
                      <pre className="p-3 rounded-lg bg-[#eff4ff] text-xs whitespace-pre-wrap font-sans">
                        {currentEnrollment.personalNotes}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT 30% REGION: CURRICULUM SIDEBAR */}
            <aside className="lg:col-span-4 flex flex-col space-y-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0]/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-md text-base font-bold text-[#0b1c30]">
                    Course Curriculum
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e2dfff] text-[#0f0069] text-xs font-semibold">
                    {courseProgressPercent}% Done
                  </span>
                </div>

                <input
                  type="text"
                  value={curriculumSearch}
                  onChange={(e) => setCurriculumSearch(e.target.value)}
                  placeholder="Search lessons..."
                  className="w-full bg-[#eff4ff] px-3.5 py-2 rounded-lg text-xs outline-none"
                />

                <div className="space-y-2.5">
                  {filteredModules.map((mod) => {
                    const isExpanded = expandedModuleIds.includes(mod.moduleId);
                    return (
                      <div
                        key={mod.moduleId}
                        className="rounded-xl overflow-hidden bg-[#eff4ff] border border-slate-200/60"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModuleIds((prev) =>
                              prev.includes(mod.moduleId)
                                ? prev.filter((id) => id !== mod.moduleId)
                                : [...prev, mod.moduleId]
                            )
                          }
                          className="w-full p-3 flex items-center justify-between text-left bg-[#e5eeff]/70"
                        >
                          <span className="text-xs font-bold text-[#0b1c30] truncate">
                            {mod.title}
                          </span>
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-2 space-y-1">
                            {mod.lessons.map((les) => {
                              const isPlayingNow = les.id === activeLessonId;
                              const isDone = completedLessonIds.includes(
                                les.id
                              );
                              return (
                                <button
                                  key={les.id}
                                  type="button"
                                  onClick={() => setActiveLessonId(les.id)}
                                  className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs ${
                                    isPlayingNow
                                      ? "bg-white font-bold text-primary shadow-xs"
                                      : "hover:bg-white/60 text-[#0b1c30]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-[16px] text-primary">
                                      {isDone ? "check_circle" : "play_circle"}
                                    </span>
                                    <span className="truncate">{les.title}</span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                                    {les.duration}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Quick Sidebar Quiz Button */}
                  <button
                    type="button"
                    onClick={scrollToQuizSection}
                    className="w-full p-3 rounded-xl bg-[#dce9ff] hover:bg-[#d3e4fe] transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        quiz
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0b1c30] block truncate">
                          {course?.quiz?.title || "Course Evaluation Quiz"}
                        </span>
                        <span className="text-[11px] text-slate-600 block">
                          {totalQuestionsCount} Questions • Pass:{" "}
                          {passingThreshold}%
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold shrink-0">
                      {quizStage === "completed"
                        ? `${completedScoreSummary.percent}%`
                        : "Start"}
                    </span>
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* =================================================================
              SIMPLE, LOGICALLY PERFECT 3-STAGE COURSE QUIZ SECTION
             ================================================================= */}
          <section
            ref={quizSectionRef}
            id="assessment-section"
            className="space-y-6 pt-4 scroll-mt-20"
          >
            {/* Quiz Header Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-primary via-primary-container to-[#006d62] p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                  Course Quiz • #{courseId}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold mt-1">
                  {course?.quiz?.title || "Course Mastery Evaluation Quiz"}
                </h2>
                <p className="text-xs sm:text-sm text-white/85 mt-0.5">
                  {totalQuestionsCount} Questions • Passing Score:{" "}
                  {passingThreshold}% • Time Limit:{" "}
                  {course?.quiz?.timeLimitMinutes || 5} Minutes (Single Attempt)
                </p>
              </div>

              <div className="shrink-0">
                {quizStage === "not_started" && (
                  <span className="px-4 py-2 rounded-xl bg-white/15 font-semibold text-xs inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">
                      timer_off
                    </span>
                    Timer Paused (Click Start Below)
                  </span>
                )}
                {quizStage === "in_progress" && (
                  <span className="px-4 py-2 rounded-xl bg-amber-400 text-[#0b1c30] font-extrabold text-sm inline-flex items-center gap-1.5 shadow-md animate-pulse">
                    <span className="material-symbols-outlined text-[18px]">
                      timer
                    </span>
                    Time Left: {formatSeconds(quizSecondsLeft)}
                  </span>
                )}
                {quizStage === "completed" && (
                  <span className="px-4 py-2 rounded-xl bg-white text-[#006d62] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">
                      lock
                    </span>
                    Quiz Completed &amp; Locked (
                    {completedScoreSummary.percent}%)
                  </span>
                )}
              </div>
            </div>

            {/* STAGE 1: NOT STARTED */}
            {quizStage === "not_started" && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-8 text-center max-w-2xl mx-auto shadow-sm space-y-5 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-[#eff4ff] text-primary flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[34px]">
                    quiz
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0b1c30]">
                    Ready to Start Your Course Quiz?
                  </h3>
                  <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Once you click <strong>Start Quiz Now</strong>, the{" "}
                    <strong>
                      {course?.quiz?.timeLimitMinutes || 5}-minute countdown
                      timer
                    </strong>{" "}
                    will begin. If time runs out, your quiz will be
                    automatically submitted.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                  <div className="p-3 rounded-xl bg-[#eff4ff]">
                    <span className="text-slate-500 block">Questions</span>
                    <span className="font-bold text-base text-[#0b1c30]">
                      {totalQuestionsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#eff4ff]">
                    <span className="text-slate-500 block">Time Limit</span>
                    <span className="font-bold text-base text-[#0b1c30]">
                      {course?.quiz?.timeLimitMinutes || 5} Mins
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#eff4ff]">
                    <span className="text-slate-500 block">Attempts</span>
                    <span className="font-bold text-base text-primary">
                      1 Attempt
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="px-8 py-3.5 rounded-xl bg-primary-container hover:bg-primary text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    play_arrow
                  </span>
                  <span>Start Quiz Now (Start Timer)</span>
                </button>
              </div>
            )}

            {/* STAGE 2: IN PROGRESS */}
            {quizStage === "in_progress" && (
              <div className="bg-white rounded-2xl border-2 border-primary-container/30 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#eff4ff] border border-indigo-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                      Quiz In Progress • Answered {answeredCount} of{" "}
                      {totalQuestionsCount}
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Select one answer per question and click{" "}
                      <strong>Submit Quiz Now</strong> before the timer reaches
                      00:00.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <span className="px-3.5 py-1.5 rounded-full bg-white text-[#0b1c30] font-mono font-bold text-sm border border-indigo-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-error">
                        timer
                      </span>
                      {formatSeconds(quizSecondsLeft)}
                    </span>
                    <button
                      type="button"
                      onClick={() => finalizeQuizSubmission(false)}
                      className="px-5 py-2 rounded-xl bg-[#006d62] hover:bg-[#00534a] text-white font-bold text-xs shadow-sm"
                    >
                      Submit Quiz Now
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {activeQuizQuestions.map((q) => {
                    const chosenKey = selectedAnswers[q.number];
                    return (
                      <div
                        key={q.number}
                        className="p-5 rounded-2xl bg-[#f8f9ff] border border-[#e2e8f0] space-y-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#e5eeff] text-primary text-xs font-bold">
                            Question {q.number} of {totalQuestionsCount} •{" "}
                            {q.concept}
                          </span>
                          {chosenKey && (
                            <span className="text-xs font-semibold text-[#006d62]">
                              ✓ Selected Option {chosenKey}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-[#0b1c30]">
                          {q.question}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt) => {
                            const isSelected = chosenKey === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [q.number]: opt.key,
                                  }))
                                }
                                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                  isSelected
                                    ? "bg-[#e5eeff] border-2 border-primary font-bold text-primary shadow-xs"
                                    : "bg-white border-slate-200 hover:bg-slate-50 text-[#0b1c30] font-medium"
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isSelected
                                      ? "bg-primary text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <span className="text-xs sm:text-sm flex-1">
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Note: Once submitted, this quiz is completed and cannot be
                    retaken.
                  </span>
                  <button
                    type="button"
                    onClick={() => finalizeQuizSubmission(false)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-container hover:bg-primary text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      check_circle
                    </span>
                    <span>Submit Final Quiz Answers</span>
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: COMPLETED & LOCKED (NO RETAKE — SHOWS CORRECT & WRONG ANSWERS) */}
            {quizStage === "completed" && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm space-y-6 animate-fade-up">
                <div className="p-6 rounded-2xl bg-[#eff4ff] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Official Quiz Result (Attempt Completed &amp; Locked)
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#0b1c30]">
                      Score: {completedScoreSummary.percent}%{" "}
                      <span className="text-lg font-semibold text-slate-500">
                        ({completedScoreSummary.correctCount} /{" "}
                        {completedScoreSummary.total} Correct)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Correct Answers:{" "}
                      <strong className="text-emerald-700">
                        {completedScoreSummary.correctCount}
                      </strong>{" "}
                      • Wrong Answers:{" "}
                      <strong className="text-rose-600">
                        {completedScoreSummary.wrongCount}
                      </strong>{" "}
                      • Retakes are disabled for completed evaluations.
                    </p>
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        completedScoreSummary.passed
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {completedScoreSummary.passed
                          ? "verified"
                          : "error_outline"}
                      </span>
                      <span>
                        {completedScoreSummary.passed
                          ? `PASSED (Required: ${passingThreshold}%)`
                          : `COMPLETED (Required: ${passingThreshold}%)`}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    Complete Answer Review (Correct &amp; Wrong Answers)
                  </h3>

                  {activeQuizQuestions.map((q) => {
                    const studentKey = selectedAnswers[q.number] || null;
                    const isCorrect = studentKey === q.correctKey;

                    return (
                      <div
                        key={q.number}
                        className={`p-5 rounded-2xl border-2 space-y-3 ${
                          isCorrect
                            ? "bg-emerald-50/40 border-emerald-300"
                            : "bg-rose-50/40 border-rose-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0b1c30]">
                            Question {q.number}: {q.concept}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isCorrect ? "check_circle" : "cancel"}
                            </span>
                            <span>
                              {isCorrect
                                ? "Correct Answer"
                                : studentKey
                                ? "Wrong Answer"
                                : "Unanswered (Time Expired)"}
                            </span>
                          </span>
                        </div>

                        <p className="text-sm font-bold text-[#0b1c30]">
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt) => {
                            const isThisCorrect = opt.key === q.correctKey;
                            const isThisStudentWrong =
                              !isCorrect && opt.key === studentKey;

                            return (
                              <div
                                key={opt.key}
                                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                  isThisCorrect
                                    ? "bg-emerald-100/90 border-emerald-500 text-emerald-950 font-bold"
                                    : isThisStudentWrong
                                    ? "bg-rose-100 border-rose-500 text-rose-950 font-bold"
                                    : "bg-white border-slate-200 text-slate-600"
                                }`}
                              >
                                <span>
                                  <strong>{opt.key}.</strong> {opt.label}
                                </span>
                                {isThisCorrect && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isThisStudentWrong && (
                                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold shrink-0">
                                    ✕ Your Wrong Answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-700">
                          <strong className="text-[#0b1c30]">
                            Explanation:
                          </strong>{" "}
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}