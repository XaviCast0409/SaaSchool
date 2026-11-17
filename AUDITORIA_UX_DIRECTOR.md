# Auditoría de experiencia de usuario y código: rol Director (plan PRO)

**Fecha:** 17 de noviembre de 2026
**Método:** prueba de punta a punta en local (`localhost`). Se creó desde el SuperAdmin el colegio de prueba **«I.E.P. Auditoría San Martín»** (plan PRO, código `i-e-p-auditoria-san-martin`) y se usó como su directora recién llegada. Cada hallazgo se verificó en la interfaz y, cuando se indica, en el código.
**Datos creados:** 1 año lectivo, 12 aulas, 4 trabajadores, 7 alumnos (1 manual y 6 por Excel), 6 apoderados, tarifario, 21 cuotas, 1 cobro, 1 caja, asistencia, 1 incidencia, 1 comunicado, notas y horario. Todo está en la base local.
**Correo:** el backend se levantó con el SMTP desviado a un host inexistente (configuración `back-audit` en `.claude/launch.json`), así que no salió ningún correo real.

> Se marca ✅ lo que funciona bien y no necesita cambios. No se inventaron mejoras para esos puntos.

---

## 1. Resumen

La plataforma es **amplia y en general está bien pensada**: la carga masiva con vista previa, el estado de cuenta familiar, la caja con arqueo, la asistencia por aula y la bitácora están al nivel de un producto maduro. Los problemas importantes se concentran en tres áreas:

1. **Notas y libretas** (documento oficial): una página de configuración cambia el registro de notas con solo abrirla, y la libreta de Primaria muestra números que el docente nunca puso.
2. **Validaciones que fallan en silencio o dejan pasar datos incoherentes**: matrícula, año lectivo, contraseñas y carga masiva.
3. **Textos y montos que dicen algo distinto de lo que hace el sistema**: pendiente «de este mes», «DNI será su contraseña», «escribe un número».

| Severidad | Cantidad |
|---|---|
| 🔴 Alta (datos oficiales, dinero o pérdida de datos) | 7 |
| 🟠 Media (flujo confuso o incompleto) | 22 |
| 🟡 Baja (textos, consistencia, detalles visuales) | 30 |

---

## 2. Hallazgos de severidad alta 🔴

### A1. Abrir «Criterios y escala» cambia el registro de notas de todo el colegio
- **Qué pasó:** registré notas directas (A, C, AD) en Matemática 1.°A, donde decía «Este curso no usa criterios». Después solo **abrí** *Configuración → Criterios y escala*. Al volver, el registro tenía columnas nuevas (PM, EM, RC, EB y «Sugerido») y mis notas quedaron marcadas como «ajustado».
- **Causa:** la consulta de criterios **crea 4 criterios por defecto** la primera vez que se lee (`back/src/modules/grades/grade.repository.ts:66-90`). Es un GET con efecto secundario: en la base, los 4 registros tienen la hora exacta de la visita. Además, esa creación no queda en la bitácora.
- **Impacto:** el modo de evaluación de todo el colegio cambia sin que nadie lo decida, y puede ocurrir a mitad de bimestre.
- **Arreglo:** no sembrar al leer. Mostrar un estado vacío con el botón «Cargar plantilla» (ya existe) y registrar en la bitácora quién activó los criterios.

### A2. La libreta de Primaria muestra notas numéricas inventadas y no muestra las competencias
- **Qué pasó:** con calificativos solo literales (A, C, AD), la libreta impresa muestra **«15 A», «8 C» y «19 AD»** en una columna titulada «Promedio».
- **Causa:** hay un mapeo fijo `AD: 19, A: 15, B: 12, C: 8` (`back/src/modules/academic/grade-engine.ts:8`) y el componente siempre dibuja número + letra (`front/src/features/academic/components/ReportCardView.tsx:17-24`). Las columnas de la libreta son los **criterios internos** del colegio (`cols`), no las **competencias del CNEB**.
- **Impacto:** la libreta es un documento oficial. En Primaria la calificación es literal, se registra por competencia y lleva conclusión descriptiva cuando hay B o C. Que aparezca un número que el docente no puso puede generar reclamos.
- **Arreglo:** en Primaria (y donde el colegio no use la escala vigesimal) mostrar solo la letra. Las filas deberían ser las competencias, la columna «Calificativo del área» en lugar de «Promedio», y agregar las conclusiones descriptivas. Conviene validar el formato final con la norma vigente (RVM 094-2020-MINEDU).

### A3. Matrícula: los errores del paso 1 se saltan la validación y el botón final no hace nada
- **Qué pasó:** con un DNI de 7 dígitos y el ubigeo «abc», el asistente me dejó pasar al paso 2 y al 3. En el paso 3, «Registrar ficha» **no hizo nada**: no hubo petición al servidor, ni mensaje, ni marca en el campo. Solo al volver manualmente al paso 1 aparecían los errores.
- **Causa:** las reglas de DNI, ubigeo, código SIAGIE y código modular están en un `.superRefine` (`front/src/features/students/components/EnrollStudentModal.tsx:82`). Zod solo ejecuta `superRefine` cuando el resto del esquema ya es válido. En el paso 1 faltan campos de los pasos 2 y 3, así que esas reglas no corren. El `handleSubmit(onSubmit)` (línea 496) no tiene `onInvalid`.
- **Arreglo:** pasar esas reglas a validaciones por campo (por ejemplo `z.string().regex()` con `refine` por tipo de documento), o validarlas a mano en `handleNextStep1`. Agregar un `onInvalid` que vuelva al paso con el error y muestre un aviso.

### A4. Año lectivo: deja guardar un año con fechas de otro año y lo marca «Vigente»
- **Qué pasó:** al cambiar el número de 2027 a 2026, el nombre («Año Escolar 2027») y las 10 fechas siguieron en 2027. Se guardó sin quejas y apareció como «2026 · Vigente» con fechas de marzo a diciembre de 2027, aunque hoy (17/11/2026) está fuera de ese rango.
- **Causa:** el esquema solo valida que el año esté entre 2000 y 2100 (`back/src/modules/academic-years/academic-year.schema.ts:11`). No se comprueba que inicio < fin ni que las fechas pertenezcan al año indicado. El formulario tampoco recalcula nada al cambiar el número.
- **Arreglo:** al cambiar el año, regenerar el nombre y las fechas sugeridas (y ofrecer «Recalcular periodos» al editar). En el backend, exigir `startDate < endDate` y que las fechas caigan en el año (o en un rango razonable).

### A5. La carga masiva sobrescribe datos de un alumno existente sin advertir
- **Qué pasó:** una fila con el DNI de un alumno ya matriculado («Castillo Mendoza, Javier Alejandro») pero con otro nombre («DUPLICADO PRUEBA, JAVIER») se clasificó como **«Actualiza datos»**. El botón decía «Cargar 7 alumnos» y, al confirmar, el alumno quedó renombrado.
- **Lo bueno:** la vista previa sí muestra el cambio campo por campo.
- **Lo malo:** cambiar los tres nombres de un DNI casi siempre es un error de tipeo en el DNI. Esa fila no aparece en «Con avisos», no se puede excluir y el botón no distingue nuevos de actualizaciones. Además, el Excel guarda en MAYÚSCULAS y el formulario manual en Tipo Título, así que las listas quedan mezcladas.
- **Arreglo:** si cambian los apellidos, marcar la fila como aviso («¿Es el mismo alumno?») y dejarla fuera por defecto. El botón podría decir «Cargar 6 nuevos y actualizar 1». Normalizar el formato de los nombres en un solo sentido.

### A6. La tasa de mora acepta hasta 100 % anual
- La pantalla explica bien la Ley 27665 (tope: tasa interbancaria del BCRP, hoy alrededor de 4–5 %), pero el backend acepta hasta `max(100)` (`back/src/modules/payments/adjustment.routes.ts:130`) y el formulario no pone límite.
- **Arreglo:** poner un tope razonable (por ejemplo 15 %) o pedir confirmación explícita por encima de un umbral configurable por el SuperAdmin.

### A7. Contraseña del personal: el formulario acepta 6 caracteres y el servidor exige 8
- El campo dice «Mínimo 8 caracteres», pero la validación del frontend dice «al menos 6» (`front/src/features/users/schemas/user.schema.ts:10`). Con 7 caracteres, el formulario deja enviar y el servidor responde con un error genérico arriba, sin marcar el campo.
- **Arreglo:** `min(8)` más la regla de letras y números. Ofrecer también un botón «Generar contraseña temporal», como ya se hace con alumnos y apoderados.

---

## 3. Hallazgos por módulo

### Primer ingreso y guía de inicio
- ✅ Cambio de contraseña obligatorio, consentimientos de Ley 29733 y una guía de 10 pasos con «Ir al siguiente paso».
- 🟠 **El paso «Datos institucionales y logo» exige código modular** (`back/src/modules/schools/onboarding.rules.ts:69`), pero *Ajustes del colegio* no tiene ese campo. Si el SuperAdmin no lo llenó, la directora no puede completar el paso. Tampoco se le dice qué falta: en mi caso solo faltaba el logo, sin ninguna pista.
- 🟠 La guía no incluye **Tarifario** antes de «Alumnos cargados». El orden correcto es tarifario → matrícula; si no, las cuotas no se generan.
- 🟠 Hay **dos guías distintas**: 10 pasos en Inicio y 5 en «Inicio académico». En la de 5 pasos, **«Carga docente» aparece ✓ con «0 cursos sin docente»** cuando todavía no existía ningún curso (verdadero solo porque no había nada que contar).
- 🟡 «Usa la contraseña temporal que te entregó tu colegio»: a la directora se la entregó KIPUX.
- 🟡 Login: el placeholder `••••••••` en el campo de contraseña parece una clave ya guardada.

### Ajustes del colegio
- 🟠 Es **un solo modal larguísimo** que mezcla 8 temas (logo, color, datos, retención de constancias, alertas de asistencia, mensajería, página de ingreso y plan). Debería ser una página con pestañas.
- 🟠 Faltan RUC, código modular, UGEL y niveles o turnos que ofrece el colegio, datos que salen en libretas y en el SIAGIE.
- 🟡 «Solicita un Upgrade a Soporte»: no hay botón ni contacto, y no se muestran la vigencia del plan ni el cupo de alumnos (500).

### Años lectivos
- Ver **A4**.
- 🟡 «Sin vigencia» aparece en verde (color de éxito).
- 🟡 La tarjeta del año no muestra los bimestres. Hay que abrir «Editar» para verlos.

### Aulas y secciones
- ✅ «Crear varias aulas» con vista previa de lo que se creará es excelente. ✅ La validación «un docente, una tutoría» es clara.
- 🟡 Solo hay 2 tarjetas por fila a 1366 px y la mitad derecha queda vacía.
- 🟡 El selector de tutor no marca quién ya es tutor de otra aula. Uno se entera recién por el error.

### Personal del colegio
- 🟠 La tabla **desborda horizontalmente a 1366 px con solo 2 filas** y la última acción queda cortada.
- 🟠 El formulario de «Personal» permite crear el rol **«Apoderado / Padre de Familia»**, lo que confunde: los apoderados se crean desde la matrícula.
- 🟡 Los obligatorios (nombre, apellido, documento y contraseña) no llevan `*`; solo el correo lo tiene.
- 🟡 Las barras de pestañas muestran flechitas ▲▼ de scroll a la derecha (también en Asistencia y Reportes académicos).

### Alumnos y matrícula
- Ver **A3** y **A5**.
- ✅ Contraseñas temporales aleatorias, mostradas una sola vez y con opción de imprimir. ✅ El aviso «Sin tarifario para este nivel» se muestra dentro de la matrícula.
- 🟠 Los **ubigeos se piden como código INEI de 6 dígitos** («150140»). Nadie se los sabe: hace falta un buscador Departamento → Provincia → Distrito.
- 🟠 Texto desactualizado en el paso 3: «[El DNI] **será su usuario y contraseña** de acceso inicial». Ya no es así: la contraseña es aleatoria.
- 🟡 «Género» viene preseleccionado en *Masculino* y «Grado de instrucción» en *Secundaria completa*, lo que invita a guardar datos falsos. Deberían empezar vacíos.
- 🟡 En el paso 3 se abre «Seleccionar del directorio» aunque todavía no haya ningún apoderado.
- 🟡 Carga masiva: «Descarga la plantilla y **entrégala al colegio**» y «Si falta alguna aula, **pídela a soporte**» están escritos para el SuperAdmin. La directora es el colegio y puede crear aulas.
- 🟡 Error «Faltan los nombres del apoderado» cuando el nombre existe pero tiene una sola letra. Debería decir «muy corto».

### Tesorería: tarifario, cobranzas y caja
- ✅ Tarifario claro, con el total anual calculado. ✅ «Generar cuotas faltantes» con confirmación que dice cuántas cuotas y por cuánto. ✅ El cobro pide número de operación para Yape o transferencia y bloquea montos mayores a la deuda. ✅ Recibo correlativo (REC-000001).
- 🟠 **«Pendiente de cobro: S/ 7000 — Por cobrar este mes»** suma también diciembre. Lo de noviembre era S/ 4550. Hay que cambiar el cálculo o la etiqueta.
- 🟠 Al guardar un tarifario no se ofrece generar las cuotas de los alumnos ya matriculados. Hay que descubrir «Generar cuotas faltantes».
- 🟠 Después de cobrar no se ofrece **imprimir ni enviar el recibo**: solo aparece un aviso.
- 🟠 **El arqueo de caja no es ciego**: muestra el «Efectivo esperado» antes de que el cajero cuente, así que puede copiar la cifra sin contar. Lo recomendable es pedir el conteo y recién después mostrar la diferencia.
- 🟡 En «Registrar cobro», «Monto total deuda» muestra solo esa cuota (S/ 300), no la deuda del alumno (S/ 1000).
- 🟡 La cabecera de Pagos tiene 8 botones que repiten el menú lateral (Caja, Becas, Reportes…). En celular ocupan toda la primera pantalla.
- 🟡 La tabla tiene una fila por cuota (el mismo alumno aparece 3 veces) y 6 acciones por fila. Para cobrar, una vista por alumno o familia es más natural.
- 🟡 La validación de monto es la nativa del navegador, con un estilo distinto al resto de errores.
- ✅ Caja con fondo, cobros por método, observación obligatoria si hay diferencia y estado «por revisar». ✅ Estado de cuenta **familiar** que agrupa hermanos, con Excel e impresión. Muy bien resuelto.
- ❓ Por revisar: la directora parece poder revisar su propia caja (no hay separación de funciones). No se llegó a probar.

### Académico: plan de estudios, carga docente y notas
- ✅ La plantilla CNEB se aplica a varios grados a la vez; el orden de las áreas coincide con el del SIAGIE (se verificó y no es un error). ✅ La carga docente con «Asignar todo "A" a…» es ideal para Primaria.
- Ver **A1** y **A2**.
- 🟠 En el registro de notas sin criterios, la ayuda dice «**Escribe** un número de 0 a 20… puedes **pegar columnas desde Excel**», pero el control es un desplegable: no se puede escribir ni pegar.
- 🟠 «Avance y cierre» y «Notas y libretas» abren el **1.er bimestre** por defecto, cuando el vigente es el 4.º.
- 🟡 La etiqueta «ajustado» junto a cada nota no se entiende. Algo como «puesto a mano» o un tooltip lo aclararía.
- 🟡 El orden de los cursos en «Avance y cierre» (Transversales, Religión, CyT…) no coincide con el del plan de estudios.
- 🟡 Al asignar todos los cursos de un aula a un docente no se ofrece hacerlo también tutor, que es lo habitual en Primaria.
- ✅ Autoguardado, contador de pendientes y conclusión descriptiva obligatoria para C.

### Horario de clases
- ✅ El inicio del siguiente bloque avanza solo, hay totales de horas por curso y «Copiar estructura del lunes».
- 🟠 **Se pierden los cambios sin aviso** si se navega a otra pantalla antes de «Guardar horario».
- 🟡 «Competencias transversales» aparece como curso programable en el horario.

### Asistencia y portería
- ✅ Toma masiva por aula muy rápida, con resumen inmediato.
- 🟠 Portería **solo busca por DNI o QR**. Con «Quispe» respondió «no se encontró». El portero suele saber el nombre, no el DNI.
- 🟡 No hay forma de registrar a una persona eventual con autorización escrita (por ejemplo, el tío que recoge un día).

### Comunicación
- ✅ Comunicados con «Autorización», «Leído y enterado» o «Encuesta», fecha límite y contador de respuestas.
- 🟠 El alcance es **todo el colegio o una sola aula**: no se puede elegir por nivel, por grado ni varias aulas. Tampoco se pueden adjuntar archivos (circular en PDF).
- 🟡 La directora ve «Se requiere **tu** autorización», un texto pensado para la familia. Debería decir «Autorizaciones recibidas».
- 🟠 **Entrevistas**: la directora solo ve la vista de docente («publica tus horarios»), pero las familias solo pueden reservar con docentes de sus hijos, así que sus horarios no le sirven a nadie. Falta una vista para supervisar las entrevistas del colegio.
- ✅ Mensajes ordenados por familias y equipo, con horario de atención.

### Agenda e incidencias
- ✅ Acuse de lectura del padre y marca de caso SíseVe.
- 🟡 A un mérito se le asigna «Severidad: Baja», que no aplica.
- 🟡 Se registra un solo alumno por incidencia (una pelea suele involucrar a varios) y el botón siempre es «Guardar **y notificar**», sin opción de guardar sin avisar.
- 🟡 El selector de alumno es una lista de todo el colegio sin el aula. Con 500 alumnos va a ser lento.

### Secretaría
- 🟠 Los enlaces públicos usan el UUID (`/admision/6a1078dc-9b0c-…`) en vez del código del colegio, lo que es poco práctico para Facebook o WhatsApp.
- 🟡 Dice «puedes imprimir un QR» pero no hay botón para generarlo.
- 🟠 Trámites solo recibe pedidos hechos desde la app de la familia: no se puede emitir una constancia a un padre que viene en persona.

### Analítica, automatizaciones y bitácora
- ✅ El índice de riesgo explica sus causas. ✅ «Datos para el SIAGIE» lista lo que falta. ✅ Las automatizaciones se pueden apagar una por una. ✅ La bitácora es completa y legible.
- 🟡 «Datos para el SIAGIE» está dentro de *Analítica y tutoría* (debería estar en Alumnos) y sus filas no llevan a corregir el dato.
- 🟡 Riesgo «Señales leves» es vago para Camila (era 1 tardanza); para Mateo sí dice el motivo.
- 🟡 Bitácora: aparece la clave técnica «students bulk imported / STUDENTS_BULK_IMPORTED» y la fecha sale como «Martes, 17 **De** Noviembre **De** 2026».

### Accesibilidad (código)
- 🟠 **Los modales no tienen `role="dialog"` ni `aria-modal`** (0 en todo el DOM con un modal abierto) y las etiquetas no están asociadas a sus campos (no usan `htmlFor`). Muchos botones del menú lateral no tienen nombre accesible. Un lector de pantalla no puede usar los formularios.

### Celular
- ✅ No hay scroll horizontal a 375 px y la barra inferior (Inicio, Asistencia, Pagos, Mensajes, Más) funciona bien.

---

## 4. Lo que no se pudo probar (para ser transparente)
- **Subir el logo y otros archivos:** el entorno local apunta al bucket R2 real, así que no subí nada. Por eso el paso «Datos institucionales y logo» quedó pendiente (9 de 10).
- **Correos y push:** el SMTP estaba desviado a propósito. No verifiqué el contenido de los correos.
- Exportaciones a Excel o SIAGIE (descargas), aula virtual (supervisión), recursos docentes, «Registrar situación final», envío de mensajes, formulario público de admisión y Libro de Reclamaciones.
- Las vistas de docente, apoderado y alumno (el alcance era el director).

---

## 5. Prioridad sugerida
1. **A1, A2 y A3**: notas, libretas y matrícula.
2. **A4, A5 y A7**: validaciones.
3. Montos y textos engañosos: «Pendiente este mes», «DNI será su contraseña», «Escribe un número».
4. **A6**: tope de mora.
5. Arqueo ciego, aviso de cambios sin guardar en el horario, recibo tras cobrar y búsqueda por nombre en portería.
6. Accesibilidad de los modales y formularios.
7. Ajustes del colegio como página con pestañas y una sola guía de inicio.

---

## 6. Estado de las correcciones (17 de noviembre de 2026)

Verificado con `tsc` (back y front sin errores), 532 pruebas del backend y 18 del frontend en verde, `eslint` sin errores, `vite build` correcto y pruebas manuales en local. Nada está commiteado todavía.

### Altas
| # | Estado | Qué se hizo |
|---|---|---|
| A1 | ✅ | La consulta de criterios ya no crea nada (`grade.repository.ts`). Sin criterios se califica directo; la plantilla se carga solo con el botón «Cargar plantilla estándar». |
| A2 | ✅ | La libreta agrega «Calificativo por competencia» con su conclusión descriptiva y deja de mostrar números convertidos desde letras («Calificativo del área» en vez de «Promedio» cuando no hay criterios). |
| A3 | ✅ | Las reglas de DNI, ubigeo, código SIAGIE y código modular se revisan al pasar de paso (todas juntas) y, si al enviar queda algún error, el asistente vuelve a ese paso con aviso. |
| A4 | ✅ | Al cambiar el número del año se mueven nombre y fechas. El backend rechaza fechas que no corresponden al año, inicio ≥ fin y un nombre con otro año. |
| A5 | ✅ | Si el apellido paterno del Excel no coincide con el del DNI registrado, no se tocan los nombres y la fila queda «con aviso». El botón dice «Cargar N nuevos y actualizar M». Los nombres del formulario se guardan en MAYÚSCULAS, como el Excel y el SIAGIE. |
| A6 | ✅ | Tope de 15 % anual en backend y aviso en pantalla. |
| A7 | ✅ | Mismas reglas que el backend (8 caracteres, letras y números) y botón «Generar contraseña». |

### Medias y bajas resueltas
Guía de inicio (dice qué falta del perfil y suma el paso «Tarifario»); Ajustes en pestañas con RUC, código modular, vigencia y cupo del plan; «Carga docente» ya no sale completa sin cursos; periodo vigente por defecto en «Avance y cierre» y «Notas y libretas»; cursos en el orden del plan; textos del registro de notas; aviso al salir del horario sin guardar y transversales fuera del horario; Portería con búsqueda por nombre y «otra persona con autorización escrita» (solo Dirección o Secretaría); enlaces públicos con el código del colegio, botón «Imprimir QR» y trámites registrados en ventanilla; comunicados por nivel o grado (nueva migración `20261226000000_comunicados_por_nivel`) y título correcto para quien hace el seguimiento; Entrevistas con «Supervisión del colegio»; Incidencias para varios alumnos, sin severidad en méritos y con opción de no avisar; pendiente «hasta fin de mes» y alumnos en mora reales; recibo al terminar el cobro; arqueo en dos pasos (primero se cuenta); al guardar un tarifario se ofrecen las cuotas faltantes; cabecera de Pagos con «Nuevo cobro», «Generar pensiones» y menú «Más»; revisión de la propia caja exige observación; tabla de Personal compacta; pestañas sin flechas de scroll; sin «Apoderado» en Personal; sin valores por defecto falsos (género, grado de instrucción, distrito LIMA); código de colegio sin «i-e-p-»; error del alta marcado en el campo; textos de primer ingreso, login, carga masiva y bitácora; motivos de riesgo siempre explicados y enlace «Corregir ficha»; `role="dialog"` en 44 modales y etiquetas asociadas en la ficha de matrícula.

### Retirados tras revisarlos
- El selector de tutor **sí** deshabilita a quien ya es tutor: la prueba lo saltó al forzar el valor por código.
- La grilla de aulas ya es de 3 columnas: con 2 secciones se ven 2 tarjetas, no es un error.

### Pendientes resueltos después (17 de noviembre de 2026, tarde)
- **Catálogo completo de ubigeos:** 1 892 distritos del INEI (fuente: `github.com/jmcastagnetto/ubigeo-peru-aumentado`, `ubigeo_distrito.csv`). Los 64 códigos que ya tenía el proyecto coinciden. Buscador por distrito, provincia o código en «Matricular» y «Editar alumno»; se carga solo al usarlo (18 KB comprimido). El backend rechaza al matricular un ubigeo que no existe y la carga masiva lo deja como aviso; al editar solo se exige el formato, para no bloquear fichas antiguas.
- **Adjuntos en comunicados:** hasta 3 archivos (PDF, Word, Excel, PowerPoint o imagen) por comunicado (migración `20261227000000_comunicados_adjuntos`). Solo se pueden adjuntar archivos que subió quien publica y que no sean privados (vouchers, tareas, documentos de alumnos); al adjuntarlos quedan visibles para todo el colegio. Probado con un archivo local: se publica, se ve en el muro y se abre por el enlace firmado.
- **Arqueo ciego:** con la propia caja abierta ya no se ven el cobrado en efectivo, el efectivo esperado ni el total en la tabla de cierres o el detalle; solo la cantidad de cobros. El esperado aparece al cerrar, después de contar. Quien supervisa cajas ajenas sí ve los totales.
- **Etiquetas asociadas:** 95 etiquetas más en 13 formularios (incidencias, comunicados, personal, editar alumno, cobros, pensiones, tarifario, becas, año lectivo y alta de colegio), además de la ficha de matrícula.

### Queda a decisión del colegio
- **Botón «Solicitar cambio de plan»:** se muestra al configurar `VITE_SUPPORT_EMAIL` en el despliegue (decisión: no fijar un correo en el código).
