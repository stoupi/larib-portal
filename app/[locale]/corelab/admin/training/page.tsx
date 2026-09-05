import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listModules } from '@/lib/services/corelab/training'
import { listStudies } from '@/lib/services/corelab/studies'
import { prisma } from '@/lib/prisma'
import { ModuleDialog } from './module-dialog'
import { ModuleRowActions } from './module-row-actions'
import { VideoUpload } from './video-upload'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function AdminTrainingPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))
  const t = await getTranslations({ locale, namespace: 'corelab.training.admin' })
  const tScope = await getTranslations({ locale, namespace: 'corelab.training.scope' })
  const tType = await getTranslations({ locale, namespace: 'corelab.training.type' })

  const [modules, studies, requirements] = await Promise.all([
    listModules(),
    listStudies(),
    prisma.corelabStudyTrainingRequirement.findMany({ select: { moduleId: true, study: { select: { code: true } } } }),
  ])

  const usedBy = new Map<string, string[]>()
  for (const requirement of requirements) {
    usedBy.set(requirement.moduleId, [...(usedBy.get(requirement.moduleId) ?? []), requirement.study.code])
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <ModuleDialog studyOptions={studies.map((study) => ({ value: study.id, label: study.code }))} />
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        {modules.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('moduleTitle')}</TableHead>
                  <TableHead>{t('moduleScope')}</TableHead>
                  <TableHead>{t('moduleType')}</TableHead>
                  <TableHead>{t('duration')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('usedBy')}</TableHead>
                  <TableHead>{t('video')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((trainingModule) => (
                  <TableRow key={trainingModule.id}>
                    <TableCell className="font-medium text-text-primary">{trainingModule.title}</TableCell>
                    <TableCell className="text-text-secondary">
                      {[tScope(trainingModule.scope), trainingModule.softwareName].filter(Boolean).join(' · ')}
                    </TableCell>
                    <TableCell className="text-text-secondary">{tType(trainingModule.type)}</TableCell>
                    <TableCell className="text-text-secondary">{trainingModule.durationMinutes}</TableCell>
                    <TableCell className="text-text-secondary">v{trainingModule.version}</TableCell>
                    <TableCell className="text-text-secondary">{(usedBy.get(trainingModule.id) ?? []).join(', ') || '—'}</TableCell>
                    <TableCell>
                      {trainingModule.type === 'VIDEO' ? <VideoUpload moduleId={trainingModule.id} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <ModuleRowActions
                        module={{
                          id: trainingModule.id,
                          title: trainingModule.title,
                          description: trainingModule.description,
                          durationMinutes: trainingModule.durationMinutes,
                          order: trainingModule.order,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  )
}
