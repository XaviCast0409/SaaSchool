import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, Save, Info } from 'lucide-react';
import { useGradingScale, useUpdateGradingScale } from '../api/useGradingScale';
import { toast } from 'sonner';

export const GradingScaleCard: React.FC = () => {
  const [level, setLevel] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const { data: scale, isLoading } = useGradingScale(level);
  const updateMutation = useUpdateGradingScale();

  const [ad, setAd] = useState<number>(18);
  const [a, setA] = useState<number>(14);
  const [b, setB] = useState<number>(11);

  useEffect(() => {
    if (scale) {
      setAd(scale.AD);
      setA(scale.A);
      setB(scale.B);
    }
  }, [scale]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (ad <= a || a <= b || b < 0 || ad > 20) {
      toast.error('Los umbrales deben cumplir la condición: 20 ≥ AD > A > B ≥ 0');
      return;
    }

    updateMutation.mutate({
      level,
      AD: Number(ad),
      A: Number(a),
      B: Number(b),
    });
  };

  return (
    <Card className="p-6 border-border bg-card shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Escala de Conversión Vigesimal a Literal CNEB
              </h2>
              <p className="text-xs text-muted-foreground">
                Configura los umbrales numéricos mínimos para la asignación de letras (AD, A, B y C) en actas y libretas.
              </p>
            </div>
          </div>
        </div>

        {/* Nivel Selector */}
        <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setLevel('PRIMARY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              level === 'PRIMARY'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Primaria
          </button>
          <button
            type="button"
            onClick={() => setLevel('SECONDARY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              level === 'SECONDARY'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Secundaria
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">AD (Logro Destacado)</span>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary">
                  ≥ {ad}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Nota mínima vigesimal</p>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={ad}
                onChange={(e) => setAd(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm bg-background"
                required
              />
            </div>

            <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">A (Logro Esperado)</span>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary">
                  ≥ {a}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Nota mínima vigesimal</p>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={a}
                onChange={(e) => setA(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm bg-background"
                required
              />
            </div>

            <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">B (En Proceso)</span>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary">
                  ≥ {b}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Nota mínima vigesimal</p>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={b}
                onChange={(e) => setB(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm bg-background"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>C (En Inicio):</strong> Se asigna automáticamente a cualquier calificación por debajo del mínimo de B (&lt; {b}).
              </span>
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2 shrink-0 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Guardando...' : 'Guardar escala'}</span>
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};
