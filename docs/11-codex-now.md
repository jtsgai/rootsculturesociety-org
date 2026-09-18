# Codex: do this now

Working repo: `jtsgai/rootsculturesociety-org`.
Read `docs/10-how-we-work.md` and `docs/09-names.md` first.

Grok reviewed the local snippets you produced. GitHub still has **no site code**, only docs. Your job this session is to put the working site on GitHub and fix the review notes.

## 1. Get the site into this repo

If the Astro project is in another folder, merge it here (keep `docs/`). The repo root should contain `package.json`, `src/`, `public/`, `astro.config`.
If it is already this folder, continue.

## 2. Fixes required before you stop

- Homepage three columns are standalone copy (新加坡谱式 / 八大招 / 活着的谱). Do not derive them from `methods.slice(0, 3)`.
- English home exists at `/en/` and mirrors the Chinese home.
- Secretary English name is **Ian Chung** everywhere. No Zhong Junyuan.
- Visual: paper #F6F1EA, ink #1A1412, maroon #8B1A1A. Logo cropped as a circle with no black canvas. No AstroWind blue-purple SaaS leftovers.
- List every route under `src/pages` in your final message (12 ZH + 12 EN).

## 3. Push

```bash
git add -A
git status
git commit -m "Add public pavilion site and apply Grok review fixes"
git push origin main
```

If push needs auth, stop and tell the user. Do not force-push.

## 4. Reply with

- commit SHA
- how to `npm run dev`
- files changed
- any original images still missing
