// Seattle MasterFix App data model (per the Design & Build Guideline, p.9):
// estimate_requests (leads), jobs, milestones, updates, documents,
// change_orders, messages, payments status, notifications.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const ts = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const estimateRequests = sqliteTable("estimate_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  preferredContact: text("preferred_contact").notNull().default("phone"),
  services: text("services").notNull(), // JSON array of service slugs
  propertyType: text("property_type").notNull().default(""),
  address: text("address").notNull().default(""),
  zip: text("zip").notNull().default(""),
  description: text("description").notNull().default(""),
  areas: text("areas").notNull().default(""),
  approxSize: text("approx_size").notNull().default(""),
  timing: text("timing").notNull().default(""),
  heardAbout: text("heard_about").notNull().default(""),
  visitTimes: text("visit_times").notNull().default(""),
  photoCount: integer("photo_count").notNull().default(0),
  status: text("status", {
    enum: ["received", "visit_scheduled", "estimate_sent", "approved", "not_approved", "converted"],
  })
    .notNull()
    .default("received"),
  jobId: integer("job_id"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull().default(""),
  clientPhone: text("client_phone").notNull().default(""),
  address: text("address").notNull().default(""),
  service: text("service").notNull().default(""),
  estimateNo: text("estimate_no").notNull().default(""),
  status: text("status", {
    enum: ["scheduled", "in_progress", "completed", "on_hold"],
  })
    .notNull()
    .default("scheduled"),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  arrivalWindow: text("arrival_window").notNull().default(""),
  prepNotes: text("prep_notes").notNull().default(""),
  contractTotalCents: integer("contract_total_cents"),
  depositDueCents: integer("deposit_due_cents"),
  depositPaid: integer("deposit_paid").notNull().default(0),
  balanceDueCents: integer("balance_due_cents"),
  balanceDueDate: text("balance_due_date").notNull().default(""),
  warrantyStart: text("warranty_start").notNull().default(""),
  careNotes: text("care_notes").notNull().default(""),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  doneAt: integer("done_at", { mode: "timestamp_ms" }),
  createdAt: ts("created_at"),
});

export const jobUpdates = sqliteTable("job_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  body: text("body").notNull(),
  photoLabel: text("photo_label").notNull().default(""),
  photoBlobKey: text("photo_blob_key"),
  photoContentType: text("photo_content_type"),
  createdAt: ts("created_at"),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("document"),
  blobKey: text("blob_key"),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: ts("created_at"),
});

export const changeOrders = sqliteTable("change_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status", { enum: ["pending", "approved", "declined"] })
    .notNull()
    .default("pending"),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  createdAt: ts("created_at"),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  dueDate: text("due_date").notNull().default(""),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: ts("created_at"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  sender: text("sender", { enum: ["office", "client"] }).notNull().default("office"),
  body: text("body").notNull(),
  createdAt: ts("created_at"),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  jobId: integer("job_id"),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: ts("created_at"),
});
