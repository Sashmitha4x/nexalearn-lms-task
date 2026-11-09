import React from "react";

export default function PublicFooter({
  onSelectCategory,
  onNavigateSection,
}) {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/40 py-12 sm:py-space-3xl mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-margin">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white shadow-sm shrink-0">
                <span className="material-symbols-outlined material-fill-1 text-[18px]">
                  school
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                NexaLearn
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Premier destination for forward-looking engineering, data
              analytics, and modern technology curriculums designed by industry
              authorities.
            </p>
          </div>

          <div>
            <h4 className="font-title-md text-title-md text-on-surface mb-4">
              Curriculum
            </h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory("Software Engineering")}
                  className="hover:text-on-surface transition-colors"
                >
                  Software Engineering
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory("AI & Data Science")}
                  className="hover:text-on-surface transition-colors"
                >
                  AI &amp; Data Science
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory("Cloud & DevOps")}
                  className="hover:text-on-surface transition-colors"
                >
                  Cloud &amp; DevOps
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory("UI/UX Design")}
                  className="hover:text-on-surface transition-colors"
                >
                  UI/UX Design Systems
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-title-md text-title-md text-on-surface mb-4">
              Platform
            </h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection("#catalog")}
                  className="hover:text-on-surface transition-colors"
                >
                  Explore Courses
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection("#instructors")}
                  className="hover:text-on-surface transition-colors"
                >
                  Top Instructors
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection("#syllabus-spotlight")}
                  className="hover:text-on-surface transition-colors"
                >
                  Curriculum Spotlight
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-title-md text-title-md text-on-surface mb-4">
              Company
            </h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <span className="text-on-surface-variant">About NexaLearn</span>
              </li>
              <li>
                <span className="text-on-surface-variant">
                  Academic Honor Code
                </span>
              </li>
              <li>
                <span className="text-on-surface-variant">Privacy Policy</span>
              </li>
              <li>
                <span className="text-on-surface-variant">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-on-surface-variant font-caption-xs text-caption-xs">
          <span>
            © 2026 NexaLearn Technologies Inc. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <span>Security</span>
            <span>Accessibility</span>
            <span>Cookie Preferences</span>
          </div>
        </div>
      </div>
    </footer>
  );
}