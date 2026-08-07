import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error('No hay colegios en la BD');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@saaschool.com' },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash,
    },
    create: {
      schoolId: school.id,
      email: 'superadmin@saaschool.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastNamePaternal: 'Admin',
      lastNameMaternal: 'SaaS',
      documentType: 'DNI',
      documentId: '00000000',
      cellphone: '999999999',
    },
  });

  console.log('✅ Usuario SuperAdmin creado/actualizado con éxito:');
  console.log('   Email:', superAdmin.email);
  console.log('   Password: Admin123!');
  console.log('   Rol:', superAdmin.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
