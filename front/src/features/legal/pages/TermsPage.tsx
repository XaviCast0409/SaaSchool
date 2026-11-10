import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio de sesión</span>
          </Link>

          <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/30">
            Versión 2026-11-01
          </Badge>
        </div>

        <Card className="p-6 sm:p-10 border-border bg-card shadow-sm space-y-6">
          <div className="border-b border-border pb-6 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Términos y Condiciones de Uso
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Reglas de acceso y utilización de la plataforma SaaS de gestión escolar SaaSchool.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-foreground/90 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                1. Objeto del servicio
              </h2>
              <p>
                SaaSchool es una plataforma de software como servicio (SaaS) destinada a la gestión administrativa, académica, de asistencia y de cobranzas para instituciones educativas. El acceso y uso de la plataforma se rige por estos Términos y Condiciones.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                2. Cuentas y responsabilidad por las credenciales
              </h2>
              <p>
                Cada usuario es personal e intransferiblemente responsable de la custodia y confidencialidad de sus credenciales de acceso (nombre de usuario, correo y contraseña). Toda acción realizada desde una cuenta autenticada se presumirá efectuada por su titular. En caso de sospecha de acceso no autorizado, el usuario debe notificar inmediatamente a la administración del colegio.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                3. Uso permitido y prohibido
              </h2>
              <p>
                El usuario se compromete a hacer uso de la plataforma exclusivamente con fines académicos e institucionales lícitos. Queda estrictamente prohibido:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Intentar vulnerar, eludir o probar mecanismos de seguridad, autenticación o aislamiento multi-tenant.</li>
                <li>Introducir virus, malware, scripts maliciosos o realizar ataques de denegación de servicio (DoS).</li>
                <li>Compartir o difundir contraseñas o datos personales de terceros sin la debida autorización.</li>
                <li>Subir contenido ilícito, agraviante, ofensivo o contrario a la dignidad de los menores de edad.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                4. Contenido subido por los usuarios
              </h2>
              <p>
                Los docentes, directivos, padres y alumnos son responsables del contenido, tareas, documentos y comentarios que carguen a la plataforma. La institución educativa y SaaSchool se reservan el derecho de suspender o retirar material que contravenga las normas de convivencia o la legislación peruana.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                5. Disponibilidad del servicio
              </h2>
              <p>
                Realizamos los mejores esfuerzos técnicos para garantizar una operatividad continua del 99.5%. No obstante, el servicio puede experimentar interrupciones programadas por mantenimiento o imprevistas debidas a causas de fuerza mayor o fallos en proveedores de infraestructura de red global.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                6. Recibos internos de pago
              </h2>
              <p className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium">
                Los comprobantes o recibos emitidos dentro del módulo de tesorería corresponden a recibos de control interno del colegio y <strong>no son comprobantes de pago electrónicos</strong> con validez tributaria ante la SUNAT (salvo que la institución educativa emita boletas o facturas a través de un Operador de Servicios Electrónicos autorizado de manera independiente).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                7. Limitación de responsabilidad
              </h2>
              <p>
                SaaSchool no será responsable por daños indirectos, pérdida de datos ocasionada por negligencia del usuario en la custodia de sus claves, ni por la exactitud de la información pedagógica o calificaciones ingresadas por los docentes o la Dirección del colegio.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                8. Ley aplicable y jurisdicción
              </h2>
              <p>
                Estos términos se rigen e interpretan conforme a las leyes de la República del Perú. Para la resolución de cualquier controversia, las partes se someten a la competencia de los jueces y tribunales del distrito judicial correspondiente a la sede del colegio o de la ciudad de Lima.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                9. Canales de contacto
              </h2>
              <p>
                Para cualquier consulta, reporte de anomalías técnicas o comunicación oficial, sírvase contactar a: [COMPLETAR: razón social, correo de soporte y teléfono de atención].
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};
