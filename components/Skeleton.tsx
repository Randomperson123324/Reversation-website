import type { CSSProperties } from "react";

/**
 * Shape-matched loading placeholders. Each component here mirrors the exact
 * layout of the real content it stands in for (ReservationCard, StatCard,
 * a bar-chart row...) instead of a single generic rectangle, so the page
 * doesn't visibly "pop" from a plain box into a differently-shaped card once
 * data arrives.
 *
 * Pair every `.skeleton` div with its own rounded-* utility — the class
 * itself carries no border-radius (same convention as `.card`).
 */

function Line({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton rounded ${className}`} style={style} />;
}

export function ReservationCardSkeleton() {
  return (
    <div className="card rounded-2xl">
      <div className="px-5 pt-5 pb-3">
        <Line className="h-5 w-24 rounded-full mb-2.5" />
        <Line className="h-5 w-56 mb-2" />
        <Line className="h-4 w-40" />
      </div>
      <div className="px-5 pb-4">
        <div className="rounded-xl p-3.5 bg-surface-muted flex items-center gap-3">
          <Line className="w-12 h-11 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Line className="h-4 w-20" />
            <Line className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 border-t border-line pt-3">
        <Line className="h-3 w-36" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card rounded-2xl p-5">
      <Line className="w-11 h-11 rounded-xl mb-3" />
      <Line className="h-8 w-16 mb-2" />
      <Line className="h-4 w-24" />
    </div>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Line className="h-5 w-20" />
        <Line className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <Line className="h-4 w-full" />
        <Line className="h-4 w-full" />
      </div>
      <Line className="h-2 w-full mt-3 rounded-full" />
    </div>
  );
}

/** One row of a horizontal bar list (equipment usage, etc). */
export function BarRowSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Line className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <Line className="h-4 w-28" />
          <Line className="h-4 w-12" />
        </div>
        <Line className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/** A column chart's bars, at randomized-looking but stable heights. */
export function BarChartSkeleton({ bars = 10 }: { bars?: number }) {
  const heights = Array.from({ length: bars }, (_, i) => 30 + ((i * 37) % 70));
  return (
    <div className="flex items-end gap-2 h-40">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-end justify-center" style={{ height: "112px" }}>
            <Line className="w-full rounded-t-lg" style={{ height: `${h}px` }} />
          </div>
          <Line className="h-3 w-6" />
        </div>
      ))}
    </div>
  );
}
