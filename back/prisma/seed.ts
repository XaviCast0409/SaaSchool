/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient, RelationshipType, AttendanceStatus } from '@prisma/client';
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

// ============================================================================
// DATOS DE REFERENCIA
// ============================================================================

const NOMBRES_MASCULINOS = [
  'Carlos', 'José', 'Juan', 'Miguel', 'Luis', 'Pedro', 'Andrés', 'Diego',
  'Sebastián', 'Alejandro', 'Fernando', 'Ricardo', 'Eduardo', 'Gabriél', 'Rodrigo',
];

const NOMBRES_FEMENINOS = [
  'María', 'Ana', 'Lucía', 'Valeria', 'Sofía', 'Isabella', 'Camila', 'Daniela',
  'Paola', 'Andrea', 'Fernanda', 'Claudia', 'Patricia', 'Natalia', 'Gabriela',
];

const APELLIDOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Morales', 'Ortiz', 'Díaz', 'Reyes',
  'Vargas', 'Mendoza', 'Castro', 'Herrera', 'Medina', 'Quispe', 'Mamani', 'Huanca',
];

const DEPARTAMENTOS = ['LIMA', 'AREQUIPA', 'CUSCO', 'PIURA', 'LA LIBERTAD', 'JUNÍN'];
const DISTRITOS_LIMA = ['MIRAFLORES', 'SAN ISIDRO', 'SURCO', 'SAN BORJA', 'LA MOLINA', 'JESÚS MARÍA'];
const DISTRITOS_AREQUIPA = ['AREQUIPA', 'CAYMA', 'YANAHUARA', 'CERRO COLORADO', 'PAUCARPATA'];

// ============================================================================
// GENERADORES DE DATOS ALEATORIOS
// ============================================================================

const generateDni = (): string => String(randomBetween(10000000, 99999999));

const generateRuc = (): string => `20${String(randomBetween(100000000, 999999999))}`;

const generateStudentCode = (): string =>
  String(randomBetween(10000000000000, 99999999999999));

const generateBirthDate = (minAge: number, maxAge: number): Date => {
  const now = new Date();
  const minYear = now.getFullYear() - maxAge;
  const maxYear = now.getFullYear() - minAge;
  const year = randomBetween(minYear, maxYear);
  const month = randomBetween(0, 11);
  const day = randomBetween(1, 28);
  return new Date(year, month, day);
};

const generateEmail = (firstName: string, lastName: string, domain: string): string => {
  const normalizedFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${normalizedFirst}.${normalizedLast}${randomBetween(1, 99)}@${domain}`;
};

// ============================================================================
// FUNCIÓN PRINCIPAL DEL SEED
// ============================================================================

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed de la base de datos SaaSchool...\n');

  // Limpiar datos existentes en orden correcto (respetando FK)
  console.log('🧹 Limpiando datos existentes...');
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.gradeEntry.deleteMany();
  await prisma.courseAssignment.deleteMany();
  await prisma.curricularCompetence.deleteMany();
  await prisma.curricularArea.deleteMany();
  await prisma.gradingScale.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentObligation.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.familyRelationship.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  console.log('✅ Base de datos limpiada\n');

  // ==========================================================================
  // 1. CREAR 2 COLEGIOS
  // ==========================================================================
  console.log('🏫 Creando colegios...');

  const schoolSanIgnacio = await prisma.school.create({
    data: {
      name: 'I.E. San Ignacio de Loyola',
      documentId: generateRuc(),
      modularCode: '0614990',
      localCode: 'LO1234',
      email: 'admin@sanignacio.edu.pe',
      phone: '01-4445566',
      address: 'Av. La Marina 1200',
      department: 'LIMA',
      province: 'LIMA',
      district: 'SAN MIGUEL',
      isActive: true,
    },
  });

  const schoolSantaRosa = await prisma.school.create({
    data: {
      name: 'I.E. Santa Rosa de Lima',
      documentId: generateRuc(),
      modularCode: '0501239',
      localCode: 'AQ5678',
      email: 'secretaria@santarosa.edu.pe',
      phone: '054-223344',
      address: 'Calle Mercaderes 340',
      department: 'AREQUIPA',
      province: 'AREQUIPA',
      district: 'AREQUIPA',
      isActive: true,
    },
  });

  console.log(`  ✅ ${schoolSanIgnacio.name}`);
  console.log(`  ✅ ${schoolSantaRosa.name}\n`);

  // ==========================================================================
  // 2. CREAR USUARIOS POR COLEGIO
  // ==========================================================================
  console.log('👤 Creando usuarios...');

  const passwordAdmin = await hashPassword('Admin123!');
  const passwordTeacher = await hashPassword('Teacher123!');
  const passwordParent = await hashPassword('Parent123!');

  // ── Usuarios San Ignacio ──
  const _adminSanIgnacio = await prisma.user.create({
    data: {
      schoolId: schoolSanIgnacio.id,
      email: 'admin@sanignacio.edu.pe',
      passwordHash: passwordAdmin,
      role: 'SCHOOL_ADMIN',
      firstName: 'Roberto',
      lastNamePaternal: 'Villanueva',
      lastNameMaternal: 'Quispe',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '987654321',
    },
  });

  const teacher1SanIgnacio = await prisma.user.create({
    data: {
      schoolId: schoolSanIgnacio.id,
      email: 'jmartinez@sanignacio.edu.pe',
      passwordHash: passwordTeacher,
      role: 'TEACHER',
      firstName: 'Jorge',
      lastNamePaternal: 'Martínez',
      lastNameMaternal: 'Fuentes',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '976543210',
    },
  });

  const teacher2SanIgnacio = await prisma.user.create({
    data: {
      schoolId: schoolSanIgnacio.id,
      email: 'lflores@sanignacio.edu.pe',
      passwordHash: passwordTeacher,
      role: 'TEACHER',
      firstName: 'Lucía',
      lastNamePaternal: 'Flores',
      lastNameMaternal: 'Medina',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '965432109',
    },
  });

  // Padres de familia San Ignacio
  const parentsSanIgnacio = await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const isMale = index % 2 === 0;
      const firstName = isMale ? randomElement(NOMBRES_MASCULINOS) : randomElement(NOMBRES_FEMENINOS);
      const lastNamePaternal = randomElement(APELLIDOS);
      const lastNameMaternal = randomElement(APELLIDOS);
      return prisma.user.create({
        data: {
          schoolId: schoolSanIgnacio.id,
          email: generateEmail(firstName, lastNamePaternal, 'gmail.com'),
          passwordHash: passwordParent,
          role: 'PARENT',
          firstName,
          lastNamePaternal,
          lastNameMaternal,
          documentType: 'DNI',
          documentId: generateDni(),
          cellphone: `9${randomBetween(60000000, 99999999)}`,
        },
      });
    }),
  );

  // ── Usuarios Santa Rosa ──
  const _adminSantaRosa = await prisma.user.create({
    data: {
      schoolId: schoolSantaRosa.id,
      email: 'admin@santarosa.edu.pe',
      passwordHash: passwordAdmin,
      role: 'SCHOOL_ADMIN',
      firstName: 'Carmen',
      lastNamePaternal: 'Huanca',
      lastNameMaternal: 'Apaza',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '958741236',
    },
  });

  const teacher1SantaRosa = await prisma.user.create({
    data: {
      schoolId: schoolSantaRosa.id,
      email: 'rquispe@santarosa.edu.pe',
      passwordHash: passwordTeacher,
      role: 'TEACHER',
      firstName: 'Ricardo',
      lastNamePaternal: 'Quispe',
      lastNameMaternal: 'Mamani',
      documentType: 'DNI',
      documentId: generateDni(),
      cellphone: '947852369',
    },
  });

  const parentsSantaRosa = await Promise.all(
    Array.from({ length: 6 }, async (_, index) => {
      const isMale = index % 2 === 0;
      const firstName = isMale ? randomElement(NOMBRES_MASCULINOS) : randomElement(NOMBRES_FEMENINOS);
      const lastNamePaternal = randomElement(APELLIDOS);
      const lastNameMaternal = randomElement(APELLIDOS);
      return prisma.user.create({
        data: {
          schoolId: schoolSantaRosa.id,
          email: generateEmail(firstName, lastNamePaternal, 'hotmail.com'),
          passwordHash: passwordParent,
          role: 'PARENT',
          firstName,
          lastNamePaternal,
          lastNameMaternal,
          documentType: 'DNI',
          documentId: generateDni(),
          cellphone: `9${randomBetween(60000000, 99999999)}`,
        },
      });
    }),
  );

  console.log(`  ✅ Usuarios San Ignacio: 1 admin, 2 profesores, ${parentsSanIgnacio.length} padres`);
  console.log(`  ✅ Usuarios Santa Rosa: 1 admin, 1 profesor, ${parentsSantaRosa.length} padres\n`);

  // ==========================================================================
  // 3. AÑOS ACADÉMICOS
  // ==========================================================================
  console.log('📅 Creando años académicos...');

  const academicYear2026SI = await prisma.academicYear.create({
    data: {
      schoolId: schoolSanIgnacio.id,
      year: 2026,
      name: 'Año Escolar 2026',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-19'),
      isActive: true,
    },
  });

  const _academicYear2025SI = await prisma.academicYear.create({
    data: {
      schoolId: schoolSanIgnacio.id,
      year: 2025,
      name: 'Año Escolar 2025',
      startDate: new Date('2025-03-03'),
      endDate: new Date('2025-12-19'),
      isActive: false,
    },
  });

  const academicYear2026SR = await prisma.academicYear.create({
    data: {
      schoolId: schoolSantaRosa.id,
      year: 2026,
      name: 'Año Escolar 2026',
      startDate: new Date('2026-03-02'),
      endDate: new Date('2026-12-18'),
      isActive: true,
    },
  });

  console.log('  ✅ San Ignacio: 2025 y 2026');
  console.log('  ✅ Santa Rosa: 2026\n');

  // ==========================================================================
  // 4. AULAS
  // ==========================================================================
  console.log('🏫 Creando aulas...');

  // San Ignacio — Primary (1° a 4° grado)
  const classroomsSanIgnacio = await Promise.all([
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'PRIMARY', grade: 1, section: 'A', shift: 'MORNING', capacity: 30 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'PRIMARY', grade: 1, section: 'B', shift: 'MORNING', capacity: 28 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'PRIMARY', grade: 2, section: 'A', shift: 'MORNING', capacity: 32 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'PRIMARY', grade: 3, section: 'A', shift: 'AFTERNOON', capacity: 30 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'SECONDARY', grade: 1, section: 'A', shift: 'MORNING', capacity: 35 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSanIgnacio.id, educationLevel: 'SECONDARY', grade: 2, section: 'A', shift: 'MORNING', capacity: 35 },
    }),
  ]);

  // Santa Rosa — Primary y Secondary
  const classroomsSantaRosa = await Promise.all([
    prisma.classroom.create({
      data: { schoolId: schoolSantaRosa.id, educationLevel: 'PRIMARY', grade: 1, section: 'Única', shift: 'MORNING', capacity: 25 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSantaRosa.id, educationLevel: 'PRIMARY', grade: 2, section: 'Única', shift: 'MORNING', capacity: 25 },
    }),
    prisma.classroom.create({
      data: { schoolId: schoolSantaRosa.id, educationLevel: 'SECONDARY', grade: 1, section: 'Única', shift: 'AFTERNOON', capacity: 30 },
    }),
  ]);

  console.log(`  ✅ San Ignacio: ${classroomsSanIgnacio.length} aulas`);
  console.log(`  ✅ Santa Rosa: ${classroomsSantaRosa.length} aulas\n`);

  // ==========================================================================
  // 5. ESTUDIANTES
  // ==========================================================================
  console.log('🎒 Creando estudiantes...');

  const createStudents = async (schoolId: string, count: number): Promise<Awaited<ReturnType<typeof prisma.student.create>>[]> =>
    Promise.all(
      Array.from({ length: count }, async () => {
        const isMale = Math.random() > 0.5;
        const firstNames = isMale ? `${randomElement(NOMBRES_MASCULINOS)} ${randomElement(NOMBRES_MASCULINOS)}` : `${randomElement(NOMBRES_FEMENINOS)} ${randomElement(NOMBRES_FEMENINOS)}`;
        const lastNamePaternal = randomElement(APELLIDOS);
        const lastNameMaternal = randomElement(APELLIDOS);
        const department = randomElement(DEPARTAMENTOS);
        const district = department === 'LIMA' ? randomElement(DISTRITOS_LIMA) : randomElement(DISTRITOS_AREQUIPA);

        return prisma.student.create({
          data: {
            schoolId,
            firstNames,
            lastNamePaternal,
            lastNameMaternal,
            documentType: 'DNI',
            documentId: generateDni(),
            gender: isMale ? 'MALE' : 'FEMALE',
            birthDate: generateBirthDate(6, 17),
            birthCountry: 'PERÚ',
            birthDepartment: department,
            birthProvince: department,
            birthDistrict: district,
            motherTongue: Math.random() > 0.9 ? 'QUECHUA' : 'CASTELLANO',
            hasDisability: Math.random() < 0.05,
            address: `Calle Los Pinos ${randomBetween(100, 999)}, ${district}`,
            studentCode: generateStudentCode(),
          },
        });
      }),
    );

  const studentsSanIgnacio = await createStudents(schoolSanIgnacio.id, 20);
  const studentsSantaRosa = await createStudents(schoolSantaRosa.id, 12);

  console.log(`  ✅ San Ignacio: ${studentsSanIgnacio.length} estudiantes`);
  console.log(`  ✅ Santa Rosa: ${studentsSantaRosa.length} estudiantes\n`);

  // ==========================================================================
  // 6. RELACIONES FAMILIARES
  // ==========================================================================
  console.log('👨‍👩‍👧 Creando relaciones familiares...');

  const relationshipTypes: RelationshipType[] = ['MOTHER', 'FATHER'];

  // San Ignacio: cada par de estudiantes tiene un padre de la lista
  for (let index = 0; index < studentsSanIgnacio.length; index++) {
    const parentIndex = Math.floor(index / 2) % parentsSanIgnacio.length;
    const parent = parentsSanIgnacio[parentIndex];
    const student = studentsSanIgnacio[index];

    // Verificar si ya existe esta relación
    const existingRelation = await prisma.familyRelationship.findFirst({
      where: { studentId: student.id, userId: parent.id },
    });

    if (!existingRelation) {
      await prisma.familyRelationship.create({
        data: {
          studentId: student.id,
          userId: parent.id,
          relationshipType: index % 2 === 0 ? 'MOTHER' : 'FATHER',
          isLegalGuardian: true,
          isFinancialResponsible: index % 2 === 0,
          livesWithStudent: true,
        },
      });
    }
  }

  // Santa Rosa: misma lógica
  for (let index = 0; index < studentsSantaRosa.length; index++) {
    const parentIndex = Math.floor(index / 2) % parentsSantaRosa.length;
    const parent = parentsSantaRosa[parentIndex];
    const student = studentsSantaRosa[index];

    const existingRelation = await prisma.familyRelationship.findFirst({
      where: { studentId: student.id, userId: parent.id },
    });

    if (!existingRelation) {
      await prisma.familyRelationship.create({
        data: {
          studentId: student.id,
          userId: parent.id,
          relationshipType: randomElement(relationshipTypes),
          isLegalGuardian: true,
          isFinancialResponsible: true,
          livesWithStudent: Math.random() > 0.1,
        },
      });
    }
  }

  console.log('  ✅ Relaciones familiares creadas\n');

  // ==========================================================================
  // 7. MATRÍCULAS
  // ==========================================================================
  console.log('📋 Creando matrículas...');

  const enrollmentsSanIgnacio: Awaited<ReturnType<typeof prisma.enrollment.create>>[] = [];

  // Distribuir estudiantes en aulas de San Ignacio
  const classroomDistributionSI = [
    { classroom: classroomsSanIgnacio[0], students: studentsSanIgnacio.slice(0, 4) },   // 1°A
    { classroom: classroomsSanIgnacio[1], students: studentsSanIgnacio.slice(4, 8) },   // 1°B
    { classroom: classroomsSanIgnacio[2], students: studentsSanIgnacio.slice(8, 12) },  // 2°A
    { classroom: classroomsSanIgnacio[3], students: studentsSanIgnacio.slice(12, 15) }, // 3°A
    { classroom: classroomsSanIgnacio[4], students: studentsSanIgnacio.slice(15, 18) }, // 1° Sec
    { classroom: classroomsSanIgnacio[5], students: studentsSanIgnacio.slice(18, 20) }, // 2° Sec
  ];

  for (const distribution of classroomDistributionSI) {
    for (const student of distribution.students) {
      const enrollment = await prisma.enrollment.create({
        data: {
          schoolId: schoolSanIgnacio.id,
          studentId: student.id,
          academicYearId: academicYear2026SI.id,
          classroomId: distribution.classroom.id,
          enrollmentState: 'REGISTERED',
          repeatingGrade: Math.random() < 0.05,
          isActive: true,
        },
      });
      enrollmentsSanIgnacio.push(enrollment);
    }
  }

  // Distribuir estudiantes en aulas de Santa Rosa
  const enrollmentsSantaRosa: Awaited<ReturnType<typeof prisma.enrollment.create>>[] = [];

  const classroomDistributionSR = [
    { classroom: classroomsSantaRosa[0], students: studentsSantaRosa.slice(0, 5) },  // 1° Única
    { classroom: classroomsSantaRosa[1], students: studentsSantaRosa.slice(5, 9) },  // 2° Única
    { classroom: classroomsSantaRosa[2], students: studentsSantaRosa.slice(9, 12) }, // 1° Sec Única
  ];

  for (const distribution of classroomDistributionSR) {
    for (const student of distribution.students) {
      const enrollment = await prisma.enrollment.create({
        data: {
          schoolId: schoolSantaRosa.id,
          studentId: student.id,
          academicYearId: academicYear2026SR.id,
          classroomId: distribution.classroom.id,
          enrollmentState: 'REGISTERED',
          repeatingGrade: false,
          isActive: true,
        },
      });
      enrollmentsSantaRosa.push(enrollment);
    }
  }

  console.log(`  ✅ San Ignacio: ${enrollmentsSanIgnacio.length} matrículas`);
  console.log(`  ✅ Santa Rosa: ${enrollmentsSantaRosa.length} matrículas\n`);

  // ==========================================================================
  // 8. ESCALAS DE CALIFICACIÓN
  // ==========================================================================
  console.log('📊 Creando escalas de calificación...');

  const createGradingScales = async (schoolId: string): Promise<void> => {
    const levels = ['PRIMARY', 'SECONDARY', 'INITIAL'] as const;
    for (const level of levels) {
      await prisma.gradingScale.createMany({
        data: [
          { schoolId, level, letterGrade: 'AD', minNumeric: 17.5, maxNumeric: 20.0, description: 'Logro destacado' },
          { schoolId, level, letterGrade: 'A', minNumeric: 14.0, maxNumeric: 17.4, description: 'Logro esperado' },
          { schoolId, level, letterGrade: 'B', minNumeric: 11.0, maxNumeric: 13.9, description: 'En proceso' },
          { schoolId, level, letterGrade: 'C', minNumeric: 0.0, maxNumeric: 10.9, description: 'En inicio' },
        ],
      });
    }
  };

  await createGradingScales(schoolSanIgnacio.id);
  await createGradingScales(schoolSantaRosa.id);
  console.log('  ✅ Escalas AD/A/B/C creadas para ambos colegios\n');

  // ==========================================================================
  // 9. ÁREAS CURRICULARES Y COMPETENCIAS
  // ==========================================================================
  console.log('📚 Creando áreas curriculares y competencias...');

  const areasData = [
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
        'Indaga mediante métodos científicos',
        'Explica el mundo físico basándose en conocimientos científicos',
        'Diseña y construye soluciones tecnológicas',
      ],
    },
    {
      name: 'Personal Social',
      officialCode: 'PS',
      competences: [
        'Construye su identidad',
        'Convive y participa democráticamente',
        'Construye interpretaciones históricas',
      ],
    },
    {
      name: 'Inglés',
      officialCode: 'ING',
      competences: [
        'Se comunica oralmente en inglés como lengua extranjera',
        'Lee diversos tipos de textos en inglés',
        'Escribe diversos tipos de textos en inglés',
      ],
    },
  ];

  const createAreasForSchool = async (schoolId: string) => {
    const createdAreas = [];
    for (const areaData of areasData) {
      const area = await prisma.curricularArea.create({
        data: { schoolId, name: areaData.name, officialCode: areaData.officialCode, isActive: true },
      });
      const competences = await Promise.all(
        areaData.competences.map((competenceName) =>
          prisma.curricularCompetence.create({
            data: { areaId: area.id, name: competenceName },
          }),
        ),
      );
      createdAreas.push({ area, competences });
    }
    return createdAreas;
  };

  const areasSanIgnacio = await createAreasForSchool(schoolSanIgnacio.id);
  const areasSantaRosa = await createAreasForSchool(schoolSantaRosa.id);

  console.log(`  ✅ San Ignacio: ${areasSanIgnacio.length} áreas con competencias`);
  console.log(`  ✅ Santa Rosa: ${areasSantaRosa.length} áreas con competencias\n`);

  // ==========================================================================
  // 10. ASIGNACIONES DE CURSOS
  // ==========================================================================
  console.log('📌 Creando asignaciones de cursos (docente-aula-área)...');

  const assignmentsSanIgnacio: Awaited<ReturnType<typeof prisma.courseAssignment.create>>[] = [];

  // Profesor 1 (Jorge): Matemática y Comunicación en 1°A y 2°A
  for (const classroom of [classroomsSanIgnacio[0], classroomsSanIgnacio[2]]) {
    for (const areaData of areasSanIgnacio.slice(0, 2)) {
      const assignment = await prisma.courseAssignment.create({
        data: {
          schoolId: schoolSanIgnacio.id,
          classroomId: classroom.id,
          areaId: areaData.area.id,
          teacherId: teacher1SanIgnacio.id,
        },
      });
      assignmentsSanIgnacio.push(assignment);
    }
  }

  // Profesor 2 (Lucía): Inglés y Ciencia en 1°B y Secundaria 1°A
  for (const classroom of [classroomsSanIgnacio[1], classroomsSanIgnacio[4]]) {
    for (const areaData of [areasSanIgnacio[2], areasSanIgnacio[4]]) {
      const assignment = await prisma.courseAssignment.create({
        data: {
          schoolId: schoolSanIgnacio.id,
          classroomId: classroom.id,
          areaId: areaData.area.id,
          teacherId: teacher2SanIgnacio.id,
        },
      });
      assignmentsSanIgnacio.push(assignment);
    }
  }

  // Santa Rosa — Matemática y Comunicación con el único profesor
  const assignmentsSantaRosa: Awaited<ReturnType<typeof prisma.courseAssignment.create>>[] = [];
  for (const classroom of classroomsSantaRosa) {
    for (const areaData of areasSantaRosa.slice(0, 2)) {
      const assignment = await prisma.courseAssignment.create({
        data: {
          schoolId: schoolSantaRosa.id,
          classroomId: classroom.id,
          areaId: areaData.area.id,
          teacherId: teacher1SantaRosa.id,
        },
      });
      assignmentsSantaRosa.push(assignment);
    }
  }

  console.log(`  ✅ San Ignacio: ${assignmentsSanIgnacio.length} asignaciones`);
  console.log(`  ✅ Santa Rosa: ${assignmentsSantaRosa.length} asignaciones\n`);

  // ==========================================================================
  // 11. ENTRADAS DE CALIFICACIÓN (GradeEntry) Y NOTAS
  // ==========================================================================
  console.log('📝 Creando entradas de calificación y notas...');

  let totalGrades = 0;

  for (const assignment of assignmentsSanIgnacio) {
    // Encontrar el área y sus competencias
    const matchingArea = areasSanIgnacio.find((a) => a.area.id === assignment.areaId);
    if (!matchingArea) continue;

    // Encontrar matrículas del aula correspondiente
    const enrollmentsInClassroom = enrollmentsSanIgnacio.filter(
      (e) => e.classroomId === assignment.classroomId,
    );

    // Por cada competencia creamos GradeEntries de Bimestre 1 y 2
    for (const competence of matchingArea.competences.slice(0, 2)) {
      for (const periodNumber of [1, 2]) {
        // Un GradeEntry por (competencia + bimestre)
        const gradeEntry = await prisma.gradeEntry.create({
          data: {
            courseAssignmentId: assignment.id,
            periodNumber,
            assessmentType: periodNumber === 1 ? 'FORMATIVE' : 'SUMMATIVE',
            title: `${competence.name} — Bimestre ${periodNumber}`,
            weight: 1.0,
            maxScore: 20.0,
          },
        });

        // Una nota por enrollment en ese GradeEntry (unique gradeEntryId + enrollmentId ✅)
        for (const enrollment of enrollmentsInClassroom) {
          await prisma.grade.create({
            data: {
              gradeEntryId: gradeEntry.id,
              enrollmentId: enrollment.id,
              competenceId: competence.id,
              numericScore: randomFloat(8, 20),
              teacherComment:
                Math.random() < 0.15 ? 'Necesita reforzamiento en los temas tratados.' : undefined,
            },
          });
          totalGrades++;
        }
      }
    }
  }

  console.log(`  ✅ ${totalGrades} notas registradas\n`);

  // ==========================================================================
  // 12. OBLIGACIONES DE PAGO Y TRANSACCIONES
  // ==========================================================================
  console.log('💰 Creando obligaciones de pago y transacciones...');

  const meses = [
    { title: 'Matrícula 2026', concept: 'MATRICULA', amount: 300, dueDate: new Date('2026-02-15') },
    { title: 'Pensión Marzo 2026', concept: 'PENSION', amount: 350, dueDate: new Date('2026-03-10') },
    { title: 'Pensión Abril 2026', concept: 'PENSION', amount: 350, dueDate: new Date('2026-04-10') },
    { title: 'Pensión Mayo 2026', concept: 'PENSION', amount: 350, dueDate: new Date('2026-05-10') },
    { title: 'Pensión Junio 2026', concept: 'PENSION', amount: 350, dueDate: new Date('2026-06-10') },
  ];

  let totalObligations = 0;
  let totalTransactions = 0;

  // San Ignacio — pagos para las primeras 10 matrículas
  for (const enrollment of enrollmentsSanIgnacio.slice(0, 10)) {
    for (const mes of meses) {
      const obligation = await prisma.paymentObligation.create({
        data: {
          schoolId: schoolSanIgnacio.id,
          enrollmentId: enrollment.id,
          title: mes.title,
          concept: mes.concept,
          amountDue: mes.amount,
          dueDate: mes.dueDate,
          status: 'PENDING',
        },
      });
      totalObligations++;

      // Simular diferentes estados de pago
      const paymentChance = Math.random();

      if (paymentChance > 0.3) {
        // PAGADO
        await prisma.paymentTransaction.create({
          data: {
            schoolId: schoolSanIgnacio.id,
            obligationId: obligation.id,
            amountPaid: mes.amount,
            paymentMethod: randomElement(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'] as const),
            operationNumber: `OP-${randomBetween(100000, 999999)}`,
            receiptType: 'BOLETA',
            receiptNumber: `B001-${randomBetween(1000, 9999)}`,
          },
        });
        await prisma.paymentObligation.update({
          where: { id: obligation.id },
          data: { status: 'PAID' },
        });
        totalTransactions++;
      } else if (paymentChance > 0.15) {
        // PAGO PARCIAL
        const partialAmount = mes.amount * 0.5;
        await prisma.paymentTransaction.create({
          data: {
            schoolId: schoolSanIgnacio.id,
            obligationId: obligation.id,
            amountPaid: partialAmount,
            paymentMethod: 'CASH',
            notes: 'Pago parcial acordado con apoderado.',
          },
        });
        await prisma.paymentObligation.update({
          where: { id: obligation.id },
          data: { status: 'PARTIAL' },
        });
        totalTransactions++;
      }
      // El resto queda PENDING
    }
  }

  // Santa Rosa — pagos más pequeños
  const mesesSR = [
    { title: 'Matrícula 2026', concept: 'MATRICULA', amount: 150, dueDate: new Date('2026-02-20') },
    { title: 'Pensión Marzo 2026', concept: 'PENSION', amount: 200, dueDate: new Date('2026-03-10') },
    { title: 'Pensión Abril 2026', concept: 'PENSION', amount: 200, dueDate: new Date('2026-04-10') },
  ];

  for (const enrollment of enrollmentsSantaRosa) {
    for (const mes of mesesSR) {
      const obligation = await prisma.paymentObligation.create({
        data: {
          schoolId: schoolSantaRosa.id,
          enrollmentId: enrollment.id,
          title: mes.title,
          concept: mes.concept,
          amountDue: mes.amount,
          dueDate: mes.dueDate,
          status: 'PENDING',
        },
      });
      totalObligations++;

      if (Math.random() > 0.4) {
        await prisma.paymentTransaction.create({
          data: {
            schoolId: schoolSantaRosa.id,
            obligationId: obligation.id,
            amountPaid: mes.amount,
            paymentMethod: randomElement(['CASH', 'BANK_TRANSFER'] as const),
            receiptType: 'BOLETA',
            receiptNumber: `B001-${randomBetween(1000, 9999)}`,
          },
        });
        await prisma.paymentObligation.update({
          where: { id: obligation.id },
          data: { status: 'PAID' },
        });
        totalTransactions++;
      }
    }
  }

  console.log(`  ✅ ${totalObligations} obligaciones de pago`);
  console.log(`  ✅ ${totalTransactions} transacciones registradas\n`);

  // ==========================================================================
  // 13. ASISTENCIA
  // ==========================================================================
  console.log('✋ Creando registros de asistencia...');

  const attendanceStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT_JUSTIFIED', 'ABSENT_UNJUSTIFIED', 'LATE_JUSTIFIED'];

  // Registrar asistencia para las últimas 5 semanas (lunes a viernes) en San Ignacio
  const today = new Date();
  let totalAttendances = 0;

  for (let weekOffset = 4; weekOffset >= 0; weekOffset--) {
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const attendanceDate = new Date(today);
      attendanceDate.setDate(today.getDate() - weekOffset * 7 - (4 - dayOffset));
      attendanceDate.setHours(0, 0, 0, 0);

      // Solo días hábiles (lunes a viernes = 1 a 5)
      const dayOfWeek = attendanceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // San Ignacio — primeras 15 matrículas
      for (const enrollment of enrollmentsSanIgnacio.slice(0, 15)) {
        const randomStatus = Math.random();
        const status =
          randomStatus > 0.1
            ? 'PRESENT'
            : randomStatus > 0.05
            ? 'ABSENT_JUSTIFIED'
            : randomStatus > 0.02
            ? 'LATE_JUSTIFIED'
            : 'ABSENT_UNJUSTIFIED';

        await prisma.attendance.upsert({
          where: { enrollmentId_date: { enrollmentId: enrollment.id, date: attendanceDate } },
          update: {},
          create: {
            schoolId: schoolSanIgnacio.id,
            enrollmentId: enrollment.id,
            date: attendanceDate,
            status,
            notes: status !== 'PRESENT' ? 'Registrado por profesor' : undefined,
          },
        });
        totalAttendances++;
      }

      // Santa Rosa — todas sus matrículas
      for (const enrollment of enrollmentsSantaRosa) {
        const status: AttendanceStatus = Math.random() > 0.08 ? 'PRESENT' : randomElement(attendanceStatuses);

        await prisma.attendance.upsert({
          where: { enrollmentId_date: { enrollmentId: enrollment.id, date: attendanceDate } },
          update: {},
          create: {
            schoolId: schoolSantaRosa.id,
            enrollmentId: enrollment.id,
            date: attendanceDate,
            status,
          },
        });
        totalAttendances++;
      }
    }
  }

  console.log(`  ✅ ${totalAttendances} registros de asistencia (5 semanas)\n`);

  // ==========================================================================
  // RESUMEN FINAL
  // ==========================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅  SEED COMPLETADO — RESUMEN DE DATOS GENERADOS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🏫  Colegios:          2`);
  console.log(`👤  Usuarios:          ${2 + 3 + parentsSanIgnacio.length + parentsSantaRosa.length} (admins, docentes, padres)`);
  console.log(`🎒  Estudiantes:       ${studentsSanIgnacio.length + studentsSantaRosa.length}`);
  console.log(`📋  Matrículas:        ${enrollmentsSanIgnacio.length + enrollmentsSantaRosa.length}`);
  console.log(`📚  Áreas curriculares: ${areasData.length * 2} (${areasData.length} por colegio)`);
  console.log(`📊  Escalas de notas:  AD / A / B / C (ambos colegios)`);
  console.log(`💰  Obligaciones pago: ${totalObligations}`);
  console.log(`💳  Transacciones:     ${totalTransactions}`);
  console.log(`📝  Notas:             ${totalGrades}`);
  console.log(`✋  Asistencias:       ${totalAttendances}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📌 CREDENCIALES DE ACCESO:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('🏫 SAN IGNACIO DE LOYOLA');
  console.log(`   Admin:    admin@sanignacio.edu.pe  / Admin123!`);
  console.log(`   Docente:  jmartinez@sanignacio.edu.pe / Teacher123!`);
  console.log(`   Docente:  lflores@sanignacio.edu.pe   / Teacher123!`);
  console.log('\n🏫 SANTA ROSA DE LIMA');
  console.log(`   Admin:    admin@santarosa.edu.pe   / Admin123!`);
  console.log(`   Docente:  rquispe@santarosa.edu.pe / Teacher123!`);
  console.log('─────────────────────────────────────────────────────────\n');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
