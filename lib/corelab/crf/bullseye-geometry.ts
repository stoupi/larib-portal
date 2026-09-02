export type SegmentShape = { segment: number; path: string; labelX: number; labelY: number }

const RINGS: Array<{ outer: number; inner: number }> = [
  { outer: 132, inner: 100 },
  { outer: 100, inner: 68 },
  { outer: 68, inner: 34 },
]
const APEX_RADIUS = 34
const REFERENCE_SIZE = 316

const BASAL_ORDER = [1, 6, 5, 4, 3, 2]
const MID_ORDER = [7, 12, 11, 10, 9, 8]
const APICAL_ORDER = [13, 16, 15, 14]

function pointOn(centre: number, radius: number, degrees: number, scale: number): [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180
  return [centre + radius * scale * Math.cos(radians), centre + radius * scale * Math.sin(radians)]
}

function sectorPath(centre: number, ring: { outer: number; inner: number }, from: number, to: number, scale: number): string {
  const [outerStartX, outerStartY] = pointOn(centre, ring.outer, from, scale)
  const [outerEndX, outerEndY] = pointOn(centre, ring.outer, to, scale)
  const [innerEndX, innerEndY] = pointOn(centre, ring.inner, to, scale)
  const [innerStartX, innerStartY] = pointOn(centre, ring.inner, from, scale)
  const largeArc = to - from > 180 ? 1 : 0
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${ring.outer * scale} ${ring.outer * scale} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${ring.inner * scale} ${ring.inner * scale} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    'Z',
  ].join(' ')
}

function ringShapes(
  centre: number,
  ring: { outer: number; inner: number },
  order: number[],
  startAngle: number,
  scale: number,
): SegmentShape[] {
  const span = 360 / order.length
  return order.map((segment, index) => {
    const from = startAngle + index * span
    const to = from + span
    const [labelX, labelY] = pointOn(centre, (ring.outer + ring.inner) / 2, from + span / 2, scale)
    return { segment, path: sectorPath(centre, ring, from, to, scale), labelX, labelY }
  })
}

export function bullsEyeShapes(segmentCount: 16 | 17, size = REFERENCE_SIZE): SegmentShape[] {
  const centre = size / 2
  const scale = size / REFERENCE_SIZE
  const shapes = [
    ...ringShapes(centre, RINGS[0], BASAL_ORDER, -30, scale),
    ...ringShapes(centre, RINGS[1], MID_ORDER, -30, scale),
    ...ringShapes(centre, RINGS[2], APICAL_ORDER, -45, scale),
  ]
  if (segmentCount === 16) return shapes

  const apexRadius = APEX_RADIUS * scale
  const apexPath = [
    `M ${centre} ${centre - apexRadius}`,
    `A ${apexRadius} ${apexRadius} 0 1 1 ${centre - 0.01} ${centre - apexRadius}`,
    'Z',
  ].join(' ')
  return [...shapes, { segment: 17, path: apexPath, labelX: centre, labelY: centre }]
}
