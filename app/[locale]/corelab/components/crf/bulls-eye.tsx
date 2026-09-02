'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { bullsEyeShapes } from '@/lib/corelab/crf/bullseye-geometry'
import { segmentColour } from '@/lib/corelab/crf/segment-colours'
import { Button } from '@/components/ui/button'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { SegmentValues } from '@/types/corelab'

type BullsEyeProps = {
  field: FieldDefinition
  value: SegmentValues | undefined
  onChange: (segments: SegmentValues) => void
  readOnly: boolean
}

export function BullsEye({ field, value, onChange, readOnly }: BullsEyeProps) {
  const t = useTranslations('corelab.form')
  const options = useMemo(() => field.options ?? [], [field.options])
  const segmentCount = field.segmentCount === 16 ? 16 : 17
  const shapes = useMemo(() => bullsEyeShapes(segmentCount, 316), [segmentCount])

  const [mode, setMode] = useState<'brush' | 'cycle'>('brush')
  const [brushOption, setBrushOption] = useState(options[0] ?? '')
  const painting = useRef(false)
  const draftRef = useRef<SegmentValues | null>(null)
  const [draft, setDraft] = useState<SegmentValues | null>(null)

  const segments = draft ?? value ?? {}

  function valueForSegment(segment: number, current: SegmentValues): unknown {
    if (mode === 'brush') return brushOption
    const currentValue = current[String(segment)]
    const index = options.indexOf(typeof currentValue === 'string' ? currentValue : '')
    return options[(index + 1) % Math.max(options.length, 1)] ?? null
  }

  function paint(segment: number) {
    if (readOnly || options.length === 0) return
    const base = draftRef.current ?? value ?? {}
    const next = { ...base, [String(segment)]: valueForSegment(segment, base) }
    draftRef.current = next
    setDraft(next)
  }

  function endGesture() {
    if (!painting.current) return
    painting.current = false
    const painted = draftRef.current
    draftRef.current = null
    setDraft(null)
    if (painted) onChange(painted)
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <svg
        width={316}
        height={316}
        viewBox="0 0 316 316"
        role="group"
        aria-label={field.name}
        className="flex-shrink-0 touch-none select-none"
        onPointerUp={endGesture}
        onPointerLeave={endGesture}
      >
        {shapes.map((shape) => {
          const raw = segments[String(shape.segment)]
          const colour = segmentColour(options.indexOf(typeof raw === 'string' ? raw : ''))
          return (
            <g key={shape.segment}>
              <path
                d={shape.path}
                fill={colour.fill}
                stroke={colour.border}
                strokeWidth={1.5}
                role="button"
                aria-label={t('segment', { number: shape.segment })}
                className={readOnly ? '' : 'cursor-pointer'}
                onPointerDown={(event) => {
                  event.preventDefault()
                  painting.current = true
                  paint(shape.segment)
                }}
                onPointerEnter={() => {
                  if (painting.current && mode === 'brush') paint(shape.segment)
                }}
              />
              <text
                x={shape.labelX}
                y={shape.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill={colour.text}
                pointerEvents="none"
              >
                {shape.segment}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === 'brush' ? 'default' : 'outline'} onClick={() => setMode('brush')}>
            {t('brush')}
          </Button>
          <Button type="button" size="sm" variant={mode === 'cycle' ? 'default' : 'outline'} onClick={() => setMode('cycle')}>
            {t('cycle')}
          </Button>
        </div>
        <p className="max-w-xs text-xs text-text-secondary">{mode === 'brush' ? t('brushHelp') : t('cycleHelp')}</p>
        <div className="flex flex-col gap-1">
          {options.map((option, index) => {
            const colour = segmentColour(index)
            const selected = mode === 'brush' && option === brushOption
            return (
              <button
                key={option}
                type="button"
                disabled={readOnly}
                aria-pressed={selected}
                onClick={() => setBrushOption(option)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm ${selected ? 'border-coral-500' : 'border-border'}`}
              >
                <span
                  className="inline-block h-4 w-4 rounded border"
                  style={{ background: colour.fill, borderColor: colour.border }}
                />
                <span className="text-text-primary">{option}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
