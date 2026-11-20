DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE estimate_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',
  services TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  areas TEXT NOT NULL DEFAULT '',
  approx_size TEXT NOT NULL DEFAULT '',
  timing TEXT NOT NULL DEFAULT '',
  heard_about TEXT NOT NULL DEFAULT '',
  visit_times TEXT NOT NULL DEFAULT '',
  photo_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  job_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  estimate_no TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  arrival_window TEXT NOT NULL DEFAULT '',
  prep_notes TEXT NOT NULL DEFAULT '',
  contract_total_cents INTEGER,
  deposit_due_cents INTEGER,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  balance_due_cents INTEGER,
  balance_due_date TEXT NOT NULL DEFAULT '',
  warranty_start TEXT NOT NULL DEFAULT '',
  care_notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  done_at INTEGER,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE job_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  photo_label TEXT NOT NULL DEFAULT '',
  photo_blob_key TEXT,
  photo_content_type TEXT,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'document',
  blob_key TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE change_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at INTEGER,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL DEFAULT '',
  paid_at INTEGER,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  sender TEXT NOT NULL DEFAULT 'office',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  job_id INTEGER,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
