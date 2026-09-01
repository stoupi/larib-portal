'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, CheckCheck, X, Inbox } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { PendingAuthorRequest } from '@/lib/services/publications/publication-requests'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import { resolveAuthorRequestAction, resolveAllAuthorRequestsAction } from '../actions'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

export function AdminAuthorRequests({ requests }: { requests: PendingAuthorRequest[] }) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const router = useRouter()
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  const resolve = useAction(resolveAuthorRequestAction, {
    onSuccess({ input }) {
      toast.success(input?.outcome === 'DISMISSED' ? t('adminRequests.dismissed') : t('adminRequests.resolved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const resolveAll = useAction(resolveAllAuthorRequestsAction, {
    onSuccess({ data }) {
      toast.success(t('adminRequests.allResolved', { count: data?.count ?? 0 }))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  if (requests.length === 0) return null

  const busy = resolve.isExecuting || resolveAll.isExecuting

  return (
    <section
      aria-label={t('adminRequests.title')}
      className="space-y-3 rounded-2xl bg-gradient-to-br from-coral-600 to-coral-700 p-5 text-white shadow-elevation-sm"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Inbox className="h-4 w-4" strokeWidth={2} />
        <h2 className="text-sm font-bold uppercase tracking-wider">{t('adminRequests.title')}</h2>
        <span
          title={t('adminRequests.pendingCount', { count: requests.length })}
          className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-extrabold tabular-nums"
        >
          {requests.length}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => resolveAll.execute({})}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-bold text-coral-700 transition hover:bg-white/90 disabled:opacity-50"
        >
          <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t('adminRequests.resolveAll')}
        </button>
      </div>

      <ul className="max-h-[248px] space-y-2.5 overflow-y-auto pr-1">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/25 bg-white/10 p-3.5"
          >
            <div className="min-w-0">
              <Link
                href={ADMIN_PATHS.article(request.articleId)}
                className="text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                {request.articleTitle || t('myPub.untitled')}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/80">
                <span className="rounded-full bg-white/25 px-2 py-0.5 font-extrabold uppercase tracking-wider text-white">
                  {request.kind === 'ERROR_REPORT'
                    ? t('editor.requestKindErrorReport')
                    : t('editor.requestKindAuthorList')}
                </span>
                <span>
                  {t('adminRequests.requestedBy', { name: request.requesterName })} · {fmt.format(request.createdAt)}
                </span>
              </p>
              {request.note && <p className="mt-1.5 whitespace-pre-line text-sm text-white/90">{request.note}</p>}
              {request.message && <p className="mt-1.5 whitespace-pre-line text-sm text-white/90">{request.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => resolve.execute({ id: request.id, outcome: 'RESOLVED' })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-bold text-coral-700 transition hover:bg-white/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                {t('adminRequests.resolve')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => resolve.execute({ id: request.id, outcome: 'DISMISSED' })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/40 px-3 text-[13px] font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                {t('adminRequests.dismiss')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
