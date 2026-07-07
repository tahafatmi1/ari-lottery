export default function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-sm leading-6 text-slate-300 md:text-base">{subtitle}</p>}
    </div>
  );
}
