# Frontend

React, TypeScript, Vite, Tailwind CSS, TanStack Query, and Supabase JS power the browser application.

From this directory:

```bash
npm ci
npm run dev
```

With no root `.env`, the application stays in its fictional network-free demo. For connected mode, copy the root `.env.example` to `.env`, provide a new Supabase project's URL and publishable key, and set `VITE_DEMO_MODE=false`.

Checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Never put a provider key or Supabase secret key in a `VITE_` variable; Vite includes those values in the browser bundle.
