"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { Reservation, EQUIPMENT_OPTIONS } from "@/types";
import { BarChart3, Calendar, Clock, TrendingUp, Building2, BarChart2, Projector, Volume2 } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = { BarChart2, Projector, Volume2 };

export default function StatisticsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/auth/login?redirect=/statistics");
    });
    fetchAllReservations();
  }, []);

  const fetchAllReservations = async () => {
    setLoading(true);
    const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "confirmed")
      .gte("date", threeMonthsAgo)
      .order("date");
    setReservations(data || []);
    setLoading(false);
  };

  const monthReservations = reservations.filter((r) => {
    const d = new Date(r.date + "T00:00:00");
    return d >= startOfMonth(selectedMonth) && d <= endOfMonth(selectedMonth);
  });

  const getRoom = (roomId: string) =>
    monthReservations.filter((r) => (r.room_ids || [r.room_id]).includes(roomId));

  const room601 = getRoom("smc-601");
  const room605 = getRoom("smc-605");

  const totalHours = (res: Reservation[]) =>
    res.reduce((acc, r) => {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      return acc + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);

  // Equipment usage counts
  const equipmentCounts = EQUIPMENT_OPTIONS.map((eq) => ({
    ...eq,
    count: monthReservations.filter((r) => r.equipment?.includes(eq.id)).length,
  }));
  const maxEquipCount = Math.max(...equipmentCounts.map((e) => e.count), 1);

  // Days heatmap
  const days = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  const getDayCount = (date: Date) =>
    monthReservations.filter((r) => isSameDay(new Date(r.date + "T00:00:00"), date)).length;

  const maxDayCount = Math.max(...days.map(getDayCount), 1);

  // Hour distribution
  const hourDistribution = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    const label = `${String(hour).padStart(2, "0")}:00`;
    const count = monthReservations.filter((r) => {
      const startH = parseInt(r.start_time.split(":")[0]);
      const endH = parseInt(r.end_time.split(":")[0]);
      return startH <= hour && endH > hour;
    }).length;
    return { label, count };
  });
  const maxHourCount = Math.max(...hourDistribution.map((h) => h.count), 1);

  const StatCard = ({ icon: Icon, label, value, sublabel, color = "primary" }: {
    icon: any; label: string; value: string | number; sublabel?: string; color?: "primary" | "accent" | "green";
  }) => (
    <div className="glass rounded-2xl p-5 border border-primary-700/20">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
        color === "primary" ? "bg-primary-600/20 text-primary-400" :
        color === "accent" ? "bg-accent-500/20 text-accent-400" : "bg-emerald-500/20 text-emerald-400"
      }`}>
        <Icon size={18} />
      </div>
      <p className="font-display text-3xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
    </div>
  );

  const isCurrentMonth = selectedMonth.getMonth() >= new Date().getMonth() &&
    selectedMonth.getFullYear() >= new Date().getFullYear();

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />
      <div className="pt-16">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-950/50 to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              <span className="gradient-text">สถิติการจอง</span>
            </h1>
            <p className="text-slate-400">ภาพรวมการใช้งานห้องประชุม SMC</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-6">

          {/* Month selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
              className="px-4 py-2 rounded-xl glass-light text-slate-400 hover:text-white border border-white/5 transition-all text-sm"
            >
              ← เดือนก่อน
            </button>
            <span className="font-display font-semibold text-white text-lg">
              {format(selectedMonth, "MMMM yyyy", { locale: th })}
            </span>
            <button
              onClick={() => { if (!isCurrentMonth) setSelectedMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; }); }}
              disabled={isCurrentMonth}
              className="px-4 py-2 rounded-xl glass-light text-slate-400 hover:text-white border border-white/5 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              เดือนถัดไป →
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Calendar} label="การจองทั้งหมด" value={monthReservations.length} sublabel="ครั้ง" color="primary" />
            <StatCard icon={Clock} label="ชั่วโมงรวม" value={totalHours(monthReservations).toFixed(1)} sublabel="ชั่วโมง" color="accent" />
            <StatCard icon={Building2} label="วันที่มีการจอง" value={new Set(monthReservations.map((r) => r.date)).size} sublabel="วัน" color="green" />
            <StatCard icon={BarChart3} label="เฉลี่ยต่อวัน" value={
              new Set(monthReservations.map((r) => r.date)).size > 0
                ? (monthReservations.length / new Set(monthReservations.map((r) => r.date)).size).toFixed(1)
                : "0"
            } sublabel="ครั้ง/วัน" color="primary" />
          </div>

          {/* Room comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { room: "SMC 601", id: "smc-601", res: room601, color: "accent" },
              { room: "SMC 605", id: "smc-605", res: room605, color: "primary" },
            ].map(({ room, id, res, color }) => (
              <div key={id} className="glass rounded-2xl p-5 border border-primary-700/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-bold text-white">{room}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    color === "accent" ? "bg-accent-500/20 text-accent-300" : "bg-primary-500/20 text-primary-300"
                  }`}>
                    {res.length} ครั้ง
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>ชั่วโมงรวม</span>
                    <span className="text-white font-medium">{totalHours(res).toFixed(1)} ชม.</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>สัดส่วน</span>
                    <span className="text-white font-medium">
                      {monthReservations.length ? Math.round((res.length / monthReservations.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${color === "accent" ? "bg-accent-gradient" : "bg-primary-600"}`}
                    style={{ width: monthReservations.length ? `${(res.length / monthReservations.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Equipment usage */}
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-400" />
              การใช้อุปกรณ์
            </h3>
            <div className="space-y-3">
              {equipmentCounts.map((eq) => {
                const IconComp = ICON_MAP[eq.iconName];
                const pct = maxEquipCount > 0 ? (eq.count / maxEquipCount) * 100 : 0;
                return (
                  <div key={eq.id} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center flex-shrink-0">
                      {IconComp && <IconComp size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300">{eq.label}</span>
                        <span className="text-sm font-medium text-white">{eq.count} ครั้ง</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-600 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {equipmentCounts.every((e) => e.count === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">ไม่มีการใช้อุปกรณ์เพิ่มเติมในเดือนนี้</p>
              )}
            </div>
          </div>

          {/* Time distribution */}
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-400" />
              การกระจายตามช่วงเวลา
            </h3>
            <div className="flex items-end gap-2 h-40">
              {hourDistribution.map(({ label, count }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "112px" }}>
                    <div
                      className="w-full rounded-t-lg bg-primary-600/60 border border-primary-500/30 transition-all duration-700 hover:bg-primary-500/80"
                      style={{ height: `${(count / maxHourCount) * 112}px`, minHeight: count > 0 ? "4px" : "0" }}
                      title={`${count} ครั้ง`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 rotate-[-35deg] origin-top-right translate-x-1 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center mt-8">ช่วงเวลา (น.)</p>
          </div>

          {/* Calendar heatmap */}
          <div className="glass rounded-2xl p-6 border border-primary-700/20">
            <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-400" />
              ความหนาแน่นการจองรายวัน
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {["อา","จ","อ","พ","พฤ","ศ","ส"].map((d) => (
                <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
              ))}
              {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`p${i}`} />)}
              {days.map((day) => {
                const count = getDayCount(day);
                const intensity = count / maxDayCount;
                return (
                  <div
                    key={day.toString()}
                    title={`${format(day, "d MMM", { locale: th })}: ${count} การจอง`}
                    className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-default"
                    style={{
                      background: count === 0 ? "rgba(255,255,255,0.03)" : `rgba(99,102,241,${0.15 + intensity * 0.7})`,
                      border: count > 0 ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.04)",
                      color: intensity > 0.5 ? "#fff" : "#94a3b8",
                    }}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <span>น้อย</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <div key={i} className="w-4 h-4 rounded"
                  style={{ background: v === 0 ? "rgba(255,255,255,0.03)" : `rgba(99,102,241,${0.15 + v * 0.7})` }}
                />
              ))}
              <span>มาก</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
