import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fileToBase64, type ApiResponse } from "./api";
import {
COMPANY,
FAQS,
PROCESS,
PROJECTS,
PROJECT_FILTERS,
SERVICES,
SERVICE_AREA,
type ProjectPhoto,
} from "./content";
import heroImg from "./assets/hero.jpg";
import logoImg from "./assets/logo-mark.png";
import logoOnNavyImg from "./assets/logo-mark.png";
import logoFullImg from "./assets/logo.png";

type Job = ApiResponse<typeof api, "listJobs">["jobs"][number];
type JobDetail = NonNullable<ApiResponse<typeof api, "getJob">["detail"]>;
type Notification = ApiResponse<typeof api, "listNotifications">["notifications"][number];

type Tab = "home" | "services" | "projects" | "myjob" | "more";
type Route =
  | { name: "tabs" }
  | { name: "service"; slug: string }
  | { name: "estimate" }
  | { name: "job"; id: number }
  | { name: "office" }
  | { name: "newjob"; requestId?: number }
  | { name: "notifications" };

const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined
    ? "—"
    : (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (isoStr: string) =>
  new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtDateTime = (isoStr: string) =>
  new Date(isoStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const prettyDate = (d: string) => {
  if (!d) return "";
  const parsed = new Date(`${d}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// ---------- Motion helpers (CSS only, no animation libraries) ----------
function useReducedMotion() {
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
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
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
function useSwipe(onLeft: () => void, onRight: () => void) {
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
function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const I = {
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
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-navy mt-8 mb-3 flex items-center gap-3">
      {children}
      <span className="h-px flex-1 bg-bronze/50" aria-hidden="true" />
    </h2>
  );
}

function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "bronze" | "green" | "gray" }) {
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-semibold text-navy mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-base text-charcoal min-h-11";
const btnPrimary =
  "pressable inline-flex items-center justify-center gap-2 rounded bg-bronze px-5 py-3 font-semibold text-navy-deep min-h-12 w-full sm:w-auto hover:bg-bronze-dark shadow-sm";
const btnOutline =
  "pressable inline-flex items-center justify-center gap-2 rounded border-2 border-white/90 px-5 py-3 font-semibold text-white min-h-12 w-full sm:w-auto hover:bg-white/10";
const btnNavy =
  "pressable inline-flex items-center justify-center gap-2 rounded bg-navy px-4 py-2.5 font-semibold text-white min-h-11 hover:bg-navy-deep shadow-sm";
const btnGhost =
  "pressable inline-flex items-center justify-center gap-2 rounded border border-navy/30 px-4 py-2.5 font-semibold text-navy min-h-11 bg-white hover:border-bronze";

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6 text-center my-6">
      <p className="text-lg font-semibold text-navy">{title}</p>
      <p className="text-charcoal/80 mt-1 mb-4">{body}</p>
      {action}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
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

// ---------- App shell ----------
export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [route, setRoute] = useState<Route>({ name: "tabs" });
  const notifQ = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications({ limit: 50 }),
  });
  const unread = notifQ.data?.unread_count ?? 0;

  const go = (r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  };
  const goTab = (t: Tab) => {
    setTab(t);
    setRoute({ name: "tabs" });
    window.scrollTo({ top: 0 });
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: I.home },
    { id: "services", label: "Services", icon: I.grid },
    { id: "projects", label: "Projects", icon: I.camera },
    { id: "myjob", label: "My Job", icon: I.briefcase },
    { id: "more", label: "More", icon: I.dots },
  ];

  return (
    <div className="min-h-dvh bg-cream pb-24">
      <header className="bg-navy text-white sticky top-0 z-30 shadow pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            className="text-left min-h-11 flex items-center gap-2.5 shrink-0"
            onClick={() => goTab("home")}
            aria-label="Seattle MasterFix — go to Home"
          >
            <img src={logoImg} alt="Seattle MasterFix logo" className="h-10 w-10 shrink-0 object-contain" />
            <span>
              <span className="block font-bold tracking-wide leading-tight">
                SEATTLE <span className="text-bronze">MASTERFIX</span>
              </span>
              <span className="block text-[11px] tracking-[0.2em] text-bronze-light">PRECISION CRAFTSMANSHIP</span>
            </span>
          </button>
          <span className="h-px flex-1 bg-bronze/40 self-end mb-1 hidden sm:block" aria-hidden="true" />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="relative p-2 min-h-11 min-w-11 inline-flex items-center justify-center"
              onClick={() => go({ name: "notifications" })}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Icon d={I.bell} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 bg-bronze text-navy-deep text-[10px] font-bold rounded-full min-w-4 h-4 px-0.5 inline-flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            <a
              href={COMPANY.phoneHref}
              className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center"
              aria-label={`Call Seattle MasterFix at ${COMPANY.phoneDisplay}`}
            >
              <Icon d={I.phone} />
            </a>
          </div>
        </div>
        <div className="h-0.5 bg-bronze" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <div key={`${route.name}-${route.name === "tabs" ? tab : ""}`} className="anim-fade-slide">
        {route.name === "service" && (
          <ServiceDetail slug={route.slug} onBack={() => goTab("services")} onEstimate={() => go({ name: "estimate" })} />
        )}
        {route.name === "estimate" && <EstimateWizard onDone={() => goTab("myjob")} onCancel={() => goTab("home")} />}
        {route.name === "job" && <JobDetailView jobId={route.id} onBack={() => goTab("myjob")} />}
        {route.name === "office" && <Office onOpenJob={(id) => go({ name: "job", id })} onNewJob={(requestId) => go({ name: "newjob", requestId })} onBack={() => goTab("more")} />}
        {route.name === "newjob" && <NewJobForm requestId={route.requestId} onDone={(id) => go({ name: "job", id })} onBack={() => go({ name: "office" })} />}
        {route.name === "notifications" && <NotificationsView items={notifQ.data?.notifications ?? []} onOpenJob={(id) => go({ name: "job", id })} onBack={() => goTab("home")} />}
        {route.name === "tabs" && tab === "home" && (
          <HomeTab onEstimate={() => go({ name: "estimate" })} onTrack={() => goTab("myjob")} onService={(slug) => go({ name: "service", slug })} onProjects={() => goTab("projects")} />
        )}
        {route.name === "tabs" && tab === "services" && <ServicesTab onService={(slug) => go({ name: "service", slug })} />}
        {route.name === "tabs" && tab === "projects" && <ProjectsTab />}
        {route.name === "tabs" && tab === "myjob" && (
          <MyJobTab onOpenJob={(id) => go({ name: "job", id })} onEstimate={() => go({ name: "estimate" })} />
        )}
        {route.name === "tabs" && tab === "more" && (
          <MoreTab onOffice={() => go({ name: "office" })} onEstimate={() => go({ name: "estimate" })} />
        )}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 mt-10 pb-4 text-sm text-charcoal/70">
        <div className="border-t border-bronze/40 pt-4">
          <div className="flex items-center gap-3">
            <img src={logoOnNavyImg} alt="Seattle MasterFix logo" className="h-12 w-12 shrink-0 rounded-lg object-contain bg-navy p-2" />
            <p className="font-semibold text-navy">{COMPANY.name} — {COMPANY.tagline}</p>
          </div>
          <p>{COMPANY.address} · {COMPANY.phoneDisplay}</p>
          <p>WA Contractor Reg. {COMPANY.waReg} · UBI {COMPANY.ubi} · 1-year labor warranty</p>
        </div>
      </footer>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-navy text-white pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        <div className="mx-auto max-w-5xl grid grid-cols-5">
          {tabs.map((t) => {
            const active = route.name === "tabs" && tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 min-h-14 text-xs font-medium ${active ? "text-bronze" : "text-white/80"}`}
              >
                <span className={`pt-1 ${active ? "border-t-2 border-bronze -mt-0.5" : ""}`}>
                  <Icon d={t.icon} size={22} />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}


// ---------- Hero slider: real crew photos, auto-advance, swipe, dots, arrows ----------
const HERO_SLIDES = [
  { image: heroImg, alt: "Craftsman home with cedar shake siding by Seattle MasterFix trades", caption: "Cedar shake siding", sub: "Full exterior re-side, trim, and stone foundation work." },
  { image: SERVICES.find((x) => x.slug === "siding")?.image ?? heroImg, alt: "Craftsman home with cedar shingle siding and white trim", caption: "Shingle siding & trim", sub: "Cedar shingles with new white trim and porch detailing." },
  { image: SERVICES.find((x) => x.slug === "remodel")?.image ?? heroImg, alt: "Remodeled kitchen with new cabinetry and countertops", caption: "Kitchen build-out", sub: "Cabinet and countertop installation with full finish work." },
  { image: SERVICES.find((x) => x.slug === "tile")?.image ?? heroImg, alt: "Walk-in shower with stacked wall tile, bench, and mosaic floor", caption: "Tiled walk-in shower", sub: "Waterproofed shower with bench, niche, and mosaic floor." },
];

function HeroSlider({ onEstimate, onTrack }: { onEstimate: () => void; onTrack: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const total = HERO_SLIDES.length;
  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const swipe = useSwipe(next, prev);

  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setInterval(next, 5500);
    return () => window.clearInterval(t);
  }, [paused, reduced]);

  const slide = HERO_SLIDES[index]!;
  return (
    <section
      className="relative -mx-4 mt-0 overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured project photos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      {...swipe}
    >
      <div className="relative h-80 sm:h-[26rem]">
        {HERO_SLIDES.map((s, i) => (
          <div key={s.caption} className={`hero-slide ${i === index ? "hero-slide-active" : ""}`} aria-hidden={i !== index}>
            <img src={s.image} alt={i === index ? s.alt : ""} className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/35 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 flex flex-col justify-end px-14 sm:px-16 py-4 sm:py-6 max-w-5xl mx-auto w-full">
          <p key={`cap-${index}`} className="anim-fade-slide text-bronze-light text-xs font-bold tracking-[0.18em] uppercase">
            {slide.caption}
          </p>
          <h1 className="text-white text-2xl sm:text-4xl font-bold leading-tight">
            Licensed remodeling, done right — and easy to follow.
          </h1>
          <p className="text-white/90 mt-2 max-w-xl">{slide.sub}</p>
          <p className="text-white/80 mt-1 max-w-xl text-sm">
            Siding, fencing, tile, flooring, drywall, paint, and build-outs across Seattle and King County.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 pb-2">
            <button type="button" className={btnPrimary} onClick={onEstimate}>
              Request a Free Estimate
            </button>
            <button type="button" className={btnOutline} onClick={onTrack}>
              Track My Job
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={prev}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-navy/70 text-white w-10 h-10 inline-flex items-center justify-center pressable"
        >
          <Icon d={I.back} size={20} />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-navy/70 text-white w-10 h-10 inline-flex items-center justify-center pressable"
        >
          <Icon d={I.chevR} size={20} />
        </button>
        <div className="absolute top-3 right-3 flex items-center gap-1.5" role="tablist" aria-label="Choose a photo">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.caption}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}: ${s.caption}`}
              onClick={() => setIndex(i)}
              className={`hero-dot h-2 rounded-full ${i === index ? "w-6 bg-bronze" : "w-2 bg-white/60 hover:bg-white"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Home ----------
function HomeTab({
  onEstimate,
  onTrack,
  onService,
  onProjects,
}: {
  onEstimate: () => void;
  onTrack: () => void;
  onService: (slug: string) => void;
  onProjects: () => void;
}) {
  return (
    <div>
      <HeroSlider onEstimate={onEstimate} onTrack={onTrack} />
      <Reveal>

      <section aria-label="Why homeowners trust us" className="bg-navy text-white rounded-lg mt-4 px-4 py-3">
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm font-medium">
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.shield} size={20} /></span> Licensed &amp; insured · WA Reg. {COMPANY.waReg}</li>
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.star} size={20} /></span> 5.0 rating on Google</li>
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.check} size={20} /></span> 1-year labor warranty</li>
        </ul>
      </section>
      </Reveal>
      <Reveal>

      <SectionTitle>Our services</SectionTitle>
      <p className="text-sm text-charcoal/60 -mt-2 mb-2 sm:hidden">Swipe to see all seven trades →</p>
      <div className="snap-row flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {SERVICES.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => onService(s.slug)}
            className="card-lift shrink-0 w-64 sm:w-auto text-left rounded-lg border border-[var(--border)] bg-white overflow-hidden hover:border-bronze"
          >
            <img src={s.image} alt={s.imageAlt} className="w-full h-36 sm:h-36 object-cover" loading="lazy" />
            <span className="block p-3">
              <span className="block font-semibold text-navy">{s.name}</span>
              <span className="block text-sm text-charcoal/75 mt-0.5 line-clamp-2">{s.short}</span>
            </span>
          </button>
        ))}
        <div className="card-lift shrink-0 w-64 sm:w-auto rounded-lg bg-navy text-white p-4 flex flex-col justify-between">
          <p className="font-semibold">Not sure what your project needs?</p>
          <p className="text-sm text-white/80 mt-1">Send an estimate request with photos — we will tell you honestly what the work involves.</p>
          <button type="button" className="pressable mt-3 rounded bg-bronze px-4 py-2.5 font-semibold text-navy-deep min-h-11" onClick={onEstimate}>
            Request Estimate
          </button>
        </div>
      </div>

      <SectionTitle>Recent project photos</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {PROJECTS.slice(0, 3).map((p) => (
          <button key={p.title} type="button" onClick={onProjects} className="card-lift rounded-lg overflow-hidden border border-[var(--border)]" aria-label={`See project photos — ${p.title}`}>
            <img src={p.image} alt={p.alt} className="w-full h-24 sm:h-36 object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <p className="text-xs text-charcoal/60 mt-2">
        Photos show our crew's work, including completed jobs from other states — we label Seattle jobs as Seattle jobs, and only those.
      </p>

      <SectionTitle>Reviews</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 flex flex-wrap items-center gap-3">
        <p className="text-3xl font-bold text-navy">5.0</p>
        <div>
          <p className="text-bronze-dark font-semibold" aria-label="Rated 5 out of 5 stars">★★★★★</p>
          <p className="text-sm text-charcoal/75">On Google — Seattle MasterFix Precision Craftsmanship</p>
        </div>
        <a className="ml-auto font-semibold text-navy underline underline-offset-2 min-h-11 inline-flex items-center" href={COMPANY.googleReviewUrl} target="_blank" rel="noreferrer">
          Read &amp; write reviews on Google
        </a>
      </div>

      <SectionTitle>Hours &amp; service area</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <h3 className="font-semibold text-navy flex items-center gap-2"><Icon d={I.clock} size={20} /> Hours</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {COMPANY.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4"><span>{h.days}</span><span className="font-medium">{h.time}</span></li>
            ))}
          </ul>
          <p className="text-sm text-charcoal/70 mt-2">{COMPANY.replyNote}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
          <h3 className="font-semibold text-navy flex items-center gap-2"><Icon d={I.pin} size={20} /> Service area</h3>
          <p className="mt-2 text-sm">{SERVICE_AREA.summary}</p>
          <p className="text-sm mt-1">Home turf: {SERVICE_AREA.highlighted.join(", ")}.</p>
          <a className="font-semibold text-navy underline underline-offset-2 min-h-11 inline-flex items-center" href={COMPANY.directionsUrl} target="_blank" rel="noreferrer">
            Get directions to {COMPANY.address}
          </a>
        </div>
      </div>
      </Reveal>
    </div>
  );
}

// ---------- Services ----------
function ServicesTab({ onService }: { onService: (slug: string) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">Services</h1>
      <p className="text-charcoal/80 mt-1">Seven trades, one licensed crew. Tap a service for what's included, our process, and what drives the cost.</p>
      <div className="mt-4 space-y-3">
        {SERVICES.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => onService(s.slug)}
            className="card-lift w-full text-left rounded-lg border border-[var(--border)] bg-white overflow-hidden flex hover:border-bronze"
          >
            <img src={s.image} alt={s.imageAlt} className="w-28 sm:w-44 shrink-0 object-cover" loading="lazy" />
            <span className="p-3 sm:p-4">
              <span className="flex items-center gap-2 font-semibold text-navy text-lg">{s.name} <span className="text-bronze-dark"><Icon d={I.chevR} size={18} /></span></span>
              <span className="block text-sm text-charcoal/75 mt-1">{s.short}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceDetail({ slug, onBack, onEstimate }: { slug: string; onBack: () => void; onEstimate: () => void }) {
  const s = SERVICES.find((x) => x.slug === slug) ?? SERVICES[0]!;
  const related = PROJECTS.filter((p) => p.service === s.name || (s.slug === "flooring" && p.service === "Flooring"));
  return (
    <div className="pb-20 anim-slide-in">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Back to services">
        <Icon d={I.back} size={18} /> Services
      </button>
      <img src={s.image} alt={s.imageAlt} className="w-full h-56 sm:h-72 object-cover rounded-lg mt-1" />
      <h1 className="text-2xl font-bold text-navy mt-4">{s.name}</h1>
      <p className="text-charcoal/85 mt-1">{s.short}</p>

      <SectionTitle>What's included</SectionTitle>
      <ul className="space-y-1.5">
        {s.included.map((item) => (
          <li key={item} className="flex gap-2"><span className="text-bronze-dark mt-0.5"><Icon d={I.check} size={18} /></span>{item}</li>
        ))}
      </ul>
      <h3 className="font-semibold text-navy mt-4 mb-1.5">Not included</h3>
      <ul className="list-disc pl-5 space-y-1 text-charcoal/85">
        {s.excluded.map((item) => <li key={item}>{item}</li>)}
      </ul>

      <SectionTitle>How it works</SectionTitle>
      <ol className="space-y-2">
        {PROCESS.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-navy text-white text-sm font-bold inline-flex items-center justify-center">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <SectionTitle>What drives the cost</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-charcoal/85">
        {s.costDrivers.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="text-sm text-charcoal/70 mt-2">
        We never post a fixed price for a service — your price comes from a written estimate after a site visit, with the full scope in writing.
      </p>

      {related.length > 0 && (
        <>
          <SectionTitle>Related project photos</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {related.map((p) => (
              <figure key={p.title} className="card-lift rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                <img src={p.image} alt={p.alt} className="w-full h-32 object-cover" loading="lazy" />
                <figcaption className="p-2 text-sm font-medium text-navy">{p.title}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      <div className="fixed bottom-16 inset-x-0 z-20 bg-white/95 border-t border-[var(--border)] backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2.5 flex gap-2">
          <a href={COMPANY.phoneHref} className="flex-1 inline-flex items-center justify-center gap-2 rounded border-2 border-navy text-navy font-semibold min-h-12">
            <Icon d={I.phone} size={18} /> Call
          </a>
          <button type="button" onClick={onEstimate} className="flex-[2] rounded bg-bronze px-4 font-semibold text-navy-deep min-h-12">
            Request Estimate
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Projects ----------
function ProjectsTab() {
  const [filter, setFilter] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shown = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.service === filter);
  const open = openIndex !== null ? shown[openIndex] ?? null : null;
  const openPrev = () => setOpenIndex((i) => (i === null ? i : (i - 1 + shown.length) % shown.length));
  const openNext = () => setOpenIndex((i) => (i === null ? i : (i + 1) % shown.length));
  const viewerSwipe = useSwipe(openNext, openPrev);
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") openPrev();
      if (e.key === "ArrowRight") openNext();
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, shown.length]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">Projects</h1>
      <p className="text-charcoal/80 mt-1">Real work by our crew. Swipe through the photos, or tap one for the full scope.</p>
      <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filter projects by service">
        {PROJECT_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`pressable shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-10 border ${filter === f ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/30"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="No photos in this category yet" body="We add project photos as jobs are completed. Ask us about similar work on your estimate visit." />
      ) : (
        <div className="snap-row flex gap-3 overflow-x-auto mt-4 pb-2" aria-label="Project photos — swipe to browse">
          {shown.map((p, i) => (
            <figure key={p.title} className="card-lift shrink-0 w-72 sm:w-80 snap-start rounded-lg overflow-hidden border border-[var(--border)] bg-white">
              <button type="button" onClick={() => setOpenIndex(i)} className="block w-full" aria-label={`View photo: ${p.title}`}>
                <img src={p.image} alt={p.alt} className="w-full h-48 sm:h-56 object-cover" loading="lazy" />
              </button>
              <figcaption className="p-3">
                <span className="font-semibold text-navy text-sm">{p.title}</span>
                <span className="block text-xs text-charcoal/65">{p.service} · {p.scope}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="text-sm text-charcoal/60 mt-1">{shown.length} photo{shown.length === 1 ? "" : "s"}{filter !== "All" ? ` · ${filter}` : ""} — swipe to browse</p>
      <p className="text-xs text-charcoal/60 mt-4">
        Photo locations are labeled honestly: our photo library includes completed crew work from other states as well as Seattle-area jobs. We never label an out-of-state job as a Seattle job.
      </p>

      {open && openIndex !== null && (
        <div className="fixed inset-0 z-40 bg-navy-deep/95 flex flex-col anim-fade-slide" role="dialog" aria-modal="true" aria-label={open.title} {...viewerSwipe}>
          <div className="flex items-center justify-between p-4 text-white">
            <p className="font-semibold">{open.title}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">{openIndex + 1} / {shown.length}</span>
              <button type="button" onClick={() => setOpenIndex(null)} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center pressable" aria-label="Close photo viewer">
                <Icon d={I.x} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center">
            <button type="button" onClick={openPrev} aria-label="Previous photo" className="absolute left-2 z-10 rounded-full bg-white/15 text-white w-11 h-11 inline-flex items-center justify-center pressable">
              <Icon d={I.back} size={22} />
            </button>
            <img key={open.title} src={open.image} alt={open.alt} className="flex-1 min-h-0 w-full h-full object-contain anim-fade-slide" />
            <button type="button" onClick={openNext} aria-label="Next photo" className="absolute right-2 z-10 rounded-full bg-white/15 text-white w-11 h-11 inline-flex items-center justify-center pressable">
              <Icon d={I.chevR} size={22} />
            </button>
          </div>
          <div className="p-4 text-white">
            <Badge tone="bronze">{open.service}</Badge>
            <p className="mt-2 text-white/90">{open.scope}</p>
            <p className="mt-1 text-xs text-white/60">Swipe, use the arrows, or tap the dots — Esc closes.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Estimate request wizard (4 steps, guideline p.6) ----------
const KING_COUNTY_ZIPS_3 = ["980", "981", "982"]; // rough King County prefix check for the polite out-of-area note

function EstimateWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<string[]>([]);
  const [propertyType, setPropertyType] = useState("Single-family home");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [description, setDescription] = useState("");
  const [areas, setAreas] = useState("");
  const [approxSize, setApproxSize] = useState("");
  const [timing, setTiming] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [photos, setPhotos] = useState<{ name: string; url: string; file: File }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("phone");
  const [visitTimes, setVisitTimes] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ reference: string; formspreeOk?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const outOfArea = zip.trim().length >= 3 && !KING_COUNTY_ZIPS_3.includes(zip.trim().slice(0, 3));

  const submit = useMutation({
    mutationFn: async () =>
      await api.submitEstimateRequest({
        name,
        phone,
        email,
        preferred_contact: contactMethod,
        services,
        property_type: propertyType,
        address,
        zip,
        description,
        areas,
        approx_size: approxSize,
        timing,
        heard_about: heardAbout,
        visit_times: visitTimes,
        photo_count: photos.length,
        photos: photos.map((p) => p.file),
      }),
    onSuccess: (res) => setSubmitted({ reference: res.reference, formspreeOk: res.formspree_ok }),
    onError: (e) => setError(e instanceof Error ? e.message : "Submission failed. Please call us instead."),
  });

  const toggleService = (slug: string) =>
    setServices((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (next.length >= 5) break;
      next.push({ name: f.name, url: URL.createObjectURL(f), file: f });
    }
    setPhotos(next);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-lg border border-[var(--border)] bg-white p-6 mt-8 text-center">
          <span className="inline-flex w-14 h-14 rounded-full bg-navy text-bronze items-center justify-center"><Icon d={I.check} size={30} /></span>
          <h1 className="text-2xl font-bold text-navy mt-3">Request received</h1>
          <p className="mt-2">Your reference number is <strong className="text-navy">{submitted.reference}</strong>.</p>
          <ol className="text-left mt-4 space-y-2 text-charcoal/90">
            <li><strong>1.</strong> We review your request and photos.</li>
            <li><strong>2.</strong> We contact you to schedule a free site visit — {COMPANY.replyNote}</li>
            <li><strong>3.</strong> You receive a written, signable estimate. No price is ever quoted before that estimate.</li>
          </ol>
          {submitted.formspreeOk === false && (
            <p className="text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg p-3 mt-4" role="alert">
              Saved in the app, but the email to our office did not go through — please call us at {COMPANY.phoneDisplay} so we do not miss it.
            </p>
          )}
          {photos.length > 0 && (
            <p className="text-sm text-charcoal/70 mt-3">
              Your {photos.length} photo{photos.length === 1 ? "" : "s"} could not be emailed with this request — please email them to {COMPANY.email} with reference {submitted.reference}.
            </p>
          )}
          <p className="text-sm text-charcoal/70 mt-4">
            Your request also appears in the My Job tab, where its status updates as we work through it.
          </p>
          <button type="button" className={`${btnNavy} mt-5 w-full`} onClick={onDone}>
            Go to My Job
          </button>
        </div>
      </div>
    );
  }

  const stepValid =
    step === 1 ? services.length > 0 : step === 4 ? name.trim().length > 1 && phone.trim().length >= 7 && /.+@.+\..+/.test(email) && consent : true;

  return (
    <div className="max-w-xl mx-auto">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Cancel estimate request">
        <Icon d={I.back} size={18} /> Back
      </button>
      <h1 className="text-2xl font-bold text-navy">Request a free estimate</h1>
      <p className="text-charcoal/75 mt-1">Four short steps — most people finish in under three minutes.</p>

      <div className="mt-4" aria-label={`Step ${step} of 4`}>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              disabled={n > step}
              onClick={() => n < step && setStep(n)}
              aria-label={`Go to step ${n}: ${["Service", "The work", "Photos", "Contact"][n - 1]}`}
              className={`bar-anim h-2 flex-1 rounded ${n < step ? "bg-navy" : n === step ? "bg-bronze" : "bg-stone-300"}`}
            />
          ))}
          <span className="text-sm font-semibold text-navy ml-1">Step {step} of 4</span>
        </div>
        <ol className="flex gap-2 mt-1.5">
          {["Service", "The work", "Photos", "Contact"].map((label, i) => (
            <li key={label} className={`flex-1 text-[11px] leading-tight ${i + 1 === step ? "font-bold text-navy" : i + 1 < step ? "text-navy/80" : "text-charcoal/50"}`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      {step === 1 && (
        <section key={`step-${step}`} className="mt-5 anim-fade-slide" aria-label="Step 1: the service">
          <h2 className="font-semibold text-navy text-lg mb-2">What do you need done?</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose one or more services">
            {SERVICES.map((s) => (
              <button
                key={s.slug}
                type="button"
                aria-pressed={services.includes(s.slug)}
                onClick={() => toggleService(s.slug)}
                className={`rounded-full px-4 py-2.5 font-semibold min-h-11 border ${services.includes(s.slug) ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/30"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <Field label="Property type">
            <select className={inputCls} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option>Single-family home</option>
              <option>Townhome / condo</option>
              <option>Multi-family / rental</option>
              <option>Commercial</option>
            </select>
          </Field>
          <Field label="Property address">
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, city" autoComplete="street-address" />
          </Field>
          <Field label="ZIP code">
            <input className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="98107" inputMode="numeric" autoComplete="postal-code" />
          </Field>
          {outOfArea && (
            <p className="rounded border border-bronze-dark bg-cream p-3 text-sm" role="note">
              That ZIP looks outside our Seattle / King County service area. You can still send the request — we will tell you honestly whether we can take the job.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section key={`step-${step}`} className="mt-5 anim-fade-slide" aria-label="Step 2: the work">
          <h2 className="font-semibold text-navy text-lg mb-2">Tell us about the work</h2>
          <Field label="Describe the work in plain English">
            <textarea className={`${inputCls} min-h-28`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Example: Water damage in the living room ceiling and one wall — about 120 sq ft needs patching, texture match, prime, and paint." />
          </Field>
          <Field label="Rooms / areas involved">
            <input className={inputCls} value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Living room and hallway" />
          </Field>
          <Field label="Approximate size, if you know it (optional — the site visit confirms it)">
            <input className={inputCls} value={approxSize} onChange={(e) => setApproxSize(e.target.value)} placeholder="About 120 sq ft" />
          </Field>
          <Field label="When would you like the work done?">
            <select className={inputCls} value={timing} onChange={(e) => setTiming(e.target.value)}>
              <option value="">Select…</option>
              <option>As soon as possible</option>
              <option>Within the next month</option>
              <option>1–3 months out</option>
              <option>Just planning for now</option>
            </select>
          </Field>
          <Field label="How did you hear about us?">
            <select className={inputCls} value={heardAbout} onChange={(e) => setHeardAbout(e.target.value)}>
              <option value="">Select…</option>
              <option>Google</option>
              <option>Yelp</option>
              <option>Referral from a neighbor or friend</option>
              <option>Drove by a job site</option>
              <option>Other</option>
            </select>
          </Field>
        </section>
      )}

      {step === 3 && (
        <section key={`step-${step}`} className="mt-5 anim-fade-slide" aria-label="Step 3: photos">
          <h2 className="font-semibold text-navy text-lg mb-2">Add photos (up to 5)</h2>
          <p className="text-sm text-charcoal/75 mb-3">Photos of the area help us prepare for the site visit. Camera or photo library both work.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-label="Choose up to 5 photos of the work area"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
            <Icon d={I.camera} size={20} /> Add photos
          </button>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((p, i) => (
                <div key={p.url} className="relative">
                  <img src={p.url} alt={`Your uploaded photo ${i + 1}: ${p.name}`} className="w-full h-24 object-cover rounded border border-[var(--border)]" />
                  <button
                    type="button"
                    aria-label={`Remove photo ${p.name}`}
                    className="absolute top-1 right-1 bg-navy text-white rounded-full w-8 h-8 inline-flex items-center justify-center"
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  >
                    <Icon d={I.x} size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-charcoal/60 mt-3">{photos.length} of 5 photos attached. You can also skip this step and show us in person.</p>
        </section>
      )}

      {step === 4 && (
        <section key={`step-${step}`} className="mt-5 anim-fade-slide" aria-label="Step 4: contact and review">
          <h2 className="font-semibold text-navy text-lg mb-2">Your contact details</h2>
          <Field label="Full name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
          </Field>
          <Field label="Preferred contact method">
            <select className={inputCls} value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}>
              <option value="phone">Phone call</option>
              <option value="text">Text message</option>
              <option value="email">Email</option>
            </select>
          </Field>
          <Field label="Preferred site-visit times">
            <input className={inputCls} value={visitTimes} onChange={(e) => setVisitTimes(e.target.value)} placeholder="Weekday mornings, or Saturday" />
          </Field>

          <div className="rounded-lg border border-[var(--border)] bg-white p-4 mt-2">
            <h3 className="font-semibold text-navy mb-2">Review your request</h3>
            <dl className="text-sm space-y-1">
              <div className="flex gap-2"><dt className="font-medium w-28 shrink-0">Services</dt><dd>{services.map((s) => SERVICES.find((x) => x.slug === s)?.name ?? s).join(", ") || "—"}</dd></div>
              <div className="flex gap-2"><dt className="font-medium w-28 shrink-0">Property</dt><dd>{propertyType}{address ? ` · ${address}` : ""}{zip ? ` · ${zip}` : ""}</dd></div>
              <div className="flex gap-2"><dt className="font-medium w-28 shrink-0">The work</dt><dd>{description || "—"}</dd></div>
              <div className="flex gap-2"><dt className="font-medium w-28 shrink-0">Photos</dt><dd>{photos.length} attached</dd></div>
              <div className="flex gap-2"><dt className="font-medium w-28 shrink-0">Contact</dt><dd>{name} · {phone} · {email}</dd></div>
            </dl>
          </div>

          <label className="flex gap-3 items-start mt-4 min-h-11">
            <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-sm">I agree to be contacted by Seattle MasterFix about this request by phone, text, and email.</span>
          </label>
          {error && <ErrorNote message={error} />}
        </section>
      )}

      <div className="flex gap-2 mt-6 mb-4">
        {step > 1 && (
          <button type="button" className={btnGhost} onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < 4 ? (
          <button type="button" className={`${btnNavy} flex-1`} disabled={!stepValid} onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <button type="button" className={`${btnPrimary} flex-1`} disabled={!stepValid || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Sending…" : "Submit request"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- My Job ----------
const REQUEST_STATUS_LABEL: Record<string, string> = {
  received: "Request Received",
  visit_scheduled: "Site Visit Scheduled",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  not_approved: "Not Approved",
  converted: "Job Created",
};
const REQUEST_STEPS = ["received", "visit_scheduled", "estimate_sent", "approved"];

const JOB_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const pct = job.milestone_total > 0 ? Math.round((job.milestone_done / job.milestone_total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-lift w-full text-left rounded-lg border border-[var(--border)] bg-white p-4 hover:border-bronze"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-navy text-lg leading-snug">{job.title}</span>
        <Badge tone={job.status === "completed" ? "green" : job.status === "in_progress" ? "bronze" : "navy"}>
          {JOB_STATUS_LABEL[job.status] ?? job.status}
        </Badge>
      </span>
      {job.estimate_no && <span className="block text-sm text-charcoal/70 mt-0.5">Estimate {job.estimate_no}</span>}
      {job.address && <span className="block text-sm text-charcoal/70">{job.address}</span>}
      {job.start_date && (
        <span className="block text-sm mt-1">
          {job.status === "completed" ? "Completed" : "Starts"} {prettyDate(job.start_date)}
          {job.arrival_window ? ` · Crew arrives ${job.arrival_window}` : ""}
        </span>
      )}
      {job.milestone_total > 0 && (
        <span className="block mt-3">
          <span className="flex justify-between text-sm mb-1">
            <span>{job.milestone_done} of {job.milestone_total} milestones complete</span>
            <span className="font-semibold text-navy">{pct}%</span>
          </span>
          <span className="block h-2.5 rounded bg-stone-200 overflow-hidden">
            <span className="bar-anim block h-full bg-bronze" style={{ width: `${pct}%` }} />
          </span>
        </span>
      )}
      {job.status === "completed" && job.warranty_start && (
        <span className="block text-sm mt-2 text-green-800 font-medium">1-year labor warranty started {prettyDate(job.warranty_start)}</span>
      )}
    </button>
  );
}

function MyJobTab({ onOpenJob, onEstimate }: { onOpenJob: (id: number) => void; onEstimate: () => void }) {
  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: () => api.listJobs({}) });
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: () => api.listEstimateRequests({ limit: 50 }) });
  const activeRequests = (reqQ.data?.requests ?? []).filter((r) => r.status !== "converted");

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">My Job</h1>
      <p className="text-charcoal/80 mt-1">Your estimate requests and job progress — schedule, photos, documents, and payments in one place.</p>

      {jobsQ.isPending || reqQ.isPending ? (
        <div className="space-y-3 mt-5" aria-label="Loading your jobs">
          {[1, 2].map((n) => (
            <div key={n} className="rounded-lg border border-[var(--border)] bg-white p-4 animate-pulse">
              <div className="h-5 bg-stone-200 rounded w-2/3" />
              <div className="h-4 bg-stone-200 rounded w-1/2 mt-2" />
              <div className="h-2.5 bg-stone-200 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : jobsQ.error ? (
        <ErrorNote message={jobsQ.error instanceof Error ? jobsQ.error.message : "Please try again."} />
      ) : (
        <>
          {(jobsQ.data?.jobs.length ?? 0) === 0 && activeRequests.length === 0 && (
            <EmptyState
              title="No job yet — request an estimate to get started"
              body="Once your estimate is approved and the job is scheduled, its timeline, crew photos, documents, and payment status will appear here."
              action={
                <button type="button" className={btnPrimary} onClick={onEstimate}>
                  Request a Free Estimate
                </button>
              }
            />
          )}

          {(jobsQ.data?.jobs.length ?? 0) > 0 && (
            <>
              <SectionTitle>Your jobs</SectionTitle>
              <div className="space-y-3">
                {jobsQ.data!.jobs.map((j) => (
                  <JobCard key={j.id} job={j} onOpen={() => onOpenJob(j.id)} />
                ))}
              </div>
            </>
          )}

          {activeRequests.length > 0 && (
            <>
              <SectionTitle>Estimate requests</SectionTitle>
              <div className="space-y-3">
                {activeRequests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-[var(--border)] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-navy">
                        {r.services.map((s) => SERVICES.find((x) => x.slug === s)?.name ?? s).join(", ") || "Estimate request"}
                      </p>
                      <Badge tone={r.status === "approved" ? "green" : r.status === "not_approved" ? "gray" : "bronze"}>
                        {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-charcoal/70">Reference SMF-REQ-{r.id} · Sent {fmtDate(r.created_at)}</p>
                    {r.status !== "not_approved" && (
                      <ol className="flex items-center gap-1 mt-3" aria-label="Request progress">
                        {REQUEST_STEPS.map((s, i) => {
                          const reached = REQUEST_STEPS.indexOf(r.status) >= i;
                          return (
                            <li key={s} className="flex-1">
                              <span className={`block h-2 rounded ${reached ? "bg-bronze" : "bg-stone-200"}`} />
                              <span className={`block text-[11px] mt-1 ${reached ? "font-semibold text-navy" : "text-charcoal/55"}`}>
                                {REQUEST_STATUS_LABEL[s]}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    {r.status === "estimate_sent" && (
                      <p className="text-sm mt-2">Your written estimate has been sent — check your email for the signable agreement, or call us with any questions.</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {(jobsQ.data?.jobs.length ?? 0) > 0 && (
            <button type="button" className={`${btnGhost} mt-6`} onClick={onEstimate}>
              <Icon d={I.plus} size={18} /> Start a new project
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Notifications ----------
function NotificationsView({ items, onOpenJob, onBack }: { items: Notification[]; onOpenJob: (id: number) => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const markRead = useMutation({
    mutationFn: async () => await api.markNotificationsRead({}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  useEffect(() => {
    if (items.some((n) => !n.read)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Back">
        <Icon d={I.back} size={18} /> Back
      </button>
      <h1 className="text-2xl font-bold text-navy">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState title="No notifications yet" body="Site-visit bookings, milestone completions, new photos and documents, payment reminders, and completion notices will appear here." />
      ) : (
        <ul className="space-y-2 mt-4">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                disabled={n.job_id === null}
                onClick={() => n.job_id !== null && onOpenJob(n.job_id)}
                className={`w-full text-left rounded-lg border p-3.5 ${n.read ? "bg-white border-[var(--border)]" : "bg-cream border-bronze-dark"}`}
              >
                <span className="flex justify-between gap-3">
                  <span className="font-semibold text-navy">{n.title}</span>
                  <span className="text-xs text-charcoal/60 shrink-0">{fmtDateTime(n.created_at)}</span>
                </span>
                {n.body && <span className="block text-sm text-charcoal/80 mt-0.5">{n.body}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Job detail / timeline ----------
function JobDetailView({ jobId, onBack }: { jobId: number; onBack: () => void }) {
  const queryClient = useQueryClient();
  const detailQ = useQuery({ queryKey: ["job", jobId], queryFn: () => api.getJob({ job_id: jobId }) });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const mut = <A,>(fn: (a: A) => Promise<unknown>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMutation({ mutationFn: fn, onSuccess: invalidate });

  const toggleMs = mut((a: { milestone_id: number; done: boolean }) => api.toggleMilestone(a));
  const decideCo = mut((a: { change_order_id: number; decision: "approved" | "declined" }) => api.decideChangeOrder(a));
  const markPaid = mut((a: { payment_id: number; paid: boolean }) => api.markPaymentPaid(a));

  const [msTitle, setMsTitle] = useState("");
  const addMs = mut((title: string) => api.addMilestone({ job_id: jobId, title }));

  const [updateBody, setUpdateBody] = useState("");
  const [updateLabel, setUpdateLabel] = useState<"" | "before" | "during" | "after">("");
  const [updatePhoto, setUpdatePhoto] = useState<{ dataBase64: string; mimeType: string; preview: string } | null>(null);
  const addUpdate = useMutation({
    mutationFn: async () =>
      await api.addUpdate({
        job_id: jobId,
        body: updateBody,
        photo_label: updateLabel,
        photo: updatePhoto ? { data_base64: updatePhoto.dataBase64, mime_type: updatePhoto.mimeType } : null,
      }),
    onSuccess: () => {
      setUpdateBody("");
      setUpdateLabel("");
      setUpdatePhoto(null);
      invalidate();
    },
  });

  const [coDesc, setCoDesc] = useState("");
  const [coAmount, setCoAmount] = useState("");
  const addCo = useMutation({
    mutationFn: async () =>
      await api.addChangeOrder({ job_id: jobId, description: coDesc, amount_cents: Math.round(parseFloat(coAmount || "0") * 100) }),
    onSuccess: () => {
      setCoDesc("");
      setCoAmount("");
      invalidate();
    },
  });

  const [payLabel, setPayLabel] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDue, setPayDue] = useState("");
  const addPay = useMutation({
    mutationFn: async () =>
      await api.addPayment({ job_id: jobId, label: payLabel, amount_cents: Math.round(parseFloat(payAmount || "0") * 100), due_date: payDue }),
    onSuccess: () => {
      setPayLabel("");
      setPayAmount("");
      setPayDue("");
      invalidate();
    },
  });

  const [msgBody, setMsgBody] = useState("");
  const [msgAs, setMsgAs] = useState<"client" | "office">("client");
  const postMsg = useMutation({
    mutationFn: async () => await api.postMessage({ job_id: jobId, sender: msgAs, body: msgBody }),
    onSuccess: () => {
      setMsgBody("");
      invalidate();
    },
  });

  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState("estimate");
  const [docFile, setDocFile] = useState<{ dataBase64: string; mimeType: string; name: string } | null>(null);
  const addDoc = useMutation({
    mutationFn: async () => {
      if (!docFile) throw new Error("Choose a file first");
      return await api.addDocument({
        job_id: jobId,
        name: docName || docFile.name,
        kind: docKind,
        file: { data_base64: docFile.dataBase64, mime_type: docFile.mimeType },
      });
    },
    onSuccess: () => {
      setDocName("");
      setDocFile(null);
      invalidate();
    },
  });

  const [openDoc, setOpenDoc] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);

  if (detailQ.isPending) {
    return (
      <div className="mt-6 space-y-3" aria-label="Loading job">
        <div className="h-8 bg-stone-200 rounded w-2/3 animate-pulse" />
        <div className="h-40 bg-stone-200 rounded animate-pulse" />
        <div className="h-40 bg-stone-200 rounded animate-pulse" />
      </div>
    );
  }
  if (detailQ.error) return <ErrorNote message={detailQ.error instanceof Error ? detailQ.error.message : "Please try again."} />;
  const detail: JobDetail | null = detailQ.data?.detail ?? null;
  if (!detail) return <EmptyState title="Job not found" body="This job may have been removed." action={<button type="button" className={btnNavy} onClick={onBack}>Back to My Job</button>} />;
  const job = detail.job;
  const pct = job.milestone_total > 0 ? Math.round((job.milestone_done / job.milestone_total) * 100) : 0;
  const nextMilestone = detail.milestones.find((m) => !m.done_at);

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Back to My Job">
        <Icon d={I.back} size={18} /> My Job
      </button>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy leading-snug">{job.title}</h1>
        <Badge tone={job.status === "completed" ? "green" : job.status === "in_progress" ? "bronze" : "navy"}>
          {JOB_STATUS_LABEL[job.status] ?? job.status}
        </Badge>
      </div>
      <p className="text-charcoal/75">
        {job.client_name}
        {job.estimate_no ? ` · Estimate ${job.estimate_no}` : ""}
        {job.address ? ` · ${job.address}` : ""}
      </p>

      {/* What's next */}
      <div className="rounded-lg bg-navy text-white p-4 mt-4">
        <h2 className="font-semibold text-bronze-light">What happens next</h2>
        {job.status === "scheduled" && (
          <p className="mt-1">
            {job.start_date ? <>Work starts <strong>{prettyDate(job.start_date)}</strong>{job.arrival_window ? <> — crew arrives {job.arrival_window}</> : ""}.</> : "Your start date will appear here once scheduled."}
            {job.end_date ? <> Expected finish: {prettyDate(job.end_date)}.</> : ""}
          </p>
        )}
        {job.status === "in_progress" && (
          <p className="mt-1">
            {nextMilestone ? <>Next milestone: <strong>{nextMilestone.title}</strong>.</> : "The crew is finishing the final items."} Progress so far: {pct}% of milestones complete.
          </p>
        )}
        {job.status === "on_hold" && <p className="mt-1">This job is currently on hold. Message the office below with any questions.</p>}
        {job.status === "completed" && (
          <p className="mt-1">
            This job is complete. {job.warranty_start ? <>Your 1-year labor warranty started {prettyDate(job.warranty_start)}.</> : ""}
          </p>
        )}
        {job.prep_notes && <p className="mt-2 text-white/85 text-sm"><strong>Please prepare:</strong> {job.prep_notes}</p>}
      </div>

      {/* Milestones timeline */}
      <SectionTitle>Timeline</SectionTitle>
      {detail.milestones.length === 0 ? (
        <p className="text-charcoal/70">Milestones will appear here as the office sets up the job.</p>
      ) : (
        <ol className="relative border-l-2 border-bronze/60 ml-3 space-y-4">
          {detail.milestones.map((m) => (
            <li key={m.id} className="pl-5 relative">
              <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${m.done_at ? "bg-bronze border-bronze" : "bg-white border-bronze-dark"}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-medium ${m.done_at ? "text-charcoal" : "text-navy font-semibold"}`}>{m.title}</p>
                  {m.done_at && <p className="text-sm text-charcoal/65">Done {fmtDate(m.done_at)}</p>}
                </div>
                <button
                  type="button"
                  className={m.done_at ? btnGhost : btnNavy}
                  aria-label={m.done_at ? `Mark milestone not done: ${m.title}` : `Mark milestone done: ${m.title}`}
                  onClick={() => toggleMs.mutate({ milestone_id: m.id, done: !m.done_at })}
                >
                  {m.done_at ? "Undo" : "Mark done"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex gap-2 mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (msTitle.trim()) addMs.mutate(msTitle.trim());
          setMsTitle("");
        }}
      >
        <label className="sr-only" htmlFor="ms-title">New milestone (office)</label>
        <input id="ms-title" className={inputCls} value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Add a milestone (office) — e.g. Drywall patched" />
        <button type="submit" className={btnNavy} disabled={!msTitle.trim()}>Add</button>
      </form>

      {/* Updates & photos */}
      <SectionTitle>Progress updates</SectionTitle>
      {detail.updates.length === 0 ? (
        <p className="text-charcoal/70">No updates yet. Dated notes and crew photos will appear here as work progresses.</p>
      ) : (
        <ul className="space-y-3">
          {detail.updates.map((u) => (
            <li key={u.id} className="rounded-lg border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-charcoal/60">{fmtDateTime(u.created_at)}{u.photo_label ? ` · Photo: ${u.photo_label}` : ""}</p>
              <p className="mt-1">{u.body}</p>
              {u.photo_url && <img src={u.photo_url} alt={u.photo_label ? `Job photo (${u.photo_label})` : "Job progress photo"} className="mt-2 rounded w-full max-h-80 object-cover" loading="lazy" />}
            </li>
          ))}
        </ul>
      )}
      <form
        className="rounded-lg border border-[var(--border)] bg-white p-4 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (updateBody.trim()) addUpdate.mutate();
        }}
      >
        <h3 className="font-semibold text-navy mb-2">Post an update (office / crew)</h3>
        <label className="sr-only" htmlFor="update-body">Update text</label>
        <textarea id="update-body" className={`${inputCls} min-h-20`} value={updateBody} onChange={(e) => setUpdateBody(e.target.value)} placeholder="Example: Texture matched and primed today. Painting starts tomorrow morning." />
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <label className="text-sm font-medium" htmlFor="update-label">Photo label</label>
          <select id="update-label" className="rounded border border-[var(--border)] px-2 py-2 min-h-10" value={updateLabel} onChange={(e) => setUpdateLabel(e.target.value as "" | "before" | "during" | "after")}>
            <option value="">No label</option>
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="after">After</option>
          </select>
          <label className={btnGhost}>
            <Icon d={I.camera} size={18} /> {updatePhoto ? "Photo attached" : "Attach photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Attach a progress photo"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const { dataBase64, mimeType } = await fileToBase64(f);
                setUpdatePhoto({ dataBase64, mimeType, preview: URL.createObjectURL(f) });
              }}
            />
          </label>
          {updatePhoto && <img src={updatePhoto.preview} alt="Photo to attach to this update" className="h-12 w-12 object-cover rounded" />}
        </div>
        <button type="submit" className={`${btnNavy} mt-3`} disabled={!updateBody.trim() || addUpdate.isPending}>
          {addUpdate.isPending ? "Posting…" : "Post update"}
        </button>
      </form>

      {/* Change orders */}
      <SectionTitle>Change orders</SectionTitle>
      {detail.change_orders.length === 0 ? (
        <p className="text-charcoal/70">No change orders. If the scope changes, the change and its price difference will appear here for your written approval before that work proceeds.</p>
      ) : (
        <ul className="space-y-3">
          {detail.change_orders.map((c) => (
            <li key={c.id} className="rounded-lg border border-[var(--border)] bg-white p-4">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{c.description}</p>
                <p className="font-semibold text-navy whitespace-nowrap">{c.amount_cents >= 0 ? "+" : "−"}{money(Math.abs(c.amount_cents))}</p>
              </div>
              <p className="text-sm text-charcoal/60 mt-0.5">Added {fmtDate(c.created_at)}</p>
              {c.status === "pending" ? (
                <div className="flex gap-2 mt-3">
                  <button type="button" className="flex-1 rounded bg-green-700 text-white font-semibold min-h-11" onClick={() => decideCo.mutate({ change_order_id: c.id, decision: "approved" })}>
                    Approve
                  </button>
                  <button type="button" className="flex-1 rounded border border-red-700 text-red-800 font-semibold min-h-11 bg-white" onClick={() => decideCo.mutate({ change_order_id: c.id, decision: "declined" })}>
                    Decline
                  </button>
                </div>
              ) : (
                <p className="mt-2"><Badge tone={c.status === "approved" ? "green" : "gray"}>{c.status === "approved" ? "Approved in writing" : "Declined"}</Badge></p>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="rounded-lg border border-[var(--border)] bg-white p-4 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (coDesc.trim()) addCo.mutate();
        }}
      >
        <h3 className="font-semibold text-navy mb-2">Add a change order (office)</h3>
        <label className="sr-only" htmlFor="co-desc">What changed and why</label>
        <textarea id="co-desc" className={`${inputCls} min-h-16`} value={coDesc} onChange={(e) => setCoDesc(e.target.value)} placeholder="What changed, and why" />
        <label className="block text-sm font-semibold text-navy mt-2 mb-1" htmlFor="co-amount">Price difference ($ — use a negative number for a credit)</label>
        <input id="co-amount" className={inputCls} value={coAmount} onChange={(e) => setCoAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        <button type="submit" className={`${btnNavy} mt-3`} disabled={!coDesc.trim()}>Add change order</button>
      </form>

      {/* Payments status */}
      <SectionTitle>Payments</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <dl className="space-y-1.5 text-[15px]">
          <div className="flex justify-between gap-3"><dt>Contract total (per signed estimate)</dt><dd className="font-semibold">{money(job.contract_total_cents)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Deposit due</dt><dd className="font-semibold">{money(job.deposit_due_cents)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Deposit status</dt><dd><Badge tone={job.deposit_paid ? "green" : "bronze"}>{job.deposit_paid ? "Received" : job.deposit_due_cents ? "Due" : "—"}</Badge></dd></div>
          <div className="flex justify-between gap-3"><dt>Balance due</dt><dd className="font-semibold">{money(job.balance_due_cents)}{job.balance_due_date ? ` · by ${prettyDate(job.balance_due_date)}` : ""}</dd></div>
        </dl>
        {detail.payments.length > 0 && (
          <ul className="mt-3 border-t border-[var(--border)] pt-3 space-y-2">
            {detail.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{p.label}</span>
                  <span className="block text-sm text-charcoal/65">{money(p.amount_cents)}{p.due_date ? ` · Due ${prettyDate(p.due_date)}` : ""}{p.paid_at ? ` · Paid ${fmtDate(p.paid_at)}` : ""}</span>
                </span>
                <button
                  type="button"
                  className={p.paid_at ? btnGhost : btnNavy}
                  aria-label={p.paid_at ? `Mark ${p.label} unpaid` : `Mark ${p.label} paid`}
                  onClick={() => markPaid.mutate({ payment_id: p.id, paid: !p.paid_at })}
                >
                  {p.paid_at ? "Paid ✓" : "Mark paid"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-charcoal/65 mt-3">Amounts are exactly as written in your signed agreement. To pay, use the payment method in your agreement or call the office — this app never stores card numbers.</p>
      </div>
      <form
        className="rounded-lg border border-[var(--border)] bg-white p-4 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (payLabel.trim()) addPay.mutate();
        }}
      >
        <h3 className="font-semibold text-navy mb-2">Add a payment line (office)</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1" htmlFor="pay-label">Label</label>
            <input id="pay-label" className={inputCls} value={payLabel} onChange={(e) => setPayLabel(e.target.value)} placeholder="Progress payment" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1" htmlFor="pay-amount">Amount ($)</label>
            <input id="pay-amount" className={inputCls} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1" htmlFor="pay-due">Due date</label>
            <input id="pay-due" type="date" className={inputCls} value={payDue} onChange={(e) => setPayDue(e.target.value)} />
          </div>
        </div>
        <button type="submit" className={`${btnNavy} mt-3`} disabled={!payLabel.trim()}>Add payment line</button>
      </form>

      {/* Documents */}
      <SectionTitle>Documents</SectionTitle>
      {detail.documents.length === 0 ? (
        <p className="text-charcoal/70">No documents yet. Your estimate, signed agreement, invoices, and warranty letter will be stored here.</p>
      ) : (
        <ul className="space-y-2">
          {detail.documents.map((d) => (
            <li key={d.id} className="rounded-lg border border-[var(--border)] bg-white p-3.5 flex items-center gap-3">
              <span className="text-navy"><Icon d={I.doc} size={22} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{d.name}</span>
                <span className="block text-sm text-charcoal/60 capitalize">{d.kind.replace("_", " ")} · {fmtDate(d.created_at)}</span>
              </span>
              {d.url && (
                <>
                  <button type="button" className={btnGhost} onClick={() => setOpenDoc({ name: d.name, url: d.url!, isPdf: d.name.toLowerCase().endsWith(".pdf") })}>
                    View
                  </button>
                  <a href={d.url} download={d.name} className={btnGhost} aria-label={`Download ${d.name}`}>
                    <Icon d={I.download} size={18} />
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="rounded-lg border border-[var(--border)] bg-white p-4 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (docFile) addDoc.mutate();
        }}
      >
        <h3 className="font-semibold text-navy mb-2">Add a document (office)</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1" htmlFor="doc-kind">Kind</label>
            <select id="doc-kind" className={inputCls} value={docKind} onChange={(e) => setDocKind(e.target.value)}>
              <option value="estimate">Estimate PDF</option>
              <option value="agreement">Signed agreement</option>
              <option value="invoice">Invoice</option>
              <option value="permit">Permit</option>
              <option value="warranty">Warranty letter</option>
              <option value="document">Other document</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1" htmlFor="doc-name">Name (optional)</label>
            <input id="doc-name" className={inputCls} value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Defaults to the file name" />
          </div>
        </div>
        <label className={`${btnGhost} mt-2`}>
          <Icon d={I.doc} size={18} /> {docFile ? docFile.name : "Choose file (PDF or image)"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            aria-label="Choose a document file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const { dataBase64, mimeType } = await fileToBase64(f);
              setDocFile({ dataBase64, mimeType, name: f.name });
            }}
          />
        </label>
        <button type="submit" className={`${btnNavy} mt-3 block`} disabled={!docFile || addDoc.isPending}>
          {addDoc.isPending ? "Uploading…" : "Add document"}
        </button>
      </form>

      {/* Completion & warranty */}
      {job.status === "completed" && (
        <>
          <SectionTitle>Completion &amp; warranty</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <p><strong className="text-navy">1-year labor warranty</strong>{job.warranty_start ? <> started {prettyDate(job.warranty_start)}</> : ""}.</p>
            {job.care_notes && <p className="mt-2"><strong className="text-navy">Care notes:</strong> {job.care_notes}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <a href={COMPANY.googleReviewUrl} target="_blank" rel="noreferrer" className={btnPrimary}>
                <Icon d={I.star} size={18} /> Leave a Google review
              </a>
              <a href={COMPANY.phoneHref} className={btnGhost}>
                <Icon d={I.phone} size={18} /> Warranty / service request
              </a>
            </div>
          </div>
        </>
      )}

      {/* Messages */}
      <SectionTitle>Messages</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        {detail.messages.length === 0 ? (
          <p className="text-charcoal/70">No messages yet. Ask the office anything about this job here.</p>
        ) : (
          <ul className="space-y-3">
            {detail.messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-lg p-3 ${m.sender === "office" ? "bg-cream mr-auto" : "bg-navy text-white ml-auto"}`}>
                <p className={`text-xs font-semibold ${m.sender === "office" ? "text-navy" : "text-bronze-light"}`}>
                  {m.sender === "office" ? "Seattle MasterFix office" : "Client"} · {fmtDateTime(m.created_at)}
                </p>
                <p className="mt-0.5">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (msgBody.trim()) postMsg.mutate();
          }}
        >
          <label className="block text-sm font-semibold text-navy mb-1" htmlFor="msg-as">Send as</label>
          <select id="msg-as" className="rounded border border-[var(--border)] px-2 py-2 min-h-10 mb-2" value={msgAs} onChange={(e) => setMsgAs(e.target.value as "client" | "office")}>
            <option value="client">Client</option>
            <option value="office">Office</option>
          </select>
          <label className="sr-only" htmlFor="msg-body">Message text</label>
          <textarea id="msg-body" className={`${inputCls} min-h-16`} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Write a message about this job…" />
          <button type="submit" className={`${btnNavy} mt-2`} disabled={!msgBody.trim() || postMsg.isPending}>
            <Icon d={I.send} size={18} /> Send message
          </button>
        </form>
      </div>

      {/* Office: edit job */}
      <OfficeJobEditor job={job} onSaved={invalidate} />

      {openDoc && (
        <DocumentViewer name={openDoc.name} url={openDoc.url} isPdf={openDoc.isPdf} onClose={() => setOpenDoc(null)} />
      )}
    </div>
  );
}

function DocumentViewer({ name, url, isPdf, onClose }: { name: string; url: string; isPdf: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-navy-deep/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`Document: ${name}`}>
      <div className="flex items-center justify-between gap-3 p-4 text-white">
        <p className="font-semibold truncate">{name}</p>
        <div className="flex gap-1 shrink-0">
          <a href={url} download={name} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center" aria-label={`Download ${name}`}>
            <Icon d={I.download} />
          </a>
          <button type="button" onClick={onClose} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center" aria-label="Close document viewer">
            <Icon d={I.x} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white overflow-auto">
        {isPdf ? <PdfDocument url={url} /> : <img src={url} alt={name} className="w-full object-contain" />}
      </div>
    </div>
  );
}

// Portable Pages version: PDFs render in a plain iframe instead of the
// Muse-only PDF viewer. The download button above still works.
function PdfDocument({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="Job document PDF"
      className="w-full h-full min-h-[70vh] border-0"
    />
  );
}

type JobStatus = "scheduled" | "in_progress" | "completed" | "on_hold";

function OfficeJobEditor({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<JobStatus>(job.status as JobStatus);
  const [startDate, setStartDate] = useState(job.start_date);
  const [endDate, setEndDate] = useState(job.end_date);
  const [arrival, setArrival] = useState(job.arrival_window);
  const [prep, setPrep] = useState(job.prep_notes);
  const [total, setTotal] = useState(job.contract_total_cents !== null ? String(job.contract_total_cents / 100) : "");
  const [deposit, setDeposit] = useState(job.deposit_due_cents !== null ? String(job.deposit_due_cents / 100) : "");
  const [depositPaid, setDepositPaid] = useState(job.deposit_paid);
  const [balance, setBalance] = useState(job.balance_due_cents !== null ? String(job.balance_due_cents / 100) : "");
  const [balanceDate, setBalanceDate] = useState(job.balance_due_date);
  const [warrantyStart, setWarrantyStart] = useState(job.warranty_start);
  const [careNotes, setCareNotes] = useState(job.care_notes);

  useEffect(() => {
    setStatus(job.status as JobStatus);
    setStartDate(job.start_date);
    setEndDate(job.end_date);
    setArrival(job.arrival_window);
    setPrep(job.prep_notes);
    setTotal(job.contract_total_cents !== null ? String(job.contract_total_cents / 100) : "");
    setDeposit(job.deposit_due_cents !== null ? String(job.deposit_due_cents / 100) : "");
    setDepositPaid(job.deposit_paid);
    setBalance(job.balance_due_cents !== null ? String(job.balance_due_cents / 100) : "");
    setBalanceDate(job.balance_due_date);
    setWarrantyStart(job.warranty_start);
    setCareNotes(job.care_notes);
  }, [job]);

  const toCents = (v: string) => (v.trim() === "" ? null : Math.round(parseFloat(v) * 100));
  const save = useMutation({
    mutationFn: async () =>
      await api.updateJob({
        job_id: job.id,
        status: status,
        start_date: startDate,
        end_date: endDate,
        arrival_window: arrival,
        prep_notes: prep,
        contract_total_cents: toCents(total),
        deposit_due_cents: toCents(deposit),
        deposit_paid: depositPaid,
        balance_due_cents: toCents(balance),
        balance_due_date: balanceDate,
        warranty_start: warrantyStart,
        care_notes: careNotes,
      }),
    onSuccess: () => {
      setOpen(false);
      onSaved();
    },
  });

  return (
    <div className="mt-8">
      <button type="button" className={btnGhost} onClick={() => setOpen(!open)} aria-expanded={open}>
        Office: edit schedule, status &amp; payments {open ? "▲" : "▼"}
      </button>
      {open && (
        <form
          className="rounded-lg border border-[var(--border)] bg-white p-4 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as JobStatus)}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </Field>
            <Field label="Crew arrival window">
              <input className={inputCls} value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="8:00–9:00 AM" />
            </Field>
            <Field label="Start date">
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Expected end date">
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <Field label="Contract total ($)">
              <input className={inputCls} value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" placeholder="From the signed estimate" />
            </Field>
            <Field label="Deposit due ($)">
              <input className={inputCls} value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Balance due ($)">
              <input className={inputCls} value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Balance due date">
              <input type="date" className={inputCls} value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} />
            </Field>
            <Field label="Warranty start date">
              <input type="date" className={inputCls} value={warrantyStart} onChange={(e) => setWarrantyStart(e.target.value)} />
            </Field>
          </div>
          <label className="flex gap-3 items-center min-h-11">
            <input type="checkbox" className="w-5 h-5" checked={depositPaid} onChange={(e) => setDepositPaid(e.target.checked)} />
            <span className="font-medium">Deposit received</span>
          </label>
          <Field label="What the client should prepare">
            <textarea className={`${inputCls} min-h-16`} value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="Clear the room, move pets to another area, side-gate access…" />
          </Field>
          <Field label="Care notes (shown after completion)">
            <textarea className={`${inputCls} min-h-16`} value={careNotes} onChange={(e) => setCareNotes(e.target.value)} />
          </Field>
          <button type="submit" className={btnNavy} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save job"}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------- More ----------
function MoreTab({ onOffice, onEstimate }: { onOffice: () => void; onEstimate: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [zipCheck, setZipCheck] = useState("");
  const zipResult =
    zipCheck.trim().length >= 3
      ? KING_COUNTY_ZIPS_3.includes(zipCheck.trim().slice(0, 3))
        ? "Good news — that ZIP is in our Seattle / King County service area."
        : "That ZIP looks outside King County. Send a request anyway and we will tell you honestly whether we can take the job."
      : "";
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">More</h1>

      <SectionTitle>Pricing guidance</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <p>
          We price by the project, never by the hour, and only in a written estimate after a site visit — so there are no
          surprises and no invented numbers. What moves a price:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>The size of the work and how many rooms or elevations are involved</li>
          <li>Material selections — for example, cedar vs. fiber-cement siding</li>
          <li>What we find underneath: rot, water damage, or a failed substrate</li>
          <li>Prep and repair needed before the finish work can start</li>
          <li>Access: stories, slope, stairs, and haul-away</li>
        </ul>
        <p className="mt-2 text-sm text-charcoal/70">
          Each service page lists the cost drivers for that trade. Your final price is the one in your signed estimate — it does not change unless you approve a written change order.
        </p>
        <button type="button" className={`${btnPrimary} mt-3`} onClick={onEstimate}>
          Get my written estimate
        </button>
      </div>

      <SectionTitle>Service area</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <p>{SERVICE_AREA.summary} {SERVICE_AREA.note}</p>
        <p className="mt-2 font-medium">Home turf: {SERVICE_AREA.highlighted.join(" · ")}</p>
        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="sr-only" htmlFor="zip-check">Check your ZIP code</label>
          <input id="zip-check" className={inputCls} value={zipCheck} onChange={(e) => setZipCheck(e.target.value)} placeholder="Enter your ZIP — e.g. 98107" inputMode="numeric" />
        </form>
        {zipResult && <p className="mt-2 font-medium text-navy" role="status">{zipResult}</p>}
      </div>

      <SectionTitle>About Seattle MasterFix</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 space-y-2">
        <img src={logoFullImg} alt="Seattle MasterFix — Precision Craftsmanship" className="w-full h-auto rounded-lg object-contain bg-navy p-3" />
        <div className="flex items-center gap-3 pb-1">
          <img src={logoOnNavyImg} alt="Seattle MasterFix logo" className="h-14 w-14 shrink-0 rounded-lg object-contain bg-navy p-2" />
          <div>
            <p className="font-bold text-navy leading-tight">SEATTLE <span className="text-bronze-dark">MASTERFIX</span></p>
            <p className="text-[11px] tracking-[0.2em] text-charcoal/60">PRECISION CRAFTSMANSHIP</p>
          </div>
        </div>
        <p>
          Seattle MasterFix Precision Craftsmanship is a licensed home remodeling company serving Seattle and King County —
          siding, fencing, tile, laminate flooring, drywall, interior and exterior paint, and remodel build-outs.
        </p>
        <p>
          Every job runs on a formal written agreement: full scope, materials, exclusions, deposit, and payment schedule in
          plain English before work starts, and a 1-year labor warranty when it is done.
        </p>
        <dl className="text-sm space-y-1 pt-1">
          <div className="flex gap-2"><dt className="font-semibold w-32 shrink-0">WA Contractor Reg.</dt><dd>{COMPANY.waReg}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold w-32 shrink-0">UBI</dt><dd>{COMPANY.ubi}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold w-32 shrink-0">Warranty</dt><dd>1-year labor warranty</dd></div>
          <div className="flex gap-2"><dt className="font-semibold w-32 shrink-0">Estimates</dt><dd>Free, written, and signable</dd></div>
        </dl>
      </div>

      <SectionTitle>Frequently asked questions</SectionTitle>
      <div className="space-y-2">
        {FAQS.map((f, i) => (
          <div key={f.q} className="rounded-lg border border-[var(--border)] bg-white">
            <button
              type="button"
              className="w-full text-left p-4 font-semibold text-navy min-h-12 flex justify-between gap-3"
              aria-expanded={openFaq === i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {f.q}
              <span aria-hidden="true">{openFaq === i ? "−" : "+"}</span>
            </button>
            <div className={`faq-panel ${openFaq === i ? "faq-panel-open" : ""}`} aria-hidden={openFaq !== i}>
              <div><p className="px-4 pb-4 text-charcoal/85">{f.a}</p></div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Contact</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 space-y-2">
        <p className="flex items-center gap-2"><Icon d={I.pin} size={20} /> {COMPANY.address}</p>
        <p>
          <a href={COMPANY.phoneHref} className="flex items-center gap-2 font-semibold text-navy min-h-11">
            <Icon d={I.phone} size={20} /> {COMPANY.phoneDisplay}
          </a>
        </p>
        <p>
          <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 font-semibold text-navy min-h-11">
            <Icon d={I.mail} size={20} /> {COMPANY.email}
          </a>
        </p>
        <ul className="text-sm space-y-1 pt-1">
          {COMPANY.hours.map((h) => (
            <li key={h.days} className="flex justify-between gap-4 max-w-xs"><span>{h.days}</span><span className="font-medium">{h.time}</span></li>
          ))}
        </ul>
        <a href={COMPANY.directionsUrl} target="_blank" rel="noreferrer" className={`${btnGhost} mt-1`}>
          Get directions
        </a>
      </div>

      <SectionTitle>Office</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <p className="mb-3">Lead inbox, job setup, and crew updates live in the office tools.</p>
        <button type="button" className={btnNavy} onClick={onOffice}>
          Open office tools
        </button>
      </div>

      <SectionTitle>Privacy &amp; terms</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm space-y-2 text-charcoal/85">
        <p>
          Your estimate requests, job photos, documents, and messages are used only to run your project. Job documents and
          photos are private to your job and are never posted publicly without your permission.
        </p>
        <p>
          The full Privacy Policy and Terms are on our website at seattlemasterfix.com. The Washington L&amp;I registration
          notice and lien notice appear in full in your signed agreement — this app never shortens legal notices.
        </p>
        <p>
          To request deletion of your account data, email {COMPANY.email} or call {COMPANY.phoneDisplay}.
        </p>
      </div>

      <SectionTitle>Add this app to your home screen</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm space-y-2 text-charcoal/85">
        <p><strong className="text-navy">iPhone:</strong> open this page in Safari, tap Share, then “Add to Home Screen.”</p>
        <p><strong className="text-navy">Android:</strong> open in Chrome, tap the ⋮ menu, then “Add to Home screen” or “Install app.”</p>
      </div>
    </div>
  );
}

// ---------- Office ----------
function ResendButton({ requestId }: { requestId: number }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  return (
    <button
      type="button"
      className={btnGhost}
      disabled={state === "sending"}
      onClick={async () => {
        setState("sending");
        const res = await api.resendEstimateRequest({ id: requestId });
        setState(res.ok ? "sent" : "failed");
      }}
    >
      {state === "idle" && "Email to office"}
      {state === "sending" && "Emailing…"}
      {state === "sent" && "Emailed ✓"}
      {state === "failed" && "Email failed — try again"}
    </button>
  );
}

function Office({ onOpenJob, onNewJob, onBack }: { onOpenJob: (id: number) => void; onNewJob: (requestId?: number) => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: () => api.listEstimateRequests({ limit: 50 }) });
  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: () => api.listJobs({}) });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["requests"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };
type RequestStatus = "received" | "visit_scheduled" | "estimate_sent" | "approved" | "not_approved";
  const setStatus = useMutation({
    mutationFn: async (a: { id: number; status: RequestStatus }) => await api.updateRequestStatus(a),
    onSuccess: invalidate,
  });
  const convert = useMutation({
    mutationFn: async (id: number) => await api.convertRequestToJob({ request_id: id }),
    onSuccess: (_res, id) => {
      invalidate();
      const r = reqQ.data?.requests.find((x) => x.id === id);
      void r;
    },
  });

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Back to More">
        <Icon d={I.back} size={18} /> More
      </button>
      <h1 className="text-2xl font-bold text-navy">Office tools</h1>
      <p className="text-charcoal/75 mt-1">New leads land here. Move each request through the pipeline, then create the tracked job from it.</p>

      <SectionTitle>Lead inbox</SectionTitle>
      {reqQ.isPending ? (
        <p className="text-charcoal/70">Loading requests…</p>
      ) : reqQ.error ? (
        <ErrorNote message={reqQ.error instanceof Error ? reqQ.error.message : "Please try again."} />
      ) : (reqQ.data?.requests.length ?? 0) === 0 ? (
        <EmptyState title="No estimate requests yet" body="Requests submitted from the app will appear here as leads, newest first." />
      ) : (
        <ul className="space-y-3">
          {reqQ.data!.requests.map((r) => (
            <li key={r.id} className="rounded-lg border border-[var(--border)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">{r.name}</p>
                  <p className="text-sm text-charcoal/70">
                    SMF-REQ-{r.id} · {fmtDate(r.created_at)} · via {r.preferred_contact}
                  </p>
                </div>
                <Badge tone={r.status === "approved" || r.status === "converted" ? "green" : r.status === "not_approved" ? "gray" : "bronze"}>
                  {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
              <p className="text-sm mt-1.5">
                <strong>Services:</strong> {r.services.map((s) => SERVICES.find((x) => x.slug === s)?.name ?? s).join(", ")}
                {r.property_type ? ` · ${r.property_type}` : ""}
              </p>
              {r.address && <p className="text-sm"><strong>Address:</strong> {r.address}{r.zip ? `, ${r.zip}` : ""}</p>}
              {r.description && <p className="text-sm"><strong>The work:</strong> {r.description}</p>}
              {r.areas && <p className="text-sm"><strong>Areas:</strong> {r.areas}{r.approx_size ? ` · ${r.approx_size}` : ""}</p>}
              {r.timing && <p className="text-sm"><strong>Timing:</strong> {r.timing}</p>}
              {r.visit_times && <p className="text-sm"><strong>Visit times:</strong> {r.visit_times}</p>}
              <p className="text-sm">
                <strong>Contact:</strong>{" "}
                <a className="text-navy underline" href={`tel:${r.phone}`}>{r.phone}</a> ·{" "}
                <a className="text-navy underline" href={`mailto:${r.email}`}>{r.email}</a>
                {r.photo_count > 0 ? ` · ${r.photo_count} photo(s) described` : ""}
              </p>
              {r.status !== "converted" && (
                <div className="flex flex-wrap gap-2 mt-3 items-center">
                  <label className="text-sm font-medium" htmlFor={`req-status-${r.id}`}>Pipeline</label>
                  <select
                    id={`req-status-${r.id}`}
                    className="rounded border border-[var(--border)] px-2 py-2 min-h-10"
                    value={r.status}
                    onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value as RequestStatus })}
                  >
                    <option value="received">Request Received</option>
                    <option value="visit_scheduled">Site Visit Scheduled</option>
                    <option value="estimate_sent">Estimate Sent</option>
                    <option value="approved">Approved</option>
                    <option value="not_approved">Not Approved</option>
                  </select>
                  <button type="button" className={btnNavy} disabled={convert.isPending} onClick={() => convert.mutate(r.id)}>
                    Create tracked job
                  </button>
                  <ResendButton requestId={r.id} />
                </div>
              )}
              {r.status === "converted" && r.job_id !== null && (
                <button type="button" className={`${btnGhost} mt-3`} onClick={() => onOpenJob(r.job_id!)}>
                  Open the job
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Jobs</SectionTitle>
      <button type="button" className={`${btnNavy} mb-3`} onClick={() => onNewJob()}>
        <Icon d={I.plus} size={18} /> New job
      </button>
      {(jobsQ.data?.jobs.length ?? 0) === 0 ? (
        <p className="text-charcoal/70">No jobs yet. Create one from a lead above, or use New job.</p>
      ) : (
        <div className="space-y-3">
          {jobsQ.data!.jobs.map((j) => (
            <JobCard key={j.id} job={j} onOpen={() => onOpenJob(j.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- New job form ----------
function NewJobForm({ requestId, onDone, onBack }: { requestId?: number; onDone: (id: number) => void; onBack: () => void }) {
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: () => api.listEstimateRequests({ limit: 50 }) });
  const fromReq = requestId ? reqQ.data?.requests.find((r) => r.id === requestId) : undefined;
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [service, setService] = useState("");
  const [estimateNo, setEstimateNo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [arrival, setArrival] = useState("");
  const [prep, setPrep] = useState("");
  const [total, setTotal] = useState("");
  const [deposit, setDeposit] = useState("");
  const [balance, setBalance] = useState("");
  const [balanceDate, setBalanceDate] = useState("");

  useEffect(() => {
    if (fromReq) {
      setClientName(fromReq.name);
      setClientEmail(fromReq.email);
      setClientPhone(fromReq.phone);
      setAddress(fromReq.address);
      const names = fromReq.services.map((s) => SERVICES.find((x) => x.slug === s)?.name ?? s).join(", ");
      setService(names);
      setTitle(`${names || "Project"} — ${fromReq.name}`);
    }
  }, [fromReq]);

  const toCents = (v: string) => (v.trim() === "" ? null : Math.round(parseFloat(v) * 100));
  const create = useMutation({
    mutationFn: async () =>
      await api.createJob({
        title,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        address,
        service,
        estimate_no: estimateNo,
        start_date: startDate,
        end_date: endDate,
        arrival_window: arrival,
        prep_notes: prep,
        contract_total_cents: toCents(total),
        deposit_due_cents: toCents(deposit),
        balance_due_cents: toCents(balance),
        balance_due_date: balanceDate,
      }),
    onSuccess: (res) => onDone(res.job_id),
  });

  return (
    <div className="max-w-xl mx-auto">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11" aria-label="Back to office tools">
        <Icon d={I.back} size={18} /> Office tools
      </button>
      <h1 className="text-2xl font-bold text-navy">New job</h1>
      <p className="text-charcoal/75 mt-1">Enter the details exactly as they appear in the signed estimate. Amounts can also be added later from the job page.</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Job title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Drywall repair + interior paint — Nguyen" required /></Field>
        <Field label="Client name"><input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} required /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Client phone"><input className={inputCls} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} type="tel" /></Field>
          <Field label="Client email"><input className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" /></Field>
        </div>
        <Field label="Project address"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Service(s)"><input className={inputCls} value={service} onChange={(e) => setService(e.target.value)} /></Field>
          <Field label="Estimate number"><input className={inputCls} value={estimateNo} onChange={(e) => setEstimateNo(e.target.value)} placeholder="SMF-2026-…" /></Field>
          <Field label="Start date"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Expected end date"><input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label="Crew arrival window"><input className={inputCls} value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="8:00–9:00 AM" /></Field>
          <Field label="Contract total ($)"><input className={inputCls} value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" placeholder="From the signed estimate" /></Field>
          <Field label="Deposit due ($)"><input className={inputCls} value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Balance due ($)"><input className={inputCls} value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Balance due date"><input type="date" className={inputCls} value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} /></Field>
        </div>
        <Field label="What the client should prepare">
          <textarea className={`${inputCls} min-h-16`} value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="Clear the room, pets in another area, gate access…" />
        </Field>
        {create.error && <ErrorNote message={create.error instanceof Error ? create.error.message : "Please try again."} />}
        <button type="submit" className={`${btnPrimary} w-full`} disabled={create.isPending || !title.trim() || !clientName.trim()}>
          {create.isPending ? "Creating…" : "Create job"}
        </button>
      </form>
    </div>
  );
}
