import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { getStudy } from '@/lib/services/corelab/studies'
import { listMembers, listCandidates } from '@/lib/services/corelab/memberships'
import { AddMemberForm } from './add-member-form'
import { TeamTable } from './team-table'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyTeamPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const t = await getTranslations({ locale, namespace: 'corelab.team' })

  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const study = await getStudy(studyId)
  if (!study) notFound()

  const [members, candidates] = await Promise.all([listMembers(studyId), listCandidates(studyId)])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-text-primary">{t('title', { code: study.code })}</h2>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{t('subtitle')}</p>
      </section>

      <AddMemberForm studyId={study.id} candidates={candidates} showProductionNotice={study.phase === 'PRODUCTION'} />

      <section className="rounded-2xl border border-border bg-white p-6">
        <TeamTable studyId={study.id} members={members} />
      </section>
    </div>
  )
}
