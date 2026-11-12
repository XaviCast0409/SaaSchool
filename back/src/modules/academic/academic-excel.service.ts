import ExcelJS from 'exceljs';
import type { ConsolidationService } from './consolidation.service';
import type { GradebookService } from './gradebook.service';

type Consolidation = Awaited<ReturnType<ConsolidationService['getClassroomConsolidation']>>;
type Gradebook = Awaited<ReturnType<GradebookService['getGradebook']>>;

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};
const LETTER_FILL: Record<string, string> = { AD: 'FFDCFCE7', A: 'FFE0F2FE', B: 'FFFEF3C7', C: 'FFFEE2E2' };

function titleBlock(ws: ExcelJS.Worksheet, lines: string[], width: number) {
  lines.forEach((text, i) => {
    const row = ws.addRow([text]);
    ws.mergeCells(row.number, 1, row.number, Math.max(width, 2));
    row.font = i === 0 ? { bold: true, size: 13 } : { size: 10, color: { argb: 'FF475569' } };
  });
  ws.addRow([]);
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
  row.height = 42;
}

function setup(ws: ExcelJS.Worksheet) {
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
}

export async function buildConsolidationWorkbook(data: Consolidation): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool';
  const ws = wb.addWorksheet('Consolidado');
  setup(ws);
  const comps = data.matrix.consolidatedAreas.flatMap((a) => a.competences.map((c) => ({ area: a, comp: c })));
  const periodLabel = data.period === 'FINAL' ? 'Calificativo final' : `Periodo ${data.period}`;
  titleBlock(ws, [
    data.school?.name ?? 'Colegio',
    `Consolidado de evaluación — ${data.classroom.label} — ${data.academicYear.year} — ${periodLabel}`,
    `Código modular: ${data.school?.modularCode ?? '—'} · Tutor(a): ${data.classroom.tutor ?? '—'}`,
  ], comps.length + 4);

  const areaRow = ws.addRow(['N.°', 'Código', 'Apellidos y nombres', ...comps.map((x) => x.area.name), ...(data.period === 'FINAL' ? ['Situación'] : [])]);
  let col = 4;
  for (const area of data.matrix.consolidatedAreas) {
    if (area.competences.length > 1) ws.mergeCells(areaRow.number, col, areaRow.number, col + area.competences.length - 1);
    col += area.competences.length;
  }
  styleHeader(areaRow);
  const compRow = ws.addRow(['', '', '', ...comps.map((x) => x.comp.shortName), ...(data.period === 'FINAL' ? [''] : [])]);
  styleHeader(compRow);
  ws.mergeCells(areaRow.number, 1, compRow.number, 1);
  ws.mergeCells(areaRow.number, 2, compRow.number, 2);
  ws.mergeCells(areaRow.number, 3, compRow.number, 3);

  const situationLabel: Record<string, string> = { PROMOTED: 'Promovido', RECOVERY: 'Recuperación', RETAINED: 'Permanece', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };
  data.matrix.students.forEach((s, i) => {
    const values = comps.map((x) => s.consolidatedGrades[x.area.code]?.competences[x.comp.id]?.letter ?? '');
    const row = ws.addRow([i + 1, s.studentCode ?? '', s.fullName, ...values, ...(data.period === 'FINAL' ? [s.finalSituation ? situationLabel[s.finalSituation] : ''] : [])]);
    row.eachCell((cell, n) => {
      cell.border = BORDER;
      cell.font = { size: 9, color: s.enrollmentState !== 'REGISTERED' ? { argb: 'FF94A3B8' } : undefined };
      if (n > 3) cell.alignment = { horizontal: 'center' };
      const v = String(cell.value ?? '');
      if (LETTER_FILL[v]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LETTER_FILL[v] } };
    });
  });
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 36;
  for (let i = 4; i <= comps.length + 4; i++) ws.getColumn(i).width = 9;
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: compRow.number }];

  // Detalle por curso hijo (Álgebra, Geometría…) y el promedio del área madre que va al SIAGIE.
  if (data.matrix.courses.length > 0) {
    const wc = wb.addWorksheet('Cursos por área');
    setup(wc);
    const subdivided = data.matrix.consolidatedAreas.filter((a) => a.isSubdivided);
    const blocks = subdivided.map((area) => ({
      area,
      courses: data.matrix.courses.filter((c) => c.officialCode === area.code),
    }));
    const cols: Array<{ group: string; label: string; get: (s: Consolidation['matrix']['students'][number]) => string }> = [];
    for (const b of blocks) {
      for (const c of b.courses) {
        for (const k of c.competences) cols.push({ group: `${c.name} (${b.area.name})`, label: k.name, get: (s) => s.courseGrades[c.id]?.competences[k.id]?.letter ?? '' });
        cols.push({ group: `${c.name} (${b.area.name})`, label: 'Prom.', get: (s) => s.courseGrades[c.id]?.letter ?? '' });
      }
      for (const k of b.area.competences) {
        cols.push({ group: `${b.area.name} — área madre (SIAGIE)`, label: k.shortName, get: (s) => s.consolidatedGrades[b.area.code]?.competences[k.id]?.letter ?? '' });
      }
    }
    titleBlock(wc, [
      data.school?.name ?? 'Colegio',
      `Cursos por área — ${data.classroom.label} — ${data.academicYear.year} — ${periodLabel}`,
      'Cada curso tributa a su área madre; en el SIAGIE solo se reporta el área madre.',
    ], cols.length + 3);
    const groupRow = wc.addRow(['N.°', 'Código', 'Apellidos y nombres', ...cols.map((c) => c.group)]);
    let start = 4;
    while (start < cols.length + 4) {
      let end = start;
      while (end + 1 < cols.length + 4 && cols[end + 1 - 4].group === cols[start - 4].group) end += 1;
      if (end > start) wc.mergeCells(groupRow.number, start, groupRow.number, end);
      start = end + 1;
    }
    styleHeader(groupRow);
    const labelRow = wc.addRow(['', '', '', ...cols.map((c) => c.label)]);
    styleHeader(labelRow);
    wc.mergeCells(groupRow.number, 1, labelRow.number, 1);
    wc.mergeCells(groupRow.number, 2, labelRow.number, 2);
    wc.mergeCells(groupRow.number, 3, labelRow.number, 3);
    data.matrix.students.forEach((s, i) => {
      const row = wc.addRow([i + 1, s.studentCode ?? '', s.fullName, ...cols.map((c) => c.get(s))]);
      row.eachCell((cell, n) => {
        cell.border = BORDER;
        cell.font = { size: 9, color: s.enrollmentState !== 'REGISTERED' ? { argb: 'FF94A3B8' } : undefined };
        if (n > 3) cell.alignment = { horizontal: 'center' };
        const v = String(cell.value ?? '');
        if (LETTER_FILL[v]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LETTER_FILL[v] } };
      });
    });
    wc.getColumn(1).width = 5;
    wc.getColumn(2).width = 16;
    wc.getColumn(3).width = 36;
    for (let i = 4; i <= cols.length + 3; i++) wc.getColumn(i).width = 10;
    wc.views = [{ state: 'frozen', xSplit: 3, ySplit: labelRow.number }];
  }

  if (data.issues.length > 0) {
    const wi = wb.addWorksheet('Observaciones');
    wi.addRow(['Observación']).font = { bold: true };
    data.issues.forEach((i) => wi.addRow([i.message]));
    wi.getColumn(1).width = 110;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildGradebookWorkbook(data: Gradebook, schoolName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool';
  for (const comp of data.competences) {
    const ws = wb.addWorksheet(comp.shortName.slice(0, 28).replace(/[\\/?*[\]:]/g, ' '));
    setup(ws);
    const cols = data.criteria.length + 5;
    titleBlock(ws, [
      schoolName,
      `Registro auxiliar — ${data.assignment.area.name} — ${data.assignment.classroom.grade}.° "${data.assignment.classroom.section}" — Periodo ${data.periodNumber}`,
      `Competencia: ${comp.name}`,
      `Docente: ${data.assignment.teacher.firstName} ${data.assignment.teacher.lastNamePaternal}`,
    ], cols);
    const header = ws.addRow(['N.°', 'Apellidos y nombres', ...data.criteria.map((c) => `${c.shortName}\n(peso ${c.weight})`), 'Sugerido', 'Final', 'Conclusión descriptiva']);
    styleHeader(header);
    data.students.forEach((s, i) => {
      const scores = data.criteria.map((cr) => {
        const g = data.scores.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id && x.criterionId === cr.id);
        return g ? (g.literalScore && g.numericScore === null ? g.literalScore : g.numericScore ?? '') : '';
      });
      const r = data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id);
      const c = data.conclusions.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id);
      const row = ws.addRow([i + 1, s.fullName, ...scores, r?.suggestedLetter ?? '', r?.finalLetter ?? '', c?.conclusion ?? '']);
      row.eachCell((cell, n) => {
        cell.border = BORDER;
        cell.font = { size: 9, color: s.state !== 'REGISTERED' ? { argb: 'FF94A3B8' } : undefined };
        if (n > 2 && n < cols + 1) cell.alignment = { horizontal: 'center' };
        const v = String(cell.value ?? '');
        if (n >= data.criteria.length + 3 && LETTER_FILL[v]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LETTER_FILL[v] } };
      });
    });
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 36;
    for (let i = 3; i <= data.criteria.length + 4; i++) ws.getColumn(i).width = 10;
    ws.getColumn(data.criteria.length + 5).width = 60;
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: header.number }];
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

