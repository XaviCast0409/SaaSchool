import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
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
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Política de Privacidad y Protección de Datos Personales
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              En cumplimiento de la Ley N.° 29733 (Ley de Protección de Datos Personales de la República del Perú) y su Reglamento aprobado mediante D.S. N.° 016-2024-JUS.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-foreground/90 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                1. Identidad del encargado del tratamiento
              </h2>
              <p>
                SaaSchool es operado por [COMPLETAR: razón social, RUC, domicilio y correo de contacto] en calidad de <strong>encargado del tratamiento</strong>. La institución educativa en la cual el estudiante se encuentra matriculado actúa como el <strong>responsable del banco de datos personales</strong> de sus alumnos, apoderados y docentes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                2. Datos que tratamos
              </h2>
              <p>
                Para el correcto funcionamiento de los servicios educativos y de gestión escolar, tratamos las siguientes categorías de datos:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Datos de identificación:</strong> nombres completos, apellidos, tipo y número de documento de identidad (DNI, CE, PTP, pasaporte o partida de nacimiento), fecha de nacimiento, sexo y ubigeo.</li>
                <li><strong>Datos de contacto:</strong> domicilio, número telefónico, correo electrónico de apoderados y usuarios.</li>
                <li><strong>Datos académicos:</strong> calificaciones, conclusiones descriptivas, asistencias, tardanzas, cursos matriculados y observaciones de conducta.</li>
                <li><strong>Datos económicos:</strong> cronogramas de pago de pensiones, conceptos de cobro, montos y registros de transacciones.</li>
                <li><strong>Datos sensibles:</strong> condición de discapacidad y observaciones médicas o de tópico escolar indispensables para la debida atención del estudiante.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                3. Finalidades del tratamiento
              </h2>
              <p>
                Los datos personales recolectados son tratados exclusivamente con las siguientes finalidades institucionales y educativas:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Gestión de la matrícula escolar y generación de la Ficha Única de Matrícula (FUM).</li>
                <li>Evaluación del aprendizaje y emisión de reportes e informes oficiales ante el Ministerio de Educación del Perú (SIAGIE).</li>
                <li>Control y registro de asistencia escolar en tiempo real.</li>
                <li>Comunicación oportuna entre la institución educativa y los padres de familia o apoderados.</li>
                <li>Gestión y recaudación de pensiones escolares y emisión de recibos internos de pago.</li>
                <li>Seguridad, auditoría y control de accesos a la plataforma SaaS.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                4. Base legal
              </h2>
              <p>
                El tratamiento de datos se fundamenta en el consentimiento previo, libre, expreso e informado otorgado por el titular o por sus representantes legales (padres o apoderados), de conformidad con la Ley N.° 29733 y su Reglamento aprobado por D.S. N.° 016-2024-JUS, así como en el cumplimiento de las obligaciones legales derivadas de la prestación del servicio educativo.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                5. Transferencia internacional de datos
              </h2>
              <p>
                Para garantizar la alta disponibilidad, seguridad y respaldo del sistema, la plataforma hace uso de infraestructura en la nube provista por Render Services, Inc. y Google LLC, cuyos servidores se encuentran ubicados en los Estados Unidos de América. Dichos proveedores cumplen con rigurosos estándares internacionales de seguridad de la información.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                6. Plazo de conservación
              </h2>
              <p>
                Los datos se conservarán durante la vigencia de la relación contractual entre el colegio y la plataforma, así como durante los plazos legalmente exigidos por las autoridades educativas y tributarias. Concluido dicho periodo, los datos serán devueltos a la institución educativa o eliminados de forma segura conforme al plazo acordado: [COMPLETAR: plazo].
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                7. Medidas de seguridad implementadas
              </h2>
              <p>
                Implementamos medidas de seguridad técnicas, organizativas y legales para proteger los datos frente a accesos no autorizados o pérdidas accidentales, tales como:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Cifrado de comunicaciones en tránsito mediante protocolo HTTPS / TLS.</li>
                <li>Cifrado de contraseñas mediante algoritmo de derivación robusto (bcrypt).</li>
                <li>Control de acceso granular basado en roles (RBAC).</li>
                <li>Bitácora inmutable de auditoría para registro de cambios críticos.</li>
                <li>Respaldos automáticos periódicos.</li>
                <li>Almacenamiento privado de archivos y firmas HMAC para enlaces temporales.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                8. Ejercicio de Derechos ARCO
              </h2>
              <p>
                El titular o su apoderado legal pueden ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) dirigiendo una solicitud escrita ante la Dirección de su respectiva institución educativa o a través del canal habilitado: [COMPLETAR: correo]. Asimismo, le asiste el derecho de recurrir ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUS) si considera vulnerados sus derechos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                9. Notificación de incidentes de seguridad
              </h2>
              <p>
                En caso de detectarse una brecha o incidente de seguridad que comprometa la confidencialidad de los datos personales, se notificará a la Autoridad Nacional de Protección de Datos Personales y a los titulares afectados dentro de las cuarenta y ocho (48) horas siguientes a la toma de conocimiento del hecho.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                10. Modificaciones a la política
              </h2>
              <p>
                Cualquier modificación sustancial a la presente Política de Privacidad será comunicada a los usuarios mediante la plataforma, requiriéndose una nueva aceptación expresa antes de continuar con el uso del servicio.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};
