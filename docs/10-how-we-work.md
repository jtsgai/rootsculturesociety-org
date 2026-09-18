# How Grok and Codex work on this repo

Grok cannot start Codex on the Mac. Codex cannot read the Grok chat.
The shared brain is this GitHub repository.

## Loop

1. Grok writes or updates files under `docs/`.
2. You paste the latest `docs/NN-codex-*.md` into a Codex session whose working copy is this repo.
3. Codex implements, commits, and **pushes to `main`**.
4. You tell Grok “已 push”. Grok reads the repo and writes the next command file.

If Codex only edits local files and never pushes, Grok cannot see the site and cannot steer.

## Rules for Codex

- Always work in `jtsgai/rootsculturesociety-org`.
- Never delete `docs/`.
- After a batch of work: `git add -A && git status`, commit in English or Chinese, `git push origin main`.
- Do not force-push.
- If the site currently lives in another local folder, copy or merge it into this repo first, then push.
