# IBM RCS Infrastructure — Frontend

React + TypeScript single-page app containing the full UI shell for all three
personas — every screen in the Normal User, Auditor and Manager Figma
prototypes: public reporting, staff login, Auditor review and wellbeing
flows, and Manager oversight.

- **UI:** IBM Carbon Design System v11 (`@carbon/react`) owns every component;
  Tailwind v4 is used for layout utilities only (no Preflight reset).
- **Routing:** React Router.
- **Data:** every page calls `src/services`, never `fetch` directly (see below).
- **Tests:** Vitest + React Testing Library, jest-axe for accessibility.

## Getting started

```bash
cp .env.example .env   # mock data by default — no backend needed
npm install
npm run dev            # http://localhost:5173
npm run test           # unit, component and accessibility tests
npm run build          # type-check + production build
npm run format         # Prettier
```

## Data sources

`VITE_DATA_SOURCE` picks where the UI's data comes from:

| Value            | What it does                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mock` (default) | Synthetic demo data inside the frontend (`src/services/mock`), following the BA business rules (assignment formula, cooldowns, lookup lockout, etc.). Demo data persists per browser tab. Every header shows a **Demo data** badge so it's never mistaken for live data. |
| `api`            | The real backend at `VITE_API_BASE_URL` (`src/services/api`). Operations with no endpoint yet show a "not connected to the backend yet" notice instead of crashing.                                                                                                      |

**Demo sign-in (mock mode only):** `auditor-1`, `auditor-2` or `manager-1`,
password `testpassword123`.

**Connecting the real backend:** see
[`docs/frontend/BACKEND-INTEGRATION.md`](../docs/frontend/BACKEND-INTEGRATION.md)
for every service operation, the data shape the UI expects, and the Figma
screen that uses it.
