import { AppError } from '../../core/errors/app-error';
import type { SchoolRepository } from './school.repository';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';
import type { School } from '@prisma/client';
import { getPlanStatus, effectiveMonthlyFee, type PlanStatus } from './plan.rules';
import { extractStoredFileId } from '../files/file-storage.service';
import { parsePublicMediaUrl } from '../files/public-media.rules';

/** Colegio tal como lo devuelve la API: mensualidad como número y estado de su plan. */
export type SchoolView = Omit<School, 'monthlyFee'> & {
  monthlyFee: number | null;
  effectiveMonthlyFee: number;
  planStatus: PlanStatus;
};

const toView = (school: School): SchoolView => ({
  ...school,
  monthlyFee: school.monthlyFee === null ? null : Number(school.monthlyFee),
  effectiveMonthlyFee: effectiveMonthlyFee(school),
  planStatus: getPlanStatus(school.planExpiresAt),
});

export class SchoolService {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  /** Listado del panel SuperAdmin: incluye actividad reciente y fecha del último pago. */
  async getAllSchools(): Promise<
    (SchoolView & { activity: { lastSeenAt: Date | null; active7d: number; active30d: number }; lastPaymentOn: Date | null })[]
  > {
    const [schools, activity] = await Promise.all([this.schoolRepository.findAll(), this.schoolRepository.activityBySchool()]);
    return schools.map((school) => {
      const a = activity.get(school.id);
      return {
        ...toView(school),
        activity: { lastSeenAt: a?.lastSeenAt ?? null, active7d: a?.active7d ?? 0, active30d: a?.active30d ?? 0 },
        lastPaymentOn: a?.lastPaymentOn ?? null,
      };
    });
  }

  async getSchoolById(schoolId: string): Promise<SchoolView> {
    return toView(await this.findOrFail(schoolId));
  }

  private async findOrFail(schoolId: string): Promise<School> {
    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new AppError(`Colegio con id ${schoolId} no encontrado`, 404);
    }

    return school;
  }

  async createSchool(createSchoolDto: CreateSchoolDto): Promise<SchoolView> {
    const existingSchool = await this.schoolRepository.findByDocumentId(createSchoolDto.documentId);
    if (existingSchool) {
      throw new AppError('Ya existe un colegio registrado con ese RUC.', 409);
    }

    if (createSchoolDto.adminEmail) {
      // Sin clave indicada, el director quedaría con una clave que nadie conoce
      if (!createSchoolDto.adminPassword) {
        throw new AppError('Indica la contraseña inicial del director.', 400);
      }
      // Nombre y apellido reales: aparecen en libretas, constancias y mensajes a las familias
      if (!createSchoolDto.adminFirstName?.trim() || !createSchoolDto.adminLastNamePaternal?.trim()) {
        throw new AppError('Indica el nombre y el apellido paterno del director.', 400);
      }
    }
    return toView(await this.schoolRepository.create(createSchoolDto));
  }

  async updateSchool(schoolId: string, updateSchoolDto: UpdateSchoolDto): Promise<SchoolView> {
    const current = await this.findOrFail(schoolId);
    // Un logo subido a la plataforma solo se cambia con /api/media/school-logo (que valida la imagen)
    if (updateSchoolDto.logoUrl && updateSchoolDto.logoUrl !== current.logoUrl && parsePublicMediaUrl(updateSchoolDto.logoUrl)) {
      throw new AppError('Para cambiar el logo, súbelo desde Ajustes de la Institución.', 400);
    }
    if (updateSchoolDto.loginBackgroundUrl) {
      // El fondo se publica sin sesión: solo se acepta una imagen subida por este mismo colegio
      const fileId = extractStoredFileId(updateSchoolDto.loginBackgroundUrl);
      const file = fileId ? await this.schoolRepository.findSchoolImage(fileId, schoolId) : null;
      if (!file || !/^image\/(png|jpeg|webp)$/.test(file.mimeType)) {
        throw new AppError('La imagen de fondo debe ser una foto JPG, PNG o WEBP subida desde la plataforma.', 400);
      }
    }
    return toView(await this.schoolRepository.update(schoolId, updateSchoolDto));
  }

  async deactivateSchool(schoolId: string): Promise<SchoolView> {
    await this.findOrFail(schoolId);
    return toView(await this.schoolRepository.deactivate(schoolId));
  }

  async reactivateSchool(schoolId: string): Promise<SchoolView> {
    await this.findOrFail(schoolId);
    return toView(await this.schoolRepository.reactivate(schoolId));
  }

  async resetAdminPassword(
    schoolId: string,
    newPassword?: string,
  ): Promise<{ adminEmail: string; newPassword: string; adminName: string }> {
    await this.findOrFail(schoolId);
    return this.schoolRepository.resetAdminPassword(schoolId, newPassword);
  }
}
