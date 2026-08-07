import { prisma } from '../config/prisma';

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      isActive: true,
      _count: {
        select: {
          users: true,
          students: true,
          academicYears: true,
          classrooms: true,
        },
      },
    },
  });

  console.log('🏫 Colegios en la BD:', JSON.stringify(schools, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      school: { select: { name: true } },
    },
  });

  console.log('👥 Usuarios en la BD:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
