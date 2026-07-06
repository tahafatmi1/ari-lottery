import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';
import { getDemoTransactions } from '../lib/apiClient.js';
import { DEMO_AUTH_DISABLED } from '../lib/demoMode.js';
import { supabase } from '../lib/supabaseClient.js';
import { formatCurrency, formatDateTime, maskIdentifier } from '../utils/formatters.js';

export default function Transactions() {
  const { user, loading: userLoading } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadTransactions() {
      setLoading(true);
      setError('');

      if (DEMO_AUTH_DISABLED) {
        try {
          const payload = await getDemoTransactions();

          if (!isMounted) return;

          setTransactions(payload.transactions ?? []);
        } catch (transactionError) {
          if (!isMounted) return;

          setError(transactionError.message);
        }

        setLoading(false);
        return;
      }

      const { data, error: transactionError } = await supabase
        .from('transactions')
        .select('id, stripe_payment_id, amount, tokens_purchased, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isMounted) return;

      if (transactionError) {
        setError('Transactions are unavailable until payment records are ready.');
      } else {
        setTransactions(data ?? []);
      }

      setLoading(false);
    }

    loadTransactions();

    if (DEMO_AUTH_DISABLED) {
      const refreshTimer = window.setInterval(loadTransactions, 15000);

      return () => {
        isMounted = false;
        window.clearInterval(refreshTimer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const totals = useMemo(
    () => ({
      spent: transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
      tokens: transactions.reduce(
        (sum, transaction) => sum + Number(transaction.tokens_purchased || 0),
        0,
      ),
      count: transactions.length,
    }),
    [transactions],
  );

  if (userLoading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Transactions" user={user}>
      {error && (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total spent" tone="accent" value={loading ? '...' : formatCurrency(totals.spent)} />
        <StatCard label="Tokens purchased" value={loading ? '...' : totals.tokens} />
        <StatCard label="Payments" tone="purple" value={loading ? '...' : totals.count} />
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-midnight/70">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-sm font-semibold text-white">Payment history</p>
          <p className="mt-1 text-sm text-slate-400">Stripe payment records visible through your RLS session.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Tokens</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr className="text-slate-300" key={transaction.id}>
                    <td className="px-5 py-4 font-semibold text-white">
                      {maskIdentifier(transaction.stripe_payment_id)}
                    </td>
                    <td className="px-5 py-4">{formatCurrency(transaction.amount)}</td>
                    <td className="px-5 py-4">{transaction.tokens_purchased}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-5 py-4">{formatDateTime(transaction.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-slate-400" colSpan="5">
                    No Stripe payments have been recorded for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
