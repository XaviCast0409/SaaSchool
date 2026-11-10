import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Filter,
  Award,
  AlertCircle,
  Stethoscope,
  CalendarClock,
  CheckCircle2,
  Clock,
  User,
  School as SchoolIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
import { useIncidents, useRegisterSiseve } from '../api/useIncidents';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { CreateIncidentModal } from '../components/CreateIncidentModal';
import type { IncidentType, IncidentSeverity } from '../types';
import { toast } from 'sonner';

const TYPE_CONFIG: Record<
  IncidentType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  MERITO: { label: 'Mérito', icon: <Award className="w-3.5 h-3.5 text-emerald-500" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  POSITIVE: { label: 'Mérito', icon: <Award className="w-3.5 h-3.5 text-emerald-500" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  DEMERITO: { label: 'Falta Conductual', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  BEHAVIORAL: { label: 'Conductual', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  ATENCION_TOPICO: { label: 'Tópico de Salud', icon: <Stethoscope className="w-3.5 h-3.5 text-blue-500" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  HEALTH: { label: 'Salud', icon: <Stethoscope className="w-3.5 h-3.5 text-blue-500" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  CITACION_PADRES: { label: 'Citación', icon: <CalendarClock className="w-3.5 h-3.5 text-purple-500" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  CITATION: { label: 'Citación', icon: <CalendarClock className="w-3.5 h-3.5 text-purple-500" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  ACADEMIC: { label: 'Académico', icon: <AlertCircle className="w-3.5 h-3.5 text-cyan-500" />, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  LOW: { label: 'Baja', badgeClass: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Media', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  HIGH: { label: 'Alta', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  CRITICAL: { label: 'Urgente', badgeClass: 'bg-destructive text-destructive-foreground font-black animate-pulse' },
};

export const IncidentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'ADMINISTRATIVE' ||
    user?.role === 'TEACHER';

  const canManageSiseve =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'ADMINISTRATIVE';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [siseveModalIncidentId, setSiseveModalIncidentId] = useState<string | null>(null);
  const [siseveInputCode, setSiseveInputCode] = useState('');

  const registerSiseveMutation = useRegisterSiseve();

  const handleSaveSiseve = async () => {
    if (!siseveModalIncidentId || !siseveInputCode.trim()) return;
    try {
      await registerSiseveMutation.mutateAsync({
        id: siseveModalIncidentId,
        siseveCode: siseveInputCode.trim(),
      });
      toast.success('Código SíseVe registrado correctamente.');
      setSiseveModalIncidentId(null);
      setSiseveInputCode('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al registrar el código SíseVe.');
    }
  };

  const { data: classrooms = [] } = useClassrooms();

  const { data: incidentsResponse, isLoading } = useIncidents({
    page,
    limit,
    type: selectedType !== 'ALL' ? selectedType : undefined,
    severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
    classroomId: selectedClassroomId || undefined,
  });

  const incidents = incidentsResponse?.data || [];
  const meta = incidentsResponse?.meta;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Agenda de Incidencias y Tópico
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bitácora de conducta, atenciones de enfermería, méritos y citaciones escolares
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Incidencia</span>
          </Button>
        )}
      </div>

      {/* 2. Barra de Filtros */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Filtros:</span>
        </div>

        {/* Tipo */}
        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(1);
          }}
          className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="ALL">— Todos los Tipos —</option>
          <option value="MERITO">Méritos</option>
          <option value="DEMERITO">Faltas Conductuales</option>
          <option value="ATENCION_TOPICO">Tópico / Salud</option>
          <option value="CITACION_PADRES">Citaciones</option>
        </select>

        {/* Severidad */}
        <select
          value={selectedSeverity}
          onChange={(e) => {
            setSelectedSeverity(e.target.value);
            setPage(1);
          }}
          className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="ALL">— Toda Severidad —</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Urgente</option>
        </select>

        {/* Aula / Salón */}
        <select
          value={selectedClassroomId}
          onChange={(e) => {
            setSelectedClassroomId(e.target.value);
            setPage(1);
          }}
          className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none max-w-[200px]"
        >
          <option value="">— Todas las Aulas —</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.grade}° "{c.section}" - {c.educationLevel}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Lista de Incidencias */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-6 space-y-2">
          <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Sin incidencias registradas</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No se encontraron eventos o citaciones con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const typeInfo = TYPE_CONFIG[inc.type] || TYPE_CONFIG.DEMERITO;
            const severityInfo = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.LOW;
            const student = inc.enrollment?.student;
            const studentName = student
              ? `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`
              : '—';
            const classroom = inc.enrollment?.classroom;
            const classroomLabel = classroom
              ? `${classroom.grade}° "${classroom.section}" (${classroom.educationLevel})`
              : '';
            const isAcknowledged = Boolean(inc.acknowledgedAt);

            return (
              <div
                key={inc.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3 hover:border-primary/30 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${typeInfo.color}`}
                    >
                      {typeInfo.icon}
                      <span>{typeInfo.label}</span>
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${severityInfo.badgeClass}`}>
                      Severidad: {severityInfo.label}
                    </Badge>

                    {inc.isViolenceCase && (
                      inc.siseveCode ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold"
                        >
                          SíseVe: {inc.siseveCode}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Pendiente SíseVe
                          </Badge>
                          {canManageSiseve && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSiseveModalIncidentId(inc.id);
                                setSiseveInputCode('');
                              }}
                              className="h-6 text-[10px] px-2 font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                            >
                              Registrar código SíseVe
                            </Button>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(inc.createdAt).toLocaleString('es-PE')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Info Alumno y Autor */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{studentName}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <SchoolIcon className="w-3 h-3" />
                      <span>{classroomLabel}</span>
                    </div>
                    {inc.author && (
                      <p className="text-[10px] text-muted-foreground pt-1">
                        Por: {inc.author.firstName} {inc.author.lastNamePaternal}
                      </p>
                    )}
                  </div>

                  {/* Descripción y Título */}
                  <div className="md:col-span-2 space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">{inc.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {inc.description}
                    </p>

                    {inc.actionTaken && (
                      <div className="p-2 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground">
                        <strong className="text-foreground">Acción / Medida tomada: </strong>
                        {inc.actionTaken}
                      </div>
                    )}

                    {inc.citationDate && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2 font-semibold">
                        <CalendarClock className="w-4 h-4" />
                        <span>
                          Citación programada: {new Date(inc.citationDate).toLocaleString('es-PE')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer de Acuse de Recibo */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  {isAcknowledged ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Enterado por el apoderado el{' '}
                        {new Date(inc.acknowledgedAt!).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pendiente de acuse del padre</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {meta && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* Modal de Registro */}
      {isCreateModalOpen && (
        <CreateIncidentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Modal para Registrar Código SíseVe */}
      {siseveModalIncidentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Registrar Código SíseVe
            </h3>
            <p className="text-xs text-muted-foreground">
              Ingresa el código asignado por el portal del MINEDU (siseve.minedu.gob.pe).
            </p>
            <Input
              value={siseveInputCode}
              onChange={(e) => setSiseveInputCode(e.target.value)}
              placeholder="Ej: SIS-2026-00123"
              className="text-xs h-9 font-mono"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSiseveModalIncidentId(null)}
                className="text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSiseve}
                disabled={siseveInputCode.trim().length < 3 || registerSiseveMutation.isPending}
                className="text-xs font-bold"
              >
                {registerSiseveMutation.isPending ? 'Guardando...' : 'Guardar Código'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

