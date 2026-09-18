# Codex brief — build the public pavilion first

Read every file in `/docs` before writing code. Do not invent membership payment, AI generation, or a member studio in this pass.

## Starter (locked)

Use **AstroWind** (Astro 7 + Tailwind CSS 4) as the engineering starter:
https://github.com/onwidget/astrowind
Demo (do not copy the look): https://astrowind.vercel.app/

Scaffold into this repo (or replace the placeholder README-only tree). Then immediately restyle. AstroWind is chosen for widgets, i18n-friendly structure, and agent skills (`AGENTS.md`). It must not ship looking like a startup landing page.

Restyle rules:
- Delete / do not use default blue-indigo gradients, SaaS pricing tables, newsletter popups, fake testimonials, client-logo clouds, and “Get started free” buttons.
- Keep useful widgets only: Header, Footer, Hero, Features (three columns for the three method points), Content, Team (committee names, no stock avatars unless real photos exist), Blog-like list can become Events / Publications.
- Palette, type, and homepage copy must follow this brief and `docs/05-homepage-copy.md`.

## Goal

Bilingual public site for Roots Culture Society of Singapore.
Domain later: rootsculturesociety.org
Phase 1 = public pages only. Studio / login is Phase 2.

## Design north star

Look like a 2026 cultural institute.

Live references:
1. https://www.nordiskamuseet.se/en/
2. https://www.heide.com.au/
3. https://www.singaporeccc.org.sg/

Forbidden: red-gold temple borders, stock sliders, clipart icon rows, neon SaaS gradients, neo-brutalist acid green.

## Visual system

- Accent: deep maroon from the seal (~#8B1A1A)
- Ground: warm paper (#F6F1EA)
- Text: ink (#1A1412)
- Headlines: Newsreader or Source Serif + Noto Serif SC
- UI/body: Geist or Inter + Noto Sans SC
- Logo: `public/brand/RCSSLogo.png` — crop to circle, drop the black canvas
- Motion: minimal; honor prefers-reduced-motion

## Pages

See `docs/02-site-map.md`. ZH at `/`, EN at `/en/`.
Homepage copy: `docs/05-homepage-copy.md`
Membership CTA exactly: 请 WhatsApp 秘书长办理入会 — 9272 8933. Also ianchungcy@gmail.com. No payment UI.

## Images

Use originals when they exist (logo, book covers). Generate only restrained documentary stills if a page would otherwise be empty. Never invent ancestor portraits. Never publish the Zhong Kaizeng family photos or manuscript address tables.

## Out of scope

Login, database, checkout, AI add-ons, studio routes.

## Done when

`npm run build` succeeds; language switch and mobile nav work; footer shows UEN T17SS0170F and 95 Jalan Lokam; README explains local preview.
