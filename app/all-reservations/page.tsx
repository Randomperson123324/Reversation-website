"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { isBefore } from "date-fns";
import { Reservation } from "@/types";
import { Calendar, Search } from "lucide-react";
import FilterTabs, { ReservationFilter, FILTER_ORDER } from "@/components/FilterTabs";
import ReservationCard from "@/components/ReservationCard";
import { ReservationCardSkeleton } from "@/components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";

// Slide direction for the content area: 1 = tab moved right, -1 = tab moved left.
// Same technique as the reserve page's step transitions — no opacity fade, content
// slides fully off screen on exit (fast) and the new content bounces into place.
// Used only for filter-tab switches, not for the initial skeleton → real-data swap.
const contentSlideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  center: { x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", transition: { duration: 0.2, ease: "easeIn" as const } }),
};

// Used for the skeleton → real-data swap: no horizontal movement, the outer
// motion.div's `layout` already handles the height expanding/shrinking to fit.
const loadFadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" as const } },
};

export default function AllReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReservationFilter>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const filterDirectionRef = useRef(1);
  // True on the render right after `loading` flips to false, so that specific swap
  // uses a fade (height-only) instead of the slide used for filter-tab switches.
  const prevLoadingRef = useRef(true);
  const cameFromLoading = prevLoadingRef.current;
  useEffect(() => { prevLoadingRef.current = loading; });
  const supabase = createClient();

  const handleFilterChange = (f: ReservationFilter) => {
    filterDirectionRef.current = FILTER_ORDER.indexOf(f) > FILTER_ORDER.indexOf(filter) ? 1 : -1;
    setFilter(f);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(full_name, email, avatar_url, department)")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    // Type assertion correctly passing the populated user data
    const formattedData = (data || []).map(r => ({
      ...r,
      user_name: r.profiles?.full_name || r.profiles?.email || "Unknown User",
      user_email: r.profiles?.email || "",
      avatar_url: r.profiles?.avatar_url || null,
      department: r.department || r.profiles?.department || null
    }));

    setReservations(formattedData as any[]);
    setLoading(false);
  }, [supabase]);

  const isPastRes = (r: Reservation) => isBefore(new Date(r.date + "T" + r.end_time), new Date());

  const filteredReservations = reservations.filter((r) => {
    let matchFilter = true;
    if (filter === "upcoming") matchFilter = r.status === "confirmed" && !isPastRes(r);
    if (filter === "past") matchFilter = r.status === "confirmed" && isPastRes(r);
    if (filter === "cancelled") matchFilter = r.status === "cancelled";

    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user_name || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchFilter && matchSearch;
  });

  const filterCounts: Record<ReservationFilter, number> = {
    all: reservations.length,
    upcoming: reservations.filter((r) => r.status === "confirmed" && !isPastRes(r)).length,
    past: reservations.filter((r) => r.status === "confirmed" && isPastRes(r)).length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-app">
      <Navbar />

      <div className="pt-16">
        {/* Header */}
        <div className="relative overflow-hidden bg-hero-gradient">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <h1 className="page-title text-ink mb-2">
              การจองทั้งหมด
            </h1>
            <p className="text-ink-muted text-lg font-medium">ดูรายการจองห้องประชุมทั้งหมดในระบบ</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อการจอง, ผู้จอง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-4 text-base rounded-xl input-field"
                />
              </div>
            </div>

            <FilterTabs value={filter} onChange={handleFilterChange} counts={filterCounts} />
          </div>

          {/* Content — layout animates the container's height as it swaps
              between skeleton / empty state / real list, and AnimatePresence
              slides the content itself left/right when the filter tab changes. */}
          {/* overflow-x-hidden clips the slide so it never creates a page-wide horizontal
              scrollbar — the slide only crosses within this single container, unlike the
              reserve page's cross-section morph, so clipping here is safe. */}
          <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="overflow-x-hidden">
            <AnimatePresence mode="wait" custom={filterDirectionRef.current}>
              {loading ? (
                <motion.div key="loading" variants={loadFadeVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <ReservationCardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : filteredReservations.length === 0 ? (
                <motion.div key={`empty-${filter}`} custom={filterDirectionRef.current} variants={cameFromLoading ? loadFadeVariants : contentSlideVariants} initial="enter" animate="center" exit="exit" className="text-center py-20 card rounded-2xl">
                  <Calendar size={52} className="text-ink-subtle mx-auto mb-4" />
                  <h3 className="text-ink-muted mb-2">ไม่พบการจอง</h3>
                  <p className="text-ink-subtle text-base mb-6">ไม่มีรายการในหมวดนี้หรือคำค้นหาของคุณ</p>
                </motion.div>
              ) : (
                <motion.div key={`list-${filter}`} custom={filterDirectionRef.current} variants={cameFromLoading ? loadFadeVariants : contentSlideVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
                  {filteredReservations.map((res: any) => (
                    <ReservationCard key={res.id} res={res} showUser />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
