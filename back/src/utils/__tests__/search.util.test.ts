import { describe, expect, it } from 'vitest';
import { multiWordSearch, splitSearchTerms } from '../search.util';

describe('splitSearchTerms', () => {
  it('separa por espacios y comas, sin vacíos', () => {
    expect(splitSearchTerms('  García,  Ana  ')).toEqual(['García', 'Ana']);
  });

  it('sin texto no hay términos', () => {
    expect(splitSearchTerms('   ')).toEqual([]);
    expect(splitSearchTerms(undefined)).toEqual([]);
  });

  it('limita la cantidad de palabras', () => {
    expect(splitSearchTerms('a b c d e f g', 3)).toEqual(['a', 'b', 'c']);
  });
});

describe('multiWordSearch', () => {
  it('cada palabra debe aparecer en alguno de los campos', () => {
    const where = multiWordSearch<Record<string, unknown>>('garcía 7123', {
      insensitive: ['firstNames', 'lastNamePaternal'],
      exact: ['documentId'],
    });
    expect(where).toEqual([
      {
        OR: [
          { firstNames: { contains: 'garcía', mode: 'insensitive' } },
          { lastNamePaternal: { contains: 'garcía', mode: 'insensitive' } },
          { documentId: { contains: 'garcía' } },
        ],
      },
      {
        OR: [
          { firstNames: { contains: '7123', mode: 'insensitive' } },
          { lastNamePaternal: { contains: '7123', mode: 'insensitive' } },
          { documentId: { contains: '7123' } },
        ],
      },
    ]);
  });
});
