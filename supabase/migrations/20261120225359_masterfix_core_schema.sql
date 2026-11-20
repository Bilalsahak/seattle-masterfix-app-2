-- Seattle MasterFix client app: core schema with RLS
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;

-- Office allowlist lives in a non-exposed schema: role=office can only be granted by SQL/admin.
create table private.office_emails (email text primary key check (email = lower(email)));
insert into private.office_emails(email) values ('bill@seattlemasterfix.com');
revoke all on private.office_emails from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  role text not null default 'client' check (role in ('client','office')),
  created_at timestamptz not null default now()
);

create or replace function private.is_office() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'office');
$$;
revoke all on function private.is_office() from public;
grant execute on function private.is_office() to authenticated, anon;

create table public.jobs (
  id bigint generated always as identity primary key,
  client_id uuid references public.profiles(id) on delete set null,
  client_email text not null check (client_email = lower(client_email) and char_length(client_email) <= 160),
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_phone text not null default '' check (char_length(client_phone) <= 40),
  title text not null check (char_length(title) between 1 and 200),
  address text not null default '' check (char_length(address) <= 240),
  service text not null default '' check (char_length(service) <= 120),
  estimate_no text not null default '' check (char_length(estimate_no) <= 40),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','on_hold')),
  start_date date, end_date date,
  arrival_window text not null default '' check (char_length(arrival_window) <= 80),
  prep_notes text not null default '' check (char_length(prep_notes) <= 1000),
  contract_total_cents integer check (contract_total_cents >= 0),
  warranty_start date,
  care_notes text not null default '' check (char_length(care_notes) <= 2000),
  estimate_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_client_id_idx on public.jobs(client_id);
create index jobs_client_email_idx on public.jobs(client_email);

create or replace function private.owns_job(p_job_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs j where j.id = p_job_id and j.client_id = (select auth.uid()));
$$;
revoke all on function private.owns_job(bigint) from public;
grant execute on function private.owns_job(bigint) to authenticated, anon;

create table public.milestones (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  sort_order integer not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index milestones_job_idx on public.milestones(job_id);

create table public.job_updates (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  photo_label text not null default '' check (photo_label in ('','before','during','after')),
  photo_path text,
  created_at timestamptz not null default now()
);
create index job_updates_job_idx on public.job_updates(job_id);

create table public.change_orders (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  amount_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index change_orders_job_idx on public.change_orders(job_id);

create table public.payments (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  amount_cents integer not null check (amount_cents >= 0),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_job_idx on public.payments(job_id);

create table public.messages (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sender_role text not null default 'client' check (sender_role in ('client','office')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_job_idx on public.messages(job_id);
create index messages_sender_idx on public.messages(sender_id);

create table public.documents (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  kind text not null default 'document' check (kind in ('estimate','agreement','invoice','warranty','photo','document')),
  storage_path text not null,
  content_type text not null default '',
  size_bytes integer,
  created_at timestamptz not null default now()
);
create index documents_job_idx on public.documents(job_id);

create table public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 40),
  email text not null check (email = lower(email) and char_length(email) <= 160 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  preferred_contact text not null default 'phone' check (preferred_contact in ('phone','text','email')),
  services text[] not null check (cardinality(services) between 1 and 8),
  property_type text not null default '' check (char_length(property_type) <= 60),
  address text not null default '' check (char_length(address) <= 240),
  zip text not null default '' check (char_length(zip) <= 12),
  description text not null default '' check (char_length(description) <= 4000),
  areas text not null default '' check (char_length(areas) <= 300),
  approx_size text not null default '' check (char_length(approx_size) <= 120),
  timing text not null default '' check (char_length(timing) <= 120),
  heard_about text not null default '' check (char_length(heard_about) <= 120),
  visit_times text not null default '' check (char_length(visit_times) <= 300),
  photo_count integer not null default 0 check (photo_count between 0 and 5),
  status text not null default 'received' check (status in ('received','visit_scheduled','estimate_sent','approved','not_approved','converted')),
  job_id bigint references public.jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index estimate_requests_user_idx on public.estimate_requests(user_id);
create index estimate_requests_email_idx on public.estimate_requests(email);
create index estimate_requests_job_idx on public.estimate_requests(job_id);
alter table public.jobs add constraint jobs_estimate_request_fk foreign key (estimate_request_id) references public.estimate_requests(id) on delete set null;
create index jobs_estimate_request_idx on public.jobs(estimate_request_id);

-- ---------- Triggers ----------
-- New auth user -> profile (client unless allowlisted as office); link jobs by verified email.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, role)
  values (new.id, lower(coalesce(new.email,'')),
    case when exists (select 1 from private.office_emails o where o.email = lower(new.email)) then 'office' else 'client' end)
  on conflict (id) do nothing;
  update public.jobs set client_id = new.id where client_id is null and client_email = lower(new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- New job -> link to an existing profile with the same email.
create or replace function private.link_job_client() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.client_email := lower(new.client_email);
  if new.client_id is null then
    select p.id into new.client_id from public.profiles p where p.email = new.client_email limit 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger jobs_link_client before insert or update of client_email on public.jobs for each row execute function private.link_job_client();

create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger jobs_touch before update on public.jobs for each row execute function private.touch_updated_at();

-- Messages: sender is always the caller; role comes from their profile (no spoofing).
create or replace function private.stamp_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid();
  new.sender_role := case when private.is_office() then 'office' else 'client' end;
  new.created_at := now();
  return new;
end $$;
create trigger messages_stamp before insert on public.messages for each row execute function private.stamp_message();

-- Estimate requests: force safe defaults for public inserts + simple flood guard.
create or replace function private.guard_estimate_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(new.email);
  new.user_id := auth.uid();
  new.status := 'received';
  new.job_id := null;
  new.created_at := now();
  if (select count(*) from public.estimate_requests r where r.email = new.email and r.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many requests from this email. Please call (206) 550-4576.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.estimate_requests r where r.created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'We are receiving a lot of requests right now. Please call (206) 550-4576.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger estimate_requests_guard before insert on public.estimate_requests for each row execute function private.guard_estimate_request();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.milestones enable row level security;
alter table public.job_updates enable row level security;
alter table public.change_orders enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.estimate_requests enable row level security;

-- profiles: read own (office reads all); users may edit only name/phone (column grants below).
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_office()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- jobs
create policy jobs_select on public.jobs for select to authenticated
  using (client_id = (select auth.uid()) or (select private.is_office()));
create policy jobs_office_insert on public.jobs for insert to authenticated with check ((select private.is_office()));
create policy jobs_office_update on public.jobs for update to authenticated using ((select private.is_office())) with check ((select private.is_office()));
create policy jobs_office_delete on public.jobs for delete to authenticated using ((select private.is_office()));

-- job children: client read via owns_job, office full write
do $$
declare t text;
begin
  foreach t in array array['milestones','job_updates','change_orders','payments','documents'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using ((select private.is_office()) or private.owns_job(job_id))', t);
    execute format('create policy %1$s_office_insert on public.%1$s for insert to authenticated with check ((select private.is_office()))', t);
    execute format('create policy %1$s_office_update on public.%1$s for update to authenticated using ((select private.is_office())) with check ((select private.is_office()))', t);
    execute format('create policy %1$s_office_delete on public.%1$s for delete to authenticated using ((select private.is_office()))', t);
  end loop;
end $$;

-- messages: read on own job; insert on own job (or office); no edits/deletes by clients
create policy messages_select on public.messages for select to authenticated
  using ((select private.is_office()) or private.owns_job(job_id));
create policy messages_insert on public.messages for insert to authenticated
  with check ((select private.is_office()) or private.owns_job(job_id));
create policy messages_office_delete on public.messages for delete to authenticated using ((select private.is_office()));
revoke update on public.messages from anon, authenticated;

-- estimate requests: anyone may submit; signed-in clients read their own; office reads/updates all
create policy estimate_requests_insert on public.estimate_requests for insert to anon, authenticated with check (true);
create policy estimate_requests_select on public.estimate_requests for select to authenticated
  using ((select private.is_office()) or user_id = (select auth.uid()) or email = lower((select auth.jwt()) ->> 'email'));
create policy estimate_requests_office_update on public.estimate_requests for update to authenticated
  using ((select private.is_office())) with check ((select private.is_office()));
create policy estimate_requests_office_delete on public.estimate_requests for delete to authenticated using ((select private.is_office()));

-- anon gets nothing except inserting estimate requests
revoke all on public.profiles, public.jobs, public.milestones, public.job_updates, public.change_orders, public.payments, public.messages, public.documents from anon;
revoke all on public.estimate_requests from anon;
grant insert on public.estimate_requests to anon;
