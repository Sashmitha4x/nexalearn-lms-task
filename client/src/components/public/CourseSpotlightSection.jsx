import React, { useState, useEffect } from "react";
import { SPOTLIGHT_VIDEO_PREVIEW_IMAGE } from "../../constants/nexaConstants.js";
import { exportCourseSyllabusPDF } from "../../services/nexaService.js";

export default function CourseSpotlightSection({
  user,
  enrollments = [],
  course,
  allCourses = [],
  onCloseSpotlight,
  onEnrollClick,
  onOpenPreviewModal,
  onShareCourse,
  onOpenRoleWorkspace,
}) {
  const [openModuleIds, setOpenModuleIds] = useState([]);

  useEffect(() => {
    if (course?.modules?.length > 0) {
      const firstKey = course.modules[0].moduleId || "MOD-01";
      setOpenModuleIds([firstKey]);
    }
  }, [course?.courseId]);

  if (!course) return null;

  const toggleModule = (modId) => {
    setOpenModuleIds((prev) =>
      prev.includes(modId)
        ? prev.filter((id) => id !== modId)
        : [...prev, modId]
    );
  };

  const modules = course.modules || [];

  const isStudentRole = user?.role === "student";
  const isInstructorRole = user?.role === "instructor";
  const isAdminRole = user?.role === "admin";

  // Check if the logged-in student is already enrolled in this course
  const isAlreadyEnrolledStudent =
    isStudentRole &&
    enrollments.some(
      (e) =>
        e.courseId === course.courseId &&
        e.studentEmail?.toLowerCase() === user?.email?.toLowerCase()
    );

  const isCourseOwnerInstructor =
    isInstructorRole &&
    (course.instructorEmail?.toLowerCase() === user?.email?.toLowerCase() ||
      course.instructorName?.toLowerCase() === user?.name?.toLowerCase());
  const isOtherInstructorSyllabusRestricted =
    isInstructorRole && !isCourseOwnerInstructor;

  const instructorPublishedCoursesCount = Math.max(
    1,
    allCourses.filter(
      (c) =>
        c.status === "Published" &&
        (c.instructorEmail?.toLowerCase() ===
          course.instructorEmail?.toLowerCase() ||
          c.instructorName?.toLowerCase() ===
            course.instructorName?.toLowerCase())
    ).length
  );

  return (
    <section
      id="syllabus-spotlight"
      className="w-full py-12 sm:py-space-3xl bg-surface-container-low scroll-mt-16 animate-fade-up"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-margin">
        {/* Section Header */}
        <div className="mb-8 sm:mb-space-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider mb-2">
              <span>Curriculum Spotlight</span>
              <span>•</span>
              <span>#{course.courseId}</span>
              {isAlreadyEnrolledStudent && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  ✓ Enrolled in Your Learning Hub
                </span>
              )}
            </div>
            <h2 className="font-headline-xl text-headline-xl-mobile sm:text-headline-xl text-on-surface tracking-tight">
              {course.title}
            </h2>
            <p className="font-body-lg text-base sm:text-body-lg text-on-surface-variant mt-2 max-w-3xl">
              {course.overview || course.shortDescription}
            </p>
          </div>

          {onCloseSpotlight && (
            <button
              type="button"
              onClick={onCloseSpotlight}
              className="self-start px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:text-on-surface text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
              <span>Close Details</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-space-2xl items-start">
          {/* Left Main Content (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* What You'll Learn Grid */}
            <div className="bg-surface-container-lowest p-6 sm:p-space-xl rounded-2xl shadow-sm border border-outline-variant/25">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">
                What You&apos;ll Learn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(course.learningOutcomes || []).map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary-fixed text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">
                        check
                      </span>
                    </span>
                    <span className="font-body-md text-body-sm sm:text-body-md text-on-surface">
                      {outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Curriculum Accordion */}
            <div className="bg-surface-container-lowest p-6 sm:p-space-xl rounded-2xl shadow-sm border border-outline-variant/25">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Course Curriculum
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {modules.length}{" "}
                    {modules.length === 1 ? "Module" : "Modules"} •{" "}
                    {course.durationLabel || `${course.durationHours || 20}h`}{" "}
                    Total Runtime
                  </p>
                </div>
                <span className="font-caption-xs text-caption-xs bg-surface-container-high text-primary px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
                  {isOtherInstructorSyllabusRestricted
                    ? "Author-Protected Syllabus"
                    : "Interactive Labs Included"}
                </span>
              </div>

              {isOtherInstructorSyllabusRestricted ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[26px]">
                      lock
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-on-surface font-bold">
                    Instructor Curriculum &amp; Syllabus Protected
                  </h4>
                  <p className="font-body-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                    You are currently signed in with an{" "}
                    <strong className="text-on-surface">
                      Instructor Account ({user?.name})
                    </strong>
                    . To protect educator intellectual property, detailed lesson
                    syllabuses and assessment rubrics authored by{" "}
                    <strong className="text-on-surface">
                      {course.instructorName}
                    </strong>{" "}
                    are hidden for other instructors.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenRoleWorkspace?.("instructor")}
                      className="h-10 px-5 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold inline-flex items-center gap-2 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        space_dashboard
                      </span>
                      <span>Return to My Instructor Studio</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {modules.map((mod, idx) => {
                    const modKey = mod.moduleId || `MOD-0${idx + 1}`;
                    const isOpen = openModuleIds.includes(modKey);
                    return (
                      <div
                        key={modKey}
                        className="bg-surface-container-low rounded-xl overflow-hidden shadow-xs border border-outline-variant/20"
                      >
                        <button
                          type="button"
                          onClick={() => toggleModule(modKey)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 font-title-md text-title-md text-on-surface hover:text-primary transition-colors focus:outline-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-surface-container-highest text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {mod.number || String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="font-bold truncate">
                              {mod.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-on-surface-variant font-label-sm text-label-sm shrink-0">
                            <span className="hidden sm:inline">
                              {mod.durationSummary ||
                                `${(mod.lessons || []).length} Lessons`}
                            </span>
                            <span className="material-symbols-outlined transition-transform duration-200">
                              {isOpen ? "expand_less" : "expand_more"}
                            </span>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 space-y-2 animate-fade-up">
                            {(mod.lessons || []).map((les) => (
                              <div
                                key={les.lessonId}
                                onClick={() => {
                                  if (
                                    les.isFreePreview &&
                                    !isInstructorRole &&
                                    !isAdminRole
                                  ) {
                                    onOpenPreviewModal(course);
                                  }
                                }}
                                className={`p-3 bg-surface-container-lowest rounded-lg flex items-center justify-between gap-2 ${
                                  les.isFreePreview &&
                                  !isInstructorRole &&
                                  !isAdminRole
                                    ? "cursor-pointer hover:bg-surface-container-high/40 transition-colors"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                                      les.isFreePreview ||
                                      isAlreadyEnrolledStudent
                                        ? "text-primary"
                                        : "text-on-surface-variant"
                                    }`}
                                  >
                                    {les.isFreePreview ||
                                    isAlreadyEnrolledStudent
                                      ? "play_circle"
                                      : les.type === "quiz"
                                      ? "quiz"
                                      : "lock"}
                                  </span>
                                  <span className="font-body-sm text-body-sm text-on-surface truncate">
                                    {les.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {les.isFreePreview && (
                                    <span className="bg-secondary-fixed text-on-secondary-container font-caption-xs text-caption-xs px-2 py-0.5 rounded font-bold">
                                      Free Preview
                                    </span>
                                  )}
                                  <span className="font-caption-xs text-caption-xs text-on-surface-variant">
                                    {les.duration}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Meet Your Lead Instructor Bio */}
            <div className="bg-surface-container-lowest p-6 sm:p-space-xl rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col md:flex-row gap-6 items-start">
              <img
                src={course.instructorAvatar}
                alt={course.instructorName}
                className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-md"
              />
              <div className="space-y-1.5">
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">
                  Lead Instructor
                </span>
                <h4 className="font-headline-md text-headline-md text-on-surface">
                  {course.instructorName}
                </h4>
                <p className="font-label-md text-label-md text-on-surface-variant font-medium">
                  {course.instructorTitle}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold py-1">
                  <span className="flex items-center gap-1 text-on-surface">
                    <span className="material-symbols-outlined material-fill-1 text-[16px] text-amber-500">
                      star
                    </span>
                    {Number(course.rating || 4.9).toFixed(1)} Rating
                  </span>
                  <span className="text-on-surface-variant">
                    {course.enrolledCount || 0} Students Enrolled
                  </span>
                  <span className="text-on-surface-variant">
                    {instructorPublishedCoursesCount} Published{" "}
                    {instructorPublishedCoursesCount === 1
                      ? "Course"
                      : "Courses"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pt-1 leading-relaxed">
                  {course.instructorBio}
                </p>
              </div>
            </div>
          </div>

          {/* Right Enrollment / Role Action Summary Card (4 Cols Sticky) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/25 overflow-hidden p-6 space-y-6">
              <div
                onClick={() => {
                  if (!isOtherInstructorSyllabusRestricted && !isAdminRole) {
                    onOpenPreviewModal(course);
                  }
                }}
                className="relative w-full h-48 rounded-xl overflow-hidden bg-surface-container-high group cursor-pointer"
              >
                <img
                  src={course.thumbnail || SPOTLIGHT_VIDEO_PREVIEW_IMAGE}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-on-background/30 flex items-center justify-center group-hover:bg-on-background/20 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-surface-container-lowest text-primary-container flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[32px] ml-1">
                      {isOtherInstructorSyllabusRestricted
                        ? "lock"
                        : "play_arrow"}
                    </span>
                  </div>
                </div>
                <span className="absolute bottom-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-bold px-2.5 py-1 rounded">
                  {isOtherInstructorSyllabusRestricted
                    ? "Author Protected"
                    : "Preview Syllabus"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    ${course.price || 49}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant line-through">
                    ${course.originalPrice || 189}
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold bg-secondary-fixed px-2 py-0.5 rounded">
                    Free Audit Enabled
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-semibold">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                  <span>Includes Verified Certificate of Completion</span>
                </div>
              </div>

              <ul className="space-y-2.5 font-body-sm text-body-sm text-on-surface pt-1">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    all_inclusive
                  </span>
                  <span>Lifetime full access to all curriculum files</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    terminal
                  </span>
                  <span>
                    Auto-graded quizzes &amp; instructor-reviewed capstone
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    devices
                  </span>
                  <span>Accessible on desktop, mobile, and tablet</span>
                </li>
              </ul>

              {/* Role-Aware CTA Actions */}
              <div className="space-y-2.5 pt-2">
                {isAdminRole ? (
                  <button
                    type="button"
                    onClick={() => onOpenRoleWorkspace?.("admin")}
                    className="w-full h-11 rounded-[10px] bg-[#0F172A] text-white font-label-md text-label-md font-semibold hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      admin_panel_settings
                    </span>
                    <span>Moderate in Admin Console</span>
                  </button>
                ) : isCourseOwnerInstructor ? (
                  <button
                    type="button"
                    onClick={() => onOpenRoleWorkspace?.("instructor")}
                    className="w-full h-11 rounded-[10px] bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      edit_square
                    </span>
                    <span>Edit My Course in Studio</span>
                  </button>
                ) : isOtherInstructorSyllabusRestricted ? (
                  <div className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant/40 text-center text-xs text-on-surface-variant font-medium">
                    Logged in as Instructor • Student account required to enroll
                  </div>
                ) : isAlreadyEnrolledStudent ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">
                        check_circle
                      </span>
                      <span>You Are Already Enrolled in This Course</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenRoleWorkspace?.("student")}
                      className="w-full h-11 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        space_dashboard
                      </span>
                      <span>Go to Student Dashboard</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEnrollClick(course)}
                    className="w-full h-11 rounded-[10px] bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all flex items-center justify-center shadow-md shadow-primary-container/20"
                  >
                    Enroll in Course
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onShareCourse(course)}
                    className="h-10 rounded-[10px] bg-surface-container-low text-on-surface font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      share
                    </span>
                    <span>Share Course</span>
                  </button>

                  {!isOtherInstructorSyllabusRestricted && (
                    <button
                      type="button"
                      onClick={() => exportCourseSyllabusPDF(course)}
                      className="h-10 rounded-[10px] bg-surface-container-low text-on-surface font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        download
                      </span>
                      <span>Syllabus PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}