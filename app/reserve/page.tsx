"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  format, isSameDay,
  startOfMonth, endOfMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import { ROOMS, TIME_OPTIONS, EQUIPMENT_OPTIONS, Equipment, Reservation, getRoomTheme } from "@/types";
import { getRoomStyle } from "@/lib/roomStyles";
import MonthCalendar from "@/components/MonthCalendar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Users, ChevronLeft, ChevronRight, CheckCircle,
  BarChart2, Projector, Volume2, Wrench,
  Phone, GraduationCap, User, FileText, X,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = { BarChart2, Projector, Volume2 };

const DEPARTMENTS = [
  "สาขาวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ",
  "สาขาวิชาการพยาบาลอนามัยชุมชน",
  "สาขาวิชาการพยาบาลจิตเวชและสุขภาพจิต",
  "สาขาวิชาการพยาบาลเด็ก",
  "สาขาวิชาการพยาบาลมารดา ทารก และการผดุงครรภ์",
  "สาขาวิชาการพยาบาลพื้นฐานและบริหารการพยาบาล",
  "อื่นๆ",
];

// All tappable slots — 07:00 to 18:00 (18:00 acts as end-only)
const ALL_SLOTS = TIME_OPTIONS; // 07:00 … 18:00

// Per-room time selection state
type RoomTime = { start: string; end: string; tapStart: string | null };
const emptyRoomTime = (): RoomTime => ({ start: "", end: "", tapStart: null });

/** Shared between the step row and the screen-reader heading — one source of truth for the labels. */
const STEPS = [
  { n: 1, label: "เลือกวันที่" },
  { n: 2, label: "ห้อง & เวลา" },
  { n: 3, label: "อุปกรณ์" },
  { n: 4, label: "รายละเอียด" },
];

/** Slide direction for the step content card: 1 = forward (next), -1 = backward (back).
    No opacity fade — the old step slides fully off screen fast, then the new one
    bounces into place, each with its own transition rather than one shared curve. */
const stepSlideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  center: { x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", transition: { duration: 0.2, ease: "easeIn" as const } }),
};

// Slot grid for one room
function RoomSlotGrid({
  roomTime, onTap, isSlotBooked, reservations,
}: {
  roomTime: RoomTime;
  onTap: (slot: string) => void;
  isSlotBooked: (slot: string) => boolean;
  reservations: Reservation[];
}) {
  const slotClass = (slot: string) => {
    const booked = isSlotBooked(slot);
    if (booked) return "bg-danger-bg border-danger-line text-danger cursor-not-allowed opacity-60";
    const inRange = roomTime.start && roomTime.end && slot >= roomTime.start && slot <= roomTime.end;
    const isPending = roomTime.tapStart === slot;
    if (isPending) return "bg-warning-bg border-warning-line text-warning scale-105 shadow-card";
    if (inRange) return "bg-primary-600 border-primary-600 text-ink-inverse scale-[1.02]";
    if (slot === "18:00" && !roomTime.tapStart && !roomTime.start) return "bg-surface-muted border-line text-ink-subtle cursor-not-allowed";
    return "bg-success-bg border-success-line text-success hover:bg-success-bg hover:border-success hover:scale-105 cursor-pointer";
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Hint */}
      <div className="text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 flex items-center gap-2">
        <Clock size={14} />
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
            className={`py-3 rounded-btn text-sm font-semibold border transition-all select-none ${slotClass(slot)}`}>
            {slot}
          </button>
        ))}
      </div>

      {/* Existing bookings */}
      {reservations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm bg-danger-bg border border-danger-line rounded-lg px-3 py-2">
              <Clock size={13} className="text-danger flex-shrink-0" />
              <span className="text-danger font-semibold">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)} น.</span>
              <span className="text-ink-subtle truncate">{r.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm text-ink-muted pt-1">
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-success-bg border border-success-line" />ว่าง</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-warning-bg border border-warning-line" />เวลาเริ่ม</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-primary-600" />ช่วงที่เลือก</span>
        <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-danger-bg border border-danger-line" />ถูกจอง</span>
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
  // Tracks which way the step content should slide: 1 = forward, -1 = backward.
  const [stepDirection, setStepDirection] = useState(1);
  const goToStep = (n: number) => {
    setStepDirection(n > step ? 1 : -1);
    setStep(n);
  };

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
    else { toast.success("จองห้องสำเร็จ"); router.push("/my-reservations"); }
    setSubmitting(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-app flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-app">
      <Navbar />

      {/* No overflow-hidden here — the current step's size-morph animation needs room to grow without being clipped. */}
      <div className="relative pt-16 bg-hero-gradient">
        {/* Wider than the max-w-4xl content below — the row must never wrap, since a
            wrap would stack the big current step awkwardly instead of keeping every
            step on one line, so this container's bound is overridden to give it room. */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {/* Visually-hidden heading for a11y — the visible row below isn't a real <h1> since all 4 steps share one line. */}
          <h1 className="sr-only">{STEPS.find((s) => s.n === step)?.label}</h1>

          {/* Desktop/tablet (sm+): unified horizontal row, every step on one line, never
              wrapping. Each item keeps the same DOM node across steps (just a className
              swap), so framer-motion's `layout` prop auto-animates the size/position change
              as the current step grows big and the rest shrink, instead of swapping elements
              in and out. overflow-x-auto is just a safety net — no shared-layout boundary is
              crossed here (unlike the old hero/step-bar split), so it can't clip the animation. */}
          <div className="hidden sm:flex items-center justify-center flex-nowrap gap-3 overflow-x-auto pb-1">
            {STEPS.map(({ n, label }, i, arr) => {
              const isCurrent = step === n;
              const done = step > n;
              return (
                <div key={n} className="flex items-center gap-3">
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`flex-shrink-0 rounded-full flex items-center justify-center font-display font-bold border-2 transition-colors duration-300 ${isCurrent
                      ? "w-14 h-14 text-2xl bg-primary-600 border-primary-600 text-ink-inverse"
                      : done
                        ? "w-9 h-9 text-base bg-primary-600 border-primary-600 text-ink-inverse"
                        : "w-9 h-9 text-base border-line-strong text-ink-subtle"
                      }`}
                  >
                    {done ? <CheckCircle size={18} /> : n}
                  </motion.div>
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`whitespace-nowrap font-display transition-colors duration-300 ${isCurrent
                      ? "text-[1.75rem] sm:text-[2.5rem] lg:text-[3.25rem] font-black text-ink leading-tight"
                      : `text-base font-semibold ${done ? "text-ink-muted" : "text-ink-subtle"}`
                      }`}
                  >
                    {label}
                  </motion.div>
                  {i < arr.length - 1 && (
                    <div className={`w-8 h-px transition-colors duration-300 ${step > n ? "bg-primary-600" : "bg-line-strong"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile (below sm): portrait/vertical stepper instead of a horizontal scroller —
              steps stack top to bottom with a connecting line down the left side, the current
              step's circle+label growing in place via the same `layout`-driven animation. */}
          <div className="flex sm:hidden flex-col">
            {STEPS.map(({ n, label }, i, arr) => {
              const isCurrent = step === n;
              const done = step > n;
              return (
                <div key={n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={`flex-shrink-0 rounded-full flex items-center justify-center font-display font-bold border-2 transition-colors duration-300 ${isCurrent
                        ? "w-11 h-11 text-xl bg-primary-600 border-primary-600 text-ink-inverse"
                        : done
                          ? "w-9 h-9 text-base bg-primary-600 border-primary-600 text-ink-inverse"
                          : "w-9 h-9 text-base border-line-strong text-ink-subtle"
                        }`}
                    >
                      {done ? <CheckCircle size={18} /> : n}
                    </motion.div>
                    {i < arr.length - 1 && (
                      <div className={`w-px flex-1 min-h-[1.5rem] transition-colors duration-300 ${step > n ? "bg-primary-600" : "bg-line-strong"}`} />
                    )}
                  </div>
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`font-display transition-colors duration-300 pb-4 ${isCurrent
                      ? "text-[1.75rem] font-black text-ink leading-tight pt-1"
                      : `text-base font-semibold pt-1.5 ${done ? "text-ink-muted" : "text-ink-subtle"}`
                      }`}
                  >
                    {label}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <p className="text-ink-muted text-lg font-medium mb-6 mt-8">กรอกข้อมูลทีละขั้นตอนเพื่อจองห้องประชุม</p>

        <AnimatePresence mode="wait" custom={stepDirection}>
        {/* ═══ STEP 1: Calendar ═══ */}
        {step === 1 && (
          <motion.div key="step-1" custom={stepDirection} variants={stepSlideVariants}
            initial="enter" animate="center" exit="exit"
            className="card rounded-2xl p-6">
            <h2 className="text-ink mb-5 flex items-center gap-2">
              <Calendar size={22} className="text-primary-600" /> เลือกวันที่ต้องการจอง
            </h2>

            <MonthCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onDoubleClickDate={(day) => { setSelectedDate(day); goToStep(2); }}
              getDayDots={getDayDots}
              disablePast
            />

            <div className="mt-5 flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-primary-50 border border-primary-200">
                <p className="text-base text-primary-700 font-semibold">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
                </p>
              </div>
              <button type="button" onClick={() => goToStep(2)}
                className="px-6 py-3 btn-primary font-bold text-base flex items-center gap-2">
                ถัดไป <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 2: Rooms & Time ═══ */}
        {step === 2 && (
          <motion.div key="step-2" custom={stepDirection} variants={stepSlideVariants}
            initial="enter" animate="center" exit="exit"
            className="space-y-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => goToStep(1)}
                className="flex items-center gap-1.5 text-base text-ink-muted hover:text-ink transition-all">
                <ChevronLeft size={18} /> ย้อนกลับ
              </button>
              <p className="text-base text-primary-700 font-semibold">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
              </p>
            </div>

            <p className="text-sm text-ink-muted">คลิกที่ห้องเพื่อดูช่วงเวลาว่างและเลือกเวลา</p>

            {ROOMS.map((room) => {
              const isExpanded = expandedRooms.has(room.id);
              const rt = roomTimes[room.id] || emptyRoomTime();
              // Confirmed = has a valid time set (regardless of expand state)
              const isConfirmed = !!(rt.start && rt.end && !rt.tapStart);
              const roomRes = getRoomReservations(room.id);
              const style = getRoomStyle(getRoomTheme(room.id));

              return (
                <div key={room.id} className={`card rounded-2xl border-2 transition-all overflow-hidden ${isConfirmed ? "border-primary-500" : isExpanded ? "border-primary-300" : "border-line"
                  }`}>
                  {/* Room header — always visible, click to expand */}
                  <button type="button" onClick={() => toggleExpand(room.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-hover transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${style.badgeBg}`}>
                        {room.id === "smc-601" ? "601" : "605"}
                      </div>
                      <div>
                        <h3 className="text-ink">{room.name}</h3>
                        <p className="text-ink-muted text-base flex items-center gap-1.5">
                          <Users size={14} /> {room.capacity} คน · {room.description}
                        </p>
                      </div>
                    </div>

                    {/* Right side: confirmed badge OR chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirmed ? (
                        <>
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700 border border-primary-200">
                            {rt.start} – {rt.end} น.
                          </span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); clearRoom(room.id); }}
                            className="p-1 rounded-btn text-ink-subtle hover:text-danger hover:bg-danger-bg transition-all">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <ChevronRight size={20} className={`text-ink-subtle transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </button>

                  {/* Slot grid — only show when expanded */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-line">
                      <div className="pt-4">
                        <RoomSlotGrid
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
                onClick={() => goToStep(3)}
                className="px-6 py-3 btn-primary font-bold text-base flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                ถัดไป <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3: Equipment ═══ */}
        {step === 3 && (
          <motion.div key="step-3" custom={stepDirection} variants={stepSlideVariants}
            initial="enter" animate="center" exit="exit"
            className="card rounded-2xl p-6">
            <button type="button" onClick={() => goToStep(2)}
              className="flex items-center gap-1.5 text-base text-ink-muted hover:text-ink transition-all mb-5">
              <ChevronLeft size={18} /> ย้อนกลับ
            </button>
            <h2 className="text-ink mb-1 flex items-center gap-2">
              <Wrench size={22} className="text-primary-600" /> อุปกรณ์ที่ต้องการ
            </h2>
            <p className="text-sm text-ink-muted mb-6">เลือกได้มากกว่า 1 รายการ (ไม่บังคับ)</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const active = selectedEquipment.includes(eq.id);
                const IconComp = ICON_MAP[eq.iconName];
                return (
                  <button key={eq.id} type="button" onClick={() => toggleEquipment(eq.id)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-btn border-2 transition-all ${active ? "border-primary-500 bg-primary-50" : "border-line hover:border-primary-200 hover:bg-primary-50/40"
                      }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active ? "bg-primary-600 text-ink-inverse" : "bg-surface-muted text-ink-subtle"
                      }`}>
                      {IconComp && <IconComp size={24} />}
                    </div>
                    <span className={`text-base font-semibold text-center leading-tight ${active ? "text-primary-700" : "text-ink-muted"}`}>
                      {eq.label}
                    </span>
                    {active && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => goToStep(4)}
                className="px-6 py-3 btn-primary font-bold text-base flex items-center gap-2">
                ถัดไป <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 4: Details ═══ */}
        {step === 4 && (
          <motion.div key="step-4" custom={stepDirection} variants={stepSlideVariants}
            initial="enter" animate="center" exit="exit"
            className="space-y-5">
            <button type="button" onClick={() => goToStep(3)}
              className="flex items-center gap-1.5 text-base text-ink-muted hover:text-ink transition-all">
              <ChevronLeft size={18} /> ย้อนกลับ
            </button>

            <div className="card rounded-2xl p-6 space-y-5">
              <h2 className="text-ink flex items-center gap-2">
                <FileText size={22} className="text-primary-600" /> รายละเอียดการจอง
              </h2>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">
                  <GraduationCap size={16} className="inline mr-1.5 text-ink-subtle" />
                  สาขาวิชา <span className="text-danger">*</span>
                </label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl input-field text-base cursor-pointer">
                  <option value="" disabled>เลือกสาขาวิชา</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">
                  <Phone size={16} className="inline mr-1.5 text-ink-subtle" />
                  เบอร์ติดต่อภายใน
                  <span className="ml-1.5 text-xs text-ink-subtle">(ไม่บังคับ)</span>
                </label>
                <input type="text" value={phoneInternal} onChange={(e) => setPhoneInternal(e.target.value)}
                  placeholder="เช่น 1234" className="w-full px-4 py-3 rounded-xl input-field text-base" maxLength={10} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">
                  <User size={16} className="inline mr-1.5 text-ink-subtle" />
                  ชื่อผู้สอน <span className="text-danger">*</span>
                </label>
                <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล ผู้สอน" className="w-full px-4 py-3 rounded-xl input-field text-base" maxLength={100} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-1.5">
                  หมายเหตุ <span className="ml-1.5 text-xs text-ink-subtle">(ไม่บังคับ)</span>
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม..." rows={3}
                  className="w-full px-4 py-3 rounded-xl input-field text-base resize-none" maxLength={500} />
              </div>
            </div>

            {/* Summary */}
            <div className="card rounded-2xl p-5">
              <h3 className="text-ink mb-4">สรุปการจอง</h3>
              <div className="space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-ink-muted">วันที่</span>
                  <span className="text-ink font-semibold">{format(selectedDate, "d MMM yyyy", { locale: th })}</span>
                </div>
                {confirmedRooms.map((id) => {
                  const rt = roomTimes[id];
                  const room = ROOMS.find((r) => r.id === id);
                  return (
                    <div key={id} className="flex justify-between">
                      <span className="text-ink-muted">{room?.name}</span>
                      <span className="text-ink font-semibold">{rt.start} – {rt.end} น.</span>
                    </div>
                  );
                })}
                {selectedEquipment.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">อุปกรณ์</span>
                    <span className="text-ink font-semibold">{selectedEquipment.map((eq) => EQUIPMENT_OPTIONS.find((e) => e.id === eq)?.label).join(", ")}</span>
                  </div>
                )}
                {department && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">สาขา</span>
                    <span className="text-ink font-semibold">{department}</span>
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={handleSubmit}
              disabled={submitting || !department || !instructorName}
              className="w-full py-4 btn-primary font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-ink-inverse/30 border-t-ink-inverse rounded-full animate-spin" />
                  กำลังจอง...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> ยืนยันการจอง
                </span>
              )}
            </button>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReserveContent />
    </Suspense>
  );
}
