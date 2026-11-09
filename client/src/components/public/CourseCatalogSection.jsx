import React, { useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import NexaSelect from "../ui/NexaSelect.jsx";
import {
  COURSE_CATEGORIES,
  DIFFICULTY_LEVELS,
  DURATION_BUCKETS,
  SORT_OPTIONS,
} from "../../constants/nexaConstants.js";

export default function CourseCatalogSection({
  user,
  enrollments = [],
  courses = [],
  allCourses = [],
  searchQuery,
  onSearchChange,
  selectedCategories = [],
  onToggleCategory,
  selectedDifficulties = [],
  onToggleDifficulty,
  selectedDurations = [],
  onToggleDuration,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortChange,
  onClearAllFilters,
  mobileFilterOpen,
  onSetMobileFilterOpen,
  onSelectCourse,
  onOpenStudentDashboard,
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const publishedCatalogCourses = useMemo(() => {
    const source = allCourses.length > 0 ? allCourses : courses;
    return source.filter((c) => (c.status || "Published") === "Published");
  }, [allCourses, courses]);

  const categoryCounts = useMemo(() => {
    const map = {};
    COURSE_CATEGORIES.forEach((cat) => {
      map[cat.id] = publishedCatalogCourses.filter(
        (c) => c.category === cat.id
      ).length;
    });
    return map;
  }, [publishedCatalogCourses]);

  const enrolledCourseIds = useMemo(() => {
    if (user?.role !== "student" || !user?.email) return new Set();
    const cleanEmail = user.email.toLowerCase().trim();
    return new Set(
      enrollments
        .filter((e) => e.studentEmail?.toLowerCase() === cleanEmail)
        .map((e) => e.courseId)
    );
  }, [user, enrollments]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedDurations.length > 0 ||
    minRating > 0;

  const renderFilterControls = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          Filters
        </h3>
        <button
          type="button"
          onClick={onClearAllFilters}
          className="font-label-sm text-label-sm text-primary hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2.5">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold block uppercase tracking-wider text-xs">
          Categories
        </span>
        <div className="space-y-2">
          {COURSE_CATEGORIES.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center justify-between text-body-sm font-body-sm text-on-surface cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.id)}
                  onChange={() => onToggleCategory(cat.id)}
                  className="w-4 h-4 rounded text-primary-container focus:ring-primary-container accent-primary-container cursor-pointer"
                />
                <span>{cat.title}</span>
              </div>
              <span className="font-caption-xs text-caption-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                {categoryCounts[cat.id] ?? 0}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold block uppercase tracking-wider text-xs">
          Difficulty
        </span>
        <div className="space-y-2">
          {DIFFICULTY_LEVELS.map((diff) => (
            <label
              key={diff}
              className="flex items-center gap-2.5 text-body-sm font-body-sm text-on-surface cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selectedDifficulties.includes(diff)}
                onChange={() => onToggleDifficulty(diff)}
                className="w-4 h-4 rounded text-primary-container focus:ring-primary-container accent-primary-container cursor-pointer"
              />
              <span>
                {diff === "Advanced" ? "Advanced / Lead" : `${diff} Level`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold block uppercase tracking-wider text-xs">
          Course Duration
        </span>
        <div className="space-y-2">
          {DURATION_BUCKETS.map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-2.5 text-body-sm font-body-sm text-on-surface cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selectedDurations.includes(b.id)}
                onChange={() => onToggleDuration(b.id)}
                className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold block uppercase tracking-wider text-xs">
          Rating
        </span>
        <div className="space-y-2">
          {[
            { val: 0, label: "All Ratings" },
            { val: 4.5, label: "4.5 & up" },
            { val: 4.0, label: "4.0 & up" },
          ].map((r) => (
            <label
              key={r.val}
              className="flex items-center gap-2.5 text-body-sm font-body-sm text-on-surface cursor-pointer select-none"
            >
              <input
                type="radio"
                name="rating-filter"
                checked={Number(minRating) === r.val}
                onChange={() => onMinRatingChange(r.val)}
                className="w-4 h-4 accent-primary-container cursor-pointer"
              />
              <span className="flex items-center gap-1 text-on-surface">
                <span
                  className={
                    Number(minRating) === r.val
                      ? "text-secondary font-semibold"
                      : "text-on-surface-variant"
                  }
                >
                  {r.label}
                </span>
                {r.val > 0 && (
                  <span className="material-symbols-outlined material-fill-1 text-[16px] text-amber-500">
                    star
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section
      id="catalog"
      className="w-full py-12 sm:py-space-3xl bg-surface scroll-mt-20"
    >
      {mobileFilterOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="lg:hidden fixed inset-0 z-[110] bg-on-surface/40 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => onSetMobileFilterOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up space-y-5"
            >
              {renderFilterControls()}
              <button
                type="button"
                onClick={() => onSetMobileFilterOpen(false)}
                className="w-full h-11 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold"
              >
                Show {courses.length} Matching Courses
              </button>
            </div>
          </div>,
          document.body
        )}

      <div className="max-w-7xl mx-auto px-4 sm:px-margin">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:max-w-lg">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search courses, topics, or instructors..."
                className="w-full h-11 pl-11 pr-16 rounded-[10px] bg-surface-container-lowest border border-outline-variant/35 shadow-sm text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              ) : (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-caption-xs text-caption-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                  ⌘K
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => onSetMobileFilterOpen(true)}
                className="lg:hidden h-10 px-4 rounded-[10px] bg-surface-container-lowest border border-outline-variant/40 shadow-xs text-on-surface font-label-md inline-flex items-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  tune
                </span>
                <span>Filters</span>
              </button>

              <div className="flex-1 sm:flex-initial sm:w-60 min-w-[190px] max-w-full ml-auto md:ml-0">
                <NexaSelect
                  label="Sort by"
                  icon="sort"
                  value={sortBy}
                  onChange={onSortChange}
                  options={SORT_OPTIONS}
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-caption-xs text-caption-xs text-on-surface-variant uppercase font-semibold mr-1">
                Active:
              </span>

              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => onToggleCategory(cat)}
                    className="hover:text-error transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                </span>
              ))}

              {selectedDifficulties.map((diff) => (
                <span
                  key={diff}
                  className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                >
                  <span>{diff}</span>
                  <button
                    type="button"
                    onClick={() => onToggleDifficulty(diff)}
                    className="hover:text-error transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                </span>
              ))}

              {selectedDurations.map((durId) => {
                const bucket = DURATION_BUCKETS.find((b) => b.id === durId);
                return (
                  <span
                    key={durId}
                    className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                  >
                    <span>{bucket?.label || durId}</span>
                    <button
                      type="button"
                      onClick={() => onToggleDuration(durId)}
                      className="hover:text-error transition-colors flex items-center"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </span>
                );
              })}

              {minRating > 0 && (
                <span className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                  <span>{minRating}+ ★</span>
                  <button
                    type="button"
                    onClick={() => onMinRatingChange(0)}
                    className="hover:text-error transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={onClearAllFilters}
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="hidden lg:block lg:col-span-3 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/25 lg:sticky lg:top-24">
            {renderFilterControls()}
          </aside>

          <div className="lg:col-span-9">
            {courses.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm border border-outline-variant/25">
                <span className="material-symbols-outlined text-[42px] text-outline">
                  menu_book
                </span>
                <h3 className="font-headline-sm text-on-surface mt-2">
                  {publishedCatalogCourses.length === 0
                    ? "No published courses are currently in the catalog"
                    : "No courses match your active filter criteria"}
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-1 max-w-md mx-auto">
                  {publishedCatalogCourses.length === 0
                    ? "Once an instructor publishes a course, it will appear right here."
                    : "Try clearing one or more category, duration, or difficulty filters to view all available NexaLearn courses."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onClearAllFilters}
                    className="mt-4 h-10 px-5 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const isEnrolled = enrolledCourseIds.has(course.courseId);
                  const categoryBadgeColor =
                    course.category === "AI & Data Science"
                      ? "text-secondary"
                      : course.category === "UI/UX Design"
                      ? "text-tertiary"
                      : "text-primary";

                  const difficultyColor =
                    course.difficulty === "Advanced"
                      ? "text-tertiary"
                      : course.difficulty === "Intermediate"
                      ? "text-secondary"
                      : "text-primary";

                  return (
                    <article
                      key={course.courseId}
                      className="bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-xl border border-outline-variant/25 hover:border-primary-fixed-dim transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-6 pb-0">
                        <div
                          onClick={() => onSelectCourse(course)}
                          className="h-44 w-full rounded-xl bg-surface-container-high overflow-hidden relative mb-4 cursor-pointer"
                        >
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span
                            className={`absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md font-label-sm text-label-sm font-semibold px-2.5 py-1 rounded-md ${categoryBadgeColor}`}
                          >
                            {course.category}
                          </span>
                          {isEnrolled && (
                            <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                              ✓ Enrolled
                            </span>
                          )}
                          <span className="absolute bottom-3 right-3 bg-inverse-surface/85 text-inverse-on-surface font-caption-xs text-caption-xs font-medium px-2 py-0.5 rounded">
                            {course.durationLabel ||
                              `${course.durationHours} Hours`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span
                            className={`font-label-sm text-label-sm font-medium ${difficultyColor}`}
                          >
                            {course.difficulty}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined material-fill-1 text-amber-500 text-[16px]">
                              star
                            </span>
                            <span className="font-bold text-on-surface">
                              {Number(course.rating || 4.9).toFixed(1)}
                            </span>
                            <span className="text-on-surface-variant">
                              ({course.reviewsCount || "New"})
                            </span>
                          </div>
                        </div>

                        <h4
                          onClick={() => onSelectCourse(course)}
                          className="font-headline-sm text-headline-sm text-on-surface font-bold group-hover:text-primary-container transition-colors line-clamp-2 cursor-pointer"
                        >
                          {course.title}
                        </h4>

                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 line-clamp-2">
                          {course.shortDescription}
                        </p>
                      </div>

                      <div className="p-6 pt-4 mt-4 bg-surface-container-low/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={course.instructorAvatar}
                            alt={course.instructorName}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <span className="font-caption-xs text-caption-xs font-medium text-on-surface truncate">
                            {course.instructorName}
                          </span>
                        </div>

                        {isEnrolled ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onSelectCourse(course)}
                              className="h-9 px-2.5 rounded-[8px] bg-surface-container-highest text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenStudentDashboard?.()}
                              className="h-9 px-3 rounded-[8px] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              <span>Dashboard →</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectCourse(course)}
                            className="h-9 px-4 rounded-[8px] bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-colors flex items-center justify-center shrink-0"
                          >
                            View Course
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}