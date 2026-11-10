import React, { useState } from 'react';
import { KeyRound, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useBulkCredentials } from '../api/useStudents';
import { TemporaryCredentialsDialog, TemporaryCredential } from '@/components/ui/TemporaryCredentialsDialog';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkCredentialsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { data: classrooms = [], isLoading: isLoadingClassrooms } = useClassrooms();
  const { mutateAsync: generateBulk, isPending } = useBulkCredentials();

  const [classroomId, setClassroomId] = useState<string>('');
  const [target, setTarget] = useState<'STUDENTS' | 'GUARDIANS'>('STUDENTS');
  const [onlyPending, setOnlyPending] = useState<boolean>(true);

  const [generatedCredentials, setGeneratedCredentials] = useState<TemporaryCredential[] | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomId) {
      toast.error('Selecciona un aula para continuar');
      return;
    }

    try {
      const data = await generateBulk({
        classroomId,
        target,
        onlyPending,
      });

      if (data.length === 0) {
        toast.info('No se encontraron cuentas pendientes para generar.');
      } else {
        toast.success(`Se generaron ${data.length} credenciales temporales.`);
        setGeneratedCredentials(
          data.map((c) => ({
            name: c.fullName,
            login: c.login,
            password: c.temporaryPassword,
          }))
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al generar credenciales masivas';
      toast.error(msg);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 space-y-5 text-foreground">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Credenciales de Acceso</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generación masiva de accesos por aula para el inicio de clases
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aula */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Aula / Sección:</label>
              <select
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                disabled={isLoadingClassrooms || isPending}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">Selecciona un aula...</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.educationLevel === 'INITIAL'
                      ? 'Inicial'
                      : c.educationLevel === 'PRIMARY'
                      ? 'Primaria'
                      : 'Secundaria'}{' '}
                    - {c.grade}° "{c.section}"
                  </option>
                ))}
              </select>
            </div>

            {/* Target Radio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Destinatarios:</label>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    target === 'STUDENTS'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulk-target"
                    value="STUDENTS"
                    checked={target === 'STUDENTS'}
                    onChange={() => setTarget('STUDENTS')}
                    className="sr-only"
                  />
                  <span>Estudiantes</span>
                </label>

                <label
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    target === 'GUARDIANS'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulk-target"
                    value="GUARDIANS"
                    checked={target === 'GUARDIANS'}
                    onChange={() => setTarget('GUARDIANS')}
                    className="sr-only"
                  />
                  <span>Apoderados</span>
                </label>
              </div>
            </div>

            {/* Solo cuentas pendientes Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                />
                <span className="font-medium">Solo cuentas pendientes</span>
              </label>
              <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">
                Omite usuarios que ya cambiaron su contraseña personal.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 font-semibold" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Generar Credenciales</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {generatedCredentials && (
        <TemporaryCredentialsDialog
          open={Boolean(generatedCredentials)}
          onClose={() => {
            setGeneratedCredentials(null);
            onClose();
          }}
          title={`Credenciales de ${target === 'STUDENTS' ? 'Estudiantes' : 'Apoderados'}`}
          credentials={generatedCredentials}
        />
      )}
    </>
  );
};
