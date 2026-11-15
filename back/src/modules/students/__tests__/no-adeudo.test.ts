import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from '../student.service';
import { AppError } from '../../../core/errors/app-error';

describe('A5: Constancia de No Adeudo', () => {
  const mockRepo = {
    findStudentForCertificate: vi.fn(),
    countStudentPendingObligations: vi.fn(),
  };

  const service = new StudentService(mockRepo as any);

  const mockStudent = {
    id: 'student-1',
    firstNames: 'Carlos',
    lastNamePaternal: 'Quispe',
    lastNameMaternal: 'Mamani',
    documentId: '77889900',
    school: {
      name: 'Colegio Demo',
      modularCode: '1234567',
      documentId: '20123456789',
    },
    enrollments: [
      {
        id: 'enr-1',
        academicYear: { year: 2026 },
        classroom: { grade: 3, section: 'A', educationLevel: 'PRIMARY' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite emitir la constancia si solo tiene cuotas futuras (cero cuotas vencidas)', async () => {
    mockRepo.findStudentForCertificate.mockResolvedValue(mockStudent);
    // countStudentPendingObligations filtra por dueDate < hoy, por lo que cuotas futuras dan 0
    mockRepo.countStudentPendingObligations.mockResolvedValue(0);

    const result = await service.getNoDebtCertificate('school-1', 'student-1');
    expect(result).toBeDefined();
    expect(result.student.fullName).toContain('Quispe');
    expect(mockRepo.countStudentPendingObligations).toHaveBeenCalledWith('student-1', 'school-1');
  });

  it('bloquea la emisión con mensaje claro si tiene cuotas vencidas', async () => {
    mockRepo.findStudentForCertificate.mockResolvedValue(mockStudent);
    mockRepo.countStudentPendingObligations.mockResolvedValue(2);

    await expect(service.getNoDebtCertificate('school-1', 'student-1')).rejects.toThrow(
      new AppError(
        'El estudiante presenta 2 cuota(s) vencida(s) sin pagar. Debe regularizar su situación para emitir la Constancia de No Adeudo.',
        400,
      ),
    );
  });
});
