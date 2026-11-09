import React from "react";
import { useNexaLearn } from "./hooks/useNexaLearn.js";
import Toast from "./components/ui/Toast.jsx";
import PublicNavbar from "./components/layout/PublicNavbar.jsx";
import PublicFooter from "./components/layout/PublicFooter.jsx";
import HeroSection from "./components/public/HeroSection.jsx";
import CategoryDomainsSection from "./components/public/CategoryDomainsSection.jsx";
import CourseCatalogSection from "./components/public/CourseCatalogSection.jsx";
import CourseSpotlightSection from "./components/public/CourseSpotlightSection.jsx";
import InstructorDirectorySection from "./components/public/InstructorDirectorySection.jsx";
import InstructorProfileModal from "./components/public/InstructorProfileModal.jsx";
import FreePreviewModal from "./components/public/FreePreviewModal.jsx";
import AuthFlowView from "./components/auth/AuthFlowView.jsx";
import StudentDashboardView from "./components/student/StudentDashboardView.jsx";
import ClassroomQuizView from "./components/classroom/ClassroomQuizView.jsx";
import InstructorStudioView from "./components/instructor/InstructorStudioView.jsx";
import AdminGovernanceView from "./components/admin/AdminGovernanceView.jsx";

export default function App() {
  const {
    user,
    setUser,
    activeView,
    setActiveView,
    pendingIntent,
    setPendingIntent,
    serverHealth,
    courses,
    filteredCourses,
    instructors,
    enrollments,
    submissions,
    platformUsers,
    auditLogs,
    activeClassroomCourse,
    classroomTab,
    spotlightCourse,
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
  } = useNexaLearn();

  const handleNavigateSection = (hashSelector) => {
    if (activeView !== "public") {
      setActiveView("public");
    }
    setTimeout(() => {
      if (hashSelector === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(hashSelector);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleShareCourse = (course) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    showToast(
      "Course Link Copied",
      `Direct link to "${course.title}" (#${course.courseId}) copied to clipboard.`
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("nexalearn_token");
    localStorage.removeItem("nexalearn_user");
    setPendingIntent(null);
    setUser(null);
    setActiveView("public");
    showToast("Signed Out", "Returned to Public Guest Browsing Mode.");
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col">
      <Toast toast={toast} onDismiss={dismissToast} />

      <InstructorProfileModal
        instructor={inspectedInstructor}
        courses={courses}
        onClose={() => setInspectedInstructor(null)}
        onSelectCourse={handleSelectCourseForSpotlight}
      />

      <FreePreviewModal
        course={previewLessonCourse}
        onClose={() => setPreviewLessonCourse(null)}
        onEnroll={handleTriggerEnroll}
      />

      {/* SCREEN 1: PUBLIC WEBSITE, COURSE CATALOG, SINGLE SYLLABUS SPOTLIGHT & INSTRUCTORS */}
      {activeView === "public" && (
        <>
          <PublicNavbar
            user={user}
            onNavigateSection={handleNavigateSection}
            onQuickSearchClick={() => handleNavigateSection("#catalog")}
            onSignInClick={() => {
              setPendingIntent(null);
              setActiveView("auth");
            }}
            onGetStartedClick={() => {
              setPendingIntent(null);
              setActiveView("auth");
            }}
            onOpenDashboard={() =>
              setActiveView(
                user?.role === "admin"
                  ? "admin"
                  : user?.role === "instructor"
                  ? "instructor"
                  : "student"
              )
            }
            onLogout={handleLogout}
          />

          <main className="w-full pt-[76px] bg-surface flex-1">
            <HeroSection
              onExploreCourses={() => handleNavigateSection("#catalog")}
              onBecomeInstructor={handleTriggerBecomeInstructor}
            />

            <CategoryDomainsSection
              selectedCategories={selectedCategories}
              onSelectCategory={handleSelectCategoryTrack}
            />

            <CourseCatalogSection
              user={user}
              enrollments={enrollments}
              courses={filteredCourses}
              allCourses={courses}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategoryFilter}
              selectedDifficulties={selectedDifficulties}
              onToggleDifficulty={toggleDifficultyFilter}
              selectedDurations={selectedDurations}
              onToggleDuration={toggleDurationFilter}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onClearAllFilters={clearAllFilters}
              mobileFilterOpen={mobileFilterOpen}
              onSetMobileFilterOpen={setMobileFilterOpen}
              onSelectCourse={handleSelectCourseForSpotlight}
              onOpenStudentDashboard={() => setActiveView("student")}
            />

            {/* SINGLE CURRICULUM SPOTLIGHT SECTION */}
            <CourseSpotlightSection
              user={user}
              enrollments={enrollments}
              course={spotlightCourse}
              allCourses={courses}
              onCloseSpotlight={() => setSpotlightCourseId(null)}
              onEnrollClick={handleTriggerEnroll}
              onOpenPreviewModal={setPreviewLessonCourse}
              onShareCourse={handleShareCourse}
              onOpenRoleWorkspace={setActiveView}
            />

            <InstructorDirectorySection
              instructors={instructors}
              onInspectInstructor={setInspectedInstructor}
              onGetStartedClick={() => {
                setPendingIntent(null);
                setActiveView("auth");
              }}
            />
          </main>

          <PublicFooter
            onSelectCategory={handleSelectCategoryTrack}
            onNavigateSection={handleNavigateSection}
          />
        </>
      )}

      {/* SCREEN 2: STANDALONE SPLIT-SCREEN AUTHENTICATION FLOW */}
      {activeView === "auth" && (
        <AuthFlowView
          pendingIntent={pendingIntent}
          spotlightCourse={spotlightCourse}
          onAuthenticate={handleAuthenticate}
          onForgotPassword={handleForgotPassword}
          onBackToCatalog={() => {
            setPendingIntent(null);
            setActiveView("public");
          }}
          onShowToast={showToast}
        />
      )}

      {/* SCREEN 3: STUDENT DASHBOARD, ASSIGNMENTS UPLOAD, GRADES & CERTIFICATES */}
      {activeView === "student" && (
        <StudentDashboardView
          user={user}
          courses={courses}
          enrollments={enrollments}
          submissions={submissions}
          onExploreCatalog={() => {
            clearAllFilters();
            handleNavigateSection("#catalog");
          }}
          onEnrollCourse={handleTriggerEnroll}
          onOpenClassroom={handleOpenClassroom}
          onSubmitAssignment={handleSubmitStudentAssignment}
          onUpdateProfile={handleUpdateUserProfile}
          onLogout={handleLogout}
          onShowToast={showToast}
        />
      )}

      {/* SCREEN 4: INTERACTIVE CLASSROOM PLAYER, CURRICULUM ACCORDION & QUIZ EXPERIENCE */}
      {activeView === "classroom" && (
        <ClassroomQuizView
          user={user}
          course={activeClassroomCourse}
          enrollments={enrollments}
          initialMode={classroomTab}
          onBackToDashboard={() => setActiveView("student")}
          onSyncProgress={handleSyncClassroomProgress}
          onShowToast={showToast}
        />
      )}

      {/* SCREEN 5: INSTRUCTOR STUDIO, COURSE BUILDER & STUDENT GRADING WORKSPACE */}
      {activeView === "instructor" && (
        <InstructorStudioView
          user={user}
          courses={courses}
          enrollments={enrollments}
          submissions={submissions}
          onSaveCourse={handleInstructorSaveCourse}
          onUpdateCourseStatus={handleInstructorUpdateCourseStatus}
          onDeleteCourse={handleInstructorDeleteCourse}
          onGradeSubmission={handleInstructorGradeSubmission}
          onUpdateProfile={handleUpdateUserProfile}
          onOpenPublicCatalog={() => setActiveView("public")}
          onLogout={handleLogout}
          onShowToast={showToast}
        />
      )}

      {/* SCREEN 6: PLATFORM ADMIN GOVERNANCE CONSOLE */}
      {activeView === "admin" && (
        <AdminGovernanceView
          user={user}
          serverHealth={serverHealth}
          courses={courses}
          platformUsers={platformUsers}
          auditLogs={auditLogs}
          onModerateCourse={handleAdminModerateCourse}
          onToggleUserStatus={handleAdminToggleUserStatus}
          onDeleteUser={handleAdminDeleteUser}
          onOpenPublicCatalog={() => setActiveView("public")}
          onLogout={handleLogout}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}