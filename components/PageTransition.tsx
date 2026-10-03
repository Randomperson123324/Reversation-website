"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// `id` is null for transitions with no clicked icon+label to morph from (e.g. a
// calendar double-click) — those just fade/pop in centered instead of flying in.
type Pending = { id: string | null; href: string; label: string; icon: LucideIcon } | null;

const PageTransitionContext = createContext<{
  pendingId: string | null;
  isTransitioning: boolean;
  beginTransition: (p: NonNullable<Pending>) => void;
}>({ pendingId: null, isTransitioning: false, beginTransition: () => {} });

// For triggering the loading screen from non-link interactions (e.g. double-clicking
// a calendar day) — call beginTransition({ id: null, href, label, icon }) then navigate.
export function usePageTransition() {
  return useContext(PageTransitionContext);
}

const DISMISS_MS = 300;

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending>(null);
  const [dismissing, setDismissing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const pathname = usePathname();

  const beginTransition = (p: NonNullable<Pending>) => {
    setPending(p);
    setDismissing(false);
    setStartedAt(Date.now());
    // Next's own scroll-to-top on navigation is disabled on these links
    // (TransitionLink passes scroll={false}) because it was racing with the
    // morph's initial position measurement — if the page was scrolled, the
    // animation would appear to start from the un-scrolled position instead
    // of where the clicked button actually was. We reset scroll ourselves
    // instead, delayed until the white overlay is opaque enough to hide it.
    setTimeout(() => window.scrollTo(0, 0), 200);
  };

  // Phase 1: decide when to START dismissing — once the destination route has
  // mounted, with a minimum visible duration (so fast/cached navigations
  // don't flash) and a hard safety timeout (so a redirect landing elsewhere,
  // or the user hitting Back mid-transition, can never leave it stuck white).
  useEffect(() => {
    if (!pending || dismissing) return;
    const targetPath = pending.href.split("?")[0];
    const startDismiss = () => setDismissing(true);
    const hardTimeout = setTimeout(startDismiss, 4000);
    if (pathname === targetPath) {
      const minVisibleMs = 550;
      const remaining = Math.max(150, minVisibleMs - (Date.now() - (startedAt ?? 0)));
      const t = setTimeout(startDismiss, remaining);
      return () => { clearTimeout(t); clearTimeout(hardTimeout); };
    }
    return () => clearTimeout(hardTimeout);
  }, [pathname, pending, dismissing, startedAt]);

  // Phase 2: once dismissing, the overlay plays a plain fade-out (see below —
  // it drops its layoutId for this phase so framer-motion's shared-layout
  // engine can't try to reconcile it against the navbar link's box, which
  // was producing a brief reverse "snap" flicker). After that fade finishes,
  // actually unmount it.
  useEffect(() => {
    if (!dismissing) return;
    const t = setTimeout(() => { setPending(null); setDismissing(false); }, DISMISS_MS);
    return () => clearTimeout(t);
  }, [dismissing]);

  // The source nav link should start fading back in the moment dismissal
  // begins, in sync with the overlay's (now layoutId-detached) fade-out.
  const pendingId = pending && !dismissing ? pending.id : null;
  // Separate from pendingId (which can itself be null for a no-morph transition) —
  // this just answers "is a transition currently in flight", for blocking new clicks.
  const isTransitioning = pending !== null && !dismissing;

  return (
    <PageTransitionContext.Provider value={{ pendingId, isTransitioning, beginTransition }}>
      {children}

      {/* Always mounted (not AnimatePresence-gated) so it can fade both in and out
          without unmount-timing gaps. House easing curve used across the app. */}
      <motion.div
        className="fixed inset-0 z-[100] bg-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: pending && !dismissing ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence>
        {pending && (
          <div className="fixed inset-0 z-[101] flex flex-col items-center justify-center gap-4 pointer-events-none">
            <motion.div
              layoutId={dismissing || !pending.id ? undefined : pending.id}
              initial={pending.id ? undefined : { opacity: 0, scale: 0.85 }}
              animate={dismissing ? { opacity: 0, scale: 0.85 } : { opacity: 1, scale: 1 }}
              transition={dismissing ? { duration: DISMISS_MS / 1000 } : pending.id ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 font-display font-bold text-primary-600"
            >
              <pending.icon size={56} />
              <span className="text-3xl sm:text-4xl">{pending.label}</span>
            </motion.div>
            {/* Loading spinner — kept outside the layoutId div so it doesn't get
                stretched by the morph's scale correction; fades in once the morph
                has mostly settled. Same spinner style used elsewhere in the app
                (e.g. app/reserve/page.tsx's auth-loading state). */}
            <motion.div
              animate={{ opacity: dismissing ? 0 : 1 }}
              transition={{ duration: 0.2, delay: dismissing ? 0 : 0.25 }}
              className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"
            />
          </div>
        )}
      </AnimatePresence>
    </PageTransitionContext.Provider>
  );
}

interface TransitionLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  iconSize: number;
  className: string;
  gapClassName?: string;
  iconClassName?: string;
  onClick?: () => void;
}

export function TransitionLink({
  href, label, icon: Icon, iconSize, className, gapClassName = "gap-2", iconClassName, onClick,
}: TransitionLinkProps) {
  const instanceId = useId();
  const layoutId = `nav-transition-${instanceId}`;
  const { pendingId, isTransitioning, beginTransition } = useContext(PageTransitionContext);

  const handleClick = () => {
    onClick?.();
    if (isTransitioning) return; // ignore clicks while a transition is already in flight
    beginTransition({ id: layoutId, href, label, icon: Icon });
  };

  return (
    <Link href={href} onClick={handleClick} scroll={false} className={className}>
      {/* Opacity is animated (not a snapped className toggle) so reappearing
          here doesn't pop in instantly while the overlay is still fading out
          — that overlap was reading as a flicker. */}
      <motion.span
        layoutId={layoutId}
        animate={{ opacity: pendingId === layoutId ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className={`inline-flex items-center ${gapClassName}`}
      >
        <Icon size={iconSize} className={iconClassName} />
        {label}
      </motion.span>
    </Link>
  );
}
