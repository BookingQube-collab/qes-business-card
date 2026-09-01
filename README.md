# QES Business Card Leads

Booth lead capture for **Qatar Event Show 2026 · Booth D14**.

## Stack

- Next.js App Router + TypeScript + Tailwind + lucide-react
- Supabase (Postgres, Storage, Auth) for Phase 2 production data
- OpenAI Vision OCR via `POST /api/business-card/extract`
- Deploy target: Vercel

## Run locally

```bash
npm install
cp .env.example .env.local   # fill values for Phase 2
npm run dev
```

Without Supabase env vars the app runs in **local demo mode** (in-memory mock leads + simulated OCR).

```bash
npm run lint
npm run build
```

## Phase 2 setup checklist

### 1. Supabase project

1. Create a project and copy **Project URL** + **anon key** + **service role key** into `.env.local`.
2. Run migrations in the SQL editor (or Supabase CLI):
   - `supabase/migrations/001_create_leads.sql`
   - `supabase/migrations/002_storage_policies.sql`
3. Auth → create staff users manually (email/password). Disable public signup.
4. Confirm private Storage bucket `business-cards` exists with the policies from migration 002.

### 2. OpenAI

Set `OPENAI_API_KEY` in `.env.local` / Vercel. OCR never invents fields and never sets interest / priority / owner.

### 3. Vercel

Add the same env vars:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Deploy the App Router project. Staff sign in at the auth gate; capture compresses images client-side, extracts via the API route, then uploads to private storage and inserts a lead row.

### 4. App behavior notes

- Times & “Today” stats use **Asia/Qatar**
- Duplicate warning on matching email or phone
- Capture form draft in `sessionStorage`
- Card images use lazy signed URLs when opening lead details
- Capture homepage uses the instrumentation / sci-fi scanner UI (CSS keyframes only; no WebRTC)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
