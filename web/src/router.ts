// Tiny hash router so the browser Back button and refresh work on GitHub Pages.
import { useEffect, useState } from "react";

export type Route =
  | { name: "home" } | { name: "services" } | { name: "service"; slug: string } | { name: "projects" }
  | { name: "myjob" } | { name: "more" } | { name: "estimate" } | { name: "job"; id: number }
  | { name: "office" } | { name: "request"; id: string } | { name: "newjob"; requestId?: string };

export function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  // Supabase sign-in links land with #access_token=…; treat as My Job.
  if (h.includes("access_token=") || h.includes("error_description=")) return { name: "myjob" };
  const [a, b] = h.split("/");
  switch (a) {
    case "services": return b ? { name: "service", slug: b } : { name: "services" };
    case "projects": return { name: "projects" };
    case "myjob": return { name: "myjob" };
    case "more": return { name: "more" };
    case "estimate": return { name: "estimate" };
    case "job": return Number(b) > 0 ? { name: "job", id: Number(b) } : { name: "myjob" };
    case "office": return b === "new" ? { name: "newjob" } : { name: "office" };
    case "request": return b ? { name: "request", id: b } : { name: "office" };
    case "newjob": return { name: "newjob", requestId: b || undefined };
    default: return { name: "home" };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case "home": return "#/";
    case "service": return `#/services/${r.slug}`;
    case "job": return `#/job/${r.id}`;
    case "request": return `#/request/${r.id}`;
    case "newjob": return r.requestId ? `#/newjob/${r.requestId}` : "#/newjob";
    default: return `#/${r.name}`;
  }
}

export function go(r: Route) {
  window.location.hash = href(r);
  window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
