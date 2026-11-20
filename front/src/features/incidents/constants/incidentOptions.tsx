import React from 'react';
import { Award, AlertCircle, Stethoscope, CalendarClock } from 'lucide-react';
import type { IncidentType, IncidentSeverity } from '../types';

export const TYPE_CONFIG: Record<IncidentType, { label: string; icon: React.ReactNode; color: string }> = {
  MERITO: {
    label: 'Mérito',
    icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  POSITIVE: {
    label: 'Mérito',
    icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  DEMERITO: {
    label: 'Falta Conductual',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  BEHAVIORAL: {
    label: 'Conductual',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  ATENCION_TOPICO: {
    label: 'Tópico de Salud',
    icon: <Stethoscope className="w-3.5 h-3.5 text-blue-500" />,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  HEALTH: {
    label: 'Salud',
    icon: <Stethoscope className="w-3.5 h-3.5 text-blue-500" />,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  CITACION_PADRES: {
    label: 'Citación',
    icon: <CalendarClock className="w-3.5 h-3.5 text-purple-500" />,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  CITATION: {
    label: 'Citación',
    icon: <CalendarClock className="w-3.5 h-3.5 text-purple-500" />,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  ACADEMIC: {
    label: 'Académico',
    icon: <AlertCircle className="w-3.5 h-3.5 text-cyan-500" />,
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
};

export const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  LOW: { label: 'Baja', badgeClass: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Media', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  HIGH: { label: 'Alta', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  CRITICAL: { label: 'Urgente', badgeClass: 'bg-destructive text-destructive-foreground font-black animate-pulse' },
};

export const INCIDENT_TYPE_OPTIONS: Array<{ value: IncidentType; label: string }> = [
  { value: 'MERITO', label: 'Mérito / Reconocimiento' },
  { value: 'DEMERITO', label: 'Falta / Demérito Conductual' },
  { value: 'ATENCION_TOPICO', label: 'Atención en Tópico / Enfermería' },
  { value: 'CITACION_PADRES', label: 'Citación a Padres / Entrevista' },
];
