import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, BookOpen, MessageSquare, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChildVirtualClassroomCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-border hover:border-primary/40 transition-all shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>Aula Virtual y Materiales</span>
          </CardTitle>
          <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Bimestral
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Accede a las diapositivas de clase (PPT), lecturas PDF, tareas escolares y debates en foros.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-muted/40 border border-border">
            <BookOpen className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
            <span className="block font-semibold text-[11px] text-foreground">Clases</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 border border-border">
            <FileText className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
            <span className="block font-semibold text-[11px] text-foreground">Tareas</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 border border-border">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
            <span className="block font-semibold text-[11px] text-foreground">Foros</span>
          </div>
        </div>

        <Button
          onClick={() => navigate('/virtual-classroom')}
          size="sm"
          className="w-full text-xs font-bold gap-1.5 shadow-sm justify-between"
        >
          <span>Ingresar a Mis Cursos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};
