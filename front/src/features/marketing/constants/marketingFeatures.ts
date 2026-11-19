import {
  BarChart3,
  ClipboardList,
  GraduationCap,
  QrCode,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  EnrollmentVisual,
  FamilyVisual,
  GradesVisual,
  InsightsVisual,
  PaymentsVisual,
  QrVisual,
} from '../components/visuals';

export const AUTO_ADVANCE_MS = 7000;

export const FEATURES = [
  {
    id: 'asistencia',
    icon: QrCode,
    label: 'Asistencia',
    title: 'Un escaneo en la puerta y todos saben que llegó.',
    text: 'Carné con QR para cada alumno. Tardanzas según tu horario, aviso al celular del padre y control de quién recoge a cada niño.',
    points: ['Kiosco con cámara o lector', 'Justificaciones desde la app', 'Alertas de ausentismo'],
    visual: QrVisual,
  },
  {
    id: 'notas',
    icon: GraduationCap,
    label: 'Notas',
    title: 'Notas por competencias, sin pelear con Excel.',
    text: 'Una matriz que el docente ya conoce, con la malla del CNEB cargada, promedios automáticos y libretas listas.',
    points: ['AD · A · B · C o vigesimal', 'Cierre de actas por Dirección', 'Guardado aunque se vaya la luz'],
    visual: GradesVisual,
  },
  {
    id: 'pensiones',
    icon: Wallet,
    label: 'Pensiones',
    title: 'Cobra a tiempo sin incomodar a nadie.',
    text: 'Cronograma anual con becas y descuentos, recordatorios automáticos y caja cuadrada al final de cada día.',
    points: ['Recordatorio por WhatsApp en 1 clic', 'Recibos numerados', 'Reportes de cobranza'],
    visual: PaymentsVisual,
  },
  {
    id: 'familias',
    icon: Smartphone,
    label: 'Familias',
    title: 'Los padres informados, sin grupos de WhatsApp.',
    text: 'Un portal para todos sus hijos: asistencia, notas, tareas y pagos en un semáforo fácil de entender.',
    points: ['Comunicados y mensajería', 'Agenda de entrevistas', 'Notificaciones al celular'],
    visual: FamilyVisual,
  },
  {
    id: 'matricula',
    icon: ClipboardList,
    label: 'Matrícula',
    title: 'Matricula en minutos y entrega al SIAGIE sin redigitar.',
    text: 'Alumno, aula y apoderado en una sola ficha. Nóminas oficiales, constancias y admisión ordenada.',
    points: ['Importa nóminas del SIAGIE', 'Becas y pensión por alumno', 'Libro de Reclamaciones virtual'],
    visual: EnrollmentVisual,
  },
  {
    id: 'reportes',
    icon: BarChart3,
    label: 'Reportes',
    title: 'Detecta a tiempo al alumno que se está quedando.',
    text: 'La alerta temprana cruza faltas, notas, tareas e incidencias y te dice por qué. Más reportes oficiales y orden de mérito.',
    points: ['Tercio y quinto superior', 'Consolidados en Excel', 'Automatizaciones semanales'],
    visual: InsightsVisual,
  },
] as const;
