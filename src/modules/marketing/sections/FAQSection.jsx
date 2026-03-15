import React, { useState } from 'react';
import SectionShell from './SectionShell';

export default function FAQSection({ faq }) {
  const [open, setOpen] = useState(0);

  return (
    <SectionShell
      id="faq"
      title="Perguntas frequentes"
      description="As dúvidas mais comuns antes de começar."
      centered
    >
      <div className="mx-auto grid max-w-5xl gap-4">
        {faq.map((item, index) => {
          const isOpen = open === index;
          return (
            <article key={item.question} className="faq-container glass-card scroll-reveal overflow-hidden rounded-2xl">
              <button
                type="button"
                className="faq-toggle flex w-full items-center justify-between p-6 text-left transition-all hover:bg-white/5"
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <h3 className="text-lg font-bold">{item.question}</h3>
                <span className="faq-icon text-2xl">{isOpen ? '−' : '+'}</span>
              </button>
              <div className={`faq-item ${isOpen ? 'active' : ''}`}>
                <p className="px-6 pb-6 text-slate-400">{item.answer}</p>
              </div>
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}
