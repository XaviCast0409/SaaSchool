# Todo List: Módulo de Aula Virtual y Contenidos Académicos

## Fase 1: Base de Datos y Almacenamiento
- [x] **Task 1.1: Esquema de Prisma (`schema.prisma`)**
  - **Criterios de Aceptación:**
    - [x] Enum `ContentType` con valores `LESSON_MATERIAL`, `HOMEWORK`, `FORUM`.
    - [x] Modelo `CourseContent` con campos `id`, `schoolId`, `courseAssignmentId`, `teacherId`, `bimester` (Int), `contentType`, `title`, `description`, `fileUrl`, `fileName`, `fileType`, `fileSize`, `dueDate`, `createdAt`.
    - [x] Modelo `ForumComment` con campos `id`, `schoolId`, `courseContentId`, `userId`, `content`, `createdAt`.
    - [x] Relaciones con `School`, `CourseAssignment`, `User`.
  - **Verificación:** `npx prisma validate` y `npx prisma db push` o migración sin errores (Completado y sincronizado).

- [x] **Task 1.2: Endpoint de Carga de Archivos (`/api/uploads`)**
  - **Criterios de Aceptación:**
    - [x] Middleware Multer configurado con límite de 30MB y extensiones válidas (.pdf, .pptx, .ppt, .docx, .doc, .xlsx, .jpg, .png, etc.).
    - [x] Almacenamiento en carpeta `/uploads/materials`.
    - [x] Retorna objeto con `url`, `fileName`, `fileType`, `fileSize`.
  - **Verificación:** Petición HTTP POST multipart retorna 201 con la URL accesible vía GET (Verificado con prueba real en vivo).

---

## Fase 2: Backend API (DDD en `back/src/modules/course-contents`)
- [x] **Task 2.1: Zod Schemas (`course-content.schema.ts`)**
  - **Criterios de Aceptación:**
    - [x] Validación de `bimester` entre 1 y 4.
    - [x] Validación de campos obligatorios según `contentType`.
    - [x] Validación de comentarios de foro (`content` no vacío, min 1, max 2000 caracteres).

- [x] **Task 2.2: Repositorio (`course-content.repository.ts`)**
  - **Criterios de Aceptación:**
    - [x] Método `findByAssignment(schoolId, courseAssignmentId, bimester)`.
    - [x] Método `create(schoolId, data)`.
    - [x] Método `delete(schoolId, id, teacherId)`.
    - [x] Métodos para foros: `findComments(schoolId, contentId)` y `addComment(schoolId, data)`.
    - [x] Método `findStudentCourses(schoolId, studentId)`.

- [x] **Task 2.3: Servicio y Controlador (`course-content.service.ts` & `course-content.controller.ts`)**
  - **Criterios de Aceptación:**
    - [x] Inyección de dependencias y aislamiento de `schoolId`.
    - [x] Manejo de errores con `AppError`.
    - [x] Verificación de que el docente sea el asignado o administrador para crear/eliminar.

- [x] **Task 2.4: Rutas (`course-content.routes.ts`)**
  - **Criterios de Aceptación:**
    - [x] Endpoints montados en `back/src/app.ts` bajo `/api/course-contents`.
    - [x] Autenticación obligatoria con `authMiddleware` y `tenantMiddleware`.
    - [x] Verificado con pruebas HTTP reales (Creación de Clase, Tarea, Foro y Comentarios 201 OK).

---

## Fase 3: Interfaz del Docente
- [x] **Task 3.1: API Client & Hooks (`front/src/features/course-contents/api/useCourseContents.ts`)**
  - **Criterios de Aceptación:**
    - [x] Hooks TanStack Query para listar por bimestre, crear publicación, borrar y comentar.
    - [x] Hook para carga de archivos multipart/form-data a `/uploads/materials`.

- [x] **Task 3.2: Modal Publicador (`PublishContentModal.tsx`)**
  - **Criterios de Aceptación:**
    - [x] Selector visual de tipo: 📚 Clase | 📝 Tarea | 💬 Foro.
    - [x] Selector de Bimestre (1°, 2°, 3°, 4°).
    - [x] Drag & drop o selector de archivo con indicador de progreso.
    - [x] Si es tarea, campo de fecha límite.

- [x] **Task 3.3: Panel de Gestión del Curso (`TeacherCourseContentsModal.tsx` & `TeacherMyCoursesView.tsx`)**
  - **Criterios de Aceptación:**
    - [x] Barra de pestañas bimestrales `[1° Bimestre] [2° Bimestre] [3° Bimestre] [4° Bimestre]`.
    - [x] Tarjetas `CourseContentCard` con badges distintivos por tipo de contenido.
    - [x] Conteo de respuestas en foros y botón para eliminar publicaciones.
    - [x] Modal interactivo de debate en foros (`ForumCommentsModal.tsx`).
    - [x] Integración de botón de acceso directo "Aula Virtual" en cada tarjeta de curso del profesor.

---

## Fase 4: Interfaz de Alumnos y Padres
- [x] **Task 4.1: Vista de Materias del Alumno (`StudentCoursesPage.tsx`)**
  - **Criterios de Aceptación:**
    - [x] Cuadrícula con las asignaturas del aula del estudiante (Matemática, Comunicación, etc.).
    - [x] Integración de selector multi-hijo con `useParentStore` y `ChildSwitcher`.
    - [x] Enlace directo al muro de cada curso con botón "Ver Clases y Tareas".
    - [x] Tarjeta de acceso directo `ChildVirtualClassroomCard` en el portal familiar (`ParentPortalPage.tsx`).

- [x] **Task 4.2: Muro de Clases y Tareas (`CourseTimelineModal.tsx`)**
  - **Criterios de Aceptación:**
    - [x] Pestañas de bimestres con filtro instantáneo `[1° Bim] [2° Bim] [3° Bim] [4° Bim]`.
    - [x] Botón de descarga directa en 1 clic de archivos adjuntos (PowerPoint .pptx, Word .docx, PDF, Excel, imágenes) con tamaño en MB.
    - [x] Insignias distintivas para Clases, Tareas Escolares (con fecha límite) y Foros de Debate.

- [x] **Task 4.3: Hilo Interactivo de Debate del Foro (`ForumCommentsModal.tsx`)**
  - **Criterios de Aceptación:**
    - [x] Caja con el tema de discusión planteado por el docente.
    - [x] Lista de comentarios de los alumnos y profesor con fecha, nombre y rol.
    - [x] Input interactivo para que el alumno/padre escriba y envíe su respuesta en tiempo real.

---

## Verificación Final
- [x] Compilación TypeScript: `cd back && npx tsc --noEmit && cd ../front && npx tsc --noEmit` sin errores (0 errores).
- [x] Navegación integrada en `DashboardLayout.tsx` (`/virtual-classroom`) protegida por rol `PARENT`, `TEACHER`, `SCHOOL_ADMIN`.
- [x] Flujo completo implementado y validado de subida de clase, descarga por alumno y debate en foro.
