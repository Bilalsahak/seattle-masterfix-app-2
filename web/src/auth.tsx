import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { api, type Profile } from "./api";

interface AuthState { ready: boolean; session: Session | null; profile: Profile | null; isOffice: boolean; signOut: () => Promise<void> }
const Ctx = createContext<AuthState>({ ready: false, session: null, profile: null, isOffice: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (s: Session | null) => {
      setSession(s);
      setProfile(s ? await api.myProfile().catch(() => null) : null);
      if (alive) setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/")) window.location.hash = "#/myjob";
      // Defer: Supabase recommends not awaiting other calls inside this callback.
      setTimeout(() => {
        void load(s);
        qc.invalidateQueries();
      }, 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const signOut = async () => {
    await api.signOut();
    qc.clear();
    try {
      // Clear anything this app kept on the device (old test data, caches).
      localStorage.removeItem("smf-app-v1");
      if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
    } catch {
      /* ignore */
    }
    setProfile(null);
    setSession(null);
  };

  return <Ctx.Provider value={{ ready, session, profile, isOffice: profile?.role === "office", signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
