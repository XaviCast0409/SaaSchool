import React from 'react';
import {
  School,
  UserCheck,
  ShieldCheck,
  FileText,
  Phone,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ParentChildInfo } from '../types';

interface ChildOverviewCardProps {
  child: ParentChildInfo;
}

export const ChildOverviewCard: React.FC<ChildOverviewCardProps> = ({ child }) => {
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
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
              {child.fullName}
            </h2>
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

        {/* Roles/Tags */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {child.isLegalGuardian && (
            <Badge variant="outline" className="text-[10px] gap-1 font-bold border-primary/30 text-primary bg-primary/5">
              <ShieldCheck className="w-3 h-3" />
              <span>Apoderado Legal</span>
            </Badge>
          )}
          {child.isFinancialResponsible && (
            <Badge variant="secondary" className="text-[10px] font-bold">
              Resp. Económico
            </Badge>
          )}
        </div>
      </div>

      {/* Classroom & Tutor Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-start gap-2.5">
          <School className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Aula Actual ({enrollment?.academicYear || 2026})
            </span>
            <span className="font-bold text-foreground block truncate mt-0.5">
              {classroom?.label || 'Sin aula asignada'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Turno {classroom?.shift === 'AFTERNOON' ? 'Tarde' : 'Mañana'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Docente Tutor(a)
            </span>
            <span className="font-bold text-foreground block truncate mt-0.5">
              {tutor?.fullName || 'Por asignar'}
            </span>
            {tutor?.cellphone && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-primary" />
                {tutor.cellphone}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
