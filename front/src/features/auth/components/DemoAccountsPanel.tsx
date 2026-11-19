import React, { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DEMO_CATEGORIES, SHOW_DEMO_ACCOUNTS } from '../constants/demoAccounts';

export interface DemoAccountsPanelProps {
  onSelectPreset: (email: string, pass: string) => void;
}

export const DemoAccountsPanel: React.FC<DemoAccountsPanelProps> = ({ onSelectPreset }) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof DEMO_CATEGORIES>('PRO');

  if (!SHOW_DEMO_ACCOUNTS) return null;

  return (
    <div className="mt-5 pt-3.5 border-t border-border space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Accesos rápidos de prueba (Seed):</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Click para rellenar
        </span>
      </div>

      {/* Categorías de Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border text-xs overflow-x-auto">
        {(Object.keys(DEMO_CATEGORIES) as Array<keyof typeof DEMO_CATEGORIES>).map((catKey) => {
          const isActive = activeCategory === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setActiveCategory(catKey)}
              className={`flex-1 min-w-[70px] py-1 px-2 text-xs font-bold rounded-md transition-all text-center whitespace-nowrap ${
                isActive
                  ? 'bg-background text-primary shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {DEMO_CATEGORIES[catKey]?.title.split(' ')[0]} {catKey === 'ESTUDIANTES' ? 'Hijos' : ''}
            </button>
          );
        })}
      </div>

      {/* Lista de cuentas en la categoría activa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {DEMO_CATEGORIES[activeCategory]?.accounts.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onSelectPreset(acc.email, acc.pass)}
            className="p-2 rounded-lg bg-card hover:bg-muted/70 text-left border border-border transition-all hover:border-primary/40 group relative shadow-2xs"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                {acc.label}
              </span>
              <Badge
                variant="outline"
                className={`text-xs px-1 py-0 h-4 font-bold shrink-0 ${
                  acc.badgeColor || 'border-border text-muted-foreground'
                }`}
              >
                {acc.badge}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">{acc.email}</div>
            <div className="text-xs text-primary/80 font-medium truncate mt-0.5">{acc.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
