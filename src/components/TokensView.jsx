import StatusBadge from './StatusBadge.jsx';
import { formatDateTime } from '../utils/formatters.js';

export default function TokensView({ tokens = [], compact = false }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-midnight/70">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-semibold text-white">Lottery tokens</p>
        <p className="mt-1 text-sm text-slate-400">RLS-protected token records for this account.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Token number</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {tokens.length > 0 ? (
              tokens.map((token) => (
                <tr className="text-slate-200" key={`${token.token_number}-${token.created_at}`}>
                  <td className="px-5 py-4 font-semibold text-white">{token.token_number}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={token.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-300">{formatDateTime(token.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-8 text-slate-400" colSpan="3">
                  No tokens yet. Purchase tokens to enter the next draw.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {compact && tokens.length > 0 && (
        <div className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">
          Showing the latest {tokens.length} token records.
        </div>
      )}
    </div>
  );
}
