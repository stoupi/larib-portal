import { getTranslations } from 'next-intl/server'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { getStudy, getCurrentCrfVersion } from '@/lib/services/corelab/studies'
import { allowedNextPhases } from '@/lib/corelab/study-phase'
import { findField } from '@/lib/corelab/crf/schema'
import { StudyInfoForm } from './study-info-form'
import { StudyPhaseCard } from './study-phase-card'
import { CrfReadonly } from './crf-readonly'
import { ThresholdsForm } from './thresholds-form'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

function formatDate(locale: string, value: Date | null): string | null {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(value)
}

export default async function StudyConfigPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const t = await getTranslations({ locale, namespace: 'corelab.config' })
  const tForm = await getTranslations({ locale, namespace: 'corelab.form.preview' })

  const study = await getStudy(studyId)
  if (!study) notFound()
  const crfVersion = await getCurrentCrfVersion(studyId)

  const definition = crfVersion?.definition ?? []
  const thresholdRows = (crfVersion?.discordanceThresholds ?? []).map((threshold) => {
    const sequence = definition.find((candidate) => findField(definition, candidate.id, threshold.fieldId) !== null)
    const field = sequence ? findField(definition, sequence.id, threshold.fieldId) : null
    return {
      fieldId: threshold.fieldId,
      label: field?.name ?? threshold.fieldId,
      sequence: sequence?.name ?? '—',
      minorPercent: threshold.minorPercent,
      majorPercent: threshold.majorPercent,
    }
  })

  const variables = definition.reduce(
    (total, sequence) => total + sequence.sections.reduce((count, section) => count + section.fields.length, 0),
    0,
  )

  return (
    <div className="space-y-6">
      <StudyInfoForm
        studyId={study.id}
        code={study.code}
        initial={{
          name: study.name,
          description: study.description,
          reviewDeadlineDays: study.reviewDeadlineDays,
          maxExamsPerPatient: study.maxExamsPerPatient,
        }}
      />

      <StudyPhaseCard
        studyId={study.id}
        phase={study.phase}
        nextPhases={allowedNextPhases(study.phase)}
        startedAt={formatDate(locale, study.startedAt)}
        closedAt={formatDate(locale, study.closedAt)}
      />

      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{t('crfTitle')}</h2>
          {crfVersion ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/corelab/admin/studies/${study.id}/crf-preview`}>{tForm('open')}</Link>
            </Button>
          ) : null}
        </div>
        {crfVersion ? (
          <>
            <p className="mt-1 text-sm text-text-secondary">
              {t('crfSubtitle', { sequences: crfVersion.definition.length, variables })}
            </p>
            <div className="mt-4">
              <CrfReadonly definition={crfVersion.definition} />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-text-secondary">{t('crfNone')}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-text-primary">{t('thresholdsTitle')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('thresholdsSubtitle')}</p>
        <div className="mt-4">
          {crfVersion ? (
            <ThresholdsForm studyId={study.id} crfVersionId={crfVersion.id} rows={thresholdRows} />
          ) : (
            <p className="text-sm text-text-secondary">{t('thresholdsEmpty')}</p>
          )}
        </div>
      </section>
    </div>
  )
}
