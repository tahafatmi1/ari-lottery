import AppShell from '../components/AppShell.jsx';
import PageLoader from '../components/PageLoader.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';
import { formatDate, maskEmail } from '../utils/formatters.js';

export default function Profile() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Profile" user={user}>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-white/10 bg-midnight/70 p-5">
          <p className="text-sm font-medium text-slate-400">Account</p>
          <h2 className="mt-3 break-all text-2xl font-semibold tracking-normal text-white">
            {user?.email}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Profile settings are read-only while ARI Lottery keeps account identity anchored to
            Supabase authentication.
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Security settings</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-midnight/60 p-4">
              <p className="text-sm text-slate-400">Email</p>
              <p className="mt-2 break-all font-semibold text-white">{maskEmail(user?.email)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-midnight/60 p-4">
              <p className="text-sm text-slate-400">Account created</p>
              <p className="mt-2 font-semibold text-white">{formatDate(user?.created_at)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-midnight/60 p-4">
              <p className="text-sm text-slate-400">Authentication</p>
              <p className="mt-2 font-semibold text-white">Supabase session</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-midnight/60 p-4">
              <p className="text-sm text-slate-400">Data access</p>
              <p className="mt-2 font-semibold text-white">RLS protected</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
