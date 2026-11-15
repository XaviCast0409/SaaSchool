import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CalendarCheck, Clock, Sparkles, X } from 'lucide-react';
import { LeadForm } from './LeadForm';
import type { InterestPlan } from '../api/useCreateLead';

interface LeadModalContextValue {
  openLead: (source: string, plan?: InterestPlan | null) => void;
}

const LeadModalContext = createContext<LeadModalContextValue>({ openLead: () => undefined });

export const useLeadModal = () => useContext(LeadModalContext);

/** Modal de solicitud de demostración que cualquier botón de la web puede abrir. */
export const LeadModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ source: string; plan: InterestPlan | null; key: number } | null>(null);

  const openLead = useCallback((source: string, plan: InterestPlan | null = null) => {
    setState({ source, plan, key: Date.now() });
  }, []);

  const close = () => setState(null);

  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [state]);

  return (
    <LeadModalContext.Provider value={{ openLead }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
          <div className="absolute inset-0 bg-[rgba(11,21,48,.6)] backdrop-blur-sm kx-panel-enter" onClick={close} />
          <div className="relative w-full sm:max-w-3xl max-h-[94vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[var(--kx-paper)] shadow-2xl kx-panel-enter grid md:grid-cols-[0.9fr_1.1fr]">
            <aside className="hidden md:flex flex-col justify-between p-8 kx-section-dark rounded-l-[28px] relative overflow-hidden">
              <div className="kx-orb" style={{ width: 260, height: 260, right: -90, top: -80, background: 'var(--kx-purple)' }} />
              <div className="relative">
                <span className="kx-eyebrow">Demostración</span>
                <h2 id="lead-modal-title" className="mt-4 text-3xl font-extrabold leading-tight">
                  Mira tu colegio <span className="kx-serif kx-grad-text">funcionando</span> en 20 minutos.
                </h2>
              </div>
              <ul className="relative space-y-4 text-sm kx-on-dark">
                <li className="flex gap-3"><CalendarCheck className="w-5 h-5 shrink-0 text-[var(--kx-coral)]" /> Agendamos en el horario que prefieras.</li>
                <li className="flex gap-3"><Sparkles className="w-5 h-5 shrink-0 text-[var(--kx-coral)]" /> Te mostramos los módulos que más te importan.</li>
                <li className="flex gap-3"><Clock className="w-5 h-5 shrink-0 text-[var(--kx-coral)]" /> Sin compromiso y por videollamada.</li>
              </ul>
            </aside>
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="md:hidden">
                  <span className="kx-eyebrow">Demostración</span>
                  <h2 className="mt-2 text-2xl font-extrabold">Solicita tu demostración</h2>
                </div>
                <p className="hidden md:block text-sm kx-muted">Completa en menos de un minuto.</p>
                <button onClick={close} className="shrink-0 w-10 h-10 rounded-full grid place-items-center hover:bg-black/5" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <LeadForm key={state.key} source={state.source} defaultPlan={state.plan} compact />
            </div>
          </div>
        </div>
      )}
    </LeadModalContext.Provider>
  );
};
