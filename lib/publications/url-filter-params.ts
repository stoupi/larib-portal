export function readOneOfParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  const raw = params.get(key)
  if (raw === null) return defaultValue
  return (allowedValues as readonly string[]).includes(raw) ? (raw as T) : defaultValue
}
