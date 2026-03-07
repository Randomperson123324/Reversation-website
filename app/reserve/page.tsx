"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  format, isBefore, startOfDay, isSameDay, isToday,
  startOfMonth, endOfMonth, eachDayOfInterval,
} from "date-fns";
import { th } from "date-fns/locale";
import { ROOMS, TIME_OPTIONS, EQUIPMENT_OPTIONS, Equipment, Reservation } from "@/types";
import {
  Calendar, Clock, Users, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, Building2, BarChart2, Projector, Volume2, Wrench,
  Phone, GraduationCap, User, FileText,
} from "lucide-react";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const ICON_MAP: Record<string, React.ElementType> = { BarChart2, Projector, Volume2 };

const DEPARTMENTS = [
  "วิทยาการคอมพิวเตอร์",
  "เทคโนโลยีสารสนเทศ",
  "วิศวกรรมซอฟต์แวร์",
  "ระบบสารสนเทศทางธุรกิจ",
  "เทคโนโลยีมัลติมีเดีย",
  "วิศวกรรมคอมพิวเตอร์",
  "อื่นๆ",
];

// Time slot groups for display
const MORNING_SLOTS = TIME_OPTIONS.filter((t) => t < "12:00");
const AFTERNOON_SLOTS = TIME_OPTIONS.filter((t) => t >= "12:00" && t < "18:00");

function StepIndicator({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
      done ? "bg-primary-600 border-primary-500 text-white" :
      active ? "border-primary-400 text-primary-300 bg-primary-900/40" :
      "border-slate-700 text-slate-600"
    }`}>
      {done ? <CheckCircle size={16} /> : step}
    </div>
  );
}

function ReserveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 – date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Step 2 – rooms & time (fetched per date)
  const [allDayReservations, setAllDayReservations] = useState<Reservation[]>([]);
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 3 – equipment
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);

  // Step 4 – details
  const [department, setDepartment] = useState("");
  const [phoneInternal, setPhoneInternal] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
      if (!data.user) router.push("/auth/login?redirect=/reserve");
    });
  }, []);

  // Fetch month reservations for calendar dots
  const fetchMonthReservations = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "confirmed")
      .gte("date", start)
      .lte("date", end);
    setMonthReservations(data || []);
  }, [currentMonth]);

  useEffect(() => { fetchMonthReservations(); }, [fetchMonthReservations]);

  // Fetch reservations for selected date
  const fetchDayReservations = useCallback(async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "confirmed")
      .eq("date", dateStr);
    setAllDayReservations(data || []);
  }, [selectedDate]);

  useEffect(() => {
    if (step >= 2) fetchDayReservations();
  }, [fetchDayReservations, step]);

  // Calendar helpers
  const getDayDots = (day: Date) => {
    const dayRes = monthReservations.filter((r) =>
      isSameDay(new Date(r.date + "T00:00:00"), day)
    );
    const has601 = dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-601"));
    const has605 = dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-605"));
    return { has601, has605 };
  };

  const calDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPadding = startOfMonth(currentMonth).getDay();

  // Room availability helpers
  const getRoomReservations = (roomId: string) =>
    allDayReservations.filter((r) => (r.room_ids || [r.room_id]).includes(roomId));

  const isSlotBooked = (roomId: string, slotStart: string) => {
    const slotEnd = TIME_OPTIONS[TIME_OPTIONS.indexOf(slotStart) + 1] || "18:30";
    return getRoomReservations(roomId).some(
      (r) => !(slotEnd <= r.start_time.slice(0, 5) || slotStart >= r.end_time.slice(0, 5))
    );
  };

  const isRoomTimeConflict = (roomId: string, s: string, e: string) =>
    getRoomReservations(roomId).some(
      (r) => !(e <= r.start_time.slice(0, 5) || s >= r.end_time.slice(0, 5))
    );

  const toggleRoom = (id: string) => {
    setSelectedRooms((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (eq: Equipment) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  };

  const endTimeOptions = startTime ? TIME_OPTIONS.filter((t) => t > startTime) : [];

  const hasAnyConflict = selectedRooms.some((rid) =>
    startTime && endTime ? isRoomTimeConflict(rid, startTime, endTime) : false
  );

  const handleSubmit = async () => {
    if (!department.trim()) return toast.error("กรุณาเลือกสาขาวิชา");
    if (!instructorName.trim()) return toast.error("กรุณากรอกชื่อผู้สอน");

    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      user_id: user.id,
      room_ids: selectedRooms,
      date: format(selectedDate, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime,
      title: instructorName.trim(),
      description: [
        department ? `สาขา: ${department}` : "",
        phoneInternal ? `เบอร์ภายใน: ${phoneInternal}` : "",
        description ? `หมายเหตุ: ${description}` : "",
      ].filter(Boolean).join(" | ") || null,
      equipment: selectedEquipment,
      status: "confirmed",
    });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("จองห้องสำเร็จ! 🎉");
      router.push("/my-reservations");
    }
    setSubmitting(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />

      <div className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/50 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            <span className="gradient-text">จองห้องประชุม</span>
          </h1>
          <p className="text-slate-400">กรอกข้อมูลทีละขั้นตอนเพื่อจองห้องประชุม</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

        {/* Step bar */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { n: 1, label: "เลือกวันที่" },
            { n: 2, label: "ห้อง & เวลา" },
            { n: 3, label: "อุปกรณ์" },
            { n: 4, label: "รายละเอียด" },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <StepIndicator step={n} current={step} />
                <span className={`text-sm font-medium whitespace-nowrap ${
                  step === n ? "text-primary-300" : step > n ? "text-slate-400" : "text-slate-600"
                }`}>{label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 h-px mx-1 ${step > n ? "bg-primary-600" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ─────────── STEP 1: Calendar ─────────── */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <Calendar size={20} className="text-primary-400" /> เลือกวันที่ต้องการจอง
            </h2>

            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-white text-lg">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => {
                  const p = new Date(currentMonth); p.setMonth(p.getMonth() - 1); setCurrentMonth(p);
                }} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => {
                  setCurrentMonth(new Date()); setSelectedDate(new Date());
                }} className="px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 hover:text-white transition-all">
                  วันนี้
                </button>
                <button type="button" onClick={() => {
                  const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n);
                }} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPadding }).map((_, i) => <div key={`p${i}`} />)}
              {calDays.map((day) => {
                const isPast = isBefore(day, startOfDay(new Date()));
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const { has601, has605 } = getDayDots(day);
                return (
                  <button
                    key={day.toString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed
                      ${isSelected ? "bg-primary-600 text-white shadow-glow scale-105"
                        : isCurrentDay ? "border-2 border-accent-500/60 text-accent-300 hover:bg-white/5"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
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
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-400" />SMC 601 มีการจอง</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-400" />SMC 605 มีการจอง</span>
            </div>

            {/* Selected date + next */}
            <div className="mt-5 flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-primary-900/30 border border-primary-700/30">
                <p className="text-sm text-primary-300 font-medium">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2"
              >
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────── STEP 2: Rooms & Time ─────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
              <p className="text-sm text-primary-300 font-medium">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
              </p>
            </div>

            {/* Room cards with time slots */}
            {ROOMS.map((room) => {
              const roomRes = getRoomReservations(room.id);
              const isSelected = selectedRooms.includes(room.id);

              return (
                <div key={room.id} className={`glass rounded-2xl border-2 transition-all overflow-hidden ${
                  isSelected ? "border-primary-500" : "border-white/10"
                }`}>
                  {/* Room header */}
                  <button
                    type="button"
                    onClick={() => toggleRoom(room.id)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg ${
                        room.id === "smc-601"
                          ? "bg-accent-500/20 text-accent-300 border border-accent-500/30"
                          : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                      }`}>
                        {room.id === "smc-601" ? "601" : "605"}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-white text-lg">{room.name}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1.5">
                          <Users size={12} /> {room.capacity} คน · {room.description}
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "bg-primary-500 border-primary-400" : "border-slate-600"
                    }`}>
                      {isSelected && <CheckCircle size={14} className="text-white" />}
                    </div>
                  </button>

                  {/* Time slot grid */}
                  <div className="px-5 pb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">ช่วงเวลาว่าง</p>

                    {/* Morning */}
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-2">ช่วงเช้า (08:00 - 12:00)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MORNING_SLOTS.map((slot, i) => {
                          const slotEnd = MORNING_SLOTS[i + 1] || "12:00";
                          const booked = isSlotBooked(room.id, slot);
                          return (
                            <div key={slot} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              booked
                                ? "bg-red-900/20 border-red-700/30 text-red-400"
                                : "bg-emerald-900/20 border-emerald-700/30 text-emerald-400"
                            }`}>
                              {slot}
                              {booked && " ✕"}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Afternoon */}
                    <div>
                      <p className="text-xs text-slate-500 mb-2">ช่วงบ่าย (12:00 - 18:00)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {AFTERNOON_SLOTS.map((slot) => {
                          const booked = isSlotBooked(room.id, slot);
                          return (
                            <div key={slot} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              booked
                                ? "bg-red-900/20 border-red-700/30 text-red-400"
                                : "bg-emerald-900/20 border-emerald-700/30 text-emerald-400"
                            }`}>
                              {slot}
                              {booked && " ✕"}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Existing bookings list */}
                    {roomRes.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {roomRes.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-slate-400 bg-surface-800/40 rounded-lg px-3 py-2">
                            <Clock size={11} className="text-red-400 flex-shrink-0" />
                            <span className="text-red-300 font-medium">{r.start_time.slice(0,5)} - {r.end_time.slice(0,5)} น.</span>
                            <span className="truncate">{r.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Time range picker */}
            {selectedRooms.length > 0 && (
              <div className="glass rounded-2xl p-5 border border-primary-700/20">
                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-primary-400" /> เลือกช่วงเวลา
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">เวลาเริ่มต้น</label>
                    <select
                      value={startTime}
                      onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}
                      className="w-full px-4 py-3 rounded-xl input-dark text-sm cursor-pointer"
                    >
                      <option value="" disabled>เลือกเวลาเริ่มต้น</option>
                      {TIME_OPTIONS.slice(0, -1).map((t) => (
                        <option key={t} value={t}>{t} น.</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">เวลาสิ้นสุด</label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!startTime}
                      className="w-full px-4 py-3 rounded-xl input-dark text-sm cursor-pointer disabled:opacity-40"
                    >
                      <option value="" disabled>{startTime ? "เลือกเวลาสิ้นสุด" : "เลือกเวลาเริ่มก่อน"}</option>
                      {endTimeOptions.map((t) => (
                        <option key={t} value={t}>{t} น.</option>
                      ))}
                    </select>
                  </div>
                </div>

                {startTime && endTime && hasAnyConflict && (
                  <div className="mt-3 p-3 rounded-xl bg-red-900/20 border border-red-700/30 flex items-center gap-2 text-sm text-red-300">
                    <AlertTriangle size={14} /> ช่วงเวลานี้ทับซ้อนกับการจองที่มีอยู่
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-700/30" /> ว่าง
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-900/40 border border-red-700/30" /> ไม่ว่าง
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={selectedRooms.length === 0 || !startTime || !endTime || hasAnyConflict}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────── STEP 3: Equipment ─────────── */}
        {step === 3 && (
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <Wrench size={20} className="text-primary-400" /> อุปกรณ์ที่ต้องการ
            </h2>
            <p className="text-xs text-slate-500 mb-6">เลือกได้มากกว่า 1 รายการ (ไม่บังคับ)</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const active = selectedEquipment.includes(eq.id);
                const IconComp = ICON_MAP[eq.iconName];
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      active ? "border-primary-500 bg-primary-600/20" : "border-white/10 hover:border-primary-600/30 hover:bg-primary-900/10"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      active ? "bg-primary-600 text-white" : "bg-white/10 text-slate-400"
                    }`}>
                      {IconComp && <IconComp size={22} />}
                    </div>
                    <span className={`text-sm font-medium text-center leading-tight ${active ? "text-primary-300" : "text-slate-400"}`}>
                      {eq.label}
                    </span>
                    {active && <div className="w-2 h-2 rounded-full bg-primary-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2"
              >
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────── STEP 4: Details ─────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(3)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
            </div>

            <div className="glass rounded-2xl p-6 border border-primary-700/20 space-y-5">
              <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                <FileText size={20} className="text-primary-400" /> รายละเอียดการจอง
              </h2>

              {/* Department dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <GraduationCap size={14} className="inline mr-1.5 text-slate-400" />
                  สาขาวิชา <span className="text-red-400">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm cursor-pointer"
                >
                  <option value="" disabled>เลือกสาขาวิชา</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Internal phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Phone size={14} className="inline mr-1.5 text-slate-400" />
                  เบอร์ติดต่อภายใน
                  <span className="ml-1.5 text-xs text-slate-500">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  value={phoneInternal}
                  onChange={(e) => setPhoneInternal(e.target.value)}
                  placeholder="เช่น 1234"
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  maxLength={10}
                />
              </div>

              {/* Instructor name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <User size={14} className="inline mr-1.5 text-slate-400" />
                  ชื่อผู้สอน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล ผู้สอน"
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  maxLength={100}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  หมายเหตุ
                  <span className="ml-1.5 text-xs text-slate-500">(ไม่บังคับ)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm resize-none"
                  maxLength={500}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="glass rounded-2xl p-5 border border-primary-700/20">
              <h3 className="font-display font-semibold text-white mb-4">สรุปการจอง</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">วันที่</span>
                  <span className="text-white font-medium">{format(selectedDate, "d MMM yyyy", { locale: th })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ห้อง</span>
                  <span className="text-white font-medium">{selectedRooms.map((id) => ROOMS.find((r) => r.id === id)?.name).join(" + ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เวลา</span>
                  <span className="text-white font-medium">{startTime} - {endTime} น.</span>
                </div>
                {selectedEquipment.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">อุปกรณ์</span>
                    <span className="text-white font-medium">{selectedEquipment.map((eq) => EQUIPMENT_OPTIONS.find((e) => e.id === eq)?.label).join(", ")}</span>
                  </div>
                )}
                {department && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">สาขา</span>
                    <span className="text-white font-medium">{department}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !department || !instructorName}
              className="w-full py-4 rounded-xl btn-accent font-display font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังจอง...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> ยืนยันการจอง
                </span>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReserveContent />
    </Suspense>
  );
}
