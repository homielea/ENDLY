# Endly: product context and development guide

## Product
Endly helps families prepare for difficult conversations about aging, end of life, wishes,
inheritance, and generational handover. It should feel warm, thoughtful, and manageable:
one question at a time, permission to pause, small next steps.

Primary users: adult children preparing to talk with parents; older adults documenting
their wishes; families navigating business succession.

## Non-negotiables (product)
- Prototype: always visibly labelled; ask people to use sample information.
- Prepared prompts only. Never present them as a live counsellor or AI.
- No legal, medical, or financial advice; no jurisdiction-specific claims. Notes are not a
  will, power of attorney, or care directive.
- Never send messages or legacy notes anywhere. No uploads, no "vault"/"encrypted" claims.
- No streaks, countdowns, guilt, or pressure to finish. Declining or changing your mind is valid.
- Finishing or moving past a step must never imply that the family agrees.
- Keep "My own reflections", "What we agreed together", "Still open, to revisit" distinct.

## Stack
- Vite + vanilla TypeScript, no runtime dependencies. Dev deps: vite, vitest, typescript, jsdom.
- `src/content.ts`  all prepared questions, wish fields, preparation categories.
- `src/store.ts`    state shape, localStorage key `endly.v1`, defensive `normalize()`.
- `src/summary.ts`  one summary structure feeding both the on-screen summary and Markdown export.
- `src/main.ts`     views, routing (plain `#name` hashes), autosave, focus management.
- `src/dom.ts`      `h()` element builder. User text enters the DOM only as text nodes / values.
  Never use `innerHTML` with user data.
- `scripts/inline.mjs` turns the build into `dist/index.html` (single file, any static host)
  and `dist/artifact.html` (same, without document skeleton, for a claude.ai Artifact).

## Hosting constraints (claude.ai Artifact)
The app is deployed as a private claude.ai Artifact. Inside that frame `window.print()`,
downloads, and `confirm()` do nothing, and hashes must be plain `#name`. So:
- Confirmations are in-page. Print/Download buttons show only when not framed; Copy always works
  and falls back to selecting the text.
- Hash routes: `#home #family #legacy #succession #wishes #preparation #summary #your-data`.

## Commands
```bash
npm install
npm run dev        # local dev server
npm run check      # typecheck + unit tests + build + browser e2e
```
`npm run e2e` needs Playwright with Chromium available (`require('playwright')`), and a build.

## Working loop
Read TASKS.md, pick the highest-priority open task, define an acceptance check, implement one
increment, run `npm run check`, commit, then update TASKS.md, BUILD_LOG.md, HANDOFF.md.
If something fails three times, record it as a blocker and move to an independent task.
