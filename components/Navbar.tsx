"use client";

import Link from "next/link";
import { TransitionLink } from "@/components/PageTransition";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Calendar, BarChart3, CalendarRange, Plus, Menu, X, LogOut, LogIn, UserRoundCheck, ChevronDown } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const STATS_OPTIONS = [
  { href: "/statistics?view=month", label: "สรุปรายเดือน", icon: Calendar },
  { href: "/statistics?view=year", label: "สรุปรายปี", icon: CalendarRange },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsMobileOpen, setStatsMobileOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (statsRef.current && !statsRef.current.contains(e.target as Node)) setStatsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/reserve", label: "จองห้อง", icon: Plus },
    { href: "/my-reservations", label: "การจองของฉัน", icon: UserRoundCheck },
    { href: "/all-reservations", label: "การจองทั้งหมด", icon: Calendar },
  ];

  const isStatsActive = pathname === "/statistics";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-surface/95 backdrop-blur-sm border-b border-line shadow-card" : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/icon-logo.png" alt="SMC Logo" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-2xl hidden sm:block text-ink">
              SMC <span className="text-primary-600">Booking</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <TransitionLink
                key={href}
                href={href}
                label={label}
                icon={Icon}
                iconSize={21}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-btn text-lg font-bold transition-all ${pathname === href
                  ? "bg-primary-50 text-primary-700 border border-primary-200"
                  : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                  }`}
              />
            ))}

            {/* สถิติการจอง — expands down into month/year choices */}
            <div className="relative" ref={statsRef}>
              <button
                type="button"
                onClick={() => setStatsOpen((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-btn text-lg font-bold transition-all ${isStatsActive
                  ? "bg-primary-50 text-primary-700 border border-primary-200"
                  : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                  }`}
              >
                <BarChart3 size={21} />
                สถิติการจอง
                <ChevronDown size={16} className={`transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Expand/collapse: height animates from 0 to its natural content
                  height instead of just appearing, matching the calendar's
                  month/year dropdown. overflow-hidden clips it during the
                  grow/shrink (and keeps the rounded corners clean). */}
              <AnimatePresence>
                {statsOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-full mt-2 w-56 overflow-hidden card rounded-btn z-50"
                  >
                    {STATS_OPTIONS.map(({ href, label, icon: Icon }) => (
                      <TransitionLink
                        key={href}
                        href={href}
                        label={label}
                        icon={Icon}
                        iconSize={18}
                        gapClassName="gap-3"
                        onClick={() => setStatsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-base font-semibold text-ink-muted hover:text-ink hover:bg-surface-hover transition-all"
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* User actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-muted border border-line">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-ink-inverse">
                      {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-base font-semibold text-ink max-w-[150px] truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-base font-semibold text-ink-muted hover:text-danger hover:bg-danger-bg border border-transparent hover:border-danger-line transition-all"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-5 py-2.5 btn-primary text-lg font-bold"
              >
                <LogIn size={17} />
                เข้าสู่ระบบ
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-btn text-ink-muted hover:text-ink hover:bg-surface-hover transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-line px-4 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <TransitionLink
              key={href}
              href={href}
              label={label}
              icon={Icon}
              iconSize={18}
              gapClassName="gap-3"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-semibold transition-all ${pathname === href
                ? "bg-primary-50 text-primary-700"
                : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                }`}
            />
          ))}

          {/* สถิติการจอง — expands down into month/year choices */}
          <div>
            <button
              type="button"
              onClick={() => setStatsMobileOpen((v) => !v)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-btn text-base font-semibold transition-all ${isStatsActive
                ? "bg-primary-50 text-primary-700"
                : "text-ink-muted hover:text-ink hover:bg-surface-hover"
                }`}
            >
              <span className="flex items-center gap-3">
                <BarChart3 size={18} />
                สถิติการจอง
              </span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${statsMobileOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {statsMobileOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 mt-1 space-y-1">
                    {STATS_OPTIONS.map(({ href, label, icon: Icon }) => (
                      <TransitionLink
                        key={href}
                        href={href}
                        label={label}
                        icon={Icon}
                        iconSize={16}
                        gapClassName="gap-3"
                        onClick={() => { setMenuOpen(false); setStatsMobileOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-btn text-sm font-semibold text-ink-muted hover:text-ink hover:bg-surface-hover transition-all"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2 border-t border-line">
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-btn text-base font-semibold text-ink-muted hover:text-danger hover:bg-danger-bg transition-all"
              >
                <LogOut size={18} />
                ออกจากระบบ
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base btn-primary font-bold"
              >
                <LogIn size={18} />
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
