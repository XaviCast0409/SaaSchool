import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AttendanceStatus } from '../types';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PRESENT':
      return <Badge variant="success">PRESENTE</Badge>;
    case 'ABSENT_JUSTIFIED':
      return <Badge variant="warning">FALTA JUSTIFICADA</Badge>;
    case 'ABSENT_UNJUSTIFIED':
      return <Badge variant="destructive">FALTA INJUSTIFICADA</Badge>;
    case 'LATE_JUSTIFIED':
      return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">TARDANZA JUST.</Badge>;
    case 'LATE_UNJUSTIFIED':
      return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">TARDANZA INJ.</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
