import React, { useRef } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ACCEPTED_IMAGE_TYPES, isAcceptedImage } from '@/lib/imageResize';
import { useRemoveAvatar, useUploadAvatar } from '../api/useProfileMedia';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

interface Props {
  name: string;
  avatarUrl?: string | null;
  /** Sin userId se cambia la foto propia; con userId, la de esa persona del personal (Dirección). */
  userId?: string;
  onChange?: (avatarUrl: string | null) => void;
}

/** Foto de perfil con botones para subir, cambiar o quitar. La foto se recorta en cuadrado al subir. */
export const AvatarUploader: React.FC<Props> = ({ name, avatarUrl, userId, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar(userId);
  const remove = useRemoveAvatar(userId);
  const busy = upload.isPending || remove.isPending;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error('Usa una foto JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('La foto es demasiado pesada. Usa una de menos de 15 MB.');
      return;
    }
    upload.mutate(file, {
      onSuccess: (d) => {
        toast.success('Foto de perfil actualizada.');
        onChange?.(d.avatarUrl);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo subir la foto.'),
    });
  };

  const onRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Foto de perfil quitada.');
        onChange?.(null);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo quitar la foto.'),
    });

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={avatarUrl ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
        className="group relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70"
      >
        <UserAvatar name={name} src={avatarUrl} size="xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6" aria-hidden />
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
            {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Quitar
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground max-w-[16rem]">
          JPG, PNG o WEBP. Se recorta en cuadrado. La ven las familias, los alumnos y el personal del colegio.
        </p>
      </div>
    </div>
  );
};
