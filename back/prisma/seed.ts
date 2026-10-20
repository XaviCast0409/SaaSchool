/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient, RelationshipType, AttendanceStatus, SubscriptionPlan, EducationLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

const hashPassword = async (plainPassword: string): Promise<string> =>
  bcrypt.hash(plainPassword, 10);

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(1));

const randomElement = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

const usedDnis = new Set<string>();

const generateDni = (): string => {
  let dni: string;
  let attempts = 0;
  do {
    dni = String(randomBetween(10000000, 99999999));
    attempts++;
  } while (usedDnis.has(dni) && attempts < 1000);
  usedDnis.add(dni);
  return dni;
};

const PERU_FIRST_NAMES_MALE = [
  'Matías', 'Santiago', 'Sebastián', 'Mateo', 'Gabriel', 'Leonardo', 'Nicolás', 'Thiago',
  'Benjamín', 'Joaquín', 'Diego', 'Rodrigo', 'Álvaro', 'Adrián', 'Gonzalo', 'Fernando',
  'Emiliano', 'Fabrizio', 'Lucas', 'Alejandro', 'Carlos', 'Daniel', 'Samuel', 'Piero',
  'Mauricio', 'Andrés', 'Renato', 'Valentino', 'Josué', 'Ángel', 'Facundo', 'Esteban',
  'Manuel', 'Franco', 'Ignacio', 'Ricardo', 'Eduardo', 'Hugo', 'Javier', 'César'
];

const PERU_FIRST_NAMES_FEMALE = [
  'Luciana', 'Valentina', 'Camila', 'Sofía', 'Isabella', 'Martina', 'Emma', 'Valeria',
  'Mía', 'Zoe', 'Mariana', 'Daniela', 'Victoria', 'Nicole', 'Antonella', 'Paula',
  'Andrea', 'Jimena', 'Adriana', 'Bianca', 'Lucía', 'Gabriela', 'Samantha', 'Renata',
  'Romina', 'Macarena', 'Celeste', 'Flavia', 'Abril', 'Ariadna', 'Claudia', 'Fiorella',
  'Natalia', 'Carolina', 'Fabiola', 'Patricia', 'Lorena', 'Rocío', 'Carmen', 'Paola'
];

const PERU_LAST_NAMES = [
  'Quispe', 'Flores', 'Rodríguez', 'Sánchez', 'García', 'Rojas', 'Díaz', 'Torres',
  'López', 'González', 'Pérez', 'Chávez', 'Vásquez', 'Ramos', 'Huamán', 'Mendoza',
  'Castro', 'Espinoza', 'Romero', 'Silva', 'Morales', 'Gutiérrez', 'Herrera', 'Medina',
  'Alarcón', 'Navarro', 'Palacios', 'Cárdenas', 'Benavides', 'Vargas', 'Salcedo', 'Carrillo',
  'Miranda', 'Paredes', 'Villanueva', 'Córdova', 'Salazar', 'Rivera', 'Rivas', 'Campos',
  'Aguilar', 'Peralta', 'Cornejo', 'Valdivia', 'Soto', 'Acosta', 'Cabrera', 'Delgado'
];

const generateRuc = (start = '20'): string =>
  `${start}${randomBetween(100000000, 999999999)}`;

const generateStudentCode = (): string =>
  `26${randomBetween(100000000000, 999999999999)}`;

// ============================================================================
// FUNCIÓN PRINCIPAL DEL SEED
// ============================================================================

async function main(): Promise<void> {
  console.log('\n======================================================');
  console.log('🌱 INICIANDO SEED INTEGRAL SAASCHOOL (MULTI-ROL & MULTI-PLAN)');
  console.log('======================================================\n');

  // 1. Limpieza de base de datos en orden inverso de dependencias
  console.log('🧹 Limpiando datos existentes...');
  await prisma.attendanceScheduleConfig.deleteMany();
  await prisma.forumComment.deleteMany();
  await prisma.courseContent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.gradingPeriodLock.deleteMany();
  await prisma.competenceConclusion.deleteMany();
  await prisma.detailedGrade.deleteMany();
  await prisma.evaluationCriterion.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.gradeEntry.deleteMany();
  await prisma.courseAssignment.deleteMany();
  await prisma.curricularCompetence.deleteMany();
  await prisma.curricularArea.deleteMany();
  await prisma.gradingScale.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentObligation.deleteMany();
  await prisma.familyRelationship.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  console.log('✅ Base de datos completamente limpia\n');

  // Contraseñas pre-encriptadas
  const passAdmin = await hashPassword('Admin123!');
  const passTeacher = await hashPassword('Teacher123!');
  const passParent = await hashPassword('Parent123!');

  // ==========================================================================
  // 1. CREACIÓN DE COLEGIOS (PLAN BASIC & PLAN PRO)
  // ==========================================================================
  console.log('🏫 Creando Colegios con planes BASIC y PRO...');

  // Colegio 1: Plan BASIC
  const schoolBasic = await prisma.school.create({
    data: {
      name: 'I.E. San Ignacio de Loyola (Plan Basic)',
      documentId: '20601234567',
      modularCode: '0614990',
      localCode: 'LO1234',
      email: 'contacto@sanignacio.edu.pe',
      phone: '01-4445566',
      address: 'Av. La Marina 1200, San Miguel',
      department: 'LIMA',
      province: 'LIMA',
      district: 'SAN MIGUEL',
      plan: SubscriptionPlan.BASIC,
      offeredLevels: [EducationLevel.INITIAL, EducationLevel.PRIMARY, EducationLevel.SECONDARY],
      isActive: true,
    },
  });

  // Colegio 2: Plan PRO
  const schoolPro = await prisma.school.create({
    data: {
      name: 'Innova Academy (Plan Pro)',
      documentId: '20609876543',
      modularCode: '0725881',
      localCode: 'LO5678',
      email: 'direccion@innova.edu.pe',
      phone: '01-2223344',
      address: 'Av. Javier Prado Este 4500, Surco',
      department: 'LIMA',
      province: 'LIMA',
      district: 'SANTIAGO DE SURCO',
      plan: SubscriptionPlan.PRO,
      offeredLevels: [EducationLevel.INITIAL, EducationLevel.PRIMARY, EducationLevel.SECONDARY],
      isActive: true,
    },
  });

  console.log(`  ✅ Colegio BASIC: ${schoolBasic.name} (${schoolBasic.id})`);
  console.log(`  ✅ Colegio PRO:   ${schoolPro.name} (${schoolPro.id})\n`);

  // ==========================================================================
  // 2. CREACIÓN DE USUARIOS CLAVE (SUPER_ADMIN, BASIC Y PRO)
  // ==========================================================================
  console.log('👤 Creando usuarios por rol para pruebas...');

  // ── SUPER ADMIN Global ──
  const superAdmin = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'superadmin@saaschool.com',
      passwordHash: passAdmin,
      role: 'SUPER_ADMIN',
      firstName: 'Carlos',
      lastNamePaternal: 'SuperAdmin',
      lastNameMaternal: 'SaaS',
      documentType: 'DNI',
      documentId: '00000001',
      cellphone: '999999999',
    },
  });

  // ── COLEGIO BASIC ──
  const adminBasic = await prisma.user.create({
    data: {
      schoolId: schoolBasic.id,
      email: 'admin.basic@sanignacio.edu.pe',
      passwordHash: passAdmin,
      role: 'SCHOOL_ADMIN',
      firstName: 'Roberto',
      lastNamePaternal: 'Villanueva',
      lastNameMaternal: 'Ríos',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '987111222',
    },
  });

  const secretariaBasic = await prisma.user.create({
    data: {
      schoolId: schoolBasic.id,
      email: 'secretaria.basic@sanignacio.edu.pe',
      passwordHash: passAdmin,
      role: 'ADMINISTRATIVE',
      firstName: 'Ana',
      lastNamePaternal: 'Torres',
      lastNameMaternal: 'Morales',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '987222333',
    },
  });

  const docenteBasic = await prisma.user.create({
    data: {
      schoolId: schoolBasic.id,
      email: 'docente.basic@sanignacio.edu.pe',
      passwordHash: passTeacher,
      role: 'TEACHER',
      firstName: 'Jorge',
      lastNamePaternal: 'Martínez',
      lastNameMaternal: 'Fuentes',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '987333444',
    },
  });

  const padreBasic = await prisma.user.create({
    data: {
      schoolId: schoolBasic.id,
      email: 'padre.basic@sanignacio.edu.pe',
      passwordHash: passParent,
      role: 'PARENT',
      firstName: 'Eduardo',
      lastNamePaternal: 'Pérez',
      lastNameMaternal: 'Gómez',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '987444555',
    },
  });

  // ── COLEGIO PRO ──
  const adminPro = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'admin.pro@innova.edu.pe',
      passwordHash: passAdmin,
      role: 'SCHOOL_ADMIN',
      firstName: 'Mariana',
      lastNamePaternal: 'Benavides',
      lastNameMaternal: 'Castro',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981111000',
    },
  });

  const secretariaPro = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'secretaria.pro@innova.edu.pe',
      passwordHash: passAdmin,
      role: 'ADMINISTRATIVE',
      firstName: 'Patricia',
      lastNamePaternal: 'Salazar',
      lastNameMaternal: 'Vega',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981222000',
    },
  });

  const docentePro = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'docente.pro@innova.edu.pe',
      passwordHash: passTeacher,
      role: 'TEACHER',
      firstName: 'Miguel',
      lastNamePaternal: 'Navarro',
      lastNameMaternal: 'Mendoza',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981333000',
    },
  });

  const docentePro2 = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'lucia.docente@innova.edu.pe',
      passwordHash: passTeacher,
      role: 'TEACHER',
      firstName: 'Lucía',
      lastNamePaternal: 'Flores',
      lastNameMaternal: 'Reyes',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981444000',
    },
  });

  // 👨‍👩‍👧 PADRE PRO CON 2 HIJOS
  const padreProDosHijos = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'padre.doshijos@innova.edu.pe',
      passwordHash: passParent,
      role: 'PARENT',
      firstName: 'Ricardo',
      lastNamePaternal: 'Silva',
      lastNameMaternal: 'Gutiérrez',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981555000',
    },
  });

  // 👨‍👦 PADRE PRO CON 1 HIJO
  const padreProUnHijo = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'padre.unhijo@innova.edu.pe',
      passwordHash: passParent,
      role: 'PARENT',
      firstName: 'Alejandro',
      lastNamePaternal: 'Mendoza',
      lastNameMaternal: 'Alarcón',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '981666000',
    },
  });

  console.log('  ✅ Cuentas de SuperAdmin, Admin, Secretaria, Docente y Padres creadas con éxito.\n');

  // ==========================================================================
  // 3. AÑO ACADÉMICO 2026 ACTIVO
  // ==========================================================================
  console.log('📅 Creando Años Académicos 2026...');

  const academicYearBasic = await prisma.academicYear.create({
    data: {
      schoolId: schoolBasic.id,
      year: 2026,
      name: 'Año Lectivo 2026 - San Ignacio',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-19'),
      isActive: true,
    },
  });

  const academicYearPro = await prisma.academicYear.create({
    data: {
      schoolId: schoolPro.id,
      year: 2026,
      name: 'Año Lectivo 2026 - Innova Academy',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-19'),
      isActive: true,
    },
  });

  // ==========================================================================
  // 4. CRITERIOS DE EVALUACIÓN INSTITUCIONALES (MINEDU FORMATIVA)
  // ==========================================================================
  console.log('📐 Creando Criterios de Evaluación Institucionales...');

  const criteriaConfig = [
    { name: 'Práctica Calificada', shortName: 'PC', weight: 2.0, order: 1 },
    { name: 'Participación y Tareas', shortName: 'PT', weight: 1.0, order: 2 },
    { name: 'Revisión de Cuaderno', shortName: 'RC', weight: 1.0, order: 3 },
    { name: 'Examen Bimestral', shortName: 'EB', weight: 3.0, order: 4 },
  ];

  const criteriaBasic = await Promise.all(
    criteriaConfig.map((c) =>
      prisma.evaluationCriterion.create({
        data: { schoolId: schoolBasic.id, ...c, isActive: true },
      }),
    ),
  );

  const criteriaPro = await Promise.all(
    criteriaConfig.map((c) =>
      prisma.evaluationCriterion.create({
        data: { schoolId: schoolPro.id, ...c, isActive: true },
      }),
    ),
  );

  // Escalas Oficiales AD, A, B, C
  for (const sId of [schoolBasic.id, schoolPro.id]) {
    for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
      await prisma.gradingScale.createMany({
        data: [
          { schoolId: sId, level, letterGrade: 'AD', minNumeric: 17.5, maxNumeric: 20.0, description: 'Logro destacado' },
          { schoolId: sId, level, letterGrade: 'A', minNumeric: 14.0, maxNumeric: 17.4, description: 'Logro esperado' },
          { schoolId: sId, level, letterGrade: 'B', minNumeric: 11.0, maxNumeric: 13.9, description: 'En proceso' },
          { schoolId: sId, level, letterGrade: 'C', minNumeric: 0.0, maxNumeric: 10.9, description: 'En inicio' },
        ],
      });
    }
  }

  // ==========================================================================
  // 5. AULAS (INICIAL, PRIMARIA Y SECUNDARIA)
  // ==========================================================================
  console.log('🏫 Creando Aulas...');

  // Aulas Colegio PRO
  const aulaInicialPro = await prisma.classroom.create({
    data: { schoolId: schoolPro.id, educationLevel: 'INITIAL', grade: 5, section: 'A', shift: 'MORNING', capacity: 25 },
  });
  const aulaPrimaria1Pro = await prisma.classroom.create({
    data: { schoolId: schoolPro.id, educationLevel: 'PRIMARY', grade: 1, section: 'A', shift: 'MORNING', capacity: 30 },
  });
  const aulaPrimaria3Pro = await prisma.classroom.create({
    data: { schoolId: schoolPro.id, educationLevel: 'PRIMARY', grade: 3, section: 'A', shift: 'MORNING', capacity: 30, tutorTeacherId: docentePro.id },
  });
  const aulaSecundaria2Pro = await prisma.classroom.create({
    data: { schoolId: schoolPro.id, educationLevel: 'SECONDARY', grade: 2, section: 'A', shift: 'MORNING', capacity: 32, tutorTeacherId: docentePro2.id },
  });

  // Aulas Colegio BASIC
  const aulaPrimaria2Basic = await prisma.classroom.create({
    data: { schoolId: schoolBasic.id, educationLevel: 'PRIMARY', grade: 2, section: 'A', shift: 'MORNING', capacity: 28, tutorTeacherId: docenteBasic.id },
  });
  const aulaSecundaria1Basic = await prisma.classroom.create({
    data: { schoolId: schoolBasic.id, educationLevel: 'SECONDARY', grade: 1, section: 'A', shift: 'MORNING', capacity: 30 },
  });

  // ==========================================================================
  // 6. ÁREAS CURRICULARES Y COMPETENCIAS OFICIALES
  // ==========================================================================
  console.log('📚 Configurando Áreas Curriculares y Competencias MINEDU...');

  const mineduAreas = [
    {
      name: 'Matemática',
      officialCode: 'MAT',
      competences: [
        'Resuelve problemas de cantidad',
        'Resuelve problemas de regularidad, equivalencia y cambio',
        'Resuelve problemas de forma, movimiento y localización',
        'Resuelve problemas de gestión de datos e incertidumbre',
      ],
    },
    {
      name: 'Comunicación',
      officialCode: 'COM',
      competences: [
        'Se comunica oralmente en su lengua materna',
        'Lee diversos tipos de textos escritos en lengua materna',
        'Escribe diversos tipos de textos en lengua materna',
      ],
    },
    {
      name: 'Ciencia y Tecnología',
      officialCode: 'CYT',
      competences: [
        'Indaga mediante métodos científicos para construir conocimientos',
        'Explica el mundo físico basándose en conocimientos científicos',
        'Diseña y construye soluciones tecnológicas para resolver problemas',
      ],
    },
    {
      name: 'Personal Social',
      officialCode: 'PS',
      competences: [
        'Construye su identidad',
        'Convive y participa democráticamente en la búsqueda del bien común',
        'Construye interpretaciones históricas',
      ],
    },
    {
      name: 'Inglés como Lengua Extranjera',
      officialCode: 'ING',
      competences: [
        'Se comunica oralmente en inglés como lengua extranjera',
        'Lee diversos tipos de textos en inglés como lengua extranjera',
        'Escribe diversos tipos de textos en inglés como lengua extranjera',
      ],
    },
  ];

  const setupAreas = async (schoolId: string) => {
    const areas = [];
    for (const item of mineduAreas) {
      const area = await prisma.curricularArea.create({
        data: { schoolId, name: item.name, officialCode: item.officialCode, isActive: true },
      });
      const comps = await Promise.all(
        item.competences.map((cName) =>
          prisma.curricularCompetence.create({
            data: { areaId: area.id, name: cName },
          }),
        ),
      );
      areas.push({ area, comps });
    }
    return areas;
  };

  const areasBasic = await setupAreas(schoolBasic.id);
  const areasPro = await setupAreas(schoolPro.id);

  // ==========================================================================
  // 7. ASIGNACIÓN DE CURSOS A DOCENTES
  // ==========================================================================
  console.log('📌 Asignando Cursos a Docentes...');

  // En Colegio PRO: DocentePro enseña Matemática y Comunicación en 3° Primaria
  const asigMatematicaPrimariaPro = await prisma.courseAssignment.create({
    data: {
      schoolId: schoolPro.id,
      classroomId: aulaPrimaria3Pro.id,
      areaId: areasPro[0].area.id, // Matemática
      teacherId: docentePro.id,
    },
  });

  const asigComunicacionPrimariaPro = await prisma.courseAssignment.create({
    data: {
      schoolId: schoolPro.id,
      classroomId: aulaPrimaria3Pro.id,
      areaId: areasPro[1].area.id, // Comunicación
      teacherId: docentePro.id,
    },
  });

  // DocentePro2 enseña Matemática y Ciencia en 2° Secundaria
  const asigMatematicaSecundariaPro = await prisma.courseAssignment.create({
    data: {
      schoolId: schoolPro.id,
      classroomId: aulaSecundaria2Pro.id,
      areaId: areasPro[0].area.id, // Matemática
      teacherId: docentePro2.id,
    },
  });

  const asigCienciaSecundariaPro = await prisma.courseAssignment.create({
    data: {
      schoolId: schoolPro.id,
      classroomId: aulaSecundaria2Pro.id,
      areaId: areasPro[2].area.id, // Ciencia
      teacherId: docentePro2.id,
    },
  });

  // En Colegio BASIC: DocenteBasic enseña Matemática en 2° Primaria
  const asigMatematicaBasic = await prisma.courseAssignment.create({
    data: {
      schoolId: schoolBasic.id,
      classroomId: aulaPrimaria2Basic.id,
      areaId: areasBasic[0].area.id,
      teacherId: docenteBasic.id,
    },
  });

  // ==========================================================================
  // 8. ESTUDIANTES Y RELACIONES FAMILIARES (CASOS DE PRUEBA CLAVE)
  // ==========================================================================
  console.log('🎒 Creando Estudiantes y vinculando familias...');

  // 👦 HIJO 1 DEL PADRE PRO (Lucas Silva - 3° Primaria)
  const alumnoLucasSilva = await prisma.student.create({
    data: {
      schoolId: schoolPro.id,
      firstNames: 'Lucas Matías',
      lastNamePaternal: 'Silva',
      lastNameMaternal: 'Gutiérrez',
      documentType: 'DNI',
      documentId: '74125896',
      gender: 'MALE',
      birthDate: new Date('2017-05-14'),
      studentCode: generateStudentCode(),
      address: 'Calle Los Olivos 240, Surco',
    },
  });

  // 👧 HIJO 2 DEL PADRE PRO (Valeria Silva - 2° Secundaria)
  const alumnaValeriaSilva = await prisma.student.create({
    data: {
      schoolId: schoolPro.id,
      firstNames: 'Valeria Sofía',
      lastNamePaternal: 'Silva',
      lastNameMaternal: 'Gutiérrez',
      documentType: 'DNI',
      documentId: '75236984',
      gender: 'FEMALE',
      birthDate: new Date('2013-08-22'),
      studentCode: generateStudentCode(),
      address: 'Calle Los Olivos 240, Surco',
    },
  });

  // 👦 HIJO ÚNICO DEL PADRE PRO UN HIJO (Gabriel Mendoza - 1° Primaria)
  const alumnoGabrielMendoza = await prisma.student.create({
    data: {
      schoolId: schoolPro.id,
      firstNames: 'Gabriel Alejandro',
      lastNamePaternal: 'Mendoza',
      lastNameMaternal: 'Torres',
      documentType: 'DNI',
      documentId: '78965412',
      gender: 'MALE',
      birthDate: new Date('2019-02-10'),
      studentCode: generateStudentCode(),
      address: 'Av. Primavera 850, Surco',
    },
  });

  // 👦 HIJO DEL PADRE BASIC (Mateo Pérez - 2° Primaria Basic)
  const alumnoMateoPerez = await prisma.student.create({
    data: {
      schoolId: schoolBasic.id,
      firstNames: 'Mateo Sebastián',
      lastNamePaternal: 'Pérez',
      lastNameMaternal: 'Gómez',
      documentType: 'DNI',
      documentId: '71234567',
      gender: 'MALE',
      birthDate: new Date('2018-04-18'),
      studentCode: generateStudentCode(),
      address: 'Jr. Libertad 410, San Miguel',
    },
  });

  // Crear 4 alumnos extra para poblar las aulas
  const extraStudent1 = await prisma.student.create({
    data: { schoolId: schoolPro.id, firstNames: 'Camila Andrea', lastNamePaternal: 'Rojas', lastNameMaternal: 'Paz', documentType: 'DNI', documentId: generateDni(), gender: 'FEMALE', birthDate: new Date('2017-09-11'), studentCode: generateStudentCode() },
  });
  const extraStudent2 = await prisma.student.create({
    data: { schoolId: schoolPro.id, firstNames: 'Diego Fernando', lastNamePaternal: 'Vargas', lastNameMaternal: 'Cruz', documentType: 'DNI', documentId: generateDni(), gender: 'MALE', birthDate: new Date('2013-11-05'), studentCode: generateStudentCode() },
  });
  const extraStudent3 = await prisma.student.create({
    data: { schoolId: schoolBasic.id, firstNames: 'Luciana Belén', lastNamePaternal: 'Quispe', lastNameMaternal: 'López', documentType: 'DNI', documentId: generateDni(), gender: 'FEMALE', birthDate: new Date('2018-07-20'), studentCode: generateStudentCode() },
  });

  // VINCULACIONES FAMILIARES
  // Padre Pro -> Vinculado a Lucas (Hijo 1)
  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoLucasSilva.id,
      userId: padreProDosHijos.id,
      relationshipType: RelationshipType.FATHER,
      isLegalGuardian: true,
      isFinancialResponsible: true,
      livesWithStudent: true,
    },
  });

  // Padre Pro -> Vinculado a Valeria (Hijo 2)
  await prisma.familyRelationship.create({
    data: {
      studentId: alumnaValeriaSilva.id,
      userId: padreProDosHijos.id,
      relationshipType: RelationshipType.FATHER,
      isLegalGuardian: true,
      isFinancialResponsible: true,
      livesWithStudent: true,
    },
  });

  // Padre Pro Un Hijo -> Vinculado a Gabriel
  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoGabrielMendoza.id,
      userId: padreProUnHijo.id,
      relationshipType: RelationshipType.FATHER,
      isLegalGuardian: true,
      isFinancialResponsible: true,
      livesWithStudent: true,
    },
  });

  // Padre Basic -> Vinculado a Mateo
  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoMateoPerez.id,
      userId: padreBasic.id,
      relationshipType: RelationshipType.FATHER,
      isLegalGuardian: true,
      isFinancialResponsible: true,
      livesWithStudent: true,
    },
  });

  // 🎒 CUENTAS DE USUARIO PARA LOS HIJOS / ESTUDIANTES (FLUJO DEL ALUMNO)
  const passStudent = await hashPassword('Student123!');

  // Alumno Lucas (Hijo 1 en Innova Pro)
  const userAlumnoLucas = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'alumno.lucas@innova.edu.pe',
      passwordHash: passStudent,
      role: 'PARENT',
      firstName: 'Lucas Matías',
      lastNamePaternal: 'Silva',
      lastNameMaternal: 'Gutiérrez',
      documentType: 'DNI',
      documentId: '74125896',
      cellphone: '981555001',
    },
  });

  // Alumna Valeria (Hija 2 en Innova Pro)
  const userAlumnaValeria = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'alumno.valeria@innova.edu.pe',
      passwordHash: passStudent,
      role: 'PARENT',
      firstName: 'Valeria Sofía',
      lastNamePaternal: 'Silva',
      lastNameMaternal: 'Gutiérrez',
      documentType: 'DNI',
      documentId: '75236984',
      cellphone: '981555002',
    },
  });

  // Alumno Gabriel (Hijo Único en Innova Pro)
  const userAlumnoGabriel = await prisma.user.create({
    data: {
      schoolId: schoolPro.id,
      email: 'alumno.gabriel@innova.edu.pe',
      passwordHash: passStudent,
      role: 'PARENT',
      firstName: 'Gabriel Alejandro',
      lastNamePaternal: 'Mendoza',
      lastNameMaternal: 'Torres',
      documentType: 'DNI',
      documentId: '78965412',
      cellphone: '981666001',
    },
  });

  // Alumno Mateo (Hijo en San Ignacio Basic)
  const userAlumnoMateo = await prisma.user.create({
    data: {
      schoolId: schoolBasic.id,
      email: 'alumno.mateo@sanignacio.edu.pe',
      passwordHash: passStudent,
      role: 'PARENT',
      firstName: 'Mateo Sebastián',
      lastNamePaternal: 'Pérez',
      lastNameMaternal: 'Gómez',
      documentType: 'DNI',
      documentId: '71234567',
      cellphone: '987444556',
    },
  });

  // Vinculación de los usuarios-alumnos con su propio registro de estudiante
  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoLucasSilva.id,
      userId: userAlumnoLucas.id,
      relationshipType: RelationshipType.OTHER,
      isLegalGuardian: false,
      isFinancialResponsible: false,
      livesWithStudent: true,
    },
  });

  await prisma.familyRelationship.create({
    data: {
      studentId: alumnaValeriaSilva.id,
      userId: userAlumnaValeria.id,
      relationshipType: RelationshipType.OTHER,
      isLegalGuardian: false,
      isFinancialResponsible: false,
      livesWithStudent: true,
    },
  });

  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoGabrielMendoza.id,
      userId: userAlumnoGabriel.id,
      relationshipType: RelationshipType.OTHER,
      isLegalGuardian: false,
      isFinancialResponsible: false,
      livesWithStudent: true,
    },
  });

  await prisma.familyRelationship.create({
    data: {
      studentId: alumnoMateoPerez.id,
      userId: userAlumnoMateo.id,
      relationshipType: RelationshipType.OTHER,
      isLegalGuardian: false,
      isFinancialResponsible: false,
      livesWithStudent: true,
    },
  });

  // ==========================================================================
  // 9. MATRÍCULAS 2026
  // ==========================================================================
  console.log('📋 Registrando Matrículas...');

  // Lucas Silva en 3° Primaria Pro
  const matLucas = await prisma.enrollment.create({
    data: {
      schoolId: schoolPro.id,
      studentId: alumnoLucasSilva.id,
      academicYearId: academicYearPro.id,
      classroomId: aulaPrimaria3Pro.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Camila Rojas en 3° Primaria Pro
  const matCamila = await prisma.enrollment.create({
    data: {
      schoolId: schoolPro.id,
      studentId: extraStudent1.id,
      academicYearId: academicYearPro.id,
      classroomId: aulaPrimaria3Pro.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Valeria Silva en 2° Secundaria Pro
  const matValeria = await prisma.enrollment.create({
    data: {
      schoolId: schoolPro.id,
      studentId: alumnaValeriaSilva.id,
      academicYearId: academicYearPro.id,
      classroomId: aulaSecundaria2Pro.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Diego Vargas en 2° Secundaria Pro
  const matDiego = await prisma.enrollment.create({
    data: {
      schoolId: schoolPro.id,
      studentId: extraStudent2.id,
      academicYearId: academicYearPro.id,
      classroomId: aulaSecundaria2Pro.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Gabriel Mendoza en 1° Primaria Pro
  await prisma.enrollment.create({
    data: {
      schoolId: schoolPro.id,
      studentId: alumnoGabrielMendoza.id,
      academicYearId: academicYearPro.id,
      classroomId: aulaPrimaria1Pro.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Mateo Pérez en 2° Primaria Basic
  const matMateo = await prisma.enrollment.create({
    data: {
      schoolId: schoolBasic.id,
      studentId: alumnoMateoPerez.id,
      academicYearId: academicYearBasic.id,
      classroomId: aulaPrimaria2Basic.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // Luciana Quispe en 2° Primaria Basic
  await prisma.enrollment.create({
    data: {
      schoolId: schoolBasic.id,
      studentId: extraStudent3.id,
      academicYearId: academicYearBasic.id,
      classroomId: aulaPrimaria2Basic.id,
      enrollmentState: 'REGISTERED',
      isActive: true,
    },
  });

  // ==========================================================================
  // 9.1 CARGA MASIVA DE ALUMNOS (+100 ESTUDIANTES REALES Y MATRÍCULAS)
  // ==========================================================================
  console.log('👥 Generando +100 Estudiantes con Matrículas y Familias...');

  interface ClassroomBatchSpec {
    classroom: typeof aulaPrimaria3Pro;
    schoolId: string;
    academicYearId: string;
    level: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    targetCount: number;
    birthYear: number;
  }

  const batchSpecs: ClassroomBatchSpec[] = [
    { classroom: aulaPrimaria3Pro, schoolId: schoolPro.id, academicYearId: academicYearPro.id, level: 'PRIMARY', targetCount: 26, birthYear: 2017 },
    { classroom: aulaSecundaria2Pro, schoolId: schoolPro.id, academicYearId: academicYearPro.id, level: 'SECONDARY', targetCount: 26, birthYear: 2012 },
    { classroom: aulaPrimaria1Pro, schoolId: schoolPro.id, academicYearId: academicYearPro.id, level: 'PRIMARY', targetCount: 25, birthYear: 2019 },
    { classroom: aulaPrimaria2Basic, schoolId: schoolBasic.id, academicYearId: academicYearBasic.id, level: 'PRIMARY', targetCount: 24, birthYear: 2018 },
    { classroom: aulaInicialPro, schoolId: schoolPro.id, academicYearId: academicYearPro.id, level: 'INITIAL', targetCount: 15, birthYear: 2021 },
  ];

  interface CreatedBatchStudent {
    studentId: string;
    enrollmentId: string;
    schoolId: string;
    classroomId: string;
    studentName: string;
    documentId: string;
    level: string;
  }

  const batchStudents: CreatedBatchStudent[] = [];

  // Incluimos las matrículas clave para la asignación de asistencias masivas
  const allEnrollmentsForAttendance: Array<{ enrollmentId: string; schoolId: string; classroomId: string; isProTutorRoom: boolean }> = [
    { enrollmentId: matLucas.id, schoolId: schoolPro.id, classroomId: aulaPrimaria3Pro.id, isProTutorRoom: true },
    { enrollmentId: matCamila.id, schoolId: schoolPro.id, classroomId: aulaPrimaria3Pro.id, isProTutorRoom: true },
    { enrollmentId: matValeria.id, schoolId: schoolPro.id, classroomId: aulaSecundaria2Pro.id, isProTutorRoom: false },
    { enrollmentId: matDiego.id, schoolId: schoolPro.id, classroomId: aulaSecundaria2Pro.id, isProTutorRoom: false },
    { enrollmentId: matMateo.id, schoolId: schoolBasic.id, classroomId: aulaPrimaria2Basic.id, isProTutorRoom: false },
  ];

  for (const spec of batchSpecs) {
    for (let i = 0; i < spec.targetCount; i++) {
      const isMale = Math.random() > 0.5;
      const firstName = isMale ? randomElement(PERU_FIRST_NAMES_MALE) : randomElement(PERU_FIRST_NAMES_FEMALE);
      const secondName = isMale ? randomElement(PERU_FIRST_NAMES_MALE) : randomElement(PERU_FIRST_NAMES_FEMALE);
      const lastNamePaternal = randomElement(PERU_LAST_NAMES);
      let lastNameMaternal = randomElement(PERU_LAST_NAMES);
      while (lastNameMaternal === lastNamePaternal) {
        lastNameMaternal = randomElement(PERU_LAST_NAMES);
      }

      const birthMonth = randomBetween(1, 12);
      const birthDay = randomBetween(1, 28);
      const birthDate = new Date(`${spec.birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`);
      const dni = generateDni();
      const studentCode = generateStudentCode();

      const st = await prisma.student.create({
        data: {
          schoolId: spec.schoolId,
          firstNames: `${firstName} ${secondName}`,
          lastNamePaternal,
          lastNameMaternal,
          documentType: 'DNI',
          documentId: dni,
          gender: isMale ? 'MALE' : 'FEMALE',
          birthDate,
          studentCode,
          address: `Av. Los Álamos ${randomBetween(100, 999)}, Lima`,
        },
      });

      const enr = await prisma.enrollment.create({
        data: {
          schoolId: spec.schoolId,
          studentId: st.id,
          academicYearId: spec.academicYearId,
          classroomId: spec.classroom.id,
          enrollmentState: 'REGISTERED',
          isActive: true,
        },
      });

      batchStudents.push({
        studentId: st.id,
        enrollmentId: enr.id,
        schoolId: spec.schoolId,
        classroomId: spec.classroom.id,
        studentName: `${lastNamePaternal} ${lastNameMaternal}, ${firstName} ${secondName}`,
        documentId: dni,
        level: spec.level,
      });

      allEnrollmentsForAttendance.push({
        enrollmentId: enr.id,
        schoolId: spec.schoolId,
        classroomId: spec.classroom.id,
        isProTutorRoom: spec.classroom.id === aulaPrimaria3Pro.id,
      });
    }
  }

  console.log(`  ✅ ${batchStudents.length} estudiantes adicionales creados (Total general: ${batchStudents.length + 7})\n`);

  // ==========================================================================
  // 10. CALIFICACIONES Y CONCLUSIONES POR COMPETENCIA (NOTAS REALES)
  // ==========================================================================
  console.log('📝 Cargando Notas Detalladas y Conclusiones...');

  // Poblar notas para Lucas en Matemática (3° Primaria)
  const compMatematica1Pro = areasPro[0].comps[0]; // Resuelve problemas de cantidad
  const compMatematica2Pro = areasPro[0].comps[1]; // Regularidad y cambio

  // Notas Bimestre 1 para Lucas y Camila
  for (const crit of criteriaPro) {
    // Lucas (Destacado AD: 18.0)
    await prisma.detailedGrade.create({
      data: {
        schoolId: schoolPro.id,
        enrollmentId: matLucas.id,
        courseAssignmentId: asigMatematicaPrimariaPro.id,
        competenceId: compMatematica1Pro.id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: crit.shortName === 'EB' ? 19.0 : 17.5,
      },
    });

    // Camila (Esperado A: 15.5)
    await prisma.detailedGrade.create({
      data: {
        schoolId: schoolPro.id,
        enrollmentId: matCamila.id,
        courseAssignmentId: asigMatematicaPrimariaPro.id,
        competenceId: compMatematica1Pro.id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: crit.shortName === 'EB' ? 16.0 : 15.0,
      },
    });
  }

  // Conclusión descriptiva oficial para Lucas (Bimestre 1)
  await prisma.competenceConclusion.create({
    data: {
      schoolId: schoolPro.id,
      enrollmentId: matLucas.id,
      courseAssignmentId: asigMatematicaPrimariaPro.id,
      competenceId: compMatematica1Pro.id,
      periodNumber: 1,
      conclusion: 'El estudiante demuestra excelente autonomía al resolver operaciones con números naturales y fracciones, justificando con claridad sus procedimientos lógicos.',
    },
  });

  // Notas para Valeria Silva en 2° Secundaria (Matemática y Ciencia)
  for (const crit of criteriaPro) {
    await prisma.detailedGrade.create({
      data: {
        schoolId: schoolPro.id,
        enrollmentId: matValeria.id,
        courseAssignmentId: asigMatematicaSecundariaPro.id,
        competenceId: compMatematica1Pro.id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: 18.0,
      },
    });
  }

  await prisma.competenceConclusion.create({
    data: {
      schoolId: schoolPro.id,
      enrollmentId: matValeria.id,
      courseAssignmentId: asigMatematicaSecundariaPro.id,
      competenceId: compMatematica1Pro.id,
      periodNumber: 1,
      conclusion: 'Valeria analiza con solidez modelos algebraicos y funciones, comunicando sus resultados de manera clara y ordenada.',
    },
  });

  // Calificaciones para estudiantes adicionales en 3° Primaria y 2° Secundaria
  const batchGradesData: Array<{
    schoolId: string;
    enrollmentId: string;
    courseAssignmentId: string;
    competenceId: string;
    criterionId: string;
    periodNumber: number;
    numericScore: number;
  }> = [];

  const studentsPrimaria3 = batchStudents.filter(s => s.classroomId === aulaPrimaria3Pro.id);
  const studentsSecundaria2 = batchStudents.filter(s => s.classroomId === aulaSecundaria2Pro.id);

  for (const st of studentsPrimaria3.slice(0, 15)) {
    for (const crit of criteriaPro) {
      batchGradesData.push({
        schoolId: schoolPro.id,
        enrollmentId: st.enrollmentId,
        courseAssignmentId: asigMatematicaPrimariaPro.id,
        competenceId: compMatematica1Pro.id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: randomFloat(12.0, 18.5),
      });
      batchGradesData.push({
        schoolId: schoolPro.id,
        enrollmentId: st.enrollmentId,
        courseAssignmentId: asigComunicacionPrimariaPro.id,
        competenceId: areasPro[1].comps[0].id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: randomFloat(13.0, 19.0),
      });
    }
  }

  for (const st of studentsSecundaria2.slice(0, 15)) {
    for (const crit of criteriaPro) {
      batchGradesData.push({
        schoolId: schoolPro.id,
        enrollmentId: st.enrollmentId,
        courseAssignmentId: asigMatematicaSecundariaPro.id,
        competenceId: compMatematica1Pro.id,
        criterionId: crit.id,
        periodNumber: 1,
        numericScore: randomFloat(11.5, 17.5),
      });
    }
  }

  if (batchGradesData.length > 0) {
    await prisma.detailedGrade.createMany({ data: batchGradesData });
    console.log(`  ✅ ${batchGradesData.length} notas de evaluación bimestral cargadas`);
  }

  // ==========================================================================
  // 11. AULA VIRTUAL (MATERIALES, TAREAS Y FOROS)
  // ==========================================================================
  console.log('💻 Publicando Contenidos en Aula Virtual para Supervisión...');

  // Material de clase publicado por DocentePro
  const contentMaterial = await prisma.courseContent.create({
    data: {
      schoolId: schoolPro.id,
      courseAssignmentId: asigMatematicaPrimariaPro.id,
      teacherId: docentePro.id,
      bimester: 1,
      contentType: 'LESSON_MATERIAL',
      title: 'Guía de Polígonos y Geometría Plana',
      description: 'Estimados alumnos, aquí encontrarán la diapositiva y las fórmulas de perímetros y áreas vistas en clase.',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e10/view',
      fileName: 'Guia_Geometria_Bimestre1.pdf',
      fileType: 'application/pdf',
      fileSize: 2450000,
    },
  });

  // Tarea con fecha límite
  const contentHomework = await prisma.courseContent.create({
    data: {
      schoolId: schoolPro.id,
      courseAssignmentId: asigMatematicaPrimariaPro.id,
      teacherId: docentePro.id,
      bimester: 1,
      contentType: 'HOMEWORK',
      title: 'Ficha Práctica N° 3: Resolución de Ecuaciones',
      description: 'Desarrollar los 5 ejercicios de la ficha y subir la solución escaneada en formato PDF.',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e10/view',
      fileName: 'Ficha_Practica_Ecuaciones.pdf',
      fileType: 'application/pdf',
      fileSize: 1200000,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En 7 días
    },
  });

  // Foro de debate con comentarios
  const contentForum = await prisma.courseContent.create({
    data: {
      schoolId: schoolPro.id,
      courseAssignmentId: asigMatematicaPrimariaPro.id,
      teacherId: docentePro.id,
      bimester: 1,
      contentType: 'FORUM',
      title: 'Foro: ¿Cómo aplicamos los porcentajes en las compras cotidianas?',
      description: 'Comparte un ejemplo de tu vida diaria donde hayas calculado descuentos o IGV en compras reales.',
    },
  });

  // Comentario del profesor y de un alumno en el foro
  await prisma.forumComment.create({
    data: {
      schoolId: schoolPro.id,
      courseContentId: contentForum.id,
      userId: docentePro.id,
      content: 'Bienvenidos al foro. Recuerden citar el porcentaje de descuento y el precio final de su producto.',
    },
  });

  // ==========================================================================
  // 12. ASISTENCIAS MASIVAS (ÚLTIMAS 2 SEMANAS + DÍA DE HOY CON QR)
  // ==========================================================================
  console.log('✋ Registrando Asistencias Masivas (+1,000 Registros con QR y Auto-Cierre)...');

  const now = new Date();
  const businessDays: Date[] = [];
  for (let offset = 14; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    if (d.getDay() !== 0 && d.getDay() !== 6) { // Lunes a Viernes
      businessDays.push(d);
    }
  }

  const allAttendanceData: Array<{
    schoolId: string;
    enrollmentId: string;
    date: Date;
    status: AttendanceStatus;
    checkInTime: Date | null;
    origin: 'MANUAL' | 'QR_SCAN' | 'BARCODE' | 'AUTO_CLOSE';
    notes: string | null;
  }> = [];

  for (let dIdx = 0; dIdx < businessDays.length; dIdx++) {
    const day = businessDays[dIdx];
    const isToday = dIdx === businessDays.length - 1;

    for (let eIdx = 0; eIdx < allEnrollmentsForAttendance.length; eIdx++) {
      const enr = allEnrollmentsForAttendance[eIdx];

      if (isToday) {
        // En el aula tutelada del DocentePro (3° Primaria A):
        if (enr.isProTutorRoom) {
          // Dejar ~5 estudiantes sin registrar para probar filtro "Sin marcar QR" y botón de auto-cierre / manual
          if (eIdx % 5 === 0) {
            continue; // Sin marcar QR hoy
          } else if (eIdx % 6 === 0) {
            allAttendanceData.push({
              schoolId: enr.schoolId,
              enrollmentId: enr.enrollmentId,
              date: day,
              status: 'LATE_UNJUSTIFIED',
              checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(48, 58)) * 60 * 1000),
              origin: 'QR_SCAN',
              notes: 'Ingreso tardío registrado en portería',
            });
          } else if (eIdx % 9 === 0) {
            allAttendanceData.push({
              schoolId: enr.schoolId,
              enrollmentId: enr.enrollmentId,
              date: day,
              status: 'ABSENT_UNJUSTIFIED',
              checkInTime: null,
              origin: 'AUTO_CLOSE',
              notes: 'Cierre automático por horario límite',
            });
          } else {
            allAttendanceData.push({
              schoolId: enr.schoolId,
              enrollmentId: enr.enrollmentId,
              date: day,
              status: 'PRESENT',
              checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(22, 43)) * 60 * 1000),
              origin: 'QR_SCAN',
              notes: null,
            });
          }
        } else {
          // En otras aulas hoy:
          if (eIdx % 6 === 0) {
            continue; // Sin registrar hoy
          } else if (eIdx % 8 === 0) {
            allAttendanceData.push({
              schoolId: enr.schoolId,
              enrollmentId: enr.enrollmentId,
              date: day,
              status: 'LATE_UNJUSTIFIED',
              checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(46, 55)) * 60 * 1000),
              origin: 'QR_SCAN',
              notes: null,
            });
          } else {
            allAttendanceData.push({
              schoolId: enr.schoolId,
              enrollmentId: enr.enrollmentId,
              date: day,
              status: 'PRESENT',
              checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(20, 44)) * 60 * 1000),
              origin: 'QR_SCAN',
              notes: null,
            });
          }
        }
      } else {
        // Días anteriores (histórico consolidado para gráficas y sábana mensual):
        const rand = Math.random();
        if (rand < 0.82) {
          allAttendanceData.push({
            schoolId: enr.schoolId,
            enrollmentId: enr.enrollmentId,
            date: day,
            status: 'PRESENT',
            checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(20, 44)) * 60 * 1000),
            origin: 'QR_SCAN',
            notes: null,
          });
        } else if (rand < 0.92) {
          allAttendanceData.push({
            schoolId: enr.schoolId,
            enrollmentId: enr.enrollmentId,
            date: day,
            status: 'LATE_UNJUSTIFIED',
            checkInTime: new Date(day.getTime() + (7 * 60 + randomBetween(46, 58)) * 60 * 1000),
            origin: 'QR_SCAN',
            notes: 'Ingreso posterior a la tolerancia',
          });
        } else if (rand < 0.96) {
          allAttendanceData.push({
            schoolId: enr.schoolId,
            enrollmentId: enr.enrollmentId,
            date: day,
            status: 'ABSENT_UNJUSTIFIED',
            checkInTime: null,
            origin: 'AUTO_CLOSE',
            notes: 'Inasistencia no registrada en horario de corte',
          });
        } else {
          allAttendanceData.push({
            schoolId: enr.schoolId,
            enrollmentId: enr.enrollmentId,
            date: day,
            status: 'ABSENT_JUSTIFIED',
            checkInTime: null,
            origin: 'MANUAL',
            notes: 'Permiso de salud presentado por apoderado',
          });
        }
      }
    }
  }

  // Insertar en bloques para máxima eficiencia
  const chunkSize = 500;
  for (let i = 0; i < allAttendanceData.length; i += chunkSize) {
    const chunk = allAttendanceData.slice(i, i + chunkSize);
    await prisma.attendance.createMany({ data: chunk });
  }
  console.log(`  ✅ ${allAttendanceData.length} registros de asistencia creados exitosamente`);

  // ==========================================================================
  // 13. FINANZAS / PENSIONES (PAGADAS Y PENDIENTES)
  // ==========================================================================
  console.log('💰 Generando Cronograma de Pensiones y Recibos...');

  const cronogramaMeses = [
    { title: 'Matrícula Escolar 2026', concept: 'MATRICULA', amount: 350.0, dueDate: new Date('2026-02-15'), isPaid: true },
    { title: 'Pensión Marzo 2026', concept: 'PENSION', amount: 420.0, dueDate: new Date('2026-03-10'), isPaid: true },
    { title: 'Pensión Abril 2026', concept: 'PENSION', amount: 420.0, dueDate: new Date('2026-04-10'), isPaid: true },
    { title: 'Pensión Mayo 2026', concept: 'PENSION', amount: 420.0, dueDate: new Date('2026-05-10'), isPaid: false },
    { title: 'Pensión Junio 2026', concept: 'PENSION', amount: 420.0, dueDate: new Date('2026-06-10'), isPaid: false },
  ];

  // Crear cronograma para Lucas Silva (Padre con 2 hijos)
  for (const c of cronogramaMeses) {
    const ob = await prisma.paymentObligation.create({
      data: {
        schoolId: schoolPro.id,
        enrollmentId: matLucas.id,
        title: c.title,
        concept: c.concept,
        amountDue: c.amount,
        dueDate: c.dueDate,
        status: c.isPaid ? 'PAID' : 'PENDING',
      },
    });

    if (c.isPaid) {
      await prisma.paymentTransaction.create({
        data: {
          schoolId: schoolPro.id,
          obligationId: ob.id,
          amountPaid: c.amount,
          paymentDate: new Date(c.dueDate.getTime() - 2 * 24 * 60 * 60 * 1000),
          paymentMethod: 'BANK_TRANSFER',
          operationNumber: `OP-${randomBetween(100000, 999999)}`,
          receiptType: 'BOLETA',
          receiptNumber: `B001-${randomBetween(1000, 9999)}`,
        },
      });
    }
  }

  // Crear cronograma para Valeria Silva (Hija 2)
  for (const c of cronogramaMeses.slice(0, 4)) {
    const ob = await prisma.paymentObligation.create({
      data: {
        schoolId: schoolPro.id,
        enrollmentId: matValeria.id,
        title: c.title,
        concept: c.concept,
        amountDue: c.amount,
        dueDate: c.dueDate,
        status: c.isPaid ? 'PAID' : 'PENDING',
      },
    });

    if (c.isPaid) {
      await prisma.paymentTransaction.create({
        data: {
          schoolId: schoolPro.id,
          obligationId: ob.id,
          amountPaid: c.amount,
          paymentDate: new Date(c.dueDate.getTime() - 1 * 24 * 60 * 60 * 1000),
          paymentMethod: 'CREDIT_CARD',
          operationNumber: `OP-${randomBetween(100000, 999999)}`,
          receiptType: 'BOLETA',
          receiptNumber: `B001-${randomBetween(1000, 9999)}`,
        },
      });
    }
  }

  // Pensiones adicionales para 30 estudiantes
  console.log('💳 Generando obligaciones financieras masivas...');
  const batchObligations: Array<{
    schoolId: string;
    enrollmentId: string;
    title: string;
    concept: 'MATRICULA' | 'PENSION';
    amountDue: number;
    dueDate: Date;
    status: 'PAID' | 'PENDING';
  }> = [];

  for (let i = 0; i < Math.min(30, batchStudents.length); i++) {
    const st = batchStudents[i];
    for (const c of cronogramaMeses) {
      batchObligations.push({
        schoolId: st.schoolId,
        enrollmentId: st.enrollmentId,
        title: c.title,
        concept: c.concept as 'MATRICULA' | 'PENSION',
        amountDue: c.amount,
        dueDate: c.dueDate,
        status: c.isPaid ? 'PAID' : 'PENDING',
      });
    }
  }

  if (batchObligations.length > 0) {
    await prisma.paymentObligation.createMany({ data: batchObligations });
    console.log(`  ✅ ${batchObligations.length} obligaciones de pago masivas cargadas`);
  }

  // ==========================================================================
  // 14. COMUNICADOS OFICIALES
  // ==========================================================================
  await prisma.announcement.create({
    data: {
      schoolId: schoolPro.id,
      authorId: adminPro.id,
      title: '¡Bienvenidos al Año Escolar 2026 en Innova Academy!',
      content: 'Estimada comunidad educativa, les damos la más cordial bienvenida a este nuevo año académico. Los accesos a las aulas virtuales y plataformas ya se encuentran habilitados.',
      priority: 'IMPORTANT',
      targetRoles: ['TEACHER', 'PARENT', 'ADMINISTRATIVE'],
    },
  });

  // ==========================================================================
  // 15. CONFIGURACIÓN DE HORARIOS DE ASISTENCIA Y AUTO-CIERRE
  // ==========================================================================
  console.log('⏰ Configurando Horarios de Asistencia Institucionales...');
  await prisma.attendanceScheduleConfig.createMany({
    data: [
      {
        schoolId: schoolPro.id,
        scope: 'GENERAL',
        entryTime: '07:45',
        lateToleranceTime: '08:15',
        autoCloseTime: '08:45',
        autoCloseEnabled: false,
      },
      {
        schoolId: schoolPro.id,
        scope: 'PRIMARY',
        entryTime: '07:45',
        lateToleranceTime: '08:15',
        autoCloseTime: '08:45',
        autoCloseEnabled: true,
      },
      {
        schoolId: schoolPro.id,
        scope: 'SECONDARY',
        entryTime: '07:30',
        lateToleranceTime: '07:55',
        autoCloseTime: '08:30',
        autoCloseEnabled: true,
      },
      {
        schoolId: schoolBasic.id,
        scope: 'GENERAL',
        entryTime: '08:00',
        lateToleranceTime: '08:30',
        autoCloseTime: '09:00',
        autoCloseEnabled: false,
      },
    ],
  });
  console.log('  ✅ Horarios y tolerancias configurados para Colegios PRO y BASIC');

  // ==========================================================================
  // RESUMEN CON TABLA DE CREDENCIALES
  // ==========================================================================
  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
  console.log('======================================================\n');
  console.log('🔑 CREDENCIALES LISTAS PARA PROBAR CADA EXPERIENCIA:\n');

  console.log('👑 1. SUPER ADMIN GLOBAL (Acceso a todos los colegios):');
  console.log('   Email:     superadmin@saaschool.com');
  console.log('   Password:  Admin123!\n');

  console.log('🏢 2. COLEGIO PRO (Innova Academy - Plan PRO):');
  console.log('   Director:  admin.pro@innova.edu.pe       / Admin123!');
  console.log('   Secretaría: secretaria.pro@innova.edu.pe   / Admin123!');
  console.log('   Docente:   docente.pro@innova.edu.pe      / Teacher123!');
  console.log('   👨‍👧‍👦 Padre CON 2 HIJOS:');
  console.log('              padre.doshijos@innova.edu.pe   / Parent123!');
  console.log('              • Hijo 1: Lucas Silva (3° Primaria "A")');
  console.log('              • Hijo 2: Valeria Silva (2° Secundaria "A")');
  console.log('   👨‍👦 Padre CON 1 HIJO:');
  console.log('              padre.unhijo@innova.edu.pe     / Parent123!');
  console.log('              • Hijo: Gabriel Mendoza (1° Primaria "A")');
  console.log('   🎒 CUENTAS DE LOS HIJOS (Flujo Alumno):');
  console.log('              • Lucas (Hijo 1 Pro):   alumno.lucas@innova.edu.pe   / Student123!');
  console.log('              • Valeria (Hija 2 Pro): alumno.valeria@innova.edu.pe / Student123!');
  console.log('              • Gabriel (Hijo Pro):   alumno.gabriel@innova.edu.pe / Student123!\n');

  console.log('🏫 3. COLEGIO BASIC (I.E. San Ignacio - Plan BASIC):');
  console.log('   Director:  admin.basic@sanignacio.edu.pe      / Admin123!');
  console.log('   Secretaría: secretaria.basic@sanignacio.edu.pe  / Admin123!');
  console.log('   Docente:   docente.basic@sanignacio.edu.pe     / Teacher123!');
  console.log('   Padre:     padre.basic@sanignacio.edu.pe       / Parent123!');
  console.log('              • Hijo: Mateo Pérez (2° Primaria "A")');
  console.log('   🎒 Alumno Basic:');
  console.log('              • Mateo (Hijo Basic):   alumno.mateo@sanignacio.edu.pe / Student123!\n');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error fatal en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
