/**
 * Crea (o recupera) la cuenta SUPER_ADMIN de la plataforma.
 *
 *   SUPERADMIN_EMAIL=soporte@kipux.pe pnpm superadmin:create
 *   SUPERADMIN_EMAIL=soporte@kipux.pe pnpm superadmin:create -- --reset-password
 *   SUPERADMIN_EMAIL=soporte@kipux.pe pnpm superadmin:create -- --reset-mfa   (teléfono perdido)
 *
 * - La contraseña se genera al azar, se muestra UNA vez y queda con cambio obligatorio.
 * - Si la cuenta ya existe, NO toca su contraseña salvo que se pase --reset-password.
 * - Nunca usa contraseñas fijas: una contraseña conocida en el repositorio equivale a no tener ninguna.
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INTERNAL_SCHOOL_RUC = '00000000000';
const INTERNAL_SCHOOL_SLUG = 'kipux-plataforma';

const randomPassword = (): string => {
  // 16 caracteres con letras y dígitos garantizados (cumple la política de contraseñas)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const body = Array.from(crypto.randomBytes(14), (b) => alphabet[b % alphabet.length]).join('');
  return `${body}${crypto.randomInt(2, 10)}k`;
};

async function main(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Define SUPERADMIN_EMAIL con el correo real de la cuenta de soporte.');
  }
  const resetPassword = process.argv.includes('--reset-password');
  const resetMfa = process.argv.includes('--reset-mfa');

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

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing && existing.role !== 'SUPER_ADMIN') {
    throw new Error(`${email} ya existe con rol ${existing.role}. Usa otro correo para la cuenta de soporte.`);
  }

  if (existing && resetMfa) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { mfaSecret: null, mfaEnabledAt: null, mfaLastStep: null },
    });
    console.log(`Verificación en dos pasos de ${email} restablecida: vuelve a enrolarla al ingresar.`);
    if (!resetPassword) return;
  }

  if (existing && !resetPassword) {
    console.log(`La cuenta ${email} ya existe. No se cambió su contraseña (usa --reset-password para generar una nueva).`);
    return;
  }

  const password = randomPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  } else {
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email,
        passwordHash,
        mustChangePassword: true,
        role: 'SUPER_ADMIN',
        firstName: 'Soporte',
        lastNamePaternal: 'KIPUX',
        lastNameMaternal: 'Plataforma',
        documentType: 'DNI',
        documentId: '00000000',
        cellphone: '999999999',
      },
    });
  }

  console.log(`Cuenta SUPER_ADMIN ${existing ? 'restablecida' : 'creada'}: ${email}`);
  console.log(`Contraseña temporal (se muestra solo esta vez, cámbiala al ingresar): ${password}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
