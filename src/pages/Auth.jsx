import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

const initialForm = {
  email: '',
  password: '',
};

export default function Auth() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function checkExistingUser() {
      if (!isSupabaseConfigured) {
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      setIsAuthenticated(Boolean(data?.user));
      setCheckingSession(false);
    }

    checkExistingUser();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!isSupabaseConfigured) return;

    setLoading(true);
    setError('');
    setMessage('');

    if (!form.email.trim() || form.password.length < 6) {
      setLoading(false);
      setError('Enter a valid email and a password with at least 6 characters.');
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  async function handleSignUp() {
    if (!isSupabaseConfigured) return;

    setLoading(true);
    setError('');
    setMessage('');

    if (!form.email.trim() || form.password.length < 6) {
      setLoading(false);
      setError('Enter a valid email and a password with at least 6 characters.');
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data?.session) {
      await supabase.auth.signOut();
    }

    setLoading(false);
    setForm(initialForm);
    setMessage('Account created. Check your inbox if email confirmation is enabled, then log in.');
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-ink text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-electric" />
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <section className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.2),transparent_36%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-midnight/90 p-8 shadow-glow backdrop-blur">
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-electric">
              ARI Lottery
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-white">
              Sign in to your funding portal
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Secure access for campaign operators, finance teams, and nonprofit partners.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Supabase credentials are missing. Add them to a local .env file before signing in.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-electric focus:ring-2 focus:ring-electric/20"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={updateField}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-electric focus:ring-2 focus:ring-electric/20"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={updateField}
                minLength={6}
                required
              />
            </label>

            <button
              className="w-full rounded-xl bg-electric px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading || !isSupabaseConfigured}
            >
              {loading ? 'Please wait...' : 'Login'}
            </button>

            <button
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={loading || !isSupabaseConfigured}
              onClick={handleSignUp}
            >
              Sign Up
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
