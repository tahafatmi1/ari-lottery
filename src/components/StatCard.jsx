export default function StatCard({ label, value, detail, tone = 'default' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-electric/30 bg-electric/10'
      : tone === 'purple'
        ? 'border-aurora/30 bg-aurora/10'
        : 'border-white/10 bg-white/[0.04]';

  return (
    <div className={`rounded-lg border p-5 ${toneClass}`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-white">{value}</p>
      {detail && <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>}
    </div>
  );
}
