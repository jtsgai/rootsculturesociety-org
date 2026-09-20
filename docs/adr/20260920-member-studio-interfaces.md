# ADR: Member studio publication and AI interfaces

## Status

Accepted for the first member-system implementation; provider and payment integrations remain disabled.

## Decision

Keep the existing Astro site and Supabase member studio. Add database interfaces for:

- one private genealogy book per member;
- member-only editing in the first version;
- both a private web preview record and a PDF export record;
- chapter-level publication requests, with an explicit consent timestamp and a separate public-story row;
- a per-member AI credit wallet, immutable credit ledger, and AI job record;
- a server-side Edge Function boundary for all future AI provider calls.

The browser may request an AI task through the Edge Function, but provider keys and adapters stay server-side. Until an adapter is explicitly enabled, requests fail closed and do not reserve or consume credits.

## Rationale and trade-offs

This preserves private-by-default family data while leaving a clear path for a member to publish only selected chapters. A credit ledger makes future grants, purchases, refunds, and consumption auditable, while the separate job table allows asynchronous providers and retries later. The trade-off is that export workers, moderation/review, payment, and provider adapters still need a later operational phase.

## Failure and privacy boundaries

- RLS keeps books, sections, people, media, wallets, jobs, and exports member-owned or administrator-only.
- Public story rows are readable anonymously only after their status is `published`.
- AI provider keys never enter browser bundles, GitHub Pages, `.env`, or Git.
- A disabled or unknown provider cannot consume member credits.
