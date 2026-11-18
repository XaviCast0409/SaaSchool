export function canManage(actorRole?: string | null, targetRole?: string | null): boolean {
  if (!actorRole || !targetRole) return false;
  if (actorRole === 'SUPER_ADMIN') return true;
  if (actorRole === 'SCHOOL_ADMIN') return targetRole !== 'SUPER_ADMIN';
  if (actorRole === 'ADMINISTRATIVE') return targetRole === 'TEACHER' || targetRole === 'PARENT';
  return false;
}

export function canChangeRole(
  actorRole?: string | null,
  actorUserId?: string | null,
  targetUserId?: string | null,
): boolean {
  if (!actorRole) return false;
  if (actorUserId && targetUserId && actorUserId === targetUserId) return false;
  return actorRole === 'SUPER_ADMIN' || actorRole === 'SCHOOL_ADMIN';
}
