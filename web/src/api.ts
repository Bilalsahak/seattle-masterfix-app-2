// Portable localStorage-backed API for the GitHub Pages test version.
// It mirrors every action the Muse-built app used, with the same request
// and response shapes, so App.tsx is unchanged apart from its imports.
//
// Data lives ONLY in this browser (localStorage key "smf-app-v1"). Nothing
// is sent to a server, nothing is shared between testers, and clearing the
// browser's site data resets the app to empty. Photo/document files are
// stored as data URLs in localStorage when small enough (under ~800 KB);
// larger files are recorded by name only, with no preview URL.

export async function fileToBase64(file: File): Promise<{ dataBase64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
  const dataBase64 = dataUrl.split(",", 2)[1] ?? "";
  return { dataBase64, mimeType: file.type || "application/octet-stream" };
}

const KEY = "smf-app-v1";
const MAX_BLOB_CHARS = 800_000;

type RequestStatus = "received" | "visit_scheduled" | "estimate_sent" | "approved" | "not_approved" | "converted";
type JobStatus = "scheduled" | "in_progress" | "completed" | "on_hold";

export interface EstimateRequest {
  id: number;
  name: string;
  phone: string;
  email: string;
  preferred_contact: string;
  services: string[];
  property_type: string;
  address: string;
  zip: string;
  description: string;
  areas: string;
  approx_size: string;
  timing: string;
  heard_about: string;
  visit_times: string;
  photo_count: number;
  status: RequestStatus;
  job_id: number | null;
  created_at: string;
}

export interface Job {
  id: number;
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  address: string;
  service: string;
  estimate_no: string;
  status: JobStatus;
  start_date: string;
  end_date: string;
  arrival_window: string;
  prep_notes: string;
  contract_total_cents: number | null;
  deposit_due_cents: number | null;
  deposit_paid: boolean;
  balance_due_cents: number | null;
  balance_due_date: string;
  warranty_start: string;
  care_notes: string;
  milestone_total: number;
  milestone_done: number;
  created_at: string;
}

export interface JobDetail {
  job: Job;
  milestones: { id: number; title: string; done_at: string | null }[];
  updates: { id: number; body: string; photo_label: string; photo_url: string | null; created_at: string }[];
  documents: { id: number; name: string; kind: string; url: string | null; created_at: string }[];
  change_orders: { id: number; description: string; amount_cents: number; status: string; created_at: string }[];
  payments: { id: number; label: string; amount_cents: number; due_date: string; paid_at: string | null }[];
  messages: { id: number; sender: string; body: string; created_at: string }[];
}

export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  body: string;
  job_id: number | null;
  read: boolean;
  created_at: string;
}

type StoredJob = Omit<Job, "milestone_total" | "milestone_done"> & { updated_at: string };

interface Store {
  seq: Record<string, number>;
  requests: EstimateRequest[];
  jobs: StoredJob[];
  milestones: { id: number; job_id: number; title: string; sort_order: number; done_at: string | null; created_at: string }[];
  updates: { id: number; job_id: number; body: string; photo_label: string; photo_url: string | null; created_at: string }[];
  documents: { id: number; job_id: number; name: string; kind: string; url: string | null; created_at: string }[];
  change_orders: { id: number; job_id: number; description: string; amount_cents: number; status: string; decided_at: string | null; created_at: string }[];
  payments: { id: number; job_id: number; label: string; amount_cents: number; due_date: string; paid_at: string | null; created_at: string }[];
  messages: { id: number; job_id: number; sender: string; body: string; created_at: string }[];
  notifications: AppNotification[];
}

function emptyStore(): Store {
  return {
    seq: {},
    requests: [],
    jobs: [],
    milestones: [],
    updates: [],
    documents: [],
    change_orders: [],
    payments: [],
    messages: [],
    notifications: [],
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { ...emptyStore(), ...parsed };
  } catch {
    return emptyStore();
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // localStorage full: drop stored photo/document data URLs (largest first),
    // keep every record, then retry once.
    for (const u of store.updates) u.photo_url = null;
    for (const d of store.documents) d.url = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      // Last resort: keep working in memory for this session.
    }
  }
}

function nextId(store: Store, table: string): number {
  store.seq[table] = (store.seq[table] ?? 0) + 1;
  return store.seq[table];
}

const isoNow = () => new Date().toISOString();

function notify(store: Store, kind: string, title: string, body: string, jobId: number | null) {
  store.notifications.unshift({
    id: nextId(store, "notifications"),
    kind,
    title,
    body,
    job_id: jobId,
    read: false,
    created_at: isoNow(),
  });
}

function toJob(store: Store, j: StoredJob): Job {
  const ms = store.milestones.filter((m) => m.job_id === j.id);
  return {
    id: j.id,
    title: j.title,
    client_name: j.client_name,
    client_email: j.client_email,
    client_phone: j.client_phone,
    address: j.address,
    service: j.service,
    estimate_no: j.estimate_no,
    status: j.status,
    start_date: j.start_date,
    end_date: j.end_date,
    arrival_window: j.arrival_window,
    prep_notes: j.prep_notes,
    contract_total_cents: j.contract_total_cents,
    deposit_due_cents: j.deposit_due_cents,
    deposit_paid: j.deposit_paid,
    balance_due_cents: j.balance_due_cents,
    balance_due_date: j.balance_due_date,
    warranty_start: j.warranty_start,
    care_notes: j.care_notes,
    milestone_total: ms.length,
    milestone_done: ms.filter((m) => m.done_at).length,
    created_at: j.created_at,
  };
}

function dataUrl(mime: string, base64: string): string | null {
  if (!base64 || base64.length > MAX_BLOB_CHARS) return null;
  return `data:${mime};base64,${base64}`;
}

export const api = {
  async submitEstimateRequest(args: {
    name: string;
    phone: string;
    email: string;
    preferred_contact: string;
    services: string[];
    property_type: string;
    address: string;
    zip: string;
    description: string;
    areas: string;
    approx_size: string;
    timing: string;
    heard_about: string;
    visit_times: string;
    photo_count: number;
  }): Promise<{ id: number; reference: string }> {
    const store = load();
    const id = nextId(store, "requests");
    const t = isoNow();
    store.requests.unshift({
      id,
      name: args.name,
      phone: args.phone,
      email: args.email,
      preferred_contact: args.preferred_contact,
      services: args.services,
      property_type: args.property_type,
      address: args.address,
      zip: args.zip,
      description: args.description,
      areas: args.areas,
      approx_size: args.approx_size,
      timing: args.timing,
      heard_about: args.heard_about,
      visit_times: args.visit_times,
      photo_count: args.photo_count,
      status: "received",
      job_id: null,
      created_at: t,
    });
    const reference = `SMF-REQ-${id}`;
    notify(store, "request_received", "Estimate request received", `${args.name} — reference ${reference}. We usually reply within 1 hour during business hours.`, null);
    save(store);
    return { id, reference };
  },

  async listEstimateRequests(args: { limit: number }): Promise<{ requests: EstimateRequest[] }> {
    const store = load();
    return { requests: [...store.requests].sort((a, b) => b.id - a.id).slice(0, args.limit) };
  },

  async updateRequestStatus(args: { id: number; status: RequestStatus }): Promise<{ ok: true }> {
    const store = load();
    const r = store.requests.find((x) => x.id === args.id);
    if (r) r.status = args.status;
    save(store);
    return { ok: true as const };
  },

  async convertRequestToJob(args: { request_id: number }): Promise<{ job_id: number }> {
    const store = load();
    const r = store.requests.find((x) => x.id === args.request_id);
    if (!r) throw new Error("Request not found");
    const names: Record<string, string> = {
      siding: "Siding",
      fencing: "Fencing",
      tile: "Tile",
      flooring: "Laminate Flooring",
      drywall: "Drywall",
      paint: "Interior / Exterior Paint",
      remodel: "Remodel Build-Outs",
    };
    const serviceNames = r.services.map((s) => names[s] ?? s).join(", ");
    const t = isoNow();
    const jobId = nextId(store, "jobs");
    store.jobs.unshift({
      id: jobId,
      title: `${serviceNames || "Project"} — ${r.name}`,
      client_name: r.name,
      client_email: r.email,
      client_phone: r.phone,
      address: r.address,
      service: serviceNames,
      estimate_no: "",
      status: "scheduled",
      start_date: "",
      end_date: "",
      arrival_window: "",
      prep_notes: "",
      contract_total_cents: null,
      deposit_due_cents: null,
      deposit_paid: false,
      balance_due_cents: null,
      balance_due_date: "",
      warranty_start: "",
      care_notes: "",
      created_at: t,
      updated_at: t,
    });
    r.status = "converted";
    r.job_id = jobId;
    save(store);
    return { job_id: jobId };
  },

  async listJobs(_args: Record<string, never>): Promise<{ jobs: Job[] }> {
    const store = load();
    return { jobs: store.jobs.map((j) => toJob(store, j)) };
  },

  async getJob(args: { job_id: number }): Promise<{ detail: JobDetail | null }> {
    const store = load();
    const row = store.jobs.find((j) => j.id === args.job_id);
    if (!row) return { detail: null };
    const job = toJob(store, row);
    return {
      detail: {
        job,
        milestones: store.milestones
          .filter((m) => m.job_id === args.job_id)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
          .map((m) => ({ id: m.id, title: m.title, done_at: m.done_at })),
        updates: store.updates
          .filter((u) => u.job_id === args.job_id)
          .sort((a, b) => b.id - a.id)
          .map((u) => ({ id: u.id, body: u.body, photo_label: u.photo_label, photo_url: u.photo_url, created_at: u.created_at })),
        documents: store.documents
          .filter((d) => d.job_id === args.job_id)
          .sort((a, b) => b.id - a.id)
          .map((d) => ({ id: d.id, name: d.name, kind: d.kind, url: d.url, created_at: d.created_at })),
        change_orders: store.change_orders
          .filter((c) => c.job_id === args.job_id)
          .sort((a, b) => b.id - a.id)
          .map((c) => ({ id: c.id, description: c.description, amount_cents: c.amount_cents, status: c.status, created_at: c.created_at })),
        payments: store.payments
          .filter((p) => p.job_id === args.job_id)
          .sort((a, b) => a.id - b.id)
          .map((p) => ({ id: p.id, label: p.label, amount_cents: p.amount_cents, due_date: p.due_date, paid_at: p.paid_at })),
        messages: store.messages
          .filter((m) => m.job_id === args.job_id)
          .sort((a, b) => a.id - b.id)
          .map((m) => ({ id: m.id, sender: m.sender, body: m.body, created_at: m.created_at })),
      },
    };
  },

  async createJob(args: {
    title: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    address: string;
    service: string;
    estimate_no: string;
    start_date: string;
    end_date: string;
    arrival_window: string;
    prep_notes: string;
    contract_total_cents: number | null;
    deposit_due_cents: number | null;
    balance_due_cents: number | null;
    balance_due_date: string;
  }): Promise<{ job_id: number }> {
    const store = load();
    const t = isoNow();
    const jobId = nextId(store, "jobs");
    store.jobs.unshift({
      id: jobId,
      title: args.title,
      client_name: args.client_name,
      client_email: args.client_email,
      client_phone: args.client_phone,
      address: args.address,
      service: args.service,
      estimate_no: args.estimate_no,
      status: "scheduled",
      start_date: args.start_date,
      end_date: args.end_date,
      arrival_window: args.arrival_window,
      prep_notes: args.prep_notes,
      contract_total_cents: args.contract_total_cents,
      deposit_due_cents: args.deposit_due_cents,
      deposit_paid: false,
      balance_due_cents: args.balance_due_cents,
      balance_due_date: args.balance_due_date,
      warranty_start: "",
      care_notes: "",
      created_at: t,
      updated_at: t,
    });
    save(store);
    return { job_id: jobId };
  },

  async updateJob(args: {
    job_id: number;
    title?: string;
    status?: JobStatus;
    start_date?: string;
    end_date?: string;
    arrival_window?: string;
    prep_notes?: string;
    contract_total_cents?: number | null;
    deposit_due_cents?: number | null;
    deposit_paid?: boolean;
    balance_due_cents?: number | null;
    balance_due_date?: string;
    warranty_start?: string;
    care_notes?: string;
  }): Promise<{ ok: true }> {
    const store = load();
    const j = store.jobs.find((x) => x.id === args.job_id);
    if (j) {
      if (args.title !== undefined) j.title = args.title;
      if (args.status !== undefined) j.status = args.status;
      if (args.start_date !== undefined) j.start_date = args.start_date;
      if (args.end_date !== undefined) j.end_date = args.end_date;
      if (args.arrival_window !== undefined) j.arrival_window = args.arrival_window;
      if (args.prep_notes !== undefined) j.prep_notes = args.prep_notes;
      if (args.contract_total_cents !== undefined) j.contract_total_cents = args.contract_total_cents;
      if (args.deposit_due_cents !== undefined) j.deposit_due_cents = args.deposit_due_cents;
      if (args.deposit_paid !== undefined) j.deposit_paid = args.deposit_paid;
      if (args.balance_due_cents !== undefined) j.balance_due_cents = args.balance_due_cents;
      if (args.balance_due_date !== undefined) j.balance_due_date = args.balance_due_date;
      if (args.warranty_start !== undefined) j.warranty_start = args.warranty_start;
      if (args.care_notes !== undefined) j.care_notes = args.care_notes;
      j.updated_at = isoNow();
      if (args.status === "completed") {
        notify(store, "job_complete", "Job complete", "The final walkthrough is done. Your 1-year labor warranty has started — thank you for choosing Seattle MasterFix.", args.job_id);
      }
    }
    save(store);
    return { ok: true as const };
  },

  async addMilestone(args: { job_id: number; title: string }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "milestones");
    const existing = store.milestones.filter((m) => m.job_id === args.job_id).length;
    store.milestones.push({ id, job_id: args.job_id, title: args.title, sort_order: existing, done_at: null, created_at: isoNow() });
    save(store);
    return { id };
  },

  async toggleMilestone(args: { milestone_id: number; done: boolean }): Promise<{ ok: true }> {
    const store = load();
    const m = store.milestones.find((x) => x.id === args.milestone_id);
    if (m) {
      m.done_at = args.done ? isoNow() : null;
      if (args.done) notify(store, "milestone_complete", "Milestone complete", m.title, m.job_id);
    }
    save(store);
    return { ok: true as const };
  },

  async addUpdate(args: {
    job_id: number;
    body: string;
    photo_label: "" | "before" | "during" | "after";
    photo: { data_base64: string; mime_type: string } | null;
  }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "updates");
    store.updates.push({
      id,
      job_id: args.job_id,
      body: args.body,
      photo_label: args.photo_label,
      photo_url: args.photo ? dataUrl(args.photo.mime_type, args.photo.data_base64) : null,
      created_at: isoNow(),
    });
    notify(store, args.photo ? "photo_added" : "update", args.photo ? "New photo added" : "Job update", args.body.slice(0, 140), args.job_id);
    save(store);
    return { id };
  },

  async addDocument(args: {
    job_id: number;
    name: string;
    kind: string;
    file: { data_base64: string; mime_type: string };
  }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "documents");
    store.documents.push({
      id,
      job_id: args.job_id,
      name: args.name,
      kind: args.kind,
      url: dataUrl(args.file.mime_type, args.file.data_base64),
      created_at: isoNow(),
    });
    notify(store, "document_added", "Document added", args.name, args.job_id);
    save(store);
    return { id };
  },

  async addChangeOrder(args: { job_id: number; description: string; amount_cents: number }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "change_orders");
    store.change_orders.push({ id, job_id: args.job_id, description: args.description, amount_cents: args.amount_cents, status: "pending", decided_at: null, created_at: isoNow() });
    save(store);
    return { id };
  },

  async decideChangeOrder(args: { change_order_id: number; decision: "approved" | "declined" }): Promise<{ ok: true }> {
    const store = load();
    const c = store.change_orders.find((x) => x.id === args.change_order_id);
    if (c) {
      c.status = args.decision;
      c.decided_at = isoNow();
    }
    save(store);
    return { ok: true as const };
  },

  async addPayment(args: { job_id: number; label: string; amount_cents: number; due_date: string }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "payments");
    store.payments.push({ id, job_id: args.job_id, label: args.label, amount_cents: args.amount_cents, due_date: args.due_date, paid_at: null, created_at: isoNow() });
    save(store);
    return { id };
  },

  async markPaymentPaid(args: { payment_id: number; paid: boolean }): Promise<{ ok: true }> {
    const store = load();
    const p = store.payments.find((x) => x.id === args.payment_id);
    if (p) p.paid_at = args.paid ? isoNow() : null;
    save(store);
    return { ok: true as const };
  },

  async postMessage(args: { job_id: number; sender: "office" | "client"; body: string }): Promise<{ id: number }> {
    const store = load();
    const id = nextId(store, "messages");
    store.messages.push({ id, job_id: args.job_id, sender: args.sender, body: args.body, created_at: isoNow() });
    save(store);
    return { id };
  },

  async listNotifications(args: { limit: number }): Promise<{ notifications: AppNotification[]; unread_count: number }> {
    const store = load();
    const notifications = [...store.notifications].sort((a, b) => b.id - a.id).slice(0, args.limit);
    return { notifications, unread_count: store.notifications.filter((n) => !n.read).length };
  },

  async markNotificationsRead(_args: Record<string, never>): Promise<{ ok: true }> {
    const store = load();
    for (const n of store.notifications) n.read = true;
    save(store);
    return { ok: true as const };
  },
};

export type ApiResponse<T, K extends keyof T> = T[K] extends (...args: never[]) => Promise<infer R> ? R : never;
