import React from 'react';
import {
  X,
  Award,
  Power,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useToggleCompetence,
  useLoadDefaultCompetences,
  type CurricularCompetence,
} from '@/features/curricular-areas/api/useCurricularAreas';

interface CourseCompetencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: string;
  courseName: string;
  competences: CurricularCompetence[];
}

export const CourseCompetencesModal: React.FC<CourseCompetencesModalProps> = ({
  isOpen,
  onClose,
  areaId,
  courseName,
  competences,
}) => {
  const toggleMutation = useToggleCompetence();
  const loadDefaultsMutation = useLoadDefaultCompetences();

  if (!isOpen) return null;

  const activeCount = competences.filter((c) => c.isActive !== false).length;
  const totalCount = competences.length;

  const handleToggle = async (comp: CurricularCompetence) => {
    try {
      const res = await toggleMutation.mutateAsync(comp.id);
      const isNowActive = res.data.isActive ?? true;
      toast.success(
        isNowActive
          ? `Competencia encendida: Ahora está activa para ingresar notas en este curso.`
          : `Competencia apagada: Se mantiene visible con "—" y no requiere notas ni afecta el promedio.`,
      );
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al cambiar el estado de la competencia.';
      toast.error(errorMsg);
    }
  };

  const handleLoadOfficial = async () => {
    if (!areaId) return;
    try {
      const res = await loadDefaultsMutation.mutateAsync(areaId);
      toast.success(`Se sincronizaron ${res.data.copied} competencias oficiales CNEB.`);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al cargar competencias oficiales.';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Competencias del Curso: {courseName}
                </h2>
                <Badge
                  variant="outline"
                  className="text-[11px] font-bold text-primary border-primary/30"
                >
                  {activeCount} encendida{activeCount !== 1 ? 's' : ''} de {totalCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prende o apaga qué competencias evalúa este curso según tu planificación institucional.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guía Explicativa del Funcionamiento con Protección SIAGIE */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Protección Oficial CNEB / SIAGIE:</strong>{' '}
              Todas las competencias provienen de la estructura oficial del MINEDU. No necesitas crear competencias manuales, evitando cualquier choque o incompatibilidad con la exportación al SIAGIE.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-primary/10">
            <div className="flex items-start gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span>
                <strong className="text-foreground">Encendida:</strong> El curso califica esta competencia y el profesor ingresa notas en sus criterios (PM, EM, RC, EB).
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 mt-1 shrink-0" />
              <span>
                <strong className="text-foreground">Apagada:</strong> <strong>No desaparece</strong> de la matriz. Permanece visible en gris con celdas "—" desactivadas, sin exigir notas ni alterar el promedio.
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Sincronización Oficial */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Haz clic en <strong>Apagar</strong> o <strong>Prender</strong> en cada fila según corresponda:</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadOfficial}
            disabled={loadDefaultsMutation.isPending}
            className="text-xs font-semibold gap-1.5 border-border bg-card hover:bg-secondary text-foreground"
            title="Asegura que este curso tenga todas las competencias oficiales del MINEDU"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {loadDefaultsMutation.isPending
                ? 'Sincronizando...'
                : 'Sincronizar Competencias Oficiales CNEB'}
            </span>
          </Button>
        </div>

        {/* Lista de Competencias con Switch Prender / Apagar */}
        <div className="space-y-2">
          {competences.length > 0 ? (
            competences.map((comp, idx) => {
              const isActive = comp.isActive !== false;
              return (
                <div
                  key={comp.id || idx}
                  className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-card border-border shadow-xs'
                      : 'bg-muted/40 border-dashed border-border/70 opacity-70'
                  }`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          !isActive ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {comp.name}
                      </span>
                    </div>
                    {comp.description && (
                      <p className="text-[11px] text-muted-foreground pl-5 line-clamp-2">
                        {comp.description}
                      </p>
                    )}
                  </div>

                  {/* Interruptor Operativo Prender / Apagar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-bold hidden sm:inline ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isActive ? 'Prendida' : 'Apagada'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggle(comp)}
                      disabled={toggleMutation.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                          : 'bg-muted text-foreground border border-border hover:bg-emerald-500/15 hover:text-emerald-600 hover:border-emerald-500/30'
                      }`}
                      title={
                        isActive
                          ? 'Haz clic para apagar esta competencia en este curso'
                          : 'Haz clic para prender esta competencia en este curso'
                      }
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Apagar' : 'Prender'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border space-y-3">
              <Award className="w-8 h-8 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground">
                No hay competencias registradas en este curso
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Carga las competencias oficiales de la malla curricular para comenzar a prender o apagar las que necesites.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadOfficial}
                disabled={loadDefaultsMutation.isPending}
                className="text-xs font-bold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cargar Competencias Oficiales CNEB</span>
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Los cambios se aplican de inmediato en la matriz de notas.
          </p>
          <Button type="button" onClick={onClose} size="sm" className="text-xs font-bold px-4">
            Listo / Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
