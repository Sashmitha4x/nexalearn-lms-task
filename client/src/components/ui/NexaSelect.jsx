import React, { useState, useRef, useEffect } from "react";

export default function NexaSelect({
  value,
  onChange,
  options = [],
  label = "",
  icon = "",
  size = "md", // "sm" | "md" | "lg"
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef(null);

  const normalizedOptions = options.map((opt) =>
    typeof opt === "object" ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption =
    normalizedOptions.find((o) => String(o.value) === String(value)) ||
    normalizedOptions[0] || { value: "", label: "Select..." };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setAlignRight(rect.left + 240 > window.innerWidth - 16);
    }
    setOpen((prev) => !prev);
  };

  const sizeClasses =
    size === "sm"
      ? "h-9 px-3 text-xs rounded-lg"
      : size === "lg"
      ? "h-12 px-4 text-sm rounded-[10px]"
      : "h-10 px-3.5 text-xs sm:text-sm rounded-[10px]";

  return (
    <div
      ref={containerRef}
      className={`relative select-none max-w-full ${
        open ? "z-50" : "z-10"
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className={`w-full max-w-full bg-white hover:bg-slate-50/90 text-[#0F172A] font-semibold flex items-center justify-between gap-2 transition-all border shadow-xs overflow-hidden ${sizeClasses} ${
          open
            ? "border-[#4F46E5] ring-2 ring-[#4F46E5]/15 bg-white"
            : "border-[#E2E8F0] hover:border-slate-300"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden text-left">
          {icon && (
            <span className="material-symbols-outlined text-[17px] text-[#4F46E5] shrink-0">
              {icon}
            </span>
          )}
          {label && (
            <span className="text-slate-400 font-medium shrink-0">
              {label}:
            </span>
          )}
          <span className="truncate text-[#0F172A] block">
            {selectedOption.label}
          </span>
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? "rotate-180 text-[#4F46E5]" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          className={`animate-pop-in absolute ${
            alignRight ? "right-0" : "left-0"
          } mt-1.5 w-full min-w-[210px] max-w-[90vw] bg-white rounded-xl shadow-[0_16px_36px_rgba(15,23,42,0.14)] border border-[#E2E8F0] py-1.5 z-[95] max-h-64 overflow-y-auto divide-y divide-slate-100`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2.5 transition-colors ${
                  isSelected
                    ? "bg-[#EEF2FF] text-[#4F46E5] font-bold"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px] text-[#4F46E5] shrink-0">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}