import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const startServer = async (): Promise<void> => {
  try {
    // Verificar conexión con la base de datos
    await prisma.$connect();
    console.log('✅ Conexión con PostgreSQL establecida');

    app.listen(env.PORT, () => {
      console.log(`🚀 SaaSchool API corriendo en http://localhost:${env.PORT}`);
      console.log(`📋 Ambiente: ${env.NODE_ENV}`);
      console.log(`❤️  Health check: http://localhost:${env.PORT}/health`);
    });
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
