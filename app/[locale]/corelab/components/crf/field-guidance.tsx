'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

export function guidanceImageUrl(imageKey: string): string {
  return `/api/corelab/uploads/guidance-image?key=${encodeURIComponent(imageKey)}`
}

export function FieldGuidance({ guidance }: { guidance: NonNullable<FieldDefinition['guidance']> }) {
  const t = useTranslations('corelab.form')
  const warning = guidance.level === 'WARNING'
  const Icon = warning ? AlertTriangle : Info

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={warning ? t('guidanceWarning') : t('guidanceInfo')}
            className={cn(
              'inline-flex size-5 cursor-help items-center justify-center rounded-full',
              warning ? 'text-warn-600 hover:bg-warn-50' : 'text-navy-500 hover:bg-navy-50',
            )}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className={cn('max-w-xs space-y-2 p-3', warning ? 'bg-warn-700' : 'bg-navy-800')}
        >
          <p className="text-xs leading-relaxed">{guidance.text}</p>
          {guidance.imageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={guidanceImageUrl(guidance.imageKey)}
              alt={guidance.text}
              className="max-h-52 w-full rounded-md border border-white/25 object-contain"
            />
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
