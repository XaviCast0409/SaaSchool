import React from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DoorClosed,
  DoorOpen,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AcademicYear } from '../../api/useAcademicYears';
import { formatDateDisplay } from '../../utils/academicYearDates';

export interface AcademicYearCardProps {
  academicYear: AcademicYear;
  isAdmin: boolean;
  onEdit: (ay: AcademicYear) => void;
  onDelete: (ay: AcademicYear) => void;
  onFinalSituation: (ay: AcademicYear) => void;
  onToggleEnrollment: (ay: AcademicYear) => void;
  onActivate: (ay: AcademicYear) => void;
  isEnrollmentBusy: boolean;
}

export const AcademicYearCard: React.FC<AcademicYearCardProps> = ({
  academicYear: ay,
  isAdmin,
  onEdit,
  onDelete,
  onFinalSituation,
  onToggleEnrollment,
  onActivate,
  isEnrollmentBusy,
}) => {
  return (
    <Card className="bg-card hover:border-primary/40 transition-all">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base ${
                ay.isActive ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              {ay.year}
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">{ay.name || `Año Escolar ${ay.year}`}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={ay.isActive ? 'default' : 'secondary'}
                  className={`text-xs font-bold ${
                    ay.isActive ? 'bg-emerald-500 text-white' : 'text-muted-foreground'
                  }`}
                >
                  {ay.isActive ? 'Vigente' : 'No vigente'}
                </Badge>
                {ay.enrollmentOpen && (
                  <Badge
                    variant="outline"
                    className="text-xs font-bold border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                  >
                    Matrícula abierta
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={() => onEdit(ay)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(ay)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>
              Inicio: <strong className="text-foreground">{formatDateDisplay(ay.startDate)}</strong>
            </span>
          </div>
          <span>──</span>
          <div className="flex items-center gap-1.5">
            <span>
              Fin: <strong className="text-foreground">{formatDateDisplay(ay.endDate)}</strong>
            </span>
          </div>
        </div>

        {ay.periodsConfig && ay.periodsConfig.length > 0 && (
          <ul className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
            {[...ay.periodsConfig]
              .sort((a, b) => a.periodNumber - b.periodNumber)
              .map((p) => (
                <li key={p.periodNumber}>
                  <span className="font-semibold text-foreground">{p.name}:</span>{' '}
                  {formatDateDisplay(p.startDate)} – {formatDateDisplay(p.endDate)}
                </li>
              ))}
          </ul>
        )}

        {isAdmin && ay.isActive && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 font-semibold"
              onClick={() => onFinalSituation(ay)}
              title="Calcula con las notas quién es promovido, va a recuperación o permanece, y lo guarda para la re-matrícula"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Registrar situación final</span>
            </Button>
          </div>
        )}

        {isAdmin && !ay.isActive && (
          <div className="pt-2 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 font-semibold"
              disabled={isEnrollmentBusy}
              onClick={() => onToggleEnrollment(ay)}
              title="Permite matricular para este año sin dejar de operar el año vigente"
            >
              {ay.enrollmentOpen ? (
                <DoorClosed className="w-3.5 h-3.5" />
              ) : (
                <DoorOpen className="w-3.5 h-3.5" />
              )}
              <span>{ay.enrollmentOpen ? 'Cerrar matrícula' : 'Abrir matrícula'}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1 font-semibold"
              onClick={() => onActivate(ay)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activar este año</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
