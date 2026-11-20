// Signed-in parts of the app: client job tracking and the office tools.
// The database enforces who can see/change what (Row Level Security); the
// role checks here only decide which screens to show.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, reference, type EstimateRequest, type Job, type JobStatus, type RequestStatus } from "./api";
import { useAuth } from "./auth";
import { go } from "./router";
import { COMPANY, SERVICES } from "./content";
import { Badge, EmptyState, ErrorNote, Field, I, Icon, SectionTitle, btnGhost, btnNavy, btnPrimary, fmtDate, fmtDateTime, inputCls, money, prettyDate } from "./ui";

const REQUEST_STATUS_LABEL: Record<string, string> = {
  received: "Request Received", visit_scheduled: "Site Visit Scheduled", estimate_sent: "Estimate Sent",
  approved: "Approved", not_approved: "Not Approved", converted: "Job Created",
};
const REQUEST_STEPS = ["received", "visit_scheduled", "estimate_sent", "approved"];
const JOB_STATUS_LABEL: Record<string, string> = { scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold" };
const serviceNames = (slugs: string[]) => slugs.map((s) => SERVICES.find((x) => x.slug === s)?.name ?? s).join(", ");
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Please try again.");
const toCents = (v: string) => (v.trim() === "" ? null : Math.round(parseFloat(v.replace(/[$,]/g, "")) * 100));

function Back({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-navy font-semibold mt-4 min-h-11">
      <Icon d={I.back} size={18} /> {label}
    </button>
  );
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-[var(--border)] bg-white p-4 ${className}`}>{children}</div>;
}

// ---------- Sign in (6-digit email code — stays in the installed app) ----------
export function SignInCard({ title = "Sign in to see your job" }: { title?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const send = useMutation({ mutationFn: () => api.sendLoginLink(email), onSuccess: () => setSent(true) });
  const verify = useMutation({ mutationFn: (token: string) => api.verifyCode(email, token) });
  const onCode = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (v.length === 6 && !verify.isPending) verify.mutate(v);
  };
  return (
    <Card className="mt-5">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {!sent ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <p className="text-sm text-charcoal/80 mb-3">No password needed. Use the email you gave us for your estimate — we’ll email you a 6-digit code.</p>
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {send.error && <ErrorNote message={errMsg(send.error)} />}
          <button type="submit" className={`${btnPrimary} w-full`} disabled={send.isPending || !/.+@.+\..+/.test(email)}>
            {send.isPending ? "Sending…" : "Email me a 6-digit code"}
          </button>
        </form>
      ) : (
        <div className="mt-2 text-sm space-y-3">
          <p role="status">
            Check your email for a 6-digit code. We sent it to <strong>{email}</strong>. It can take a minute — check spam too.
          </p>
          <p className="text-charcoal/80">
            Enter the code here so you stay signed in on this app (including if you added it to your home screen). Tapping a link in the email can open a different browser.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) verify.mutate(code);
            }}
          >
            <Field label="6-digit code">
              <input
                className={`${inputCls} tracking-[0.4em] text-center text-lg font-semibold`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                pattern="[0-9]*"
                maxLength={6}
                name="otp"
                id="otp"
                value={code}
                onChange={(e) => onCode(e.target.value)}
                aria-label="6-digit sign-in code"
              />
            </Field>
            {verify.error && <ErrorNote message={errMsg(verify.error)} />}
            <div className="flex gap-2 flex-wrap">
              <button type="submit" className={btnNavy} disabled={code.length < 6 || verify.isPending}>{verify.isPending ? "Signing in…" : "Sign in with code"}</button>
              <button type="button" className={btnGhost} onClick={() => { setSent(false); setCode(""); }}>Use a different email</button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

// ---------- Client: My Job ----------
function progress(job: Job) {
  const ms = job.milestones ?? [];
  return ms.length ? Math.round((ms.filter((m) => m.done_at).length / ms.length) * 100) : 0;
}

function JobCard({ job }: { job: Job }) {
  const pct = progress(job);
  return (
    <button type="button" onClick={() => go({ name: "job", id: job.id })} className="card-lift w-full text-left rounded-lg border border-[var(--border)] bg-white p-4">
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-navy">{job.title}</span>
        <Badge tone={job.status === "completed" ? "green" : job.status === "on_hold" ? "gray" : "bronze"}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </span>
      <span className="block text-sm text-charcoal/75">{job.address || job.service}</span>
      <span className="block mt-3 h-2.5 rounded bg-stone-200 overflow-hidden" aria-hidden="true">
        <span className="block h-full bg-bronze bar-anim" style={{ width: `${pct}%` }} />
      </span>
      <span className="block text-xs mt-1 text-charcoal/75">{pct}% of milestones complete</span>
    </button>
  );
}

export function MyJobTab() {
  const { ready, session, profile, isOffice } = useAuth();
  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs, enabled: !!session });
  const reqQ = useQuery({ queryKey: ["myrequests"], queryFn: api.listMyRequests, enabled: !!session && !isOffice });

  if (!ready) return <p className="mt-6 text-charcoal/75">Loading…</p>;
  if (!session) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-navy mt-5">My Job</h1>
        <p className="text-charcoal/80 mt-1">Follow your estimate request and job: schedule, milestones, crew photos, documents, payments, and messages with our office.</p>
        <SignInCard />
        <p className="text-sm text-charcoal/75 mt-4">
          New here? <button type="button" className="underline font-semibold text-navy" onClick={() => go({ name: "estimate" })}>Request a free estimate</button> first.
        </p>
      </div>
    );
  }
  const jobs = jobsQ.data ?? [];
  const requests = reqQ.data ?? [];
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">{isOffice ? "All jobs" : "My Job"}</h1>
      <p className="text-sm text-charcoal/75 mt-1">Signed in as {profile?.email ?? session.user.email}</p>
      {isOffice && (
        <button type="button" className={`${btnNavy} mt-3`} onClick={() => go({ name: "office" })}>Open office tools</button>
      )}
      {jobsQ.error && <ErrorNote message={errMsg(jobsQ.error)} />}
      {jobsQ.isPending ? (
        <p className="mt-4 text-charcoal/75">Loading your jobs…</p>
      ) : (
        <>
          {jobs.length === 0 && requests.length === 0 && (
            <EmptyState
              title="No job here yet"
              body="When we set up your job, it appears here with its timeline, photos, documents, and payments. Make sure you signed in with the same email you gave us."
              action={<button type="button" className={btnPrimary} onClick={() => go({ name: "estimate" })}>Request a Free Estimate</button>}
            />
          )}
          {jobs.length > 0 && (
            <>
              <SectionTitle>{isOffice ? "Jobs" : "Your jobs"}</SectionTitle>
              <div className="space-y-3">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
            </>
          )}
          {requests.length > 0 && (
            <>
              <SectionTitle>Your estimate requests</SectionTitle>
              <div className="space-y-3">
                {requests.map((r) => (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-navy">{serviceNames(r.services) || "Estimate request"}</p>
                      <Badge tone={r.status === "approved" ? "green" : r.status === "not_approved" ? "gray" : "bronze"}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="text-sm text-charcoal/75">Reference {reference(r.id)} · Sent {fmtDate(r.created_at)}</p>
                    {r.status !== "not_approved" && (
                      <ol className="flex items-center gap-1 mt-3" aria-label="Request progress">
                        {REQUEST_STEPS.map((s, i) => {
                          const reached = REQUEST_STEPS.indexOf(r.status) >= i;
                          return (
                            <li key={s} className="flex-1">
                              <span className={`block h-2 rounded ${reached ? "bg-bronze" : "bg-stone-200"}`} />
                              <span className={`block text-xs mt-1 ${reached ? "font-semibold text-navy" : "text-charcoal/75"}`}>{REQUEST_STATUS_LABEL[s]}</span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Job detail (client read-only; office gets editing tools) ----------
export function JobDetailView({ jobId }: { jobId: number }) {
  const { session, isOffice } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["job", jobId], queryFn: () => api.getJob(jobId), enabled: !!session });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["job", jobId] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  };
  const run = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh });
  const [msg, setMsg] = useState("");

  if (!session) return <SignInCard />;
  if (q.isPending) return <p className="mt-6 text-charcoal/75">Loading job…</p>;
  if (q.error) return <ErrorNote message={errMsg(q.error)} />;
  const d = q.data;
  if (!d) return (<><Back label="My Job" onClick={() => go({ name: "myjob" })} /><EmptyState title="Job not found" body="This job isn’t on your account. Sign in with the email you gave us, or call the office." /></>);
  const { job } = d;
  const done = d.milestones.filter((m) => m.done_at).length;
  const pct = d.milestones.length ? Math.round((done / d.milestones.length) * 100) : 0;

  return (
    <div className="max-w-3xl">
      <Back label={isOffice ? "Jobs" : "My Job"} onClick={() => go({ name: isOffice ? "office" : "myjob" })} />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">{job.title}</h1>
        <Badge tone={job.status === "completed" ? "green" : job.status === "on_hold" ? "gray" : "bronze"}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </div>
      <p className="text-charcoal/80">{job.address}</p>
      {run.error && <ErrorNote message={errMsg(run.error)} />}

      <SectionTitle>Schedule</SectionTitle>
      <Card>
        <dl className="grid sm:grid-cols-2 gap-2 text-sm">
          <div><dt className="font-semibold text-navy">Start</dt><dd>{job.start_date ? prettyDate(job.start_date) : "To be scheduled"}</dd></div>
          <div><dt className="font-semibold text-navy">Expected finish</dt><dd>{job.end_date ? prettyDate(job.end_date) : "—"}</dd></div>
          {job.arrival_window && <div><dt className="font-semibold text-navy">Crew arrival</dt><dd>{job.arrival_window}</dd></div>}
          {job.estimate_no && <div><dt className="font-semibold text-navy">Estimate no.</dt><dd>{job.estimate_no}</dd></div>}
        </dl>
        {job.prep_notes && <p className="text-sm mt-3"><strong className="text-navy">Please prepare:</strong> {job.prep_notes}</p>}
      </Card>
      {isOffice && <OfficeJobEditor job={job} onSaved={refresh} />}

      <SectionTitle>Progress — {pct}%</SectionTitle>
      <Card>
        <div className="h-2.5 rounded bg-stone-200 overflow-hidden mb-3" aria-hidden="true"><div className="h-full bg-bronze bar-anim" style={{ width: `${pct}%` }} /></div>
        {d.milestones.length === 0 && <p className="text-sm text-charcoal/75">Milestones will appear here once your job is planned.</p>}
        <ol className="space-y-2">
          {d.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-3 text-sm">
              {isOffice ? (
                <input type="checkbox" className="w-5 h-5" checked={!!m.done_at} aria-label={`Done: ${m.title}`} onChange={(e) => run.mutate(() => api.toggleMilestone(m.id, e.target.checked))} />
              ) : (
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${m.done_at ? "bg-bronze border-bronze" : "bg-white border-bronze-dark"}`} aria-hidden="true" />
              )}
              <span className={m.done_at ? "font-semibold text-navy" : ""}>{m.title}</span>
              <span className="ml-auto text-xs text-charcoal/75">{m.done_at ? `Done ${fmtDate(m.done_at)}` : "Not yet"}</span>
            </li>
          ))}
        </ol>
        {isOffice && <AddLine label="New milestone" button="Add" onAdd={(t) => run.mutate(() => api.addMilestone(jobId, t, d.milestones.length + 1))} />}
      </Card>

      <SectionTitle>Crew updates</SectionTitle>
      {d.updates.length === 0 && <p className="text-sm text-charcoal/75">Dated updates and photos from the crew will appear here.</p>}
      <div className="space-y-3">
        {d.updates.map((u) => (
          <Card key={u.id}>
            <p className="text-xs text-charcoal/75">{fmtDateTime(u.created_at)}{u.photo_label ? ` · ${u.photo_label}` : ""}</p>
            <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
            {u.url && <img src={u.url} alt={`Job photo${u.photo_label ? ` (${u.photo_label})` : ""}: ${u.body.slice(0, 80)}`} className="mt-2 rounded w-full max-h-96 object-cover" loading="lazy" />}
          </Card>
        ))}
      </div>
      {isOffice && <OfficeUpdateForm jobId={jobId} onDone={refresh} />}

      <SectionTitle>Payments</SectionTitle>
      <Card>
        {job.contract_total_cents !== null && <p className="text-sm mb-2"><strong className="text-navy">Contract total:</strong> {money(job.contract_total_cents)} (from your signed estimate)</p>}
        {d.payments.length === 0 && <p className="text-sm text-charcoal/75">Your payment schedule from the signed estimate will appear here.</p>}
        <ul className="divide-y divide-[var(--border)]">
          {d.payments.map((p) => (
            <li key={p.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-navy">{p.label}</span>
              <span>{money(p.amount_cents)}</span>
              {p.due_date && <span className="text-charcoal/75">due {prettyDate(p.due_date)}</span>}
              <span className="ml-auto"><Badge tone={p.paid_at ? "green" : "bronze"}>{p.paid_at ? `Paid ${fmtDate(p.paid_at)}` : "Not paid"}</Badge></span>
              {isOffice && <button type="button" className={btnGhost} onClick={() => run.mutate(() => api.markPaymentPaid(p.id, !p.paid_at))}>{p.paid_at ? "Mark unpaid" : "Mark paid"}</button>}
            </li>
          ))}
        </ul>
        {isOffice && <OfficePaymentForm onAdd={(l, c, due) => run.mutate(() => api.addPayment(jobId, l, c, due))} />}
      </Card>

      <SectionTitle>Change orders</SectionTitle>
      <Card>
        {d.change_orders.length === 0 && <p className="text-sm text-charcoal/75">Any change to the scope is written here with its price difference, and needs your written approval first.</p>}
        <ul className="space-y-2">
          {d.change_orders.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex gap-2 items-start">
                <span className="flex-1">{c.description}</span>
                <span className="font-semibold">{c.amount_cents >= 0 ? "+" : "−"}{money(Math.abs(c.amount_cents))}</span>
                <Badge tone={c.status === "approved" ? "green" : c.status === "declined" ? "gray" : "bronze"}>{c.status}</Badge>
              </div>
              {isOffice && (
                <select className="mt-1 rounded border border-[var(--border)] px-2 py-2 min-h-11" value={c.status} aria-label="Change order status" onChange={(e) => run.mutate(() => api.setChangeOrderStatus(c.id, e.target.value as "pending" | "approved" | "declined"))}>
                  <option value="pending">Pending</option><option value="approved">Approved in writing</option><option value="declined">Declined</option>
                </select>
              )}
            </li>
          ))}
        </ul>
        {!isOffice && d.change_orders.some((c) => c.status === "pending") && (
          <p className="text-sm mt-2">To approve or decline a pending change order, reply in Messages below or call {COMPANY.phoneDisplay}.</p>
        )}
        {isOffice && <OfficeChangeOrderForm onAdd={(t, c) => run.mutate(() => api.addChangeOrder(jobId, t, c))} />}
      </Card>

      <SectionTitle>Documents</SectionTitle>
      <Card>
        {d.documents.length === 0 && <p className="text-sm text-charcoal/75">Your estimate, signed agreement, invoices, and warranty letter will appear here.</p>}
        <ul className="space-y-2">
          {d.documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 text-sm">
              <Icon d={I.doc} size={20} />
              <span className="flex-1">{doc.name} <span className="text-charcoal/75">· {doc.kind}</span></span>
              {doc.url && <a className={btnGhost} href={doc.url} target="_blank" rel="noreferrer">Open</a>}
            </li>
          ))}
        </ul>
        {isOffice && <OfficeDocForm jobId={jobId} onDone={refresh} />}
      </Card>

      {job.status === "completed" && job.warranty_start && (
        <>
          <SectionTitle>Warranty</SectionTitle>
          <Card><p className="text-sm">1-year labor warranty, starting {prettyDate(job.warranty_start)}.</p>{job.care_notes && <p className="text-sm mt-2 whitespace-pre-wrap">{job.care_notes}</p>}</Card>
        </>
      )}

      <SectionTitle>Messages</SectionTitle>
      <Card>
        {d.messages.length === 0 && <p className="text-sm text-charcoal/75">Questions about your job? Send the office a message here.</p>}
        <ul className="space-y-2 mb-3">
          {d.messages.map((m) => (
            <li key={m.id} className={`rounded-lg p-3 text-sm max-w-[85%] ${m.sender_role === "office" ? "bg-navy text-white" : "bg-cream ml-auto"}`}>
              <p className="text-xs opacity-80 mb-0.5">{m.sender_role === "office" ? "Seattle MasterFix office" : isOffice ? job.client_name : "You"} · {fmtDateTime(m.created_at)}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!msg.trim()) return;
            run.mutate(() => api.postMessage(jobId, msg.trim()), { onSuccess: () => setMsg("") });
          }}
        >
          <label className="block text-sm font-semibold text-navy mb-1" htmlFor="msg-body">{isOffice ? "Reply to client" : "Message the office"}</label>
          <textarea id="msg-body" className={`${inputCls} min-h-20`} maxLength={4000} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button type="submit" className={`${btnNavy} mt-2`} disabled={!msg.trim() || run.isPending}><Icon d={I.send} size={18} /> Send</button>
        </form>
      </Card>
    </div>
  );
}

// ---------- Office building blocks ----------
function AddLine({ label, button, onAdd }: { label: string; button: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }}>
      <label className="sr-only" htmlFor={`add-${label}`}>{label}</label>
      <input id={`add-${label}`} className={inputCls} placeholder={label} value={v} onChange={(e) => setV(e.target.value)} />
      <button type="submit" className={btnNavy} disabled={!v.trim()}>{button}</button>
    </form>
  );
}

function OfficePaymentForm({ onAdd }: { onAdd: (label: string, cents: number, due: string | null) => void }) {
  const [label, setLabel] = useState(""); const [amt, setAmt] = useState(""); const [due, setDue] = useState("");
  return (
    <form className="grid sm:grid-cols-4 gap-2 mt-3 items-end" onSubmit={(e) => { e.preventDefault(); const c = toCents(amt); if (label.trim() && c !== null) { onAdd(label.trim(), c, due || null); setLabel(""); setAmt(""); setDue(""); } }}>
      <Field label="Payment label"><input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Deposit" /></Field>
      <Field label="Amount ($)"><input className={inputCls} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="From the signed estimate" /></Field>
      <Field label="Due date"><input className={inputCls} type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <button type="submit" className={`${btnNavy} mb-3`} disabled={!label.trim() || !amt.trim()}>Add payment</button>
    </form>
  );
}

function OfficeChangeOrderForm({ onAdd }: { onAdd: (text: string, cents: number) => void }) {
  const [t, setT] = useState(""); const [amt, setAmt] = useState("");
  return (
    <form className="mt-3" onSubmit={(e) => { e.preventDefault(); const c = toCents(amt) ?? 0; if (t.trim()) { onAdd(t.trim(), c); setT(""); setAmt(""); } }}>
      <Field label="What changed and why"><textarea className={`${inputCls} min-h-16`} value={t} onChange={(e) => setT(e.target.value)} /></Field>
      <Field label="Price difference ($, negative for a credit)"><input className={inputCls} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
      <button type="submit" className={btnNavy} disabled={!t.trim()}>Add change order</button>
    </form>
  );
}

function OfficeUpdateForm({ jobId, onDone }: { jobId: number; onDone: () => void }) {
  const [body, setBody] = useState(""); const [label, setLabel] = useState(""); const [file, setFile] = useState<File | null>(null);
  const m = useMutation({ mutationFn: () => api.addUpdate(jobId, body.trim(), label, file), onSuccess: () => { setBody(""); setLabel(""); setFile(null); onDone(); } });
  return (
    <Card className="mt-3">
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) m.mutate(); }}>
        <Field label="Post a crew update"><textarea className={`${inputCls} min-h-20`} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Photo label">
            <select className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="">None</option><option value="before">Before</option><option value="during">During</option><option value="after">After</option>
            </select>
          </Field>
          <Field label="Photo (optional)"><input className={inputCls} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        </div>
        {m.error && <ErrorNote message={errMsg(m.error)} />}
        <button type="submit" className={btnNavy} disabled={!body.trim() || m.isPending}>{m.isPending ? "Posting…" : "Post update"}</button>
      </form>
    </Card>
  );
}

function OfficeDocForm({ jobId, onDone }: { jobId: number; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [name, setName] = useState(""); const [kind, setKind] = useState("estimate");
  const m = useMutation({ mutationFn: () => api.addDocument(jobId, file as File, name.trim(), kind), onSuccess: () => { setFile(null); setName(""); onDone(); } });
  return (
    <form className="mt-3 grid sm:grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); if (file) m.mutate(); }}>
      <Field label="Document type">
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="estimate">Estimate</option><option value="agreement">Signed agreement</option><option value="invoice">Invoice</option><option value="warranty">Warranty letter</option><option value="document">Other</option>
        </select>
      </Field>
      <Field label="Name (optional)"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="File (PDF or image)"><input className={inputCls} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <div className="self-end">{m.error && <ErrorNote message={errMsg(m.error)} />}<button type="submit" className={`${btnNavy} mb-3`} disabled={!file || m.isPending}>{m.isPending ? "Uploading…" : "Upload document"}</button></div>
    </form>
  );
}

function OfficeJobEditor({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    status: job.status, start_date: job.start_date ?? "", end_date: job.end_date ?? "", arrival_window: job.arrival_window,
    prep_notes: job.prep_notes, total: job.contract_total_cents !== null ? String(job.contract_total_cents / 100) : "",
    warranty_start: job.warranty_start ?? "", care_notes: job.care_notes,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const m = useMutation({
    mutationFn: () => api.updateJob(job.id, {
      status: f.status as JobStatus, start_date: f.start_date || null, end_date: f.end_date || null, arrival_window: f.arrival_window,
      prep_notes: f.prep_notes, contract_total_cents: toCents(f.total), warranty_start: f.warranty_start || null, care_notes: f.care_notes,
    }),
    onSuccess: () => { setOpen(false); onSaved(); },
  });
  return (
    <div className="mt-3">
      <button type="button" className={btnGhost} onClick={() => setOpen(!open)} aria-expanded={open}>Office: edit schedule &amp; status</button>
      {open && (
        <Card className="mt-2">
          <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid sm:grid-cols-2 gap-x-3">
            <Field label="Status">
              <select className={inputCls} value={f.status} onChange={set("status")}>
                {Object.entries(JOB_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Crew arrival window"><input className={inputCls} value={f.arrival_window} onChange={set("arrival_window")} placeholder="8:00–9:00 AM" /></Field>
            <Field label="Start date"><input className={inputCls} type="date" value={f.start_date} onChange={set("start_date")} /></Field>
            <Field label="Expected finish"><input className={inputCls} type="date" value={f.end_date} onChange={set("end_date")} /></Field>
            <Field label="Contract total ($)"><input className={inputCls} inputMode="decimal" value={f.total} onChange={set("total")} placeholder="From the signed estimate" /></Field>
            <Field label="Warranty start (after walkthrough)"><input className={inputCls} type="date" value={f.warranty_start} onChange={set("warranty_start")} /></Field>
            <div className="sm:col-span-2"><Field label="What the client should prepare"><textarea className={`${inputCls} min-h-16`} value={f.prep_notes} onChange={set("prep_notes")} /></Field></div>
            <div className="sm:col-span-2"><Field label="Care notes (shown with the warranty)"><textarea className={`${inputCls} min-h-16`} value={f.care_notes} onChange={set("care_notes")} /></Field></div>
            {m.error && <div className="sm:col-span-2"><ErrorNote message={errMsg(m.error)} /></div>}
            <button type="submit" className={btnNavy} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save changes"}</button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ---------- Office: requests inbox + jobs ----------
export function OfficeHome() {
  const { isOffice, ready, session } = useAuth();
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: api.listAllRequests, enabled: isOffice });
  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs, enabled: isOffice });
  if (!ready) return <p className="mt-6">Loading…</p>;
  if (!session) return <SignInCard title="Office sign-in" />;
  if (!isOffice) return <EmptyState title="Office only" body="This area is for Seattle MasterFix staff." />;
  const open = (reqQ.data ?? []).filter((r) => r.status !== "converted" && r.status !== "not_approved");
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mt-5">Office tools</h1>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button type="button" className={btnPrimary} onClick={() => go({ name: "newjob" })}><Icon d={I.plus} size={18} /> New job</button>
      </div>
      <SectionTitle>Estimate requests ({open.length} open)</SectionTitle>
      {reqQ.error && <ErrorNote message={errMsg(reqQ.error)} />}
      {reqQ.data?.length === 0 && <p className="text-sm text-charcoal/75">No requests yet. New ones from the app land here and in your email.</p>}
      <ul className="space-y-2">
        {(reqQ.data ?? []).map((r) => (
          <li key={r.id}>
            <button type="button" className="card-lift w-full text-left rounded-lg border border-[var(--border)] bg-white p-3" onClick={() => go({ name: "request", id: r.id })}>
              <span className="flex justify-between gap-2"><span className="font-semibold text-navy">{r.name}</span><Badge tone={r.status === "converted" || r.status === "approved" ? "green" : r.status === "not_approved" ? "gray" : "bronze"}>{REQUEST_STATUS_LABEL[r.status]}</Badge></span>
              <span className="block text-sm text-charcoal/75">{serviceNames(r.services)} · {r.zip} · {fmtDate(r.created_at)}{r.photo_count ? ` · ${r.photo_count} photo(s)` : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      <SectionTitle>Jobs</SectionTitle>
      {jobsQ.data?.length === 0 && <p className="text-sm text-charcoal/75">No jobs yet.</p>}
      <div className="space-y-3">{(jobsQ.data ?? []).map((j) => <JobCard key={j.id} job={j} />)}</div>
    </div>
  );
}

export function RequestDetail({ id }: { id: string }) {
  const { isOffice } = useAuth();
  const qc = useQueryClient();
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: api.listAllRequests, enabled: isOffice });
  const photosQ = useQuery({ queryKey: ["reqphotos", id], queryFn: () => api.requestPhotos(id), enabled: isOffice });
  const setStatus = useMutation({ mutationFn: (s: RequestStatus) => api.updateRequestStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }) });
  if (!isOffice) return <EmptyState title="Office only" body="This area is for Seattle MasterFix staff." />;
  const r = reqQ.data?.find((x) => x.id === id);
  if (!r) return <p className="mt-6">{reqQ.isPending ? "Loading…" : "Request not found."}</p>;
  const row = (k: string, v: string) => (v ? <div className="flex gap-2"><dt className="font-semibold text-navy w-28 shrink-0">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div> : null);
  return (
    <div className="max-w-2xl">
      <Back label="Office tools" onClick={() => go({ name: "office" })} />
      <h1 className="text-2xl font-bold text-navy">{r.name}</h1>
      <p className="text-sm text-charcoal/75">{reference(r.id)} · {fmtDateTime(r.created_at)}</p>
      <Card className="mt-3">
        <dl className="text-sm space-y-1">
          {row("Services", serviceNames(r.services))}{row("Property", r.property_type)}{row("Address", [r.address, r.zip].filter(Boolean).join(", "))}
          {row("The work", r.description)}{row("Areas", r.areas)}{row("Size", r.approx_size)}{row("Timing", r.timing)}
          {row("Visit times", r.visit_times)}{row("Heard via", r.heard_about)}
        </dl>
        <p className="text-sm mt-2"><a className="underline text-navy font-semibold" href={`tel:${r.phone}`}>{r.phone}</a> · <a className="underline text-navy font-semibold" href={`mailto:${r.email}`}>{r.email}</a> · prefers {r.preferred_contact}</p>
      </Card>
      <SectionTitle>Photos</SectionTitle>
      {photosQ.data?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photosQ.data.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={`Client photo ${p.name}`} className="rounded w-full h-32 object-cover" loading="lazy" /></a>)}
        </div>
      ) : <p className="text-sm text-charcoal/75">{photosQ.isPending ? "Loading photos…" : "No photos uploaded."}</p>}
      <SectionTitle>Pipeline</SectionTitle>
      <div className="flex flex-wrap gap-2 items-center">
        {r.status !== "converted" ? (
          <>
            <label className="text-sm font-semibold" htmlFor="req-status">Status</label>
            <select id="req-status" className="rounded border border-[var(--border)] px-2 py-2 min-h-11" value={r.status} onChange={(e) => setStatus.mutate(e.target.value as RequestStatus)}>
              {["received", "visit_scheduled", "estimate_sent", "approved", "not_approved"].map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" className={btnPrimary} onClick={() => go({ name: "newjob", requestId: r.id })}>Create job from this request</button>
          </>
        ) : r.job_id ? <button type="button" className={btnNavy} onClick={() => go({ name: "job", id: r.job_id! })}>Open job</button> : null}
      </div>
    </div>
  );
}

export function NewJobForm({ requestId }: { requestId?: string }) {
  const { isOffice } = useAuth();
  const qc = useQueryClient();
  const reqQ = useQuery({ queryKey: ["requests"], queryFn: api.listAllRequests, enabled: isOffice && !!requestId });
  const src: EstimateRequest | undefined = reqQ.data?.find((x) => x.id === requestId);
  const [f, setF] = useState({ title: "", client_name: "", client_email: "", client_phone: "", address: "", service: "", estimate_no: "" });
  const [invite, setInvite] = useState(true);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (src) setF((x) => ({ ...x, title: `${serviceNames(src.services)} — ${src.name}`, client_name: src.name, client_email: src.email, client_phone: src.phone, address: [src.address, src.zip].filter(Boolean).join(", "), service: serviceNames(src.services) }));
  }, [src]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const m = useMutation({
    mutationFn: async () => {
      const id = await api.createJob(f, requestId);
      if (invite) {
        try { await api.inviteClient(f.client_email); } catch (e) { return { id, warn: `Job created, but the sign-in email could not be sent: ${errMsg(e)}. The client can still sign in from the My Job tab once email is set up.` }; }
      }
      return { id, warn: "" };
    },
    onSuccess: ({ id, warn }) => { qc.invalidateQueries(); if (warn) setNote(warn); else go({ name: "job", id }); },
  });
  if (!isOffice) return <EmptyState title="Office only" body="This area is for Seattle MasterFix staff." />;
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  return (
    <div className="max-w-xl">
      <Back label="Office tools" onClick={() => go({ name: "office" })} />
      <h1 className="text-2xl font-bold text-navy">New job</h1>
      <form onSubmit={submit} className="mt-3">
        <Field label="Job title"><input className={inputCls} required value={f.title} onChange={set("title")} /></Field>
        <Field label="Client name"><input className={inputCls} required value={f.client_name} onChange={set("client_name")} /></Field>
        <Field label="Client email (they sign in with this)"><input className={inputCls} type="email" required value={f.client_email} onChange={set("client_email")} /></Field>
        <Field label="Client phone"><input className={inputCls} type="tel" value={f.client_phone} onChange={set("client_phone")} /></Field>
        <Field label="Job address"><input className={inputCls} value={f.address} onChange={set("address")} /></Field>
        <Field label="Service(s)"><input className={inputCls} value={f.service} onChange={set("service")} /></Field>
        <Field label="Estimate number"><input className={inputCls} value={f.estimate_no} onChange={set("estimate_no")} /></Field>
        <label className="flex gap-3 items-center min-h-11 text-sm"><input type="checkbox" className="w-5 h-5" checked={invite} onChange={(e) => setInvite(e.target.checked)} /> Email the client a 6-digit sign-in code now</label>
        {m.error && <ErrorNote message={errMsg(m.error)} />}
        {note && <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded p-3 my-2" role="alert">{note}</p>}
        <button type="submit" className={`${btnPrimary} w-full mt-2`} disabled={m.isPending}>{m.isPending ? "Creating…" : "Create job"}</button>
      </form>
    </div>
  );
}
