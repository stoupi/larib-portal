// A DOI is stored bare ("10.1093/ehjci/xyz") but sometimes arrives prefixed by an
// import, so links are built from the bare identifier whatever the stored shape.
export function bareDoi(doi: string | null): string | null {
  if (!doi) return null
  const trimmed = doi.trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return trimmed.length > 0 ? trimmed : null
}

export function doiUrl(doi: string | null): string | null {
  const identifier = bareDoi(doi)
  return identifier ? `https://doi.org/${identifier}` : null
}
