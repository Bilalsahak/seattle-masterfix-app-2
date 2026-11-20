// Seattle MasterFix App — server actions.
//
// Public estimate requests, job tracking (timeline, milestones, updates,
// photos, documents, change orders, payments status, messages), and the
// office tools Bill uses to run jobs. Prices are never generated here:
// every amount shown comes from a value Bill entered, matching the signed
// estimate, per the Design & Build Guideline's non-negotiables.

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";

const SERVICE_NAMES: Record<string, string> = {
  siding: "Siding",
  fencing: "Fencing",
  tile: "Tile",
  flooring: "Laminate Flooring",
  drywall: "Drywall",
  paint: "Interior / Exterior Paint",
  remodel: "Remodel Build-Outs",
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const now = () => new Date();

async function notify(
  ctx: Ctx,
  kind: string,
  title: string,
  body: string,
  jobId: number | null,
) {
  const db = ctx.db<typeof schema>();
  await db.insert(schema.notifications).values({
    kind,
    title,
    body,
    jobId,
    createdAt: now(),
  });
}

const requestShape = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  preferred_contact: z.string(),
  services: z.array(z.string()),
  property_type: z.string(),
  address: z.string(),
  zip: z.string(),
  description: z.string(),
  areas: z.string(),
  approx_size: z.string(),
  timing: z.string(),
  heard_about: z.string(),
  visit_times: z.string(),
  photo_count: z.number(),
  status: z.string(),
  job_id: z.number().nullable(),
  created_at: z.string(),
});

type RequestRow = typeof schema.estimateRequests.$inferSelect;
function toRequest(r: RequestRow): z.infer<typeof requestShape> {
  let services: string[] = [];
  try {
    const parsed: unknown = JSON.parse(r.services);
    if (Array.isArray(parsed)) services = parsed.filter((s): s is string => typeof s === "string");
  } catch {
    services = [];
  }
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    preferred_contact: r.preferredContact,
    services,
    property_type: r.propertyType,
    address: r.address,
    zip: r.zip,
    description: r.description,
    areas: r.areas,
    approx_size: r.approxSize,
    timing: r.timing,
    heard_about: r.heardAbout,
    visit_times: r.visitTimes,
    photo_count: r.photoCount,
    status: r.status,
    job_id: r.jobId,
    created_at: r.createdAt.toISOString(),
  };
}

const jobShape = z.object({
  id: z.number(),
  title: z.string(),
  client_name: z.string(),
  client_email: z.string(),
  client_phone: z.string(),
  address: z.string(),
  service: z.string(),
  estimate_no: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  arrival_window: z.string(),
  prep_notes: z.string(),
  contract_total_cents: z.number().nullable(),
  deposit_due_cents: z.number().nullable(),
  deposit_paid: z.boolean(),
  balance_due_cents: z.number().nullable(),
  balance_due_date: z.string(),
  warranty_start: z.string(),
  care_notes: z.string(),
  milestone_total: z.number(),
  milestone_done: z.number(),
  created_at: z.string(),
});

type JobRow = typeof schema.jobs.$inferSelect;
function toJob(j: JobRow, total: number, done: number): z.infer<typeof jobShape> {
  return {
    id: j.id,
    title: j.title,
    client_name: j.clientName,
    client_email: j.clientEmail,
    client_phone: j.clientPhone,
    address: j.address,
    service: j.service,
    estimate_no: j.estimateNo,
    status: j.status,
    start_date: j.startDate,
    end_date: j.endDate,
    arrival_window: j.arrivalWindow,
    prep_notes: j.prepNotes,
    contract_total_cents: j.contractTotalCents,
    deposit_due_cents: j.depositDueCents,
    deposit_paid: j.depositPaid === 1,
    balance_due_cents: j.balanceDueCents,
    balance_due_date: j.balanceDueDate,
    warranty_start: j.warrantyStart,
    care_notes: j.careNotes,
    milestone_total: total,
    milestone_done: done,
    created_at: j.createdAt.toISOString(),
  };
}

const milestoneShape = z.object({
  id: z.number(),
  title: z.string(),
  done_at: z.string().nullable(),
});
const updateShape = z.object({
  id: z.number(),
  body: z.string(),
  photo_label: z.string(),
  photo_url: z.string().nullable(),
  created_at: z.string(),
});
const documentShape = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.string(),
  url: z.string().nullable(),
  created_at: z.string(),
});
const changeOrderShape = z.object({
  id: z.number(),
  description: z.string(),
  amount_cents: z.number(),
  status: z.string(),
  created_at: z.string(),
});
const paymentShape = z.object({
  id: z.number(),
  label: z.string(),
  amount_cents: z.number(),
  due_date: z.string(),
  paid_at: z.string().nullable(),
});
const messageShape = z.object({
  id: z.number(),
  sender: z.string(),
  body: z.string(),
  created_at: z.string(),
});

const jobDetailResponse = z.object({
  job: jobShape,
  milestones: z.array(milestoneShape),
  updates: z.array(updateShape),
  documents: z.array(documentShape),
  change_orders: z.array(changeOrderShape),
  payments: z.array(paymentShape),
  messages: z.array(messageShape),
});

async function loadJobDetail(
  ctx: Ctx,
  jobId: number,
): Promise<z.infer<typeof jobDetailResponse> | null> {
  const db = ctx.db<typeof schema>();
  const jobRows = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1);
  const job = jobRows[0];
  if (!job) return null;
  const [ms, ups, docs, cos, pays, msgs] = await Promise.all([
    db.select().from(schema.milestones).where(eq(schema.milestones.jobId, jobId)).orderBy(asc(schema.milestones.sortOrder), asc(schema.milestones.id)),
    db.select().from(schema.jobUpdates).where(eq(schema.jobUpdates.jobId, jobId)).orderBy(desc(schema.jobUpdates.id)),
    db.select().from(schema.documents).where(eq(schema.documents.jobId, jobId)).orderBy(desc(schema.documents.id)),
    db.select().from(schema.changeOrders).where(eq(schema.changeOrders.jobId, jobId)).orderBy(desc(schema.changeOrders.id)),
    db.select().from(schema.payments).where(eq(schema.payments.jobId, jobId)).orderBy(asc(schema.payments.id)),
    db.select().from(schema.messages).where(eq(schema.messages.jobId, jobId)).orderBy(asc(schema.messages.id)),
  ]);
  const updates = await Promise.all(
    ups.map(async (u) => ({
      id: u.id,
      body: u.body,
      photo_label: u.photoLabel,
      photo_url: u.photoBlobKey ? await ctx.blobs.getUrl(u.photoBlobKey) : null,
      created_at: u.createdAt.toISOString(),
    })),
  );
  const documents = await Promise.all(
    docs.map(async (d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      url: d.blobKey ? await ctx.blobs.getUrl(d.blobKey) : null,
      created_at: d.createdAt.toISOString(),
    })),
  );
  return {
    job: toJob(job, ms.length, ms.filter((m) => m.doneAt).length),
    milestones: ms.map((m) => ({ id: m.id, title: m.title, done_at: iso(m.doneAt) })),
    updates,
    documents,
    change_orders: cos.map((c) => ({
      id: c.id,
      description: c.description,
      amount_cents: c.amountCents,
      status: c.status,
      created_at: c.createdAt.toISOString(),
    })),
    payments: pays.map((p) => ({
      id: p.id,
      label: p.label,
      amount_cents: p.amountCents,
      due_date: p.dueDate,
      paid_at: iso(p.paidAt),
    })),
    messages: msgs.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      created_at: m.createdAt.toISOString(),
    })),
  };
}

const okResponse = z.object({ ok: z.literal(true) });

export const Actions = {
  // ---------- Estimate requests ----------
  submitEstimateRequest: defineAction({
    description: "Submits a public estimate request and returns its reference number.",
    request: z.object({
      name: z.string().min(1).max(120),
      phone: z.string().min(7).max(40),
      email: z.string().email().max(160),
      preferred_contact: z.string().max(20).default("phone"),
      services: z.array(z.string().max(40)).min(1).max(8),
      property_type: z.string().max(60).default(""),
      address: z.string().max(240).default(""),
      zip: z.string().max(12).default(""),
      description: z.string().max(4000).default(""),
      areas: z.string().max(300).default(""),
      approx_size: z.string().max(120).default(""),
      timing: z.string().max(120).default(""),
      heard_about: z.string().max(120).default(""),
      visit_times: z.string().max(300).default(""),
      photo_count: z.number().int().min(0).max(5).default(0),
    }),
    response: z.object({ id: z.number(), reference: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const t = now();
      const inserted = await db
        .insert(schema.estimateRequests)
        .values({
          name: args.name,
          phone: args.phone,
          email: args.email,
          preferredContact: args.preferred_contact,
          services: JSON.stringify(args.services),
          propertyType: args.property_type,
          address: args.address,
          zip: args.zip,
          description: args.description,
          areas: args.areas,
          approxSize: args.approx_size,
          timing: args.timing,
          heardAbout: args.heard_about,
          visitTimes: args.visit_times,
          photoCount: args.photo_count,
          status: "received",
          createdAt: t,
          updatedAt: t,
        })
        .returning({ id: schema.estimateRequests.id });
      const row = inserted[0];
      if (!row) throw new Error("submitEstimateRequest: insert returned no rows");
      const reference = `SMF-REQ-${row.id}`;
      await notify(ctx, "request_received", "Estimate request received", `${args.name} — reference ${reference}. We usually reply within 1 hour during business hours.`, null);
      ctx.invalidateQueries();
      return { id: row.id, reference };
    },
  }),

  listEstimateRequests: defineAction({
    description: "Lists estimate requests for the office inbox, newest first.",
    request: z.object({ limit: z.number().int().positive().max(100).default(50) }),
    response: z.object({ requests: z.array(requestShape) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.estimateRequests)
        .orderBy(desc(schema.estimateRequests.id))
        .limit(args.limit);
      return { requests: rows.map(toRequest) };
    },
  }),

  updateRequestStatus: defineAction({
    description: "Moves an estimate request through the office pipeline (visit scheduled, estimate sent, approved, not approved).",
    request: z.object({
      id: z.number().int().positive(),
      status: z.enum(["received", "visit_scheduled", "estimate_sent", "approved", "not_approved"]),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.estimateRequests)
        .set({ status: args.status, updatedAt: now() })
        .where(eq(schema.estimateRequests.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  convertRequestToJob: defineAction({
    description: "Creates a tracked job from an approved estimate request, pre-filled with the client's details.",
    request: z.object({ request_id: z.number().int().positive() }),
    response: z.object({ job_id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.estimateRequests)
        .where(eq(schema.estimateRequests.id, args.request_id))
        .limit(1);
      const r = rows[0];
      if (!r) throw new Error("Request not found");
      const t = now();
      const serviceNames = toRequest(r)
        .services.map((s) => SERVICE_NAMES[s] ?? s)
        .join(", ");
      const inserted = await db
        .insert(schema.jobs)
        .values({
          title: `${serviceNames || "Project"} — ${r.name}`,
          clientName: r.name,
          clientEmail: r.email,
          clientPhone: r.phone,
          address: r.address,
          service: serviceNames,
          status: "scheduled",
          createdAt: t,
          updatedAt: t,
        })
        .returning({ id: schema.jobs.id });
      const job = inserted[0];
      if (!job) throw new Error("convertRequestToJob: insert returned no rows");
      await db
        .update(schema.estimateRequests)
        .set({ status: "converted", jobId: job.id, updatedAt: t })
        .where(eq(schema.estimateRequests.id, r.id));
      ctx.invalidateQueries();
      return { job_id: job.id };
    },
  }),

  // ---------- Jobs ----------
  listJobs: defineAction({
    description: "Lists all tracked jobs with milestone progress, most recently updated first.",
    request: z.object({}),
    response: z.object({ jobs: z.array(jobShape) }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.updatedAt));
      const ms = await db.select().from(schema.milestones);
      return {
        jobs: rows.map((j) => {
          const mine = ms.filter((m) => m.jobId === j.id);
          return toJob(j, mine.length, mine.filter((m) => m.doneAt).length);
        }),
      };
    },
  }),

  getJob: defineAction({
    description: "Loads one job with its timeline: milestones, updates with photos, documents, change orders, payments, and messages.",
    request: z.object({ job_id: z.number().int().positive() }),
    response: z.object({ detail: jobDetailResponse.nullable() }),
    async handler(ctx, args) {
      return { detail: await loadJobDetail(ctx, args.job_id) };
    },
  }),

  createJob: defineAction({
    description: "Creates a tracked job (office use) with client, address, schedule, and payment fields from the signed estimate.",
    request: z.object({
      title: z.string().min(1).max(200),
      client_name: z.string().min(1).max(120),
      client_email: z.string().max(160).default(""),
      client_phone: z.string().max(40).default(""),
      address: z.string().max(240).default(""),
      service: z.string().max(120).default(""),
      estimate_no: z.string().max(40).default(""),
      start_date: z.string().max(20).default(""),
      end_date: z.string().max(20).default(""),
      arrival_window: z.string().max(80).default(""),
      prep_notes: z.string().max(1000).default(""),
      contract_total_cents: z.number().int().nonnegative().nullable().default(null),
      deposit_due_cents: z.number().int().nonnegative().nullable().default(null),
      balance_due_cents: z.number().int().nonnegative().nullable().default(null),
      balance_due_date: z.string().max(20).default(""),
    }),
    response: z.object({ job_id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const t = now();
      const inserted = await db
        .insert(schema.jobs)
        .values({
          title: args.title,
          clientName: args.client_name,
          clientEmail: args.client_email,
          clientPhone: args.client_phone,
          address: args.address,
          service: args.service,
          estimateNo: args.estimate_no,
          status: "scheduled",
          startDate: args.start_date,
          endDate: args.end_date,
          arrivalWindow: args.arrival_window,
          prepNotes: args.prep_notes,
          contractTotalCents: args.contract_total_cents,
          depositDueCents: args.deposit_due_cents,
          balanceDueCents: args.balance_due_cents,
          balanceDueDate: args.balance_due_date,
          createdAt: t,
          updatedAt: t,
        })
        .returning({ id: schema.jobs.id });
      const job = inserted[0];
      if (!job) throw new Error("createJob: insert returned no rows");
      ctx.invalidateQueries();
      return { job_id: job.id };
    },
  }),

  updateJob: defineAction({
    description: "Updates a job's schedule, status, payment, completion, and warranty fields (office use).",
    request: z.object({
      job_id: z.number().int().positive(),
      title: z.string().min(1).max(200).optional(),
      status: z.enum(["scheduled", "in_progress", "completed", "on_hold"]).optional(),
      start_date: z.string().max(20).optional(),
      end_date: z.string().max(20).optional(),
      arrival_window: z.string().max(80).optional(),
      prep_notes: z.string().max(1000).optional(),
      contract_total_cents: z.number().int().nonnegative().nullable().optional(),
      deposit_due_cents: z.number().int().nonnegative().nullable().optional(),
      deposit_paid: z.boolean().optional(),
      balance_due_cents: z.number().int().nonnegative().nullable().optional(),
      balance_due_date: z.string().max(20).optional(),
      warranty_start: z.string().max(20).optional(),
      care_notes: z.string().max(2000).optional(),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      const patch: Partial<JobRow> = { updatedAt: now() };
      if (args.title !== undefined) patch.title = args.title;
      if (args.status !== undefined) patch.status = args.status;
      if (args.start_date !== undefined) patch.startDate = args.start_date;
      if (args.end_date !== undefined) patch.endDate = args.end_date;
      if (args.arrival_window !== undefined) patch.arrivalWindow = args.arrival_window;
      if (args.prep_notes !== undefined) patch.prepNotes = args.prep_notes;
      if (args.contract_total_cents !== undefined) patch.contractTotalCents = args.contract_total_cents;
      if (args.deposit_due_cents !== undefined) patch.depositDueCents = args.deposit_due_cents;
      if (args.deposit_paid !== undefined) patch.depositPaid = args.deposit_paid ? 1 : 0;
      if (args.balance_due_cents !== undefined) patch.balanceDueCents = args.balance_due_cents;
      if (args.balance_due_date !== undefined) patch.balanceDueDate = args.balance_due_date;
      if (args.warranty_start !== undefined) patch.warrantyStart = args.warranty_start;
      if (args.care_notes !== undefined) patch.careNotes = args.care_notes;
      await db.update(schema.jobs).set(patch).where(eq(schema.jobs.id, args.job_id));
      if (args.status === "completed") {
        await notify(ctx, "job_complete", "Job complete", "The final walkthrough is done. Your 1-year labor warranty has started — thank you for choosing Seattle MasterFix.", args.job_id);
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  // ---------- Milestones & updates ----------
  addMilestone: defineAction({
    description: "Adds a milestone to a job's timeline (office/crew use).",
    request: z.object({ job_id: z.number().int().positive(), title: z.string().min(1).max(160) }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const existing = await db.select().from(schema.milestones).where(eq(schema.milestones.jobId, args.job_id));
      const inserted = await db
        .insert(schema.milestones)
        .values({ jobId: args.job_id, title: args.title, sortOrder: existing.length, createdAt: now() })
        .returning({ id: schema.milestones.id });
      const row = inserted[0];
      if (!row) throw new Error("addMilestone: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  toggleMilestone: defineAction({
    description: "Marks a milestone done or not done; completing one notifies the client feed.",
    request: z.object({ milestone_id: z.number().int().positive(), done: z.boolean() }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.milestones).where(eq(schema.milestones.id, args.milestone_id)).limit(1);
      const m = rows[0];
      if (!m) throw new Error("Milestone not found");
      await db
        .update(schema.milestones)
        .set({ doneAt: args.done ? now() : null })
        .where(eq(schema.milestones.id, args.milestone_id));
      if (args.done) {
        await notify(ctx, "milestone_complete", "Milestone complete", m.title, m.jobId);
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addUpdate: defineAction({
    description: "Posts a dated progress update to a job, optionally with a labeled photo (office/crew use).",
    request: z.object({
      job_id: z.number().int().positive(),
      body: z.string().min(1).max(2000),
      photo_label: z.enum(["", "before", "during", "after"]).default(""),
      photo: z
        .object({ data_base64: z.string().min(1), mime_type: z.string().max(60) })
        .nullable()
        .default(null),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      let blobKey: string | null = null;
      if (args.photo) {
        const bytes = Buffer.from(args.photo.data_base64, "base64");
        blobKey = `jobs/${args.job_id}/updates/${Date.now()}`;
        await ctx.blobs.put(blobKey, bytes, { contentType: args.photo.mime_type });
      }
      const inserted = await db
        .insert(schema.jobUpdates)
        .values({
          jobId: args.job_id,
          body: args.body,
          photoLabel: args.photo_label,
          photoBlobKey: blobKey,
          photoContentType: args.photo?.mime_type ?? null,
          createdAt: now(),
        })
        .returning({ id: schema.jobUpdates.id });
      const row = inserted[0];
      if (!row) throw new Error("addUpdate: insert returned no rows");
      await notify(ctx, args.photo ? "photo_added" : "update", args.photo ? "New photo added" : "Job update", args.body.slice(0, 140), args.job_id);
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  // ---------- Documents ----------
  addDocument: defineAction({
    description: "Adds a private document (estimate PDF, signed agreement, invoice, warranty letter) to a job.",
    request: z.object({
      job_id: z.number().int().positive(),
      name: z.string().min(1).max(200),
      kind: z.string().max(40).default("document"),
      file: z.object({ data_base64: z.string().min(1), mime_type: z.string().max(80) }),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const bytes = Buffer.from(args.file.data_base64, "base64");
      const blobKey = `jobs/${args.job_id}/documents/${Date.now()}`;
      await ctx.blobs.put(blobKey, bytes, { contentType: args.file.mime_type });
      const inserted = await db
        .insert(schema.documents)
        .values({
          jobId: args.job_id,
          name: args.name,
          kind: args.kind,
          blobKey,
          contentType: args.file.mime_type,
          sizeBytes: bytes.length,
          createdAt: now(),
        })
        .returning({ id: schema.documents.id });
      const row = inserted[0];
      if (!row) throw new Error("addDocument: insert returned no rows");
      await notify(ctx, "document_added", "Document added", args.name, args.job_id);
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  // ---------- Change orders ----------
  addChangeOrder: defineAction({
    description: "Adds a change order to a job for written client approval (office use). Work on it does not proceed until approved.",
    request: z.object({
      job_id: z.number().int().positive(),
      description: z.string().min(1).max(1000),
      amount_cents: z.number().int(),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const inserted = await db
        .insert(schema.changeOrders)
        .values({ jobId: args.job_id, description: args.description, amountCents: args.amount_cents, status: "pending", createdAt: now() })
        .returning({ id: schema.changeOrders.id });
      const row = inserted[0];
      if (!row) throw new Error("addChangeOrder: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  decideChangeOrder: defineAction({
    description: "Records the client's written approve/decline decision on a change order.",
    request: z.object({
      change_order_id: z.number().int().positive(),
      decision: z.enum(["approved", "declined"]),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.changeOrders)
        .set({ status: args.decision, decidedAt: now() })
        .where(eq(schema.changeOrders.id, args.change_order_id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  // ---------- Payments status ----------
  addPayment: defineAction({
    description: "Adds a payment line (deposit, progress payment, balance) to a job's payment status (office use).",
    request: z.object({
      job_id: z.number().int().positive(),
      label: z.string().min(1).max(120),
      amount_cents: z.number().int().nonnegative(),
      due_date: z.string().max(20).default(""),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const inserted = await db
        .insert(schema.payments)
        .values({ jobId: args.job_id, label: args.label, amountCents: args.amount_cents, dueDate: args.due_date, createdAt: now() })
        .returning({ id: schema.payments.id });
      const row = inserted[0];
      if (!row) throw new Error("addPayment: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  markPaymentPaid: defineAction({
    description: "Marks a payment line paid or unpaid (office use).",
    request: z.object({ payment_id: z.number().int().positive(), paid: z.boolean() }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.payments)
        .set({ paidAt: args.paid ? now() : null })
        .where(eq(schema.payments.id, args.payment_id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  // ---------- Messages ----------
  postMessage: defineAction({
    description: "Posts a message to a job's thread, from the office or the client.",
    request: z.object({
      job_id: z.number().int().positive(),
      sender: z.enum(["office", "client"]),
      body: z.string().min(1).max(2000),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const inserted = await db
        .insert(schema.messages)
        .values({ jobId: args.job_id, sender: args.sender, body: args.body, createdAt: now() })
        .returning({ id: schema.messages.id });
      const row = inserted[0];
      if (!row) throw new Error("postMessage: insert returned no rows");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  // ---------- Notifications ----------
  listNotifications: defineAction({
    description: "Lists in-app notifications (site visit, milestone, photo, document, payment, completion), newest first.",
    request: z.object({ limit: z.number().int().positive().max(100).default(50) }),
    response: z.object({
      notifications: z.array(
        z.object({
          id: z.number(),
          kind: z.string(),
          title: z.string(),
          body: z.string(),
          job_id: z.number().nullable(),
          read: z.boolean(),
          created_at: z.string(),
        }),
      ),
      unread_count: z.number(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.notifications)
        .orderBy(desc(schema.notifications.id))
        .limit(args.limit);
      return {
        notifications: rows.map((n) => ({
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          job_id: n.jobId,
          read: n.readAt !== null,
          created_at: n.createdAt.toISOString(),
        })),
        unread_count: rows.filter((n) => n.readAt === null).length,
      };
    },
  }),

  markNotificationsRead: defineAction({
    description: "Marks all notifications as read.",
    request: z.object({}),
    response: okResponse,
    async handler(ctx): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.notifications).set({ readAt: now() });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
