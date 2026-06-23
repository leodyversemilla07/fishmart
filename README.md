# Fishmart

Fishmart is an Expo Router mobile marketplace for guppy breeders and aquatic hobbyists, backed by Convex for data, auth sessions, uploads, chat, orders, and payments.

## Stack

- Expo SDK 54 / React Native
- Expo Router
- Convex
- React Native Paper
- Zustand
- Jest

## Project Layout

- `app/`: Expo Router screens
- `components/`: shared UI and feature components
- `convex/`: schema, queries, mutations, actions, and HTTP webhooks
- `store/`: local Zustand state
- `utils/`: app-side helpers such as uploads
- `docs/`: product and architecture notes

## Requirements

- Node.js 18+
- npm
- A Convex deployment
- PayMongo credentials for online payments

## Environment

Create `.env.local` with at least:

```env
EXPO_PUBLIC_CONVEX_URL=your_convex_url
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_WEBHOOK_SECRET=your_paymongo_webhook_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Fishmart <no-reply@your-domain.com>"
PASSWORD_RESET_URL_BASE=fishmart://forgot-password
```

`EXPO_PUBLIC_CONVEX_URL` is required by both the app client and upload helper. `RESEND_API_KEY` powers password-reset emails from Convex; configure `RESEND_FROM_EMAIL` with a verified Resend sender before production.

## Development

Install dependencies:

```bash
npm install
```

Run Convex codegen/dev server:

```bash
npm run convex:dev
```

Start the Expo app:

```bash
npm run start
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
```

## Notes

- Online payments are handled through PayMongo checkout sessions plus a Convex webhook endpoint at `/webhooks/paymongo`.
- Local auth uses a lightweight session token stored in the app and validated server-side in Convex.
- The repository may not include `node_modules`; install dependencies before running lint, tests, or typecheck.
