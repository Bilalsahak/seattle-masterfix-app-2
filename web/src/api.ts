// Data layer for the Seattle MasterFix app, backed by Supabase.
// What each person can see or change is enforced by Row Level Security in
// the database (see supabase/README.md), not by this file: clients only get
// their own jobs; only the office role can create or change jobs.
import { supabase, APP_URL } from "./supabase";

export type RequestStatus = "received" | "visit_scheduled" | "estimate_sent" | "approved" | "not_approved" | "converted";
export type JobStatus = "scheduled" | "in_progress" | "completed" | "on_hold";

export interface Profile { id: string; email: string; full_name: string; phone: string; role: "client" | "office" }

export interface EstimateRequest {
  id: string; user_id: string | null; name: string; phone: string; email: string; preferred_contact: string;
  services: string[]; property_type: string; address: string; zip: string; description: string; areas: string;
  approx_size: string; timing: string; heard_about: string; visit_times: string; photo_count: number;
  status: RequestStatus; job_id: number | null; created_at: string;
}

export interface Job {
  id: number; client_id: string | null; client_email: string; client_name: string; client_phone: string;
  title: string; address: string; service: string; estimate_no: string; status: JobStatus;
  start_date: string | null; end_date: string | null; arrival_window: string; prep_notes: string;
  contract_total_cents: number | null; warranty_start: string | null; care_notes: string;
  created_at: string; updated_at: string;
  milestones?: { id: number; done_at: string | null }[];
}

export interface Milestone { id: number; job_id: number; title: string; sort_order: number; done_at: string | null }
export interface JobUpdate { id: number; job_id: number; body: string; photo_label: string; photo_path: string | null; created_at: string; url?: string | null }
export interface ChangeOrder { id: number; job_id: number; description: string; amount_cents: number; status: string; created_at: string }
export interface Payment { id: number; job_id: number; label: string; amount_cents: number; due_date: string | null; paid_at: string | null }
export interface Message { id: number; job_id: number; sender_id: string; sender_role: "client" | "office"; body: string; created_at: string }
export interface DocumentRow { id: number; job_id: number; name: string; kind: string; storage_path: string; content_type: string; created_at: string; url?: string | null }

export interface JobDetail {
  job: Job; milestones: Milestone[]; updates: JobUpdate[]; change_orders: ChangeOrder[];
  payments: Payment[]; messages: Message[]; documents: DocumentRow[];
}

export const reference = (id: string) => `SMF-REQ-${id.slice(0, 8).toUpperCase()}`;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "file";

async function signedUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

// Formspree: same public endpoint as the website, so Bill also gets every
// estimate request by email. Text only (the Formspree plan rejects files);
// the photos are stored privately in the app for the office to open.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xnjeedlb";
const SERVICE_NAMES: Record<string, string> = {
  siding: "Siding", fencing: "Fencing", tile: "Tile", flooring: "Laminate Flooring",
  drywall: "Drywall", paint: "Interior / Exterior Paint", remodel: "Remodel Build-Outs",
};

async function emailOffice(r: Omit<EstimateRequest, "user_id" | "status" | "job_id" | "created_at">, uploaded: number): Promise<boolean> {
  try {
    const services = r.services.map((s) => SERVICE_NAMES[s] ?? s).join(", ");
    const fields: Record<string, string> = {
      _subject: `App estimate request ${reference(r.id)} — ${services}`,
      _replyto: r.email, reference: reference(r.id), source: "Seattle MasterFix App",
      name: r.name, email: r.email, phone: r.phone, preferred_contact: r.preferred_contact,
      projectTypes: services, propertyType: r.property_type, address: r.address, zip: r.zip,
      details: r.description, areas: r.areas, approxSize: r.approx_size, timeline: r.timing,
      heardAbout: r.heard_about, visitTimes: r.visit_times,
      photos: uploaded > 0 ? `${uploaded} photo(s) uploaded — open the app's Office → Requests to view them.` : "No photos",
    };
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    const res = await fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body });
    return res.ok;
  } catch {
    return false;
  }
}

export const api = {
  // ---------- Auth ----------
  async sendLoginLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: APP_URL, shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  },
  async verifyCode(email: string, token: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.replace(/\D/g, "").slice(0, 6), type: "email" });
    if (error) throw new Error(error.message);
  },
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
  async myProfile(): Promise<Profile | null> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    return check(await supabase.from("profiles").select("id,email,full_name,phone,role").eq("id", u.user.id).maybeSingle());
  },

  // ---------- Estimate requests ----------
  async submitEstimateRequest(
    args: Omit<EstimateRequest, "id" | "user_id" | "status" | "job_id" | "created_at" | "photo_count">,
    photos: File[],
  ): Promise<{ reference: string; uploaded: number; emailed: boolean }> {
    const id = crypto.randomUUID();
    const row = { ...args, id, email: args.email.trim().toLowerCase(), photo_count: Math.min(photos.length, 5) };
    const { error } = await supabase.from("estimate_requests").insert(row);
    if (error) throw new Error(error.message);
    let uploaded = 0;
    for (const [i, f] of photos.slice(0, 5).entries()) {
      const { error: upErr } = await supabase.storage
        .from("estimate-photos")
        .upload(`${id}/${i + 1}-${safeName(f.name)}`, f, { contentType: f.type || "image/jpeg", upsert: false });
      if (!upErr) uploaded++;
    }
    const emailed = await emailOffice(row, uploaded);
    return { reference: reference(id), uploaded, emailed };
  },
  async listMyRequests(): Promise<EstimateRequest[]> {
    return check(await supabase.from("estimate_requests").select("*").neq("status", "converted").order("created_at", { ascending: false }).limit(20));
  },
  async listAllRequests(): Promise<EstimateRequest[]> {
    return check(await supabase.from("estimate_requests").select("*").order("created_at", { ascending: false }).limit(100));
  },
  async requestPhotos(id: string): Promise<{ name: string; url: string }[]> {
    const { data } = await supabase.storage.from("estimate-photos").list(id, { limit: 10 });
    const paths = (data ?? []).map((o) => `${id}/${o.name}`);
    const urls = await signedUrls("estimate-photos", paths);
    return paths.filter((p) => urls[p]).map((p) => ({ name: p.split("/").pop() ?? p, url: urls[p] }));
  },
  async updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
    check(await supabase.from("estimate_requests").update({ status }).eq("id", id));
  },

  // ---------- Jobs ----------
  async listJobs(): Promise<Job[]> {
    return check(await supabase.from("jobs").select("*, milestones(id,done_at)").order("updated_at", { ascending: false }));
  },
  async getJob(jobId: number): Promise<JobDetail | null> {
    const job = check(await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle()) as Job | null;
    if (!job) return null;
    const [ms, ups, cos, pays, msgs, docs] = await Promise.all([
      supabase.from("milestones").select("*").eq("job_id", jobId).order("sort_order").order("id"),
      supabase.from("job_updates").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
      supabase.from("change_orders").select("*").eq("job_id", jobId).order("created_at"),
      supabase.from("payments").select("*").eq("job_id", jobId).order("id"),
      supabase.from("messages").select("*").eq("job_id", jobId).order("created_at"),
      supabase.from("documents").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
    ]);
    const updates = check(ups) as JobUpdate[];
    const documents = check(docs) as DocumentRow[];
    const urls = await signedUrls("job-files", [
      ...updates.flatMap((u) => (u.photo_path ? [u.photo_path] : [])),
      ...documents.map((d) => d.storage_path),
    ]);
    return {
      job,
      milestones: check(ms) as Milestone[],
      updates: updates.map((u) => ({ ...u, url: u.photo_path ? urls[u.photo_path] ?? null : null })),
      change_orders: check(cos) as ChangeOrder[],
      payments: check(pays) as Payment[],
      messages: check(msgs) as Message[],
      documents: documents.map((d) => ({ ...d, url: urls[d.storage_path] ?? null })),
    };
  },
  async postMessage(jobId: number, body: string): Promise<void> {
    check(await supabase.from("messages").insert({ job_id: jobId, body }));
  },

  // ---------- Office only (the database refuses these for clients) ----------
  async createJob(args: Partial<Job> & { title: string; client_name: string; client_email: string }, requestId?: string): Promise<number> {
    const row = { ...args, client_email: args.client_email.trim().toLowerCase(), estimate_request_id: requestId ?? null };
    const job = check(await supabase.from("jobs").insert(row).select("id").single()) as { id: number };
    if (requestId) await supabase.from("estimate_requests").update({ status: "converted", job_id: job.id }).eq("id", requestId);
    return job.id;
  },
  async updateJob(jobId: number, patch: Partial<Job>): Promise<void> {
    check(await supabase.from("jobs").update(patch).eq("id", jobId));
  },
  /** Emails the client a 6-digit sign-in code (and a link) so they can open their job. */
  async inviteClient(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: APP_URL, shouldCreateUser: true } });
    if (error) throw new Error(error.message);
  },
  async addMilestone(jobId: number, title: string, sort: number): Promise<void> {
    check(await supabase.from("milestones").insert({ job_id: jobId, title, sort_order: sort }));
  },
  async toggleMilestone(id: number, done: boolean): Promise<void> {
    check(await supabase.from("milestones").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id));
  },
  async addUpdate(jobId: number, body: string, label: string, photo: File | null): Promise<void> {
    let photo_path: string | null = null;
    if (photo) {
      photo_path = `${jobId}/updates/${Date.now()}-${safeName(photo.name)}`;
      const { error } = await supabase.storage.from("job-files").upload(photo_path, photo, { contentType: photo.type });
      if (error) throw new Error(error.message);
    }
    check(await supabase.from("job_updates").insert({ job_id: jobId, body, photo_label: label, photo_path }));
  },
  async addDocument(jobId: number, file: File, name: string, kind: string): Promise<void> {
    const storage_path = `${jobId}/docs/${Date.now()}-${safeName(file.name)}`;
    const { error } = await supabase.storage.from("job-files").upload(storage_path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    check(await supabase.from("documents").insert({ job_id: jobId, name: name || file.name, kind, storage_path, content_type: file.type, size_bytes: file.size }));
  },
  async addChangeOrder(jobId: number, description: string, amount_cents: number): Promise<void> {
    check(await supabase.from("change_orders").insert({ job_id: jobId, description, amount_cents }));
  },
  async setChangeOrderStatus(id: number, status: "pending" | "approved" | "declined"): Promise<void> {
    check(await supabase.from("change_orders").update({ status, decided_at: status === "pending" ? null : new Date().toISOString() }).eq("id", id));
  },
  async addPayment(jobId: number, label: string, amount_cents: number, due_date: string | null): Promise<void> {
    check(await supabase.from("payments").insert({ job_id: jobId, label, amount_cents, due_date }));
  },
  async markPaymentPaid(id: number, paid: boolean): Promise<void> {
    check(await supabase.from("payments").update({ paid_at: paid ? new Date().toISOString() : null }).eq("id", id));
  },
};
