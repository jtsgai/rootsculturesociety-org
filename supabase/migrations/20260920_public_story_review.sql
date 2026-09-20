-- Store a private administrator note for publication review.
-- The note is never selected by the anonymous published-story query.

alter table public.public_story_sections
  add column if not exists review_note text;
