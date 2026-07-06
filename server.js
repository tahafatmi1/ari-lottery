import cors from 'cors';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { runLotteryDraw, startLotteryScheduler, stopLotteryScheduler } from './lotteryEngine.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4242;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  'https://ari-lottery.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URLS || '').split(','),
]
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginSet = new Set(allowedOrigins);
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminApiKey = process.env.ADMIN_API_KEY;
const cronDisabled = process.env.DISABLE_LOTTERY_CRON === 'true';
const demoAuthDisabled = process.env.DEMO_AUTH_DISABLED === 'true';
const configuredDemoUserId = process.env.DEMO_USER_ID || '00000000-0000-4000-8000-000000000001';
const demoUserEmail = process.env.DEMO_USER_EMAIL || 'demo@arilottery.local';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let lotteryTask = null;
let demoUserCache = null;

app.set('trust proxy', 1);

function requestHasAdminAccess(request) {
  if (!adminApiKey) {
    return false;
  }

  return request.get('x-admin-key') === adminApiKey;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toDemoUser(user = {}) {
  return {
    id: user.id || configuredDemoUserId,
    email: user.email || demoUserEmail,
    created_at: user.created_at || new Date('2026-07-06T00:00:00.000Z').toISOString(),
    is_demo: true,
  };
}

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const user = data?.users?.find((candidate) => candidate.email === email);

    if (user) {
      return user;
    }

    if (!data?.users || data.users.length < 100) {
      return null;
    }
  }

  return null;
}

async function ensureDemoUser() {
  if (demoUserCache) {
    return demoUserCache;
  }

  if (!supabaseAdmin) {
    demoUserCache = toDemoUser();
    return demoUserCache;
  }

  if (uuidPattern.test(configuredDemoUserId)) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(configuredDemoUserId);

    if (data?.user) {
      demoUserCache = toDemoUser(data.user);
      return demoUserCache;
    }

    if (error && error.status !== 404) {
      console.warn('Unable to verify configured demo user:', error.message);
    }
  }

  const password = randomBytes(24).toString('hex');
  const attributes = {
    email: demoUserEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name: 'ARI Lottery Demo User',
      demo_auth_disabled: true,
    },
    app_metadata: {
      role: 'demo',
    },
  };

  if (uuidPattern.test(configuredDemoUserId)) {
    // DEMO MODE ONLY: keep the demo user id stable for FK-backed token records.
    // Remove this branch when DEMO_AUTH_DISABLED=false and normal Supabase Auth returns.
    attributes.id = configuredDemoUserId;
  }

  let { data, error } = await supabaseAdmin.auth.admin.createUser(attributes);

  if (error && attributes.id) {
    const fallbackAttributes = { ...attributes };
    delete fallbackAttributes.id;
    ({ data, error } = await supabaseAdmin.auth.admin.createUser(fallbackAttributes));
  }

  if (error) {
    const existingUser = await findAuthUserByEmail(demoUserEmail);

    if (existingUser) {
      demoUserCache = toDemoUser(existingUser);
      return demoUserCache;
    }

    throw new Error(
      `Unable to create demo user. Set DEMO_USER_ID to an existing Supabase auth user id. ${error.message}`,
    );
  }

  if (data?.user?.id !== configuredDemoUserId) {
    console.warn(
      `Demo user id resolved to ${data?.user?.id}; set DEMO_USER_ID to this value to keep demo metadata stable.`,
    );
  }

  demoUserCache = toDemoUser(data?.user);
  return demoUserCache;
}

async function resolveCheckoutUserId(userId) {
  if (demoAuthDisabled) {
    const demoUser = await ensureDemoUser();
    return demoUser.id;
  }

  if (typeof userId === 'string' && uuidPattern.test(userId)) {
    return userId;
  }

  return null;
}

async function withRetry(operation, { label, retries = 3, baseDelayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`${label || 'Operation'} failed on attempt ${attempt}; retrying in ${delay}ms.`);
      await sleep(delay);
    }
  }

  throw lastError;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS.'));
    },
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'stripe-signature', 'x-admin-key'],
  }),
);
app.use(helmet());

app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  if (!stripe || !stripeWebhookSecret || !supabaseAdmin) {
    response.status(503).json({
      error: 'Webhook dependencies are not configured.',
    });
    return;
  }

  const signature = request.headers['stripe-signature'];

  if (!signature) {
    response.status(400).json({ error: 'Missing Stripe signature.' });
    return;
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message);
    response.status(400).json({ error: 'Invalid Stripe webhook signature.' });
    return;
  }

  console.log(`Stripe webhook received: ${event.type} (${event.id})`);

  if (event.type !== 'checkout.session.completed') {
    response.json({ received: true, ignored: true });
    return;
  }

  const session = event.data.object;

  if (session.payment_status !== 'paid') {
    response.status(400).json({ error: 'Checkout session is not paid.' });
    return;
  }

  const userId = session.metadata?.user_id;
  const tokenQuantity = Number(session.metadata?.quantity);
  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  const amountTotal = Number(session.amount_total);

  if (typeof userId !== 'string' || !uuidPattern.test(userId)) {
    response.status(400).json({ error: 'Invalid or missing user_id metadata.' });
    return;
  }

  if (!Number.isInteger(tokenQuantity) || tokenQuantity < 1 || tokenQuantity > 100) {
    response.status(400).json({ error: 'Invalid or missing quantity metadata.' });
    return;
  }

  if (typeof paymentIntent !== 'string' || paymentIntent.length === 0) {
    response.status(400).json({ error: 'Missing Stripe payment intent.' });
    return;
  }

  if (!Number.isInteger(amountTotal) || amountTotal !== tokenQuantity * 100) {
    response.status(400).json({ error: 'Invalid Stripe payment amount.' });
    return;
  }

  try {
    const data = await withRetry(
      async () => {
        const { data: rpcData, error } = await supabaseAdmin.rpc('process_completed_checkout', {
          p_user_id: userId,
          p_stripe_payment_id: paymentIntent,
          p_amount: amountTotal,
          p_tokens_purchased: tokenQuantity,
        });

        if (error) {
          throw error;
        }

        return rpcData;
      },
      { label: `Process Stripe payment ${paymentIntent}` },
    );

    console.log(
      `Stripe webhook processed: payment=${paymentIntent} processed=${Boolean(
        data?.processed,
      )} duplicate=${Boolean(data?.duplicate)} tokens=${data?.tokens_minted ?? 0}`,
    );

    response.json({
      received: true,
      processed: Boolean(data?.processed),
      transaction_id: data?.transaction_id ?? null,
      tokens_minted: data?.tokens_minted ?? 0,
      duplicate: Boolean(data?.duplicate),
    });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    response.status(500).json({ error: 'Unable to process Stripe webhook.' });
  }
});

app.use(express.json({ limit: '10kb' }));
app.use(apiLimiter);

app.get('/health', (_request, response) => {
  response.json({
    stripeConfigured: Boolean(stripe),
    webhookConfigured: Boolean(stripeWebhookSecret),
    supabaseConfigured: Boolean(supabaseAdmin),
    lotterySchedulerConfigured: Boolean(lotteryTask),
    demoAuthDisabled,
    demoUserId: demoAuthDisabled ? configuredDemoUserId : null,
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/demo/user', async (_request, response) => {
  if (!demoAuthDisabled) {
    response.status(404).json({ error: 'Demo auth bypass is disabled.' });
    return;
  }

  try {
    const user = await ensureDemoUser();
    response.json({ user });
  } catch (error) {
    console.error('Demo user resolution failed:', error);
    response.status(500).json({ error: 'Unable to resolve demo user.' });
  }
});

app.get('/demo/dashboard', async (_request, response) => {
  if (!demoAuthDisabled) {
    response.status(404).json({ error: 'Demo auth bypass is disabled.' });
    return;
  }

  if (!supabaseAdmin) {
    response.status(500).json({ error: 'Supabase service role is required for demo data.' });
    return;
  }

  try {
    const user = await ensureDemoUser();

    const [
      tokensResult,
      activeCountResult,
      usedCountResult,
      transactionsResult,
      transactionTotalsResult,
      drawsResult,
      winsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('lottery_tokens')
        .select('id, token_number, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabaseAdmin
        .from('lottery_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabaseAdmin
        .from('lottery_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'used'),
      supabaseAdmin
        .from('transactions')
        .select('id, stripe_payment_id, amount, tokens_purchased, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('transactions')
        .select('amount, tokens_purchased')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('lottery_draws')
        .select(
          'id, draw_number, winner_token_id, token_count, total_pool, ari_share, winner_share, platform_share, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('winners')
        .select('id, prize_amount, created_at, lottery_tokens(token_number), lottery_draws(draw_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const firstError =
      tokensResult.error ||
      activeCountResult.error ||
      usedCountResult.error ||
      transactionsResult.error ||
      transactionTotalsResult.error ||
      drawsResult.error ||
      winsResult.error;

    if (firstError) {
      throw firstError;
    }

    const transactionTotals = transactionTotalsResult.data ?? [];

    response.json({
      user,
      tokens: tokensResult.data ?? [],
      transactions: transactionsResult.data ?? [],
      draws: drawsResult.data ?? [],
      ownWins: winsResult.data ?? [],
      summary: {
        activeTokens: activeCountResult.count ?? 0,
        usedTokens: usedCountResult.count ?? 0,
        spent: transactionTotals.reduce(
          (sum, transaction) => sum + Number(transaction.amount || 0),
          0,
        ),
        purchased: transactionTotals.reduce(
          (sum, transaction) => sum + Number(transaction.tokens_purchased || 0),
          0,
        ),
      },
    });
  } catch (error) {
    console.error('Demo dashboard fetch failed:', error);
    response.status(500).json({ error: 'Unable to load demo dashboard data.' });
  }
});

app.get('/demo/tokens', async (_request, response) => {
  if (!demoAuthDisabled) {
    response.status(404).json({ error: 'Demo auth bypass is disabled.' });
    return;
  }

  if (!supabaseAdmin) {
    response.status(500).json({ error: 'Supabase service role is required for demo data.' });
    return;
  }

  try {
    const user = await ensureDemoUser();
    const { data, error } = await supabaseAdmin
      .from('lottery_tokens')
      .select('id, token_number, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    response.json({ user, tokens: data ?? [] });
  } catch (error) {
    console.error('Demo tokens fetch failed:', error);
    response.status(500).json({ error: 'Unable to load demo tokens.' });
  }
});

app.get('/demo/transactions', async (_request, response) => {
  if (!demoAuthDisabled) {
    response.status(404).json({ error: 'Demo auth bypass is disabled.' });
    return;
  }

  if (!supabaseAdmin) {
    response.status(500).json({ error: 'Supabase service role is required for demo data.' });
    return;
  }

  try {
    const user = await ensureDemoUser();
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('id, stripe_payment_id, amount, tokens_purchased, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    response.json({ user, transactions: data ?? [] });
  } catch (error) {
    console.error('Demo transactions fetch failed:', error);
    response.status(500).json({ error: 'Unable to load demo transactions.' });
  }
});

app.post('/run-lottery', paymentLimiter, async (request, response) => {
  if (!adminApiKey) {
    response.status(503).json({ error: 'ADMIN_API_KEY is not configured.' });
    return;
  }

  if (!requestHasAdminAccess(request)) {
    response.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  if (!supabaseAdmin) {
    response.status(500).json({ error: 'Supabase service role is not configured.' });
    return;
  }

  try {
    const result = await runLotteryDraw(supabaseAdmin);
    response.json(result);
  } catch (error) {
    console.error('Manual lottery draw failed:', error);
    response.status(500).json({ error: 'Unable to run lottery draw.' });
  }
});

app.post('/create-checkout-session', paymentLimiter, async (request, response) => {
  if (!stripe) {
    response.status(500).json({ error: 'Stripe is not configured on the server.' });
    return;
  }

  const { user_id: userId, quantity } = request.body ?? {};
  const tokenQuantity = Number(quantity);
  let checkoutUserId;

  try {
    checkoutUserId = await resolveCheckoutUserId(userId);
  } catch (error) {
    console.error('Checkout user resolution failed:', error);
    response.status(500).json({ error: 'Unable to resolve checkout user.' });
    return;
  }

  if (!checkoutUserId) {
    response.status(400).json({ error: 'A valid user_id is required.' });
    return;
  }

  if (!Number.isInteger(tokenQuantity) || tokenQuantity < 1 || tokenQuantity > 100) {
    response.status(400).json({ error: 'Quantity must be a whole number from 1 to 100.' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ARI Lottery Tokens',
            },
            unit_amount: 100,
          },
          quantity: tokenQuantity,
        },
      ],
      metadata: {
        user_id: checkoutUserId,
        demo_auth_disabled: String(demoAuthDisabled),
        quantity: String(tokenQuantity),
      },
      success_url: `${clientUrl}/dashboard`,
      cancel_url: `${clientUrl}/buy`,
    });

    response.json({ id: session.id });
  } catch (error) {
    console.error('Stripe checkout session failed:', error);
    response.status(500).json({ error: 'Unable to create Stripe Checkout session.' });
  }
});

app.listen(port, () => {
  console.log(`ARI Lottery payment API listening on http://localhost:${port}`);

  if (!cronDisabled && supabaseAdmin) {
    try {
      lotteryTask = startLotteryScheduler({
        supabaseAdmin,
        schedule: process.env.CRON_SCHEDULE,
      });
    } catch (error) {
      console.error('ARI Lottery scheduler failed to start:', error.message);
      lotteryTask = null;
    }
  } else if (cronDisabled) {
    console.log('ARI Lottery scheduler disabled by DISABLE_LOTTERY_CRON=true');
  } else {
    console.warn('ARI Lottery scheduler not started because Supabase service role is missing.');
  }
});

function shutdown() {
  stopLotteryScheduler();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
