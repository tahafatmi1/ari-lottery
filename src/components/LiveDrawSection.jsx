import { useEffect, useMemo, useState } from 'react';
import WinnerDisplay from './WinnerDisplay.jsx';
import { formatCurrency, formatDateTime, getCountdownParts, getNextDrawDate } from '../utils/formatters.js';

function CountdownTile({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className="text-3xl font-semibold tracking-normal text-white">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}

export default function LiveDrawSection({ draws = [], ownWins = [] }) {
  const latestDraw = draws[0];
  const nextDrawDate = useMemo(() => getNextDrawDate(latestDraw?.created_at), [latestDraw]);
  const [countdown, setCountdown] = useState(() => getCountdownParts(nextDrawDate));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(nextDrawDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [nextDrawDate]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-lg border border-white/10 bg-midnight/70 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Live draw countdown</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">Next 72-hour draw</h2>
          </div>
          <p className="text-sm text-slate-400">{formatDateTime(nextDrawDate)}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountdownTile label="Days" value={countdown.days} />
          <CountdownTile label="Hours" value={countdown.hours} />
          <CountdownTile label="Minutes" value={countdown.minutes} />
          <CountdownTile label="Seconds" value={countdown.seconds} />
        </div>
      </div>

      <WinnerDisplay draw={latestDraw} winner={ownWins[0]} />

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
        <p className="text-sm font-semibold text-white">Draw history</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="py-3 pr-5 font-semibold">Draw</th>
                <th className="py-3 pr-5 font-semibold">Date</th>
                <th className="py-3 pr-5 font-semibold">Pool</th>
                <th className="py-3 pr-5 font-semibold">Winner</th>
                <th className="py-3 pr-5 font-semibold">ARI</th>
                <th className="py-3 pr-5 font-semibold">Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {draws.length > 0 ? (
                draws.map((draw) => (
                  <tr className="text-slate-300" key={draw.id}>
                    <td className="py-4 pr-5 font-semibold text-white">#{draw.draw_number}</td>
                    <td className="py-4 pr-5">{formatDateTime(draw.created_at)}</td>
                    <td className="py-4 pr-5">{formatCurrency(draw.total_pool)}</td>
                    <td className="py-4 pr-5">{formatCurrency(draw.winner_share)}</td>
                    <td className="py-4 pr-5">{formatCurrency(draw.ari_share)}</td>
                    <td className="py-4 pr-5">{formatCurrency(draw.platform_share)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-8 text-slate-400" colSpan="6">
                    No completed draws yet. The first cycle begins after active tokens are minted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
