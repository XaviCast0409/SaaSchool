import type React from 'react';

export type Plan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface NavTab {
  label: string;
  path: string;
  roles: readonly string[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly string[];
  minPlan: Plan;
  /** Pantallas que cuelgan de esta entrada y se muestran como pestañas */
  tabs?: NavTab[];
  /** Rutas hijas que también marcan la entrada como activa */
  matchPrefixes?: string[];
  /** Palabras extra para el buscador (Ctrl+K) */
  keywords?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Entrada del menú ya resuelta para el usuario actual */
export interface ResolvedNavItem extends NavItem {
  /** El plan del colegio no la incluye: se muestra con candado en vez de ocultarse */
  locked: boolean;
  /** Todas las rutas que la marcan como activa */
  matchPaths: string[];
}

export interface ResolvedNavSection {
  title: string;
  items: ResolvedNavItem[];
}

export type NavAudience = 'platform' | 'student' | 'parent' | 'school';

export interface ResolveNavOptions {
  audience: NavAudience;
  role: string;
  planLevel: number;
  /** Quien decide la suscripción ve con candado lo que el plan no incluye */
  showLocked: boolean;
}
