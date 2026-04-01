# Parts App

Parts web frontend for Ops Hub.

This app is separate from `ops-hub` on purpose:
- `ops-hub` stays the backend, workflow engine, and shared API surface
- `parts-app` is the case-first UI for ordering, ETA/tracking, receipt, and handoff to dispatch

## Current tabs

- `Board`
- `Cases`
- `Requests`

## Environment

Copy `.env.example` to `.env.local` and set:

- `VITE_OPS_HUB_API_BASE`
- `VITE_OPS_HUB_API_TOKEN`
- `VITE_PARTS_USER_ID`

## Local development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```
