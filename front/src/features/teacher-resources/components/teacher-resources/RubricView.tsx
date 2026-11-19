import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SchoolLetterhead } from '@/features/schools/components/SchoolLetterhead';
import type { Rubric } from '../../api/useTeacherResources';
import { LEVELS, LEVEL_HEAD } from './constants';

export const RubricView: React.FC<{ rubric: Rubric | null; onClose: () => void }> = ({ rubric, onClose }) => (
  <Modal
    open={Boolean(rubric)}
    onClose={onClose}
    title={rubric?.title ?? ''}
    description={rubric ? `${rubric.authorName}${rubric.areaName ? ` · ${rubric.areaName}` : ''}` : undefined}
    size="xl"
    footer={
      <div className="flex justify-end">
        <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Imprimir
        </Button>
      </div>
    }
  >
    {rubric && (
      <div className="overflow-x-auto print:overflow-visible">
        <SchoolLetterhead
          className="mb-3 hidden print:flex"
          title={rubric.title}
          subtitle={`${rubric.authorName}${rubric.areaName ? ` · ${rubric.areaName}` : ''}`}
        />
        <table className="w-full min-w-[700px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="border border-border bg-muted px-2 py-1.5 text-left">
                Criterio
              </th>
              {LEVELS.map((l) => (
                <th key={l} scope="col" className="border border-border bg-muted px-2 py-1.5 text-left">
                  {LEVEL_HEAD[l]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.name} className="align-top">
                <th scope="row" className="border border-border px-2 py-1.5 text-left font-semibold text-foreground">
                  {c.name}
                </th>
                {LEVELS.map((l) => (
                  <td key={l} className="border border-border px-2 py-1.5 text-foreground">
                    {c.levels[l]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rubric.description && <p className="mt-2 text-xs text-muted-foreground">{rubric.description}</p>}
      </div>
    )}
  </Modal>
);
