import React, { useState } from 'react';
import { BookOpen, Check, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StudentGradeRow {
  studentId: string;
  studentName: string;
  code: string;
  scores: Record<string, number>; // competenceName -> numericScore
}

// Convert numeric score to MINEDU SIAGIE Letter Grade
const getSiagieLetter = (score: number) => {
  if (score >= 17.5) return { letter: 'AD', variant: 'success' as const };
  if (score >= 14.0) return { letter: 'A', variant: 'default' as const };
  if (score >= 11.0) return { letter: 'B', variant: 'warning' as const };
  return { letter: 'C', variant: 'destructive' as const };
};

export const ExcelGradesGrid: React.FC = () => {
  const [isSaved, setIsSaved] = useState(false);

  // Mock initial dataset representing an active classroom's Excel grade sheet
  const [competences] = useState([
    'Resuelve problemas de cantidad',
    'Resuelve problemas de forma y movimiento',
    'Gestiona datos e incertidumbre',
  ]);

  const [rows, setRows] = useState<StudentGradeRow[]>([
    {
      studentId: '1',
      studentName: 'Flores Quispe, Carlos Eduardo',
      code: '20261099238123',
      scores: {
        'Resuelve problemas de cantidad': 18.5,
        'Resuelve problemas de forma y movimiento': 15.0,
        'Gestiona datos e incertidumbre': 14.0,
      },
    },
    {
      studentId: '2',
      studentName: 'García Rodríguez, Lucía Valeria',
      code: '20261099238124',
      scores: {
        'Resuelve problemas de cantidad': 12.5,
        'Resuelve problemas de forma y movimiento': 11.0,
        'Gestiona datos e incertidumbre': 13.5,
      },
    },
    {
      studentId: '3',
      studentName: 'Mamani Huanca, Miguel Ángel',
      code: '20261099238125',
      scores: {
        'Resuelve problemas de cantidad': 9.0,
        'Resuelve problemas de forma y movimiento': 10.5,
        'Gestiona datos e incertidumbre': 8.5,
      },
    },
    {
      studentId: '4',
      studentName: 'Sánchez López, Sofía Isabella',
      code: '20261099238126',
      scores: {
        'Resuelve problemas de cantidad': 19.0,
        'Resuelve problemas de forma y movimiento': 18.0,
        'Gestiona datos e incertidumbre': 17.5,
      },
    },
  ]);

  const handleScoreChange = (studentId: string, comp: string, val: string) => {
    const numeric = parseFloat(val);
    if (isNaN(numeric) || numeric < 0 || numeric > 20) return;

    setIsSaved(false);
    setRows((prev) =>
      prev.map((row) => {
        if (row.studentId === studentId) {
          return {
            ...row,
            scores: {
              ...row.scores,
              [comp]: numeric,
            },
          };
        }
        return row;
      })
    );
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Registro de Notas Tipo Excel — Bimestre I</span>
        </div>

        <Button size="sm" onClick={handleSave} className="gap-2">
          {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? '¡Notas Guardadas!' : 'Guardar Cambios'}</span>
        </Button>
      </div>

      {/* Grid */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="min-w-[650px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="w-64 font-bold text-xs uppercase">Estudiante SIAGIE</TableHead>
              {competences.map((comp, idx) => (
                <TableHead key={idx} className="font-bold text-xs uppercase text-center min-w-[160px]">
                  {comp}
                </TableHead>
              ))}
              <TableHead className="w-24 font-bold text-xs uppercase text-center">Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const scoreValues = Object.values(row.scores);
              const avg = scoreValues.length
                ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
                : 0;
              const avgSiagie = getSiagieLetter(avg);

              return (
                <TableRow key={row.studentId} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="font-medium text-sm">{row.studentName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{row.code}</div>
                  </TableCell>

                  {competences.map((comp) => {
                    const currentScore = row.scores[comp] ?? 0;
                    const siagie = getSiagieLetter(currentScore);

                    return (
                      <TableCell key={comp} className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(row.studentId, comp, e.target.value)}
                            className="w-14 h-8 text-center font-mono font-semibold rounded border border-input bg-background focus:ring-1 focus:ring-ring text-sm"
                          />
                          <Badge variant={siagie.variant} className="w-8 justify-center text-[10px]">
                            {siagie.letter}
                          </Badge>
                        </div>
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-center font-bold">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-mono">{avg.toFixed(1)}</span>
                      <Badge variant={avgSiagie.variant} className="text-[9px] px-1 py-0 mt-0.5">
                        {avgSiagie.letter}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
