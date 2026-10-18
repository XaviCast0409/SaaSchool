import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeacherComplianceItem } from '../../types';

interface TeacherComplianceTableProps {
  teachers: TeacherComplianceItem[];
  isLoading: boolean;
  onFilterByTeacher?: (teacherId: string) => void;
}

export const TeacherComplianceTable: React.FC<TeacherComplianceTableProps> = ({
  teachers,
  isLoading,
  onFilterByTeacher,
}) => {
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-border bg-card">
        <p className="text-sm font-semibold text-muted-foreground">
          No se encontraron docentes registrados en la institución.
        </p>
      </Card>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedTeacherId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Docente</th>
              <th className="py-3 px-3 text-center">Cursos Asignados</th>
              <th className="py-3 px-3">Cobertura Curricular</th>
              <th className="py-3 px-3 text-center">Total Contenidos</th>
              <th className="py-3 px-3">Última Publicación</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teachers.map((t) => {
              const isExpanded = expandedTeacherId === t.id;
              const percent =
                t.assignedCoursesCount > 0
                  ? Math.round((t.coursesWithContentCount / t.assignedCoursesCount) * 100)
                  : 0;

              return (
                <React.Fragment key={t.id}>
                  <tr className="hover:bg-muted/30 transition-colors">
                    {/* Docente */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{t.fullName}</div>
                      <div className="text-[11px] text-muted-foreground font-normal">{t.email}</div>
                    </td>

                    {/* Cursos */}
                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {t.assignedCoursesCount}
                    </td>

                    {/* Barra de Cobertura */}
                    <td className="py-3 px-3 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                        <span>
                          {t.coursesWithContentCount} de {t.assignedCoursesCount} cursos
                        </span>
                        <span className="font-bold text-foreground">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percent === 100
                              ? 'bg-emerald-500'
                              : percent > 0
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>

                    {/* Total Contenidos */}
                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      <Badge variant="secondary" className="font-mono text-xs font-bold">
                        {t.totalContents}
                      </Badge>
                    </td>

                    {/* Última Publicación */}
                    <td className="py-3 px-3 text-muted-foreground">
                      {t.lastPublishedAt ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{new Date(t.lastPublishedAt).toLocaleDateString('es-PE')}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">— Sin actividad —</span>
                      )}
                    </td>

                    {/* Estado Semáforo */}
                    <td className="py-3 px-3 text-center">
                      {t.status === 'COMPLIANT' && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Al día</span>
                        </Badge>
                      )}
                      {t.status === 'PARTIAL' && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Parcial</span>
                        </Badge>
                      )}
                      {t.status === 'INACTIVE' && (
                        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 gap-1 text-[10px]">
                          <XCircle className="w-3 h-3" />
                          <span>Sin actividad</span>
                        </Badge>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.assignedCoursesCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(t.id)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <span>Materias</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 ml-1" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 ml-1" />
                            )}
                          </Button>
                        )}
                        {onFilterByTeacher && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onFilterByTeacher(t.id)}
                            className="h-8 px-2.5 text-xs font-semibold"
                          >
                            Ver Archivos
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Detalle desplegable de asignaturas del docente */}
                  {isExpanded && (
                    <tr className="bg-muted/10">
                      <td colSpan={7} className="p-3 pl-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {t.courses.map((c) => (
                            <div
                              key={c.assignmentId}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                c.contentsCount > 0
                                  ? 'bg-card border-border'
                                  : 'bg-red-500/5 border-red-500/20'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{c.areaName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {c.classroomLabel}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  c.contentsCount > 0
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                                }`}
                              >
                                {c.contentsCount > 0 ? `${c.contentsCount} publicaciones` : '0 subidos'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
