import type { RubricLevel } from '../../api/useTeacherResources';

export const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground';

export const LEVELS: RubricLevel[] = ['AD', 'A', 'B', 'C'];

export const LEVEL_HEAD: Record<RubricLevel, string> = {
  AD: 'AD · Logro destacado',
  A: 'A · Logro esperado',
  B: 'B · En proceso',
  C: 'C · En inicio',
};
