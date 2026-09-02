'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ExternalLink, Linkedin, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { linkedinEmbedUrl } from '@/lib/publications/linkedin-post'
import { setLinkedinPostAction } from '../../actions'

function isoDay(value: Date | string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function LinkedinPostPanel({
  articleId,
  postUrl,
  postedAt,
  editable,
}: {
  articleId: string
  postUrl: string | null
  postedAt: Date | string | null
  editable: boolean
}) {
  const t = useTranslations('publications.communication')
  const locale = useLocale()
  const router = useRouter()
  const [url, setUrl] = useState(postUrl ?? '')
  const [day, setDay] = useState(isoDay(postedAt))

  const save = useAction(setLinkedinPostAction, {
    onSuccess() {
      toast.success(t('linkedinSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const embed = linkedinEmbedUrl(postUrl)
  const savedDate = postedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(postedAt))
    : null

  return (
    <div className="space-y-3 border-t border-dashed border-line pt-4">
      <div className="flex items-center gap-2">
        <Linkedin className="size-4 text-[#0A66C2]" strokeWidth={2.2} />
        <h3 className="text-sm font-semibold text-text-primary">{t('linkedinTitle')}</h3>
      </div>

      {postUrl ? (
        <div className="space-y-2">
          {embed ? (
            <iframe
              title={t('linkedinTitle')}
              src={embed}
              className="h-[420px] w-full rounded-xl border border-line bg-white"
              allowFullScreen
            />
          ) : (
            <p className="text-xs text-text-muted">{t('linkedinUnreadable')}</p>
          )}
          <a
            href={postUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A66C2] hover:underline"
          >
            <ExternalLink className="size-3.5" strokeWidth={2.2} />
            {t('linkedinOpen')}
            {savedDate && <span className="font-normal text-text-muted">· {savedDate}</span>}
          </a>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">{editable ? t('linkedinHint') : t('linkedinNone')}</p>
      )}

      {editable && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor={`linkedin-url-${articleId}`}>{t('linkedinUrlLabel')}</Label>
            <Input
              id={`linkedin-url-${articleId}`}
              type="url"
              value={url}
              placeholder="https://www.linkedin.com/feed/update/urn:li:activity:…"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`linkedin-date-${articleId}`}>{t('linkedinDateLabel')}</Label>
            <Input
              id={`linkedin-date-${articleId}`}
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={url.trim() === '' || save.isExecuting}
            onClick={() => save.execute({ id: articleId, url: url.trim(), postedAt: day || null })}
          >
            <Save className="size-4" strokeWidth={2.2} />
            {t('linkedinSave')}
          </Button>
          {postUrl && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={save.isExecuting}
              onClick={() => {
                setUrl('')
                setDay('')
                save.execute({ id: articleId, url: null, postedAt: null })
              }}
            >
              <X className="size-4" strokeWidth={2.2} />
              {t('linkedinRemove')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
