import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/env', () => ({ env: { MAIL_DAILY_LIMIT: 100, PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL: 5 } }));
vi.mock('../../../utils/notification.util', () => ({ sendEmail: vi.fn(async () => true) }));
vi.mock('../../../config/prisma', () => ({
  prisma: {
    emailOutbox: {
      count: vi.fn(),
      create: vi.fn(async () => ({})),
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../../config/prisma';
import { enqueueEmail } from '../email-queue';

const count = prisma.emailOutbox.count as unknown as ReturnType<typeof vi.fn>;
const create = prisma.emailOutbox.create as unknown as ReturnType<typeof vi.fn>;
const msg = { to: 'Familia@Correo.pe', subject: 'Hola', text: 'Texto' };

describe('enqueueEmail (cola persistente con topes)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guarda el correo en la BD cuando hay cupo', async () => {
    count.mockResolvedValue(0);
    await expect(enqueueEmail(msg, { schoolId: 's1' })).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ to: 'familia@correo.pe', schoolId: 's1', category: 'GENERAL' }) });
  });

  it('descarta al llegar al tope diario global', async () => {
    count.mockResolvedValue(100);
    await expect(enqueueEmail(msg)).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('descarta formularios públicos al llegar al tope del colegio', async () => {
    // global, por colegio, todos los públicos, por destinatario
    count.mockResolvedValueOnce(10).mockResolvedValueOnce(5).mockResolvedValueOnce(5).mockResolvedValueOnce(0);
    await expect(enqueueEmail(msg, { schoolId: 's1', category: 'PUBLIC_FORM' })).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('descarta formularios públicos repetidos al mismo destinatario', async () => {
    count.mockResolvedValueOnce(10).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    await expect(enqueueEmail(msg, { schoolId: 's1', category: 'PUBLIC_FORM' })).resolves.toBe(false);
  });

  it('sin PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL los formularios públicos solo respetan el tope global', async () => {
    const { env } = await import('../../../config/env');
    const previous = env.PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL;
    (env as { PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL?: number }).PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL = undefined;
    count.mockResolvedValue(10);
    await expect(enqueueEmail(msg, { schoolId: 's1', category: 'PUBLIC_FORM' })).resolves.toBe(true);
    expect(count).toHaveBeenCalledTimes(1);
    (env as { PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL?: number }).PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL = previous;
  });

  it('nunca lanza si la BD falla', async () => {
    count.mockRejectedValue(new Error('db caída'));
    await expect(enqueueEmail(msg)).resolves.toBe(false);
  });
});
