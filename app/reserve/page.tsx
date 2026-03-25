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
  AlertTriangle, BarChart2, Projector, Volume2, Wrench,
  Phone, GraduationCap, User, FileText, X,
} from "lucide-react";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const ICON_MAP: Record<string, React.ElementType> = { BarChart2, Projector, Volume2 };

const DEPARTMENTS = [
  "สาขาวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ",
  "สาขาวิชาการพยาบาลอนามัยชุมชน",
  "สาขาวิชาการพยาบาลจิตเวชและสุขภาพจิต",
  "สาขาวิชาการพยาบาลเด็ก",
  "สาขาวิชาการพยาบาลมารดา ทารก และการผดุงครรภ์",
  "สาขาวิชาการพยาบาลพื้นฐานและการบริหารพยาบาล",
  "อื่นๆ",
];

// All tappable slots — 07:00 to 18:00 (18:00 acts as end-only)
const ALL_SLOTS = TIME_OPTIONS; // 07:00 … 18:00

// Per-room time selection state
type RoomTime = { start: string; end: string; tapStart: string | null };
const emptyRoomTime = (): RoomTime => ({ start: "", end: "", tapStart: null });

function StepIndicator({ step, current }: { step: number; current: number }) {
  const done = current > step;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${done ? "bg-primary-600 border-primary-500 text-white" :
      current === step ? "border-primary-400 text-primary-300 bg-primary-900/40" :
        "border-slate-700 text-slate-600"
      }`}>
      {done ? <CheckCircle size={16} /> : step}
    </div>
  );
}

// Slot grid for one room
function RoomSlotGrid({
  roomId, roomTime, onTap, isSlotBooked, reservations,
}: {
  roomId: string;
  roomTime: RoomTime;
  onTap: (slot: string) => void;
  isSlotBooked: (slot: string) => boolean;
  reservations: Reservation[];
}) {
  const slotClass = (slot: string) => {
    const booked = isSlotBooked(slot);
    if (booked) return "bg-red-900/20 border-red-700/30 text-red-400 cursor-not-allowed opacity-60";
    const inRange = roomTime.start && roomTime.end && slot >= roomTime.start && slot <= roomTime.end;
    const isPending = roomTime.tapStart === slot;
    if (isPending) return "bg-amber-500/30 border-amber-400/50 text-amber-200 scale-105 shadow-lg";
    if (inRange) return "bg-primary-600/50 border-primary-400/60 text-white scale-[1.02]";
    if (slot === "18:00" && !roomTime.tapStart && !roomTime.start) return "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed";
    return "bg-emerald-900/20 border-emerald-700/30 text-emerald-400 hover:bg-emerald-700/30 hover:scale-105 cursor-pointer";
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Hint */}
      <div className="text-xs text-primary-300/80 bg-primary-900/20 border border-primary-700/20 rounded-lg px-3 py-2 flex items-center gap-2">
        <Clock size={12} />
        {!roomTime.tapStart && !roomTime.start
          ? "แตะเวลาเริ่มต้น"
          : roomTime.tapStart
            ? `เริ่ม ${roomTime.tapStart} น. — แตะเวลาสิ้นสุด`
            : `${roomTime.start} – ${roomTime.end} น.`}
      </div>

      {/* Slots: 07:00–17:00 are start slots; 18:00 is end-only */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {ALL_SLOTS.map((slot) => (
          <button key={slot} type="button"
            disabled={isSlotBooked(slot) || (slot === "18:00" && !roomTime.tapStart && !roomTime.start)}
            onClick={() => onTap(slot)}
            className={`py-2.5 rounded-lg text-xs font-medium border transition-all select-none ${slotClass(slot)}`}>
            {slot}
          </button>
        ))}
      </div>

      {/* Existing bookings */}
      {reservations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs bg-red-900/10 border border-red-800/20 rounded-lg px-3 py-2">
              <Clock size={11} className="text-red-400 flex-shrink-0" />
              <span className="text-red-300 font-medium">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)} น.</span>
              <span className="text-slate-500 truncate">{r.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-900/40 border border-emerald-700/30" />ว่าง</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-400/40" />เวลาเริ่ม</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-primary-600/50 border border-primary-400/50" />ช่วงที่เลือก</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-900/30 border border-red-700/30" />ถูกจอง</span>
      </div>
    </div>
  );
}

function ReserveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState(() => {
    const s = searchParams.get("step");
    return s === "2" ? 2 : 1;
  });

  // Step 1
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = searchParams.get("date");
    return d ? new Date(d + "T00:00:00") : new Date();
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = searchParams.get("date");
    return d ? new Date(d + "T00:00:00") : new Date();
  });
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([]);

  // Step 2 — per-room selection
  const [allDayReservations, setAllDayReservations] = useState<Reservation[]>([]);
  // Which room card is currently open/expanded (only one at a time)
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set(["smc-601", "smc-605"]));
  // Per-room time state: roomId → { start, end, tapStart }
  const [roomTimes, setRoomTimes] = useState<Record<string, RoomTime>>({
    "smc-601": emptyRoomTime(),
    "smc-605": emptyRoomTime(),
  });

  // Step 3
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);

  // Step 4
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

  // Month dots
  const fetchMonthReservations = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase.from("reservations").select("*")
      .eq("status", "confirmed").gte("date", start).lte("date", end);
    setMonthReservations(data || []);
  }, [currentMonth]);

  useEffect(() => { fetchMonthReservations(); }, [fetchMonthReservations]);

  // Day reservations
  const fetchDayReservations = useCallback(async () => {
    const { data } = await supabase.from("reservations").select("*")
      .eq("status", "confirmed").eq("date", format(selectedDate, "yyyy-MM-dd"));
    setAllDayReservations(data || []);
  }, [selectedDate]);

  useEffect(() => { if (step >= 2) fetchDayReservations(); }, [fetchDayReservations, step]);

  // Calendar
  const getDayDots = (day: Date) => {
    const dayRes = monthReservations.filter((r) => isSameDay(new Date(r.date + "T00:00:00"), day));
    return {
      has601: dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-601")),
      has605: dayRes.some((r) => (r.room_ids || [r.room_id]).includes("smc-605")),
    };
  };

  const calDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = startOfMonth(currentMonth).getDay();

  // Room helpers
  const getRoomReservations = (roomId: string) =>
    allDayReservations.filter((r) => (r.room_ids || [r.room_id]).includes(roomId));

  const isSlotBooked = (roomId: string, slot: string) => {
    return getRoomReservations(roomId).some(
      (r) => slot >= r.start_time.slice(0, 5) && slot <= r.end_time.slice(0, 5)
    );
  };

  const toggleExpand = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
      return next;
    });
    if (!roomTimes[roomId]) {
      setRoomTimes((prev) => ({ ...prev, [roomId]: emptyRoomTime() }));
    }
  };

  const clearRoom = (roomId: string) => {
    setRoomTimes((prev) => ({ ...prev, [roomId]: emptyRoomTime() }));
    setExpandedRooms((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
  };

  const handleSlotTap = (roomId: string, slot: string) => {
    const rt = roomTimes[roomId] || emptyRoomTime();

    if (!rt.tapStart) {
      // 18:00 can't be a start time
      if (slot === "18:00") return;
      if (isSlotBooked(roomId, slot)) return;
      // First tap → set start
      setRoomTimes((prev) => ({ ...prev, [roomId]: { start: slot, end: "", tapStart: slot } }));
    } else {
      // Second tap → end time
      // Must be after start
      if (slot <= rt.tapStart) {
        // Tapped same or earlier — restart from this slot
        if (slot === "18:00") return;
        if (isSlotBooked(roomId, slot)) return;
        setRoomTimes((prev) => ({ ...prev, [roomId]: { start: slot, end: "", tapStart: slot } }));
        return;
      }
      const s = rt.tapStart;
      const e = slot; // end time is exactly the tapped slot
      const eIdx = TIME_OPTIONS.indexOf(e);

      // Check no booked slot in range [s, e) — slots the booking occupies
      const sIdx = TIME_OPTIONS.indexOf(s);
      const range = TIME_OPTIONS.slice(sIdx, eIdx);
      if (range.some((sl) => isSlotBooked(roomId, sl))) {
        toast.error("มีการจองในช่วงเวลาที่เลือก กรุณาเลือกใหม่");
        setRoomTimes((prev) => ({ ...prev, [roomId]: emptyRoomTime() }));
        return;
      }
      setRoomTimes((prev) => ({ ...prev, [roomId]: { start: s, end: e, tapStart: null } }));
      // Auto-collapse after confirming
      setExpandedRooms((prev) => { const next = new Set(prev); next.delete(roomId); return next; });
    }
  };

  const toggleEquipment = (eq: Equipment) => {
    setSelectedEquipment((prev) => prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]);
  };

  // Rooms that have a fully confirmed time (independent of expand state)
  const confirmedRooms = ROOMS.map((r) => r.id).filter((id) => {
    const rt = roomTimes[id];
    return rt?.start && rt?.end && !rt?.tapStart;
  });

  // Any room mid-tap?
  const anyPending = Object.values(roomTimes).some((rt) => rt?.tapStart);

  const handleSubmit = async () => {
    if (!department.trim()) return toast.error("กรุณาเลือกสาขาวิชา");
    if (!instructorName.trim()) return toast.error("กรุณากรอกชื่อผู้สอน");

    setSubmitting(true);

    // Insert one record per room so each keeps its own start/end time
    const rows = confirmedRooms.map((roomId) => ({
      user_id: user.id,
      room_ids: [roomId],
      date: format(selectedDate, "yyyy-MM-dd"),
      start_time: roomTimes[roomId].start,
      end_time: roomTimes[roomId].end,
      title: instructorName.trim(),
      department: department || null,
      internal_number: phoneInternal || null,
      description: description || null,
      equipment: selectedEquipment,
      status: "confirmed",
    }));

    const { error } = await supabase.from("reservations").insert(rows);

    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message);
    else { toast.success("จองห้องสำเร็จ! 🎉"); router.push("/my-reservations"); }
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
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            <span className="gradient-text">จองห้องประชุม</span>
          </h1>
          <p className="text-slate-400">กรอกข้อมูลทีละขั้นตอนเพื่อจองห้องประชุม</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">

        {/* Step bar */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { n: 1, label: "เลือกวันที่" },
            { n: 2, label: "ห้อง & เวลา" },
            { n: 3, label: "อุปกรณ์" },
            { n: 4, label: "รายละเอียด" },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2 flex-shrink-0">
              <StepIndicator step={n} current={step} />
              <span className={`text-sm font-medium whitespace-nowrap ${step === n ? "text-primary-300" : step > n ? "text-slate-400" : "text-slate-600"
                }`}>{label}</span>
              {i < arr.length - 1 && <div className={`w-8 h-px mx-1 ${step > n ? "bg-primary-600" : "bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: Calendar ═══ */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <Calendar size={20} className="text-primary-400" /> เลือกวันที่ต้องการจอง
            </h2>

            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-white text-lg">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { const p = new Date(currentMonth); p.setMonth(p.getMonth() - 1); setCurrentMonth(p); }}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 hover:text-white transition-all">
                  วันนี้
                </button>
                <button type="button" onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPadding }).map((_, i) => <div key={`p${i}`} />)}
              {calDays.map((day) => {
                const isPast = isBefore(day, startOfDay(new Date()));
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const { has601, has605 } = getDayDots(day);
                return (
                  <button key={day.toString()} type="button" disabled={isPast}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => { if (!isPast) { setSelectedDate(day); setStep(2); } }}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed
                      ${isSelected ? "bg-primary-600 text-white shadow-glow scale-105"
                        : isCurrentDay ? "border-2 border-accent-500/60 text-accent-300 hover:bg-white/5"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
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

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-400" />SMC 601</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-400" />SMC 605</span>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-primary-900/30 border border-primary-700/30">
                <p className="text-sm text-primary-300 font-medium">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                </p>
              </div>
              <button type="button" onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2">
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Rooms & Time ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
              <p className="text-sm text-primary-300 font-medium">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
              </p>
            </div>

            <p className="text-xs text-slate-400">คลิกที่ห้องเพื่อดูช่วงเวลาว่างและเลือกเวลา</p>

            {ROOMS.map((room) => {
              const isExpanded = expandedRooms.has(room.id);
              const rt = roomTimes[room.id] || emptyRoomTime();
              // Confirmed = has a valid time set (regardless of expand state)
              const isConfirmed = !!(rt.start && rt.end && !rt.tapStart);
              const roomRes = getRoomReservations(room.id);

              return (
                <div key={room.id} className={`glass rounded-2xl border-2 transition-all overflow-hidden ${isConfirmed ? "border-primary-500" : isExpanded ? "border-primary-700/50" : "border-white/10"
                  }`}>
                  {/* Room header — always visible, click to expand */}
                  <button type="button" onClick={() => toggleExpand(room.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${room.id === "smc-601"
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

                    {/* Right side: confirmed badge OR chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirmed ? (
                        <>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-600/30 text-primary-300 border border-primary-500/30">
                            {rt.start} – {rt.end} น.
                          </span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); clearRoom(room.id); }}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <ChevronRight size={18} className={`text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </button>

                  {/* Slot grid — only show when expanded */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/5">
                      <div className="pt-4">
                        <RoomSlotGrid
                          roomId={room.id}
                          roomTime={rt}
                          onTap={(slot) => handleSlotTap(room.id, slot)}
                          isSlotBooked={(slot) => isSlotBooked(room.id, slot)}
                          reservations={roomRes}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <button type="button"
                disabled={confirmedRooms.length === 0 || anyPending}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Equipment ═══ */}
        {step === 3 && (
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <button type="button" onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all mb-5">
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>
            <h2 className="font-display text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <Wrench size={20} className="text-primary-400" /> อุปกรณ์ที่ต้องการ
            </h2>
            <p className="text-xs text-slate-500 mb-6">เลือกได้มากกว่า 1 รายการ (ไม่บังคับ)</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const active = selectedEquipment.includes(eq.id);
                const IconComp = ICON_MAP[eq.iconName];
                return (
                  <button key={eq.id} type="button" onClick={() => toggleEquipment(eq.id)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${active ? "border-primary-500 bg-primary-600/20" : "border-white/10 hover:border-primary-600/30 hover:bg-primary-900/10"
                      }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active ? "bg-primary-600 text-white" : "bg-white/10 text-slate-400"
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
              <button type="button" onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl btn-accent font-semibold text-sm flex items-center gap-2">
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Details ═══ */}
        {step === 4 && (
          <div className="space-y-5">
            <button type="button" onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>

            <div className="glass rounded-2xl p-6 border border-primary-700/20 space-y-5">
              <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                <FileText size={20} className="text-primary-400" /> รายละเอียดการจอง
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <GraduationCap size={14} className="inline mr-1.5 text-slate-400" />
                  สาขาวิชา <span className="text-red-400">*</span>
                </label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm cursor-pointer">
                  <option value="" disabled>เลือกสาขาวิชา</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Phone size={14} className="inline mr-1.5 text-slate-400" />
                  เบอร์ติดต่อภายใน
                  <span className="ml-1.5 text-xs text-slate-500">(ไม่บังคับ)</span>
                </label>
                <input type="text" value={phoneInternal} onChange={(e) => setPhoneInternal(e.target.value)}
                  placeholder="เช่น 1234" className="w-full px-4 py-3 rounded-xl input-dark text-sm" maxLength={10} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <User size={14} className="inline mr-1.5 text-slate-400" />
                  ชื่อผู้สอน <span className="text-red-400">*</span>
                </label>
                <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล ผู้สอน" className="w-full px-4 py-3 rounded-xl input-dark text-sm" maxLength={100} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  หมายเหตุ <span className="ml-1.5 text-xs text-slate-500">(ไม่บังคับ)</span>
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม..." rows={3}
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm resize-none" maxLength={500} />
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
                {confirmedRooms.map((id) => {
                  const rt = roomTimes[id];
                  const room = ROOMS.find((r) => r.id === id);
                  return (
                    <div key={id} className="flex justify-between">
                      <span className="text-slate-400">{room?.name}</span>
                      <span className="text-white font-medium">{rt.start} – {rt.end} น.</span>
                    </div>
                  );
                })}
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

            <button type="button" onClick={handleSubmit}
              disabled={submitting || !department || !instructorName}
              className="w-full py-4 rounded-xl btn-accent font-display font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed">
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
