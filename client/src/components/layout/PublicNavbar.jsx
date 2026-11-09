import React, { useState } from "react";

export default function PublicNavbar({
  user,
  onNavigateSection,
  onQuickSearchClick,
  onSignInClick,
  onGetStartedClick,
  onOpenDashboard,
  onLogout,
}) {
  const [activeNav, setActiveNav] = useState("explore-courses");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", href: "#top" },
    { id: "explore-courses", label: "Explore Courses", href: "#catalog" },
    { id: "categories", label: "Categories", href: "#categories" },
    { id: "instructors", label: "Instructors", href: "#instructors" },
  ];

  const handleNavClick = (item) => {
    setActiveNav(item.id);
    setMobileMenuOpen(false);
    onNavigateSection(item.href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-outline-variant/40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-[72px] sm:h-[76px] max-w-7xl mx-auto px-4 sm:px-margin flex items-center justify-between gap-2 sm:gap-4">
        {/* Crisp Vector Brand Logo (Never breaks or overflows on mobile) */}
        <button
          type="button"
          onClick={() => handleNavClick(navItems[0])}
          className="flex items-center gap-2.5 text-left shrink-0 group focus:outline-none"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <span className="material-symbols-outlined material-fill-1 text-[20px] sm:text-[22px]">
              school
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-lg sm:text-xl text-on-surface tracking-tight font-extrabold leading-none group-hover:text-primary-container transition-colors">
              NexaLearn
            </span>
            <span className="text-[10px] font-semibold text-primary-container tracking-widest uppercase mt-0.5 hidden xs:block">
              Academy Cloud
            </span>
          </div>
        </button>

        {/* Desktop Center Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-space-xl">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`py-space-xs text-label-md transition-colors relative whitespace-nowrap ${
                  isActive
                    ? "text-primary-container font-semibold after:content-[''] after:absolute after:bottom-[-22px] after:left-0 after:right-0 after:h-[2.5px] after:bg-primary-container after:rounded-full"
                    : "font-label-md text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onQuickSearchClick}
            aria-label="Quick Search"
            title="Search Courses (⌘K)"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
              search
            </span>
          </button>

          {!user ? (
            <>
              <button
                type="button"
                onClick={onSignInClick}
                className="hidden sm:inline-flex font-label-md text-label-md font-semibold text-on-surface hover:text-primary-container px-3 py-2 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onGetStartedClick}
                className="h-9 sm:h-[42px] px-3.5 sm:px-5 rounded-[10px] bg-primary-container text-on-primary font-label-md text-xs sm:text-label-md font-semibold hover:bg-primary transition-all duration-200 flex items-center justify-center shadow-sm whitespace-nowrap"
              >
                Get Started
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="h-9 sm:h-[42px] px-3 sm:px-4 rounded-[10px] bg-surface-container-high text-primary font-label-md text-xs sm:text-label-md font-semibold hover:bg-primary-container hover:text-on-primary transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">
                  space_dashboard
                </span>
                <span className="hidden sm:inline">
                  {user.role === "admin"
                    ? "Admin Console"
                    : user.role === "instructor"
                    ? "Instructor Studio"
                    : "My Learning"}
                </span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="h-9 sm:h-[42px] px-2.5 sm:px-3 rounded-[10px] border border-outline-variant/50 text-on-surface-variant hover:text-error hover:bg-error-container/30 font-label-sm transition-colors flex items-center justify-center"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label="Toggle Menu"
            className="md:hidden w-9 h-9 rounded-[10px] bg-surface-container-low text-on-surface flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-outline-variant/40 px-4 pt-2 pb-5 space-y-1.5 animate-fade-up shadow-xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`w-full text-left px-4 py-2.5 rounded-[10px] font-label-md flex items-center justify-between ${
                activeNav === item.id
                  ? "bg-surface-container-high text-primary-container font-semibold"
                  : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <span>{item.label}</span>
              <span className="material-symbols-outlined text-[18px]">
                chevron_right
              </span>
            </button>
          ))}

          {!user ? (
            <div className="pt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignInClick();
                }}
                className="h-10 rounded-[10px] border border-outline-variant text-on-surface font-label-md font-semibold text-xs"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStartedClick();
                }}
                className="h-10 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold text-xs"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDashboard();
                }}
                className="w-full h-10 rounded-[10px] bg-primary-container text-on-primary font-label-md font-semibold text-xs flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">
                  space_dashboard
                </span>
                <span>
                  Open{" "}
                  {user.role === "admin"
                    ? "Admin Console"
                    : user.role === "instructor"
                    ? "Instructor Studio"
                    : "Student Hub"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}