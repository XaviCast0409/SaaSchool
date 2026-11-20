import { getApiErrorMessage } from '@/lib/errors';
import React, { useRef } from 'react';
import { ImagePlus, Loader2, School as SchoolIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRemoveSchoolLogo, useUploadSchoolLogo } from '@/features/users/api/useProfileMedia';
import { ACCEPTED_IMAGE_TYPES, isAcceptedImage } from '@/lib/imageResize';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Logo del colegio: se sube como imagen y aparece en el panel, las libretas y las páginas públicas. */
export const SchoolLogoUploader: React.FC<{ logoUrl?: string | null; schoolName: string }> = ({
  logoUrl,
  schoolName,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadSchoolLogo();
  const remove = useRemoveSchoolLogo();
  const busy = upload.isPending || remove.isPending;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error('Usa una imagen JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('La imagen es demasiado pesada. Usa una de menos de 15 MB.');
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success('Logo actualizado. Ya se ve en toda la plataforma.'),
      onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo subir el logo.')),
    });
  };

  const onRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Logo quitado.'),
      onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo quitar el logo.')),
    });

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col items-center gap-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase">Logo institucional</span>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={logoUrl ? 'Cambiar logo del colegio' : 'Subir logo del colegio'}
        className="group relative w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
      >
        {logoUrl ? (
          <img src={logoUrl} alt={`Logo de ${schoolName}`} className="w-full h-full object-contain p-1.5" />
        ) : (
          <SchoolIcon className="w-10 h-10 text-muted-foreground/40" aria-hidden />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <ImagePlus className="w-6 h-6" aria-hidden />
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
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

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
        >
          {upload.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" aria-hidden />
          )}
          {logoUrl ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden /> Quitar
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG o WEBP (mejor PNG con fondo transparente). Se guarda al instante y aparece en el menú, las libretas,
        los reportes impresos y la página de ingreso del colegio.
      </p>
    </div>
  );
};
