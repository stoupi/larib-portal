import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { draftImpact, getDraft } from '@/lib/services/corelab/crf-editor'
import { getStudy } from '@/lib/services/corelab/studies'
import { listBlocks, listValueSets, listVariables } from '@/lib/services/corelab/library'
import { buildReferences } from '@/lib/corelab/library/references'
import { readBlockDefinition } from '@/lib/corelab/library/blocks'
import { CrfEditor } from './crf-editor'
import type { LibraryBlockOption } from './crf-block-picker'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyCrfEditorPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const study = await getStudy(studyId)
  if (!study) notFound()
  const modality = study.modalities[0] ?? 'CMR'

  const t = await getTranslations({ locale, namespace: 'corelab.crfEditor' })
  const [draft, impact, variables, valueSets, blocks, published] = await Promise.all([
    getDraft(studyId),
    draftImpact(studyId),
    listVariables(modality),
    listValueSets(modality),
    listBlocks(undefined, modality),
    prisma.corelabCrfVersion.findFirst({
      where: { studyId, publishedAt: { not: null } },
      select: { number: true },
      orderBy: { number: 'desc' },
    }),
  ])

  const references = buildReferences(variables, valueSets)
  const options: LibraryBlockOption[] = blocks.flatMap((block) => {
    const definition = readBlockDefinition(block.definition)
    return definition ? [{ id: block.id, name: block.name, definition }] : []
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      </div>
      <CrfEditor
        key={draft?.id ?? 'no-draft'}
        context={{
          studyId,
          draftNumber: draft?.number ?? null,
          publishedNumber: published?.number ?? null,
          modality,
        }}
        definition={draft?.definition ?? []}
        impact={{
          changes: impact?.changes ?? [],
          worst: impact?.worst ?? 'HARMLESS',
          signedReadings: impact?.signedReadings ?? 0,
        }}
        library={{
          references: [...references.entries()],
          ids: variables.map((variable) => [variable.code, variable.id] as [string, string]),
          blocks: options,
        }}
      />
    </div>
  )
}
