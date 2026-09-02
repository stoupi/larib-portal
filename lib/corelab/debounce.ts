export type Debouncer<T> = {
  push: (item: T) => void
  flushNow: () => void
}

export function createDebouncer<T>(delayMs: number, flush: (batch: T[]) => void): Debouncer<T> {
  let pending: T[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    push(item: T) {
      pending.push(item)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const batch = pending
        pending = []
        timer = null
        flush(batch)
      }, delayMs)
    },
    flushNow() {
      if (timer) clearTimeout(timer)
      timer = null
      if (pending.length === 0) return
      const batch = pending
      pending = []
      flush(batch)
    },
  }
}
