import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppRouter } from './router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ConfirmProvider } from './components/ui/confirm';

export const App: React.FC = () => {
  return (
    // Último recurso: un fallo fuera del layout muestra un mensaje en vez de una pantalla en blanco
    <ErrorBoundary fullScreen>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <AppRouter />
        </ConfirmProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
export default App;
