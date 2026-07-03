import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import PageLoader from '../components/PageLoader.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4242';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function BuyTokens() {
  const { user, loading } = useCurrentUser();
  const [quantity, setQuantity] = useState(10);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => Number(quantity || 0), [quantity]);
  const quantityIsValid = Number.isInteger(total) && total >= 1 && total <= 100;

  function handleQuantityChange(event) {
    const nextValue = Number(event.target.value);
    setQuantity(Number.isNaN(nextValue) ? '' : nextValue);
  }

  async function handleCheckout() {
    setError('');

    if (!stripePromise) {
      setError('Stripe publishable key is missing. Add VITE_STRIPE_PUBLISHABLE_KEY to .env.');
      return;
    }

    if (!user?.id || !quantityIsValid) {
      setError('Choose a token quantity from 1 to 100.');
      return;
    }

    setPaying(true);

    try {
      const response = await fetch(`${apiBaseUrl}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          quantity: total,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to start checkout.');
      }

      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe could not be initialized.');
      }

      const { error: checkoutError } = await stripe.redirectToCheckout({
        sessionId: payload.id,
      });

      if (checkoutError) {
        throw new Error(checkoutError.message);
      }
    } catch (checkoutError) {
      setError(checkoutError.message);
      setPaying(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Buy Tokens" user={user}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-white/10 bg-midnight/85 p-6 shadow-glow">
          <p className="text-sm font-medium text-slate-400">Token order</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">Purchase ARI tokens</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Payments are processed by Stripe Checkout. Successful payments mint tokens through the
            verified webhook pipeline.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Token quantity</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-electric focus:ring-2 focus:ring-electric/20"
                type="number"
                min="1"
                max="100"
                step="1"
                value={quantity}
                onChange={handleQuantityChange}
              />
            </label>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                <span>$1.00 per token</span>
                <span>{quantityIsValid ? `${total} tokens` : 'Invalid quantity'}</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <span className="text-sm font-medium text-slate-400">Total</span>
                <span className="text-4xl font-semibold tracking-normal">
                  ${quantityIsValid ? total.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>

            <button
              className="w-full rounded-lg bg-electric px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleCheckout}
              disabled={paying || !quantityIsValid}
            >
              {paying ? 'Opening Checkout...' : 'Pay with Stripe'}
            </button>
          </div>
        </section>

        <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-medium text-slate-400">Buyer</p>
          <p className="mt-3 break-all text-lg font-semibold">{user?.email}</p>
          <div className="mt-8 space-y-4 text-sm leading-6 text-slate-300">
            <p>Tokens become active after Stripe confirms payment and the webhook records them.</p>
            <p>Active tokens automatically enter the next scheduled lottery cycle.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
