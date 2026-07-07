import AppShell from '../components/AppShell.jsx';
import PageLoader from '../components/PageLoader.jsx';
import useCurrentUser from '../hooks/useCurrentUser.js';
import { DEMO_AUTH_DISABLED } from '../lib/demoMode.js';

const settingsCards = [
  {
    title: 'Profile Settings',
    text: 'Manage account identity and basic profile details.',
  },
  {
    title: 'Notification Preferences',
    text: 'Control drawing alerts, token updates, and transaction notices.',
  },
  {
    title: 'Charity/Impact Preferences',
    text: 'Choose preferred impact categories and charitable direction.',
  },
  {
    title: 'Security Settings',
    text: 'Review login, session, and account protection options.',
  },
];

export default function Settings() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AppShell title="Settings" user={user}>
      {DEMO_AUTH_DISABLED && (
        <div className="mb-5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          Demo mode is currently active. Settings are preview-only.
        </div>
      )}

      <section className="rounded-lg border border-white/10 bg-midnight/70 p-6">
        <h2 className="text-2xl font-semibold tracking-normal text-white">Settings</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Account settings, notification preferences, and charitable impact preferences will be
          available here in the full user version.
        </p>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settingsCards.map((card) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5" key={card.title}>
            <h3 className="text-lg font-semibold tracking-normal text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{card.text}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
