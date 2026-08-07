import React, { useState } from 'react';
import {
  School as SchoolIcon,
  Plus,
  BookOpen,
  Users,
  Pencil,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  useClassrooms,
  useCreateClassroom,
  useUpdateClassroom,
  useDeleteClassroom,
  type CreateClassroomPayload,
} from '../api/useClassrooms';
import type { Classroom } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

type LevelTab = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

const LEVEL_CONFIG: Record<
  LevelTab,
  { label: string; description: string; gradeLabels: Record<number, string>; maxGrade: number }
> = {
  INITIAL: {
    label: 'Nivel Inicial (3 a 5 años)',
    description: 'Modalidad Unidocencia: Aprestamiento, desarrollo integral y expresión corporal.',
    gradeLabels: { 3: '3 Años', 4: '4 Años', 5: '5 Años' },
    maxGrade: 5,
  },
  PRIMARY: {
    label: 'Nivel Primaria (1° a 6° Grado)',
    description: 'Primaria Baja (1°-2°) Unidocencia | Primaria Alta (3°-6°) Polidocencia.',
    gradeLabels: {
      1: '1° Grado (Primaria Baja - Unidocencia)',
      2: '2° Grado (Primaria Baja - Unidocencia)',
      3: '3° Grado (Primaria Alta - Polidocencia)',
      4: '4° Grado (Primaria Alta - Polidocencia)',
      5: '5° Grado (Primaria Alta - Polidocencia)',
      6: '6° Grado (Primaria Alta - Polidocencia)',
    },
    maxGrade: 6,
  },
  SECONDARY: {
    label: 'Nivel Secundaria (1° a 5° Año)',
    description: 'Modalidad Polidocencia: Asignaturas especializadas (Álgebra, Química, DPCC, EPT, etc.).',
    gradeLabels: {
      1: '1° Secundaria',
      2: '2° Secundaria',
      3: '3° Secundaria',
      4: '4° Secundaria',
      5: '5° Secundaria',
    },
    maxGrade: 5,
  },
};

export const ClassroomsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<LevelTab>('PRIMARY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateClassroomPayload>({
    educationLevel: 'PRIMARY',
    grade: 1,
    section: 'A',
    shift: 'MORNING',
    capacity: 30,
  });

  const { data: classrooms = [], isLoading, isError, refetch } = useClassrooms();
  const { mutateAsync: createClassroom, isPending: isCreating } = useCreateClassroom();
  const { mutateAsync: updateClassroom, isPending: isUpdating } = useUpdateClassroom();
  const { mutateAsync: deleteClassroom } = useDeleteClassroom();

  const filteredClassrooms = classrooms.filter((c) => c.educationLevel === activeTab);

  const handleOpenCreate = () => {
    setEditingClassroom(null);
    setFormData({
      educationLevel: activeTab,
      grade: activeTab === 'INITIAL' ? 3 : 1,
      section: 'A',
      shift: 'MORNING',
      capacity: 30,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    setEditingClassroom(c);
    setFormData({
      educationLevel: c.educationLevel,
      grade: c.grade,
      section: c.section,
      shift: c.shift,
      capacity: c.capacity,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClassroom) {
        await updateClassroom({ id: editingClassroom.id, payload: formData });
        toast.success(`🏫 Aula ${formData.grade}° "${formData.section}" actualizada correctamente.`);
      } else {
        await createClassroom(formData);
        toast.success(`✨ Aula ${formData.grade}° "${formData.section}" creada exitosamente.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar el aula.');
    }
  };

  const handleDelete = async (c: Classroom) => {
    if (window.confirm(`¿Estás seguro de eliminar el aula ${c.grade}° "${c.section}"?`)) {
      try {
        await deleteClassroom(c.id);
        toast.success('Aula eliminada correctamente.');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error al eliminar el aula.');
      }
    }
  };

  // Quick Seed Generator for default sections A
  const handleQuickSeed = async () => {
    try {
      const gradesToSeed = activeTab === 'INITIAL' ? [3, 4, 5] : activeTab === 'PRIMARY' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      let created = 0;
      for (const g of gradesToSeed) {
        const exists = classrooms.some((c) => c.educationLevel === activeTab && c.grade === g && c.section === 'A');
        if (!exists) {
          await createClassroom({
            educationLevel: activeTab,
            grade: g,
            section: 'A',
            shift: 'MORNING',
            capacity: 30,
          });
          created++;
        }
      }
      toast.success(`Se crearon ${created} aulas de Sección "A" para ${LEVEL_CONFIG[activeTab].label}.`);
    } catch (err: any) {
      toast.error('Error al generar las aulas automáticas.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <SchoolIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Grados Académicos y Aulas (SIAGIE MINEDU)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configuración de Niveles Educativos, Grados, Secciones y Modalidad de Docencia.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={handleQuickSeed}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generar Aulas Sección "A"</span>
            </Button>
            <Button size="sm" className="gap-2 text-xs" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4" />
              <span>Nueva Aula / Sección</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Aulas Registradas</CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{classrooms.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Distribuidas en 3 niveles</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Capacidad Total Alumnos</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {classrooms.reduce((acc, curr) => acc + curr.capacity, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aforo institucional proyectado</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Estructura MINEDU</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">SIAGIE 2026</div>
            <p className="text-xs text-muted-foreground mt-1">Conforme a normativa oficial</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por Nivel Educativo */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 -mb-px">
        {(['INITIAL', 'PRIMARY', 'SECONDARY'] as LevelTab[]).map((level) => (
          <button
            key={level}
            onClick={() => setActiveTab(level)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === level
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{LEVEL_CONFIG[level].label.split(' (')[0]}</span>
          </button>
        ))}
      </div>

      {/* Level Description Banner */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-foreground">{LEVEL_CONFIG[activeTab].label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{LEVEL_CONFIG[activeTab].description}</p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 shrink-0">
          {activeTab === 'INITIAL'
            ? 'UNIDOCENCIA'
            : activeTab === 'PRIMARY'
            ? 'UNIDOCENCIA (1°-2°) / POLIDOCENCIA (3°-6°)'
            : 'POLIDOCENCIA (ASIGNATURAS)'}
        </Badge>
      </div>

      {/* Classrooms List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar las aulas del colegio.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <SchoolIcon className="w-10 h-10 text-primary mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No hay aulas registradas para este nivel</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Haz clic en "Nueva Aula / Sección" o en "Generar Aulas Sección A" para configurar el catálogo escolar de {LEVEL_CONFIG[activeTab].label}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map((c) => {
            const isUnidocencia =
              c.educationLevel === 'INITIAL' || (c.educationLevel === 'PRIMARY' && c.grade <= 2);

            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    c.educationLevel === 'INITIAL'
                      ? 'bg-amber-500'
                      : c.educationLevel === 'PRIMARY'
                      ? 'bg-sky-500'
                      : 'bg-purple-500'
                  }`}
                />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-foreground">
                      {c.grade}° "{c.section}"
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {c.shift === 'MORNING' ? 'Turno Mañana' : c.shift === 'AFTERNOON' ? 'Turno Tarde' : 'Noche'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium">
                    {LEVEL_CONFIG[c.educationLevel].gradeLabels[c.grade] || `${c.grade}° Grado`}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="flex items-center gap-1 text-muted-foreground font-semibold">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Capacidad: <strong className="text-foreground">{c.capacity} alumnos</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isUnidocencia
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {isUnidocencia ? 'Unidocencia' : 'Polidocencia'}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:bg-primary/10 gap-1"
                        onClick={() => handleOpenEdit(c)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Aula */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <SchoolIcon className="w-5 h-5 text-primary" />
              <span>{editingClassroom ? 'Editar Aula / Sección' : 'Nueva Aula / Sección'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Nivel Educativo
                </label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, educationLevel: e.target.value as LevelTab })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="INITIAL">Inicial (3 a 5 años)</option>
                  <option value="PRIMARY">Primaria (1° a 6° Grado)</option>
                  <option value="SECONDARY">Secundaria (1° a 5° Año)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Grado / Edad
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {formData.educationLevel === 'INITIAL' ? (
                      <>
                        <option value={3}>3 Años</option>
                        <option value={4}>4 Años</option>
                        <option value={5}>5 Años</option>
                      </>
                    ) : formData.educationLevel === 'PRIMARY' ? (
                      <>
                        <option value={1}>1° Grado</option>
                        <option value={2}>2° Grado</option>
                        <option value={3}>3° Grado</option>
                        <option value={4}>4° Grado</option>
                        <option value={5}>5° Grado</option>
                        <option value={6}>6° Grado</option>
                      </>
                    ) : (
                      <>
                        <option value={1}>1° Secundaria</option>
                        <option value={2}>2° Secundaria</option>
                        <option value={3}>3° Secundaria</option>
                        <option value={4}>4° Secundaria</option>
                        <option value={5}>5° Secundaria</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Sección
                  </label>
                  <input
                    type="text"
                    required
                    placeholder='Ej: "A", "B", "Única"'
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Turno
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) =>
                      setFormData({ ...formData, shift: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="MORNING">Mañana</option>
                    <option value="AFTERNOON">Tarde</option>
                    <option value="NIGHT">Noche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Capacidad (Aforo)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isCreating || isUpdating} className="gap-2 font-bold">
                  <span>{editingClassroom ? 'Guardar Cambios' : 'Crear Aula'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
