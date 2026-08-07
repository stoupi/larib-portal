import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { getPublicationForEdit, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { listJournalTargets } from '@/lib/services/publications/journal-targets'
import { listStudyOptions } from '@/lib/services/publications/studies'
import { listJournalNames } from '@/lib/services/publications/journals'
import { listAuthorOptions, listAuthorPickerOptions } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { ArticlePage } from '@/app/[locale]/publications/components/article/article-page'
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function AdminArticleRoute({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, publicationsPaths(PUBLICATIONS_BASE).article(id)))
  }

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)

  const [journalTargets, studyOptions, journalNames, authorOptions, pickerAuthors, centreRows] =
    await Promise.all([
      listJournalTargets(id),
      listStudyOptions(),
      listJournalNames(),
      listAuthorOptions(),
      listAuthorPickerOptions(),
      listCentres(),
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
      options={{ journalTargets, studyOptions, journalNames, authorOptions, pickerAuthors, centres }}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin: true }}
      basePath={PUBLICATIONS_ADMIN_BASE}
    />
  )
}
