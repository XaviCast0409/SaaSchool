import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RegisterTransactionModal } from '../RegisterTransactionModal';
import type { PaymentObligation } from '@/features/payments/types';

const { register, toastError, cash, openCash } = vi.hoisted(() => {
  const openCashData = {
    data: {
      session: {
        id: 'cs-1',
        cashierId: 'u-1',
        status: 'OPEN' as const,
        openedAt: '2026-03-01T08:00:00Z',
        openingAmount: 100,
        reopenCount: 0,
        cashier: { id: 'u-1', firstName: 'Admin', lastNamePaternal: 'User' },
        totals: {
          byMethod: { CASH: 0, YAPE: 0, PLIN: 0, BANK_TRANSFER: 0, DEPOSIT: 0, CREDIT_CARD: 0 },
          countByMethod: { CASH: 0, YAPE: 0, PLIN: 0, BANK_TRANSFER: 0, DEPOSIT: 0, CREDIT_CARD: 0 },
          totalCollected: 0,
          paymentsCount: 0,
          voidedCount: 0,
          expensesTotal: 0,
          expensesCount: 0,
          openingAmount: 100,
          expectedCash: 100,
        },
      },
      lastSession: null,
    },
  };
  return {
    register: vi.fn().mockResolvedValue({}),
    toastError: vi.fn(),
    cash: { state: openCashData as any },
    openCash: openCashData,
  };
});

vi.mock('@/features/payments/api/usePayments', () => ({
  useRegisterTransaction: () => ({
    mutate: register,
    mutateAsync: register,
    isPending: false,
  }),
}));

vi.mock('@/features/payments/api/useCash', () => ({
  useCurrentCash: () => cash.state,
}));

vi.mock('@/features/payments/components/ReceiptModal', () => ({
  ReceiptModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

const OBLIGATION_ID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

const mockObligation: PaymentObligation = {
  id: OBLIGATION_ID,
  schoolId: 'school-1',
  enrollmentId: 'enrollment-1',
  title: 'Pensión Marzo 2026',
  concept: 'PENSION',
  amountDue: 350,
  dueDate: '2026-03-31',
  status: 'PENDING',
  notes: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  transactions: [],
  enrollment: {
    id: 'enrollment-1',
    classroomId: 'classroom-1',
    student: {
      id: 'student-1',
      firstNames: 'Carlos',
      lastNamePaternal: 'García',
      lastNameMaternal: 'López',
      documentId: '72819203',
    },
  },
};

describe('RegisterTransactionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cash.state = openCash;
  });

  afterEach(() => {
    cleanup();
  });

  it('pide n° de operación para Yape', () => {
    renderWithProviders(<RegisterTransactionModal obligation={mockObligation} onClose={vi.fn()} />);

    const methodSelect = screen.getByLabelText(/Método de Pago/i);
    fireEvent.change(methodSelect, { target: { value: 'YAPE' } });

    expect(screen.getByText(/N° de operación \(Yape\)/i)).toBeTruthy();
  });

  it('efectivo sin caja abierta no cobra', () => {
    cash.state = { data: null };
    renderWithProviders(<RegisterTransactionModal obligation={mockObligation} onClose={vi.fn()} />);

    expect(screen.getByText(/primero abre tu caja del día/i)).toBeTruthy();

    const confirmButton = screen.getByText('Confirmar y Registrar Pago');
    fireEvent.click(confirmButton);

    expect(register).not.toHaveBeenCalled();
  });

  it('registra un pago con Yape', async () => {
    renderWithProviders(<RegisterTransactionModal obligation={mockObligation} onClose={vi.fn()} />);

    const amountInput = screen.getByLabelText(/Monto a Cobrar \(S\/\)/i);
    fireEvent.change(amountInput, { target: { value: '350' } });

    const methodSelect = screen.getByLabelText(/Método de Pago/i);
    fireEvent.change(methodSelect, { target: { value: 'YAPE' } });

    const operationInput = screen.getByLabelText(/N° de operación/i);
    fireEvent.change(operationInput, { target: { value: '09812345' } });

    const confirmButton = screen.getByText('Confirmar y Registrar Pago');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({
          obligationId: OBLIGATION_ID,
          amountPaid: 350,
          paymentMethod: 'YAPE',
          operationNumber: '09812345',
        }),
        expect.anything(),
      );
    });

    expect(typeof register.mock.calls[0][0].amountPaid).toBe('number');
  });
});
