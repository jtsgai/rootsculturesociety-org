# Member Studio activation

The code in this repository is safe to publish before it is activated: it does not contain a database URL, public key, service-role key, password, or member data. The public membership page shows the studio entry only after the two public build variables below exist.

## 1. Create the Supabase project

Create one project for **新加坡根缘文化学会 / Roots Culture Society of Singapore**. In its SQL Editor, run:

`supabase/migrations/20260918_member_studio.sql`

This creates private tables, row-level security rules, a private `genealogy-media` bucket, and the eight-step book structure. Family data is never readable by anonymous visitors.

## 2. Create the first administrator

In Supabase Authentication, create the site administrator user. Then, in the SQL Editor, insert that authenticated user's UUID exactly once:

```sql
insert into public.profiles (id, role)
values ('AUTHENTICATED-USER-UUID', 'admin');
```

Replace only `AUTHENTICATED-USER-UUID`; do not put a real value in this repository. The administrator signs in first, then opens `/admin/members` to issue member IDs and one-time passwords.

## 3. Deploy the administrator function

Deploy `supabase/functions/admin-members`. Configure its server-side secrets in Supabase only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGIN=https://rootsculturesociety.org`

The service-role key must never be stored in GitHub Pages, browser JavaScript, `.env.example`, or a Git commit.

## 4. Add the book publishing and AI interfaces

After `20260918_member_studio.sql`, run:

`supabase/migrations/20260920_member_studio_ai_and_publication.sql`

This adds the private interfaces needed for the next member phase:

- one private AI credit wallet and an auditable credit ledger per member;
- AI job records for cover suggestions, old-photo restoration, prompt assistance, and research assistance;
- chapter-level public-story records, so a member can request publication of selected chapters without exposing the private book;
- web/PDF export records, so the finished book can later have both a private web preview and a PDF export;
- a private `genealogy-ai` storage bucket for intermediate and generated files.

The member-side helpers in `src/lib/member-publication.ts` provide the future UI with three stable actions: request a web/PDF export, read export status, and submit one selected chapter for publication. They only create database records; no export worker or public review action is implied by these helpers.

The database interface is prepared, but no AI provider, payment provider, export worker, or public-story review workflow is enabled yet. The Edge Function `supabase/functions/ai-assist` returns “AI assistance is not enabled yet” while its adapter list is empty, and therefore does not reserve or consume credits.

When the Society later chooses a provider, put `AI_PROVIDER` and the provider's API key only in Supabase Edge Function secrets. Never put provider keys in browser code, GitHub Pages, `.env`, or a Git commit. The current interface cost defaults are cover 3 credits, restoration 2, prompt 1, and research 1; these are implementation defaults, not prices.

Credits can later be granted or reconciled by an administrator through `grant_ai_credits`. Membership payment and credit purchases are intentionally separate work and are not implemented by this migration.

## 5. Enable the browser connection

Add these **GitHub repository Actions secrets**. They are publishable browser values, not an admin key:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The deployment workflow injects them only while building. After the next successful Pages deployment, `/membership`, `/en/membership`, `/studio/login`, and `/admin/members` can use the real backend.

## Operational rules already enforced

- One member has one private book.
- Generation 1 is the first ancestor who settled in Singapore.
- Phone and address are kept in Method 8 and are not public.
- No NRIC field, public self-registration, payment integration, active PDF/web export worker, active AI provider, or multi-editor account exists in this phase. The data tables and client/Edge Function interfaces for later export, chapter publication, and metered AI are prepared but disabled.
- Membership must be active and within its dates to write books or upload images.
- Initial and reset passwords are eight characters, shown once by the administrator function, and not logged or emailed.
