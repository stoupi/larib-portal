"use client"
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setPasswordFromInviteAction } from '../actions'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type WelcomeErrorKey = 'invalidLink' | 'passwordsNotMatch' | 'genericError'

function resolveErrorKey(serverError: string | undefined, confirmErrors: string[]): WelcomeErrorKey {
  if (confirmErrors.includes('PASSWORDS_NOT_MATCH')) return 'passwordsNotMatch'
  if (serverError === 'INVALID_OR_EXPIRED_TOKEN') return 'invalidLink'
  return 'genericError'
}

export function ClientForm({ token, locale }: { token: string; locale: string }) {
  const t = useTranslations('welcome')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { execute, isExecuting } = useAction(setPasswordFromInviteAction, {
    onSuccess() {
      window.location.href = `/${locale}/dashboard`
    },
    onError({ error: { serverError, validationErrors } }) {
      const confirmErrors = validationErrors?.confirm?._errors ?? []
      const message = t(resolveErrorKey(serverError, confirmErrors))
      setError(message)
      toast.error(message)
    },
  })

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    execute({ token, password, confirm })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">{t('password')}</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <div>
        <label className="block text-sm mb-1">{t('confirmPassword')}</label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={isExecuting} className="w-full">
        {isExecuting ? t('saving') : t('setPassword')}
      </Button>
    </form>
  )
}
