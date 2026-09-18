# Public Pavilion and Member Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the public pavilion into a polished second-stage cultural site and add a private, guided Photo Genealogy studio for members.

**Architecture:** Keep the bilingual Astro public site statically deployed on GitHub Pages. Add Supabase Auth, Postgres, private Storage, Row Level Security, and Edge Functions for the private studio. The browser uses only the project URL and publishable key; administrator actions run in an Edge Function with server-side secrets.

**Tech Stack:** Astro 7, Tailwind CSS 4, vanilla browser JavaScript, Supabase JS, Supabase Auth, Postgres, Storage, Edge Functions, GitHub Pages.

---

### Task 1: Stabilise public-site mobile and sharing quality

**Files:**
- Modify: `src/assets/styles/tailwind.css`
- Modify: `src/layouts/SiteLayout.astro`
- Modify: `src/components/SiteHeader.astro`

**Step 1: Write browser checks for 390px Chinese and English home pages.**

Expected: English hero title and brand wordmark do not overlap or clip.

**Step 2: Implement responsive title and header sizing.**

Use language-specific mobile rules so English can wrap safely while Chinese retains its locked two-line title.

**Step 3: Add canonical, alternate-language, Open Graph, and social metadata.**

Use each page's language-specific title and description, and the existing hero still as the temporary share image.

**Step 4: Verify desktop and mobile pages with Playwright.**

Expected: no clipped text, no horizontal overflow, one-line desktop navigation.

### Task 2: Add authorised second-stage public material

**Files:**
- Create: `public/committee/*`
- Create: `public/events/*`
- Modify: `src/data/site.ts`
- Modify: `src/components/PublicPage.astro`
- Modify: `src/assets/styles/tailwind.css`

**Step 1: Optimise source images before copying them into public assets.**

Use only the authoritatively mapped committee images from the supplied PPT and authorised activity photos. Maintain source aspect ratio and record descriptive alt text.

**Step 2: Add committee cards with role, name, and authorised image.**

Do not alter the locked names or roles.

**Step 3: Add an activity gallery.**

Use conservative captions that describe only what the source establishes. Do not invent date, venue, people, or programme details.

**Step 4: Enrich publications and empty-state pages.**

Show full publication metadata already supplied; retain transparent, clearly labelled upcoming-event and story collection states where source material is unavailable.

**Step 5: Run visual checks on desktop and mobile.**

Expected: all images retain aspect ratio; no image is presented as a falsely identified portrait.

### Task 3: Create the secure Supabase data model

**Files:**
- Create: `supabase/migrations/20260918_member_studio.sql`
- Create: `supabase/functions/admin-members/index.ts`
- Create: `supabase/functions/admin-members/deno.json`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Define database entities.**

Create profiles, members, genealogy_books, studio_sections, people, person_relationships, membership status and audit timestamps. Store phone and address only in an owner/admin-only private member-profile area, never in public tables.

**Step 2: Write RLS policies and policy tests.**

Members can read their own book and media, edit only while active, and never access another member's book. Admins can provision and manage membership. Storage paths must be scoped to the owning member.

**Step 3: Add private storage bucket and media policy.**

Restrict mime types and file size. Use owner-scoped paths and private bucket downloads only.

**Step 4: Add the administrator Edge Function.**

Create member ID, create initial password, create corresponding Auth account, mark first-login password change, and return the plaintext password exactly once. Do not email it and do not write it to the database.

**Step 5: Document environment variables and bootstrap.**

Keep service credentials out of Git. A first administrator must be created in Supabase before the web admin screen can issue members.

### Task 4: Build the guided member studio

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/studio.ts`
- Create: `src/components/studio/*`
- Create: `src/pages/studio/login.astro`
- Create: `src/pages/studio/index.astro`
- Create: `src/pages/studio/[step].astro`
- Create: `src/pages/admin/members.astro`
- Modify: `src/assets/styles/tailwind.css`

**Step 1: Build the login and forced-password-change journey.**

Login accepts member ID and password, converts the member ID internally to the private Auth identifier, and never exposes the service-role key.

**Step 2: Build the dashboard.**

Show a simple eight-step progress list, a single next action, autosave state, and source links on every step.

**Step 3: Build forms for Methods 1 to 4 and 6 to 7.**

Make every form plain-language, save automatically, allow text and optional image upload, and make repeating rows easy to add/remove.

**Step 4: Build Methods 5 and 8 around one private person record.**

Add people once, link parent/spouse/children, infer generation where possible, and expose contact/address only on Method 8 to owner/admin roles.

**Step 5: Build the administrator member-issue screen.**

Allow active admin users to issue an R-number, membership dates, optional contact email, and initial password. No self-registration, payments, AI, PDF export, printing layout, or family co-editor accounts.

### Task 5: Verify, document, and release

**Files:**
- Modify: `README.md`
- Modify: `docs/10-how-we-work.md` only if the workflow changes

**Step 1: Run static build and lint checks.**

Expected: `npm run build` succeeds without environment secrets.

**Step 2: Run browser checks for public pages and studio configuration fallback.**

Expected: public pages work without Supabase secrets; studio explains that an authorised backend is required instead of falsely saving data.

**Step 3: Run Supabase migration and RLS tests after project credentials are supplied.**

Expected: a member cannot read/write another member's data or media; the admin function returns a one-time initial password.

**Step 4: Commit focused batches and push main without force-push.**

