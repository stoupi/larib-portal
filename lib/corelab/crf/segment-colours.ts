export const SEGMENT_COLOURS = [
  { fill: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  { fill: '#FEFCE8', border: '#FDE68A', text: '#92400E' },
  { fill: '#FFF3E9', border: '#FDBA74', text: '#C2410C' },
  { fill: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
  { fill: '#FFE4EC', border: '#FBCFE8', text: '#BE185D' },
  { fill: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
] as const

export const EMPTY_SEGMENT_COLOUR = { fill: '#ffffff', border: '#dde2e9', text: '#6b7685' }

export function segmentColour(optionIndex: number) {
  if (optionIndex < 0) return EMPTY_SEGMENT_COLOUR
  return SEGMENT_COLOURS[optionIndex % SEGMENT_COLOURS.length]
}
