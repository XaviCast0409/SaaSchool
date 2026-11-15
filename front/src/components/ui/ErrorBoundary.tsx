import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Al cambiar (p. ej. la ruta) se descarta el error y se vuelve a intentar */
  resetKey?: string;
  /** Ocupa toda la pantalla (fuera del layout con menú) */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Tras un despliegue, las páginas ya abiertas piden archivos que dejaron de existir */
const isStaleChunkError = (error: Error) =>
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(
    `${error.name} ${error.message}`,
  );

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isStaleChunkError(error);

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center p-6 text-center ${
          this.props.fullScreen ? 'min-h-screen bg-background' : 'min-h-[60vh]'
        }`}
      >
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              {stale ? 'Hay una versión nueva de KIPUX' : 'Esta pantalla tuvo un problema'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {stale
                ? 'Recarga la página para seguir trabajando con la versión más reciente.'
                : 'Tus datos están a salvo. Vuelve a intentarlo; si el problema continúa, recarga la página o avisa a soporte.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!stale && (
              <Button variant="outline" onClick={() => this.setState({ error: null })}>
                Reintentar
              </Button>
            )}
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recargar la página
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
