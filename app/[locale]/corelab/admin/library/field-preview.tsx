'use client'

import { useState } from 'react'
import { FieldRow } from '@/app/[locale]/corelab/components/crf/field-row'
import { defaultSequenceValues } from '@/lib/corelab/crf/values'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { FieldValue } from '@/types/corelab'

function initialValue(field: FieldDefinition): FieldValue | undefined {
  return defaultSequenceValues({ id: 'preview', name: 'preview', sections: [{ id: 'preview', name: 'preview', fields: [field] }] })[field.id]
}

export function FieldPreview({ field }: { field: FieldDefinition }) {
  const [value, setValue] = useState<FieldValue | undefined>(() => initialValue(field))
  return <FieldRow field={field} value={value} onChange={(next) => setValue(next ?? undefined)} readOnly={false} />
}
