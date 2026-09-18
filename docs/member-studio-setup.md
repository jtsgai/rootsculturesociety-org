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

## 4. Enable the browser connection

Add these **GitHub repository Actions secrets**. They are publishable browser values, not an admin key:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The deployment workflow injects them only while building. After the next successful Pages deployment, `/membership`, `/en/membership`, `/studio/login`, and `/admin/members` can use the real backend.

## Operational rules already enforced

- One member has one private book.
- Generation 1 is the first ancestor who settled in Singapore.
- Phone and address are kept in Method 8 and are not public.
- No NRIC field, public self-registration, payment, PDF export, AI generation, or multi-editor accounts exists in this phase.
- Membership must be active and within its dates to write books or upload images.
- Initial and reset passwords are eight characters, shown once by the administrator function, and not logged or emailed.
