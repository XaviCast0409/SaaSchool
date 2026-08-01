import React, { useState } from 'react';
import { CalendarCheck, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAttendance } from '../api/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export const AttendancePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const { data: attendanceList = [], isLoading } = useAttendance(selectedDate);

  const presentCount = attendanceList.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendanceList.filter((a) => a.status.startsWith('ABSENT')).length;
  const lateCount = attendanceList.filter((a) => a.status.startsWith('LATE')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Control de Asistencia Diario
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Registro y reporte en vivo de asistencia escolar.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <CalendarIcon className="w-4 h-4 text-muted-foreground ml-2" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 border-none bg-transparent text-xs font-semibold focus-visible:ring-0"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Presentes</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {presentCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Alumnos asistieron</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Faltas</CardTitle>
            <XCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{absentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Justificadas e Injustificadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Tardanzas</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lateCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Llegadas fuera de hora</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records Table */}
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase">Estudiante</TableHead>
                <TableHead className="text-xs font-bold uppercase">Fecha</TableHead>
                <TableHead className="text-xs font-bold uppercase">Estado Asistencia</TableHead>
                <TableHead className="text-xs font-bold uppercase">Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceList.length ? (
                attendanceList.map((item) => {
                  const student = item.enrollment?.student;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {student
                            ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
                            : 'Estudiante'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('es-PE')}
                      </TableCell>
                      <TableCell>
                        {item.status === 'PRESENT' && <Badge variant="success">PRESENTE</Badge>}
                        {item.status === 'ABSENT_JUSTIFIED' && <Badge variant="warning">FALTA JUSTIFICADA</Badge>}
                        {item.status === 'ABSENT_UNJUSTIFIED' && <Badge variant="destructive">FALTA INJUSTIFICADA</Badge>}
                        {item.status.startsWith('LATE') && <Badge variant="outline">TARDANZA</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No hay asistencia registrada para la fecha seleccionada ({selectedDate}).
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
