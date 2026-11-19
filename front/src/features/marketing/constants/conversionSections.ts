import type { InterestPlan } from '../api/useCreateLead';

export const ROLES = [
  {
    who: 'Dirección',
    gets: 'Indicadores del colegio, cobranza, cumplimiento docente y alumnos en riesgo.',
    tone: 'var(--kx-coral)',
  },
  {
    who: 'Secretaría',
    gets: 'Matrícula, admisión, trámites, constancias, caja y padrones oficiales.',
    tone: 'var(--kx-purple)',
  },
  { who: 'Docentes', gets: 'Asistencia, notas, aula virtual, rúbricas y banco de recursos.', tone: 'var(--kx-coral)' },
  {
    who: 'Padres',
    gets: 'Asistencia, notas, pagos y mensajes de todos sus hijos en el celular.',
    tone: 'var(--kx-purple)',
  },
  {
    who: 'Alumnos',
    gets: 'Sus cursos, tareas y foros, con su propia cuenta y sin ver pagos.',
    tone: 'var(--kx-coral)',
  },
];

export const PLANS: Array<{
  id: InterestPlan;
  name: string;
  price: number;
  quota: string;
  pitch: string;
  features: string[];
  featured?: boolean;
  soon?: boolean;
}> = [
  {
    id: 'BASIC',
    name: 'Básico',
    price: 300,
    quota: 'Hasta 150 alumnos',
    pitch: 'Para ordenar la operación diaria.',
    features: [
      'Matrícula, secretaría y SIAGIE',
      'Asistencia con QR y portería',
      'Pensiones, caja y cobranza',
      'Portal familiar y comunicados',
      'Mensajería, entrevistas e incidencias',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 350,
    quota: 'Hasta 500 alumnos',
    pitch: 'La gestión académica completa.',
    featured: true,
    features: [
      'Todo lo del plan Básico',
      'Registro de notas por competencias',
      'Reportes académicos oficiales',
      'Alerta temprana y tutoría',
      'Supervisión del aula virtual',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 450,
    quota: 'Alumnos ilimitados',
    pitch: 'Para colegios grandes o con varias sedes.',
    soon: true,
    features: ['Todo lo del plan Pro', 'Sin límite de alumnos', 'Pensado para varias sedes'],
  },
];

export const FAQS = [
  {
    q: '¿Necesito instalar algo o comprar equipos?',
    a: 'No. KIPUX funciona en el navegador de cualquier computadora, tablet o celular. Para el kiosco de asistencia basta la cámara de un celular o un lector de códigos.',
  },
  {
    q: '¿Sirve para el SIAGIE?',
    a: 'Sí. Puedes importar las nóminas del SIAGIE, exportar la nómina de matrícula en el formato oficial y consolidar las notas por las áreas que pide el MINEDU.',
  },
  {
    q: '¿Qué pasa con la información que ya tengo en Excel?',
    a: 'Te acompañamos para cargar aulas, malla curricular, alumnos y familias. Si ya los tienes en el SIAGIE, se importan desde ahí.',
  },
  {
    q: '¿Los padres tienen que pagar o descargar una app?',
    a: 'No. Los padres y alumnos entran sin costo desde el navegador del celular y pueden recibir notificaciones al instante.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'La información de cada colegio está separada de los demás, cada usuario ve solo lo que le corresponde según su rol y queda registro de quién cambió qué y cuándo.',
  },
  {
    q: '¿Cuánto demora empezar?',
    a: 'Depende del tamaño del colegio y de cómo tengas tus datos. Lo conversamos en la demostración y te damos un plan de arranque.',
  },
];
