---
name: start-new-app
description: "Start a new Ossuary app from the skeleton: copies the skeleton files into apps/<name>/, scaffolds the feature spec from .kiro/specs/_template/, and lists the first implementation tasks. Use when asked to start, scaffold, or create a new app in this project."
---

# Start a new Ossuary app

1. Ask for the app name (kebab-case) and a one-sentence purpose if not
   already given. Do not invent a purpose.
2. Copy `skeleton/theme.css`, `skeleton/store.js`, and
   `skeleton/dates.js` into `apps/<name>/`.
3. Create `.kiro/specs/<name>/` from `.kiro/specs/_template/`,
   replacing `<feature name>` with the app name. Draft Requirement 1
   from the stated purpose in EARS format (WHEN … THE SYSTEM SHALL …)
   and stop for the user's review before writing design/tasks.
4. Remind the user of the non-negotiables from steering: local-first
   (no backend/accounts), pure logic in the model layer with tests,
   calm presentation with no shame mechanics.
5. Report what was created and the first task from tasks.md.
