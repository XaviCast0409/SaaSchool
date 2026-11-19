import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { AcademicYear } from '../../api/useAcademicYears';
import { useActivationImpact } from '../../api/useAcademicYears';

export interface CloseYearDialogProps {
  yearToActivate: AcademicYear | null;
  activeYearObj: AcademicYear | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CloseYearDialog: React.FC<CloseYearDialogProps> = ({
  yearToActivate,
  activeYearObj,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const { data: impact, isLoading: impactLoading } = useActivationImpact(yearToActivate?.id ?? null);

  return (
    <ConfirmDialog
      isOpen={!!yearToActivate}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Activar el año ${yearToActivate?.year ?? ''}`}
      description={`El año ${activeYearObj?.isActive ? activeYearObj.year : 'actual'} dejará de ser el vigente. Asistencia, notas, carga docente, cobranza y moras pasarán a trabajar con ${yearToActivate?.year ?? ''}. Puedes volver a activar el año anterior cuando quieras: no se pierde ningún dato.`}
      details={
        impactLoading ? (
          <p className="text-xs text-muted-foreground">Calculando impacto...</p>
        ) : impact ? (
          <div className="space-y-2 text-xs">
            <ul className="space-y-1 text-foreground">
              {impact.currentYear !== null && (
                <li>
                  <strong>{impact.willDeactivate}</strong> matrículas de {impact.currentYear} dejarán de estar
                  vigentes
                  {impact.pendingObligationsOfCurrentYear > 0 && (
                    <>
                      {' '}
                      (con <strong>{impact.pendingObligationsOfCurrentYear}</strong> cuotas pendientes que saldrán de
                      moras y vencidas)
                    </>
                  )}
                  .
                </li>
              )}
              <li>
                <strong>{impact.willActivate}</strong> matrículas de {impact.targetYear} pasarán a ser las vigentes.
              </li>
            </ul>
            {impact.isEarly && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-800 dark:text-amber-300">
                {impact.targetYear} aún no empieza. Si solo quieres matricular para {impact.targetYear}, usa{' '}
                <strong>Abrir matrícula</strong> y mantén {impact.currentYear} como vigente.
              </p>
            )}
          </div>
        ) : null
      }
      confirmText="Activar"
      variant="warning"
      isLoading={isLoading}
    />
  );
};
