"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, EQUIPMENT_OPTIONS } from "@/types";
import { Calendar, Clock, Contact, Plus, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type FilterType = "all" | "upcoming" | "past" | "cancelled";

export default function AllReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, profiles(full_name, email, avatar_url, department)")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    // Type assertion correctly passing the populated user data
    const formattedData = (data || []).map(r => ({
      ...r,
      user_name: r.profiles?.full_name || r.profiles?.email || "Unknown User",
      user_email: r.profiles?.email || "",
      avatar_url: r.profiles?.avatar_url || null,
      department: r.profiles?.department || null
    }));

    setReservations(formattedData as any[]);
    setLoading(false);
  }, [supabase]);

  const filteredReservations = reservations.filter((r) => {
    const isPast = isBefore(new Date(r.date + "T" + r.end_time), new Date());
    let matchFilter = true;
    if (filter === "upcoming") matchFilter = r.status === "confirmed" && !isPast;
    if (filter === "past") matchFilter = r.status === "confirmed" && isPast;
    if (filter === "cancelled") matchFilter = r.status === "cancelled";

    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user_name || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchFilter && matchSearch;
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

  const getRoomIds = (res: any): string[] =>
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
              <span className="gradient-text">การจองทั้งหมด</span>
            </h1>
            <p className="text-slate-400">ดูรายการจองห้องประชุมทั้งหมดในระบบ</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อการจอง, ผู้จอง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
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
              <p className="text-slate-500 text-sm mb-6">ไม่มีรายการในหมวดนี้หรือคำค้นหาของคุณ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((res: any) => {
                const isPast = isBefore(new Date(res.date + "T" + res.end_time), new Date());
                const isCancelled = res.status === "cancelled";
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
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 px-5 pt-5 pb-3">
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

                      {/* User Info */}
                      <div className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg bg-surface-800/50 border border-white/5 md:max-w-[200px]">
                        {res.avatar_url ? (
                          <Image
                            src={res.avatar_url}
                            alt="avatar"
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {(res.user_name || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium truncate">{res.user_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{res.user_email}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`px-5 pb-4 ${isMultiRoom ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}`}>
                      {roomIds.map((rid) => (
                        <div
                          key={rid}
                          className={`rounded-xl p-3.5 border flex items-start gap-3 ${rid === "smc-601"
                            ? "bg-accent-500/8 border-accent-500/20"
                            : "bg-primary-500/8 border-primary-500/20"
                            }`}
                        >
                          <div className={`w-11 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${rid === "smc-601"
                            ? "bg-accent-500/20 text-accent-300 border border-accent-500/30"
                            : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                            }`}>
                            {rid === "smc-601" ? "601" : "605"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${rid === "smc-601" ? "text-accent-300" : "text-primary-300"}`}>
                              {rid === "smc-601" ? "SMC 601" : "SMC 605"}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <Clock size={11} />
                              {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)} น.
                            </div>
                            {res.department && (
                              <div className="text-lg text-slate-400 mt-1">
                                สาขา: {res.department}
                              </div>
                            )}
                            {res.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 pb-4 space-y-2 border-t border-white/5 pt-3">
                      {res.equipment && res.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {res.equipment.map((eq: any) => {
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
