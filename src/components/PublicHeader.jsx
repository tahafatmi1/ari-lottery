import { Link, NavLink } from 'react-router-dom';
import { DEMO_AUTH_DISABLED } from '../lib/demoMode.js';

const publicNavItems = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Dashboard', to: '/dashboard' },
];

export default function PublicHeader() {
  const authTarget = DEMO_AUTH_DISABLED ? '/dashboard' : '/auth';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-lg font-semibold tracking-normal text-white" to="/">
            ARI Lottery
          </Link>
          {DEMO_AUTH_DISABLED && (
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
              Demo Mode Active
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <nav className="flex flex-wrap gap-2">
            {publicNavItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`
                }
                end={item.to === '/'}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              to={authTarget}
            >
              Login
            </Link>
            <Link
              className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20"
              to={authTarget}
            >
              Register
            </Link>
            <Link
              className="rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              to="/buy"
            >
              Buy Tokens
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
