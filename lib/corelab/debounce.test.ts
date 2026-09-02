import { describe, expect, it, vi, afterEach } from 'vitest'
import { createDebouncer } from './debounce'

afterEach(() => {
  vi.useRealTimers()
})

describe('createDebouncer', () => {
  it('collapses several pushes into one flush', () => {
    vi.useFakeTimers()
    const flush = vi.fn()
    const debouncer = createDebouncer<number>(300, flush)
    debouncer.push(1)
    vi.advanceTimersByTime(100)
    debouncer.push(2)
    vi.advanceTimersByTime(100)
    debouncer.push(3)
    expect(flush).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith([1, 2, 3])
  })

  it('flushes immediately on demand and forgets the pending timer', () => {
    vi.useFakeTimers()
    const flush = vi.fn()
    const debouncer = createDebouncer<string>(300, flush)
    debouncer.push('a')
    debouncer.flushNow()
    expect(flush).toHaveBeenCalledWith(['a'])
    vi.advanceTimersByTime(1000)
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there is nothing pending', () => {
    vi.useFakeTimers()
    const flush = vi.fn()
    createDebouncer<string>(300, flush).flushNow()
    expect(flush).not.toHaveBeenCalled()
  })
})
