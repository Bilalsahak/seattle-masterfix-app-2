import { useAuth } from "./auth";
import { COMPANY } from "./content";
import { HomeTab, MoreTab, ProjectsTab, ServiceDetail, ServicesTab, EstimateWizard } from "./public";
import { JobDetailView, MyJobTab, NewJobForm, OfficeHome, RequestDetail } from "./portal";
import { go, useRoute, type Route } from "./router";
import { I, Icon } from "./ui";
import logoImg from "./assets/logo-mark.png";

type Tab = "home" | "services" | "projects" | "myjob" | "more";
const tabOf = (r: Route): Tab | null =>
  r.name === "home" ? "home" : r.name === "services" || r.name === "service" ? "services" : r.name === "projects" ? "projects"
  : r.name === "myjob" || r.name === "job" ? "myjob" : r.name === "more" ? "more" : null;

export function App() {
  const route = useRoute();
  const { session, isOffice, signOut } = useAuth();
  const active = tabOf(route);
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: I.home },
    { id: "services", label: "Services", icon: I.grid },
    { id: "projects", label: "Projects", icon: I.camera },
    { id: "myjob", label: isOffice ? "Jobs" : "My Job", icon: I.briefcase },
    { id: "more", label: "More", icon: I.dots },
  ];
  const routeKey = JSON.stringify(route);

  return (
    <div className="min-h-dvh bg-cream pb-24">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to main content</a>
      <header className="bg-navy text-white sticky top-0 z-30 shadow pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <a href="#/" className="text-left min-h-11 flex items-center gap-2.5 shrink-0" aria-label="Seattle MasterFix — go to Home">
            <img src={logoImg} alt="" className="h-10 w-10 shrink-0 object-contain" />
            <span>
              <span className="block font-bold tracking-wide leading-tight">SEATTLE <span className="text-bronze">MASTERFIX</span></span>
              <span className="block text-[11px] tracking-[0.2em] text-bronze-light">PRECISION CRAFTSMANSHIP</span>
            </span>
          </a>
          <span className="h-px flex-1 bg-bronze/40 self-end mb-1 hidden sm:block" aria-hidden="true" />
          <div className="ml-auto flex items-center gap-1">
            {isOffice && (
              <a href="#/office" className="px-3 min-h-11 inline-flex items-center text-sm font-semibold text-bronze-light">Office</a>
            )}
            <a href={COMPANY.phoneHref} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center" aria-label={`Call Seattle MasterFix at ${COMPANY.phoneDisplay}`}>
              <Icon d={I.phone} />
            </a>
          </div>
        </div>
        <div className="h-0.5 bg-bronze" aria-hidden="true" />
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 outline-none">
        <div key={routeKey} className="anim-fade-slide">
          {route.name === "home" && <HomeTab onEstimate={() => go({ name: "estimate" })} onTrack={() => go({ name: "myjob" })} onService={(slug) => go({ name: "service", slug })} onProjects={() => go({ name: "projects" })} />}
          {route.name === "services" && <ServicesTab onService={(slug) => go({ name: "service", slug })} />}
          {route.name === "service" && <ServiceDetail slug={route.slug} onBack={() => go({ name: "services" })} onEstimate={() => go({ name: "estimate" })} />}
          {route.name === "projects" && <ProjectsTab />}
          {route.name === "estimate" && <EstimateWizard onDone={() => go({ name: "myjob" })} onCancel={() => history.length > 1 ? history.back() : go({ name: "home" })} />}
          {route.name === "myjob" && <MyJobTab />}
          {route.name === "job" && <JobDetailView jobId={route.id} />}
          {route.name === "office" && <OfficeHome />}
          {route.name === "request" && <RequestDetail id={route.id} />}
          {route.name === "newjob" && <NewJobForm requestId={route.requestId} />}
          {route.name === "more" && <MoreTab isOffice={isOffice} signedIn={!!session} onOffice={() => go({ name: "office" })} onEstimate={() => go({ name: "estimate" })} onSignOut={async () => { await signOut(); go({ name: "home" }); }} />}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 mt-10 pb-4 text-sm text-charcoal/80">
        <div className="border-t border-bronze/40 pt-4 space-y-1">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain bg-navy p-2" />
            <p className="font-semibold text-navy">{COMPANY.name} — {COMPANY.tagline}</p>
          </div>
          <p>{COMPANY.address} · {COMPANY.phoneDisplay}</p>
          <p>WA Contractor Reg. {COMPANY.waReg} · UBI {COMPANY.ubi} · 1-year labor warranty</p>
          <p>
            <a className="underline" href="https://seattlemasterfix.com/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a> ·{" "}
            <a className="underline" href="https://seattlemasterfix.com/terms/" target="_blank" rel="noreferrer">Terms</a>
          </p>
        </div>
      </footer>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-navy text-white pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        <div className="mx-auto max-w-5xl grid grid-cols-5">
          {tabs.map((t) => {
            const on = active === t.id;
            return (
              <a key={t.id} href={t.id === "home" ? "#/" : `#/${t.id}`} aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 min-h-14 text-xs font-medium ${on ? "text-bronze" : "text-white/85"}`}>
                <span className={`pt-1 ${on ? "border-t-2 border-bronze -mt-0.5" : ""}`}><Icon d={t.icon} size={22} /></span>
                {t.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
