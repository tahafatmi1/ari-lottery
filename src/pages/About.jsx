import PublicLayout from '../components/PublicLayout.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const transparencyItems = [
  'Token-based participation tracking',
  'Secure Stripe payment processing',
  'Supabase-backed transaction records',
  'Scheduled drawing system',
  'Clear fund allocation model',
];

export default function About() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-5 py-14 lg:py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">
            Impact Fundraising Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-white md:text-6xl">
            About ARI Lottery
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
            ARI Lottery is an impact-driven fundraising platform designed to make charitable
            participation transparent, engaging, and measurable.
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-midnight/45 px-5 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold tracking-normal text-white">Our Mission</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Our mission is to create a secure digital fundraising experience where every token
              purchase supports meaningful community impact while giving participants a clear,
              transparent view of how funds are allocated.
            </p>
          </article>

          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold tracking-normal text-white">Why This Platform Exists</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Traditional fundraising often lacks engagement, visibility, and transparency. ARI
              Lottery introduces a modern system where participants can contribute, track their
              entries, view drawing activity, and understand how proceeds are distributed.
            </p>
          </article>
        </div>
      </section>

      <section className="px-5 py-16">
        <SectionHeader
          title="Built Around Transparency"
          subtitle="The platform combines payment records, token tracking, drawing history, and allocation reporting into one auditable experience."
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-3 md:grid-cols-2">
          {transparencyItems.map((item) => (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-5 py-4" key={item}>
              <p className="font-semibold text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto max-w-5xl rounded-lg border border-white/10 bg-midnight/75 p-5">
          <p className="text-sm leading-6 text-slate-400">
            Participation rules, eligibility, and availability may vary by jurisdiction. The
            platform must comply with applicable charitable gaming, raffle, nonprofit, and payment
            processing requirements before public real-money launch.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
