import { describe, it, expect } from 'vitest';
import { academicKeys } from '../keys';

describe('academicKeys', () => {
  it.each([
    ['all', academicKeys.all, ['academic']],
    ['catalog', academicKeys.catalog(), ['academic', 'catalog']],
    ['setup', academicKeys.setup(), ['academic', 'setup']],
    ['planAll', academicKeys.planAll, ['academic', 'plan']],
    ['plan with grade', academicKeys.plan('PRIMARY', 1), ['academic', 'plan', 'PRIMARY', 1]],
    ['plan single', academicKeys.plan('y-1'), ['academic', 'plan', 'y-1']],
    ['planPreuniversity', academicKeys.planPreuniversity('SECONDARY', 5), ['academic', 'plan', 'preuniversity', 'SECONDARY', 5]],
    ['loadAll', academicKeys.loadAll, ['academic', 'load']],
    ['load', academicKeys.load('PRIMARY'), ['academic', 'load', 'PRIMARY']],
    ['myCourses default', academicKeys.myCourses(), ['academic', 'my-courses']],
    ['myCourses with year', academicKeys.myCourses('y-1'), ['academic', 'my-courses', 'y-1']],
    ['periods default', academicKeys.periods(), ['academic', 'periods']],
    ['periods with year', academicKeys.periods('y-1'), ['academic', 'periods', 'y-1']],
    ['progressAll', academicKeys.progressAll, ['academic', 'progress']],
    ['progress', academicKeys.progress(1, 'PRIMARY'), ['academic', 'progress', 1, 'PRIMARY']],
    ['progress default level', academicKeys.progress(1), ['academic', 'progress', 1, 'ALL']],
    ['progressMine', academicKeys.progressMine(1), ['academic', 'progress', 'mine', 1]],
    ['gradebookAll', academicKeys.gradebookAll, ['academic', 'gradebook']],
    ['gradebook', academicKeys.gradebook('ca-1', 1), ['academic', 'gradebook', 'ca-1', 1]],
    ['consolidationAll', academicKeys.consolidationAll, ['academic', 'consolidation']],
    ['consolidation', academicKeys.consolidation('c-1', 1), ['academic', 'consolidation', 'c-1', 1]],
    ['reportCard single', academicKeys.reportCard('e-1'), ['academic', 'report-card', 'e-1']],
    ['reportCard with period', academicKeys.reportCard('e-1', 'p-1'), ['academic', 'report-card', 'e-1', 'p-1']],
    ['reportCards single', academicKeys.reportCards('c-1'), ['academic', 'report-cards', 'c-1']],
    ['reportCards with period', academicKeys.reportCards('c-1', 'p-1'), ['academic', 'report-cards', 'c-1', 'p-1']],
    ['phrasesAll', academicKeys.phrasesAll, ['academic', 'phrases']],
    ['phrases', academicKeys.phrases('ca-1'), ['academic', 'phrases', 'ca-1']],
    ['phrasesManage full', academicKeys.phrasesManage('PRIMARY', 1, 'MAT'), ['academic', 'phrases', 'manage', 'PRIMARY', 1, 'MAT']],
    ['phrasesManage single', academicKeys.phrasesManage('c-1'), ['academic', 'phrases', 'manage', 'c-1']],
    ['tutorReportAll', academicKeys.tutorReportAll, ['academic', 'tutor-report']],
    ['tutorReport', academicKeys.tutorReport('c-1', 1), ['academic', 'tutor-report', 'c-1', 1]],
    ['sub', academicKeys.sub('plan'), ['academic', 'plan']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

