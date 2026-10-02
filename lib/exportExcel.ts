import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, EQUIPMENT_OPTIONS, getRoomLabel } from "@/types";

const STATUS_LABEL: Record<Reservation["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

const getRoomIds = (r: Reservation): string[] =>
  r.room_ids?.length ? r.room_ids : r.room_id ? [r.room_id] : [];

const equipmentLabel = (eq: string) =>
  EQUIPMENT_OPTIONS.find((e) => e.id === eq)?.label ?? eq;

/**
 * Exports a list of reservations as an .xlsx file, one row per reservation.
 * Used by both the monthly and yearly summary views on the statistics page —
 * they just hand it a different (already-filtered) slice of reservations.
 *
 * `xlsx` is a large library only needed at the moment of export, so it's
 * dynamically imported here instead of bundled into the statistics page's
 * initial load.
 */
export async function exportReservationsToExcel(reservations: Reservation[], filename: string) {
  const XLSX = await import("xlsx");

  const rows = reservations.map((r) => ({
    "วันที่": format(new Date(r.date + "T00:00:00"), "d MMM yyyy", { locale: th }),
    "ห้อง": getRoomIds(r).map((id) => `SMC ${getRoomLabel(id)}`).join(" + "),
    "เวลาเริ่ม": r.start_time.slice(0, 5),
    "เวลาสิ้นสุด": r.end_time.slice(0, 5),
    "ชื่อผู้จอง": r.title,
    "สาขา": r.department || "",
    "เบอร์ภายใน": r.internal_number || "",
    "อุปกรณ์": (r.equipment || []).map(equipmentLabel).join(", "),
    "หมายเหตุ": r.description || "",
    "สถานะ": STATUS_LABEL[r.status] ?? r.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  // Reasonable fixed column widths so the sheet is readable without manual resizing.
  worksheet["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 24 },
    { wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "การจอง");
  XLSX.writeFile(workbook, filename);
}
