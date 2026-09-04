'use client'

import { Button } from '@/components/ui/button'

export type QuickAccount = { label: string; email: string }

// Development only: the parent renders nothing in a production build.
export const QUICK_ACCOUNTS: QuickAccount[] = [
  { label: 'Portal admin', email: 'test-admin@larib-portal.test' },
  { label: 'Core Lab admin', email: 'corelab-admin@larib-portal.test' },
  { label: 'Core Lab reader', email: 'corelab-reader-1@larib-portal.test' },
  { label: 'Core Lab investigator', email: 'corelab-pi@larib-portal.test' },
  { label: 'Portal user', email: 'test-user@larib-portal.test' },
]

export const QUICK_PASSWORD = 'ristifou'

export function DevQuickLogin({ onPick }: { onPick: (account: QuickAccount) => void }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border bg-neutral-50 p-3">
      <p className="text-xs font-medium text-text-secondary">Test accounts — development only</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPick(account)}
          >
            {account.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-text-secondary">Password: {QUICK_PASSWORD}</p>
    </div>
  )
}
