import React from 'react';
import { BookOpen, ClipboardList, MessageSquare, Calendar } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ContentType } from '../../types';
import type { CreateCourseContentFormData } from '../../schemas/course-content.schema';

interface PublishContentTypeAndFieldsProps {
  currentType: ContentType;
  currentBimester: number;
  periods: number[];
  periodLabel: string;
  register: UseFormRegister<CreateCourseContentFormData>;
  errors: FieldErrors<CreateCourseContentFormData>;
  onSelectType: (type: ContentType) => void;
  onSelectBimester: (bimester: number) => void;
}

export const PublishContentTypeAndFields: React.FC<PublishContentTypeAndFieldsProps> = ({
  currentType,
  currentBimester,
  periods,
  periodLabel,
  register,
  errors,
  onSelectType,
  onSelectBimester,
}) => {
  return (
    <>
      {/* Tipo de Publicación */}
      <div className="space-y-1.5">
        <label className="font-semibold text-foreground">Tipo de Contenido:</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectType('LESSON_MATERIAL')}
            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all text-xs font-semibold ${
              currentType === 'LESSON_MATERIAL'
                ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                currentType === 'LESSON_MATERIAL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold">Material de Clase</span>
              <span className="text-xs text-muted-foreground font-normal">PPT, PDF, Word</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectType('HOMEWORK')}
            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all text-xs font-semibold ${
              currentType === 'HOMEWORK'
                ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm ring-1 ring-amber-500/20'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                currentType === 'HOMEWORK' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold">Tarea Escolar</span>
              <span className="text-xs text-muted-foreground font-normal">Con fecha límite</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectType('FORUM')}
            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all text-xs font-semibold ${
              currentType === 'FORUM'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/20'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                currentType === 'FORUM' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold">Foro de Debate</span>
              <span className="text-xs text-muted-foreground font-normal">Pregunta y debate</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bimestre */}
      <div className="space-y-1.5">
        <label className="font-semibold text-foreground">{periodLabel} correspondiente:</label>
        <div className={`grid gap-2 ${periods.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {periods.map((bim) => (
            <button
              key={bim}
              type="button"
              onClick={() => onSelectBimester(bim)}
              className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                currentBimester === bim
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {bim}° {periodLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <label className="font-semibold text-foreground">Título:</label>
        <Input
          {...register('title')}
          placeholder={
            currentType === 'LESSON_MATERIAL'
              ? 'Ej: Sesión 04: Las Leyes de Newton (Diapositivas)'
              : currentType === 'HOMEWORK'
                ? 'Ej: Ficha de Actividades: Ejercicios 1 al 10'
                : 'Ej: Foro de Debate: ¿Cómo impacta el cambio climático en tu región?'
          }
          className="text-xs"
        />
        {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
      </div>

      {/* Descripción / Indicaciones */}
      <div className="space-y-1.5">
        <label className="font-semibold text-foreground">
          {currentType === 'FORUM' ? 'Pregunta disparadora / Tema de debate:' : 'Instrucciones o descripción:'}
        </label>
        <Textarea
          {...register('description')}
          rows={3}
          placeholder="Escribe las indicaciones para los estudiantes..."
          className="text-xs resize-none"
        />
      </div>

      {/* Fecha Límite si es Tarea */}
      {currentType === 'HOMEWORK' && (
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Fecha Límite de Entrega:</span>
          </label>
          <Input type="date" {...register('dueDate')} className="text-xs" />
        </div>
      )}
    </>
  );
};
