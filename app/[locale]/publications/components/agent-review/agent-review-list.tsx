'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import type { AgentReviewGroup } from '@/lib/publications/agent-review'
import { markAgentChangesReviewedAction } from '../../agent-review-actions'
import { AgentReviewCard } from './agent-review-card'

function toReview(group: AgentReviewGroup): { articleId: string; reviewedUpTo: Date } {
  return { articleId: group.articleId, reviewedUpTo: group.lastChangedAt }
}

export function AgentReviewList({ groups }: { groups: AgentReviewGroup[] }) {
  const t = useTranslations('publications')
  const router = useRouter()

  const markReviewed = useAction(markAgentChangesReviewedAction, {
    onSuccess({ data }) {
      toast.success(t('agentReview.verified', { count: data?.count ?? 0 }))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
      router.refresh()
    },
  })

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-base text-text-primary">
        {t('agentReview.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.length > 1 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={markReviewed.isExecuting}
            onClick={() => markReviewed.execute({ reviews: groups.map(toReview) })}
          >
            <CheckCheck className="size-4" />
            {t('agentReview.verifyAll')}
          </Button>
        </div>
      )}
      <ul className="space-y-4">
        {groups.map((group) => (
          <AgentReviewCard
            key={group.articleId}
            group={group}
            busy={markReviewed.isExecuting}
            onVerify={(verifiedGroup) => markReviewed.execute({ reviews: [toReview(verifiedGroup)] })}
          />
        ))}
      </ul>
    </div>
  )
}
