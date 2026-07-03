const statusStyles = {
  active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  used: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  inactive: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  completed: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  void: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  redeemed: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
};

export default function StatusBadge({ status }) {
  const label = status || 'unknown';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
        statusStyles[label] || 'border-white/10 bg-white/5 text-slate-300'
      }`}
    >
      {label}
    </span>
  );
}
