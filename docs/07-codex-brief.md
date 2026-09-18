# Codex brief — build the public pavilion first

Read every file in `/docs` before writing code. Do not invent membership payment, AI generation, or a member studio in this pass.

## Goal

Ship a bilingual public site for Roots Culture Society of Singapore on this repo.
Domain later: rootsculturesociety.org
Phase 1 = public pages only. Studio / login is Phase 2.

## Stack

- Astro 6 or 7 + Tailwind CSS 4
- Static output, ready for GitHub Pages or Cloudflare Pages
- Chinese default at `/`, English at `/en/`
- No WordPress, no Bootstrap theme shop look

## Design north star (do not copy chrome ornaments)

Look like a 2026 cultural institute, not a clan-association flyer and not a SaaS landing page.

Primary live references (open these):
1. https://www.nordiskamuseet.se/en/ — cultural history, large type, image-led, calm
2. https://www.heide.com.au/ — contemporary museum, generous space, strong photography
3. https://www.singaporeccc.org.sg/ — Singapore official Chinese culture, bilingual institution tone

2026 template DNA to steal structurally (not visually clone):
- Astro Northframe / editorial portfolio pattern: case-study blocks, quiet scroll, local MD/MDX content
- AstroWind widgets only if restyled; do not keep its startup look
- Forbidden: red-gold temple borders, stock slider, three-column icon row with clipart, neon SaaS gradients, neo-brutalist acid green

## Visual system

- Accent: deep maroon from the official seal (sample around #8B1A1A / #7A1C1C)
- Ground: warm off-white / paper (#F6F1EA), ink text (#1A1412)
- Type: one sharp grotesque for UI + one refined serif for headlines (e.g. Newsreader / Source Serif + Geist / Inter). Chinese: Noto Serif SC for headlines, Noto Sans SC for body.
- Logo: `public/brand/RCSSLogo.png` — crop to circle, hide black canvas, no drop-shadow clutter
- Motion: little. Fade/slide on scroll only. Honor prefers-reduced-motion.
- Layout: full-bleed image or large wordmark hero; then short manifesto; then three methods; then publications; then join.

## Pages to build

See `docs/02-site-map.md`. Every public page needs ZH + EN.

Homepage copy: `docs/05-homepage-copy.md`
Membership CTA exactly: 请 WhatsApp 秘书长办理入会 — 9272 8933. Also ianchungcy@gmail.com. No PayNow UI.

## Images

- Prefer real assets in the local source folder if present: logo, book covers, committee slide.
- Crop / colour-correct / compress those originals.
- If a page needs an atmospheric image and no original exists, generate a restrained documentary still (paper, tree roots, old street, family table) — never fake portraits of named ancestors, never stock “Asian family smiling at camera” clichés.
- Do not publish the Zhong Kaizeng sample family photos or the hand-manuscript name/address tables.

## Out of scope this pass

Login, database, S$99 checkout, AI writer, AI video, member studio routes, GitHub org migration.

## Done when

- `npm run build` succeeds
- Language switch works on every page
- Mobile nav works
- Footer shows UEN T17SS0170F and 95 Jalan Lokam
- README explains how to preview locally
