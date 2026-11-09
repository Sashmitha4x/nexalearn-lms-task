import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function InstructorProfileModal({
  instructor,
  courses = [],
  onClose,
  onSelectCourse,
}) {
  useEffect(() => {
    if (!instructor) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [instructor, onClose]);

  if (!instructor) return null;

  const taughtCourses = courses.filter(
    (c) =>
      c.instructorName?.toLowerCase() === instructor.name?.toLowerCase() ||
      c.instructorEmail?.toLowerCase() === instructor.email?.toLowerCase()
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] bg-on-surface/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-outline-variant/40 flex flex-col gap-6 my-auto animate-pop-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/25 pb-5">
          <div className="flex items-center gap-4">
            <img
              src={instructor.avatar}
              alt={instructor.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-md shrink-0"
            />
            <div>
              <span className="font-label-sm text-primary uppercase tracking-wider block">
                Verified NexaLearn Educator
              </span>
              <h2 className="font-headline-md text-on-surface font-bold">
                {instructor.name}
              </h2>
              <p className="font-body-sm text-on-surface-variant">
                {instructor.headline}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="font-body-sm text-on-surface-variant leading-relaxed">
          {instructor.bio}
        </p>

        <div className="space-y-3">
          <h3 className="font-title-md text-on-surface font-bold">
            Courses by {instructor.name} ({taughtCourses.length})
          </h3>
          <div className="space-y-2.5">
            {taughtCourses.map((c) => (
              <div
                key={c.courseId}
                className="p-3.5 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="font-caption-xs text-primary font-semibold">
                    #{c.courseId} • {c.category} • {c.difficulty}
                  </span>
                  <h4 className="font-title-md text-on-surface font-bold">
                    {c.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCourse(c);
                  }}
                  className="h-9 px-4 rounded-[8px] bg-primary-container text-on-primary font-label-sm font-semibold shrink-0"
                >
                  Inspect Syllabus
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}