# ARI Lottery

Production-ready React + Vite authentication shell for ARI Lottery.

For production deployment, see [docs/deployment.md](C:/Users/dell/OneDrive/Documents/ari-lottery/docs/deployment.md).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Supabase project credentials:

   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   VITE_API_BASE_URL=https://ari-lottery.onrender.com
   VITE_DEMO_AUTH_DISABLED=true
   VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
   VITE_DEMO_USER_EMAIL=demo@arilottery.local

   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   SUPABASE_URL=https://colsiffyvziuydfldaij.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DEMO_AUTH_DISABLED=true
   DEMO_USER_ID=00000000-0000-4000-8000-000000000001
   DEMO_USER_EMAIL=demo@arilottery.local
   CRON_SCHEDULE="0 0 */3 * *"
   ADMIN_API_KEY=change_me_for_manual_draws
   CLIENT_URL=https://ari-lottery.vercel.app
   CLIENT_URLS=https://ari-lottery.vercel.app
   PORT=4242
   ```

3. Run the payment API:

   ```bash
   npm run server
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

   On Windows PowerShell, if `npm` is blocked by script execution policy, use:

   ```bash
   npm.cmd run dev
   ```

## Routes

- `/auth` - email/password login and signup when demo auth is disabled
- `/dashboard` - dashboard shell
- `/tokens` - token balance and token history
- `/transactions` - Stripe payment history
- `/profile` - account profile and read-only settings
- `/buy` - Stripe Checkout token purchase page

## Demo Auth Bypass

Client demo mode is currently enabled with:

```bash
VITE_DEMO_AUTH_DISABLED=true
DEMO_AUTH_DISABLED=true
```

In this mode, the frontend skips Supabase login/signup and uses a demo user. The
backend assigns that demo user to Stripe Checkout metadata and serves dashboard,
token, transaction, and draw data through service-role demo endpoints. This keeps
RLS policies unchanged and makes the bypass reversible.

To restore Supabase authentication, set both flags to `false`, restart Vite and
the API, and use the `/auth` flow again.

## Payment Flow

In demo mode, the `/buy` page sends only the token quantity to
`POST /create-checkout-session`; the backend assigns the demo user ID. With demo
mode disabled, the authenticated Supabase user ID is sent again. Stripe Checkout
handles payment and redirects successful payments back to `/dashboard`.

## Webhook Token Minting

1. Run [supabase/schema.sql](C:/Users/dell/OneDrive/Documents/ari-lottery/supabase/schema.sql) in the Supabase SQL editor.
2. Add backend-only secrets to `.env`:

   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   SUPABASE_URL=https://colsiffyvziuydfldaij.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. For local Stripe webhook testing:

   ```bash
   stripe listen --forward-to localhost:4242/webhook
   ```

4. Restart the API:

   ```bash
   npm run server
   ```

Successful `checkout.session.completed` events are verified with Stripe, then
processed by the Supabase `process_completed_checkout` function. The database
uses a unique `stripe_payment_id` plus a PostgreSQL sequence to prevent duplicate
minting and duplicate token numbers under concurrent webhook delivery.

## Lottery Engine

The backend starts a `node-cron` scheduler when `SUPABASE_SERVICE_ROLE_KEY` is
configured. By default it runs every three days:

```bash
CRON_SCHEDULE="0 0 */3 * *"
```

For local testing, run it every minute:

```bash
CRON_SCHEDULE="*/1 * * * *"
```

The draw engine:

- fetches all `active` lottery tokens
- selects one winning token with `crypto.randomInt`
- finalizes the draw through the Supabase `finalize_lottery_draw` RPC
- stores `lottery_draws` and `winners` records
- splits the pool as 50% ARI fund, 35% winner, 15% platform
- marks all active tokens as `used`

Amounts are stored as integer cents. The database RPC uses a PostgreSQL advisory
lock, so webhook token minting and lottery draws cannot overlap.

Manual local draw:

```bash
npm run server
curl -X POST http://localhost:4242/run-lottery
```

Manual draws always require `ADMIN_API_KEY`. Send it as `x-admin-key`:

```bash
curl -X POST http://localhost:4242/run-lottery -H "x-admin-key: your_manual_draw_key"
```
