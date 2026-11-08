import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  Award,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Power,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  useCurricularAreas,
  useCurricularAreasPaginated,
  useCreateCurricularArea,
  useUpdateCurricularArea,
  useDeleteCurricularArea,
  useCreateCompetence,
  useDeleteCompetence,
  useToggleCompetence,
  useLoadDefaultCompetences,
  useSeedMineduCurriculum,
  type CurricularArea,
  type CurricularCompetence,
} from '../api/useCurricularAreas';
import {
  useCourseCatalog,
  groupCoursesByCategory,
  type EducationLevel,
} from '@/features/catalog/api/useCatalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCatalogSelect } from '../components/CourseCatalogSelect';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

type LevelCategory = 'ALL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY';

/**
 * Determina el nivel educativo de un área según su código oficial o nombre.
 */
export function getAreaLevel(area: { name: string; officialCode?: string | null }): 'INITIAL' | 'PRIMARY' | 'SECONDARY' {
  const code = (area.officialCode || '').toUpperCase();
  const name = (area.name || '').toLowerCase();

  // Nivel Inicial
  if (code.includes('-INI') || code.startsWith('INI-') || name.includes('inicial')) {
    return 'INITIAL';
  }
  // Nivel Primaria
  if (code.includes('-PRI') || code.startsWith('PRI-') || name.includes('primaria')) {
    return 'PRIMARY';
  }
  // Nivel Secundaria
  if (
    code.includes('-SEC') ||
    code.startsWith('MAT-') ||
    code.startsWith('COM-') ||
    code.startsWith('CCSS-') ||
    code.startsWith('CT-') ||
    code.startsWith('DPCC-') ||
    code.startsWith('EPT-') ||
    code.startsWith('AYC-') ||
    code.startsWith('EF-') ||
    code.startsWith('ER-') ||
    code.startsWith('TOE-') ||
    code.startsWith('RAZ-') ||
    name.includes('secundaria')
  ) {
    return 'SECONDARY';
  }

  // Fallback para códigos base (MAT, COM, CYT, PS, ING)
  return 'PRIMARY';
}

export const CurricularAreasPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeCategory, setActiveCategory] = useState<LevelCategory>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_LIMIT = 8;

  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);

  // Modals
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<CurricularArea | null>(null);
  const [isCompetenceModalOpen, setIsCompetenceModalOpen] = useState(false);
  const [targetAreaIdForCompetence, setTargetAreaIdForCompetence] = useState<string | null>(null);

  // Form State para la creación / edición
  const [areaMode, setAreaMode] = useState<'OFFICIAL' | 'SUB_AREA'>('OFFICIAL');
  const [modalLevel, setModalLevel] = useState<EducationLevel>('PRIMARY');
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('');
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [subCourseName, setSubCourseName] = useState<string>('');
  const [parentAreaId, setParentAreaId] = useState<string>('');
  const [evaluatedCompIds, setEvaluatedCompIds] = useState<string[]>([]);

  // Form State para la edición directa
  const [editForm, setEditForm] = useState({ name: '', officialCode: '' });

  // Form State Competencia individual
  const [competenceForm, setCompetenceForm] = useState({ name: '', description: '' });

  // Cargar catálogo de cursos según el nivel seleccionado en el modal
  const { data: catalogCourses = [] } = useCourseCatalog(modalLevel);
  const coursesByCategory = useMemo(() => groupCoursesByCategory(catalogCourses), [catalogCourses]);

  // Consulta paginada desde Backend
  const { data: paginatedResponse, isLoading, isError, refetch } = useCurricularAreasPaginated(
    currentPage,
    PAGE_LIMIT,
    activeCategory,
  );

  // Consulta de todas las áreas (para totales generales de KPIs y selección de Área Madre)
  const { data: allAreas = [] } = useCurricularAreas();

  // Filtrar áreas oficiales madre (parentAreaId === null)
  const motherAreas = useMemo(() => allAreas.filter((a) => !a.parentAreaId), [allAreas]);
  const availableMotherAreas = useMemo(() => {
    const filtered = motherAreas.filter((a) => (a.level || getAreaLevel(a)) === modalLevel);
    return filtered.length > 0 ? filtered : motherAreas;
  }, [motherAreas, modalLevel]);

  const selectedMotherArea = useMemo(
    () => motherAreas.find((a) => a.id === parentAreaId),
    [motherAreas, parentAreaId],
  );

  const areas = paginatedResponse?.data || [];
  const meta = paginatedResponse?.meta;

  const { mutateAsync: createArea, isPending: isCreatingArea } = useCreateCurricularArea();
  const { mutateAsync: updateArea, isPending: isUpdatingArea } = useUpdateCurricularArea();
  const { mutateAsync: deleteArea } = useDeleteCurricularArea();
  const { mutateAsync: createCompetence, isPending: isCreatingCompetence } = useCreateCompetence();
  const { mutateAsync: deleteCompetence } = useDeleteCompetence();
  const { mutateAsync: toggleCompetence, isPending: isTogglingCompetence } = useToggleCompetence();
  const { mutateAsync: loadDefaultCompetences, isPending: isLoadingDefaults } = useLoadDefaultCompetences();
  const { mutateAsync: seedMinedu, isPending: isSeeding } = useSeedMineduCurriculum();

  const handleCategoryChange = (category: LevelCategory) => {
    setActiveCategory(category);
    setCurrentPage(1); // Reiniciar a la página 1 al cambiar de nivel
  };

  const handleSeedMinedu = async () => {
    try {
      const res = await seedMinedu();
      toast.success(res.message || 'Malla curricular oficial MINEDU precargada con éxito.');
      refetch();
    } catch {
      toast.error('Error al precargar la malla MINEDU SIAGIE.');
    }
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArea) {
        await updateArea({
          id: editingArea.id,
          payload: {
            name: editForm.name,
            officialCode: editForm.officialCode || undefined,
            parentAreaId: areaMode === 'SUB_AREA' ? parentAreaId : null,
            evaluatedCompetenceIds: areaMode === 'SUB_AREA' ? evaluatedCompIds : [],
          },
        });
        toast.success('Asignatura / Sub-curso actualizado correctamente.');
      } else {
        if (areaMode === 'SUB_AREA') {
          if (!subCourseName.trim()) {
            toast.error('Ingresa el nombre del sub-curso o rama interna.');
            return;
          }
          if (!parentAreaId) {
            toast.error('Selecciona el Área Oficial Madre.');
            return;
          }
          await createArea({
            name: subCourseName.trim(),
            level: modalLevel,
            parentAreaId,
            evaluatedCompetenceIds: evaluatedCompIds,
          });
          toast.success('✨ Sub-curso registrado con vinculación oficial al Área Madre.');
        } else {
          let finalName = '';
          let finalCode = '';

          if (selectedCourseCode === 'CUSTOM') {
            if (!customCourseName.trim()) {
              toast.error('Ingresa el nombre del curso personalizado o taller.');
              return;
            }
            finalName = customCourseName.trim();
            finalCode = 'CUSTOM';
          } else {
            const selectedCourse = catalogCourses.find((c) => c.officialCode === selectedCourseCode);
            if (!selectedCourse) {
              toast.error('Selecciona un curso válido del catálogo.');
              return;
            }
            finalName = selectedCourse.name;
            finalCode = selectedCourse.officialCode;
          }

          await createArea({ name: finalName, officialCode: finalCode, level: modalLevel });
          toast.success('✨ Asignatura oficial creada con sus competencias SIAGIE autogeneradas.');
        }
      }
      setIsAreaModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar el área.');
    }
  };

  const handleDeleteArea = async (a: CurricularArea) => {
    if (window.confirm(`¿Deseas eliminar el área "${a.name}"?`)) {
      try {
        await deleteArea(a.id);
        toast.success('Área curricular eliminada.');
        refetch();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error al eliminar el área.');
      }
    }
  };

  const handleAddCompetence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAreaIdForCompetence) return;
    try {
      await createCompetence({
        areaId: targetAreaIdForCompetence,
        name: competenceForm.name,
        description: competenceForm.description || undefined,
      });
      toast.success('Competencia SIAGIE agregada al área.');
      setIsCompetenceModalOpen(false);
      setCompetenceForm({ name: '', description: '' });
      refetch();
    } catch {
      toast.error('Error al agregar la competencia.');
    }
  };

  const handleDeleteCompetence = async (comp: { id: string; name: string }) => {
    if (window.confirm(`¿Deseas eliminar la competencia "${comp.name}" de este curso?`)) {
      try {
        await deleteCompetence(comp.id);
        toast.success('Competencia eliminada del curso.');
        refetch();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error al eliminar la competencia.');
      }
    }
  };

  const handleToggleCompetence = async (comp: CurricularCompetence) => {
    try {
      const res = await toggleCompetence(comp.id);
      const isNowActive = res.data.isActive ?? true;
      toast.success(
        isNowActive
          ? `Competencia activada para este curso.`
          : `Competencia desactivada (se ocultará en la matriz de notas).`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado de la competencia.');
    }
  };

  const handleSyncOfficialCompetences = async (areaId: string, areaName: string) => {
    try {
      const res = await loadDefaultCompetences(areaId);
      toast.success(`Se sincronizaron ${res.data.copied} competencias en "${areaName}".`);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar competencias oficiales.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Cursos y Áreas Curriculares
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión del plan de estudios con paginación y competencias oficiales autogeneradas.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              onClick={handleSeedMinedu}
              disabled={isSeeding}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isSeeding ? 'Precargando...' : 'Precargar Malla Oficial MINEDU'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold border-primary/30 hover:bg-primary/5 text-foreground"
              onClick={() => {
                setEditingArea(null);
                setAreaMode('SUB_AREA');
                setModalLevel('SECONDARY');
                setSubCourseName('');
                setParentAreaId(availableMotherAreas[0]?.id || '');
                setEvaluatedCompIds([]);
                setIsAreaModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 text-primary" />
              <span>Agregar Sub-curso / Rama</span>
            </Button>
            <Button
              size="sm"
              className="gap-2 text-xs font-bold"
              onClick={() => {
                setEditingArea(null);
                setAreaMode('OFFICIAL');
                setModalLevel('PRIMARY');
                setSelectedCourseCode('');
                setCustomCourseName('');
                setIsAreaModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Curso Oficial</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Áreas Registradas</CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{allAreas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Plan curricular activo</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Competencias Evaluables</CardTitle>
            <Award className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {allAreas.reduce((acc, curr) => acc + (curr.competences?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Criterios SIAGIE autogenerados</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Normativa Oficial</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">Currículo 2026</div>
            <p className="text-xs text-muted-foreground mt-1">Perú MINEDU SIAGIE</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por Nivel Educativo */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 -mb-px">
        {[
          { key: 'ALL', label: 'Todas las Asignaturas' },
          { key: 'INITIAL', label: 'Inicial (3-5 Años)' },
          { key: 'PRIMARY', label: 'Primaria (1°-6° Grado)' },
          { key: 'SECONDARY', label: 'Secundaria (1°-5° Año)' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleCategoryChange(tab.key as LevelCategory)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${activeCategory === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Lista Paginada de Áreas Curriculares */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar las áreas curriculares.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : areas.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <BookOpen className="w-10 h-10 text-primary mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No hay cursos en esta categoría</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Haz clic en <strong className="text-foreground">"Agregar Curso Oficial"</strong> para seleccionar una asignatura desde el catálogo MINEDU o en <strong className="text-foreground">"Precargar Malla Oficial MINEDU"</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {areas.map((area) => {
              const isExpanded = expandedAreaId === area.id;
              const level = getAreaLevel(area);
              const isMotherArea = !area.parentAreaId;
              const subCourses = allAreas.filter((s) => s.parentAreaId === area.id);

              return (
                <Card key={area.id} className="bg-card hover:border-primary/40 transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{area.name}</span>
                          {area.officialCode && (
                            <Badge variant="outline" className="font-mono text-[10px] bg-secondary">
                              {area.officialCode}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold ${level === 'INITIAL'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : level === 'SECONDARY'
                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              }`}
                          >
                            {level === 'INITIAL'
                              ? 'Inicial (Unidocencia)'
                              : level === 'SECONDARY'
                                ? 'Secundaria (Polidocencia)'
                                : 'Primaria (Polidocencia/Unidocencia)'}
                          </Badge>
                          {isMotherArea ? (
                            <Badge variant="outline" className="text-[10px] font-bold border-primary/40 bg-primary/10 text-primary">
                              Área Madre Oficial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              Sub-curso de: {area.parentArea?.name || 'Área Madre'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Award className="w-3 h-3 text-emerald-500" />
                          <span>{area.competences?.length || 0} competencias oficiales evaluables</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isAdmin && (
                          <>
                            {isMotherArea && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                                onClick={() => {
                                  setEditingArea(null);
                                  setAreaMode('SUB_AREA');
                                  setParentAreaId(area.id);
                                  setModalLevel(level);
                                  setSubCourseName('');
                                  setEvaluatedCompIds([]);
                                  setIsAreaModalOpen(true);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Sub-curso</span>
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => {
                                setTargetAreaIdForCompetence(area.id);
                                setCompetenceForm({ name: '', description: '' });
                                setIsCompetenceModalOpen(true);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 text-primary" />
                              <span>Competencia</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingArea(area);
                                setEditForm({
                                  name: area.name,
                                  officialCode: area.officialCode || '',
                                });
                                if (area.parentAreaId) {
                                  setAreaMode('SUB_AREA');
                                  setParentAreaId(area.parentAreaId);
                                  setEvaluatedCompIds(area.evaluatedCompetenceIds || []);
                                } else {
                                  setAreaMode('OFFICIAL');
                                }
                                setIsAreaModalOpen(true);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteArea(area)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground"
                          onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Sub-cursos Asociados (Jerarquía CNEB) */}
                    {isMotherArea && subCourses.length > 0 && (
                      <div className="pt-2.5 border-t border-border/60">
                        <div className="flex items-center justify-between pb-2">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span>Sub-cursos / Ramas del Área ({subCourses.length})</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {subCourses.map((sub) => {
                            const hasSpecificComps = sub.evaluatedCompetenceIds && sub.evaluatedCompetenceIds.length > 0;
                            return (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl border border-border bg-muted/30 flex flex-col justify-between gap-1.5"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-xs text-foreground truncate">{sub.name}</span>
                                  {isAdmin && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                          setEditingArea(sub);
                                          setEditForm({ name: sub.name, officialCode: sub.officialCode || '' });
                                          setAreaMode('SUB_AREA');
                                          setParentAreaId(area.id);
                                          setEvaluatedCompIds(sub.evaluatedCompetenceIds || []);
                                          setIsAreaModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteArea(sub)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap text-[10px]">
                                  {hasSpecificComps ? (
                                    sub.evaluatedCompetenceIds!.map((cid, i) => {
                                      const compObj = area.competences?.find((c) => c.id === cid);
                                      return (
                                        <Badge
                                          key={cid}
                                          variant="secondary"
                                          className="text-[9px] px-1.5 py-0 font-mono font-bold bg-primary/10 text-primary border border-primary/20"
                                          title={compObj?.name || `Competencia ${i + 1}`}
                                        >
                                          C{i + 1}
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                                      Evalúa todas
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Competencias Subpanel */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-dashed border-border space-y-3 bg-muted/20 p-3.5 rounded-xl">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-primary" />
                              <span>
                                Competencias del Curso (
                                {area.competences?.filter((c) => c.isActive !== false).length || 0} Activas de{' '}
                                {area.competences?.length || 0}
                                )
                              </span>
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Activa o desactiva las competencias según el curso (ej. Álgebra vs Geometría). El docente solo verá y calificará las competencias <strong className="text-foreground">Activas</strong>.
                            </p>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-border bg-card hover:bg-secondary text-foreground"
                                title="Cargar competencias oficiales MINEDU para este curso"
                                onClick={() => handleSyncOfficialCompetences(area.id, area.name)}
                                disabled={isLoadingDefaults}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Cargar Oficiales MINEDU</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-primary border-primary/20 hover:bg-primary/10"
                                onClick={() => {
                                  setTargetAreaIdForCompetence(area.id);
                                  setIsCompetenceModalOpen(true);
                                }}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Nueva</span>
                              </Button>
                            </div>
                          )}
                        </div>

                        {area.competences && area.competences.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {area.competences.map((comp) => {
                              const isActive = comp.isActive !== false;
                              return (
                                <div
                                  key={comp.id}
                                  className={`p-3 rounded-xl border text-xs space-y-2 transition-all flex flex-col justify-between ${
                                    isActive
                                      ? 'bg-card border-border shadow-xs'
                                      : 'bg-muted/40 border-dashed border-border/70 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                                        {isActive ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        )}
                                        <span className={`truncate ${!isActive ? 'line-through text-muted-foreground' : ''}`}>
                                          {comp.name}
                                        </span>
                                      </div>
                                      {comp.description && (
                                        <div className="text-[11px] text-muted-foreground pl-5 line-clamp-2">
                                          {comp.description}
                                        </div>
                                      )}
                                    </div>

                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        title="Eliminar permanentemente del curso"
                                        onClick={() => handleDeleteCompetence(comp)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Barra de Estado y Botón Activar / Desactivar */}
                                  {isAdmin && (
                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[11px]">
                                      <span
                                        className={`font-semibold flex items-center gap-1 ${
                                          isActive
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {isActive ? '● En uso (Visible al docente)' : '○ Desactivada (Oculta)'}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleCompetence(comp)}
                                        disabled={isTogglingCompetence}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${
                                          isActive
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                                            : 'bg-muted text-foreground border border-border hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20'
                                        }`}
                                        title={
                                          isActive
                                            ? 'Clic para desactivar esta competencia en este curso'
                                            : 'Clic para activar esta competencia en este curso'
                                        }
                                      >
                                        <Power className="w-3 h-3" />
                                        <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-card rounded-lg border border-dashed border-border p-3">
                            <p className="text-xs text-muted-foreground italic mb-2">
                              Este curso aún no tiene competencias registradas.
                            </p>
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs font-semibold gap-1.5"
                                onClick={() => handleSyncOfficialCompetences(area.id, area.name)}
                                disabled={isLoadingDefaults}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Cargar Competencias Oficiales MINEDU</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bar de Paginación */}
          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border mt-6">
              <p className="text-xs text-muted-foreground font-medium">
                Mostrando <span className="font-bold text-foreground">{(meta.page - 1) * meta.limit + 1}</span> a{' '}
                <span className="font-bold text-foreground">{Math.min(meta.page * meta.limit, meta.total)}</span> de{' '}
                <span className="font-bold text-foreground">{meta.total}</span> asignaturas
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: meta.totalPages }, (_, index) => {
                    const pageNum = index + 1;
                    const isCurrent = pageNum === meta.page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${isCurrent
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(meta.totalPages, prev + 1))}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear mediante Catálogo / Sub-curso / Editar Área */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-auto sm:my-0">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>
                {editingArea
                  ? editingArea.parentAreaId
                    ? 'Editar Sub-curso / Rama Interna'
                    : 'Editar Asignatura Oficial'
                  : areaMode === 'SUB_AREA'
                  ? 'Nuevo Sub-curso / Rama Interna'
                  : 'Agregar Curso Oficial (Catálogo SIAGIE)'}
              </span>
            </h2>

            {!editingArea && (
              <div className="flex rounded-xl bg-secondary p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setAreaMode('OFFICIAL')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    areaMode === 'OFFICIAL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🏛️ Área Oficial Madre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAreaMode('SUB_AREA');
                    if (!parentAreaId && availableMotherAreas.length > 0) {
                      setParentAreaId(availableMotherAreas[0].id);
                    }
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    areaMode === 'SUB_AREA' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🌿 Sub-curso / Rama Interna
                </button>
              </div>
            )}

            <form onSubmit={handleSaveArea} className="space-y-4">
              {editingArea ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      Nombre del Curso / Sub-curso *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {!editingArea.parentAreaId ? (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                        Código Oficial MINEDU (Opcional)
                      </label>
                      <input
                        type="text"
                        value={editForm.officialCode}
                        onChange={(e) => setEditForm({ ...editForm, officialCode: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                      />
                    </div>
                  ) : (
                    selectedMotherArea && selectedMotherArea.competences && selectedMotherArea.competences.length > 0 && (
                      <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
                        <label className="text-xs font-bold text-foreground block">
                          Competencias Evaluables del Área Madre:
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Marca las competencias que este sub-curso evaluará. Si dejas todas sin marcar, evaluará todas las competencias del área madre.
                        </p>
                        <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                          {selectedMotherArea.competences.map((c, idx) => {
                            const checked = evaluatedCompIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/80 text-xs cursor-pointer hover:bg-secondary/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEvaluatedCompIds([...evaluatedCompIds, c.id]);
                                    } else {
                                      setEvaluatedCompIds(evaluatedCompIds.filter((id) => id !== c.id));
                                    }
                                  }}
                                  className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="font-mono text-[11px] font-bold text-primary">C{idx + 1}</span>
                                <span className="font-medium text-foreground">{c.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </>
              ) : areaMode === 'SUB_AREA' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      1. Nivel Educativo *
                    </label>
                    <select
                      value={modalLevel}
                      onChange={(e) => {
                        const newLvl = e.target.value as EducationLevel;
                        setModalLevel(newLvl);
                        const forLvl = motherAreas.filter((a) => (a.level || getAreaLevel(a)) === newLvl);
                        setParentAreaId(forLvl[0]?.id || motherAreas[0]?.id || '');
                        setEvaluatedCompIds([]);
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="INITIAL">Inicial (3 a 5 Años)</option>
                      <option value="PRIMARY">Primaria (1° a 6° Grado)</option>
                      <option value="SECONDARY">Secundaria (1° a 5° Año)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      2. Área Madre Oficial a la que pertenece *
                    </label>
                    <select
                      value={parentAreaId}
                      required
                      onChange={(e) => {
                        setParentAreaId(e.target.value);
                        setEvaluatedCompIds([]);
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Selecciona el Área Oficial --</option>
                      {availableMotherAreas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.officialCode || m.officialAreaCode || 'OFICIAL'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      3. Nombre del Sub-curso o Rama Interna *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder='Ej: "Aritmética", "Álgebra", "Geometría", "Física", "Biología"'
                      value={subCourseName}
                      onChange={(e) => setSubCourseName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {selectedMotherArea && selectedMotherArea.competences && selectedMotherArea.competences.length > 0 && (
                    <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground">
                          Competencias que evaluará este sub-curso:
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          {evaluatedCompIds.length === 0 ? 'Evalúa todas' : `${evaluatedCompIds.length} seleccionadas`}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Marca las competencias específicas. Si no marcas ninguna, evaluará todas las competencias del Área Madre.
                      </p>
                      <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                        {selectedMotherArea.competences.map((c, idx) => {
                          const checked = evaluatedCompIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/80 text-xs cursor-pointer hover:bg-secondary/50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEvaluatedCompIds([...evaluatedCompIds, c.id]);
                                  } else {
                                    setEvaluatedCompIds(evaluatedCompIds.filter((id) => id !== c.id));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="font-mono text-[11px] font-bold text-primary">C{idx + 1}</span>
                              <span className="font-medium text-foreground">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Consolidación SIAGIE Automática:</strong> Las notas de este sub-curso se promediarán directamente con las de los demás sub-cursos en las competencias de su Área Madre oficial.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      1. Selecciona el Nivel Educativo *
                    </label>
                    <select
                      value={modalLevel}
                      onChange={(e) => {
                        setModalLevel(e.target.value as EducationLevel);
                        setSelectedCourseCode('');
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="INITIAL">Inicial (3 a 5 Años)</option>
                      <option value="PRIMARY">Primaria (1° a 6° Grado)</option>
                      <option value="SECONDARY">Secundaria (1° a 5° Año)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                      2. Selecciona el Curso / Área del Catálogo MINEDU *
                    </label>
                    <CourseCatalogSelect
                      value={selectedCourseCode}
                      onChange={setSelectedCourseCode}
                      coursesByCategory={coursesByCategory}
                      catalogCourses={catalogCourses}
                    />
                  </div>

                  {selectedCourseCode === 'CUSTOM' && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                      <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">
                        Nombre del Taller / Curso Personalizado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder='Ej: "Taller de Robótica", "Oratoria", "Ajedrez"'
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Competencias Automáticas:</strong> Al guardar, el sistema asociará automáticamente las competencias oficiales CNEB correspondientes para este nivel.
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAreaModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isCreatingArea || isUpdatingArea} className="gap-2 font-bold">
                  <span>Guardar Curso</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Competencia Adicional */}
      {isCompetenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <span>Nueva Competencia SIAGIE Adicional</span>
            </h2>

            <form onSubmit={handleAddCompetence} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Nombre de la Competencia *
                </label>
                <input
                  type="text"
                  required
                  placeholder='Ej: "Resuelve problemas de cantidad"'
                  value={competenceForm.name}
                  onChange={(e) => setCompetenceForm({ ...competenceForm, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Descripción / Desempeño Esperado
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalle o capacidad evaluable..."
                  value={competenceForm.description}
                  onChange={(e) => setCompetenceForm({ ...competenceForm, description: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCompetenceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isCreatingCompetence} className="gap-2 font-bold">
                  <span>Agregar Competencia</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
