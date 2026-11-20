# Supabase backend (real job tracking)

Project: **seattle-masterfix-app** (region us-west-1, free plan), ref `nswoksixspogizntqyqv`.
The SQL that created it is in `migrations/`.

## Who can see what (enforced by the database, Row Level Security on every table)

| | Visitor (not signed in) | Client (signed in) | Office (role = office) |
|---|---|---|---|
| Send an estimate request + up to 5 photos | yes | yes | yes |
| See estimate requests | no | only their own (same email) | all |
| See jobs, milestones, updates, payments, change orders, documents, messages | no | only jobs where the client email is theirs | all |
| Send a message on a job | no | only on their own jobs | any job |
| Create or change jobs, milestones, payments, change orders, documents | no | no | yes |
| Make someone "office" | no | no | no — SQL only (see below) |

Files are in two **private** storage buckets: `estimate-photos` (anyone can upload into a
brand-new request; only the office can view) and `job-files` (office uploads; the job's client can view).
Estimate requests are rate-limited (3 per email per hour, 20 total per 10 minutes) and the form has a hidden spam trap.

Only the public "publishable" key is in the app. The service-role key must never go into the app or the repo.

## One-time setup Bill must do in the Supabase dashboard

1. **Authentication → URL Configuration**
   - Site URL: `https://bilalsahak.github.io/seattle-masterfix-app-2/`
   - Redirect URLs: add `https://bilalsahak.github.io/seattle-masterfix-app-2/**`
     (later also `https://app.seattlemasterfix.com/**` if you move the app there).
   Without this, sign-in links send people to the wrong address.
2. **Authentication → Emails → SMTP Settings: turn on custom SMTP** (for example Resend, Postmark, or
   Google Workspace SMTP for Bill@seattlemasterfix.com). Supabase's built-in email only sends to members of
   your Supabase team and only a few emails per hour, so **clients will not receive sign-in emails until this is done.**
3. (Optional) **Authentication → Emails → Templates → Magic Link**: add `{{ .Token }}` so the email also
   shows a 6-digit code (the app accepts either the link or the code).

## Making someone office staff

`bill@seattlemasterfix.com` is already on the office list: the first time that email signs in, it becomes office.
To add another staff email, run this once in **SQL Editor** (replace the email):

```sql
insert into private.office_emails values ('name@seattlemasterfix.com');
update public.profiles set role = 'office' where email = 'name@seattlemasterfix.com';
```
