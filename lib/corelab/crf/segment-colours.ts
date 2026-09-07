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

function channels(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function mixWithBlack(rgb: [number, number, number], amount: number): string {
  const mixed = rgb.map((channel) => Math.round(channel * (1 - amount)))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [red, green, blue] = rgb.map((channel) => {
    const ratio = channel / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

// A value set that carries a colour paints the bull's eye with it; the palette is the fallback.
export function resolveSegmentColour(optionIndex: number, colour: string | null | undefined) {
  const rgb = colour ? channels(colour) : null
  if (!rgb || !colour) return segmentColour(optionIndex)
  const luminance = relativeLuminance(rgb)
  return {
    fill: colour,
    border: mixWithBlack(rgb, 0.16),
    text: luminance > 0.55 ? mixWithBlack(rgb, 0.72) : '#ffffff',
  }
}
