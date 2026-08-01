import { prisma } from '../../config/prisma';
import type { RegisterDto } from './auth.schema';
import type { User } from '@prisma/client';

/**
 * AuthRepository: Capa de acceso a datos para autenticación.
 * Única clase que interactúa con Prisma para operaciones de auth.
 */
export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: RegisterDto & { passwordHash: string }): Promise<User> {
    const { password: _password, ...userDataWithoutPassword } = data as RegisterDto & {
      passwordHash: string;
      password?: string;
    };

    return prisma.user.create({
      data: {
        schoolId: userDataWithoutPassword.schoolId,
        email: userDataWithoutPassword.email,
        passwordHash: userDataWithoutPassword.passwordHash,
        firstName: userDataWithoutPassword.firstName,
        lastNamePaternal: userDataWithoutPassword.lastNamePaternal,
        lastNameMaternal: userDataWithoutPassword.lastNameMaternal,
        documentType: userDataWithoutPassword.documentType,
        documentId: userDataWithoutPassword.documentId,
        cellphone: userDataWithoutPassword.cellphone,
        role: userDataWithoutPassword.role,
      },
    });
  }
}
