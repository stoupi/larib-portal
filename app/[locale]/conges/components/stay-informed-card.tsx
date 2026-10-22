'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CalendarPlus, Check, Copy, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { CongesRecapPreferences } from '@/lib/services/conges/recap'
import { updateCongesRecapPreferencesAction } from '../actions'

const GOOGLE_CALENDAR_ADD_BY_URL = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl'

type StayInformedCardProps = {
  feedUrl: string | null
  initialPreferences: CongesRecapPreferences
}

export function StayInformedCard({ feedUrl, initialPreferences }: StayInformedCardProps) {
  const t = useTranslations('conges.stayInformed')
  const [preferences, setPreferences] = useState(initialPreferences)
  const [copied, setCopied] = useState(false)

  const { execute: savePreferences, isExecuting } = useAction(updateCongesRecapPreferencesAction, {
    onSuccess: () => toast.success(t('saved')),
    onError: () => {
      setPreferences(initialPreferences)
      toast.error(t('saveError'))
    },
  })

  const togglePreference = (key: keyof CongesRecapPreferences, checked: boolean) => {
    const nextPreferences = { ...preferences, [key]: checked }
    setPreferences(nextPreferences)
    savePreferences(nextPreferences)
  }

  const copyFeedUrl = async () => {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    toast.success(t('calendar.copied'))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-8 lg:grid-cols-2'>
        <div className='space-y-3'>
          <div className='flex items-center gap-2 font-medium'>
            <CalendarPlus className='size-4' />
            {t('calendar.title')}
          </div>
          {feedUrl ? (
            <>
              <p className='text-sm text-text-secondary'>{t('calendar.description')}</p>
              <div className='flex gap-2'>
                <Input readOnly value={feedUrl} aria-label={t('calendar.urlLabel')} onFocus={(event) => event.target.select()} />
                <Button type='button' variant='outline' onClick={copyFeedUrl}>
                  {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
                  {t('calendar.copy')}
                </Button>
              </div>
              <ol className='list-decimal space-y-1 pl-5 text-sm text-text-secondary'>
                <li>{t('calendar.stepCopy')}</li>
                <li>
                  <a href={GOOGLE_CALENDAR_ADD_BY_URL} target='_blank' rel='noreferrer' className='underline'>
                    {t('calendar.stepOpen')}
                  </a>
                </li>
                <li>{t('calendar.stepPaste')}</li>
              </ol>
              <p className='text-xs text-text-secondary'>{t('calendar.delayNote')}</p>
            </>
          ) : (
            <p className='text-sm text-text-secondary'>{t('calendar.unavailable')}</p>
          )}
        </div>
        <div className='space-y-3'>
          <div className='flex items-center gap-2 font-medium'>
            <Mail className='size-4' />
            {t('email.title')}
          </div>
          <p className='text-sm text-text-secondary'>{t('email.description')}</p>
          <div className='flex items-center justify-between gap-4 rounded-md border border-line p-3'>
            <Label htmlFor='conges-recap-weekly'>{t('email.weekly')}</Label>
            <Switch
              id='conges-recap-weekly'
              checked={preferences.weekly}
              disabled={isExecuting}
              onCheckedChange={(checked) => togglePreference('weekly', checked)}
            />
          </div>
          <div className='flex items-center justify-between gap-4 rounded-md border border-line p-3'>
            <Label htmlFor='conges-recap-monthly'>{t('email.monthly')}</Label>
            <Switch
              id='conges-recap-monthly'
              checked={preferences.monthly}
              disabled={isExecuting}
              onCheckedChange={(checked) => togglePreference('monthly', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
