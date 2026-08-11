'use client'

import { useTranslations } from 'next-intl'
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
import { GripVertical, Mail, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AuthorshipEntry } from '@/lib/publications/author-list'
import type { PickerAuthor } from '@/lib/publications/author-picker'
import { OurTeamDot } from './our-team-dot'

type AuthorRowContent = {
  name: string
  initials: string
  degrees: string | null
  centreName: string | null
  isOurTeam: boolean
}

function rowContent(authorId: string, author: PickerAuthor | undefined): AuthorRowContent {
  if (!author) {
    return { name: authorId, initials: '?', degrees: null, centreName: null, isOurTeam: false }
  }
  const fallbackInitials = `${author.firstName.charAt(0)}${author.lastName.charAt(0)}`.toUpperCase()
  return {
    name: `${author.firstName} ${author.lastName.toUpperCase()}`.trim(),
    initials: author.initials ?? fallbackInitials,
    degrees: author.degrees,
    centreName: author.centreName,
    isOurTeam: author.isOurTeam,
  }
}

function AuthorIdentity({ rank, content, isCorresponding }: { rank: number; content: AuthorRowContent; isCorresponding: boolean }) {
  const t = useTranslations('publications.editor')
  return (
    <>
      <span className="w-5 shrink-0 text-center text-xs font-bold text-text-muted tabular-nums">{rank}</span>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-50 text-[11px] font-extrabold text-coral-600 dark:bg-coral-500/15 dark:text-coral-300">
        {content.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {content.name}
          {content.degrees && <span className="ml-1.5 font-normal text-text-muted">{content.degrees}</span>}
          {content.isOurTeam && <OurTeamDot className="ml-2 align-middle" />}
          {isCorresponding && (
            <span className="ml-2 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-text-secondary dark:bg-white/5">
              {t('order.corresponding')}
            </span>
          )}
        </p>
        {content.centreName && <p className="truncate text-xs text-text-secondary">{content.centreName}</p>}
      </div>
    </>
  )
}

function SortableAuthorRow({
  entry,
  rank,
  content,
  onToggleCorresponding,
  onRemove,
}: {
  entry: AuthorshipEntry
  rank: number
  content: AuthorRowContent
  onToggleCorresponding: () => void
  onRemove: () => void
}) {
  const t = useTranslations('publications.editor')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.authorId,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2 transition',
        entry.isCorresponding
          ? 'border-coral-300 bg-coral-50 dark:border-coral-500/40 dark:bg-coral-500/10'
          : 'border-line bg-bg-surface',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        aria-label={t('order.reorder')}
        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-text-muted transition hover:bg-gray-50 hover:text-text-secondary active:cursor-grabbing dark:hover:bg-white/5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <AuthorIdentity rank={rank} content={content} isCorresponding={entry.isCorresponding} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('order.markCorresponding')}
        aria-pressed={entry.isCorresponding}
        onClick={onToggleCorresponding}
        className={cn('h-8 w-8 shrink-0', entry.isCorresponding ? 'text-coral-600 dark:text-coral-300' : 'text-text-muted')}
      >
        <Mail className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('order.remove')}
        onClick={onRemove}
        className="h-8 w-8 shrink-0 text-text-muted hover:text-coral-600 dark:hover:text-coral-300"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}

export function AuthorOrderList({
  entries,
  authorsById,
  onReorder,
  onToggleCorresponding,
  onRemove,
  editable,
}: {
  entries: AuthorshipEntry[]
  authorsById: Map<string, PickerAuthor>
  onReorder: (entries: AuthorshipEntry[]) => void
  onToggleCorresponding: (authorId: string) => void
  onRemove: (authorId: string) => void
  editable: boolean
}) {
  const t = useTranslations('publications.editor')
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = entries.findIndex((entry) => entry.authorId === active.id)
    const toIndex = entries.findIndex((entry) => entry.authorId === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    onReorder(arrayMove(entries, fromIndex, toIndex))
  }

  if (!editable) {
    return (
      <ul className="space-y-1.5">
        {entries.map((entry, index) => (
          <li
            key={entry.authorId}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2',
              entry.isCorresponding
                ? 'border-coral-300 bg-coral-50 dark:border-coral-500/40 dark:bg-coral-500/10'
                : 'border-line bg-bg-surface',
            )}
          >
            <AuthorIdentity
              rank={index + 1}
              content={rowContent(entry.authorId, authorsById.get(entry.authorId))}
              isCorresponding={entry.isCorresponding}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">{t('order.hint')}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={entries.map((entry) => entry.authorId)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {entries.map((entry, index) => (
              <SortableAuthorRow
                key={entry.authorId}
                entry={entry}
                rank={index + 1}
                content={rowContent(entry.authorId, authorsById.get(entry.authorId))}
                onToggleCorresponding={() => onToggleCorresponding(entry.authorId)}
                onRemove={() => onRemove(entry.authorId)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
