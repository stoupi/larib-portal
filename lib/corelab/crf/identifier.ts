// A field identifier becomes an export column: the schema only accepts lowercase,
// digits and underscores, so both the derived and the typed form are kept to that.
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function asIdentifier(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}
