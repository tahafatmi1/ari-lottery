import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import LiveDrawSection from '../components/LiveDrawSection.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TokensView from '../components/TokensView.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';
import { supabase } from '../lib/supabaseClient.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

export default function Dashboard() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [ownWins, setOwnWins] = useState([]);
  const [summary, setSummary] = useState({
    activeTokens: 0,
    usedTokens: 0,
    spent: 0,
    purchased: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadDashboardData() {
      setDataLoading(true);
      setError('');

      const [
        tokensResult,
        activeCountResult,
        usedCountResult,
        transactionsResult,
        transactionTotalsResult,
        drawsResult,
        winsResult,
      ] = await Promise.all([
        supabase
          .from('lottery_tokens')
          .select('id, token_number, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('lottery_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('lottery_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'used'),
        supabase
          .from('transactions')
          .select('id, stripe_payment_id, amount, tokens_purchased, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('transactions')
          .select('amount, tokens_purchased')
          .eq('user_id', user.id),
        supabase
          .from('lottery_draws')
          .select('id, draw_number, winner_token_id, token_count, total_pool, ari_share, winner_share, platform_share, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('winners')
          .select('id, prize_amount, created_at, lottery_tokens(token_number), lottery_draws(draw_number)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      if (!isMounted) return;

      const firstError =
        tokensResult.error ||
        activeCountResult.error ||
        usedCountResult.error ||
        transactionsResult.error ||
        transactionTotalsResult.error ||
        drawsResult.error ||
        winsResult.error;

      if (firstError) {
        setError('Dashboard data is unavailable until the Supabase tables and RLS policies are ready.');
      } else {
        setTokens(tokensResult.data ?? []);
        setTransactions(transactionsResult.data ?? []);
        setDraws(drawsResult.data ?? []);
        setOwnWins(winsResult.data ?? []);
        setSummary({
          activeTokens: activeCountResult.count ?? 0,
          usedTokens: usedCountResult.count ?? 0,
          spent: (transactionTotalsResult.data ?? []).reduce(
            (sum, transaction) => sum + Number(transaction.amount || 0),
            0,
          ),
          purchased: (transactionTotalsResult.data ?? []).reduce(
            (sum, transaction) => sum + Number(transaction.tokens_purchased || 0),
            0,
          ),
        });
      }

      setDataLoading(false);
    }

    loadDashboardData();

    const tokensChannel = supabase
      .channel(`dashboard-tokens:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lottery_tokens',
          filter: `user_id=eq.${user.id}`,
        },
        loadDashboardData,
      )
      .subscribe();

    const drawsChannel = supabase
      .channel('dashboard-draws')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lottery_draws',
        },
        loadDashboardData,
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(tokensChannel);
      supabase.removeChannel(drawsChannel);
    };
  }, [user]);

  if (userLoading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Dashboard" user={user}>
      {error && (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail="Ready for the next active draw"
          label="Token balance"
          tone="accent"
          value={dataLoading ? '...' : summary.activeTokens}
        />
        <StatCard
          detail={`${summary.purchased} lifetime tokens purchased`}
          label="Total money spent"
          value={dataLoading ? '...' : formatCurrency(summary.spent)}
        />
        <StatCard
          detail="Already entered in completed draws"
          label="Used tokens"
          value={dataLoading ? '...' : summary.usedTokens}
        />
        <StatCard
          detail="Private records visible only to this account"
          label="Prize wins"
          tone="purple"
          value={dataLoading ? '...' : ownWins.length}
        />
      </div>

      <div className="mt-5">
        <LiveDrawSection draws={draws} ownWins={ownWins} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TokensView compact tokens={tokens} />

        <div className="rounded-lg border border-white/10 bg-midnight/70">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-white">Recent transactions</p>
              <p className="mt-1 text-sm text-slate-400">Stripe payment history for this account.</p>
            </div>
            <Link className="text-sm font-semibold text-electric hover:text-sky-300" to="/transactions">
              View all
            </Link>
          </div>

          <div className="divide-y divide-white/10">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div className="flex items-center justify-between gap-4 px-5 py-4" key={transaction.id}>
                  <div>
                    <p className="font-semibold text-white">
                      {transaction.tokens_purchased} tokens
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDateTime(transaction.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(transaction.amount)}</p>
                    <div className="mt-1">
                      <StatusBadge status={transaction.status} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-slate-400">
                No transactions yet. Buy tokens to start participating.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
