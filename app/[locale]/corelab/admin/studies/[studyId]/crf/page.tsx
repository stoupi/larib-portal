import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { draftImpact, getDraft } from '@/lib/services/corelab/crf-editor'
import { listValueSets, listVariables } from '@/lib/services/corelab/library'
import { CrfEditor } from './crf-editor'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyCrfEditorPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.library.editor' })
  const [draft, impact, variables, valueSets, published] = await Promise.all([
    getDraft(studyId),
    draftImpact(studyId),
    listVariables(),
    listValueSets(),
    prisma.corelabCrfVersion.findFirst({
      where: { studyId, publishedAt: { not: null } },
      select: { number: true },
      orderBy: { number: 'desc' },
    }),
  ])

  const itemsOf = new Map(valueSets.map((set) => [set.id, set.items]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      </div>
      <CrfEditor
        context={{
          studyId,
          draftNumber: draft?.number ?? null,
          publishedNumber: published?.number ?? null,
          signedReadings: impact?.signedReadings ?? 0,
        }}
        definition={draft?.definition ?? []}
        changes={impact?.changes ?? []}
        worst={impact?.worst ?? 'HARMLESS'}
        libraryVariables={variables.map((variable) => ({
          id: variable.id,
          code: variable.code,
          name: variable.name,
          type: variable.type,
          options: (itemsOf.get(variable.valueSet?.id ?? '') ?? []).map((item) => item.label),
        }))}
      />
    </div>
  )
}
