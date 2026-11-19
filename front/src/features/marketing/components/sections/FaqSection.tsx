import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { FAQS } from '../../constants/conversionSections';
import { DEFAULT_WHATSAPP_TEXT, whatsappUrl } from '../../lib/marketing';

export const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="preguntas" className="py-24 sm:py-32 bg-white border-y border-[var(--kx-line)] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
        <div className="kx-reveal">
          <span className="kx-eyebrow">Preguntas frecuentes</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Lo que todos nos <span className="kx-serif kx-grad-text">preguntan</span>.
          </h2>
          <a
            href={whatsappUrl(DEFAULT_WHATSAPP_TEXT)}
            target="_blank"
            rel="noreferrer"
            className="kx-btn kx-btn-dark mt-8 px-6 py-3.5"
          >
            <MessageCircle className="w-5 h-5" /> Pregúntanos por WhatsApp
          </a>
        </div>
        <div className="divide-y divide-[var(--kx-line)] border-y border-[var(--kx-line)] kx-reveal">
          {FAQS.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q}>
                <button
                  className="w-full flex items-center justify-between gap-6 py-6 text-left"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-bold">{faq.q}</span>
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-[var(--kx-coral)] text-white rotate-180' : 'bg-[var(--kx-paper)]'}`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <p
                    className="overflow-hidden kx-muted leading-relaxed pr-12"
                    style={{ paddingBottom: isOpen ? 24 : 0 }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
