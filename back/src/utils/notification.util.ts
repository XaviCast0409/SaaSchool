import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Utilidad de notificación para envío de recordatorios de pago y comunicados vía Email con Nodemailer.
 * Utiliza las credenciales SMTP configuradas en variables de entorno (USER_EMAIL y PASS_EMAIL).
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface ReminderNotificationParams {
  channel?: 'EMAIL' | string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  studentName: string;
  obligationTitle: string;
  amountDue: number;
  dueDate: string;
}

export interface ReminderNotificationResult {
  success: boolean;
  channel: 'EMAIL';
  recipient: string;
  message: string;
  timestamp: string;
}

let transporterInstance: Transporter | null = null;

export const getMailTransporter = (): Transporter | null => {
  if (transporterInstance) return transporterInstance;

  if (!env.USER_EMAIL || !env.PASS_EMAIL) {
    console.warn('[EMAIL WARNING] USER_EMAIL o PASS_EMAIL no están configurados en el entorno.');
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.USER_EMAIL,
      pass: env.PASS_EMAIL,
    },
  });

  return transporterInstance;
};

/**
 * Función general para envío de correos electrónicos con Nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn(`[EMAIL SIMULATED] No hay transporte SMTP configurado. Simulado a: ${options.to}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"SaaSchool - Notificaciones" <${env.USER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[EMAIL SENT SUCCESS] Correo entregado a ${options.to} (MessageId: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Falló el envío de correo a ${options.to}:`, error);
    return false;
  }
};

/**
 * Envío de recordatorio formal de pago vía Email con plantilla HTML profesional
 */
export const sendReminderNotification = async (
  params: ReminderNotificationParams,
): Promise<ReminderNotificationResult[]> => {
  const results: ReminderNotificationResult[] = [];
  const timestamp = new Date().toISOString();
  const formattedAmount = `S/ ${params.amountDue.toFixed(2)}`;
  const formattedDate = new Date(params.dueDate).toLocaleDateString('es-PE');

  const email = params.recipientEmail || 'Sin correo registrado';
  const emailSubject = `Recordatorio de Pago: ${params.obligationTitle} - SaaSchool`;
  const emailBody = `Estimado(a) ${params.recipientName},\n\nLe recordamos la obligación de pago registrada a nombre de su hijo(a) ${params.studentName}:\n\n- Concepto: ${params.obligationTitle}\n- Monto a Pagar: ${formattedAmount}\n- Fecha de Vencimiento: ${formattedDate}\n\nPor favor realice el pago a través de los medios autorizados.\n\nAtentamente,\nAdministración Escolar`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 22px;">SaaSchool - Recordatorio de Cobranza</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Comunicado oficial para apoderados</p>
      </div>

      <p style="color: #334155; font-size: 15px;">Estimado(a) <strong>${params.recipientName}</strong>,</p>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Le informamos que se encuentra registrada la siguiente obligación de pensión/pago a nombre de su hijo(a) <strong>${params.studentName}</strong>:
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 40%;">Concepto:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${params.obligationTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Monto Pendiente:</td>
            <td style="padding: 6px 0; color: #dc2626; font-weight: bold; font-size: 16px;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Fecha Límite:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        Le agradecemos realizar el pago antes de la fecha indicada a través de los medios autorizados de la institución educativa para mantener su estado de cuenta al día. Si usted ya realizó este abono recientemente, por favor desestime esta comunicación.
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Mensaje automático generado por la plataforma escolar SaaSchool. Por favor no responda directamente a este correo.
      </p>
    </div>
  `;

  let isSent = false;
  if (params.recipientEmail && params.recipientEmail.includes('@')) {
    isSent = await sendEmail({
      to: params.recipientEmail,
      subject: emailSubject,
      text: emailBody,
      html: emailHtml,
    });
  }

  results.push({
    success: isSent,
    channel: 'EMAIL',
    recipient: email,
    message: emailBody,
    timestamp,
  });

  return results;
};
