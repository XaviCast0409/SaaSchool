import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

import { AttendanceRepository } from './modules/attendance/attendance.repository';
import { initAttendanceAutoCloseCron } from './modules/attendance/attendance.cron';

const startServer = async (): Promise<void> => {
  try {
    // Verificar conexión con la base de datos
    await prisma.$connect();
    console.log('✅ Conexión con PostgreSQL establecida');

    // Inicializar tarea programada de auto-cierre de asistencia
    const attendanceRepo = new AttendanceRepository();
    const stopAttendanceCron = initAttendanceAutoCloseCron(attendanceRepo);

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 SaaSchool API corriendo en puerto ${env.PORT}`);
      console.log(`📋 Ambiente: ${env.NODE_ENV}`);
      console.log(`❤️  Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown para Render y contenedores Docker
    const shutdown = async (signal: string) => {
      console.log(`🛑 Señal ${signal} recibida. Cerrando conexiones limpiamente...`);
      stopAttendanceCron();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('🔒 Conexiones cerradas. Servidor finalizado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (startupError) {
    console.error('❌ Error al iniciar el servidor:', startupError);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', async (reason: unknown) => {
  console.error('💥 Unhandled Rejection:', reason);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('uncaughtException', async (error: Error) => {
  console.error('💥 Uncaught Exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});

void startServer();
