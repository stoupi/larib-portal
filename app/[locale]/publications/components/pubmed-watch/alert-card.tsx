'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, ExternalLink, FilePlus2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import type { PubmedAlertRow } from '@/lib/services/publications/pubmed-watch'
import { ArticlePickerDialog } from '../mail-agent/article-picker-dialog'

export type AlertReview = {
  busy: boolean
  link: (input: { alertId: string; articleId: string }) => void
  importPaper: (input: { alertId: string }) => void
  dismiss: (input: { alertId: string }) => void
}

type AlertCardProps = {
  alert: PubmedAlertRow
  articles: DashboardArticleItem[]
  review: AlertReview
}

export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
}

export function AlertCard({ alert, articles, review }: AlertCardProps) {
  const t = useTranslations('publications.pubmedWatch')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
  const [articleId, setArticleId] = useState(alert.article?.id ?? '')
  const selectedArticle = articles.find((article) => article.id === articleId) ?? null

  return (
    <li aria-label={alert.title} className="space-y-5 rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary">{alert.title}</h3>
        <p className="text-base text-text-primary">
          {[alert.journalName, alert.publishedAt ? dateFormatter.format(new Date(alert.publishedAt)) : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="text-base font-semibold text-text-primary">{t(`reason.${alert.reviewReason ?? 'UNKNOWN_ARTICLE'}`)}</p>
        {alert.authorNames.length > 0 && (
          <p className="text-base text-text-primary">{t('authors', { names: alert.authorNames.join(', ') })}</p>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-base font-medium text-text-primary">{t('articleLabel')}</span>
        <ArticlePickerDialog
          articles={articles}
          mailAuthors={alert.authorNames}
          selectedId={articleId}
          onSelect={setArticleId}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <a href={pubmedUrl(alert.pmid)} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            {t('openPubmed')}
          </a>
        </Button>
        <span className="flex-1" />
        <Button type="button" variant="ghost" disabled={review.busy} onClick={() => review.dismiss({ alertId: alert.id })}>
          <X className="size-4" />
          {t('dismiss')}
        </Button>
        <Button
          type="button"
          variant={selectedArticle ? 'outline' : 'default'}
          disabled={review.busy}
          onClick={() => review.importPaper({ alertId: alert.id })}
        >
          <FilePlus2 className="size-4" />
          {t('import')}
        </Button>
        {selectedArticle && (
          <Button
            type="button"
            disabled={review.busy}
            onClick={() => review.link({ alertId: alert.id, articleId: selectedArticle.id })}
          >
            <Check className="size-4" />
            {t('link')}
          </Button>
        )}
      </div>
    </li>
  )
}
