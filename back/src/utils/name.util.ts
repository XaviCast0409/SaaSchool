export interface PersonNameInput {
  firstName?: string | null;
  firstNames?: string | null;
  lastNamePaternal?: string | null;
  lastNameMaternal?: string | null;
}

export function formatFullName(
  person: PersonNameInput,
  format: 'LAST_FIRST' | 'FIRST_LAST' = 'FIRST_LAST',
): string {
  const first = (person.firstNames || person.firstName || '').trim();
  const paternal = (person.lastNamePaternal || '').trim();
  const maternal = (person.lastNameMaternal || '').trim();

  const lastNames = [paternal, maternal].filter(Boolean).join(' ');

  if (format === 'LAST_FIRST') {
    if (lastNames && first) return `${lastNames}, ${first}`;
    return lastNames || first;
  }

  return [first, lastNames].filter(Boolean).join(' ');
}

