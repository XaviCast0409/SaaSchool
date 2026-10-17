# Implementation Plan: Módulo de Aula Virtual y Contenidos Académicos (LMS Ligero)

## 📌 Overview
Permite a los docentes publicar materiales de clase (PPT, Word, PDF), tareas escolares y foros de debate interactivo organizados por **Bimestre (1°, 2°, 3°, 4°)** para sus cursos y aulas asignadas. Los estudiantes y apoderados pueden ingresar a sus materias, descargar los archivos de clase en un clic y participar activamente debatiendo en los foros escolares.

---

## 🏛️ Architecture Decisions

1. **Estructura por Bimestre (1 al 4)**:
   - Todo contenido se asocia obligatoriamente a un `bimester` (1, 2, 3, 4) para mantener la organización pedagógica bimestral del MINEDU.
2. **Modelo Polimórfico Simplificado (`CourseContent`)**:
   - En lugar de 3 tablas complejas separadas, usamos un solo modelo `CourseContent` con un enum `ContentType`:
     - `LESSON_MATERIAL`: Diapositivas, lecturas, apuntes con archivo descargable.
     - `HOMEWORK`: Tarea escolar con fecha límite (`dueDate`) y archivo adjunto guía.
     - `FORUM`: Tema o pregunta de debate abierta a comentarios de alumnos.
3. **Hilo de Discusión para Foros (`ForumComment`)**:
   - Respuestas asociadas al `CourseContent` de tipo `FORUM`, guardando el autor (`userId`), contenido y fecha para debate interactivo entre alumnos y el profesor.
4. **Almacenamiento de Archivos (PPT, DOCX, PDF)**:
   - Soporte para subida local a `/uploads/materials` con enlace público directo y/o enlace de Google Drive.
5. **Aislamiento Multi-Tenant Estricto**:
   - Cada consulta filtra estrictamente por `schoolId` y valida que el alumno esté matriculado en el aula correspondiente (`Enrollment`).

---

## 📋 Dependency Graph

```
Prisma Schema (CourseContent & ForumComment)
    │
    ├── Backend Repository (Multi-tenant CRUD con schoolId)
    │       │
    │       ├── Backend Service & Zod Validation Schemas
    │       │       │
    │       │       └── Express Routes & Controller (authMiddleware, tenantMiddleware)
    │       │
    ├── Storage Uploader (Multer / File Handler para PPT, Word, PDF)
    │
    ├── Frontend API Hooks (useCourseContents, useCreateContent, useForumComments)
    │       │
    │       ├── Teacher View: Publicador por Bimestre y Gestión de Clases/Tareas/Foros
    │       │
    │       └── Parent/Student View: Muro del Curso, Descarga Directa e Hilo del Foro
```

---

## 🚀 Task List

### Fase 1: Base de Datos y Almacenamiento (Foundation)
- [ ] **Task 1.1: Modelo en Prisma**: Crear `ContentType` enum, `CourseContent` y `ForumComment` en `schema.prisma`.
- [ ] **Task 1.2: Migración y Tipos**: Ejecutar migración y generar `@prisma/client`.
- [ ] **Task 1.3: Servicio de Almacenamiento**: Endpoint para recepción de archivos adjuntos (PPT, DOCX, PDF, imágenes).

### Checkpoint: Foundation
- [ ] Base de datos migrada sin errores.
- [ ] Tipos de TypeScript generados en `back`.

---

### Fase 2: Backend API DDD (Core Logic)
- [ ] **Task 2.1: DTOs y Esquemas Zod**: `course-content.schema.ts` validando bimestres (1-4), tipo de contenido, título, archivo y fecha de entrega.
- [ ] **Task 2.2: Repositorio**: `course-content.repository.ts` con consultas filtradas por `schoolId`, `courseAssignmentId` y `bimester`.
- [ ] **Task 2.3: Servicio y Reglas de Negocio**: `course-content.service.ts` con validación de pertenencia al aula y roles.
- [ ] **Task 2.4: Controlador y Rutas Express**: `course-content.controller.ts` y `course-content.routes.ts` exponiendo:
  - `GET /api/course-contents/assignment/:assignmentId?bimester=1` (Listar publicaciones).
  - `POST /api/course-contents` (Docente: Crear material, tarea o foro).
  - `DELETE /api/course-contents/:id` (Docente/Admin: Eliminar publicación).
  - `GET /api/course-contents/:id/comments` (Listar comentarios de un foro).
  - `POST /api/course-contents/:id/comments` (Alumnos/Docente: Responder al foro).

### Checkpoint: Backend API
- [ ] Pruebas de integración HTTP de creación de clase, tarea y comentarios de foro (200/201 OK).

---

### Fase 3: Interfaz del Docente (Teacher Experience)
- [x] **Task 3.1: Hooks de React Query**: `useCourseContents.ts` (`useGetContents`, `useCreateContent`, `useDeleteContent`, `useForumComments`, `useAddComment`).
- [x] **Task 3.2: Modal Publicador Multi-Tipo**: Formulario limpio para elegir tipo (Clase, Tarea, Foro), Bimestre (1-4), título, instrucciones y archivo adjunto.
- [x] **Task 3.3: Vista del Curso del Docente**: Panel por pestañas de bimestres con las tarjetas de clases publicadas, tareas y foros.

---

### Fase 4: Interfaz Familiar y Estudiante (Student & Parent Experience)
- [x] **Task 4.1: Vista de Asignaturas del Alumno**: Lista de materias del aula del estudiante con nombre del profesor (`StudentCoursesPage.tsx`).
- [x] **Task 4.2: Muro de Contenidos por Bimestre**: Selector `[1° Bim] [2° Bim] [3° Bim] [4° Bim]` con tarjetas de clases y botón de descarga directa de PPT/Word/PDF (`CourseTimelineModal.tsx`).
- [x] **Task 4.3: Componente Interactivo de Foro**: Hilo de debate donde los alumnos y padres ven los comentarios y pueden publicar su respuesta (`ForumCommentsModal.tsx`).

### Checkpoint: Complete System
- [x] Flujo end-to-end: Docente publica diapositiva PPT y Foro en Bimestre -> Alumno/Padre entra a su materia -> Descarga el PPT en un clic -> Responde al Foro -> Docente y compañeros ven el debate en tiempo real.
- [x] 0 errores en `tsc --noEmit` en frontend y backend.

---

## ⚠️ Risks and Mitigations

| Riesgo | Impacto | Mitigación |
| :--- | :---: | :--- |
| **Archivos pesados (PPT de 40 MB)** | Medio | Validar tamaño máximo permitido en cliente y servidor (ej. 25 MB max) y usar streaming en disco. |
| **Aislamiento Multi-Tenant** | Alto | Todo query verifica `schoolId` y que el estudiante pertenezca al aula de la asignación. |
| **Formatos de archivo no soportados** | Bajo | Validar extensiones admitidas (.pdf, .pptx, .ppt, .docx, .doc, .xlsx, .jpg, .png). |

---

## ❓ Decisiones Validadas con el Usuario
1. Contenido organizado obligatoriamente por **Bimestres (1 al 4)**.
2. Tres tipos de contenido: **Material de Clase**, **Tarea Escolar** y **Foro de Debate**.
3. Los foros permiten respuestas interactivas de alumnos para debatir entre compañeros.
4. Para clases y tareas, el alumno/padre tiene un botón directo para descargar el documento.
