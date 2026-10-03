"use client";

import { motion } from "framer-motion";

export type ReservationFilter = "all" | "upcoming" | "past" | "cancelled";

const LABELS: Record<ReservationFilter, string> = {
  upcoming: "กำลังมาถึง",
  past: "ผ่านไปแล้ว",
  all: "ทั้งหมด",
  cancelled: "ยกเลิกแล้ว",
};

// Exported so pages can derive slide direction (left/right) for their own content transitions.
export const FILTER_ORDER: ReservationFilter[] = ["upcoming", "past", "all", "cancelled"];

interface FilterTabsProps {
  value: ReservationFilter;
  onChange: (filter: ReservationFilter) => void;
  counts: Record<ReservationFilter, number>;
}

export default function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_ORDER.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`relative flex items-stretch rounded-btn overflow-hidden transition-colors ${
            value === f ? "text-ink-inverse" : "btn-outline"
          }`}
        >
          {/* Shared layoutId: the active background slides between tabs instead of snapping.
              damping is set equal to critical damping for this stiffness (no overshoot/bounce). */}
          {value === f && (
            <motion.div
              layoutId="active-filter-pill"
              className="absolute inset-0 bg-primary-600"
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            />
          )}
          <span className={`relative flex items-center justify-center px-4 text-3xl font-black leading-none ${value === f ? "bg-ink-inverse/15" : "bg-surface-muted"}`}>
            {counts[f]}
          </span>
          <span className="relative flex items-center px-4 py-2.5 text-base font-semibold whitespace-nowrap">
            {LABELS[f]}
          </span>
        </button>
      ))}
    </div>
  );
}
