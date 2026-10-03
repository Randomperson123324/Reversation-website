"use client";

import Image from "next/image";
import { format, isBefore } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { Reservation, EQUIPMENT_OPTIONS, getRoomTheme, getRoomLabel } from "@/types";
import { getRoomStyle } from "@/lib/roomStyles";

type ReservationWithExtras = Reservation & {
  user_name?: string;
  user_email?: string;
  avatar_url?: string | null;
  department?: string | null;
  internal_number?: string | null;
};

interface ReservationCardProps {
  res: ReservationWithExtras;
  /** Show the "who booked this" block (used on the all-reservations page). */
  showUser?: boolean;
  /** Show the cancel button + confirm flow (used on my-reservations). */
  cancellable?: boolean;
  isConfirmingCancel?: boolean;
  isCancelling?: boolean;
  onRequestCancel?: () => void;
  onConfirmCancel?: () => void;
  onDismissCancel?: () => void;
}

const getRoomIds = (res: ReservationWithExtras): string[] =>
  res.room_ids?.length ? res.room_ids : res.room_id ? [res.room_id] : [];

export default function ReservationCard({
  res,
  showUser = false,
  cancellable = false,
  isConfirmingCancel = false,
  isCancelling = false,
  onRequestCancel,
  onConfirmCancel,
  onDismissCancel,
}: ReservationCardProps) {
  const isPast = isBefore(new Date(res.date + "T" + res.end_time), new Date());
  const isCancelled = res.status === "cancelled";
  const roomIds = getRoomIds(res);
  const isMultiRoom = roomIds.length > 1;

  return (
    <div
      className={`card rounded-2xl transition-all ${
        isCancelled ? "opacity-60" : !isPast ? "hover:border-primary-200" : ""
      }`}
    >
      {/* ── Header: status, title, requester details, cancel/user action ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                isCancelled ? "status-busy" : isPast ? "bg-surface-muted text-ink-subtle border border-line" : "status-available"
              }`}
            >
              {isCancelled ? "ยกเลิก" : isPast ? "ผ่านไปแล้ว" : "ยืนยันแล้ว"}
            </span>
            {isMultiRoom && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-200">
                จอง {roomIds.length} ห้อง
              </span>
            )}
          </div>
          <h3 className="text-ink truncate">{res.title}</h3>
          {res.department && <div className="text-sm text-ink-muted mt-1">สาขา: {res.department}</div>}
          {res.internal_number && <div className="text-sm text-ink-muted mt-1">เบอร์ภายใน: {res.internal_number}</div>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted mt-1">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {format(new Date(res.date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th })}
            </span>
          </div>
        </div>

        {showUser && (
          <div className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg bg-surface-muted border border-line md:max-w-[200px]">
            {res.avatar_url ? (
              <Image src={res.avatar_url} alt="avatar" width={24} height={24} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-ink-inverse flex-shrink-0">
                {(res.user_name || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-ink font-semibold truncate">{res.user_name}</p>
              <p className="text-xs text-ink-muted truncate">{res.user_email}</p>
            </div>
          </div>
        )}

        {cancellable && !isCancelled && !isPast && (
          <div className="flex-shrink-0">
            {isConfirmingCancel ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onConfirmCancel}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-btn text-sm font-semibold bg-danger hover:opacity-90 text-ink-inverse transition-all disabled:opacity-50"
                >
                  {isCancelling ? "กำลังยกเลิก..." : "ยืนยัน"}
                </button>
                <button
                  onClick={onDismissCancel}
                  className="px-3 py-1.5 text-sm font-semibold btn-outline"
                >
                  ไม่ใช่
                </button>
              </div>
            ) : (
              <button
                onClick={onRequestCancel}
                className="p-2 rounded-btn text-ink-subtle hover:text-danger hover:bg-danger-bg border border-transparent hover:border-danger-line transition-all"
                title="ยกเลิกการจอง"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Room boxes ── */}
      <div className={`px-5 pb-4 ${isMultiRoom ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}`}>
        {roomIds.map((rid) => {
          const style = getRoomStyle(getRoomTheme(rid));
          return (
            <div key={rid} className={`rounded-xl p-3.5 flex items-start gap-3 ${style.chipBg}`}>
              <div className={`w-12 h-11 rounded-lg flex items-center justify-center font-display font-bold text-base flex-shrink-0 ${style.badgeBg}`}>
                {getRoomLabel(rid)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base ${style.text}`}>{rid === "smc-601" ? "SMC 601" : "SMC 605"}</p>
                <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-0.5">
                  <Clock size={13} />
                  {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)} น.
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Equipment + description + footer ── */}
      <div className="px-5 pb-4 space-y-2 border-t border-line pt-3">
        {res.equipment && res.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {res.equipment.map((eq) => {
              const opt = EQUIPMENT_OPTIONS.find((e) => e.id === eq);
              return opt ? (
                <span key={eq} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-200">
                  {opt.label}
                </span>
              ) : null;
            })}
          </div>
        )}
        {res.description && <p className="text-sm text-ink-muted py-1">{res.description}</p>}
        <p className="text-xs text-ink-subtle">จองเมื่อ {format(new Date(res.created_at), "d MMM yyyy HH:mm", { locale: th })}</p>
      </div>
    </div>
  );
}
