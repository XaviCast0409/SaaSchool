import type { EducationLevel } from './cneb.catalog';
import { PREUNIVERSITY_COURSES } from './preuniversity.catalog';

/**
 * Banco de frases de fábrica para las conclusiones descriptivas.
 *
 * Cada frase sale de combinar un FRAGMENTO (lo que el estudiante hace, en infinitivo) con una
 * PLANTILLA según el nivel de logro. Así hay muchas frases distintas por competencia sin redactar
 * cientos de textos a mano, y todas cumplen el largo que pide el SIAGIE (10 a 500 caracteres).
 *
 * La clave de cada frase es estable (no depende del orden de la lista) para que el colegio pueda
 * ocultar frases de fábrica de forma permanente.
 */

export type PhraseLetter = 'AD' | 'A' | 'B' | 'C';
export const PHRASE_LETTERS: PhraseLetter[] = ['AD', 'A', 'B', 'C'];

/** Plantillas por nivel de logro. {f} = fragmento; {grado} = "su grado" o "su edad" (inicial). */
const TEMPLATES: Record<PhraseLetter, Array<{ id: string; text: string }>> = {
  AD: [
    { id: 'ad1', text: 'Demuestra un logro destacado al {f}, superando lo esperado para {grado}.' },
    { id: 'ad2', text: 'Logra de manera sobresaliente {f}, y explica con claridad cómo lo hace.' },
    { id: 'ad3', text: 'Destaca al {f}, con autonomía y seguridad, y apoya a sus compañeros.' },
  ],
  A: [
    { id: 'a1', text: 'Logra {f} de manera adecuada.' },
    { id: 'a2', text: 'Alcanza lo esperado para {grado} al {f}.' },
    { id: 'a3', text: 'Muestra un buen desempeño al {f}.' },
  ],
  B: [
    { id: 'b1', text: 'Está en proceso de {f}; necesita práctica guiada para consolidarlo.' },
    { id: 'b2', text: 'Muestra avances al {f}, pero aún requiere acompañamiento del docente.' },
    { id: 'b3', text: 'Está en proceso de {f}; se recomienda reforzar con actividades en casa.' },
  ],
  C: [
    { id: 'c1', text: 'Se encuentra en inicio al {f}; requiere acompañamiento continuo del docente y apoyo en casa.' },
    { id: 'c2', text: 'Presenta dificultades para {f}; se recomienda un plan de refuerzo con apoyo de la familia.' },
    { id: 'c3', text: 'Inicia el desarrollo de su capacidad para {f}; necesita acompañamiento cercano y práctica constante.' },
  ],
};

/** Fragmentos por competencia CNEB (1 a 31). */
export const COMPETENCE_FRAGMENTS: Record<number, string[]> = {
  1: [
    'reconocer sus características, cualidades y emociones',
    'expresar sus emociones y regularlas de forma adecuada',
    'tomar decisiones responsables sobre su cuidado personal y su bienestar',
    'reflexionar sobre sus acciones y asumir compromisos de mejora',
  ],
  2: [
    'coordinar sus movimientos en diversas actividades físicas',
    'explorar las posibilidades de su cuerpo con seguridad y control',
    'ajustar sus movimientos al ritmo, al espacio y a los objetos',
  ],
  3: [
    'practicar hábitos de higiene, alimentación y actividad física saludables',
    'reconocer cómo la actividad física beneficia su salud',
    'realizar el calentamiento y la relajación de forma adecuada',
  ],
  4: [
    'participar en juegos y deportes respetando las reglas y a sus compañeros',
    'trabajar en equipo durante las actividades físicas',
    'proponer estrategias de juego junto a su equipo',
  ],
  5: [
    'apreciar manifestaciones artístico-culturales de su entorno y de otras culturas',
    'describir e interpretar los elementos de una obra artística',
    'explicar el significado de las manifestaciones artísticas que observa',
  ],
  6: [
    'crear producciones artísticas expresando sus ideas y emociones',
    'explorar materiales y técnicas artísticas de forma creativa',
    'planificar y presentar sus proyectos artísticos',
  ],
  7: [
    'expresar sus ideas oralmente con claridad y coherencia',
    'escuchar con atención y responder de forma pertinente',
    'participar en diálogos y exposiciones respetando los turnos de habla',
    'adecuar su forma de hablar a la situación comunicativa',
  ],
  8: [
    'comprender diversos tipos de textos identificando la información relevante',
    'inferir el sentido de los textos que lee',
    'opinar sobre el contenido y la forma de los textos que lee',
  ],
  9: [
    'escribir textos coherentes y cohesionados según su propósito',
    'usar adecuadamente la ortografía y los signos de puntuación',
    'revisar y mejorar sus textos antes de presentarlos',
  ],
  10: [
    'expresarse oralmente en castellano en situaciones cotidianas',
    'comprender lo que escucha en castellano',
    'dialogar en castellano con sus compañeros y docentes',
  ],
  11: [
    'comprender textos sencillos escritos en castellano',
    'identificar información importante en textos en castellano',
    'deducir el significado de palabras en castellano a partir del contexto',
  ],
  12: [
    'escribir textos sencillos en castellano con un propósito claro',
    'organizar sus ideas al escribir en castellano',
    'usar el vocabulario adecuado al escribir en castellano',
  ],
  13: [
    'comunicarse oralmente en inglés en situaciones cotidianas',
    'comprender instrucciones y expresiones básicas en inglés',
    'pronunciar con claridad el vocabulario trabajado en inglés',
  ],
  14: [
    'comprender textos breves escritos en inglés',
    'identificar información específica en textos en inglés',
    'deducir el significado de palabras en inglés por el contexto',
  ],
  15: [
    'escribir textos breves en inglés con un propósito claro',
    'usar el vocabulario y las estructuras gramaticales trabajadas en inglés',
    'organizar sus ideas al escribir en inglés',
  ],
  16: [
    'convivir respetando las normas y los acuerdos del aula',
    'manejar los conflictos de manera dialogada y respetuosa',
    'participar en acciones que promueven el bien común',
    'respetar la diversidad y los derechos de los demás',
  ],
  17: [
    'interpretar hechos y procesos históricos usando diversas fuentes',
    'explicar las causas y consecuencias de los procesos históricos',
    'ubicar hechos históricos en el tiempo y reconocer cambios y permanencias',
  ],
  18: [
    'explicar la relación entre los elementos naturales y sociales del espacio geográfico',
    'proponer acciones para el cuidado del ambiente',
    'usar mapas y otras herramientas para ubicarse en el espacio',
  ],
  19: [
    'explicar el rol de las personas, las empresas y el Estado en la economía',
    'tomar decisiones responsables sobre el uso de sus recursos',
    'reconocer la importancia del ahorro y del consumo responsable',
  ],
  20: [
    'formular preguntas e hipótesis sobre hechos de su entorno',
    'realizar experimentos siguiendo procedimientos para comprobar sus hipótesis',
    'registrar, analizar y comunicar los resultados de sus indagaciones',
  ],
  21: [
    'explicar fenómenos naturales con base en conocimientos científicos',
    'relacionar los conceptos científicos con situaciones de la vida diaria',
    'argumentar sus explicaciones sobre los seres vivos, la materia y la energía',
  ],
  22: [
    'diseñar soluciones tecnológicas para resolver problemas de su entorno',
    'construir prototipos siguiendo un plan de trabajo',
    'evaluar el funcionamiento de sus soluciones tecnológicas y proponer mejoras',
  ],
  23: [
    'resolver problemas con números y operaciones',
    'estimar y calcular usando estrategias adecuadas',
    'explicar los procedimientos que usa al resolver problemas de cantidad',
  ],
  24: [
    'identificar patrones y regularidades',
    'resolver ecuaciones e inecuaciones en situaciones problemáticas',
    'representar relaciones de cambio con tablas, gráficos y expresiones algebraicas',
  ],
  25: [
    'resolver problemas sobre formas geométricas, medidas y ubicación',
    'representar y describir figuras y cuerpos geométricos',
    'usar estrategias para medir longitudes, áreas y volúmenes',
  ],
  26: [
    'organizar datos en tablas y gráficos estadísticos',
    'interpretar información estadística para tomar decisiones',
    'determinar la probabilidad de sucesos en situaciones cotidianas',
  ],
  27: [
    'plantear ideas de emprendimiento que responden a necesidades de su entorno',
    'trabajar en equipo para desarrollar su proyecto de emprendimiento',
    'evaluar los resultados de su proyecto y proponer mejoras',
  ],
  28: [
    'utilizar herramientas digitales en sus actividades de aprendizaje',
    'buscar y seleccionar información en entornos virtuales de forma responsable',
    'crear y compartir contenidos digitales de manera segura',
  ],
  29: [
    'organizar sus tiempos y actividades para cumplir sus metas de aprendizaje',
    'reflexionar sobre sus avances y dificultades para mejorar',
    'asumir con responsabilidad sus tareas y compromisos escolares',
  ],
  30: [
    'reconocer el amor de Dios en su vida y en la de los demás',
    'reflexionar sobre los valores de su fe y aplicarlos en su vida diaria',
    'respetar las creencias religiosas de sus compañeros',
  ],
  31: [
    'expresar su fe con acciones de servicio y solidaridad',
    'participar con respeto en las celebraciones y actividades del área',
    'vivir los valores cristianos en su relación con los demás',
  ],
};

/** Fragmentos por curso del catálogo preuniversitario (aplican a todas las competencias del curso). */
export const COURSE_FRAGMENTS: Record<string, string[]> = {
  ARITMETICA: [
    'resolver problemas con números naturales, enteros y racionales',
    'aplicar las propiedades de las operaciones aritméticas',
    'resolver problemas de porcentajes, razones y proporciones',
  ],
  ALGEBRA: [
    'resolver ecuaciones e inecuaciones',
    'simplificar expresiones algebraicas aplicando sus propiedades',
    'plantear ecuaciones a partir de situaciones problemáticas',
  ],
  GEOMETRIA: [
    'resolver problemas con figuras planas y sólidos geométricos',
    'calcular perímetros, áreas y volúmenes',
    'aplicar teoremas geométricos en la resolución de problemas',
  ],
  TRIGONOMETRIA: [
    'aplicar las razones trigonométricas en la resolución de problemas',
    'resolver problemas con ángulos y triángulos',
    'usar identidades trigonométricas para simplificar expresiones',
  ],
  RAZ_MATEMATICO: [
    'resolver problemas de razonamiento lógico-matemático',
    'aplicar estrategias de cálculo rápido y deducción',
    'analizar e interpretar información de gráficos y tablas',
  ],
  ESTADISTICA: [
    'organizar e interpretar datos en tablas y gráficos',
    'calcular e interpretar medidas de tendencia central',
    'determinar la probabilidad de sucesos',
  ],
  LENGUAJE: [
    'aplicar las normas gramaticales y ortográficas en sus textos',
    'reconocer las categorías gramaticales y su función en la oración',
    'expresarse con corrección de forma oral y escrita',
  ],
  LITERATURA: [
    'analizar obras literarias reconociendo sus características',
    'identificar los movimientos literarios y sus principales autores',
    'interpretar el mensaje de los textos literarios que lee',
  ],
  RAZ_VERBAL: [
    'resolver ejercicios de razonamiento verbal',
    'comprender textos e identificar su idea principal',
    'establecer relaciones de significado entre palabras',
  ],
  PLAN_LECTOR: [
    'leer con fluidez y comprensión las obras del plan lector',
    'comentar y opinar sobre las obras leídas',
    'mantener el hábito de lectura con interés',
  ],
  HIST_PERU: [
    'analizar los procesos de la historia del Perú y su influencia en el presente',
    'interpretar fuentes sobre los hechos de la historia del Perú',
    'valorar el patrimonio histórico y cultural del Perú',
  ],
  HIST_UNIVERSAL: [
    'analizar los principales procesos de la historia universal',
    'relacionar los hechos de la historia universal con la realidad actual',
    'comparar civilizaciones y periodos históricos',
  ],
  GEOGRAFIA: [
    'analizar las características del espacio geográfico y su relación con las actividades humanas',
    'interpretar mapas y otras representaciones geográficas',
    'explicar la diversidad geográfica del Perú y del mundo',
  ],
  ECONOMIA: [
    'explicar conceptos básicos de economía en situaciones cotidianas',
    'analizar el funcionamiento del mercado y el rol del Estado',
    'tomar decisiones económicas responsables',
  ],
  CIVICA: [
    'reconocer sus derechos y deberes como ciudadano',
    'participar en asuntos públicos de manera democrática',
    'valorar las normas de convivencia y las instituciones democráticas',
  ],
  PSICOLOGIA: [
    'reconocer los procesos psicológicos que influyen en su conducta',
    'reflexionar sobre su desarrollo personal y emocional',
    'aplicar estrategias para manejar sus emociones',
  ],
  FILOSOFIA: [
    'reflexionar críticamente sobre problemas filosóficos',
    'argumentar sus ideas con fundamentos racionales',
    'analizar dilemas éticos de la vida cotidiana',
  ],
  LOGICA: [
    'aplicar las reglas del razonamiento lógico',
    'identificar argumentos válidos y falacias',
    'resolver ejercicios de lógica proposicional',
  ],
  FISICA: [
    'explicar fenómenos físicos aplicando leyes y principios',
    'resolver problemas de física con procedimientos adecuados',
    'realizar experiencias para comprobar principios físicos',
  ],
  QUIMICA: [
    'explicar la composición y las transformaciones de la materia',
    'resolver problemas de química con procedimientos adecuados',
    'realizar experiencias de laboratorio siguiendo normas de seguridad',
  ],
  BIOLOGIA: [
    'explicar la estructura y el funcionamiento de los seres vivos',
    'relacionar los conocimientos biológicos con el cuidado de la salud',
    'valorar la biodiversidad y la importancia de conservarla',
  ],
};

export interface FactoryPhrase {
  key: string;
  cnebNumber: number;
  letter: PhraseLetter;
  courseKey: string | null;
  text: string;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const render = (template: string, fragment: string, level: EducationLevel | null) =>
  template.replace('{f}', fragment).replace('{grado}', level === 'INITIAL' ? 'su edad' : 'su grado');

/**
 * Frases de fábrica para una competencia. Si se pasa courseKey, primero van las del curso
 * (ej: Álgebra) y luego las generales de la competencia.
 */
export function factoryPhrases(opts: { cnebNumber: number; level?: EducationLevel | null; courseKey?: string | null; letter?: PhraseLetter | null }): FactoryPhrase[] {
  const level = opts.level ?? null;
  const letters = opts.letter ? [opts.letter] : PHRASE_LETTERS;
  const out: FactoryPhrase[] = [];
  const course = opts.courseKey ? PREUNIVERSITY_COURSES.find((c) => c.key === opts.courseKey) : undefined;
  const courseApplies = course && Object.values(course.levels).some((l) => l?.competences.includes(opts.cnebNumber));
  const sources: Array<{ courseKey: string | null; fragments: string[] }> = [];
  if (courseApplies && COURSE_FRAGMENTS[course!.key]) sources.push({ courseKey: course!.key, fragments: COURSE_FRAGMENTS[course!.key] });
  sources.push({ courseKey: null, fragments: COMPETENCE_FRAGMENTS[opts.cnebNumber] ?? [] });

  for (const letter of letters) {
    for (const src of sources) {
      for (const fragment of src.fragments) {
        for (const t of TEMPLATES[letter]) {
          const scope = src.courseKey ?? `C${opts.cnebNumber}`;
          out.push({
            key: `F:${scope}:${letter}:${t.id}:${hash(fragment)}`,
            cnebNumber: opts.cnebNumber,
            letter,
            courseKey: src.courseKey,
            text: render(t.text, fragment, level),
          });
        }
      }
    }
  }
  return out;
}

/** Todas las claves de fábrica posibles (para validar al ocultar). */
export function isFactoryPhraseKey(key: string): boolean {
  return /^F:[A-Z0-9_]+:(AD|A|B|C):(ad|a|b|c)\d:[0-9a-z]+$/.test(key);
}
