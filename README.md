# LandlordHQ

A mobile-first web app for small landlords (1–20 units) who are tracking
their rentals in a notes app, a spreadsheet, or on paper. One place for the
urgent day-to-day: rent collection, tenant notes, contractors, and receipts.

## Features

- **Today dashboard** — every tenant's rent for the current month, color-coded
  (🟢 paid · 🟡 partial · 🔴 unpaid). One tap marks rent paid; "Partial…"
  records a partial amount. After any payment you're prompted (but never
  forced) to jot a note.
- **Smart notes** — quick-tag chips with keyword suggestions. Tagging a note
  "Air filter replaced" automatically updates the property record
  (*Air filter — last replaced on …*); "New pet" flags the tenant for a pet
  fee. Complaints, requests, and money's-tight notes all build a history you
  can review later.
- **Tenants** — tap a tenant for photo, rent, address, email, and tap-to-call
  buttons for their phone and emergency contact (with a confirmation pop-up
  before the call is placed). Live rent status and full rent history.
- **Properties** — clean record per house: beds/baths, house & lot sq ft,
  year built, foundation (slab/crawlspace/…), construction (brick/wood
  frame/…), fence type, value estimate, last year's tax value, photo, and the
  maintenance record. (County public-record auto-fill is on the roadmap.)
- **Contractors** — save your trusted pros by trade for one-tap calls, plus a
  nearby-contractor view (rating, review count, open-now, services, weekday
  and weekend rate estimates) sorted by availability → rating → price.
  Currently powered by deterministic demo data seeded from your property's
  city; designed for a places/reviews API to be dropped in.
- **Prepare for this call** — describe a problem (typed or voice-dictated)
  and get: immediate safety precautions, a phone script, the top 3 likely
  causes with fixes, parts and labor price estimates, and a fair-price frame
  of reference before you dial. Powered by a built-in knowledge base of the
  most common rental issues; structured so a hosted AI endpoint can replace
  it with the same response shape.
- **Receipt scanner** — snap a photo of a receipt or document; it's
  auto-enhanced (grayscale + adaptive contrast "flatten" like a notes-app
  scan), then filed with amount, tax category, and property for tax time.
- **Onboarding** — a 3-step wizard (address with live autocomplete via
  OpenStreetMap → property details → rent & tenant) gets a first property in
  fast.

## Tech

- React 18 + TypeScript + Vite, React Router
- No backend required: all data persists in `localStorage` on-device
- Installable PWA manifest; mobile-first layout with bottom tab bar that
  becomes a sidebar on desktop — ready to wrap with Capacitor/React Native
  for app stores later

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

## Roadmap hooks

- `src/utils/addressSearch.ts` — swap Nominatim for Google Places/Mapbox
- `src/data/nearbyContractors.ts` — swap demo listings for a live places API
- `src/data/issueKnowledge.ts` — swap keyword matching for a hosted AI call
- Cloud sync/auth so data follows the landlord across devices
