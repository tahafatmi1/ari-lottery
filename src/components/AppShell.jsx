import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Profile', to: '/profile' },
];

export default function AppShell({ title, user, children }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  }

  return (
    <main className="min-h-screen bg-ink text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_30%)]">
        <header className="border-b border-white/10 bg-midnight/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-electric">
                ARI Lottery
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-white text-slate-950'
                          : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                      }`
                    }
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <Link
                className="rounded-lg bg-electric px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                to="/buy"
              >
                Buy Tokens
              </Link>

              <button
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="mb-6 rounded-lg border border-white/10 bg-midnight/70 px-4 py-3 text-sm text-slate-300">
            Signed in as <span className="font-semibold text-white">{user?.email}</span>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
