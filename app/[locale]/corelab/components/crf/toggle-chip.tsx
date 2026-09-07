'use client'

import { ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

// A selected value must read across the room: the pale toggle state hid it.
// ToggleGroupItem sizes items to share one row; a wrapping chip must keep its own width.
const CHIP = 'flex-none min-w-fit cursor-pointer rounded-[10px] first:rounded-[10px] last:rounded-[10px]'
  + ' border border-line bg-gray-25 text-text-secondary'
  + ' data-[state=on]:border-navy-700 data-[state=on]:bg-navy-700 data-[state=on]:font-semibold data-[state=on]:text-white'
  + ' hover:bg-gray-50 data-[state=on]:hover:bg-navy-700'

export function ToggleChip({ value, children, size = 'md' }: { value: string; children: React.ReactNode; size?: 'md' | 'sm' }) {
  return (
    <ToggleGroupItem
      value={value}
      className={cn(CHIP, size === 'md' ? 'h-9 min-w-[60px] px-3.5 text-sm' : 'h-8 gap-1.5 px-3 text-[13px]')}
    >
      {children}
    </ToggleGroupItem>
  )
}
