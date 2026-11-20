// Supabase client. Only the PUBLIC publishable key belongs here — every
// table is protected by Row Level Security in the database, so this key
// alone cannot read anyone's data. Never put the service-role key in the app.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://nswoksixspogizntqyqv.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_T3YVpIBQA3vBuJI1xatsnw_VOGnuxnw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

/** Where magic links send people back to (this app's own address). */
export const APP_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;
