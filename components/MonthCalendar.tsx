"use client";

import { useEffect, useRef, useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, isBefore, startOfDay,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTransition } from "@/components/PageTransition";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const INTENSITY_STEPS = [0, 0.25, 0.5, 0.75, 1];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM", { locale: th }));
const todayYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => todayYear - 1 + i);

/** Slide direction for the day grid when the month changes: 1 = forward, -1 = backward.
    Same technique as the reserve page's step transitions — no opacity fade,
    the grid slides fully off/in and bounces into place on arrival. */
const monthSlideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  center: { x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", transition: { duration: 0.2, ease: "easeIn" as const } }),
};

/** Same tint formula used for every density cell and the legend swatches, kept in one place. */
const intensityBg = (intensity: number) =>
  intensity <= 0
    ? "rgb(var(--color-surface-muted-rgb))"
    : `rgb(var(--color-primary-600-rgb) / ${0.12 + intensity * 0.7})`;

/**
 * Shared layoutId for a density-mode day cell. The statistics page's day
 * summary popup uses the same id so framer-motion treats them as one
 * element — the popup morphs out of the clicked cell, and shrinks back
 * into it on close, instead of appearing/disappearing as separate things.
 */
export const dayLayoutId = (date: Date) => `density-day-${format(date, "yyyy-MM-dd")}`;

/**
 * Shared layoutId for a plain-mode day cell, used only when `enableDateTransition`
 * is on (home page). Lets the double-clicked day cell itself be the element that
 * morphs into PageTransition's centered overlay, same mechanism as TransitionLink.
 */
export const dateTransitionLayoutId = (date: Date) => `date-transition-${format(date, "yyyy-MM-dd")}`;

/**
 * Month/year picker used in the calendar header. A custom animated dropdown
 * instead of a native <select> — native selects can't have a styled
 * slide-in/out open/close animation — with a `.card` panel matching the
 * calendar's own border/radius/shadow treatment for a consistent look.
 */
function MonthYearDropdown({
  options, value, onChange,
}: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-ink font-display font-bold text-lg sm:text-3xl rounded-btn px-1.5 sm:px-2 py-1 hover:bg-surface-hover transition-all cursor-pointer"
      >
        {current?.label}
        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-ink-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {/* Expand/collapse: the outer motion.div animates its height from 0 to its
          natural content height (framer-motion measures this for "auto"), with
          overflow-hidden so the list is clipped during the grow/shrink rather
          than just sliding. The inner div owns the scrollable max-height cap
          separately, so a long list (months) still scrolls once fully expanded
          instead of fighting the height animation. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-2 min-w-[7rem] sm:min-w-[8rem] overflow-hidden card rounded-2xl z-50"
          >
            <div className="max-h-60 sm:max-h-72 overflow-y-auto py-2">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 text-base sm:text-lg font-semibold transition-all ${o.value === value ? "text-primary-600 bg-primary-50" : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                    }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DayDots {
  has601: boolean;
  has605: boolean;
}

interface MonthCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  onDoubleClickDate?: (date: Date) => void;
  getDayDots?: (date: Date) => DayDots;
  /** Disable and dim days before today (used by the reservation flow). */
  disablePast?: boolean;
  /**
   * Switches the calendar into heatmap mode: each day is tinted by this
   * 0–1 value instead of showing room dots / date selection. Used by the
   * statistics page's daily density view.
   */
  getDayIntensity?: (date: Date) => number;
  /** Tooltip text per day, shown in density mode (e.g. "5 ก.ค. 2569: 3 การจอง"). */
  getDayTitle?: (date: Date) => string;
  /** Hide the built-in month title/prev-next-today row, for pages that already have their own month selector driving the same `currentMonth`. */
  showHeader?: boolean;
  /** When set, the double-clicked day cell itself morphs into PageTransition's centered overlay (home page only — see dateTransitionLayoutId). */
  enableDateTransition?: boolean;
}

export default function MonthCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  onDoubleClickDate,
  getDayDots,
  disablePast = false,
  getDayIntensity,
  getDayTitle,
  showHeader = true,
  enableDateTransition = false,
}: MonthCalendarProps) {
  const isDensityMode = !!getDayIntensity;
  const { pendingId } = usePageTransition();
  const start = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end: endOfMonth(currentMonth) });
  const startPadding = start.getDay();

  // Touch screens don't fire a native dblclick from two taps, so onDoubleClickDate
  // (e.g. the home page's double-tap-to-reserve) would otherwise be unreachable on
  // mobile. This tracks tap timing per day and fires the same callback manually.
  const lastTapRef = useRef<{ key: string; time: number } | null>(null);
  const handleTouchEnd = (day: Date) => {
    if (!onDoubleClickDate) return;
    const key = day.toString();
    const now = Date.now();
    if (lastTapRef.current?.key === key && now - lastTapRef.current.time < 350) {
      lastTapRef.current = null;
      onDoubleClickDate(day);
    } else {
      lastTapRef.current = { key, time: now };
    }
  };

  // Tracks which way the day grid should slide: 1 = forward, -1 = backward.
  const directionRef = useRef(1);
  const changeMonth = (next: Date) => {
    directionRef.current = next.getTime() >= currentMonth.getTime() ? 1 : -1;
    onMonthChange(next);
  };

  const goToMonth = (delta: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    changeMonth(next);
  };

  const goToToday = () => {
    const today = new Date();
    changeMonth(today);
    onSelectDate?.(today);
  };

  return (
    <>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-3 sm:mb-5 gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <MonthYearDropdown
              options={MONTH_NAMES.map((name, i) => ({ value: i, label: name }))}
              value={currentMonth.getMonth()}
              onChange={(m) => changeMonth(new Date(currentMonth.getFullYear(), m, 1))}
            />
            <MonthYearDropdown
              options={YEAR_OPTIONS.map((y) => ({ value: y, label: String(y) }))}
              value={currentMonth.getFullYear()}
              onChange={(y) => changeMonth(new Date(y, currentMonth.getMonth(), 1))}
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="p-2 sm:p-3 rounded-btn hover:bg-surface-hover text-ink-muted hover:text-ink transition-all"
            >
              <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-btn text-sm sm:text-2xl font-bold bg-surface-muted text-ink hover:bg-surface-hover transition-all"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="p-2 sm:p-3 rounded-btn hover:bg-surface-hover text-ink-muted hover:text-ink transition-all"
            >
              <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>
          </div>
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 sm:mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs sm:text-xl font-bold text-ink-subtle py-1 sm:py-2 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Days grid — slides left/right when the month changes. overflow-hidden is
          safe here (unlike the reserve page's cross-section morph) since the
          slide never needs to cross outside this single, self-contained box.
          The -m-2/p-2 pair adds clipping slack on every side without shifting
          layout — without it, a selected day's scale-105 + glow shadow on an
          edge row/column got clipped flush against this box's edge. */}
      <div className="overflow-hidden -m-2 p-2">
      <AnimatePresence mode="wait" custom={directionRef.current}>
      <motion.div
        key={format(currentMonth, "yyyy-MM")}
        custom={directionRef.current}
        variants={monthSlideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
      >
        {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const { has601, has605 } = getDayDots?.(day) ?? { has601: false, has605: false };
          const isSelected = !!selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const isPast = disablePast && isBefore(day, startOfDay(new Date()));
          const intensity = getDayIntensity?.(day) ?? 0;

          if (isDensityMode) {
            return (
              <motion.button
                key={day.toString()}
                layoutId={dayLayoutId(day)}
                type="button"
                title={getDayTitle?.(day)}
                onClick={() => onSelectDate?.(day)}
                whileHover={{ scale: 1.1 }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-btn text-sm sm:text-xl font-bold ${isSelected ? "ring-2 ring-primary-600 ring-inset" : isCurrentDay ? "ring-2 ring-accent-400 ring-inset" : ""
                  }`}
                style={{
                  background: intensityBg(intensity),
                  color: intensity > 0.5 ? "rgb(var(--color-ink-inverse-rgb))" : "rgb(var(--color-ink-muted-rgb))",
                }}
              >
                {format(day, "d")}
              </motion.button>
            );
          }

          return (
            <button
              key={day.toString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate?.(day)}
              onDoubleClick={() => onDoubleClickDate?.(day)}
              onTouchEnd={() => handleTouchEnd(day)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-btn text-lg sm:text-3xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                ${isSelected ? "bg-primary-600 text-ink-inverse shadow-glow scale-105"
                  : isCurrentDay ? "border-2 border-accent-400 text-accent-700 hover:bg-surface-hover"
                    : "text-ink-muted hover:bg-surface-hover hover:text-ink"}
              `}
            >
              {enableDateTransition ? (
                <motion.span
                  layoutId={dateTransitionLayoutId(day)}
                  animate={{ opacity: pendingId === dateTransitionLayoutId(day) ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {format(day, "d")}
                </motion.span>
              ) : (
                <span>{format(day, "d")}</span>
              )}
              {(has601 || has605) && (
                <div className="flex gap-1 mt-0.5">
                  {has601 && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected ? "bg-ink-inverse/70" : "bg-accent-500"}`} />}
                  {has605 && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected ? "bg-ink-inverse/40" : "bg-primary-500"}`} />}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>
      </AnimatePresence>
      </div>

      {/* Legend */}
      {isDensityMode ? (
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-line text-sm sm:text-base font-medium text-ink-muted">
          <span>น้อย</span>
          {INTENSITY_STEPS.map((v) => (
            <div key={v} className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ background: intensityBg(v) }} />
          ))}
          <span>มาก</span>
        </div>
      ) : (
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-line text-sm sm:text-lg font-medium text-ink-muted">
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-accent-500" />SMC 601</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-500" />SMC 605</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-4 sm:h-4 rounded border-2 border-accent-400" />วันนี้</span>
        </div>
      )}
    </>
  );
}
