# Member Studio Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the working member login into a genuinely simple, private workflow for completing one Photo Genealogy, then add carefully controlled publication, export and optional AI capabilities.

**Architecture:** Retain the static Astro public site and its existing Supabase project. Keep all family records and original media in owner-scoped private tables and Storage. Build member-facing forms as progressively saved Astro/vanilla-JS pages; public stories must go through a separate request, administrator review, and explicitly public copy rather than exposing private book data.

**Tech Stack:** Astro 7, Tailwind CSS 4, TypeScript, vanilla browser JavaScript, Supabase Auth, Postgres, Storage, Row Level Security, Edge Functions, GitHub Pages.

---

## Release order and scope boundary

The releases below are intentionally ordered. A member should not be asked to pay for AI or request a printed/exported book until their core private book, images and lineage are reliable.

| Release | Outcome | Do not include |
|---|---|---|
| A | Eight Methods become usable, structured and private | AI, payments, public publication, PDF generation |
| B | Administrator can maintain memberships; members can request a selected chapter be published | Automatic messaging or public-by-default media |
| C | Members receive a private web preview; PDF export is production-ready | Unreviewed public stories |
| D | Credit-controlled AI assistance | Direct credit-card payment unless separately approved |

## Acceptance rules for every release

- One active member owns exactly one book and cannot view another member's book, media, people, requests or credits.
- Original family media remains private unless a member requests publication and an administrator approves that exact item.
- The public site remains usable if Supabase or an optional provider is unavailable.
- No NRIC, card data, API secret, password, or private contact field enters Git, browser bundles, public HTML, or public Storage.
- Every change is checked with `npm run check:astro`, `npm run build`, a member test account, an administrator test account, and a narrow RLS test before it is pushed to `main`.

### Task 1: Establish a safe baseline and test accounts

**Files:**
- Modify: `README.md`
- Modify: `docs/member-studio-setup.md`
- Create: `docs/member-studio-acceptance-checklist.md`
- Test: manual browser/RLS checklist against the existing Supabase project

**Step 1: Record the release baseline.**

Run:

```bash
git status --short
npm run check:astro
npm run build
```

Expected: no tracked changes unrelated to the release; Astro check and build pass.

**Step 2: Add a non-sensitive acceptance checklist.**

Document separate administrator and member test procedures. Use only disposable test members. Never place actual passwords, emails, phone numbers or Supabase keys in the checklist.

**Step 3: Verify the current security boundary.**

As member A, confirm member B's `genealogy_books`, `studio_sections`, `people`, Storage prefix, AI wallet and exports cannot be read or written. As the administrator, confirm the two member records can be read but plaintext passwords cannot be retrieved.

**Step 4: Commit.**

```bash
git add README.md docs/member-studio-setup.md docs/member-studio-acceptance-checklist.md
git commit -m "docs: add member studio acceptance checklist"
```

### Task 2: Add a durable private media model

**Files:**
- Create: `supabase/migrations/20260920_studio_media.sql`
- Modify: `src/lib/studio.ts`
- Create: `src/lib/studio-media.ts`
- Create: `src/components/studio/MediaPicker.astro`
- Modify: `src/scripts/studio-step.ts`
- Modify: `src/pages/studio/[step].astro`
- Modify: `src/assets/styles/tailwind.css`
- Test: `src/lib/studio-media.test.ts` or the project's chosen browser test harness

**Step 1: Write the failing media ownership tests.**

Cover these cases: accepted JPG/PNG/WebP under 10 MB uploads to the owner's prefix; unsupported files fail before upload; an owner can list and remove only their own media; another member cannot obtain a signed URL.

**Step 2: Add `studio_media`.**

Store `id`, `book_id`, `member_id`, `method`, `storage_path`, `caption`, `kind`, dimensions, creation time and optional `approved_public_path`. Enable RLS. Keep `genealogy-media` private and owner-scoped.

**Step 3: Implement upload, listing, caption and removal helpers.**

Use the existing `uploadImage()` constraints as the single validation source. Produce time-limited signed URLs for private preview; do not use public URLs.

**Step 4: Build one reusable image picker.**

The component must use plain Chinese labels, show upload progress, preview, caption, remove action and an accessible error state. It must work on a narrow phone screen without hiding the existing saved text.

**Step 5: Add image slots to the relevant steps.**

Method 1: one cover image. Methods 2–4 and 6–7: optional supporting images. Method 5: optional person portrait. Do not expose the Method 8 phone/address data through images or captions.

**Step 6: Verify and commit.**

```bash
npm run check:astro
npm run build
git add supabase src/lib src/components/studio src/scripts src/pages/studio src/assets/styles/tailwind.css
git commit -m "feat: add private genealogy media"
```

### Task 3: Replace generic notes with a true Eight Methods workflow

**Files:**
- Modify: `src/data/studio.ts`
- Modify: `src/pages/studio/[step].astro`
- Modify: `src/scripts/studio-step.ts`
- Modify: `src/lib/studio.ts`
- Create: `src/components/studio/RepeatingRows.astro`
- Modify: `src/assets/styles/tailwind.css`
- Test: browser tests for each method's required field and save/reload behavior

**Step 1: Specify the persisted JSON schema before changing forms.**

Maintain backwards-compatible reads for existing generic `notes` data. Write a small versioned shape for each method so a saved book never loses information when fields are improved.

**Step 2: Implement Method 1 — Cover.**

Required: book title, first Singapore-settling ancestor, consent. Optional: dialect group, ancestral place, dedication and cover image. Save to `genealogy_books` plus Method 1's section record.

**Step 3: Implement Methods 2–4.**

- Method 2: surname origin, ancestral place, family source/narrative, supporting images.
- Method 3: repeatable migration rows containing place, year (optional), story and attached images.
- Method 4: dialect, hall name, ancestral home, temple, clan association and notes.

Each row needs add, edit, remove, saved-state feedback and a sentence explaining that imperfect family memory is welcome.

**Step 4: Implement Methods 6–7.**

- Method 6: repeatable childhood timeline rows containing year/range, Singapore place, memory and images.
- Method 7: repeatable dish cards containing dish name, ingredients, method, the person/source who taught it, memory and image.

**Step 5: Verify each module.**

For every method, create data, reload, edit, remove one repeating row, and reload again. Confirm pressing “complete” only changes the progress state; it never locks editing.

**Step 6: Commit.**

```bash
git add src/data/studio.ts src/pages/studio/[step].astro src/scripts/studio-step.ts src/lib/studio.ts src/components/studio src/assets/styles/tailwind.css
git commit -m "feat: structure the eight genealogy methods"
```

### Task 4: Make Method 5 and Method 8 a practical lineage system

**Files:**
- Create: `supabase/migrations/20260920_person_relationships.sql` only if the existing parent/spouse columns cannot express the needed links safely
- Modify: `src/lib/studio.ts`
- Modify: `src/pages/studio/[step].astro`
- Modify: `src/scripts/studio-step.ts`
- Create: `src/components/studio/LineageCanvas.astro`
- Modify: `src/assets/styles/tailwind.css`
- Test: member A and member B lineage/RLS test cases

**Step 1: Decide the relationship representation.**

Prefer the existing `father_id`, `mother_id` and `spouse_id` fields if they support the required relationships. Add a separate relationship table only for relationships that cannot be represented without ambiguity. Do not duplicate both models.

**Step 2: Build clear person editing.**

Members must be able to add, edit and remove their own person records; add father, mother and spouse from existing private records; and see children inferred from parent links. Generation should be suggested from a selected parent but editable.

**Step 3: Build a readable relationship view.**

Show cards and lines rather than a dense traditional chart. The view must remain usable on mobile through horizontal panning or a stacked family view. A person with no relationship stays visible without error.

**Step 4: Keep sensitive fields in Method 8 only.**

Method 8 may edit occupation, education, phone and address. The Method 5 page must never fetch or render phone/address. Confirm this in the browser and via a direct Supabase query as a normal member.

**Step 5: Commit.**

```bash
git add supabase/migrations src/lib/studio.ts src/pages/studio/[step].astro src/scripts/studio-step.ts src/components/studio src/assets/styles/tailwind.css
git commit -m "feat: add private lineage relationships"
```

### Task 5: Refine the member journey and membership lifecycle

**Files:**
- Modify: `src/pages/studio/index.astro`
- Modify: `src/scripts/studio-dashboard.ts`
- Modify: `src/pages/admin/members.astro`
- Modify: `src/scripts/admin-members.ts`
- Modify: `src/lib/admin.ts`
- Modify: `supabase/functions/admin-members/index.ts`
- Modify: `src/assets/styles/tailwind.css`
- Test: active, expired and suspended member scenarios

**Step 1: Improve dashboard guidance.**

Show the next unfinished step, an honest completion count, last saved time and one visible “continue” action. Do not claim a book is complete merely because a text box is non-empty.

**Step 2: Add administrator membership actions.**

Add controlled actions to change end date, suspend/reactivate a member, and filter upcoming expiries. Include confirmation copy that explains the effect; retain audit logs. Do not send messages automatically in this release.

**Step 3: Enforce expiry consistently.**

The existing RLS date check is the authority. The user interface should explain suspended/expired status and preserve read access according to the agreed data-retention policy. It must not silently destroy content.

**Step 4: Verify password and account flow.**

Confirm create/reset passwords are eight characters with letters and digits, first login requires a change, and an old password fails immediately after reset.

**Step 5: Commit.**

```bash
git add src/pages/studio/index.astro src/scripts/studio-dashboard.ts src/pages/admin/members.astro src/scripts/admin-members.ts src/lib/admin.ts supabase/functions/admin-members/index.ts src/assets/styles/tailwind.css
git commit -m "feat: manage membership lifecycle"
```

### Task 6: Build explicit story-publication requests and review

**Files:**
- Create: `src/pages/studio/publish.astro`
- Create: `src/scripts/studio-publish.ts`
- Create: `src/pages/admin/stories.astro`
- Create: `src/scripts/admin-stories.ts`
- Create: `supabase/functions/story-review/index.ts`
- Modify: `src/lib/member-publication.ts`
- Modify: `src/components/PublicPage.astro`
- Modify: `src/assets/styles/tailwind.css`
- Modify: `docs/member-studio-setup.md`
- Test: public/private content and approved-media tests

**Step 1: Define the consent boundary.**

A member selects one completed method, enters a public title and summary, chooses only specific images, and confirms they have the right to publish. The original private section and media remain unchanged.

**Step 2: Add a member request page.**

Show a preview of exactly what will be requested, not the whole book. Permit withdrawal while the request is pending.

**Step 3: Add the administrator review queue.**

The administrator can approve, return with a private reason, or reject. Approval must create a separately public story payload and copy only explicitly approved media to a dedicated public-story location. It must never make the private media bucket public.

**Step 4: Render only approved stories on the public site.**

Use a read-only published-story endpoint or anonymous RLS policy that returns only reviewed, published fields. Escape text and validate image paths before display.

**Step 5: Verify and commit.**

```bash
git add src/pages/studio/publish.astro src/scripts/studio-publish.ts src/pages/admin/stories.astro src/scripts/admin-stories.ts supabase/functions/story-review src/lib/member-publication.ts src/components/PublicPage.astro src/assets/styles/tailwind.css docs/member-studio-setup.md
git commit -m "feat: add reviewed public story requests"
```

### Task 7: Deliver private preview first, then PDF export

**Files:**
- Create: `src/pages/studio/preview.astro`
- Create: `src/scripts/studio-preview.ts`
- Modify: `src/lib/member-publication.ts`
- Create: `supabase/functions/book-export/index.ts`
- Modify: `src/pages/studio/index.astro`
- Modify: `src/scripts/studio-dashboard.ts`
- Modify: `docs/member-studio-setup.md`
- Test: export authorisation and content-completeness cases

**Step 1: Build an in-app private web preview.**

Render the member's own saved book directly from private data. The preview must use signed media URLs and must never be crawlable or reachable from a public link.

**Step 2: Add export readiness checks.**

Show exactly which essential fields are missing. Members may still preview incomplete drafts, but a final export request should identify incomplete sections rather than hide them.

**Step 3: Choose a PDF renderer before implementing it.**

Decide whether the renderer is a dedicated server, a managed browser-rendering service, or a manually operated admin queue. Record the provider, operating cost, data-processing location and deletion rules before private media is sent anywhere.

**Step 4: Implement asynchronous export only after that decision.**

The worker changes `book_exports` from queued to running/ready/failed, places the generated file in private Storage, and returns a short-lived download URL only to the book owner/admin.

**Step 5: Commit preview separately from PDF export.**

```bash
git commit -m "feat: add private book preview"
git commit -m "feat: add private PDF export worker"
```

### Task 8: Activate AI only after a provider and credit policy are approved

**Files:**
- Modify: `supabase/functions/ai-assist/index.ts`
- Modify: `src/lib/ai.ts`
- Create: `src/components/studio/AiAssist.astro`
- Modify: `src/pages/studio/[step].astro`
- Modify: `src/pages/studio/index.astro`
- Modify: `src/scripts/studio-dashboard.ts`
- Modify: `docs/member-studio-setup.md`
- Create: `docs/ai-provider-and-credit-policy.md`
- Test: disabled-provider, insufficient-credit and provider-failure tests

**Step 1: Approve a provider policy before keys are added.**

Set the provider, which task types are allowed, maximum input size, retained data period, per-task credit cost, member-facing wording, manual refund policy and whether generated results are private by default. Do not put a key in the repository or GitHub Pages.

**Step 2: Keep the disabled state safe.**

Verify `AI_PROVIDER=disabled` consumes zero credits and leaves no paid request pending.

**Step 3: Implement one feature at a time.**

Recommended order: prompt helper, research helper, cover-image suggestion, then old-photo restoration. Each result must be editable/reviewable, private by default and never overwrite an original upload.

**Step 4: Add administrator credit operations before purchases.**

The existing ledger supports grants and adjustments. Make credit grants auditable in the admin interface. Do not add checkout until payment, refunds and accounting requirements are separately approved.

**Step 5: Commit.**

```bash
git add supabase/functions/ai-assist src/lib/ai.ts src/components/studio src/pages/studio src/scripts/studio-dashboard.ts docs/member-studio-setup.md docs/ai-provider-and-credit-policy.md
git commit -m "feat: add metered AI assistance"
```

### Task 9: Release verification and operations handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/member-studio-setup.md`
- Modify: `docs/10-how-we-work.md` only if the release workflow changes
- Modify: `docs/member-studio-acceptance-checklist.md`

**Step 1: Run static and browser checks.**

```bash
npm run check:astro
npm run build
```

Expected: both pass; the public pages work without private credentials present in the repository.

**Step 2: Run member and administrator acceptance journeys.**

Member: login, change initial password, complete all eight methods, upload/remove media, edit a person, update Method 8, request one public chapter, sign out and sign back in. Administrator: provision/reset, amend dates/status, inspect audit records, review a story, and verify the member cannot see admin controls.

**Step 3: Check privacy and retention.**

Confirm no private contact field appears in public HTML, generated preview, exported file, public story or logs. Document the agreed 24-month retention action for lapsed memberships before any automated deletion is introduced.

**Step 4: Release focused commits.**

```bash
git pull --rebase origin main
git push origin main
```

Expected: GitHub Pages workflow succeeds. Verify the deployed commit and the member login route after deployment.

## Recommended immediate next release

Start with **Tasks 2–4** as one controlled Release A: private image handling, structured Eight Methods forms, and usable lineage links. This produces the core value promised to a paid member without requiring a third-party AI provider, a public publishing workflow or a payment system.
