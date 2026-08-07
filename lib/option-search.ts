function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// cmdk ranks by fuzzy subsequence, so "La Riboisière" beats "AP-HP - Lariboisière"
// for the query "larib". Rank whole-substring matches first, earliest match wins,
// and fall back to a subsequence so nothing that used to match disappears.
export function optionSearchScore(label: string, search: string): number {
  const needle = normalize(search)
  if (needle === '') return 1
  const haystack = normalize(label)

  const index = haystack.indexOf(needle)
  if (index === 0) return 1
  if (index > 0) return 0.9 - Math.min(index, 100) / 1000

  let position = 0
  for (const character of needle) {
    position = haystack.indexOf(character, position)
    if (position === -1) return 0
    position += 1
  }
  return 0.3
}
