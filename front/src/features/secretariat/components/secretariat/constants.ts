import type { DocumentStatus } from '../../api/useSecretariat';

export const STATUS_VARIANT: Record<DocumentStatus, 'secondary' | 'warning' | 'success' | 'outline' | 'destructive'> = {
  REQUESTED: 'secondary',
  IN_PROCESS: 'warning',
  READY: 'success',
  DELIVERED: 'outline',
  REJECTED: 'destructive',
};
