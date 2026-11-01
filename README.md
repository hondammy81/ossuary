# Ossuary — a calm, haunted skeleton for small local-first web apps

**Kiroween 2026 · Skeleton Crew category · built with Kiro (spec-driven)**

Ossuary is a lean skeleton — a design system, a versioned local store,
date/streak utilities, and a view shell — plus the Kiro steering, spec,
and hook templates to grow new apps from it. Two complete applications
ship in this repo, both built from the same skeleton:

- **Deadline Crypt** (`apps/deadline-crypt/`) — deadlines that live, die,
  and can be resurrected: a tracker for students and hunters.
- **Ritual** (`apps/ritual/`) — daily practice check-ins whose streaks
  burn as candles: kindling, burning, blazing — and a missed day dims
  the flame without shaming you.

Everything is local-first: no backend, no accounts, no tracking. Your
data lives in your browser, exportable as JSON at any time.

## Layout

```
.kiro/            steering, specs, hooks — how this project is built with Kiro
skeleton/         the reusable template (theme, store, dates, shell)
apps/
  deadline-crypt/ App 1 — built from the skeleton
  ritual/         App 2 — built from the skeleton
```

## Start a new app from the skeleton (10 minutes)

1. Copy `skeleton/` to `apps/<your-app>/`.
2. Copy `.kiro/specs/_template/` to `.kiro/specs/<your-app>/` and write
   your requirements — the design and tasks follow from them.
3. Open the project in Kiro and implement the tasks spec-first.
4. Point the shell at your data model; theme and store come free.

## License

MIT — see [LICENSE](LICENSE).
