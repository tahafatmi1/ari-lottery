import { formatCurrency, formatDateTime, maskIdentifier } from '../utils/formatters.js';

export default function WinnerDisplay({ winner, draw }) {
  const tokenLabel =
    winner?.lottery_tokens?.token_number ||
    winner?.token_number ||
    draw?.winner_token_number ||
    maskIdentifier(draw?.winner_token_id);
  const drawDate = winner?.created_at || draw?.created_at;
  const prize = winner?.prize_amount ?? draw?.winner_share;

  return (
    <div className="rounded-lg border border-aurora/30 bg-aurora/10 p-5">
      <p className="text-sm font-medium text-violet-200">Latest winner</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-white">
        Token {tokenLabel || 'Pending'}
      </p>
      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <p className="text-slate-500">Prize</p>
          <p className="mt-1 font-semibold text-white">{formatCurrency(prize || 0)}</p>
        </div>
        <div>
          <p className="text-slate-500">Draw date</p>
          <p className="mt-1 font-semibold text-white">{formatDateTime(drawDate)}</p>
        </div>
      </div>
    </div>
  );
}
