import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { DirectoryUser, FinanceRole } from '../types';

const OPTIONS: Array<{ value: FinanceRole | ''; label: string; hint: string }> = [
  { value: '', label: 'Cajero (por defecto)', hint: 'Cobra y abre/cierra su caja. No puede anular ni editar cuotas.' },
  { value: 'CASHIER', label: 'Cajero', hint: 'Cobra y abre/cierra su caja. No puede anular ni editar cuotas.' },
  { value: 'TREASURER', label: 'Tesorero', hint: 'Además anula recibos, edita cuotas, valida vouchers y revisa cierres.' },
  { value: 'ACCOUNTANT', label: 'Contador (solo lectura)', hint: 'Ve cobros, cierres y egresos de todos, sin poder modificar nada.' },
];

/**
 * Rol en caja y tesorería del personal administrativo. Solo Dirección lo cambia, y se guarda
 * al instante (queda en la auditoría).
 */
export const FinanceRoleField: React.FC<{ user: DirectoryUser }> = ({ user }) => {
  const viewer = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [value, setValue] = useState<FinanceRole | ''>(user.financeRole ?? '');
  useEffect(() => setValue(user.financeRole ?? ''), [user.financeRole]);

  const save = useMutation({
    mutationFn: async (financeRole: FinanceRole | null) =>
      (await api.patch(`/users/${user.id}/finance-role`, { financeRole })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol en caja y tesorería actualizado.');
    },
    onError: (e: unknown) => {
      setValue(user.financeRole ?? '');
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo cambiar el rol.');
    },
  });

  const isDirection = viewer?.role === 'SCHOOL_ADMIN' || viewer?.role === 'SUPER_ADMIN';
  if (user.role !== 'ADMINISTRATIVE' || !isDirection) return null;
  const hint = OPTIONS.find((o) => o.value === value)?.hint;

  return (
    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
      <label className="text-xs font-medium text-foreground" htmlFor="finance-role">
        Rol en caja y tesorería
      </label>
      <select
        id="finance-role"
        value={value}
        disabled={save.isPending}
        onChange={(e) => {
          const next = e.target.value as FinanceRole | '';
          setValue(next);
          save.mutate(next || null);
        }}
        className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {OPTIONS.filter((o) => o.value !== 'CASHIER' || value === 'CASHIER').map((o) => (
          <option key={o.value || 'none'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-muted-foreground">{hint} Se guarda al instante.</p>}
    </div>
  );
};
