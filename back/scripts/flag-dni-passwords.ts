import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  let flaggedUsers = 0;
  let flaggedStudents = 0;

  const users = await prisma.user.findMany({
    where: { documentId: { not: null }, mustChangePassword: false },
    select: { id: true, documentId: true, passwordHash: true },
  });
  for (const user of users) {
    if (user.documentId && (await bcrypt.compare(user.documentId.trim(), user.passwordHash))) {
      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
      flaggedUsers++;
    }
  }

  const students = await prisma.student.findMany({
    where: { passwordHash: { not: null }, mustChangePassword: false },
    select: { id: true, documentId: true, passwordHash: true },
  });
  for (const student of students) {
    if (student.passwordHash && (await bcrypt.compare(student.documentId.trim(), student.passwordHash))) {
      await prisma.student.update({ where: { id: student.id }, data: { mustChangePassword: true } });
      flaggedStudents++;
    }
  }

  console.log(`✅ Usuarios marcados: ${flaggedUsers} | Estudiantes marcados: ${flaggedStudents}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
