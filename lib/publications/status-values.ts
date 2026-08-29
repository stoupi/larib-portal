// The status tuples live here, away from the services layer, so client components can
// read them without dragging Prisma into the browser bundle. The services re-export them.
export const ARTICLE_STATUSES = [
  'IN_PREPARATION',
  'UNDER_REVIEW',
  'REVISION',
  'TO_RESUBMIT',
  'ACCEPTED',
  'PUBLISHED',
  'ABANDONED',
] as const
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number]

export const STUDY_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'STOPPED'] as const
export type StudyStatusValue = (typeof STUDY_STATUSES)[number]
