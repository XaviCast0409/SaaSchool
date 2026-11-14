import React, { useRef } from 'react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Copy, ExternalLink, ImagePlus, Loader2, LogIn, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadVoucher } from '@/features/payment-reports/api/usePaymentReports';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';

export interface LoginPageFields {
  loginBackgroundUrl: string;
  loginTitle: string;
  loginMessage: string;
}

interface Props {
  slug?: string | null;
  schoolName: string;
  brandColor?: string | null;
  values: LoginPageFields;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
}

const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;

/** Ajustes de la página de ingreso del colegio: fondo, título, mensaje y enlace para compartir. */
export const LoginPageSettingsSection: React.FC<Props> = ({ slug, schoolName, brandColor, values, register, setValue }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadVoucher();
  const { data: preview } = useResolvedFileUrl(values.loginBackgroundUrl || null);
  const link = slug ? `${window.location.origin}/c/${slug}` : null;
  const brand = brandColor || '#4F46E5';

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast.error('Usa una foto JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      toast.error('La imagen supera 5 MB. Usa una versión más liviana (se recomienda 1920 × 1080).');
      return;
    }
    upload.mutate(
      { file, purpose: 'SCHOOL_ASSET' },
      {
        onSuccess: (r) => setValue('loginBackgroundUrl', r.url, { shouldDirty: true }),
        onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo subir la imagen.'),
      },
    );
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciona el enlace y cópialo manualmente.');
    }
  };

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
        <LogIn className="w-4 h-4 text-primary" aria-hidden />
        Página de ingreso del colegio
      </div>

      {link ? (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Comparte este enlace con tu comunidad. El código del colegio es <strong className="text-foreground">{slug}</strong>.
          </p>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 truncate rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground">{link}</code>
            <button type="button" onClick={copyLink} aria-label="Copiar enlace" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a href={link} target="_blank" rel="noreferrer" aria-label="Abrir página de ingreso" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Tu colegio aún no tiene código de ingreso. Solicítalo a soporte.</p>
      )}

      {/* Vista previa del fondo */}
      <div className="relative h-32 overflow-hidden rounded-xl border border-border">
        {preview ? (
          <img src={preview} alt="Fondo de la página de ingreso" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brand}, #0f172a)` }} aria-hidden />
        )}
        <div className="absolute inset-0 bg-black/40" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-3 text-white">
          <p className="text-sm font-bold leading-tight line-clamp-1">{values.loginTitle?.trim() || `Bienvenidos a ${schoolName}`}</p>
          {values.loginMessage?.trim() && <p className="text-[11px] text-white/85 line-clamp-2">{values.loginMessage}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
        >
          {upload.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" aria-hidden />}
          {values.loginBackgroundUrl ? 'Cambiar imagen de fondo' : 'Subir imagen de fondo'}
        </button>
        {values.loginBackgroundUrl && (
          <button
            type="button"
            onClick={() => setValue('loginBackgroundUrl', '', { shouldDirty: true })}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden /> Quitar
          </button>
        )}
        <span className="text-[11px] text-muted-foreground">JPG, PNG o WEBP · máx. 5 MB · horizontal</span>
      </div>

      <div>
        <label htmlFor="school-login-title" className="block text-xs font-medium text-muted-foreground mb-1">Título de bienvenida</label>
        <input
          id="school-login-title"
          type="text"
          maxLength={80}
          placeholder={`Bienvenidos a ${schoolName}`}
          {...register('loginTitle')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="school-login-message" className="block text-xs font-medium text-muted-foreground mb-1">Mensaje o aviso</label>
        <textarea
          id="school-login-message"
          rows={3}
          maxLength={500}
          placeholder="Ej.: Matrículas 2027 abiertas. Visítanos de lunes a viernes de 8:00 a 14:00."
          {...register('loginMessage')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Lo ve cualquier persona que abra la página de ingreso: no incluyas datos privados.</p>
      </div>
    </div>
  );
};
