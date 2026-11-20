import React from 'react';
import { SchoolLetterhead } from '@/features/schools/components/SchoolLetterhead';
import { formatPeruDateTime } from '@/lib/dateUtils';
import type { FamilyStatement, StudentStatement } from '../../api/useFinance';
import { TotalsStrip } from './TotalsStrip';
import { StudentBlock } from './StudentBlock';

export const StatementDocument: React.FC<{
  data: FamilyStatement | StudentStatement;
  schoolName: string;
  showVoided: boolean;
  print?: boolean;
}> = ({ data, schoolName, showVoided, print }) => {
  const isFamily = 'children' in data;
  const children = isFamily ? data.children : [data];
  return (
    <div className={print ? 'mx-auto max-w-[190mm] space-y-4 bg-white p-4 text-black' : 'space-y-4'}>
      <div className="border-b border-border pb-2">
        {print ? (
          <SchoolLetterhead className="mb-2" title={`Estado de cuenta ${isFamily ? 'familiar' : 'del alumno'}`} />
        ) : (
          <>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{schoolName}</p>
            <h2 className="text-lg font-bold">Estado de cuenta {isFamily ? 'familiar' : 'del alumno'}</h2>
          </>
        )}
        {isFamily ? (
          <p className="text-xs text-muted-foreground">
            Apoderado: <strong className="text-foreground">{data.guardian.fullName}</strong>
            {data.guardian.documentId ? ` · DNI ${data.guardian.documentId}` : ''}
            {data.guardian.cellphone ? ` · Cel. ${data.guardian.cellphone}` : ''}
          </p>
        ) : (
          data.guardians.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Responsable de pagos:{' '}
              <strong className="text-foreground">
                {data.guardians
                  .filter((g) => g.isFinancialResponsible)
                  .concat(
                    data.guardians.filter((g) => g.isFinancialResponsible).length ? [] : data.guardians.slice(0, 1),
                  )
                  .map((g) => `${g.firstName} ${g.lastNamePaternal}`)
                  .join(', ')}
              </strong>
            </p>
          )
        )}
        <p className="text-[10px] text-muted-foreground">Emitido el {formatPeruDateTime(data.generatedAt)}</p>
      </div>
      <TotalsStrip t={data.totals} />
      {children.map((c) => (
        <StudentBlock key={c.student.id} st={c} showVoided={showVoided} />
      ))}
      <p className="text-center text-[10px] text-muted-foreground">
        Documento informativo de control interno. Los recibos internos no son comprobantes electrónicos válidos ante
        SUNAT.
      </p>
    </div>
  );
};
