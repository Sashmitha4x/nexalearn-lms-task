import React from "react";

export default function InstructorDirectorySection({
  instructors = [],
  onInspectInstructor,
  onGetStartedClick,
}) {
  return (
    <>
      <section
        id="instructors"
        className="w-full py-12 sm:py-space-3xl bg-surface scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-margin">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider">
                World-Class Educators
              </span>
              <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight mt-1">
                Meet Our Expert Instructors
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
              Learn directly from senior practitioners, open-source
              contributors, and research leaders who build the technologies they
              teach.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-space-xl">
            {instructors.slice(0, 3).map((inst, index) => (
              <div
                key={inst.id || inst.email}
                className="bg-surface-container-lowest p-6 sm:p-space-xl rounded-2xl shadow-sm hover:shadow-xl border border-outline-variant/25 transition-all duration-200 flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <img
                    src={inst.avatar}
                    alt={inst.name}
                    className="w-24 h-24 rounded-full object-cover shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-container shadow">
                    <span className="material-symbols-outlined text-[14px]">
                      check
                    </span>
                  </span>
                </div>

                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {inst.name}
                </h3>
                <span
                  className={`font-label-sm text-label-sm font-medium mt-1 ${
                    index === 1 ? "text-secondary" : "text-primary"
                  }`}
                >
                  {inst.headline}
                </span>

                <div className="flex items-center gap-3 sm:gap-4 py-4 text-xs font-semibold text-on-surface-variant">
                  <span>{inst.coursesCount || 11} Courses</span>
                  <span>•</span>
                  <span>{inst.studentsMentored || "35k Students"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-on-surface font-bold">
                    <span className="material-symbols-outlined material-fill-1 text-[14px] text-amber-500">
                      star
                    </span>
                    {Number(inst.rating || 4.9).toFixed(1)}
                  </span>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 mb-6">
                  {inst.bio}
                </p>

                <button
                  type="button"
                  onClick={() => onInspectInstructor(inst)}
                  className="w-full mt-auto h-10 rounded-[10px] bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container-high transition-colors"
                >
                  View Instructor Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="w-full py-12 sm:py-space-3xl bg-primary-container text-on-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-margin relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="font-label-sm text-label-sm bg-white/20 text-white px-3.5 py-1 rounded-full uppercase tracking-wider font-semibold inline-block">
              Start Learning Today
            </span>
            <h2 className="font-headline-xl text-2xl sm:text-headline-xl font-bold tracking-tight text-white">
              Ready to elevate your engineering career?
            </h2>
            <p className="font-body-md text-sm sm:text-body-md text-white/80">
              Join over 120,000 developers and designers mastering real-world
              skills on NexaLearn. Browse our free curriculum or earn accredited
              industry certificates.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onGetStartedClick}
              className="w-full sm:w-auto h-12 px-8 rounded-[10px] bg-white text-primary-container font-label-md text-label-md font-bold hover:bg-surface-container-low transition-colors shadow-lg"
            >
              Get Started for Free
            </button>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </section>
    </>
  );
}