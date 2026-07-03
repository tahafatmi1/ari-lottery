import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import TokensView from '../components/TokensView.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';
import { supabase } from '../lib/supabaseClient.js';

export default function Tokens() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadTokens() {
      setLoading(true);
      setError('');

      const { data, error: tokenError } = await supabase
        .from('lottery_tokens')
        .select('id, token_number, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isMounted) return;

      if (tokenError) {
        setError('Tokens are unavailable until the lottery token table is ready.');
      } else {
        setTokens(data ?? []);
      }

      setLoading(false);
    }

    loadTokens();

    const channel = supabase
      .channel(`tokens-page:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lottery_tokens',
          filter: `user_id=eq.${user.id}`,
        },
        loadTokens,
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const counts = useMemo(
    () => ({
      active: tokens.filter((token) => token.status === 'active').length,
      used: tokens.filter((token) => token.status === 'used').length,
      total: tokens.length,
    }),
    [tokens],
  );

  if (userLoading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Tokens" user={user}>
      {error && (
        <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active" tone="accent" value={loading ? '...' : counts.active} />
        <StatCard label="Used" value={loading ? '...' : counts.used} />
        <StatCard label="Total issued" tone="purple" value={loading ? '...' : counts.total} />
      </div>

      <div className="mt-5">
        <TokensView tokens={tokens} />
      </div>
    </AppShell>
  );
}
