import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { resolveStudyAccess } from '@/lib/corelab/guards'
import { getStudy } from '@/lib/services/corelab/studies'
import { StudyPhaseBadge } from '../../../components/study-phase-badge'
import { getTranslations } from 'next-intl/server'
import { StudyTabs } from './study-tabs'

type LayoutProps = { children: ReactNode; params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyLayout({ children, params }: LayoutProps) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  try {
    await resolveStudyAccess(session.user, studyId, [])
  } catch {
    redirect(applicationLink(locale, '/corelab'))
  }
  const study = await getStudy(studyId)
  if (!study) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-l-4 border-coral-500 pl-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{study.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">{[study.code, ...study.modalities].join(' · ')}</p>
        </div>
        <StudyPhaseBadge phase={study.phase} />
      </div>
      {study.closedAt ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {(await getTranslations({ locale, namespace: 'corelab.config' }))('closedBanner', {
            date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(study.closedAt),
          })}
        </p>
      ) : null}
      <StudyTabs studyId={study.id} />
      {children}
    </div>
  )
}
