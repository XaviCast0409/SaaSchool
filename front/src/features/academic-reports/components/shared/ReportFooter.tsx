import React from 'react';

interface ReportFooterProps {
  reportCode: string;
  customText?: string;
  pageText?: string;
}

export const ReportFooter: React.FC<ReportFooterProps> = ({
  reportCode,
  customText = 'SaaSchool Cloud Suite',
  pageText = '-- Pág. 1 de 1 --',
}) => {
  return (
    <div className="mt-4 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary font-sans">{customText}</span>
      </div>
      <div>{pageText}</div>
      <div className="font-bold text-foreground tracking-wider">{reportCode}</div>
    </div>
  );
};
