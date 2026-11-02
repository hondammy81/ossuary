---
inclusion: always
---

# Structure — Ossuary

```
.kiro/                 steering, specs, hooks, skills (never gitignored)
skeleton/              the reusable template (theme.css, store.js, dates.js, shell.js)
apps/
  deadline-crypt/      App 1 — index.html, app.js, model.js
  ritual/              App 2 — index.html, app.js, model.js
  pantry-ghost/        App 3 — index.html, app.js, model.js
```

Rules:
- Each app is self-contained: it carries its own copy of the skeleton
  files it uses (copied at creation, per `skeleton/README` intent —
  Skeleton Crew judges the template, so apps must not depend on a
  shared parent folder at runtime).
- Per-app layout: `model.js` (pure logic over the store + dates),
  `app.js` (DOM wiring only), `index.html` (shell + theme).
- Specs live in `.kiro/specs/<feature>/` as requirements.md, design.md,
  tasks.md. An app's code change starts from its spec's tasks.
- New apps start from `.kiro/specs/_template/` and the
  `start-new-app` skill in `.kiro/skills/`.
