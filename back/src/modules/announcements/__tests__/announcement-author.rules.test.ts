import { describe, it, expect } from 'vitest';
import { assertTeacherAnnouncementAllowed } from '../announcement-author.rules';
import { AppError } from '../../../core/errors/app-error';

describe('A1: Comunicados de docentes limitados a sus aulas (announcement-author.rules)', () => {
  const teacherClassrooms = ['c-1', 'c-2'];

  it('Docente sin classroomId recibe 403', () => {
    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, undefined, ['PARENT']),
    ).toThrow(new AppError('Solo puedes publicar comunicados para tus aulas.', 403));
  });

  it('Docente con aula ajena recibe 403', () => {
    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, 'c-ajena', ['PARENT']),
    ).toThrow(new AppError('Solo puedes publicar comunicados para tus aulas.', 403));
  });

  it('Docente que incluye roles administrativos o directivos recibe 403', () => {
    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, 'c-1', ['PARENT', 'ADMINISTRATIVE']),
    ).toThrow(new AppError('Solo puedes publicar comunicados para tus aulas.', 403));

    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, 'c-1', ['SCHOOL_ADMIN']),
    ).toThrow(new AppError('Solo puedes publicar comunicados para tus aulas.', 403));
  });

  it('Docente con su aula y destinatarios válidos pasa correctamente', () => {
    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, 'c-1', ['PARENT']),
    ).not.toThrow();

    expect(() =>
      assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms, 'c-2', ['PARENT', 'TEACHER']),
    ).not.toThrow();
  });

  it('Director o administrador no está sujeto a estas restricciones de aula', () => {
    expect(() =>
      assertTeacherAnnouncementAllowed('SCHOOL_ADMIN', [], undefined, ['PARENT', 'TEACHER', 'ADMINISTRATIVE']),
    ).not.toThrow();
  });
});

