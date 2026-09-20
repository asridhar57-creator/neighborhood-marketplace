# Neighborhood Marketplace

A mobile-first PWA for shops and service people in Madhapur. Retail counters take a one-shop bag. Electricians, plumbers, and home salon profiles only offer Call / WhatsApp. Money never moves through the app — cash or UPI at the counter or doorstep.

## Run locally

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

No Supabase keys are required. Catalog, cart, and the 4-digit pickup PIN all run on mock/local data until `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see `.env.example`). Never commit `.env.local`.

## What this slice includes

- Home hero, sticky category chips, featured product cards
- Store and service profiles with WhatsApp share (`wa.me/?text=` + `encodeURIComponent`)
- Add to bag on retail only, one store at a time (Zustand `persist`)
- Amazon/Swiggy store-switch bottom sheet
- Place order → 4-digit PIN persisted in `localStorage` (`neighborhood-active-order`) and a sticky tracker pill on buyer screens
- Merchant counter at `/counter` verifies PIN (IP rate-limit + 3-strike lockout)
- Become a seller sheet: auth first, then shop insert with `ST_MakePoint(lng, lat)`
- Canonical Postgres + PostGIS schema under `supabase/migrations/`

## Stack

Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, Lucide, Zustand.
