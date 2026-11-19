import React from 'react';
import { Input } from '@/components/ui/input';
import {
  LEVEL_LABEL,
  MONTH_LONG,
  type EducationLevel,
  type FeeSchedule,
} from '../../api/useFeeSchedules';
import { LEVELS, scopeLabel } from '../../constants';

export interface FeeScheduleFormState {
  educationLevel: EducationLevel;
  grade: string;
  enrollmentFee: string;
  admissionFee: string;
  monthlyFee: string;
  firstMonth: number;
  lastMonth: number;
  dueDay: string;
}

export interface FeeScheduleFormFieldsProps {
  form: FeeScheduleFormState;
  onChange: (f: FeeScheduleFormState) => void;
  editing: FeeSchedule | null;
  grades: number[];
}

const selectCls =
  'w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export const FeeScheduleFormFields: React.FC<FeeScheduleFormFieldsProps> = ({
  form: f,
  onChange,
  editing,
  grades,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="feeschedulespage-field-1" className="font-semibold block mb-1">
            Nivel *
          </label>
          <select
            id="feeschedulespage-field-1"
            className={selectCls}
            value={f.educationLevel}
            disabled={!!editing}
            onChange={(e) => onChange({ ...f, educationLevel: e.target.value as EducationLevel, grade: '' })}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="feeschedulespage-field-2" className="font-semibold block mb-1">
            Aplica a
          </label>
          <select
            id="feeschedulespage-field-2"
            className={selectCls}
            value={f.grade}
            disabled={!!editing}
            onChange={(e) => onChange({ ...f, grade: e.target.value })}
          >
            <option value="">Todo el nivel</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                Solo {scopeLabel({ educationLevel: f.educationLevel, grade: g }).toLowerCase()}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            El tarifario de un grado tiene prioridad sobre el del nivel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="feeschedulespage-field-3" className="font-semibold block mb-1">
            Matrícula (S/)
          </label>
          <Input
            id="feeschedulespage-field-3"
            type="number"
            min="0"
            step="0.01"
            className="text-xs rounded-xl font-mono"
            value={f.enrollmentFee}
            onChange={(e) => onChange({ ...f, enrollmentFee: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="feeschedulespage-field-4" className="font-semibold block mb-1">
            Pensión mensual (S/) *
          </label>
          <Input
            id="feeschedulespage-field-4"
            type="number"
            min="0"
            step="0.01"
            className="text-xs rounded-xl font-mono"
            value={f.monthlyFee}
            onChange={(e) => onChange({ ...f, monthlyFee: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="feeschedulespage-field-5" className="font-semibold block mb-1">
            Cuota de ingreso (S/)
          </label>
          <Input
            id="feeschedulespage-field-5"
            type="number"
            min="0"
            step="0.01"
            className="text-xs rounded-xl font-mono"
            value={f.admissionFee}
            onChange={(e) => onChange({ ...f, admissionFee: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">Solo para alumnos ingresantes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="feeschedulespage-field-6" className="font-semibold block mb-1">
            Pensión desde
          </label>
          <select
            id="feeschedulespage-field-6"
            className={selectCls}
            value={f.firstMonth}
            onChange={(e) => onChange({ ...f, firstMonth: Number(e.target.value) })}
          >
            {MONTH_LONG.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="feeschedulespage-field-7" className="font-semibold block mb-1">
            Hasta
          </label>
          <select
            id="feeschedulespage-field-7"
            className={selectCls}
            value={f.lastMonth}
            onChange={(e) => onChange({ ...f, lastMonth: Number(e.target.value) })}
          >
            {MONTH_LONG.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="feeschedulespage-field-8" className="font-semibold block mb-1">
            Vence el día
          </label>
          <Input
            id="feeschedulespage-field-8"
            type="number"
            min="1"
            max="31"
            className="text-xs rounded-xl font-mono"
            value={f.dueDay}
            onChange={(e) => onChange({ ...f, dueDay: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">31 = último día de cada mes.</p>
        </div>
      </div>
    </>
  );
};
