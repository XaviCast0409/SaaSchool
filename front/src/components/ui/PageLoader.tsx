import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const PageLoader: React.FC = () => {
  return (
    <div
      className="w-full max-w-7xl mx-auto space-y-4 p-6"
      role="status"
      aria-busy="true"
      aria-label="Cargando página"
    >
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
};
