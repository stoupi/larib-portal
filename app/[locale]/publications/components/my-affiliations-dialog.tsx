'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, GripVertical, Plus, Save, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { updateMyAffiliationsAction } from '../actions'

const AFFILIATIONS_MAX = 10
const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

// Two affiliations can read the same while being distinct rows, so the sortable key is a
// row identity of its own rather than the text.
type AffiliationRow = { id: string; raw: string }

function SortableAffiliationRow({
  row,
  rank,
  onRemove,
}: {
  row: AffiliationRow
  rank: number
  onRemove: () => void
}) {
  const t = useTranslations('publications.myAffiliations')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-line bg-gray-25 px-4 py-3 dark:bg-white/5',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        aria-label={t('reorder', { affiliation: row.raw })}
        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-text-muted transition hover:bg-gray-50 hover:text-text-secondary active:cursor-grabbing dark:hover:bg-white/5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-600">
        {rank}
      </span>
      <span className="flex-1 text-sm leading-snug text-text-primary">{row.raw}</span>
      <button
        type="button"
        aria-label={t('remove', { affiliation: row.raw })}
        onClick={onRemove}
        className="shrink-0 text-text-muted transition hover:text-coral-600"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}

export function MyAffiliationsDialog({
  affiliations,
  derivedFromPublications,
  compact = false,
}: {
  affiliations: string[]
  derivedFromPublications: boolean
  compact?: boolean
}) {
  const t = useTranslations('publications.myAffiliations')
  const tAuthors = useTranslations('publications.authors')
  const router = useRouter()
  const nextRowId = useRef(0)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<AffiliationRow[]>([])
  const [newAffiliation, setNewAffiliation] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function makeRow(raw: string): AffiliationRow {
    nextRowId.current += 1
    return { id: `affiliation-${nextRowId.current}`, raw }
  }

  function openDialog(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setRows(affiliations.map(makeRow))
      setNewAffiliation('')
    }
  }

  function addAffiliation() {
    const value = newAffiliation.trim()
    if (!value || rows.length >= AFFILIATIONS_MAX) return
    setRows((current) => [...current, makeRow(value)])
    setNewAffiliation('')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = rows.findIndex((row) => row.id === active.id)
    const toIndex = rows.findIndex((row) => row.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    setRows(arrayMove(rows, fromIndex, toIndex))
  }

  const save = useAction(updateMyAffiliationsAction, {
    onSuccess() {
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    },
    onError() {
      toast.error(t('error'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-bg-surface font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5',
            compact ? 'h-8 px-3 text-[12px]' : 'h-11 px-5 text-sm',
          )}
        >
          <Building2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.2} />
          {t('title')}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <section className="space-y-4 rounded-2xl border border-line bg-bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">
              {tAuthors('add.affiliations')}
            </h3>
            <span className="text-xs font-normal normal-case text-text-muted">
              {tAuthors('add.affiliationsHint')}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {derivedFromPublications && rows.length > 0 && (
            <p className="text-[13px] leading-relaxed text-text-secondary">{t('derivedHint')}</p>
          )}

          {rows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">{t('reorderHint')}</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {rows.map((row, index) => (
                      <SortableAffiliationRow
                        key={row.id}
                        row={row}
                        rank={index + 1}
                        onRemove={() => setRows(rows.filter((candidate) => candidate.id !== row.id))}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary">{t('empty')}</p>
          )}

          <div className="flex gap-2">
            <Input
              value={newAffiliation}
              aria-label={t('addLabel')}
              placeholder={t('addPlaceholder')}
              onChange={(event) => setNewAffiliation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addAffiliation()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addAffiliation} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('add')}
            </Button>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={save.isExecuting}
            onClick={() => save.execute({ affiliations: rows.map((row) => row.raw) })}
            className={CORAL}
          >
            <Save className="h-4 w-4" />
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
