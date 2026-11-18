import React from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SubscriptionPlan } from '@/features/schools/types';
import { useAuthStore } from '@/store/useAuthStore';
import { whatsappUrl } from '@/features/marketing/lib/marketing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/PageLoader';

interface PlanGuardProps {
  minPlan: SubscriptionPlan;
  children: React.ReactNode;
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  BASIC: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

interface ModuleInfo {
  name: string;
  benefits: string[];
}

/** Qué gana el colegio con cada módulo bloqueado (por prefijo de ruta, el más específico primero) */
const MODULES: Array<[prefix: string, info: ModuleInfo]> = [
  [
    '/academic/progress',
    {
      name: 'Avance y cierre de periodo',
      benefits: [
        'Seguimiento del registro de notas por docente y curso.',
        'Detección de cursos con notas pendientes antes del cierre.',
        'Cierre ordenado de cada periodo académico.',
      ],
    },
  ],
  [
    '/academic/report-cards',
    {
      name: 'Libretas de notas',
      benefits: [
        'Libretas listas para imprimir por aula.',
        'Formato oficial con la escala del colegio.',
        'Las familias las consultan desde su portal.',
      ],
    },
  ],
  [
    '/academic/tutor-report',
    {
      name: 'Informe del tutor',
      benefits: ['Resumen académico y de asistencia del aula a cargo.', 'Apoyo para las reuniones con las familias.'],
    },
  ],
  [
    '/academic/reports',
    {
      name: 'Reportes académicos',
      benefits: ['Consolidado de notas del aula.', 'Libretas para imprimir.', 'Archivo de notas listo para el SIAGIE.'],
    },
  ],
  [
    '/academic-reports',
    {
      name: 'Catálogo de reportes',
      benefits: [
        'Cuadros de mérito por aula y grado.',
        'Nóminas, cumpleaños y reportes de familias.',
        'Descarga directa en PDF o Excel.',
      ],
    },
  ],
  [
    '/gradebook',
    {
      name: 'Registro de notas',
      benefits: [
        'Registro de notas por competencias (CNEB).',
        'Carga rápida desde el celular o la computadora.',
        'Libretas generadas a partir del registro.',
      ],
    },
  ],
  [
    '/insights',
    {
      name: 'Analítica y tutoría',
      benefits: [
        'Alumnos en riesgo académico o de asistencia, en una sola vista.',
        'Seguimiento de las acciones de tutoría.',
      ],
    },
  ],
  [
    '/evaluation-criteria',
    {
      name: 'Criterios y escala de evaluación',
      benefits: ['Escala de calificación propia del colegio.', 'Criterios de evaluación por nivel.'],
    },
  ],
  [
    '/virtual-classroom-supervision',
    {
      name: 'Supervisión del aula virtual',
      benefits: ['Qué publica cada docente en su aula virtual.', 'Cumplimiento de publicaciones y tareas por docente.'],
    },
  ],
];

const DEFAULT_MODULE: ModuleInfo = {
  name: 'Este módulo',
  benefits: [
    'Registro de notas en formato oficial SIAGIE / CNEB.',
    'Generación e impresión de libretas de notas.',
    'Soporte técnico prioritario.',
  ],
};

export const PlanGuard: React.FC<PlanGuardProps> = ({ minPlan, children }) => {
  const { pathname } = useLocation();
  const role = useAuthStore((state) => state.user?.role);
  const { data: school, isLoading } = useGetActiveSchool();

  // Soporte entra a todo (igual que en el menú)
  if (role === 'SUPER_ADMIN') return <>{children}</>;
  // Sin el plan cargado no se puede decidir: evita mostrar el candado un instante
  if (isLoading) return <PageLoader />;

  const currentPlan: SubscriptionPlan = school?.plan || 'BASIC';
  const userPlanLevel = PLAN_HIERARCHY[currentPlan] || 1;
  const requiredPlanLevel = PLAN_HIERARCHY[minPlan] || 1;

  if (userPlanLevel >= requiredPlanLevel) {
    return <>{children}</>;
  }

  const moduleInfo = MODULES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? DEFAULT_MODULE;
  // Solo la dirección gestiona la suscripción; al resto se le indica a quién pedirlo
  const canUpgrade = role === 'SCHOOL_ADMIN';
  const upgradeText = `Hola, soy de ${school?.name || 'mi colegio'} y quiero pasar al Plan ${minPlan} para usar ${moduleInfo.name}.`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Card className="max-w-md w-full border-border bg-card shadow-xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <CardContent className="p-8 space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Requiere Plan {minPlan}</span>
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              {moduleInfo.name} no está en tu plan actual
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{school?.name || 'Tu colegio'}</strong> cuenta con el{' '}
              <strong className="text-primary">Plan {currentPlan}</strong>.{' '}
              {canUpgrade
                ? 'Escríbenos y lo activamos sin perder nada de lo que ya tienes registrado.'
                : 'Si lo necesitas, coméntalo con la dirección del colegio.'}
            </p>
          </div>

          <div className="w-full p-3.5 rounded-xl bg-secondary/50 border border-border text-left space-y-2">
            <div className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Con este módulo obtienes:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside pl-1">
              {moduleInfo.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>

          {canUpgrade && (
            <Button asChild className="w-full gap-2 text-sm font-bold">
              <a href={whatsappUrl(upgradeText)} target="_blank" rel="noreferrer">
                <span>Solicitar Plan {minPlan} por WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
