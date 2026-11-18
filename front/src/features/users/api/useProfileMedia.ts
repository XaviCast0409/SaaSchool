import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { resizeImage } from '@/lib/imageResize';
import { usersKeys } from './keys';
import { schoolKeys } from '@/features/schools/api/keys';

const postImage = async <T>(url: string, file: File): Promise<T> => {
  const form = new FormData();
  form.append('file', file);
  return (await api.post<{ data: T }>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
};

/** Al cambiar el logo se refresca el colegio activo (barra lateral, ajustes, documentos). */
const useRefreshSchoolLogo = () => {
  const qc = useQueryClient();
  return (logoUrl: string | null) => {
    qc.invalidateQueries({ queryKey: schoolKeys.all });
    // En modo soporte la barra lateral usa la copia guardada del colegio. No se usa
    // setImpersonatedSchool porque limpia toda la caché: aquí solo cambia el logo.
    useAuthStore.getState().patchImpersonatedSchool({ logoUrl });
  };
};

export const useUploadSchoolLogo = () => {
  const refresh = useRefreshSchoolLogo();
  return useMutation({
    mutationFn: async (file: File) =>
      postImage<{ logoUrl: string }>('/media/school-logo', await resizeImage(file, { maxSize: 512 })),
    onSuccess: (d) => refresh(d.logoUrl),
  });
};

export const useRemoveSchoolLogo = () => {
  const refresh = useRefreshSchoolLogo();
  return useMutation({
    mutationFn: async () => (await api.delete<{ data: { logoUrl: null } }>('/media/school-logo')).data.data,
    onSuccess: () => refresh(null),
  });
};

/** Foto de perfil: propia (sin userId) o de alguien del personal (Dirección). */
export const useUploadAvatar = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      postImage<{ avatarUrl: string }>(
        userId ? `/media/users/${userId}/avatar` : '/media/me/avatar',
        await resizeImage(file, { maxSize: 400, square: true }),
      ),
    onSuccess: (d) => afterAvatarChange(qc, userId, d.avatarUrl),
  });
};

export const useRemoveAvatar = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.delete<{ data: { avatarUrl: null } }>(userId ? `/media/users/${userId}/avatar` : '/media/me/avatar'))
        .data.data,
    onSuccess: () => afterAvatarChange(qc, userId, null),
  });
};

function afterAvatarChange(
  qc: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
  avatarUrl: string | null,
) {
  const me = useAuthStore.getState().user;
  if (!userId || userId === me?.id) useAuthStore.getState().updateUser({ avatarUrl });
  qc.invalidateQueries({ queryKey: usersKeys.all });
}
