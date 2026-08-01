# SaaSchool Backend API

Backend Multi-Tenant para el sistema de gestión escolar SaaSchool.

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | 5.7+ | Lenguaje (strict mode) |
| Express | 4.x | Framework HTTP |
| Prisma | 5.x | ORM + migraciones |
| PostgreSQL | 15+ | Base de datos |
| Zod | 3.x | Validación de entrada |
| JWT | 9.x | Autenticación |
| bcryptjs | 2.x | Hashing de contraseñas |

## Arquitectura

Este proyecto sigue **Domain-Driven Design (DDD)** con principios **SOLID** y **POO**:

- **Multi-Tenant**: Cada query filtra obligatoriamente por `schoolId`
- **Capas**: `routes → controller → service → repository`
- **Inyección de dependencias**: Vía constructor (sin contenedor IoC externo)
- **Error centralizado**: Global Error Handler, sin try/catch en controllers
- **Validación**: Zod en capa controller, antes de llegar al servicio

## Configuración

### 1. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```env
DATABASE_URL="postgresql://postgres:12345@localhost:5432/saas-school"
JWT_SECRET="tu-secreto-muy-seguro"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
BCRYPT_ROUNDS=12
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear la base de datos en PostgreSQL

Asegúrate de tener una base de datos llamada `saas-school` en pgAdmin o ejecuta:

```sql
CREATE DATABASE "saas-school";
```

### 4. Ejecutar migraciones

```bash
npm run prisma:migrate
```

### 5. Iniciar el servidor

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## Endpoints Disponibles

### Auth (Público)
```
POST /api/auth/login
POST /api/auth/register
```

### Colegios (SUPER_ADMIN)
```
GET    /api/schools
POST   /api/schools
GET    /api/schools/:id
PATCH  /api/schools/:id
DELETE /api/schools/:id
```

### Usuarios (SCHOOL_ADMIN)
```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Estudiantes
```
GET    /api/students
POST   /api/students
GET    /api/students/:id
PATCH  /api/students/:id
DELETE /api/students/:id
```

### Años Académicos
```
GET    /api/academic-years
POST   /api/academic-years
GET    /api/academic-years/:id
PATCH  /api/academic-years/:id
```

### Aulas
```
GET    /api/classrooms
POST   /api/classrooms
GET    /api/classrooms/:id
PATCH  /api/classrooms/:id
DELETE /api/classrooms/:id
```

### Matrículas
```
GET    /api/enrollments
POST   /api/enrollments
GET    /api/enrollments/:id
PATCH  /api/enrollments/:id
```

### Pagos
```
GET    /api/payments/obligations
POST   /api/payments/obligations
GET    /api/payments/obligations/:id
POST   /api/payments/transactions
```

### Áreas Curriculares
```
GET    /api/curricular-areas
POST   /api/curricular-areas
GET    /api/curricular-areas/:id
PATCH  /api/curricular-areas/:id
POST   /api/curricular-areas/competences
```

### Notas
```
GET    /api/grades/enrollment/:enrollmentId
POST   /api/grades/entries
POST   /api/grades
```

### Asistencia
```
GET    /api/attendance?date=YYYY-MM-DD
GET    /api/attendance/enrollment/:enrollmentId
POST   /api/attendance
POST   /api/attendance/bulk
```

## Comandos Útiles

```bash
npm run dev              # Servidor en modo desarrollo (hot reload)
npm run build            # Compilar TypeScript
npm run prisma:generate  # Generar Prisma Client
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # Abrir Prisma Studio (UI para la BD)
```
