import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

const INTERNAL_SCHOOL_RUC = '00000000000';
const INTERNAL_SCHOOL_SLUG = 'kipux-plataforma';

async function main() {
  const school = await prisma.school.upsert({
    where: { documentId: INTERNAL_SCHOOL_RUC },
    update: { isActive: false },
    create: {
      name: 'KIPUX Plataforma',
      slug: INTERNAL_SCHOOL_SLUG,
      documentId: INTERNAL_SCHOOL_RUC,
      plan: 'ENTERPRISE',
      isActive: false,
      address: 'Plataforma Central KIPUX',
    },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@saaschool.com' },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash,
      schoolId: school.id,
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
  console.log('   Colegio interno:', school.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
