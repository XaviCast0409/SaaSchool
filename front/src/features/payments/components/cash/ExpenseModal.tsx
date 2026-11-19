import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/errors';
import { useCreateExpense } from '../../api/useCash';
import { EXPENSE_CATEGORY_LABEL, EXPENSE_DOCUMENT_LABEL } from '../../types';
import { selectCls } from './constants';

export const ExpenseModal: React.FC<{ open: boolean; availableCash: number; onClose: () => void }> = ({
  open,
  availableCash,
  onClose,
}) => {
  const create = useCreateExpense();
  const [form, setForm] = useState({
    category: 'UTILES_OFICINA',
    description: '',
    amount: '',
    beneficiary: '',
    documentType: 'BOLETA',
    documentNumber: '',
  });
  useEffect(() => {
    if (open)
      setForm({
        category: 'UTILES_OFICINA',
        description: '',
        amount: '',
        beneficiary: '',
        documentType: 'BOLETA',
        documentNumber: '',
      });
  }, [open]);
  const amount = Number(form.amount);
  const tooMuch = amount > availableCash;
  const valid = form.description.trim().length >= 3 && amount > 0 && !tooMuch;

  const submit = () =>
    create.mutate(
      {
        category: form.category,
        description: form.description.trim(),
        amount,
        beneficiary: form.beneficiary.trim() || undefined,
        documentType: form.documentType || undefined,
        documentNumber: form.documentNumber.trim() || undefined,
      },
      {
        onSuccess: (e) => {
          toast.success(`Egreso ${e.expenseNumber} registrado.`);
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo registrar el egreso.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar egreso de caja chica"
      description="Sale en efectivo de tu caja. Registra el monto exacto que entregas."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid} isLoading={create.isPending} onClick={submit}>
            Registrar egreso
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Descripción
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ej: Compra de papel bond A4"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Categoría
          <select
            className={selectCls}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Monto (S/)
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          {tooMuch && (
            <span className="block font-normal text-destructive">Supera el efectivo disponible en tu caja.</span>
          )}
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Pagado a (opcional)
          <Input
            value={form.beneficiary}
            onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
            placeholder="Ej: Librería San Martín"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Comprobante
          <select
            className={selectCls}
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value })}
          >
            {Object.entries(EXPENSE_DOCUMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {form.documentType !== 'SIN_COMPROBANTE' && (
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            N° de comprobante (opcional)
            <Input
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              placeholder="Ej: B001-000123"
            />
          </label>
        )}
      </div>
    </Modal>
  );
};
