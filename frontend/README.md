# IBM RCS Infrastructure — Frontend

React + TypeScript single-page app for the Sprint 2 P0 flows: public
reporting (upload, case ID, status lookup), staff login, the Auditor review
flow, and the Manager scaffold.

- **UI:** IBM Carbon Design System v11 (`@carbon/react`) owns every component;
  Tailwind v4 is used for layout utilities only (no Preflight reset).
- **Routing:** React Router.
- **Tests:** Vitest + React Testing Library.

## Getting started

```bash
cp .env.example .env   # points at the shared test backend
npm install
npm run dev            # http://localhost:5173
npm run test           # unit + component tests
npm run build          # type-check + production build
```

The test backend's CORS policy only allows `http://localhost:5173`, so keep
the dev server on that port.
