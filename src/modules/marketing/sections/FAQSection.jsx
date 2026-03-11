import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SectionShell from './SectionShell';

export default function FAQSection({ faq }) {
  const [open, setOpen] = useState(0);

  return (
    <SectionShell
      id="faq"
      eyebrow="FAQ"
      title="Perguntas frequentes"
      description="Respostas objetivas para as duvidas mais comuns sobre uso individual, profissional e empresarial."
      className="bg-white"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {faq.map((item, index) => {
          const isOpen = open === index;
          return (
            <article key={item.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span className="text-sm font-semibold text-slate-900 sm:text-base">{item.question}</span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen ? <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</p> : null}
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}

