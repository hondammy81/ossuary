# The Ossuary skeleton

Copy these files into a new app folder to start:

| File | What it gives you |
|---|---|
| `theme.css` | The calm-haunted design system: tokens (charcoal, bone, ember), layout, cards, buttons, form controls, the flame component. |
| `store.js` | A versioned store over an injectable backend (localStorage in apps), with JSON export/import and version refusal. |
| `dates.js` | Pure date math: day keys, day diffs, the deadline bucket rule (alive/dying/dead), and streak computation (current/longest/flame). |
| `shell.js` | List/detail page shell + small form helpers. *(Implemented during the first app's build; see the specs.)* |

The skeleton is a **copy**, not a dependency: each app carries its own
files and can diverge. Keep it lean — if a file grows past a few hundred
lines, it stops being a skeleton and starts being a framework.
