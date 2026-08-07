import React from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles, X, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateSchoolPlan } from '../api/useSuperAdmin';
import { SchoolWithStats } from '../types';
import { SubscriptionPlan } from '@/features/schools/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditSchoolPlanModalProps {
  school: SchoolWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PlanFormValues {
  plan: SubscriptionPlan;
  planExpiresAt: string;
}

export const EditSchoolPlanModal: React.FC<EditSchoolPlanModalProps> = ({
  school,
  isOpen,
  onClose,
}) => {
  const { mutate: updatePlan, isPending } = useUpdateSchoolPlan();

  const { register, handleSubmit } = useForm<PlanFormValues>({
    defaultValues: {
      plan: school?.plan || 'BASIC',
      planExpiresAt: school?.planExpiresAt ? school.planExpiresAt.split('T')[0] : '',
    },
  });

  if (!isOpen || !school) return null;

  const onSubmit = (values: PlanFormValues) => {
    updatePlan(
      {
        id: school.id,
        plan: values.plan,
        planExpiresAt: values.planExpiresAt || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`✨ Plan del colegio "${school.name}" actualizado a ${values.plan}.`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Error al cambiar el plan del colegio.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                Gestión de Suscripción
              </h2>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[260px]">
                {school.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-foreground">
              Plan Contratado
            </label>
            <select
              {...register('plan')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-sm"
            >
              <option value="BASIC">Plan BASIC ($40/mes - Fase 1)</option>
              <option value="PRO">Plan PRO ($90/mes - Fase 2)</option>
              <option value="ENTERPRISE">Plan ENTERPRISE ($150/mes - Todo Incluido)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Fecha de Vencimiento de Suscripción</span>
            </label>
            <Input type="date" {...register('planExpiresAt')} className="h-9 text-xs" />
            <p className="text-[11px] text-muted-foreground">
              Deja la fecha vacía si el plan es de cobro mensual indefinido.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold">
              <Save className="w-4 h-4" />
              <span>Guardar Plan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
