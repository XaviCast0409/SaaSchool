import React from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../../lib/marketing';

export interface LeadSuccessViewProps {
  contactName: string;
  schoolName: string;
  onReset: () => void;
}

export const LeadSuccessView: React.FC<LeadSuccessViewProps> = ({ contactName, schoolName, onReset }) => {
  const firstName = contactName.trim().split(/\s+/)[0];

  return (
    <div className="text-center py-6 kx-panel-enter">
      <div
        className="mx-auto w-16 h-16 rounded-full grid place-items-center"
        style={{ background: 'rgba(35,162,109,.12)', color: 'var(--kx-green)' }}
      >
        <CheckCircle2 className="w-9 h-9" />
      </div>
      <h3 className="mt-5 text-2xl font-extrabold">¡Listo, {firstName}!</h3>
      <p className="mt-2 kx-muted max-w-sm mx-auto">
        Recibimos tu solicitud para <b style={{ color: 'var(--kx-ink)' }}>{schoolName}</b>. Te escribiremos por
        WhatsApp para coordinar tu demostración.
      </p>
      <a
        href={whatsappUrl(
          `Hola, soy ${contactName} de ${schoolName}. Acabo de pedir una demostración de KIPUX.`,
        )}
        target="_blank"
        rel="noreferrer"
        className="kx-btn kx-wa mt-6 px-6 py-3 relative"
      >
        <MessageCircle className="w-5 h-5" /> ¿Prefieres hablar ahora? Escríbenos
      </a>
      <button
        type="button"
        onClick={onReset}
        className="block mx-auto mt-4 text-sm kx-muted underline underline-offset-4"
      >
        Enviar otra solicitud
      </button>
    </div>
  );
};
