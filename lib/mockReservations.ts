import { Reservation, Equipment } from "@/types";

/**
 * TEMP — test-only fixture data.
 *
 * This project's .env.local points at a placeholder Supabase URL, so every
 * real query returns nothing. This generator fills the statistics page with
 * realistic-looking bookings for the given year so the Excel export can
 * actually be exercised. Delete this file (and its two call sites in
 * app/statistics/page.tsx) once a real Supabase project is connected.
 */

const ROOMS = ["smc-601", "smc-605"];
const DEPARTMENTS = [
  "สาขาวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ",
  "สาขาวิชาการพยาบาลอนามัยชุมชน",
  "สาขาวิชาการพยาบาลจิตเวชและสุขภาพจิต",
  "สาขาวิชาการพยาบาลเด็ก",
  "สาขาวิชาการพยาบาลมารดา ทารก และการผดุงครรภ์",
];
const TITLES = [
  "อ.สมชาย ใจดี", "อ.สมหญิง รักเรียน", "อ.วิชัย มั่นคง",
  "อ.ปราณี สุขใจ", "อ.ธนากร เก่งกล้า", "อ.มาลี พูนทรัพย์",
];
const DESCRIPTIONS = [
  "ประชุมวิชาการประจำเดือน", "สอบปฏิบัติ", "อบรมเชิงปฏิบัติการ",
  "ประชุมคณะกรรมการ", undefined, undefined,
];
const EQUIPMENT_SETS: Equipment[][] = [
  [], [], ["bi_machine"], ["visual_system"], ["audio_system"], ["bi_machine", "visual_system"],
];
const TIME_SLOTS: [string, string][] = [
  ["08:00", "10:00"], ["09:00", "11:00"], ["10:00", "12:00"],
  ["13:00", "15:00"], ["14:00", "16:00"], ["15:00", "17:00"],
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function generateMockReservations(year: number): Reservation[] {
  const reservations: Reservation[] = [];
  let idCounter = 1;

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bookingsThisMonth = 6 + Math.floor(Math.random() * 8); // 6–13 per month

    for (let i = 0; i < bookingsThisMonth; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const [start, end] = pick(TIME_SLOTS);
      const isCancelled = Math.random() < 0.1;

      reservations.push({
        id: `mock-${idCounter}`,
        user_id: "mock-user",
        room_ids: [pick(ROOMS)],
        date,
        start_time: start,
        end_time: end,
        title: pick(TITLES),
        description: pick(DESCRIPTIONS),
        equipment: pick(EQUIPMENT_SETS),
        status: isCancelled ? "cancelled" : "confirmed",
        created_at: new Date(year, month, Math.max(1, day - 3), 9, 0).toISOString(),
        department: pick(DEPARTMENTS),
        internal_number: String(1000 + Math.floor(Math.random() * 9000)),
      });
      idCounter++;
    }
  }

  return reservations;
}
