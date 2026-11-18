import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useCopyStaffYear } from '../api/useUsers';
import type { DirectoryUser } from '../types';

const ROLE: Record<string, string> = {
  TEACHER: 'Docente',
  ADMINISTRATIVE: 'Administrativo',
  SCHOOL_ADMIN: 'Dirección',
};

/**
 * Renovar personal: elegir a quién del año vigente se contrata para el año siguiente (quien ya
 * figura en el año destino aparece marcado y no se duplica).
 */
export const RenewStaffModal: React.FC<{
  fromYear: { id: string; year: number };
  toYear: { id: string; year: number };
  onClose: () => void;
}> = ({ fromYear, toYear, onClose }) => {
  const copy = useCopyStaffYear();
  const fetchYear = (yearId: string) =>
    api
      .get<{ data: DirectoryUser[] }>('/users', {
        params: { staffOnly: 'true', yearScope: 'year', limit: 1000 },
        headers: { 'x-academic-year-id': yearId },
      })
      .then((r) => r.data.data);
  const { data: source = [], isLoading } = useQuery({
    queryKey: ['users', 'renew', fromYear.id],
    queryFn: () => fetchYear(fromYear.id),
  });
  const { data: target = [] } = useQuery({
    queryKey: ['users', 'renew', toYear.id],
    queryFn: () => fetchYear(toYear.id),
  });
  const already = useMemo(() => new Set(target.map((u) => u.id)), [target]);
  const candidates = source.filter((u) => u.isActive && u.role !== 'PARENT');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(candidates.filter((u) => !already.has(u.id)).map((u) => u.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.length, target.length]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Renovar personal para ${toYear.year}`}
      description={`Marca al personal de ${fromYear.year} que continúa en ${toYear.year}. Mantienen su usuario y su cargo; la carga docente y las tutorías se asignan aparte.`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0}
            isLoading={copy.isPending}
            onClick={() =>
              copy.mutate(
                { fromAcademicYearId: fromYear.id, toAcademicYearId: toYear.id, userIds: [...selected] },
                {
                  onSuccess: (r) => {
                    toast.success(`${r.hired} personas contratadas para ${toYear.year}.`);
                    onClose();
                  },
                  onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo renovar.'),
                },
              )
            }
          >
            Contratar {selected.size} para {toYear.year}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Cargando personal de {fromYear.year}...
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay personal registrado en {fromYear.year}.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border max-h-[50vh] overflow-y-auto text-xs">
          {candidates.map((u) => {
            const isIn = already.has(u.id);
            return (
              <li key={u.id}>
                <label
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${isIn ? 'opacity-60' : 'cursor-pointer hover:bg-muted/30'}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={isIn}
                      checked={isIn || selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="font-semibold text-foreground">
                      {u.lastNamePaternal} {u.lastNameMaternal}, {u.firstName}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {isIn ? `Ya en ${toYear.year}` : (ROLE[u.role] ?? u.role)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};
