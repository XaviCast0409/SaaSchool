import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { StaffMeetingsView } from '../components/meetings/StaffMeetingsView';
import { ParentMeetingsView } from '../components/meetings/ParentMeetingsView';
import { DirectorMeetingsView } from '../components/meetings/DirectorMeetingsView';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isParent = user?.role === 'PARENT';
  const isDirection = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const [directionTab, setDirectionTab] = useState<'overview' | 'mine'>('overview');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Entrevistas</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isParent
              ? 'Reserva una cita con el tutor o los docentes de tu hijo(a), o pídeles un horario, sin llamadas ni cuaderno de control.'
              : isDirection
                ? 'Supervisa la atención a familias del colegio. Si también dictas en un aula, publica tus horarios en «Mis horarios».'
                : 'Publica tus horarios de atención y las familias reservan desde su app. Reciben un recordatorio la víspera.'}
          </p>
        </div>
      </div>
      {isDirection && (
        <div className="flex gap-1 border-b border-border" role="tablist">
          {(
            [
              ['overview', 'Supervisión del colegio'],
              ['mine', 'Mis horarios'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={directionTab === id}
              onClick={() => setDirectionTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${directionTab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {isParent ? (
        <ParentMeetingsView />
      ) : isDirection && directionTab === 'overview' ? (
        <DirectorMeetingsView />
      ) : (
        <StaffMeetingsView />
      )}
    </div>
  );
};
