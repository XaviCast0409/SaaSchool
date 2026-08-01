import { AppError } from '../../core/errors/app-error';
import type { PaymentRepository } from './payment.repository';
import type { CreateObligationDto, CreateTransactionDto } from './payment.schema';
import type { PaymentObligation, PaymentTransaction } from '@prisma/client';

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getAllObligations(schoolId: string): Promise<PaymentObligation[]> {
    return this.paymentRepository.findAllObligationsBySchool(schoolId);
  }

  async getObligationById(obligationId: string, schoolId: string): Promise<PaymentObligation> {
    const obligation = await this.paymentRepository.findObligationById(obligationId, schoolId);

    if (!obligation) {
      throw new AppError(`Obligación de pago con id ${obligationId} no encontrada`, 404);
    }

    return obligation;
  }

  async createObligation(
    schoolId: string,
    createObligationDto: CreateObligationDto,
  ): Promise<PaymentObligation> {
    return this.paymentRepository.createObligation(schoolId, createObligationDto);
  }

  async registerTransaction(
    schoolId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<PaymentTransaction> {
    const obligation = await this.getObligationById(
      createTransactionDto.obligationId,
      schoolId,
    );

    if (obligation.status === 'PAID' || obligation.status === 'CANCELLED') {
      throw new AppError(
        `No se puede registrar un pago en una obligación con estado ${obligation.status}`,
        400,
      );
    }

    const transaction = await this.paymentRepository.createTransaction(
      schoolId,
      createTransactionDto,
    );

    // Calcular el total pagado para actualizar el estado de la obligación
    const totalPaid = (obligation as PaymentObligation & { transactions: PaymentTransaction[] })
      .transactions
      .reduce((sum, tx) => sum + tx.amountPaid, 0) + createTransactionDto.amountPaid;

    const newStatus =
      totalPaid >= obligation.amountDue
        ? 'PAID'
        : totalPaid > 0
        ? 'PARTIAL'
        : 'PENDING';

    await this.paymentRepository.updateObligationStatus(
      obligation.id,
      schoolId,
      newStatus,
    );

    return transaction;
  }
}
