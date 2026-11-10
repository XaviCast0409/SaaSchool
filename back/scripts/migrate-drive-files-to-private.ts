import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { googleDriveService } from '../src/modules/uploads/google-drive.service';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const extractDriveId = (url: string): string | null =>
  url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ?? null;

async function migrateOne(params: {
  url: string;
  schoolId: string;
  uploadedById: string;
  uploaderRole: string;
  purpose: string;
  fallbackName: string | null;
  update: (newUrl: string) => Promise<unknown>;
}): Promise<'migrated' | 'skipped'> {
  const driveId = extractDriveId(params.url);
  if (!driveId) return 'skipped';
  const meta = await googleDriveService.getFileMetadata(driveId);
  if (!meta || !meta.ownedByMe) return 'skipped'; // enlace externo pegado por un docente: se deja igual
  if (DRY_RUN) return 'migrated';

  await googleDriveService.revokePublicAccess(driveId);
  const stored = await prisma.storedFile.upsert({
    where: { driveFileId: driveId },
    update: {},
    create: {
      schoolId: params.schoolId,
      uploadedById: params.uploadedById,
      uploaderRole: params.uploaderRole,
      purpose: params.purpose,
      storage: 'GOOGLE_DRIVE',
      driveFileId: driveId,
      fileName: params.fallbackName || meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
    },
  });
  await params.update(`/api/files/${stored.id}`);
  return 'migrated';
}

async function main(): Promise<void> {
  if (!googleDriveService.isConfigured()) throw new Error('Google Drive no está configurado.');
  let migrated = 0;
  let skipped = 0;

  const contents = await prisma.courseContent.findMany({
    where: { fileUrl: { contains: 'drive.google.com' } },
    select: { id: true, schoolId: true, teacherId: true, fileUrl: true, fileName: true },
  });
  for (const c of contents) {
    const r = await migrateOne({
      url: c.fileUrl!, schoolId: c.schoolId, uploadedById: c.teacherId, uploaderRole: 'TEACHER',
      purpose: 'COURSE_MATERIAL', fallbackName: c.fileName,
      update: (newUrl) => prisma.courseContent.update({ where: { id: c.id }, data: { fileUrl: newUrl } }),
    });
    r === 'migrated' ? migrated++ : skipped++;
  }

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { fileUrl: { contains: 'drive.google.com' } },
    select: { id: true, schoolId: true, fileUrl: true, fileName: true, enrollment: { select: { studentId: true } } },
  });
  for (const s of submissions) {
    const r = await migrateOne({
      url: s.fileUrl, schoolId: s.schoolId, uploadedById: s.enrollment.studentId, uploaderRole: 'STUDENT',
      purpose: 'HOMEWORK_SUBMISSION', fallbackName: s.fileName,
      update: (newUrl) => prisma.homeworkSubmission.update({ where: { id: s.id }, data: { fileUrl: newUrl } }),
    });
    r === 'migrated' ? migrated++ : skipped++;
  }

  console.log(`${DRY_RUN ? '[SIMULACIÓN] ' : ''}Migrados: ${migrated} | Omitidos: ${skipped}`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => void prisma.$disconnect());
