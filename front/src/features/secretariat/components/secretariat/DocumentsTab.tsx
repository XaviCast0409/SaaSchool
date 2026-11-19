import React, { useState } from 'react';
import { FileUp, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPeruShortDate } from '@/lib/dateUtils';
import {
  DOCUMENT_STATUS_LABEL,
  useDocumentRequests,
  type DocumentRequestRow,
  type DocumentStatus,
} from '../../api/useSecretariat';
import { STATUS_VARIANT } from './constants';
import { DocumentModal } from './DocumentModal';
import { DeskRequestModal } from './DeskRequestModal';

export const DocumentsTab: React.FC = () => {
  const [status, setStatus] = useState<DocumentStatus | undefined>(undefined);
  const { data, isLoading } = useDocumentRequests(status);
  const [selected, setSelected] = useState<DocumentRequestRow | null>(null);
  const [deskOpen, setDeskOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="mr-auto gap-1" onClick={() => setDeskOpen(true)}>
          <FileUp className="h-3.5 w-3.5" aria-hidden /> Registrar en ventanilla
        </Button>
        <Button size="sm" variant={!status ? 'default' : 'outline'} onClick={() => setStatus(undefined)}>
          Todos
        </Button>
        {(['REQUESTED', 'IN_PROCESS', 'READY', 'DELIVERED', 'REJECTED'] as DocumentStatus[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
            {DOCUMENT_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState
          title="Sin trámites"
          description="Las familias piden constancias y certificados desde «Trámites» en su app. Si alguien lo pide en persona, usa «Registrar en ventanilla»."
        />
      ) : (
        <Card className="divide-y">
          {data.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelected(d)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {d.typeLabel} {d.copies > 1 && <span className="text-muted-foreground">×{d.copies}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.studentName} · {d.requestedBy} · {formatPeruShortDate(d.createdAt)}
                </p>
              </div>
              {d.debtHold && (
                <Badge variant="warning" className="gap-1">
                  <Lock className="h-3 w-3" aria-hidden /> Deuda
                </Badge>
              )}
              <Badge variant={STATUS_VARIANT[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
            </button>
          ))}
        </Card>
      )}
      <DocumentModal doc={selected} onClose={() => setSelected(null)} />
      <DeskRequestModal open={deskOpen} onClose={() => setDeskOpen(false)} />
    </div>
  );
};
