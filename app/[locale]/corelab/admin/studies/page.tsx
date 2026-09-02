import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listStudies } from '@/lib/services/corelab/studies'
import { CreateStudyDialog } from './create-study-dialog'
import { StudiesGrid } from './studies-grid'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabStudiesPage({ params }: PageParams) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'corelab' })

  const studies = await listStudies()
  const crfVersions = await prisma.corelabCrfVersion.groupBy({
    by: ['studyId'],
    _max: { number: true },
  })
  const latestVersion = new Map(crfVersions.map((version) => [version.studyId, version._max.number]))
  const activeReaders = await prisma.corelabStudyMembership.count({ where: { removedAt: null, role: 'READER' } })

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('studies.title')} subtitle={t('studies.subtitle')} />
        <CreateStudyDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('studies.countStudies'), value: studies.length },
          { label: t('studies.countProduction'), value: studies.filter((study) => study.phase === 'PRODUCTION').length },
          { label: t('studies.countActiveReaders'), value: activeReaders },
        ].map((counter) => (
          <div key={counter.label} className="rounded-2xl border border-border bg-white px-6 py-5">
            <div className="text-2xl font-light text-text-primary">{counter.value}</div>
            <div className="mt-1 text-xs text-text-secondary">{counter.label}</div>
          </div>
        ))}
      </div>

      <StudiesGrid studies={studies} latestVersion={latestVersion} />
    </>
  )
}
