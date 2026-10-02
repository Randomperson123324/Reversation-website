"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import MonthCalendar, { dayLayoutId } from "@/components/MonthCalendar";
import ReservationCard from "@/components/ReservationCard";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, EQUIPMENT_OPTIONS, getRoomTheme } from "@/types";
import { getRoomStyle } from "@/lib/roomStyles";
import { exportReservationsToExcel } from "@/lib/exportExcel";
import { StatCardSkeleton, RoomCardSkeleton, BarRowSkeleton, BarChartSkeleton } from "@/components/Skeleton";
import { generateMockReservations } from "@/lib/mockReservations"; // TEMP: see file for removal note
import { BarChart3, Calendar, Clock, TrendingUp, Building2, BarChart2, Projector, Volume2, CalendarRange, X, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, React.ElementType> = { BarChart2, Projector, Volume2 };

type StatsView = "month" | "year";

function StatisticsContent() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearReservations, setYearReservations] = useState<Reservation[]>([]);
  const [yearLoading, setYearLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Drop the day summary when the viewed month changes — it's no longer in view.
  useEffect(() => { setSelectedDay(null); }, [selectedMonth]);

  const [view, setView] = useState<StatsView>(searchParams.get("view") === "year" ? "year" : "month");
  useEffect(() => {
    setView(searchParams.get("view") === "year" ? "year" : "month");
  }, [searchParams]);

  const switchView = (v: StatsView) => {
    setView(v);
    router.replace(`/statistics?view=${v}`, { scroll: false });
  };

  useEffect(() => {
    fetchAllReservations();
  }, []);

  const fetchAllReservations = async () => {
    setLoading(true);
    const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "confirmed")
      .gte("date", threeMonthsAgo)
      .order("date");
    // TEMP: fall back to generated fixture data when the real query comes back
    // empty (no Supabase project is connected — see lib/mockReservations.ts).
    setReservations(data && data.length ? data : generateMockReservations(new Date().getFullYear()));
    setLoading(false);
  };

  const fetchYearReservations = useCallback(async (year: number) => {
    setYearLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "confirmed")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date");
    // TEMP: see note above.
    setYearReservations(data && data.length ? data : generateMockReservations(year));
    setYearLoading(false);
  }, []);

  useEffect(() => {
    if (view === "year") fetchYearReservations(selectedYear);
  }, [selectedYear, view, fetchYearReservations]);

  const monthReservations = reservations.filter((r) => {
    const d = new Date(r.date + "T00:00:00");
    return d >= startOfMonth(selectedMonth) && d <= endOfMonth(selectedMonth);
  });

  const getRoom = (roomId: string) =>
    monthReservations.filter((r) => (r.room_ids || [r.room_id]).includes(roomId));

  const room601 = getRoom("smc-601");
  const room605 = getRoom("smc-605");

  const totalHours = (res: Reservation[]) =>
    res.reduce((acc, r) => {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      return acc + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);

  // Equipment usage counts
  const equipmentCounts = EQUIPMENT_OPTIONS.map((eq) => ({
    ...eq,
    count: monthReservations.filter((r) => r.equipment?.includes(eq.id)).length,
  }));
  const maxEquipCount = Math.max(...equipmentCounts.map((e) => e.count), 1);

  // Days heatmap
  const days = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  const getDayCount = (date: Date) =>
    monthReservations.filter((r) => isSameDay(new Date(r.date + "T00:00:00"), date)).length;

  const selectedDayReservations = selectedDay
    ? monthReservations.filter((r) => isSameDay(new Date(r.date + "T00:00:00"), selectedDay))
    : [];

  const maxDayCount = Math.max(...days.map(getDayCount), 1);

  // Hour distribution
  const hourDistribution = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    const label = `${String(hour).padStart(2, "0")}:00`;
    const count = monthReservations.filter((r) => {
      const startH = parseInt(r.start_time.split(":")[0]);
      const endH = parseInt(r.end_time.split(":")[0]);
      return startH <= hour && endH > hour;
    }).length;
    return { label, count };
  });
  const maxHourCount = Math.max(...hourDistribution.map((h) => h.count), 1);

  // Yearly summary
  const yearRoom601 = yearReservations.filter((r) => (r.room_ids || [r.room_id]).includes("smc-601"));
  const yearRoom605 = yearReservations.filter((r) => (r.room_ids || [r.room_id]).includes("smc-605"));
  const yearActiveDays = new Set(yearReservations.map((r) => r.date)).size;

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const count = yearReservations.filter((r) => new Date(r.date + "T00:00:00").getMonth() === i).length;
    const label = format(new Date(selectedYear, i, 1), "MMM", { locale: th });
    return { label, count };
  });
  const maxMonthlyCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1);
  const isCurrentYear = selectedYear >= new Date().getFullYear();

  const StatCard = ({ icon: Icon, label, value, sublabel, color = "primary" }: {
    icon: any; label: string; value: string | number; sublabel?: string; color?: "primary" | "accent" | "success";
  }) => (
    <div className="card rounded-2xl p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
        color === "primary" ? "bg-primary-50 text-primary-600" :
        color === "accent" ? "bg-accent-50 text-accent-600" : "bg-success-bg text-success"
      }`}>
        <Icon size={20} />
      </div>
      <p className="font-display text-3xl font-bold text-ink mb-0.5">{value}</p>
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      {sublabel && <p className="text-xs text-ink-subtle mt-0.5">{sublabel}</p>}
    </div>
  );

  const isCurrentMonth = selectedMonth.getMonth() >= new Date().getMonth() &&
    selectedMonth.getFullYear() >= new Date().getFullYear();

  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <div className="pt-16">
        <div className="relative overflow-hidden bg-hero-gradient">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <h1 className="page-title text-ink mb-2">
              สถิติการจอง
            </h1>
            <p className="text-ink-muted text-lg font-medium">ภาพรวมการใช้งานห้องประชุม SMC</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-6">

          {/* View switch — mirrors the navbar's "สถิติการจอง" dropdown */}
          <div className="flex gap-2">
            <button
              onClick={() => switchView("month")}
              className={`px-5 py-2.5 rounded-btn text-base font-semibold transition-all ${view === "month" ? "bg-primary-600 text-ink-inverse" : "btn-outline"}`}
            >
              สรุปรายเดือน
            </button>
            <button
              onClick={() => switchView("year")}
              className={`px-5 py-2.5 rounded-btn text-base font-semibold transition-all ${view === "year" ? "bg-primary-600 text-ink-inverse" : "btn-outline"}`}
            >
              สรุปรายปี
            </button>
          </div>

          {view === "month" && (
          <>

          {/* Month selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
                className="px-4 py-2.5 btn-outline text-base font-medium"
              >
                ← เดือนก่อน
              </button>
              <span className="font-display font-bold text-ink text-xl">
                {format(selectedMonth, "MMMM yyyy", { locale: th })}
              </span>
              <button
                onClick={() => { if (!isCurrentMonth) setSelectedMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; }); }}
                disabled={isCurrentMonth}
                className="px-4 py-2.5 btn-outline text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                เดือนถัดไป →
              </button>
            </div>
            <button
              onClick={() => exportReservationsToExcel(monthReservations, `การจอง-${format(selectedMonth, "yyyy-MM")}.xlsx`)}
              disabled={monthReservations.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 btn-outline text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />
              ส่งออกเป็น Excel
            </button>
          </div>

          {/* Stat cards */}
          <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard icon={Calendar} label="การจองทั้งหมด" value={monthReservations.length} sublabel="ครั้ง" color="primary" />
                <StatCard icon={Clock} label="ชั่วโมงรวม" value={totalHours(monthReservations).toFixed(1)} sublabel="ชั่วโมง" color="accent" />
                <StatCard icon={Building2} label="วันที่มีการจอง" value={new Set(monthReservations.map((r) => r.date)).size} sublabel="วัน" color="success" />
                <StatCard icon={BarChart3} label="เฉลี่ยต่อวัน" value={
                  new Set(monthReservations.map((r) => r.date)).size > 0
                    ? (monthReservations.length / new Set(monthReservations.map((r) => r.date)).size).toFixed(1)
                    : "0"
                } sublabel="ครั้ง/วัน" color="primary" />
              </>
            )}
          </motion.div>

          {/* Room comparison */}
          <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <>
                <RoomCardSkeleton /><RoomCardSkeleton />
              </>
            ) : (
              [
                { room: "SMC 601", id: "smc-601", res: room601 },
                { room: "SMC 605", id: "smc-605", res: room605 },
              ].map(({ room, id, res }) => {
                const style = getRoomStyle(getRoomTheme(id));
                return (
                  <div key={id} className="card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-ink">{room}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.badgeBg}`}>
                        {res.length} ครั้ง
                      </span>
                    </div>
                    <div className="space-y-2 text-base">
                      <div className="flex justify-between text-ink-muted">
                        <span>ชั่วโมงรวม</span>
                        <span className="text-ink font-semibold">{totalHours(res).toFixed(1)} ชม.</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>สัดส่วน</span>
                        <span className="text-ink font-semibold">
                          {monthReservations.length ? Math.round((res.length / monthReservations.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${style.dot}`}
                        style={{ width: monthReservations.length ? `${(res.length / monthReservations.length) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>

          </>
          )}

          {view === "year" && (
          <>

          {/* Year selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="px-4 py-2.5 btn-outline text-base font-medium"
              >
                ← ปีก่อน
              </button>
              <span className="font-display font-bold text-ink text-xl">{selectedYear}</span>
              <button
                onClick={() => { if (!isCurrentYear) setSelectedYear((y) => y + 1); }}
                disabled={isCurrentYear}
                className="px-4 py-2.5 btn-outline text-base font-medium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ปีถัดไป →
              </button>
            </div>
            <button
              onClick={() => exportReservationsToExcel(yearReservations, `การจอง-${selectedYear}.xlsx`)}
              disabled={yearReservations.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 btn-outline text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />
              ส่งออกเป็น Excel
            </button>
          </div>

          {/* Stat cards */}
          <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {yearLoading ? (
              <>
                <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard icon={Calendar} label="การจองทั้งหมด" value={yearReservations.length} sublabel="ครั้ง" color="primary" />
                <StatCard icon={Clock} label="ชั่วโมงรวม" value={totalHours(yearReservations).toFixed(1)} sublabel="ชั่วโมง" color="accent" />
                <StatCard icon={Building2} label="วันที่มีการจอง" value={yearActiveDays} sublabel="วัน" color="success" />
                <StatCard icon={BarChart3} label="เฉลี่ยต่อวัน" value={
                  yearActiveDays > 0 ? (yearReservations.length / yearActiveDays).toFixed(1) : "0"
                } sublabel="ครั้ง/วัน" color="primary" />
              </>
            )}
          </motion.div>

          {/* Room comparison */}
          <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {yearLoading ? (
              <>
                <RoomCardSkeleton /><RoomCardSkeleton />
              </>
            ) : (
              [
                { room: "SMC 601", id: "smc-601", res: yearRoom601 },
                { room: "SMC 605", id: "smc-605", res: yearRoom605 },
              ].map(({ room, id, res }) => {
                const style = getRoomStyle(getRoomTheme(id));
                return (
                  <div key={id} className="card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-ink">{room}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.badgeBg}`}>
                        {res.length} ครั้ง
                      </span>
                    </div>
                    <div className="space-y-2 text-base">
                      <div className="flex justify-between text-ink-muted">
                        <span>ชั่วโมงรวม</span>
                        <span className="text-ink font-semibold">{totalHours(res).toFixed(1)} ชม.</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>สัดส่วน</span>
                        <span className="text-ink font-semibold">
                          {yearReservations.length ? Math.round((res.length / yearReservations.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${style.dot}`}
                        style={{ width: yearReservations.length ? `${(res.length / yearReservations.length) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>

          {/* Monthly breakdown chart */}
          <div className="card rounded-2xl p-6">
            <h3 className="text-ink mb-5 flex items-center gap-2">
              <CalendarRange size={20} className="text-primary-600" />
              การจองรายเดือน
            </h3>
            <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {yearLoading ? (
                <BarChartSkeleton bars={12} />
              ) : (
                <>
                  <div className="flex items-end gap-2 h-40">
                    {monthlyBreakdown.map(({ label, count }) => (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full flex items-end justify-center" style={{ height: "112px" }}>
                          <div
                            className="w-full rounded-t-lg bg-primary-500 transition-all duration-700 hover:bg-primary-600"
                            style={{ height: `${(count / maxMonthlyCount) * 112}px`, minHeight: count > 0 ? "4px" : "0" }}
                            title={`${count} ครั้ง`}
                          />
                        </div>
                        <span className="text-xs text-ink-subtle whitespace-nowrap">{label}</span>
                      </div>
                    ))}
                  </div>
                  {yearReservations.length === 0 && (
                    <p className="text-sm text-ink-subtle text-center py-4">ไม่มีการจองในปีนี้</p>
                  )}
                </>
              )}
            </motion.div>
          </div>

          </>
          )}

          {view === "month" && (
          <>

          {/* Equipment usage */}
          <div className="card rounded-2xl p-6">
            <h3 className="text-ink mb-5 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-600" />
              การใช้อุปกรณ์
            </h3>
            <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="space-y-3">
              {loading ? (
                <>
                  <BarRowSkeleton /><BarRowSkeleton /><BarRowSkeleton />
                </>
              ) : (
                <>
                  {equipmentCounts.map((eq) => {
                    const IconComp = ICON_MAP[eq.iconName];
                    const pct = maxEquipCount > 0 ? (eq.count / maxEquipCount) * 100 : 0;
                    return (
                      <div key={eq.id} className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                          {IconComp && <IconComp size={16} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base text-ink-muted">{eq.label}</span>
                            <span className="text-base font-semibold text-ink">{eq.count} ครั้ง</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary-600 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {equipmentCounts.every((e) => e.count === 0) && (
                    <p className="text-sm text-ink-subtle text-center py-4">ไม่มีการใช้อุปกรณ์เพิ่มเติมในเดือนนี้</p>
                  )}
                </>
              )}
            </motion.div>
          </div>

          {/* Time distribution */}
          <div className="card rounded-2xl p-6">
            <h3 className="text-ink mb-5 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-600" />
              การกระจายตามช่วงเวลา
            </h3>
            <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {loading ? (
                <BarChartSkeleton bars={10} />
              ) : (
                <>
                  <div className="flex items-end gap-2 h-40">
                    {hourDistribution.map(({ label, count }) => (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center" style={{ height: "112px" }}>
                          <div
                            className="w-full rounded-t-lg bg-primary-500 transition-all duration-700 hover:bg-primary-600"
                            style={{ height: `${(count / maxHourCount) * 112}px`, minHeight: count > 0 ? "4px" : "0" }}
                            title={`${count} ครั้ง`}
                          />
                        </div>
                        <span className="text-xs text-ink-subtle rotate-[-35deg] origin-top-right translate-x-1 whitespace-nowrap">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-ink-subtle text-center mt-8">ช่วงเวลา (น.)</p>
                </>
              )}
            </motion.div>
          </div>

          {/* Calendar heatmap — reuses MonthCalendar in density mode */}
          <div className="card rounded-2xl p-6">
            <h3 className="text-ink mb-5 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              ความหนาแน่นการจองรายวัน
            </h3>
            <MonthCalendar
              currentMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              showHeader={false}
              selectedDate={selectedDay ?? undefined}
              onSelectDate={(day) => setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))}
              getDayIntensity={(day) => getDayCount(day) / maxDayCount}
              getDayTitle={(day) => `${format(day, "d MMM", { locale: th })}: ${getDayCount(day)} การจอง`}
            />

            {/* Day summary — morphs out of the clicked grid cell into a popup, and shrinks back into it on close. */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedDay(null)}
                >
                  <div className="absolute inset-0 bg-ink/40" />
                  <motion.div
                    layoutId={dayLayoutId(selectedDay)}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative card rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-display font-bold text-ink text-xl">
                        {format(selectedDay, "EEEE d MMMM yyyy", { locale: th })}
                      </h4>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="p-2 rounded-btn text-ink-subtle hover:text-ink hover:bg-surface-hover transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    {selectedDayReservations.length === 0 ? (
                      <p className="text-sm text-ink-subtle text-center py-6">ไม่มีการจองในวันนี้</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayReservations.map((res) => (
                          <ReservationCard key={res.id} res={res} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          </>
          )}

        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StatisticsContent />
    </Suspense>
  );
}
