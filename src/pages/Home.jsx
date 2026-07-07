import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import { getDemoDashboardData } from '../lib/apiClient.js';
import { getCountdownParts, getNextDrawDate } from '../utils/formatters.js';

function CountdownTile({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className="text-2xl font-semibold tracking-normal text-white">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}

const howItWorks = [
  {
    title: 'Register',
    text: 'Create your account or continue in demo mode. Your participation history, tokens, and transactions are securely tracked.',
  },
  {
    title: 'Buy Tokens',
    text: 'Purchase raffle tokens starting at $1 each. Every token receives a unique entry number.',
  },
  {
    title: 'Join the Drawing',
    text: 'Active tokens are entered into the next scheduled drawing cycle.',
  },
  {
    title: 'Track Impact',
    text: 'View tokens, transactions, draw history, and fund allocation directly from your dashboard.',
  },
];

const impactCards = [
  {
    label: 'Charitable Impact',
    percent: '50%',
    text: 'Supports ARI-aligned programs and charitable initiatives through transparent fundraising allocation.',
  },
  {
    label: 'Participant Rewards',
    percent: '35%',
    text: 'Allocated to the reward pool for eligible drawing winners.',
  },
  {
    label: 'Platform Operations',
    percent: '15%',
    text: 'Supports secure payment processing, platform maintenance, compliance, and ongoing improvement.',
  },
];

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [draws, setDraws] = useState([]);
  const [apiFailed, setApiFailed] = useState(false);
  const nextDrawDate = useMemo(() => getNextDrawDate(draws[0]?.created_at), [draws]);
  const [countdown, setCountdown] = useState(() => getCountdownParts(nextDrawDate));

  useEffect(() => {
    let isMounted = true;

    async function loadDrawingStatus() {
      try {
        const payload = await getDemoDashboardData();

        if (!isMounted) return;

        setSummary(payload.summary ?? null);
        setDraws(payload.draws ?? []);
        setApiFailed(false);
      } catch {
        if (!isMounted) return;
        setApiFailed(true);
      }
    }

    loadDrawingStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(nextDrawDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [nextDrawDate]);

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div>
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100">
            Winner-Directed Charitable Giving
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-normal text-white md:text-6xl">
            Win Big. Give Back. Choose Where Your Impact Goes.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Purchase tokens to participate in transparent impact-driven drawings. Every token
            supports a structured fundraising model while giving participants a chance to win
            rewards and help direct charitable impact.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-electric px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
              to="/buy"
            >
              Start Playing
            </Link>
            <Link
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              to="/about"
            >
              Learn More
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {['$1 per token', 'Drawings every 72 hours', 'Transparent fund allocation'].map((pill) => (
              <span
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200"
                key={pill}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-midnight/85 p-6 shadow-glow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Drawing Status</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">
                Next drawing begins soon
              </h2>
            </div>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
              72-hour cycle
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CountdownTile label="Days" value={countdown.days} />
            <CountdownTile label="Hours" value={countdown.hours} />
            <CountdownTile label="Minutes" value={countdown.minutes} />
            <CountdownTile label="Seconds" value={countdown.seconds} />
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">Active token count</p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-white">
              {apiFailed ? '0' : summary?.activeTokens ?? '...'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {apiFailed || Number(summary?.activeTokens || 0) === 0
                ? 'No active entries yet. Be the first to buy tokens.'
                : 'Active entries are queued for the next drawing cycle.'}
            </p>
          </div>

          <Link
            className="mt-6 block rounded-lg bg-amber-300 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-amber-200"
            to="/buy"
          >
            Enter Now
          </Link>
        </aside>
      </section>

      <section className="border-y border-white/10 bg-midnight/45 px-5 py-16">
        <SectionHeader
          title="How It Works"
          subtitle="Simple, transparent, and built for measurable impact."
        />
        <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {howItWorks.map((item, index) => (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5" key={item.title}>
              <span className="text-sm font-semibold text-amber-200">0{index + 1}</span>
              <h3 className="mt-4 text-xl font-semibold tracking-normal text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16">
        <SectionHeader
          title="Every Token Creates Transparent Impact"
          subtitle="The ARI Lottery platform is designed to make fundraising more engaging, transparent, and accountable. Each token purchase is tracked through the system and connected to a clear distribution model."
        />
        <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
          {impactCards.map((card) => (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-5" key={card.label}>
              <p className="text-4xl font-semibold tracking-normal text-amber-200">{card.percent}</p>
              <h3 className="mt-4 text-xl font-semibold tracking-normal text-white">{card.label}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto max-w-5xl rounded-lg border border-white/10 bg-midnight/85 p-8 text-center shadow-glow">
          <h2 className="text-3xl font-semibold tracking-normal text-white">Ready to Make a Difference?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Join the ARI Lottery platform, purchase tokens, and participate in transparent
            impact-driven drawings.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              className="rounded-lg bg-electric px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
              to="/buy"
            >
              Buy Tokens Now
            </Link>
            <Link
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              to="/dashboard"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
