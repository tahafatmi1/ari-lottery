import { useState } from 'react';
import PublicLayout from '../components/PublicLayout.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const faqs = [
  {
    question: 'How does ARI Lottery work?',
    answer:
      'Participants purchase tokens, and each token becomes an entry into scheduled drawings. The system tracks tokens, transactions, and drawing results through the dashboard.',
  },
  {
    question: 'How much does one token cost?',
    answer: 'The current model uses $1 per token.',
  },
  {
    question: 'How often are drawings held?',
    answer:
      'The platform is designed around a 72-hour drawing cycle. For demo/testing, the schedule may be shortened.',
  },
  {
    question: 'Where do funds go?',
    answer:
      'The current model allocates funds across charitable impact, participant rewards, and platform operations.',
  },
  {
    question: 'How are winners selected?',
    answer:
      'Winners are selected from active token entries using backend lottery logic. Each token represents one entry.',
  },
  {
    question: 'Why are old tokens marked used after a draw?',
    answer:
      'Once a drawing is completed, the active token pool is closed and those tokens are marked as used so the next drawing begins with a fresh entry pool.',
  },
  {
    question: 'Is this ready for public real-money launch?',
    answer:
      'The technical system can be demonstrated, but public launch requires legal, charitable gaming, payment processing, and compliance review.',
  },
  {
    question: 'Why is login currently skipped?',
    answer:
      'Demo mode is temporarily enabled to let the client preview token purchasing, dashboard data, and drawing behavior without account setup. Authentication can be re-enabled later.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-5 py-14 lg:py-20">
        <SectionHeader
          eyebrow="Questions"
          title="Frequently Asked Questions"
          subtitle="Clear answers about token participation, drawings, impact allocation, and the current demo setup."
        />

        <div className="mx-auto mt-10 max-w-4xl space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div className="rounded-lg border border-white/10 bg-midnight/75" key={faq.question}>
                <button
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span className="font-semibold text-white">{faq.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-semibold text-amber-100">
                    {isOpen ? '-' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 px-5 pb-5 pt-4">
                    <p className="text-sm leading-6 text-slate-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}
