# Neighborhood Marketplace

A mobile-first PWA for the shops and service people on your street. Retail counters take a one-shop bag. Electricians, plumbers, and home salon profiles only offer Call / WhatsApp. Money never moves through the app — cash or UPI at the counter or doorstep.

## Run locally

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

No Supabase keys are required. Catalog, cart, and the 4-digit pickup PIN all run on mock/local data until `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see `.env.example`).

## What this slice includes

- Neighborhood home with **Shops** vs **Services**
- Store and service profiles
- Add to bag on retail only, one store at a time (Zustand `persist`)
- Place order → offline verification PIN (no Razorpay/Stripe)
- Canonical Postgres + PostGIS schema at `supabase/migrations/20260920_initial_marketplace_schema.sql`

## Stack

Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, Lucide, Zustand.
