import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, PlusCircle, User, Calendar, DollarSign, FileText, Banknote, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateIndividualObligation } from '../api/usePayments';
import { useStudents } from '@/features/students/api/useStudents';
import { getPeruToday } from '@/lib/dateUtils';

// "Hoy" según la hora peruana, aunque la computadora tenga otra zona horaria
const getTodayLocal = (): string => getPeruToday();

const createIndividualSchema = z.object({
  studentId: z.string().min(1, 'Selecciona un estudiante'),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  amountDue: z.coerce.number().positive('El monto debe ser mayor a 0'),
  dueDate: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
  notes: z.string().optional(),
  paidNow: z.boolean().default(true),
  paymentMethod: z.enum(['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT', 'CREDIT_CARD']).default('CASH'),
  operationNumber: z.string().trim().optional(),
}).refine((d) => !d.paidNow || d.paymentMethod === 'CASH' || Boolean(d.operationNumber), {
  message: 'Ingresa el número de operación.',
  path: ['operationNumber'],
});

type FormData = z.infer<typeof createIndividualSchema>;

interface CreateIndividualObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}

const CONCEPT_OPTIONS = [
  { value: 'OTROS', label: 'Otros Conceptos (Constancias, Certificados, etc.)' },
  { value: 'MATRICULA', label: 'Matrícula Anual' },
  { value: 'PENSION', label: 'Pensión de Enseñanza' },
  { value: 'LIBROS_MATERIALES', label: 'Libros y Materiales Educativos' },
  { value: 'UNIFORME', label: 'Uniforme Escolar' },
  { value: 'CARNET_AGENDA', label: 'Carnet / Agenda Escolar' },
  { value: 'EXCURSION_EVENTO', label: 'Excursión / Evento Extracurricular' },
];

export const CreateIndividualObligationModal: React.FC<CreateIndividualObligationModalProps> = ({
  isOpen,
  onClose,
  defaultStudentId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: studentsData, isLoading: loadingStudents } = useStudents(
    {
      page: 1,
      limit: 50,
      search: searchTerm || undefined,
    },
    isOpen,
  );

  const createMutation = useCreateIndividualObligation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createIndividualSchema),
    defaultValues: {
      studentId: defaultStudentId || '',
      concept: 'OTROS',
      title: '',
      amountDue: 50,
      dueDate: getTodayLocal(),
      notes: '',
      paidNow: true,
      paymentMethod: 'CASH',
      operationNumber: '',
    },
  });

  const paidNow = watch('paidNow');
  const amountDue = watch('amountDue');
  const paymentMethod = watch('paymentMethod');

  if (!isOpen) return null;

  const students = studentsData?.data || [];

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        studentId: data.studentId,
        concept: data.concept,
        title: data.title,
        amountDue: data.amountDue,
        dueDate: data.dueDate,
        notes: data.notes || undefined,
        paidNow: data.paidNow,
        paymentMethod: data.paidNow ? data.paymentMethod : undefined,
        operationNumber: data.paidNow && data.paymentMethod !== 'CASH' && data.operationNumber ? data.operationNumber : undefined,
      });

      if (data.paidNow) {
        toast.success(`Cobro de S/ ${Number(data.amountDue).toFixed(2)} registrado en tu caja con recibo numerado.`);
      } else {
        toast.success('📋 Cobro individual generado como deuda pendiente.');
      }

      reset();
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al procesar el cobro individual';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Nuevo Cobro en Caja
              </h2>
              <p className="text-xs text-muted-foreground">
                Emite y cobra trámites, certificados o conceptos extraordinarios
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

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Estudiante */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Estudiante a Cobrar:</span>
            </label>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Filtrar por apellido o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs h-8 bg-background border border-border rounded-lg px-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                {...register('studentId')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">— Selecciona un Estudiante —</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.lastNamePaternal} {st.lastNameMaternal || ''}, {st.firstNames} (
                    {st.documentType}: {st.documentId})
                  </option>
                ))}
              </select>
            </div>
            {errors.studentId && (
              <p className="text-[11px] text-destructive font-semibold">
                {errors.studentId.message}
              </p>
            )}
          </div>

          {/* Concepto y Título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Concepto:</label>
              <select
                {...register('concept')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {CONCEPT_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.concept && (
                <p className="text-[11px] text-destructive font-semibold">
                  {errors.concept.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Título / Glosa:</label>
              <Input
                {...register('title')}
                placeholder="Ej. Certificado de Estudios"
                className="h-9 text-xs"
              />
              {errors.title && (
                <p className="text-[11px] text-destructive font-semibold">
                  {errors.title.message}
                </p>
              )}
            </div>
          </div>

          {/* Monto y Fecha Vencimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span>Monto a Cobrar (S/):</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.10"
                {...register('amountDue')}
                className="h-9 text-xs font-black"
              />
              {errors.amountDue && (
                <p className="text-[11px] text-destructive font-semibold">
                  {errors.amountDue.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Fecha:</span>
              </label>
              <Input
                type="date"
                {...register('dueDate')}
                className="h-9 text-xs"
              />
              {errors.dueDate && (
                <p className="text-[11px] text-destructive font-semibold">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Cobro Inmediato en Caja */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Cobrar en caja de inmediato
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Registra el ingreso en el Arqueo de Caja y genera recibo
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('paidNow')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {paidNow && (
              <div className="space-y-3 pt-3 border-t border-border/60 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Método de Pago */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">Método de Cobro:</label>
                    <select
                      {...register('paymentMethod')}
                      className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* N° Operación (si no es efectivo) */}
                  {paymentMethod !== 'CASH' ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground">
                        N° de operación ({PAYMENT_METHOD_LABEL[paymentMethod]}):
                      </label>
                      <Input
                        {...register('operationNumber')}
                        placeholder="Ej: 94827104"
                        className="h-8 text-xs font-mono"
                      />
                      {errors.operationNumber && (
                        <p className="text-[11px] text-destructive">{errors.operationNumber.message}</p>
                      )}
                    </div>
                  ) : <div />}
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    El ingreso entra a <strong>tu caja</strong> con número de recibo correlativo. En efectivo necesitas tener la caja abierta.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Observaciones / Notas (Opcional):</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Detalle o justificación administrativa..."
              className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loadingStudents}
              className="text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting
                ? 'Procesando...'
                : paidNow
                ? `Cobrar S/ ${Number(amountDue || 0).toFixed(2)} y Registrar en Caja`
                : 'Emitir Deuda Pendiente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
