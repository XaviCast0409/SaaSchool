import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { isAdmin, loadAssignmentForUser, type AcademicUser } from './academic.context';
import { CNEB_COMPETENCES } from './cneb.catalog';
import { CONCLUSION_MAX_LENGTH, CONCLUSION_MIN_LENGTH, sanitizeConclusion } from './grade-engine';
import { factoryPhrases, isFactoryPhraseKey, type PhraseLetter } from './phrase-bank.catalog';
import { getPreuniversityCourse } from './preuniversity.catalog';

export type PhraseSource = 'FACTORY' | 'SCHOOL' | 'MINE';

export interface PhraseDto {
  id: string;
  source: PhraseSource;
  cnebNumber: number;
  letter: PhraseLetter | null;
  courseKey: string | null;
  level: EducationLevel | null;
  text: string;
  hidden?: boolean;
}

const LETTERS = new Set(['AD', 'A', 'B', 'C']);

function cleanText(text: string): string {
  const t = sanitizeConclusion(text);
  if (t.length < CONCLUSION_MIN_LENGTH) throw new AppError(`La frase debe tener al menos ${CONCLUSION_MIN_LENGTH} caracteres.`, 400);
  if (text.trim().length > CONCLUSION_MAX_LENGTH) throw new AppError(`La frase no puede pasar de ${CONCLUSION_MAX_LENGTH} caracteres.`, 400);
  return t;
}

export class PhraseService {
  /** Frases disponibles para el registro de un curso: de fábrica (no ocultas), del colegio y propias. */
  async listForAssignment(schoolId: string, user: AcademicUser, assignmentId: string) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId);
    const level = a.classroom.educationLevel as EducationLevel;
    const courseKey = a.area.catalogKey ?? null;
    const numbers = [...new Set(a.area.competences.map((c) => c.cnebNumber).filter((n): n is number => n !== null))];
    const [hidden, custom] = await Promise.all([
      prisma.hiddenConclusionPhrase.findMany({ where: { schoolId }, select: { phraseKey: true } }),
      prisma.conclusionPhrase.findMany({
        where: {
          schoolId,
          cnebNumber: { in: numbers },
          OR: [{ ownerId: null }, { ownerId: user.userId }],
          AND: [
            { OR: [{ educationLevel: null }, { educationLevel: level }] },
            { OR: [{ courseKey: null }, ...(courseKey ? [{ courseKey }] : [])] },
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const hiddenKeys = new Set(hidden.map((h) => h.phraseKey));
    const phrases: PhraseDto[] = [];
    for (const p of custom) {
      phrases.push({
        id: p.id, source: p.ownerId ? 'MINE' : 'SCHOOL', cnebNumber: p.cnebNumber,
        letter: LETTERS.has(p.letter ?? '') ? (p.letter as PhraseLetter) : null,
        courseKey: p.courseKey, level: p.educationLevel, text: p.text,
      });
    }
    for (const n of numbers) {
      for (const f of factoryPhrases({ cnebNumber: n, level, courseKey })) {
        if (hiddenKeys.has(f.key)) continue;
        phrases.push({ id: f.key, source: 'FACTORY', cnebNumber: n, letter: f.letter, courseKey: f.courseKey, level: null, text: f.text });
      }
    }
    return { level, courseKey, phrases };
  }

  /** Vista de administración del banco para una competencia (incluye las ocultas, marcadas). */
  async listForManage(schoolId: string, user: AcademicUser, level: EducationLevel, cnebNumber: number, courseKey?: string | null) {
    if (!CNEB_COMPETENCES[cnebNumber]) throw new AppError('Competencia no válida.', 400);
    if (courseKey && !getPreuniversityCourse(courseKey)) throw new AppError('Curso del catálogo no reconocido.', 400);
    const [hidden, custom] = await Promise.all([
      prisma.hiddenConclusionPhrase.findMany({ where: { schoolId }, select: { phraseKey: true } }),
      prisma.conclusionPhrase.findMany({
        where: {
          schoolId, cnebNumber,
          OR: [{ ownerId: null }, { ownerId: user.userId }],
          AND: [
            { OR: [{ educationLevel: null }, { educationLevel: level }] },
            { OR: [{ courseKey: null }, ...(courseKey ? [{ courseKey }] : [])] },
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const hiddenKeys = new Set(hidden.map((h) => h.phraseKey));
    const phrases: PhraseDto[] = custom.map((p) => ({
      id: p.id, source: p.ownerId ? 'MINE' : 'SCHOOL', cnebNumber: p.cnebNumber,
      letter: LETTERS.has(p.letter ?? '') ? (p.letter as PhraseLetter) : null, courseKey: p.courseKey, level: p.educationLevel, text: p.text,
    }));
    for (const f of factoryPhrases({ cnebNumber, level, courseKey })) {
      phrases.push({ id: f.key, source: 'FACTORY', cnebNumber, letter: f.letter, courseKey: f.courseKey, level: null, text: f.text, hidden: hiddenKeys.has(f.key) });
    }
    return { level, cnebNumber, courseKey: courseKey ?? null, phrases };
  }

  async create(schoolId: string, user: AcademicUser, body: {
    scope: 'MINE' | 'SCHOOL'; cnebNumber: number; letter?: PhraseLetter | null; level?: EducationLevel | null; courseKey?: string | null; text: string;
  }) {
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'].includes(user.role)) throw new AppError('No tienes permiso para crear frases.', 403);
    if (body.scope === 'SCHOOL' && !isAdmin(user)) throw new AppError('Solo la dirección puede crear frases para todo el colegio.', 403);
    if (!CNEB_COMPETENCES[body.cnebNumber]) throw new AppError('Competencia no válida.', 400);
    if (body.courseKey && !getPreuniversityCourse(body.courseKey)) throw new AppError('Curso del catálogo no reconocido.', 400);
    const text = cleanText(body.text);
    const count = await prisma.conclusionPhrase.count({ where: { schoolId, ownerId: body.scope === 'MINE' ? user.userId : null } });
    if (count >= 2000) throw new AppError('Llegaste al máximo de frases guardadas. Borra algunas antes de agregar más.', 409);
    const p = await prisma.conclusionPhrase.create({
      data: {
        schoolId,
        ownerId: body.scope === 'MINE' ? user.userId : null,
        cnebNumber: body.cnebNumber,
        letter: body.letter ?? null,
        educationLevel: body.level ?? null,
        courseKey: body.courseKey ?? null,
        text,
      },
    });
    return { id: p.id, source: body.scope, cnebNumber: p.cnebNumber, letter: p.letter, courseKey: p.courseKey, level: p.educationLevel, text: p.text };
  }

  private async loadEditable(schoolId: string, user: AcademicUser, id: string) {
    const p = await prisma.conclusionPhrase.findFirst({ where: { id, schoolId } });
    if (!p) throw new AppError('Frase no encontrada.', 404);
    if (p.ownerId ? p.ownerId !== user.userId : !isAdmin(user)) throw new AppError('No puedes modificar esta frase.', 403);
    return p;
  }

  async update(schoolId: string, user: AcademicUser, id: string, body: { text?: string; letter?: PhraseLetter | null }) {
    const p = await this.loadEditable(schoolId, user, id);
    return prisma.conclusionPhrase.update({
      where: { id: p.id },
      data: {
        ...(body.text !== undefined ? { text: cleanText(body.text) } : {}),
        ...(body.letter !== undefined ? { letter: body.letter } : {}),
      },
    });
  }

  async remove(schoolId: string, user: AcademicUser, id: string) {
    const p = await this.loadEditable(schoolId, user, id);
    await prisma.conclusionPhrase.delete({ where: { id: p.id } });
    return { deleted: true };
  }

  async setHidden(schoolId: string, phraseKey: string, hidden: boolean) {
    if (!isFactoryPhraseKey(phraseKey)) throw new AppError('Solo se pueden ocultar frases de fábrica.', 400);
    if (hidden) {
      await prisma.hiddenConclusionPhrase.upsert({
        where: { schoolId_phraseKey: { schoolId, phraseKey } },
        update: {},
        create: { schoolId, phraseKey },
      });
    } else {
      await prisma.hiddenConclusionPhrase.deleteMany({ where: { schoolId, phraseKey } });
    }
    return { phraseKey, hidden };
  }
}
