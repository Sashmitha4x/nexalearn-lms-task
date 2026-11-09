import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function FreePreviewModal({ course, onClose, onEnroll }) {
  useEffect(() => {
    if (!course) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [course, onClose]);

  if (!course) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] bg-on-surface/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-outline-variant/40 animate-pop-in"
      >
        <div className="p-4 sm:p-5 bg-inverse-surface text-inverse-on-surface flex items-center justify-between">
          <div>
            <span className="font-caption-xs text-secondary-fixed uppercase font-bold">
              Free Curriculum Preview • #{course.courseId}
            </span>
            <h3 className="font-title-md text-white font-bold">
              {course.title} — Lesson 1.1 Preview
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Simulated 16:9 Interactive Lesson Stage */}
        <div className="relative aspect-video bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center text-white">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative z-10 max-w-md space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary-container text-white flex items-center justify-center mx-auto shadow-xl">
              <span className="material-symbols-outlined text-[34px]">
                play_arrow
              </span>
            </div>
            <h4 className="font-headline-sm font-bold">
              1.1 Scope, Closures &amp; Architecture Foundations
            </h4>
            <p className="font-body-sm text-white/80">
              Instructor: {course.instructorName} • Runtime: 18m 00s • HD 1080p
              Interactive Stream
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest">
          <p className="font-body-sm text-on-surface-variant">
            Unlock all 8 modules, auto-graded quizzes, and your verified PDF
            certificate.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEnroll(course);
            }}
            className="h-10 px-5 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold shrink-0"
          >
            Enroll in Full Course →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}