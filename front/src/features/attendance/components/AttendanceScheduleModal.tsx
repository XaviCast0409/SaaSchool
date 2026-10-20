import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Save,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useAttendanceScheduleConfigs,
  useUpsertAttendanceScheduleConfig,
} from '../api/useAttendance';
import { AttendanceScheduleScope } from '../types';

interface AttendanceScheduleModalProps {
  onClose: () => void;
}

const SCOPE_OPTIONS: Array<{ value: AttendanceScheduleScope; label: string; desc: string }> = [
  { value: 'GENERAL', label: 'Todo el Colegio (General)', desc: 'Aplica a todas las aulas y niveles que no tengan regla propia.' },
  { value: 'INITIAL', label: 'Nivel Inicial', desc: 'Horario especial para Inicial / Kínder (ej: 08:30 AM).' },
  { value: 'PRIMARY', label: 'Nivel Primaria', desc: 'Horario para 1° a 6° de Primaria.' },
  { value: 'SECONDARY', label: 'Nivel Secundaria', desc: 'Horario para 1° a 5° de Secundaria.' },
];

export const AttendanceScheduleModal: React.FC<AttendanceScheduleModalProps> = ({ onClose }) => {
  const [selectedScope, setSelectedScope] = useState<AttendanceScheduleScope>('GENERAL');
  const [entryTime, setEntryTime] = useState('07:45');
  const [lateToleranceTime, setLateToleranceTime] = useState('08:15');
  const [autoCloseTime, setAutoCloseTime] = useState('08:30');
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);

  const { data: configs = [], isLoading } = useAttendanceScheduleConfigs();
  const { mutate: upsertConfig, isPending: isSaving } = useUpsertAttendanceScheduleConfig();

  // Cargar valores al seleccionar un ámbito
  useEffect(() => {
    const current = configs.find((c) => c.scope === selectedScope);
    if (current) {
      setEntryTime(current.entryTime);
      setLateToleranceTime(current.lateToleranceTime);
      setAutoCloseTime(current.autoCloseTime);
      setAutoCloseEnabled(current.autoCloseEnabled);
    } else {
      // Valores por defecto
      if (selectedScope === 'INITIAL') {
        setEntryTime('08:30');
        setLateToleranceTime('09:00');
        setAutoCloseTime('09:15');
      } else {
        setEntryTime('07:45');
        setLateToleranceTime('08:15');
        setAutoCloseTime('08:30');
      }
      setAutoCloseEnabled(false);
    }
  }, [selectedScope, configs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryTime >= lateToleranceTime) {
      toast.error('La hora límite de entrada puntual debe ser anterior a la hora de tardanza.');
      return;
    }
    if (lateToleranceTime >= autoCloseTime) {
      toast.error('La hora de tardanza debe ser anterior a la hora de corte/falta.');
      return;
    }

    upsertConfig(
      {
        scope: selectedScope,
        entryTime,
        lateToleranceTime,
        autoCloseTime,
        autoCloseEnabled,
      },
      {
        onSuccess: () => {
          toast.success('✅ Configuración de horarios actualizada correctamente.');
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || 'Error al guardar configuración.';
          toast.error(msg);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-foreground">
                  Configuración de Horarios de Asistencia
                </h2>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Director / Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define los umbrales de puntualidad, tardanza y hora de corte para el colegio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Selector de Ámbito */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ámbito del Horario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedScope(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedScope === opt.value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{opt.label}</span>
                    {configs.some((c) => c.scope === opt.value) && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Configuración personalizada activa" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tres Umbrales de Tiempo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Puntual */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Entrada Puntual</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Hasta esta hora es Presente:</p>
              <Input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="h-9 text-xs font-bold bg-background border-emerald-500/30"
                required
              />
            </div>

            {/* 2. Tardanza */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Límite de Tardanza</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Hasta esta hora es Tardanza:</p>
              <Input
                type="time"
                value={lateToleranceTime}
                onChange={(e) => setLateToleranceTime(e.target.value)}
                className="h-9 text-xs font-bold bg-background border-amber-500/30"
                required
              />
            </div>

            {/* 3. Corte / Falta */}
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-1.5 text-destructive font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Hora de Corte (Falta)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">A partir de esta hora:</p>
              <Input
                type="time"
                value={autoCloseTime}
                onChange={(e) => setAutoCloseTime(e.target.value)}
                className="h-9 text-xs font-bold bg-background border-destructive/30"
                required
              />
            </div>
          </div>

          {/* Línea de Tiempo Visual Explicativa */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Regla de Asistencia Generada:
            </span>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>
                • <strong>Hasta las {entryTime}:</strong> El alumno que escanea su QR queda como{' '}
                <span className="text-emerald-600 font-semibold">PUNTUAL</span>.
              </p>
              <p>
                • <strong>De {entryTime} a {lateToleranceTime}:</strong> El alumno que escanea su QR queda con{' '}
                <span className="text-amber-600 font-semibold">TARDANZA</span>.
              </p>
              <p>
                • <strong>A partir de las {autoCloseTime}:</strong> Quienes no hayan registrado ingreso son considerados con{' '}
                <span className="text-destructive font-semibold">FALTA INJUSTIFICADA</span>.
              </p>
            </div>
          </div>

          {/* Interruptor de Auto-Cierre */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
            <div className="space-y-0.5 pr-4">
              <span className="font-bold text-xs text-foreground block">
                Cierre Automático Diario de Faltas
              </span>
              <p className="text-[11px] text-muted-foreground">
                Si está activado, a las {autoCloseTime} (lunes a viernes) el sistema asignará falta automáticamente a los no registrados.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={autoCloseEnabled}
                onChange={(e) => setAutoCloseEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || isLoading} className="text-xs font-bold gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Horarios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
