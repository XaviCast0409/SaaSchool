import React from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, Rss } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarFeedUrl } from '../../api/useCalendar';

export const FeedModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data, isLoading } = useCalendarFeedUrl(open);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar; selecciónalo manualmente.');
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ver el calendario en tu celular"
      description="Se actualiza solo: los nuevos eventos, tareas y entrevistas aparecen automáticamente."
      size="md"
    >
      {isLoading || !data ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando" />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-foreground">iPhone, iPad o Mac</p>
            <a href={data.webcalUrl} className="mt-1 inline-flex items-center gap-1.5 text-primary hover:underline">
              <Rss className="h-4 w-4" aria-hidden /> Suscribirme al calendario
            </a>
          </div>
          <div>
            <p className="font-medium text-foreground">Google Calendar (Android o computadora)</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
              <li>Copia el enlace de abajo.</li>
              <li>En calendar.google.com → “Otros calendarios” → “+” → “Desde URL”.</li>
              <li>Pega el enlace y pulsa “Agregar calendario”.</li>
            </ol>
            <div className="mt-2 flex gap-2">
              <Input
                readOnly
                value={data.httpsUrl}
                className="h-9 text-xs"
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Enlace de suscripción"
              />
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => copy(data.httpsUrl)}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Este enlace es personal; no lo compartas. Deja de funcionar si cambias tu contraseña.
          </p>
        </div>
      )}
    </Modal>
  );
};
