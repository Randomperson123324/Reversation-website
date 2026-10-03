"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TransitionLink, usePageTransition } from "@/components/PageTransition";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, ROOMS, getRoomTheme, getRoomLabel } from "@/types";
import { getRoomStyle } from "@/lib/roomStyles";
import Navbar from "@/components/Navbar";
import MonthCalendar, { dateTransitionLayoutId } from "@/components/MonthCalendar";
import { Plus, Calendar, BarChart3, Clock, UserRoundCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { beginTransition, isTransitioning } = usePageTransition();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(department)")
      .eq("status", "confirmed")
      .gte("date", start)
      .lte("date", end)
      .order("start_time");
    setReservations(data || []);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const getDayReservations = (date: Date) =>
    reservations.filter((r) => isSameDay(new Date(r.date + "T00:00:00"), date));

  const getDayDots = (date: Date) => {
    const dayRes = getDayReservations(date);
    return {
      has601: dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-601")),
      has605: dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-605")),
    };
  };

  const selectedDateReservations = getDayReservations(selectedDate);

  // Monthly stats per room
  const getMonthStats = (roomId: string) => {
    const roomRes = reservations.filter((r) => (r.room_ids || [r.room_id]).includes(roomId));
    const totalHours = roomRes.reduce((acc, r) => {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      return acc + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);
    const uniqueDays = new Set(roomRes.map((r) => r.date)).size;
    return { count: roomRes.length, hours: totalHours, days: uniqueDays };
  };

  return (
    <div className="min-h-screen bg-app">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 bg-hero-gradient">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center mb-6 animate-fade-up">
              <Image src="/header-logo.png" alt="SMC Logo" width={220} height={60} className="object-contain" />
            </div>
            <h1 className="mb-4 animate-fade-up delay-100 text-ink">
              ยินดีต้อนรับเข้าสู่
              <br />
              <span className="text-primary-600">ระบบจองห้อง SMC</span>
            </h1>
            <p className="text-ink-muted text-xl sm:text-2xl font-semibold max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
              Smart Classroom
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <TransitionLink
                href="/reserve"
                label="จองห้องประชุม"
                icon={Plus}
                iconSize={24}
                gapClassName="gap-3"
                iconClassName="group-hover:rotate-90 transition-transform duration-300"
                className="group flex items-center justify-center gap-3 px-9 py-5 btn-primary font-display font-bold text-xl"
              />
              <TransitionLink
                href="/my-reservations"
                label="การจองของฉัน"
                icon={UserRoundCheck}
                iconSize={24}
                gapClassName="gap-3"
                className="group flex items-center justify-center gap-3 px-9 py-5 btn-outline font-display font-bold text-xl"
              />
              <TransitionLink
                href="/all-reservations"
                label="การจองทั้งหมด"
                icon={Calendar}
                iconSize={24}
                gapClassName="gap-3"
                className="group flex items-center justify-center gap-3 px-9 py-5 btn-outline font-display font-bold text-xl"
              />
              <TransitionLink
                href="/statistics"
                label="สถิติการจอง"
                icon={BarChart3}
                iconSize={24}
                gapClassName="gap-3"
                className="group flex items-center justify-center gap-3 px-9 py-5 btn-outline font-display font-bold text-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* LEFT: Monthly stats */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-ink mb-1">ภาพรวมเดือนนี้</h2>
              <p className="text-ink-muted text-lg font-medium">{format(currentMonth, "MMMM yyyy", { locale: th })}</p>
            </div>

            {/* Overall month stat */}
            <div className="card rounded-2xl p-5">
              <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                {loading ? (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="skeleton rounded-xl h-[88px]" />
                      <div className="skeleton rounded-xl h-[88px]" />
                    </div>
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-xl p-4 mb-3 last:mb-0 bg-surface-muted">
                        <div className="flex items-center justify-between mb-3">
                          <div className="skeleton rounded h-6 w-24" />
                          <div className="skeleton rounded-full h-6 w-14" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="skeleton rounded h-4 w-16" />
                          <div className="skeleton rounded h-4 w-16" />
                        </div>
                        <div className="skeleton rounded-full h-1.5 w-full mt-3" />
                        <div className="skeleton rounded h-3 w-32 mt-1.5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-primary-50 rounded-xl p-4 text-center">
                        <p className="text-4xl font-display font-bold text-primary-700">{reservations.length}</p>
                        <p className="text-base font-semibold text-ink-muted mt-0.5">การจองทั้งหมด</p>
                      </div>
                      <div className="bg-accent-50 rounded-xl p-4 text-center">
                        <p className="text-4xl font-display font-bold text-accent-700">
                          {new Set(reservations.map((r) => r.date)).size}
                        </p>
                        <p className="text-base font-semibold text-ink-muted mt-0.5">วันที่มีการจอง</p>
                      </div>
                    </div>

                    {/* Per-room breakdown */}
                    {ROOMS.map((room) => {
                      const stats = getMonthStats(room.id);
                      const style = getRoomStyle(getRoomTheme(room.id));
                      return (
                        <div key={room.id} className={`rounded-xl p-4 mb-3 last:mb-0 ${style.chipBg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`font-display font-bold text-xl ${style.text}`}>
                              {room.name}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${style.badgeBg}`}>
                              {stats.count} ครั้ง
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-base">
                            <div className="flex items-center gap-1.5 text-ink-muted">
                              <Clock size={15} />
                              <span>{stats.hours.toFixed(1)} ชม.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink-muted">
                              <Calendar size={15} />
                              <span>{stats.days} วัน</span>
                            </div>
                          </div>
                          {/* Usage bar */}
                          <div className="mt-3 h-1.5 rounded-full bg-surface overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${style.dot}`}
                              style={{ width: reservations.length ? `${(stats.count / reservations.length) * 100}%` : "0%" }}
                            />
                          </div>
                          <p className="text-sm text-ink-subtle mt-1.5">
                            {reservations.length ? Math.round((stats.count / reservations.length) * 100) : 0}% ของการจองทั้งหมด
                          </p>
                        </div>
                      );
                    })}
                  </>
                )}
              </motion.div>
            </div>

            {/* Selected date detail */}
            <div className="card rounded-2xl p-5">
              <h2 className="text-ink mb-3">
                {format(selectedDate, "d MMMM yyyy", { locale: th })}
              </h2>
              <motion.div layout transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-xl bg-surface-muted border border-line p-3 space-y-2">
                      <div className="skeleton rounded h-4 w-32" />
                      <div className="skeleton rounded h-3 w-24" />
                      <div className="skeleton rounded-lg h-14 w-full" />
                    </div>
                  ))}
                </div>
              ) : selectedDateReservations.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-9 h-9 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <p className="text-base text-ink-muted">ไม่มีการจองในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedDateReservations.map((res) => {
                    const ids: string[] = res.room_ids?.length ? res.room_ids : res.room_id ? [res.room_id] : [];
                    const isMulti = ids.length > 1;
                    return (
                      <div key={res.id} className="rounded-xl bg-surface-muted border border-line overflow-hidden">
                        {/* Title row */}
                        <div className="px-3 pt-2.5 pb-1.5 flex flex-col gap-0.5">
                          <p className="text-base font-semibold text-ink truncate">{res.title}</p>
                          {res.department && (
                            <p className="text-sm text-ink-subtle">สาขา: {res.department}</p>
                          )}
                          {res.internal_number && (
                            <p className="text-sm text-ink-subtle">เบอร์ภายใน: {res.internal_number}</p>
                          )}
                        </div>
                        {/* Room boxes */}
                        <div className={`px-2.5 pb-2.5 ${isMulti ? "grid grid-cols-2 gap-1.5" : ""}`}>
                          {ids.map((id) => {
                            const style = getRoomStyle(getRoomTheme(id));
                            return (
                              <div key={id} className={`rounded-lg px-2.5 py-2 flex flex-col items-start gap-1 ${style.chipBg}`}>
                                <span className={`text-sm font-bold ${style.text}`}>
                                  {getRoomLabel(id)}
                                </span>
                                <div className="flex w-full flex-col gap-1 mt-0.5">
                                  {res.description && (
                                    <div className="text-sm text-ink-muted leading-tight line-clamp-2 mb-0.5">
                                      {res.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-sm text-ink-subtle">
                                    <Clock size={11} />
                                    {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT: Calendar */}
          <div className="lg:col-span-3 space-y-5">
            {/* Invisible spacer matching the "ภาพรวมเดือนนี้" heading block on the
                left, so the calendar card's top edge lines up with the first
                stat card's top edge instead of the column top. */}
            <div className="invisible hidden lg:block" aria-hidden="true">
              <h2 className="mb-1">ภาพรวมเดือนนี้</h2>
              <p className="text-lg font-medium">&nbsp;</p>
            </div>
            <div className="card rounded-2xl p-5 sticky top-20">
              <MonthCalendar
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onDoubleClickDate={(day) => {
                  if (isTransitioning) return;
                  const href = `/reserve?date=${format(day, "yyyy-MM-dd")}&step=2`;
                  beginTransition({ id: dateTransitionLayoutId(day), href, label: "จองห้องประชุม", icon: Plus });
                  router.push(href);
                }}
                enableDateTransition
                getDayDots={getDayDots}
              />
            </div>
          </div>

        </div>
      </section>

      <footer className="border-t border-line py-8 flex flex-col items-center justify-center gap-4">
        <Image src="/footer-logo.png" alt="SMC Footer Logo" width={180} height={60} className="object-contain opacity-70" />
        <p className="text-sm text-ink-subtle text-center">หน่วยเทคโนโลยีการศึกษา 1151</p>
      </footer>
    </div>
  );
}
