"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, EQUIPMENT_OPTIONS } from "@/types";
import { Calendar, Clock, Trash2, Plus } from "lucide-react";
import Link from "next/link";

type FilterType = "all" | "upcoming" | "past" | "cancelled";

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/auth/login?redirect=/my-reservations");
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
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });
    setReservations(data || []);
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

  const filteredReservations = reservations.filter((r) => {
    const isPast = isBefore(new Date(r.date + "T" + r.end_time), new Date());
    if (filter === "upcoming") return r.status === "confirmed" && !isPast;
    if (filter === "past") return r.status === "confirmed" && isPast;
    if (filter === "cancelled") return r.status === "cancelled";
    return true;
  });

  const filterCounts = {
    all: reservations.length,
    upcoming: reservations.filter((r) => {
      const isPast = isBefore(new Date(r.date + "T" + r.end_time), new Date());
      return r.status === "confirmed" && !isPast;
    }).length,
    past: reservations.filter((r) => {
      const isPast = isBefore(new Date(r.date + "T" + r.end_time), new Date());
      return r.status === "confirmed" && isPast;
    }).length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  // Resolve room names from room_ids array (or fall back to legacy room_id)
  const getRoomNames = (res: Reservation) => {
    const ids: string[] = res.room_ids?.length ? res.room_ids : res.room_id ? [res.room_id] : [];
    return ids.map((id) => (id === "smc-601" ? "SMC 601" : "SMC 605")).join(" + ");
  };

  const getRoomIds = (res: Reservation): string[] =>
    res.room_ids?.length ? res.room_ids : res.room_id ? [res.room_id] : [];

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />

      <div className="pt-16">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-950/50 to-transparent" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              <span className="gradient-text">การจองของฉัน</span>
            </h1>
            <p className="text-slate-400">ดูและจัดการการจองห้องประชุมทั้งหมดของคุณ</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(["upcoming", "past", "all", "cancelled"] as FilterType[]).map((f) => {
              const labels: Record<FilterType, string> = {
                upcoming: "กำลังมาถึง",
                past: "ผ่านไปแล้ว",
                all: "ทั้งหมด",
                cancelled: "ยกเลิกแล้ว",
              };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filter === f
                      ? "bg-primary-600 text-white"
                      : "glass-light text-slate-400 hover:text-white border border-white/5"
                    }`}
                >
                  {labels[f]}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f ? "bg-white/20" : "bg-white/10"
                    }`}>
                    {filterCounts[f]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-5 border border-white/5 skeleton h-28" />
              ))}
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl border border-white/5">
              <Calendar size={48} className="text-slate-600 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-slate-400 mb-2">ไม่พบการจอง</h3>
              <p className="text-slate-500 text-sm mb-6">
                {filter === "upcoming" ? "คุณยังไม่มีการจองที่กำลังมาถึง" : "ไม่มีรายการในหมวดนี้"}
              </p>
              <Link
                href="/reserve"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-accent text-sm font-medium"
              >
                <Plus size={16} />
                จองห้องประชุมใหม่
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((res) => {
                const isPast = isBefore(new Date(res.date + "T" + res.end_time), new Date());
                const isCancelled = res.status === "cancelled";
                const isConfirm = confirmDelete === res.id;
                const roomIds = getRoomIds(res);
                const isMultiRoom = roomIds.length > 1;

                return (
                  <div
                    key={res.id}
                    className={`glass rounded-2xl border transition-all ${isCancelled
                        ? "border-red-700/20 opacity-60"
                        : isPast
                          ? "border-slate-700/30"
                          : "border-primary-700/20 hover:border-primary-500/30"
                      }`}
                  >
                    {/* ── Group header: date, title, status, delete ── */}
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${isCancelled
                              ? "status-busy"
                              : isPast
                                ? "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                                : "status-available"
                            }`}>
                            {isCancelled ? "ยกเลิก" : isPast ? "ผ่านไปแล้ว" : "ยืนยันแล้ว"}
                          </span>
                          {isMultiRoom && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-primary-900/40 text-primary-300 border border-primary-700/30">
                              จอง {roomIds.length} ห้อง
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-white text-base truncate">
                          {res.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            {format(new Date(res.date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th })}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      {!isCancelled && !isPast && (
                        <div className="flex-shrink-0">
                          {isConfirm ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(res.id)}
                                disabled={deletingId === res.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                              >
                                {deletingId === res.id ? "กำลังยกเลิก..." : "ยืนยัน"}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 hover:text-white transition-all"
                              >
                                ไม่ใช่
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(res.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                              title="ยกเลิกการจอง"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Room boxes ── */}
                    <div className={`px-5 pb-4 ${isMultiRoom ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}`}>
                      {roomIds.map((rid) => (
                        <div
                          key={rid}
                          className={`rounded-xl p-3.5 border flex items-start gap-3 ${rid === "smc-601"
                              ? "bg-accent-500/8 border-accent-500/20"
                              : "bg-primary-500/8 border-primary-500/20"
                            }`}
                        >
                          {/* Room badge */}
                          <div className={`w-11 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${rid === "smc-601"
                              ? "bg-accent-500/20 text-accent-300 border border-accent-500/30"
                              : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                            }`}>
                            {rid === "smc-601" ? "601" : "605"}
                          </div>

                          {/* Room details */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${rid === "smc-601" ? "text-accent-300" : "text-primary-300"}`}>
                              {rid === "smc-601" ? "SMC 601" : "SMC 605"}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <Clock size={11} />
                              {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)} น.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Equipment + description + footer ── */}
                    <div className="px-5 pb-4 space-y-2 border-t border-white/5 pt-3">
                      {res.equipment && res.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {res.equipment.map((eq) => {
                            const opt = EQUIPMENT_OPTIONS.find((e) => e.id === eq);
                            return opt ? (
                              <span
                                key={eq}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-900/40 text-primary-300 border border-primary-700/30"
                              >
                                {opt.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {res.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{res.description}</p>
                      )}
                      <p className="text-xs text-slate-600">
                        จองเมื่อ {format(new Date(res.created_at), "d MMM yyyy HH:mm", { locale: th })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
