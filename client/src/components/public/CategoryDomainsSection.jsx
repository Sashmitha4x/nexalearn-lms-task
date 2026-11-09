import React from "react";
import { COURSE_CATEGORIES } from "../../constants/nexaConstants.js";

export default function CategoryDomainsSection({
  selectedCategories = [],
  onSelectCategory,
}) {
  return (
    <section
      id="categories"
      className="w-full py-12 sm:py-space-2xl bg-surface-container-low scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-margin">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-space-xl gap-4">
          <div>
            <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider">
              Explore By Domain
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight mt-1">
              Popular Fields of Study
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
            Structured learning pathways curated with enterprise engineering
            rubrics to take you from foundational syntax to system mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-space-lg">
          {COURSE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            const iconBoxClasses =
              cat.theme === "secondary"
                ? "bg-secondary-fixed text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary"
                : cat.theme === "tertiary"
                ? "bg-tertiary-fixed text-on-tertiary-fixed-variant group-hover:bg-tertiary-container group-hover:text-on-tertiary"
                : "bg-surface-container-high text-primary-container group-hover:bg-primary-container group-hover:text-on-primary";

            const linkColorClass =
              cat.theme === "secondary"
                ? "text-secondary"
                : cat.theme === "tertiary"
                ? "text-tertiary"
                : "text-primary";

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`group text-left bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between border ${
                  isSelected
                    ? "border-primary-container ring-2 ring-primary-container/15"
                    : "border-outline-variant/25"
                }`}
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${iconBoxClasses}`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {cat.icon}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary-container transition-colors">
                    {cat.title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {cat.countLabel}
                  </p>
                </div>

                <div
                  className={`mt-6 pt-4 border-t border-surface-container flex items-center justify-between font-label-md text-label-md font-semibold ${linkColorClass}`}
                >
                  <span>Explore Track</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}