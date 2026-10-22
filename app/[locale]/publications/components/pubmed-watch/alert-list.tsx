'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import type { PubmedAlertRow } from '@/lib/services/publications/pubmed-watch'
import { dismissPubmedAlertAction, importPubmedAlertAction, linkPubmedAlertAction } from '../../pubmed-watch-actions'
import { AlertCard } from './alert-card'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

const KNOWN_ERRORS = ['ALERT_NOT_PENDING', 'PMID_ALREADY_LINKED', 'PUBMED_RECORD_NOT_FOUND'] as const

type AlertListProps = {
  alerts: PubmedAlertRow[]
  articles: DashboardArticleItem[]
}

export function AlertList({ alerts, articles }: AlertListProps) {
  const t = useTranslations('publications')
  const router = useRouter()

  const reportError = ({ error }: { error: { serverError?: string } }) => {
    const known = KNOWN_ERRORS.find((code) => code === error.serverError)
    toast.error(known ? t(`pubmedWatch.errors.${known}`) : t('actionError'))
    router.refresh()
  }
  const confirmWithLink = (message: string) => ({ data }: { data?: { articleId: string } }) => {
    const articleId = data?.articleId
    toast.success(message, {
      action: articleId
        ? { label: t('pubmedWatch.openArticle'), onClick: () => router.push(ADMIN_PATHS.article(articleId)) }
        : undefined,
    })
    router.refresh()
  }

  const link = useAction(linkPubmedAlertAction, { onSuccess: confirmWithLink(t('pubmedWatch.linked')), onError: reportError })
  const importPaper = useAction(importPubmedAlertAction, {
    onSuccess: confirmWithLink(t('pubmedWatch.imported')),
    onError: reportError,
  })
  const dismiss = useAction(dismissPubmedAlertAction, {
    onSuccess() {
      toast.success(t('pubmedWatch.dismissed'))
      router.refresh()
    },
    onError: reportError,
  })

  if (alerts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-base text-text-primary">
        {t('pubmedWatch.pendingEmpty')}
      </p>
    )
  }

  const review = {
    busy: link.isExecuting || importPaper.isExecuting || dismiss.isExecuting,
    link: link.execute,
    importPaper: importPaper.execute,
    dismiss: dismiss.execute,
  }

  return (
    <ul className="space-y-4">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} articles={articles} review={review} />
      ))}
    </ul>
  )
}
