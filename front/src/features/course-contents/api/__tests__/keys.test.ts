import { describe, it, expect } from 'vitest';
import { courseContentsKeys } from '../keys';

describe('courseContentsKeys', () => {
  it.each([
    ['all', courseContentsKeys.all, ['course-contents']],
    ['list with bimester', courseContentsKeys.list('ca-1', 1), ['course-contents', 'ca-1', 1]],
    ['list without bimester', courseContentsKeys.list('ca-1'), ['course-contents', 'ca-1']],
    ['forumCommentsAll', courseContentsKeys.forumCommentsAll, ['forum-comments']],
    ['forumComments', courseContentsKeys.forumComments('fc-1'), ['forum-comments', 'fc-1']],
    ['studentCourses', courseContentsKeys.studentCourses('s-1'), ['student-courses', 's-1']],
    ['studentTasksAll', courseContentsKeys.studentTasksAll, ['student-tasks']],
    ['studentTasks', courseContentsKeys.studentTasks('s-1'), ['student-tasks', 's-1']],
    ['homeworkSubmissionsAll', courseContentsKeys.homeworkSubmissionsAll, ['homework-submissions']],
    ['homeworkSubmissions', courseContentsKeys.homeworkSubmissions('cc-1'), ['homework-submissions', 'cc-1']],
    ['fileLink', courseContentsKeys.fileLink('https://example.com/file.pdf'), ['file-link', 'https://example.com/file.pdf']],
    ['supervisionStatsAll', courseContentsKeys.supervisionStatsAll, ['supervision-stats']],
    ['supervisionStats', courseContentsKeys.supervisionStats(2), ['supervision-stats', 2]],
    ['teacherComplianceAll', courseContentsKeys.teacherComplianceAll, ['teacher-compliance']],
    ['teacherCompliance', courseContentsKeys.teacherCompliance(2), ['teacher-compliance', 2]],
    ['supervisedFeedAll', courseContentsKeys.supervisedFeedAll, ['supervised-feed']],
    ['supervisedFeed', courseContentsKeys.supervisedFeed({ status: 'PENDING' }), ['supervised-feed', { status: 'PENDING' }]],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

