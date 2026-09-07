'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ValueSetsPane } from './value-sets-pane'
import { VariablesPane } from './variables-pane'
import { BlocksPane } from './blocks-pane'
import { NewValueSetDialog } from './new-value-set-dialog'
import { NewVariableDialog } from './new-variable-dialog'
import { NewBlockDialog } from './new-block-dialog'
import type { LibraryBlock, LibraryVariableWithUsage, ValueSet } from '@/lib/services/corelab/library'

type Tab = 'valueSets' | 'variables' | 'blocks'
type LibraryTabsProps = { valueSets: ValueSet[]; variables: LibraryVariableWithUsage[]; blocks: LibraryBlock[] }

export function LibraryTabs({ valueSets, variables, blocks }: LibraryTabsProps) {
  const t = useTranslations('corelab.library')
  const [tab, setTab] = useState<Tab>('valueSets')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <nav className="flex flex-wrap gap-1">
          {(['valueSets', 'variables', 'blocks'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'cursor-pointer px-3.5 py-2 text-sm',
                tab === key ? 'font-semibold text-text-primary shadow-[inset_0_-2px_0_var(--color-coral-600)]' : 'text-text-secondary',
              )}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </nav>
        <div className="pb-2">
          {tab === 'valueSets' ? <NewValueSetDialog /> : null}
          {tab === 'variables' ? <NewVariableDialog valueSets={valueSets} /> : null}
          {tab === 'blocks' ? <NewBlockDialog variables={variables} valueSets={valueSets} /> : null}
        </div>
      </div>

      {tab === 'valueSets' ? <ValueSetsPane valueSets={valueSets} /> : null}
      {tab === 'variables' ? <VariablesPane variables={variables} valueSets={valueSets} /> : null}
      {tab === 'blocks' ? <BlocksPane blocks={blocks} /> : null}
    </div>
  )
}
