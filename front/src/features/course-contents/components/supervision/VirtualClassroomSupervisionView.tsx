import React, { useState } from 'react';
import {
  GraduationCap,
  BarChart3,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSupervisionStats,
  useTeacherCompliance,
  useSupervisedFeed,
  useDeleteSupervisedContent,
} from '../../api/useSupervisionContents';
import { SupervisionMetricsCards } from './SupervisionMetricsCards';
import { TeacherComplianceTable } from './TeacherComplianceTable';
import { SupervisionFilterBar } from './SupervisionFilterBar';
import { SupervisedFeedList } from './SupervisedFeedList';
import type { SupervisionFeedFilters } from '../../types';

export const VirtualClassroomSupervisionView: React.FC = () => {
  const [selectedBimester, setSelectedBimester] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'feed'>('analytics');

  const [feedFilters, setFeedFilters] = useState<SupervisionFeedFilters>({
    bimester: selectedBimester || undefined,
    page: 1,
    limit: 18,
  });

  const { data: stats, isLoading: loadingStats } = useSupervisionStats(selectedBimester);
  const { data: teachers = [], isLoading: loadingTeachers } = useTeacherCompliance(selectedBimester);
  const { data: feedData, isLoading: loadingFeed } = useSupervisedFeed(feedFilters);
  const deleteMutation = useDeleteSupervisedContent();

  const handleBimesterChange = (bimester: number | null) => {
    setSelectedBimester(bimester);
    setFeedFilters((prev) => ({
      ...prev,
      bimester: bimester || undefined,
      page: 1,
    }));
  };

  const handleFilterByTeacher = (teacherId: string) => {
    setFeedFilters((prev) => ({
      ...prev,
      teacherId,
      page: 1,
    }));
    setActiveTab('feed');
  };

  const handleDeleteContent = async (id: string) => {
    const confirm = window.confirm(
      '¿Estás seguro de que deseas eliminar esta publicación? Los alumnos y el docente ya no podrán verla ni descargar el archivo.',
    );
    if (!confirm) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Publicación eliminada correctamente.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al eliminar la publicación.');
    }
  };

  const teacherOptions = React.useMemo(() => {
    return teachers.map((t) => ({ id: t.id, fullName: t.fullName }));
  }, [teachers]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Supervisión de Aula Virtual
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoría pedagógica, analítica de adopción docente y repositorio escolar de materiales digitales.
          </p>
        </div>

        {/* Filtro Global de Periodo / Bimestre */}
        <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm">
          <Calendar className="w-4 h-4 text-primary ml-1.5 shrink-0" />
          <span className="text-xs font-bold text-muted-foreground mr-1">Periodo:</span>
          <select
            value={selectedBimester || ''}
            onChange={(e) => handleBimesterChange(e.target.value ? Number(e.target.value) : null)}
            className="h-8 rounded-lg border-0 bg-muted/60 px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">Todo el Año Lectivo</option>
            <option value="1">1° Bimestre</option>
            <option value="2">2° Bimestre</option>
            <option value="3">3° Bimestre</option>
            <option value="4">4° Bimestre</option>
          </select>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analítica y Cumplimiento Docente</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'feed'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Explorador de Materiales y Tareas</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          <SupervisionMetricsCards stats={stats} isLoading={loadingStats} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Monitoreo de Cumplimiento por Docente
                </h2>
                <p className="text-xs text-muted-foreground">
                  Semáforo de avance según cursos asignados y material cargado en plataforma.
                </p>
              </div>
            </div>

            <TeacherComplianceTable
              teachers={teachers}
              isLoading={loadingTeachers}
              onFilterByTeacher={handleFilterByTeacher}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SupervisionFilterBar
            filters={feedFilters}
            onChange={setFeedFilters}
            teachers={teacherOptions}
          />

          <SupervisedFeedList
            items={feedData?.items || []}
            total={feedData?.total || 0}
            page={feedData?.page || 1}
            totalPages={feedData?.totalPages || 1}
            isLoading={loadingFeed}
            onPageChange={(page) => setFeedFilters((prev) => ({ ...prev, page }))}
            onDelete={handleDeleteContent}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      )}
    </div>
  );
};
