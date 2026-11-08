# Build log

## 2026-11-08: first release, session 1

**Inspection**
- Working folder: empty git repo, remote `homielea/ENDLY` (empty, created 2026-11-08,
  description "life end app"). No CLAUDE.md/AGENTS.md. Searched Lea's repos for
  Endly/Andly/Continuum: only `homielea/ENDLY` matches.
- `homielea/ENDLY` is **public**. The brief requires private source, so nothing was pushed
  before Lea decides (see HANDOFF.md).
- ChatGPT prototype at endly-family-conversations.homielea.chatgpt.site: blocked by the
  session's network proxy (403). Nothing was imported from it; this version is built from the brief.
- No Vercel/Netlify credentials in the environment. Deployment uses a private claude.ai Artifact.

**Built**
- Vite + vanilla TypeScript app, no runtime dependencies (≈41 KB single HTML file).
- Content for 3 paths × 4 steps, wishes (5 sections), preparation notes (5 categories × 3 fields).
- Autosave to localStorage key `endly.v1` with status line; unreadable saved data is set aside
  under `endly.v1.unreadable` instead of being overwritten.
- Summary page, Markdown export, print stylesheet, in-page delete confirmation.

**Tests**
- `npm test`: 9 unit tests (state round-trip, malicious/unknown fields, corrupt data, delete,
  blocked storage, summary labels, Markdown escaping). All pass.
- `npm run e2e`: 15 browser checks against the production build. All pass.

**Failures seen and fixed**
- e2e selectors "Back" and "Next step" also matched "Pause and come back later" and
  "Record next steps". Switched to exact matches (test-only issue).
- Preview server outlived the test run (killing `npx` left vite alive). Now spawned directly
  with node and stopped on exit.
- Phone header had ~100px of empty space under the nav (flex column + wrap). Switched to grid.
- First path card had a gap above its step list; card buttons wrapped awkwardly. Fixed layout;
  buttons now read "Begin"/"Resume" with the path name for screen readers.

**Deployment**
- Published `dist/artifact.html` as a private claude.ai Artifact:
  https://claude.ai/artifact/WvuT22XgnbTdBBGRufTacX (version 1). Read back and confirmed identical.
- Added e2e check that loads the Artifact build inside an iframe: Print/Download hidden,
  copy available, notes and last view restored in a fresh frame with no hash. 16/16 pass.

**Next action**: Lea decides on repository visibility so the source can be pushed.
