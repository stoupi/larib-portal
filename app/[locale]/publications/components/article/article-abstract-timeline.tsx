'use client'

import { useTranslations } from 'next-intl'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'

export function ArticleAbstractTimeline({ article, locale }: { article: PublicationEditData; locale: string }) {
  const t = useTranslations('publications')
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)

  if (!article.receivedAt && !article.acceptedAt && !article.abstract) return null

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      {(article.receivedAt || article.acceptedAt) && (
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">{t('articles.editorialTimeline')}</h2>
          <p className="text-sm text-text-secondary">
            {article.receivedAt ? `${t('articles.received')} ${formatDate(article.receivedAt)}` : null}
            {article.receivedAt && article.acceptedAt ? ' → ' : null}
            {article.acceptedAt ? `${t('articles.accepted')} ${formatDate(article.acceptedAt)}` : null}
            {article.reviewDelayDays != null ? (
              <span className="font-medium text-text-primary"> · {t('articles.reviewDelay', { days: article.reviewDelayDays })}</span>
            ) : null}
          </p>
        </section>
      )}

      {article.abstract && (
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">{t('articles.abstract')}</h2>
          <p className="whitespace-pre-line text-sm text-text-secondary">{article.abstract}</p>
        </section>
      )}
    </div>
  )
}
