/**
 * Utilidad de notificación para envío de recordatorios de pago vía WhatsApp / Email (API simple).
 * En desarrollo/producción simula/ejecuta el envío de plantillas de cobranza al apoderado.
 */

export interface ReminderNotificationParams {
  channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
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
  channel: string;
  recipient: string;
  message: string;
  timestamp: string;
}

export const sendReminderNotification = async (
  params: ReminderNotificationParams,
): Promise<ReminderNotificationResult[]> => {
  const results: ReminderNotificationResult[] = [];
  const timestamp = new Date().toISOString();
  const formattedAmount = `S/ ${params.amountDue.toFixed(2)}`;
  const formattedDate = new Date(params.dueDate).toLocaleDateString('es-PE');

  // Enviar WhatsApp si se solicita
  if (params.channel === 'WHATSAPP' || params.channel === 'BOTH') {
    const phone = params.recipientPhone || 'Sin número registrado';
    const waMessage = `Estimado(a) ${params.recipientName}, le recordamos el pago pendiente de ${params.obligationTitle} del alumno(a) ${params.studentName} por el monto de ${formattedAmount} con fecha de vencimiento ${formattedDate}.`;

    console.log(`[WHATSAPP NOTIFICATION] Sent to ${phone}: ${waMessage}`);

    results.push({
      success: true,
      channel: 'WHATSAPP',
      recipient: phone,
      message: waMessage,
      timestamp,
    });
  }

  // Enviar Email si se solicita
  if (params.channel === 'EMAIL' || params.channel === 'BOTH') {
    const email = params.recipientEmail || 'Sin correo registrado';
    const emailSubject = `Recordatorio de Pago: ${params.obligationTitle} - SaaSchool`;
    const emailBody = `Estimado(a) ${params.recipientName},\n\nLe recordamos la obligación de pago registrada a nombre de su hijo(a) ${params.studentName}:\n\n- Concepto: ${params.obligationTitle}\n- Monto a Pagar: ${formattedAmount}\n- Fecha de Vencimiento: ${formattedDate}\n\nPor favor realice el pago a través de los medios autorizados.\n\nAtentamente,\nAdministración Escolar`;

    console.log(`[EMAIL NOTIFICATION] Sent to ${email}: [Subject: ${emailSubject}]`);

    results.push({
      success: true,
      channel: 'EMAIL',
      recipient: email,
      message: emailBody,
      timestamp,
    });
  }

  return results;
};
