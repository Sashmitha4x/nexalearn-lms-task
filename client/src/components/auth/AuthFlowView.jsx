import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import NexaSelect from "../ui/NexaSelect.jsx";

const DOMAIN_MAP = {
  se: "Software Engineering",
  ai: "AI & Data Science",
  cloud: "Cloud & DevOps",
  ux: "UI/UX Design",
};

const COHORT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDT4X2Xq1uROV_8q8B79pfJpJ2d0eXNnfbYvW1GV9oTNDQEj3JxgnjlDICR0s0q0vp-5qvz865_eQa6lWZZNdQIfmz-J-6X_Jd1qrb9lZdsb30Gpof4McYMBo6MfxIXejs2pWa2TnfOwZOi58GJF9x9udZsdB3avtxABGVd8aP4U1EW-OHCvgKDVaDF9K9XE5dnZBa3e9lNbftNrsEqM6UmrlEYgizjJzagCchnQyg";

export default function AuthFlowView({
  pendingIntent,
  spotlightCourse,
  onAuthenticate,
  onForgotPassword,
  onBackToCatalog,
  onShowToast,
}) {
  // Determine initial tab based on how the guest arrived at the Auth screen
  const [activeTab, setActiveTab] = useState(() => {
    if (pendingIntent?.type === "instructor") return "instructor";
    if (pendingIntent?.type === "enroll") return "student";
    return "signin";
  }); // "signin" | "student" | "instructor"

  useEffect(() => {
    if (pendingIntent?.type === "instructor") {
      setActiveTab("instructor");
    } else if (pendingIntent?.type === "enroll") {
      setActiveTab("student");
    }
  }, [pendingIntent]);

  // Error Banner State
  const [errorBanner, setErrorBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tab 1: Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Tab 2: Student Sign Up State
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentConfirmPwd, setStudentConfirmPwd] = useState("");
  const [showStudentPwd, setShowStudentPwd] = useState(false);
  const [studentTerms, setStudentTerms] = useState(true);

  // Tab 3: Instructor Sign Up State
  const [instName, setInstName] = useState("");
  const [instEmail, setInstEmail] = useState("");
  const [instPassword, setInstPassword] = useState("");
  const [showInstPwd, setShowInstPwd] = useState(false);
  const [instHeadline, setInstHeadline] = useState("");
  const [instDomainKey, setInstDomainKey] = useState("se");
  const [instBio, setInstBio] = useState("");

  // Forgot Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Dynamic 4-Bar Password Strength Evaluator
  const getPasswordStrength = (val) => {
    if (!val) {
      return { score: 0, label: "Enter password (min 6 characters)" };
    }
    let score = 0;
    if (val.length >= 6) score = 1;
    if (val.length >= 8 && /[A-Z]/.test(val)) score = 2;
    if (val.length >= 10 && /[0-9]/.test(val)) score = 3;
    if (val.length >= 12 && /[^A-Za-z0-9]/.test(val)) score = 4;
    if (score === 0 && val.length > 0) score = 1;

    const labels = [
      "Enter password",
      "Weak Password (1/4)",
      "Medium Password (2/4)",
      "Strong Password (3/4)",
      "Excellent Security (4/4)",
    ];
    return { score, label: labels[score] };
  };

  const pwdStrength = getPasswordStrength(studentPassword);

  const targetCourseId =
    pendingIntent?.courseId || spotlightCourse?.courseId || "CRS-2026-001";
  const targetCourseTitle =
    pendingIntent?.courseTitle ||
    spotlightCourse?.title ||
    "Full-Stack Web Development with MERN";

  const activeTabIndex =
    activeTab === "signin" ? 0 : activeTab === "student" ? 1 : 2;

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner("");
    setSubmitting(true);
    const result = await onAuthenticate("signin", {
      email: signInEmail.trim(),
      password: signInPassword,
    });
    setSubmitting(false);
    if (!result.ok && result.message) {
      setErrorBanner(result.message);
    }
  };

  const handleStudentRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner("");
    if (studentPassword !== studentConfirmPwd) {
      setErrorBanner("Passwords do not match. Please re-enter your password.");
      return;
    }
    if (studentPassword.length < 6) {
      setErrorBanner("Password must be at least 6 characters long.");
      return;
    }
    setSubmitting(true);
    const result = await onAuthenticate("register", {
      name: studentName.trim(),
      email: studentEmail.trim(),
      password: studentPassword,
      role: "student",
      headline: "Full-Stack Engineering Learner",
      specialty: "Software Engineering",
    });
    setSubmitting(false);
    if (!result.ok && result.message) {
      setErrorBanner(result.message);
    }
  };

  const handleInstructorRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorBanner("");
    if (instPassword.length < 6) {
      setErrorBanner("Instructor password must be at least 6 characters long.");
      return;
    }
    setSubmitting(true);
    const result = await onAuthenticate("register", {
      name: instName.trim(),
      email: instEmail.trim(),
      password: instPassword,
      role: "instructor",
      headline: instHeadline.trim() || "Senior Educator & Architect",
      specialty: DOMAIN_MAP[instDomainKey] || "Software Engineering",
      bio:
        instBio.trim() ||
        "Experienced practitioner and educator on NexaLearn.",
    });
    setSubmitting(false);
    if (!result.ok && result.message) {
      setErrorBanner(result.message);
    }
  };

  const handleOAuthClick = (provider) => {
    onShowToast(
      `${provider} OAuth Ready`,
      `Use your email & password below or sign in with student@nexalearn.io / alex.morgan@nexalearn.io.`
    );
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSubmitting(true);
    await onForgotPassword(resetEmail.trim());
    setResetSuccess(true);
    setTimeout(() => {
      setResetSubmitting(false);
      setResetSuccess(false);
      setResetModalOpen(false);
      setResetEmail("");
    }, 1200);
  };

  return (
    <>
      {/* ===================================================================
          FORGOT PASSWORD RECOVERY MODAL (PORTAL)
         =================================================================== */}
      {resetModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#191c1e]/40 backdrop-blur-sm"
            onClick={() => setResetModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-outline-variant/30 space-y-5 animate-pop-in"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#dae2fd] flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container text-xl">
                    key
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>

              <div>
                <h4 className="font-headline-sm text-headline-sm text-[#191c1e] font-bold">
                  Reset Password
                </h4>
                <p className="font-body-sm text-sm text-on-surface-variant mt-1">
                  Enter your registered email address and we will dispatch a
                  secure 15-minute recovery token.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block font-label-md text-xs text-[#191c1e] font-semibold mb-1.5"
                  >
                    Account Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="learner@nexalearn.io"
                    className="w-full h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] font-body-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>

                {resetSuccess && (
                  <div className="p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] font-body-sm text-xs text-center font-medium">
                    Reset instructions sent! Please check your inbox.
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="w-1/2 h-12 rounded-[10px] bg-[#eceef0] hover:bg-[#e0e3e5] text-[#191c1e] font-label-md text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-1/2 h-12 rounded-[10px] bg-primary-container hover:bg-primary disabled:opacity-60 text-white font-label-md text-xs font-semibold transition-colors shadow-sm"
                  >
                    {resetSubmitting ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          MAIN SPLIT-SCREEN SHELL
          Desktop (lg+): Fixed 100vh viewport split where Left Panel is 100% locked
          and Right Panel scrolls smoothly without shifting the center seam!
         =================================================================== */}
      <div className="flex flex-col lg:flex-row w-full min-h-screen lg:h-screen lg:overflow-hidden bg-[#131b2e] lg:bg-white">
        {/* =================================================================
            MOBILE-ONLY HERO HEADER (<1024px)
            Gives mobile users the rich dark-navy NexaLearn branding & glow
           ================================================================= */}
        <div className="lg:hidden relative px-5 pt-5 pb-9 bg-[#131b2e] text-white overflow-hidden">
          <div className="absolute -top-20 -right-16 w-60 h-60 bg-primary-container/35 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/25 rounded-full blur-2xl pointer-events-none"></div>

          {/* Mobile Top Row */}
          <div className="relative z-10 flex items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shadow-md shadow-primary/30">
                <span className="material-symbols-outlined material-fill-1 text-white text-xl">
                  school
                </span>
              </div>
              <div>
                <span className="font-headline-sm text-lg font-bold text-white block leading-none">
                  NexaLearn
                </span>
                <span className="text-[10px] text-[#c3c0ff] uppercase tracking-wider font-semibold">
                  Learning Cloud
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onBackToCatalog}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold inline-flex items-center gap-1 backdrop-blur-md transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">
                arrow_back
              </span>
              <span>Catalog</span>
            </button>
          </div>

          {/* Mobile Hero Headline & Active Course Chip */}
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e2dfff] animate-ping"></span>
              <span className="text-[10px] text-[#e2dfff] uppercase tracking-wider font-semibold">
                Fall 2026 Admissions Open
              </span>
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
              Your Learning Journey{" "}
              <span className="bg-gradient-to-r from-[#c3c0ff] via-[#e2dfff] to-white bg-clip-text text-transparent">
                Starts Here.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#dae2fd]/90 leading-relaxed max-w-md">
              Master Engineering, AI, Cloud, and Design with interactive modules
              and verifiable certificates.
            </p>
          </div>
        </div>

        {/* =================================================================
            LEFT PANEL (DESKTOP lg+): Locked 45% Dark Navy Showcase
            NEVER resizes, stretches, or shifts when switching tabs!
           ================================================================= */}
        <aside className="relative hidden lg:flex lg:w-[45%] lg:h-screen lg:shrink-0 flex-col justify-between p-10 xl:p-12 bg-[#131b2e] text-white overflow-hidden select-none border-r border-white/10 shadow-[10px_0_30px_rgba(19,27,46,0.06)] z-10">
          {/* Ambient Lighting & Mesh Gradients */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/30 rounded-full blur-[110px] pointer-events-none"></div>
          <div className="absolute bottom-10 right-0 w-[420px] h-[420px] bg-primary/20 rounded-full blur-[130px] pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none"></div>

          {/* Top Branding */}
          <button
            type="button"
            onClick={onBackToCatalog}
            className="relative z-10 flex items-center gap-3 text-left group self-start"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined material-fill-1 text-white text-2xl">
                school
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-2xl font-bold tracking-tight text-white leading-none">
                NexaLearn
              </span>
              <span className="font-label-sm text-[11px] text-[#c3c0ff] uppercase tracking-wider mt-1 font-semibold">
                Autonomous Learning Cloud
              </span>
            </div>
          </button>

          {/* Editorial Body Copy & Highlights (Locked Position) */}
          <div className="relative z-10 my-auto max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md mb-4">
              <span className="w-2 h-2 rounded-full bg-[#e2dfff] animate-ping"></span>
              <span className="font-label-sm text-[11px] text-[#e2dfff] uppercase tracking-wider font-semibold">
                Fall 2026 Admissions Open
              </span>
            </div>

            <h1 className="font-display-hero text-[40px] xl:text-[46px] font-bold text-white leading-[1.14] tracking-tight mb-4">
              Your Learning Journey{" "}
              <span className="bg-gradient-to-r from-[#c3c0ff] via-[#e2dfff] to-white bg-clip-text text-transparent">
                Starts Here.
              </span>
            </h1>

            <p className="font-body-md text-sm xl:text-base text-[#dae2fd] leading-relaxed mb-7">
              Master Software Engineering, AI &amp; Machine Learning, Cloud
              Systems, and Design with industry-vetted curriculums, real-time
              code execution, and cryptographic verifiable certificates.
            </p>

            {/* Floating Glassmorphic Learner Achievement Card */}
            <div className="rounded-2xl p-5 xl:p-6 bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl space-y-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label-sm text-[11px] text-[#c3c0ff] uppercase tracking-wider font-semibold">
                      Enrolled Course
                    </span>
                    <span className="font-label-sm text-[11px] text-white/50 font-semibold">
                      • #{targetCourseId}
                    </span>
                  </div>
                  <h2 className="font-title-md text-base xl:text-lg font-semibold text-white truncate">
                    {targetCourseTitle}
                  </h2>
                </div>
                <span className="p-2 rounded-xl bg-white/10 text-[#e2dfff] shrink-0">
                  <span className="material-symbols-outlined material-fill-1 text-xl">
                    verified
                  </span>
                </span>
              </div>

              {/* Progress Visual */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
                  <span className="text-white/80">Syllabus Completion</span>
                  <span className="text-[#e2dfff] font-bold">75%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden relative">
                  <div className="h-full bg-primary-container rounded-full w-3/4 shadow-[0_0_12px_rgba(79,70,229,0.9)]"></div>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <div className="rounded-xl p-2.5 bg-white/5 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#e2dfff] text-lg">
                    check_circle
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60 font-semibold">
                      Quiz Score
                    </p>
                    <p className="text-xs xl:text-sm text-white font-semibold truncate">
                      92% State Arch.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl p-2.5 bg-white/5 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#dae2fd] text-lg">
                    workspace_premium
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60 font-semibold">
                      Credential Status
                    </p>
                    <p className="text-xs xl:text-sm text-[#e2dfff] font-semibold truncate">
                      Certificate Ready
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Pill & Cohort */}
              <div className="pt-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={COHORT_AVATAR}
                    alt="Active Learner"
                    className="w-8 h-8 rounded-full object-cover shadow-sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-white font-semibold">
                      Alex Morgan
                    </span>
                    <span className="text-[11px] text-white/60">
                      Enrolled 3 weeks ago
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#e2dfff]/20 text-[#e2dfff] text-[11px] font-semibold">
                  Active Cohort
                </span>
              </div>
            </div>
          </div>

          {/* Trust Badges Footer */}
          <div className="relative z-10 flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 text-white/60 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#e2dfff]">
                lock
              </span>
              256-bit SSL Encrypted
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#e2dfff]">
                verified_user
              </span>
              SOC2 Type II Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#e2dfff]">
                shield
              </span>
              GDPR Compliant
            </span>
          </div>
        </aside>

        {/* =================================================================
            RIGHT PANEL: Independent Scrollable Form Area (55% Desktop, 100% Mobile)
            Rounded top sheet on mobile (-mt-4 rounded-t-[28px])
           ================================================================= */}
        <div className="w-full lg:w-[55%] flex-1 lg:h-screen lg:overflow-y-auto bg-white rounded-t-[28px] lg:rounded-none -mt-4 lg:mt-0 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] lg:shadow-none">
          <div className="min-h-full flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10 md:px-14">
            {/* Main Form Wrapper Container (Max 480px) */}
            <div className="w-full max-w-[480px] flex flex-col">
              {/* Contextual Course Enrollment Reservation Banner */}
              <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-[#dae2fd]/45 border border-[#c7d2fe] flex items-start gap-3 shadow-xs">
                <span className="material-symbols-outlined material-fill-1 text-primary-container text-xl mt-0.5 shrink-0">
                  auto_awesome
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-[#0f0069] font-semibold">
                    {pendingIntent?.type === "instructor"
                      ? "Instructor Onboarding Track Active"
                      : "Course Reservation Active"}
                  </span>
                  <p className="text-xs text-[#565e74] leading-snug mt-0.5 break-words">
                    {pendingIntent?.type === "instructor" ? (
                      <>
                        Sign in or submit your educator application below to
                        unlock the{" "}
                        <span className="font-semibold text-[#191c1e]">
                          NexaLearn Course &amp; Assessment Studio
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Sign in or create an account to enroll in{" "}
                        <span className="font-semibold text-[#191c1e]">
                          #{targetCourseId} ({targetCourseTitle})
                        </span>
                        . Your seat is held for 15 minutes.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* ===========================================================
                  ANIMATED SLIDING PILL TAB SWITCHER (MOBILE & DESKTOP SAFE)
                 =========================================================== */}
              <div className="relative p-1 rounded-xl bg-[#eceef2] grid grid-cols-3 mb-6 select-none overflow-hidden">
                {/* Hardware-Accelerated Sliding White Pill */}
                <div
                  className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-lg bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: `translate3d(${activeTabIndex * 100}%, 0, 0)`,
                  }}
                />

                {[
                  {
                    id: "signin",
                    shortLabel: "Sign In",
                    fullLabel: "Sign In",
                  },
                  {
                    id: "student",
                    shortLabel: "Student",
                    fullLabel: "Student Sign Up",
                  },
                  {
                    id: "instructor",
                    shortLabel: "Instructor",
                    fullLabel: "Instructor Sign Up",
                  },
                ].map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(t.id);
                        setErrorBanner("");
                      }}
                      className={`relative z-10 py-2.5 px-1.5 text-center text-xs font-semibold rounded-lg transition-colors duration-200 truncate ${
                        isActive
                          ? "text-[#191c1e]"
                          : "text-[#565e74] hover:text-[#191c1e]"
                      }`}
                    >
                      <span className="sm:hidden">{t.shortLabel}</span>
                      <span className="hidden sm:inline">{t.fullLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Social OAuth Row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => handleOAuthClick("Google")}
                  className="h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] hover:bg-[#eceef0] border border-[#e2e8f0] transition-colors flex items-center justify-center gap-2.5 text-xs font-semibold text-[#191c1e] shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="truncate">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthClick("GitHub")}
                  className="h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] hover:bg-[#eceef0] border border-[#e2e8f0] transition-colors flex items-center justify-center gap-2.5 text-xs font-semibold text-[#191c1e] shadow-xs"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      fillRule="evenodd"
                    />
                  </svg>
                  <span className="truncate">GitHub</span>
                </button>
              </div>

              {/* Section Divider */}
              <div className="relative flex items-center justify-center mb-5">
                <div className="w-full h-px bg-[#e6e8ea]"></div>
                <span className="absolute px-3 bg-white text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                  or continue with email
                </span>
              </div>

              {/* Inline Validation / Error Alert Banner */}
              {errorBanner && (
                <div className="mb-4 p-3 rounded-[10px] bg-[#ffdad6] border border-[#dc2626]/30 text-[#93000a] flex items-center justify-between gap-2 animate-tab-glide">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#ba1a1a] shrink-0">
                      error
                    </span>
                    <span className="text-xs font-medium">{errorBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorBanner("")}
                    className="text-[#93000a] hover:opacity-80 p-0.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              )}

              {/* ===========================================================
                  SMOOTH ANIMATED FORM STAGE (Keyed by activeTab)
                 =========================================================== */}
              <div key={activeTab} className="animate-tab-glide">
                {/* TAB 1: SIGN IN FORM */}
                {activeTab === "signin" && (
                  <form onSubmit={handleSignInSubmit} className="space-y-4">
                    <div className="mb-1">
                      <h3 className="font-headline-md text-xl sm:text-2xl font-semibold text-[#191c1e] tracking-tight">
                        Welcome Back
                      </h3>
                      <p className="text-xs sm:text-sm text-[#464555]">
                        Sign in to resume your learning track.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="signin-email"
                        className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          id="signin-email"
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="student@nexalearn.io or alex.morgan@nexalearn.io"
                          className="w-full h-12 px-4 pr-10 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container focus:ring-3 focus:ring-primary-container/15 transition-all"
                        />
                        <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-[#777587] pointer-events-none text-xl">
                          mail
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="signin-password"
                          className="text-xs text-[#191c1e] font-semibold"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setResetModalOpen(true)}
                          className="text-[11px] text-primary-container font-semibold hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="signin-password"
                          type={showSignInPwd ? "text" : "password"}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full h-12 px-4 pr-11 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container focus:ring-3 focus:ring-primary-container/15 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPwd((p) => !p)}
                          className="absolute right-3.5 top-3 text-[#777587] hover:text-[#191c1e] transition-colors p-0.5"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showSignInPwd ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-primary-container focus:ring-primary-container bg-[#f2f4f6] accent-primary-container cursor-pointer"
                        />
                        <span className="text-xs font-medium text-[#191c1e]">
                          Remember me for 30 days
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setErrorBanner((prev) =>
                            prev
                              ? ""
                              : "Invalid email or password. 2 attempts left before lockout."
                          )
                        }
                        className="text-[11px] font-semibold text-[#777587] hover:text-[#ba1a1a] transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          info
                        </span>
                        <span>Test error state</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 mt-2 rounded-[10px] bg-primary-container hover:bg-[#4338ca] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-primary-container/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>
                        {submitting
                          ? "Connecting Session..."
                          : "Sign In to NexaLearn"}
                      </span>
                      <span className="material-symbols-outlined text-lg">
                        arrow_forward
                      </span>
                    </button>
                  </form>
                )}

                {/* TAB 2: STUDENT SIGN UP FORM */}
                {activeTab === "student" && (
                  <form
                    onSubmit={handleStudentRegisterSubmit}
                    className="space-y-3.5"
                  >
                    <div className="mb-1">
                      <h3 className="font-headline-md text-xl sm:text-2xl font-semibold text-[#191c1e] tracking-tight">
                        Create Student Account
                      </h3>
                      <p className="text-xs sm:text-sm text-[#464555]">
                        Join over 45,000 engineers and creators worldwide.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="student-name"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Full Name
                        </label>
                        <input
                          id="student-name"
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Sarah Jenkins"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="student-email"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Email Address
                        </label>
                        <input
                          id="student-email"
                          type="email"
                          required
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="sarah@domain.com"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="student-password"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="student-password"
                            type={showStudentPwd ? "text" : "password"}
                            required
                            minLength={6}
                            value={studentPassword}
                            onChange={(e) => setStudentPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full h-11 sm:h-12 px-4 pr-10 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStudentPwd((p) => !p)}
                            className="absolute right-3 top-3 text-[#777587] hover:text-[#191c1e] transition-colors p-0.5"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showStudentPwd
                                ? "visibility_off"
                                : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="student-confirm-pwd"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Confirm Password
                        </label>
                        <input
                          id="student-confirm-pwd"
                          type={showStudentPwd ? "text" : "password"}
                          required
                          value={studentConfirmPwd}
                          onChange={(e) => setStudentConfirmPwd(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>
                    </div>

                    {/* Dynamic 4-Segment Password Strength Bar */}
                    <div className="pt-0.5 space-y-1">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className={`rounded-full transition-colors duration-300 ${
                              idx <= pwdStrength.score
                                ? "bg-primary-container"
                                : "bg-[#e0e3e5]"
                            }`}
                          ></div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-primary font-semibold">
                          {pwdStrength.label}
                        </span>
                        <span className="text-[#777587] font-medium">
                          256-Bit Encrypted
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          required
                          checked={studentTerms}
                          onChange={(e) => setStudentTerms(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-primary-container focus:ring-primary-container bg-[#f2f4f6] accent-primary-container cursor-pointer shrink-0"
                        />
                        <span className="text-xs text-[#464555] leading-snug">
                          I agree to the{" "}
                          <span className="text-primary-container font-semibold">
                            Terms of Service
                          </span>
                          ,{" "}
                          <span className="text-primary-container font-semibold">
                            Honor Code
                          </span>
                          , and{" "}
                          <span className="text-primary-container font-semibold">
                            Privacy Policy
                          </span>
                          .
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 mt-2 rounded-[10px] bg-primary-container hover:bg-[#4338ca] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-primary-container/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>
                        {submitting
                          ? "Creating Student Account..."
                          : "Create Account & Enroll"}
                      </span>
                      <span className="material-symbols-outlined text-lg">
                        how_to_reg
                      </span>
                    </button>
                  </form>
                )}

                {/* TAB 3: INSTRUCTOR SIGN UP FORM */}
                {activeTab === "instructor" && (
                  <form
                    onSubmit={handleInstructorRegisterSubmit}
                    className="space-y-3.5"
                  >
                    <div className="mb-1">
                      <h3 className="font-headline-md text-xl sm:text-2xl font-semibold text-[#191c1e] tracking-tight">
                        Apply as an Instructor
                      </h3>
                      <p className="text-xs sm:text-sm text-[#464555]">
                        Publish industry curriculums and mentor upcoming talent.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="inst-name"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Full Name
                        </label>
                        <input
                          id="inst-name"
                          type="text"
                          required
                          value={instName}
                          onChange={(e) => setInstName(e.target.value)}
                          placeholder="Dr. Elena Vance"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="inst-email"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Work or Academic Email
                        </label>
                        <input
                          id="inst-email"
                          type="email"
                          required
                          value={instEmail}
                          onChange={(e) => setInstEmail(e.target.value)}
                          placeholder="elena@university.edu"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="inst-headline"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Professional Headline
                        </label>
                        <input
                          id="inst-headline"
                          type="text"
                          required
                          value={instHeadline}
                          onChange={(e) => setInstHeadline(e.target.value)}
                          placeholder="Principal Cloud Architect"
                          className="w-full h-11 sm:h-12 px-4 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="inst-pwd"
                          className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                        >
                          Account Password
                        </label>
                        <div className="relative">
                          <input
                            id="inst-pwd"
                            type={showInstPwd ? "text" : "password"}
                            required
                            minLength={6}
                            value={instPassword}
                            onChange={(e) => setInstPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full h-11 sm:h-12 px-4 pr-10 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowInstPwd((p) => !p)}
                            className="absolute right-3 top-3 text-[#777587] hover:text-[#191c1e]"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showInstPwd ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#191c1e] font-semibold mb-1.5">
                        Primary Teaching Domain
                      </label>
                      <NexaSelect
                        size="lg"
                        icon="school"
                        value={instDomainKey}
                        onChange={setInstDomainKey}
                        options={[
                          {
                            value: "se",
                            label:
                              "Software Engineering & Distributed Systems",
                          },
                          {
                            value: "ai",
                            label: "Artificial Intelligence & Data Science",
                          },
                          {
                            value: "cloud",
                            label: "Cloud Computing & Site Reliability",
                          },
                          {
                            value: "ux",
                            label: "Design Systems & Product Interface",
                          },
                        ]}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inst-bio"
                        className="block text-xs text-[#191c1e] font-semibold mb-1.5"
                      >
                        Short Bio &amp; Pedagogy
                      </label>
                      <textarea
                        id="inst-bio"
                        rows="2"
                        value={instBio}
                        onChange={(e) => setInstBio(e.target.value)}
                        placeholder="Tell us about your teaching experience, industry projects, or open-source credentials..."
                        className="w-full p-3 rounded-[10px] bg-[#f2f4f6] border border-[#e2e8f0] text-[#191c1e] text-sm placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:border-primary-container transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 mt-2 rounded-[10px] bg-primary-container hover:bg-[#4338ca] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-primary-container/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>
                        {submitting
                          ? "Provisioning Studio..."
                          : "Submit Instructor Application"}
                      </span>
                      <span className="material-symbols-outlined text-lg">
                        send
                      </span>
                    </button>
                  </form>
                )}
              </div>

              {/* Bottom Return Link */}
              <div className="mt-7 pt-3 text-center">
                <button
                  type="button"
                  onClick={onBackToCatalog}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#464555] hover:text-primary-container transition-colors group"
                >
                  <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">
                    arrow_back
                  </span>
                  <span>Back to Public Course Catalog (Continue as Guest)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}