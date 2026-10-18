import React from 'react';
import {
  School,
  UserCheck,
  FileText,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ParentChildInfo } from '../types';

interface StudentOverviewCardProps {
  child: ParentChildInfo;
}

export const StudentOverviewCard: React.FC<StudentOverviewCardProps> = ({ child }) => {
  const enrollment = child.activeEnrollment;
  const classroom = enrollment?.classroom;
  const tutor = classroom?.tutor;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-lg text-primary shrink-0 shadow-sm">
            {child.firstNames.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
                {child.fullName}
              </h2>
              <Badge variant="secondary" className="text-[10px] gap-1 font-bold bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3" />
                <span>Estudiante</span>
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <FileText className="w-3.5 h-3.5" />
                <span>DNI {child.documentId}</span>
              </span>
              {child.studentCode && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    SIAGIE: {child.studentCode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Tag */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Badge variant="outline" className="text-[11px] gap-1.5 font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Matrícula Vigente {enrollment?.academicYear || 2026}</span>
          </Badge>
        </div>
      </div>

      {/* Classroom & Tutor Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-start gap-2.5">
          <School className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Aula & Nivel Educativo
            </span>
            <span className="font-extrabold text-foreground text-sm">
              {classroom ? `${classroom.grade}° "${classroom.section}"` : 'Sin aula asignada'}
            </span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Nivel {classroom?.educationLevel === 'INITIAL' ? 'Inicial' : classroom?.educationLevel === 'SECONDARY' ? 'Secundaria' : 'Primaria'}
              {classroom?.shift && ` • Turno ${classroom.shift}`}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Docente Tutor(a) de Aula
            </span>
            <span className="font-extrabold text-foreground text-sm truncate block">
              {tutor ? tutor.fullName : 'No asignado'}
            </span>
            <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
              {tutor?.cellphone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-primary" />
                  <span>{tutor.cellphone}</span>
                </span>
              )}
              {tutor?.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 text-primary" />
                  <span className="truncate">{tutor.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
