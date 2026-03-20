"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation } from "@/types";
import Navbar from "@/components/Navbar";
import { Plus, Calendar, BarChart3, ChevronLeft, ChevronRight, Clock, Building2 } from "lucide-react";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const ROOMS = [
  { id: "smc-601", name: "SMC 601" },
  { id: "smc-605", name: "SMC 605" },
];

export default function HomePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*")
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

  const calendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return { days, startPadding: start.getDay() };
  };

  const { days, startPadding } = calendarDays();

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-500/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-primary-300 text-sm font-medium mb-6 animate-fade-up">
              <Building2 size={14} />
              ระบบจองห้องประชุม SMC
            </div>
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 animate-fade-up delay-100">
              <span className="text-white">ยินดีต้อนรับเข้าสู่</span>
              <br />
              <span className="gradient-text">ระบบจองห้อง Smart Classroom</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
              สามารถจองห้องประชุม SMC 601 และ SMC 605 ได้
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
              <Link href="/reserve" className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl btn-accent font-display font-semibold text-lg shadow-glow-accent">
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                จองห้องประชุม
              </Link>
              <Link href="/my-reservations" className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl glass border border-primary-500/30 text-white font-display font-semibold text-lg hover:bg-primary-600/20 hover:border-primary-400/50 transition-all">
                <Calendar size={20} />
                การจองของฉัน
              </Link>
              <Link href="/statistics" className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl glass border border-slate-600/30 text-slate-300 font-display font-semibold text-lg hover:bg-white/5 hover:text-white transition-all">
                <BarChart3 size={20} />
                สถิติการจอง
              </Link>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="#020617" />
          </svg>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: Monthly stats */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-white mb-1">ภาพรวมเดือนนี้</h2>
              <p className="text-slate-400 text-sm">{format(currentMonth, "MMMM yyyy", { locale: th })}</p>
            </div>

            {/* Overall month stat */}
            <div className="glass rounded-2xl p-5 border border-primary-700/20">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-primary-900/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-display font-bold text-primary-300">{reservations.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">การจองทั้งหมด</p>
                </div>
                <div className="bg-accent-600/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-display font-bold text-accent-400">
                    {new Set(reservations.map((r) => r.date)).size}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">วันที่มีการจอง</p>
                </div>
              </div>

              {/* Per-room breakdown */}
              {ROOMS.map((room) => {
                const stats = getMonthStats(room.id);
                const isRoom601 = room.id === "smc-601";
                return (
                  <div key={room.id} className={`rounded-xl p-4 border mb-3 last:mb-0 ${isRoom601 ? "bg-accent-500/10 border-accent-500/20" : "bg-primary-500/10 border-primary-500/20"
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-display font-bold text-lg ${isRoom601 ? "text-accent-300" : "text-primary-300"}`}>
                        {room.name}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isRoom601 ? "bg-accent-500/20 text-accent-300" : "bg-primary-500/20 text-primary-300"
                        }`}>
                        {stats.count} ครั้ง
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={12} />
                        <span>{stats.hours.toFixed(1)} ชม.</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={12} />
                        <span>{stats.days} วัน</span>
                      </div>
                    </div>
                    {/* Usage bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isRoom601 ? "bg-accent-gradient" : "bg-primary-600"}`}
                        style={{ width: reservations.length ? `${(stats.count / reservations.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {reservations.length ? Math.round((stats.count / reservations.length) * 100) : 0}% ของการจองทั้งหมด
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected date detail */}
            <div className="glass rounded-2xl p-5 border border-primary-700/20">
              <h3 className="font-display font-semibold text-white text-sm mb-3">
                {format(selectedDate, "d MMMM yyyy", { locale: th })}
              </h3>
              {selectedDateReservations.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-400">ไม่มีการจองในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedDateReservations.map((res) => {
                    const ids: string[] = res.room_ids?.length ? res.room_ids : res.room_id ? [res.room_id] : [];
                    const isMulti = ids.length > 1;
                    return (
                      <div key={res.id} className="rounded-xl bg-surface-800/60 border border-white/5 overflow-hidden">
                        {/* Title row */}
                        <div className="px-3 pt-2.5 pb-1.5">
                          <p className="text-sm font-medium text-white truncate">{res.title}</p>
                        </div>
                        {/* Room boxes */}
                        <div className={`px-2.5 pb-2.5 ${isMulti ? "grid grid-cols-2 gap-1.5" : ""}`}>
                          {ids.map((id) => (
                            <div key={id} className={`rounded-lg px-2.5 py-1.5 flex items-center gap-2 ${id === "smc-601"
                                ? "bg-accent-500/10 border border-accent-500/20"
                                : "bg-primary-500/10 border border-primary-500/20"
                              }`}>
                              <span className={`text-xs font-bold ${id === "smc-601" ? "text-accent-300" : "text-primary-300"}`}>
                                {id === "smc-601" ? "601" : "605"}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={9} />
                                {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Calendar */}
          <div className="lg:col-span-3">
            <div className="glass rounded-2xl p-5 border border-primary-700/20 sticky top-20">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold text-white">
                  {format(currentMonth, "MMMM yyyy", { locale: th })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const p = new Date(currentMonth); p.setMonth(p.getMonth() - 1); setCurrentMonth(p); }}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 hover:text-white transition-all"
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => {
                  const dayRes = getDayReservations(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);
                  const has601 = dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-601"));
                  const has605 = dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-605"));

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                        ${isSelected ? "bg-primary-600 text-white shadow-glow scale-105"
                          : isCurrentDay ? "border-2 border-accent-500/60 text-accent-300 hover:bg-white/5"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"}
                      `}
                    >
                      <span>{format(day, "d")}</span>
                      {(has601 || has605) && (
                        <div className="flex gap-0.5 mt-0.5">
                          {has601 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/60" : "bg-accent-400"}`} />}
                          {has605 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/40" : "bg-primary-400"}`} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-400" />SMC 601</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-400" />SMC 605</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border-2 border-accent-500/60" />วันนี้</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-sm text-slate-500">
        <p>SMC Room Booking System</p>
      </footer>
    </div>
  );
}
