import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { getPublicationForEdit, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { listJournalTargets } from '@/lib/services/publications/journal-targets'
import { listStudyOptions } from '@/lib/services/publications/studies'
import { listJournalNames } from '@/lib/services/publications/journals'
import { listAuthorPickerOptions } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { PUBLICATIONS_BASE } from '@/lib/publications/base-path'
import { ArticlePage } from '@/app/[locale]/publications/components/article/article-page'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function ArticleRoute({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')
  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)

  const [journalTargets, studyOptions, journalNames, pickerAuthors, centreRows] =
    await Promise.all([
      listJournalTargets(id),
      listStudyOptions(),
      listJournalNames(),
      isAdmin ? listAuthorPickerOptions() : Promise.resolve([]),
      isAdmin ? listCentres() : Promise.resolve([]),
    ])

  const centres = centreRows.map((centre) => ({
    id: centre.id,
    name: centre.name,
    city: centre.city,
    isOwn: centre.isOwn,
  }))

  return (
    <ArticlePage
      locale={locale}
      article={article}
      options={{ journalTargets, studyOptions, journalNames, pickerAuthors, centres }}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin }}
      basePath={PUBLICATIONS_BASE}
    />
  )
}
