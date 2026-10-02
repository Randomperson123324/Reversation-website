"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { isBefore } from "date-fns";
import { Reservation } from "@/types";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
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

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReservationFilter>("upcoming");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const filterDirectionRef = useRef(1);
  // True on the render right after `loading` flips to false, so that specific swap
  // uses a fade (height-only) instead of the slide used for filter-tab switches.
  const prevLoadingRef = useRef(true);
  const cameFromLoading = prevLoadingRef.current;
  useEffect(() => { prevLoadingRef.current = loading; });
  const router = useRouter();
  const supabase = createClient();

  const handleFilterChange = (f: ReservationFilter) => {
    filterDirectionRef.current = FILTER_ORDER.indexOf(f) > FILTER_ORDER.indexOf(filter) ? 1 : -1;
    setFilter(f);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setLoading(false);
      else fetchReservations(data.user.id);
    });
  }, []);

  const fetchReservations = useCallback(async (userId?: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId || user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(department)")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    const formattedData = (data || []).map(r => ({
      ...r,
      department: r.department || r.profiles?.department || null
    }));

    setReservations(formattedData as any[]);
    setLoading(false);
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("ยกเลิกการจองเรียบร้อย");
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r))
      );
    }
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const isPastRes = (r: Reservation) => isBefore(new Date(r.date + "T" + r.end_time), new Date());

  const filteredReservations = reservations.filter((r) => {
    if (filter === "upcoming") return r.status === "confirmed" && !isPastRes(r);
    if (filter === "past") return r.status === "confirmed" && isPastRes(r);
    if (filter === "cancelled") return r.status === "cancelled";
    return true;
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
              การจองของฉัน
            </h1>
            <p className="text-ink-muted text-lg font-medium">ดูและจัดการการจองห้องประชุมทั้งหมดของคุณ</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          {/* Filters */}
          <div className="mb-6">
            <FilterTabs value={filter} onChange={handleFilterChange} counts={filterCounts} />
          </div>

          {/* Content — layout animates the container's height as it swaps
              between skeleton / empty state / real list, so variable-height
              text (titles, descriptions) doesn't make the page jump. AnimatePresence
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
                  <p className="text-ink-subtle text-base mb-6">
                    {filter === "upcoming" ? "คุณยังไม่มีการจองที่กำลังมาถึง" : "ไม่มีรายการในหมวดนี้"}
                  </p>
                  <Link
                    href="/reserve"
                    className="inline-flex items-center gap-2 px-6 py-3 btn-primary text-base font-bold"
                  >
                    <Plus size={18} />
                    จองห้องประชุมใหม่
                  </Link>
                </motion.div>
              ) : (
                <motion.div key={`list-${filter}`} custom={filterDirectionRef.current} variants={cameFromLoading ? loadFadeVariants : contentSlideVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
                  {filteredReservations.map((res) => (
                    <ReservationCard
                      key={res.id}
                      res={res}
                      cancellable
                      isConfirmingCancel={confirmDelete === res.id}
                      isCancelling={deletingId === res.id}
                      onRequestCancel={() => setConfirmDelete(res.id)}
                      onConfirmCancel={() => handleDelete(res.id)}
                      onDismissCancel={() => setConfirmDelete(null)}
                    />
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
