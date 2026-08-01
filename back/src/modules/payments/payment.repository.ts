import { prisma } from '../../config/prisma';
import type { PaymentObligation, PaymentTransaction } from '@prisma/client';
import type { CreateObligationDto, CreateTransactionDto } from './payment.schema';

export class PaymentRepository {
  async findAllObligationsBySchool(schoolId: string): Promise<PaymentObligation[]> {
    return prisma.paymentObligation.findMany({
      where: { schoolId },
      include: { transactions: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findObligationById(
    obligationId: string,
    schoolId: string,
  ): Promise<PaymentObligation | null> {
    return prisma.paymentObligation.findFirst({
      where: { id: obligationId, schoolId },
      include: { transactions: true },
    });
  }

  async createObligation(
    schoolId: string,
    data: CreateObligationDto,
  ): Promise<PaymentObligation> {
    return prisma.paymentObligation.create({
      data: {
        ...data,
        schoolId,
        dueDate: new Date(data.dueDate),
      },
    });
  }

  async createTransaction(
    schoolId: string,
    data: CreateTransactionDto,
  ): Promise<PaymentTransaction> {
    return prisma.paymentTransaction.create({
      data: { ...data, schoolId },
    });
  }

  async updateObligationStatus(
    obligationId: string,
    schoolId: string,
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED',
  ): Promise<PaymentObligation> {
    return prisma.paymentObligation.update({
      where: { id: obligationId, schoolId },
      data: { status },
    });
  }
}
