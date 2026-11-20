import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "./api";
import { COMPANY, FAQS, PROCESS, PROJECTS, PROJECT_FILTERS, SERVICES, SERVICE_AREA, type ProjectPhoto } from "./content";
import heroImg from "./assets/hero.webp";
import logoOnNavyImg from "./assets/logo-mark.png";
import logoFullImg from "./assets/logo.png";
import { Badge, EmptyState, ErrorNote, Field, I, Icon, Reveal, SectionTitle, btnGhost, btnNavy, btnOutline, btnPrimary, inputCls, useReducedMotion, useSwipe } from "./ui";
import { InstallCard } from "./install";

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
export function HomeTab({
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
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.shield} size={20} /></span> Licensed · WA Reg. {COMPANY.waReg}</li>
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.check} size={20} /></span> Free written estimates</li>
          <li className="flex items-center gap-2"><span className="text-bronze"><Icon d={I.check} size={20} /></span> 1-year labor warranty</li>
        </ul>
      </section>
      </Reveal>
      <Reveal>

      <SectionTitle>Our services</SectionTitle>
      <p className="text-sm text-charcoal/75 -mt-2 mb-2 sm:hidden">Swipe to see all seven trades →</p>
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
      <p className="text-xs text-charcoal/75 mt-2">
        Photos show our crew's work, including completed jobs from other states — we label Seattle jobs as Seattle jobs, and only those.
      </p>

      <SectionTitle>Reviews</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <a className="font-semibold text-navy underline underline-offset-2 min-h-11 inline-flex items-center" href={COMPANY.googleReviewUrl} target="_blank" rel="noreferrer">
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
          <p className="text-sm text-charcoal/75 mt-2">{COMPANY.replyNote}</p>
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
export function ServicesTab({ onService }: { onService: (slug: string) => void }) {
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

export function ServiceDetail({ slug, onBack, onEstimate }: { slug: string; onBack: () => void; onEstimate: () => void }) {
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
      <p className="text-sm text-charcoal/75 mt-2">
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
export function ProjectsTab() {
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
                <span className="block text-xs text-charcoal/75">{p.service} · {p.scope}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="text-sm text-charcoal/75 mt-1">{shown.length} photo{shown.length === 1 ? "" : "s"}{filter !== "All" ? ` · ${filter}` : ""} — swipe to browse</p>
      <p className="text-xs text-charcoal/75 mt-4">
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

export function EstimateWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
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
  const [submitted, setSubmitted] = useState<{ reference: string; uploaded: number; emailed: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const outOfArea = zip.trim().length >= 3 && !KING_COUNTY_ZIPS_3.includes(zip.trim().slice(0, 3));

  const [website, setWebsite] = useState(""); // honeypot: real people never see or fill this
  const submit = useMutation({
    mutationFn: async () => {
      if (website.trim()) return { reference: "SMF-REQ-RECEIVED", uploaded: 0, emailed: true }; // silently drop bots
      return await api.submitEstimateRequest(
        {
          name: name.trim(), phone: phone.trim(), email: email.trim(), preferred_contact: contactMethod, services,
          property_type: propertyType, address: address.trim(), zip: zip.trim(), description: description.trim(),
          areas: areas.trim(), approx_size: approxSize.trim(), timing, heard_about: heardAbout, visit_times: visitTimes.trim(),
        },
        photos.map((p) => p.file),
      );
    },
    onSuccess: (res) => setSubmitted({ reference: res.reference, uploaded: res.uploaded, emailed: res.emailed }),
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
            <li><strong>1.</strong> We review your request and any photos you added.</li>
            <li><strong>2.</strong> We contact you to schedule a free site visit — {COMPANY.replyNote}</li>
            <li><strong>3.</strong> You receive a written, signable estimate. No price is ever quoted before that estimate.</li>
          </ol>
          {photos.length > 0 && submitted.uploaded < photos.length && (
            <p className="text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg p-3 mt-4" role="alert">
              {submitted.uploaded} of {photos.length} photos uploaded. Please email the rest to {COMPANY.email} with reference {submitted.reference}.
            </p>
          )}
          <p className="text-sm text-charcoal/75 mt-4">
            Sign in on the My Job tab with the same email to follow this request and, once it becomes a job, its progress.
          </p>
          <button type="button" className={`${btnNavy} mt-5 w-full`} onClick={onDone}>
            Go to My Job
          </button>
        </div>
      </div>
    );
  }

  const stepValid =
    step === 1 ? services.length > 0 && zip.trim().length >= 5 : step === 2 ? description.trim().length >= 10 : step === 4 ? name.trim().length > 1 && phone.trim().length >= 7 && /.+@.+\..+/.test(email) && consent : true;

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
            <li key={label} className={`flex-1 text-[11px] leading-tight ${i + 1 === step ? "font-bold text-navy" : i + 1 < step ? "text-navy/80" : "text-charcoal/75"}`}>
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
          <Field label="ZIP code (required)">
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
          <Field label="Describe the work in plain English (required)">
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
                    onClick={() => { URL.revokeObjectURL(p.url); setPhotos(photos.filter((_, j) => j !== i)); }}
                  >
                    <Icon d={I.x} size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-charcoal/75 mt-3">{photos.length} of 5 photos attached. You can also skip this step and show us in person.</p>
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

          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
          </div>
          <label className="flex gap-3 items-start mt-4 min-h-11">
            <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-sm">I agree to be contacted by Seattle MasterFix about this request by phone, text, and email, and I have read the <a className="underline font-semibold" href="https://seattlemasterfix.com/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
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

// ---------- More ----------
export function MoreTab({ isOffice, signedIn, onOffice, onEstimate, onSignOut }: { isOffice: boolean; signedIn: boolean; onOffice: () => void; onEstimate: () => void; onSignOut: () => void }) {
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
        <p className="mt-2 text-sm text-charcoal/75">
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
            <p className="font-bold text-navy leading-tight">SEATTLE <span className="text-[#8a5a17]">MASTERFIX</span></p>
            <p className="text-[11px] tracking-[0.2em] text-charcoal/75">PRECISION CRAFTSMANSHIP</p>
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
              <div className="px-4 pb-4 text-charcoal/85">
                <p>{f.a}</p>
                {f.link && (
                  <p className="mt-2">
                    <a className="font-semibold text-navy underline underline-offset-2" href={f.link.href} target="_blank" rel="noreferrer">
                      {f.link.label}
                    </a>
                  </p>
                )}
              </div>
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

      {isOffice && (
        <>
          <SectionTitle>Office</SectionTitle>
          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <p className="mb-3">Estimate requests, jobs, crew updates, and client messages.</p>
            <button type="button" className={btnNavy} onClick={onOffice}>Open office tools</button>
          </div>
        </>
      )}

      <SectionTitle>Privacy &amp; terms</SectionTitle>
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm space-y-2 text-charcoal/85">
        <p>
          Your estimate requests, job photos, documents, and messages are used only to run your project. Only you and our office can see
          your job. Files are stored privately and are never posted publicly without your permission.
        </p>
        <p>
          Read our <a className="underline font-semibold text-navy" href="https://seattlemasterfix.com/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a> and{" "}
          <a className="underline font-semibold text-navy" href="https://seattlemasterfix.com/terms/" target="_blank" rel="noreferrer">Terms</a>.
          The Washington L&amp;I registration notice and lien notice appear in full in your signed agreement.
        </p>
        <p>To request deletion of your account data, email {COMPANY.email} or call {COMPANY.phoneDisplay}.</p>
        {signedIn && (
          <button type="button" className={btnGhost} onClick={onSignOut}>Sign out and clear this device</button>
        )}
      </div>

      <SectionTitle>Add this app to your home screen</SectionTitle>
      <InstallCard />
    </div>
  );
}
