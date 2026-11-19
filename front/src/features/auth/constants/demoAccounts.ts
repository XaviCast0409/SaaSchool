export interface DemoAccount {
  label: string;
  email: string;
  pass: string;
  sub: string;
  badge: string;
  badgeColor?: string;
}

/**
 * Cuentas del seed solo en desarrollo (`pnpm dev`). En el build de producción la condición es
 * falsa en tiempo de compilación y estos usuarios y claves no llegan al navegador.
 */
export const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

export const DEMO_CATEGORIES: Record<string, { title: string; accounts: DemoAccount[] }> = !SHOW_DEMO_ACCOUNTS
  ? {}
  : {
      PRO: {
        title: 'Colegio PRO (Innova)',
        accounts: [
          {
            label: 'Director PRO',
            email: 'admin.pro@innova.edu.pe',
            pass: 'Admin123!',
            sub: 'Gestión y Supervisión',
            badge: 'PRO',
            badgeColor: 'bg-primary text-primary-foreground',
          },
          {
            label: 'Secretaría PRO',
            email: 'secretaria.pro@innova.edu.pe',
            pass: 'Admin123!',
            sub: 'Matrículas y Caja',
            badge: 'PRO',
            badgeColor: 'bg-primary text-primary-foreground',
          },
          {
            label: 'Docente PRO',
            email: 'docente.pro@innova.edu.pe',
            pass: 'Teacher123!',
            sub: 'Aula Virtual y Notas',
            badge: 'PRO',
            badgeColor: 'bg-primary text-primary-foreground',
          },
          {
            label: 'Padre (2 Hijos)',
            email: 'padre.doshijos@innova.edu.pe',
            pass: 'Parent123!',
            sub: 'Lucas (3° Prim) y Valeria (2° Sec)',
            badge: '2 HIJOS',
            badgeColor: 'bg-emerald-600 text-white',
          },
          {
            label: 'Padre (1 Hijo)',
            email: 'padre.unhijo@innova.edu.pe',
            pass: 'Parent123!',
            sub: 'Gabriel (1° Primaria)',
            badge: '1 HIJO',
            badgeColor: 'bg-emerald-600 text-white',
          },
        ],
      },
      ESTUDIANTES: {
        title: 'Hijos (Estudiantes)',
        accounts: [
          {
            label: 'Lucas Silva',
            email: 'alumno.lucas@innova.edu.pe',
            pass: 'Student123!',
            sub: '3° Primaria PRO (Mochila Digital)',
            badge: 'ALUMNO',
            badgeColor: 'bg-indigo-600 text-white',
          },
          {
            label: 'Valeria Silva',
            email: 'alumno.valeria@innova.edu.pe',
            pass: 'Student123!',
            sub: '2° Secundaria PRO (Notas y Cursos)',
            badge: 'ALUMNA',
            badgeColor: 'bg-purple-600 text-white',
          },
          {
            label: 'Gabriel Mendoza',
            email: 'alumno.gabriel@innova.edu.pe',
            pass: 'Student123!',
            sub: '1° Primaria PRO (Hijo Único)',
            badge: 'ALUMNO',
            badgeColor: 'bg-indigo-600 text-white',
          },
        ],
      },
    };
