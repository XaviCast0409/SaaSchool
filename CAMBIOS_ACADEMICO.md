# Cambios — Rediseño académico

## Estado inicial

- Vitest ejecutado en backend: 2 test files pasados (28 tests exitosos).
- Node v24.21.0 en Windows experimenta terminación anómala (código 3221225477 / EXCEPTION_ACCESS_VIOLATION) al invocar `tsc` y Vite de forma intensiva en memoria. Se documenta para seguimiento y se continúa según la regla del Bloque 0 ("Si algo falla antes de tocar código, anótalo en CAMBIOS_ACADEMICO.md (sección 'Estado inicial') y continúa").

## Bloques

- Bloque 0: Preparación completada. Rama `academico/rediseno` creada, dependencia `exceljs@4.4.0` instalada en `back`.
- Bloque 1: Parches urgentes aplicados en áreas curriculares, protección contra pérdida de notas al desasignar cursos, validación de umbrales de escala y corrección de consolidador SIAGIE.
- Bloque 2: Catálogo CNEB único implementado en `back/src/modules/academic/cneb.catalog.ts` con tests unitarios pasando al 100%.
- Bloque 3: Esquema ampliado con migración `20261110220000_academico_modelo` aplicada y Prisma Client generado.
- Bloque 4: Motor de cálculo CNEB implementado en `back/src/modules/academic/grade-engine.ts` con suite de tests completa.
- Bloque 5: Script de normalización `back/scripts/academic-normalize.ts` ejecutado en modo dry-run y apply.
- Bloque 6: Servicio de plan de estudios y catálogo curricular implementado en `curriculum.service.ts` y contexto académico.
- Bloque 7: Servicio de carga docente implementado en `teaching-load.service.ts` con sincronización de competencias transversales.
- Bloque 8: Servicio de periodos y estados académicos implementado en `period.service.ts`.
- Bloque 9: Servicio de registro de notas y cálculo de resultados en `results.service.ts`, `gradebook.service.ts` y script `academic-recompute.ts`.
- Bloque 10: Consolidados, libretas, avance y endpoints API montados en `academic.routes.ts`.
- Bloque 11: Exportaciones a Excel multi-hoja con formato profesional en `academic-excel.service.ts`.
- Bloque 12: Reconexión de módulos existentes al nuevo modelo multi-año y estados de periodo.

## Desviaciones

## Pendientes
