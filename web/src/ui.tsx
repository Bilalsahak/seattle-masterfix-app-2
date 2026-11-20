import { useEffect, useRef, useState, type ReactNode } from "react";
import { COMPANY } from "./content";

export const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined
    ? "—"
    : (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const fmtDate = (isoStr: string) =>
  new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtDateTime = (isoStr: string) =>
  new Date(isoStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const prettyDate = (d: string) => {
  if (!d) return "";
  const parsed = new Date(`${d}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// ---------- Motion helpers (CSS only, no animation libraries) ----------
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Reveal a section the first time it scrolls into view. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Minimal touch-swipe hook: returns handlers that call onLeft/onRight. */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
      if (Math.abs(dx) > 48) {
        if (dx < 0) onLeft();
        else onRight();
      }
      startX.current = null;
    },
  };
}

// ---------- Icons (inline SVG, one line-icon style) ----------
export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
export const I = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  briefcase: "M3 8h18v12H3zM9 8V5h6v3M3 13h18",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  phone: "M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  pin: "M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  shield: "M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6zM9 12l2 2 4-4",
  star: "M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z",
  check: "M4 12.5 9.5 18 20 6.5",
  chevR: "M9 5l7 7-7 7",
  back: "M15 5l-7 7 7 7",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 3h-15zM10 21a2 2 0 0 0 4 0",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  download: "M12 4v11M7 11l5 5 5-5M4 20h16",
};

// ---------- Shared bits ----------
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-navy mt-8 mb-3 flex items-center gap-3">
      {children}
      <span className="h-px flex-1 bg-bronze/50" aria-hidden="true" />
    </h2>
  );
}

export function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "bronze" | "green" | "gray" }) {
  const cls =
    tone === "bronze"
      ? "bg-bronze text-navy-deep"
      : tone === "green"
        ? "bg-green-700 text-white"
        : tone === "gray"
          ? "bg-stone-200 text-charcoal"
          : "bg-navy text-white";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-semibold text-navy mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-base text-charcoal min-h-11";
export const btnPrimary =
  "pressable inline-flex items-center justify-center gap-2 rounded bg-bronze px-5 py-3 font-semibold text-navy-deep min-h-12 w-full sm:w-auto hover:bg-bronze-dark shadow-sm";
export const btnOutline =
  "pressable inline-flex items-center justify-center gap-2 rounded border-2 border-white/90 px-5 py-3 font-semibold text-white min-h-12 w-full sm:w-auto hover:bg-white/10";
export const btnNavy =
  "pressable inline-flex items-center justify-center gap-2 rounded bg-navy px-4 py-2.5 font-semibold text-white min-h-11 hover:bg-navy-deep shadow-sm";
export const btnGhost =
  "pressable inline-flex items-center justify-center gap-2 rounded border border-navy/30 px-4 py-2.5 font-semibold text-navy min-h-11 bg-white hover:border-bronze";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6 text-center my-6">
      <p className="text-lg font-semibold text-navy">{title}</p>
      <p className="text-charcoal/80 mt-1 mb-4">{body}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 my-4" role="alert">
      <p className="font-semibold text-red-900">Something didn't load.</p>
      <p className="text-red-800 text-sm">{message}</p>
      <p className="text-red-800 text-sm mt-1">
        You can also call us at <a className="underline font-semibold" href={COMPANY.phoneHref}>{COMPANY.phoneDisplay}</a>.
      </p>
    </div>
  );
}
