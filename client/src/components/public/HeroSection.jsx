import React from "react";
import { HERO_LEARNER_IMAGE } from "../../constants/nexaConstants.js";

export default function HeroSection({
  onExploreCourses,
  onBecomeInstructor,
}) {
  return (
    <section
      id="top"
      className="w-full bg-gradient-to-b from-surface-container-low via-surface to-surface py-12 md:py-space-3xl relative overflow-hidden"
    >
      {/* Ambient Glow Accents */}
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-space-2xl items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 animate-fade-up">
            <div className="bg-surface-container-high text-primary font-label-md text-label-md px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
              <span className="text-sm">✨</span>
              <span className="tracking-wide">Your future starts here</span>
            </div>

            <h1 className="font-display-hero text-display-hero-mobile sm:text-display-hero text-on-surface tracking-tight leading-tight">
              Build Skills That{" "}
              <span className="text-primary-container">Move Your Career</span>{" "}
              Forward.
            </h1>

            <p className="font-body-lg text-base sm:text-body-lg text-on-surface-variant max-w-2xl">
              Master in-demand tech and creative disciplines through interactive
              curriculum, hands-on project labs, and mentorship from industry
              engineering leads.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-space-md pt-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={onExploreCourses}
                className="w-full sm:w-auto h-11 px-7 rounded-[10px] bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all duration-200 flex items-center justify-center shadow-lg shadow-primary-container/25 hover:-translate-y-0.5"
              >
                Explore Courses
              </button>
              <button
                type="button"
                onClick={onBecomeInstructor}
                className="w-full sm:w-auto h-11 px-6 rounded-[10px] bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container-low transition-colors shadow-sm flex items-center justify-center"
              >
                Become an Instructor
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="w-full pt-4 flex flex-wrap items-center gap-y-3 gap-x-6 sm:gap-x-space-xl text-on-surface-variant font-label-md text-label-md">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[18px]">
                    auto_stories
                  </span>
                </span>
                <span className="font-medium text-on-surface">50+ Courses</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                </span>
                <span className="font-medium text-on-surface">
                  Expert Instructors
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[18px]">
                    schedule
                  </span>
                </span>
                <span className="font-medium text-on-surface">
                  Learn at Your Pace
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Composition */}
          <div className="lg:col-span-5 relative w-full flex justify-center py-4 lg:py-0">
            <div className="relative w-full max-w-[420px] sm:max-w-[440px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-surface-container-highest">
              <img
                alt="Learner exploring curriculum on NexaLearn platform"
                className="w-full h-full object-cover"
                src={HERO_LEARNER_IMAGE}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-background/40 via-transparent to-transparent"></div>
            </div>

            {/* Floating Badge 1: Top Right Progress */}
            <div className="absolute -top-2 right-1 sm:-right-4 bg-surface-container-lowest/95 backdrop-blur-md p-3.5 sm:p-space-md rounded-xl shadow-xl border border-outline-variant/25 flex items-center gap-3 max-w-xs animate-float-gentle">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  code
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-on-surface gap-4">
                  <span>Course Progress</span>
                  <span className="text-primary-container">75%</span>
                </div>
                <div className="w-28 sm:w-32 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full w-3/4"></div>
                </div>
              </div>
            </div>

            {/* Floating Badge 2: Bottom Left Checkmark */}
            <div className="absolute -bottom-3 left-1 sm:-left-4 bg-surface-container-lowest/95 backdrop-blur-md p-3.5 sm:p-space-md rounded-xl shadow-xl border border-outline-variant/25 flex items-center gap-2.5 max-w-xs">
              <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-container shrink-0">
                <span className="material-symbols-outlined text-[18px]">
                  check
                </span>
              </div>
              <div>
                <p className="font-caption-xs text-caption-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Completed Lesson
                </p>
                <p className="font-label-md text-label-md font-semibold text-on-surface truncate max-w-[160px]">
                  React Architecture
                </p>
              </div>
            </div>

            {/* Floating Badge 3: Milestone Pill */}
            <div className="absolute bottom-12 right-2 bg-secondary text-on-secondary px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[16px]">
                bolt
              </span>
              <span>Top 5% Learner Milestone</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}