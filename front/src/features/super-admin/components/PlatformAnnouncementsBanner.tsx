import React, { useState } from 'react';
import { Info, AlertTriangle, AlertOctagon, X } from 'lucide-react';
import { useActivePlatformAnnouncements, type PlatformAnnouncement } from '../api/usePlatform';

const DISMISSED_KEY = 'saaschool:dismissed-platform-announcements';

const readDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const writeDismissed = (ids: string[]) => {
  try {
    // Solo los últimos 50 para no crecer sin límite
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    /* almacenamiento no disponible: el aviso volverá a mostrarse, no pasa nada */
  }
};

const STYLES: Record<PlatformAnnouncement['level'], { box: string; Icon: typeof Info }> = {
  INFO: { box: 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200', Icon: Info },
  WARNING: { box: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200', Icon: AlertTriangle },
  CRITICAL: { box: 'bg-destructive/10 border-destructive/30 text-destructive', Icon: AlertOctagon },
};

/** Avisos de la plataforma para el rol del usuario. Los críticos no se pueden cerrar. */
export const PlatformAnnouncementsBanner: React.FC = () => {
  const { data: announcements = [] } = useActivePlatformAnnouncements(true);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const visible = announcements.filter((a) => a.level === 'CRITICAL' || !dismissed.includes(a.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div className="print:hidden">
      {visible.map((a) => {
        const { box, Icon } = STYLES[a.level];
        return (
          <div key={a.id} role="status" className={`border-b px-4 py-2.5 text-xs flex items-start gap-2 ${box}`}>
            <Icon className="w-4 h-4 shrink-0 mt-px" />
            <div className="flex-1 min-w-0">
              <strong>{a.title}.</strong> <span className="whitespace-pre-line">{a.message}</span>
            </div>
            {a.level !== 'CRITICAL' && (
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Cerrar aviso"
                className="rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
