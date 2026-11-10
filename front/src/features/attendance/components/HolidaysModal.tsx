import React, { useState } from 'react';
import {
  X,
  CalendarOff,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '../api/useAttendance';
import { formatPeruDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface HolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HolidaysModal: React.FC<HolidaysModalProps> = ({ isOpen, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [newDate, setNewDate] = useState<string>('');
  const [newName, setNewName] = useState<string>('');

  const { data: holidays = [], isLoading } = useHolidays(selectedYear);
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  if (!isOpen) return null;

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) {
      toast.error('Ingresa la fecha y el nombre del feriado.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        date: newDate,
        name: newName.trim(),
      });
      toast.success('Feriado agregado correctamente.');
      setNewDate('');
      setNewName('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al agregar el feriado.');
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el feriado "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Feriado eliminado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al eliminar el feriado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Feriados y Días No Laborables
              </h2>
              <p className="text-xs text-muted-foreground">
                Los días feriados se excluyen del auto-cierre y del cómputo de inasistencias
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 hover:bg-muted"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Selector de Año */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Año Calendario:
            </span>
            <div className="flex items-center gap-1">
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    selectedYear === yr
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario para Agregar Feriado */}
          <form
            onSubmit={handleAddHoliday}
            className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-3"
          >
            <span className="text-xs font-bold text-foreground block">
              Agregar nuevo feriado:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-8 text-xs font-mono bg-background"
                required
              />
              <Input
                type="text"
                placeholder="Ej. Fiestas Patrias"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-xs bg-background"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="h-8 text-xs font-bold gap-1.5"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Agregar</span>
              </Button>
            </div>
          </form>

          {/* Lista de Feriados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Feriados registrados en {selectedYear}</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {holidays.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs space-y-1">
                <AlertCircle className="w-5 h-5 mx-auto text-muted-foreground/60" />
                <p>No hay feriados registrados para el año {selectedYear}.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-foreground block">
                        {h.name}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {formatPeruDate(h.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHoliday(h.id, h.name)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      title="Eliminar feriado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-bold">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
