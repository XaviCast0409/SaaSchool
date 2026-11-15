import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { TAB_GROUPS, type TabGroupKey } from './navigation';

/**
 * Pestañas que unen pantallas hermanas bajo una sola entrada del menú
 * (Asistencia: pase de lista, por curso, justificaciones y alertas).
 * Cada pestaña conserva su propia ruta. Si el rol solo ve una, no se muestran.
 */
export const SectionTabsLayout: React.FC<{ group: TabGroupKey }> = ({ group }) => {
  const role = useAuthStore((state) => state.user?.role);
  const tabs = TAB_GROUPS[group].filter((tab) => role && tab.roles.includes(role));

  return (
    <>
      {tabs.length > 1 && (
        <nav
          aria-label="Secciones"
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0 print:hidden"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              className={({ isActive }) =>
                `-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </>
  );
};
