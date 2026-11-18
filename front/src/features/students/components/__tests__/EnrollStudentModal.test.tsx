import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { EnrollStudentModal } from '../EnrollStudentModal';

const { mutateAsync, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/features/academic-years/api/useAcademicYears', () => ({
  useAcademicYears: () => ({ data: [] }),
}));

vi.mock('@/features/users/api/useUsers', () => ({
  useUsers: () => ({ data: [] }),
}));

vi.mock('@/features/students/api/useStudents', () => ({
  useRegisterFichaMatricula: () => ({ mutateAsync, isPending: false }),
  useStudents: () => ({ data: undefined }),
}));

vi.mock('../../api/useStudents', () => ({
  useRegisterFichaMatricula: () => ({ mutateAsync, isPending: false }),
  useStudents: () => ({ data: undefined }),
}));

vi.mock('@/features/classrooms/api/useClassrooms', () => ({
  useClassroomsForYear: () => ({ data: [] }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

describe('EnrollStudentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra la ficha cuando está abierta', () => {
    renderWithProviders(<EnrollStudentModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Ficha Única de Matrícula SIAGIE (MINEDU)')).toBeTruthy();
  });

  it('no renderiza nada cerrada', () => {
    renderWithProviders(<EnrollStudentModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Ficha Única de Matrícula SIAGIE (MINEDU)')).toBeNull();
  });

  it('bloquea el paso 1 vacío', async () => {
    renderWithProviders(<EnrollStudentModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Siguiente: Matrícula Escolar'));

    expect(await screen.findByText('Apellido paterno requerido')).toBeTruthy();
    expect(screen.getByText('Nombres requeridos (mínimo 2 letras)')).toBeTruthy();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Corrige los datos obligatorios de la ficha del alumno.');
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
