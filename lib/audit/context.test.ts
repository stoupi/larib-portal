import { describe, expect, it, vi } from 'vitest'
import { currentAuditOperation, pushAuditCapture, pushAuditEvent, runAuditedOperation } from './context'
import type { AuditOperation } from './context'

const META = {
  actorId: 'user-1',
  actorLabel: 'Solenn Toupin',
  source: 'UI' as const,
  summary: 'updateArticleStatus',
}

function statusEvent() {
  return {
    model: 'Article',
    entity: 'ARTICLE' as const,
    entityId: 'article-1',
    entityLabel: 'A paper',
    articleId: 'article-1',
    action: 'UPDATE' as const,
    changes: [{ field: 'status', oldValue: 'UNDER_REVIEW', newValue: 'ACCEPTED' }],
  }
}

describe('runAuditedOperation', () => {
  it('exposes the operation to everything running inside it', async () => {
    await runAuditedOperation(
      META,
      async () => {
        const operation = currentAuditOperation()
        expect(operation?.actorId).toBe('user-1')
        expect(operation?.summary).toBe('updateArticleStatus')
        expect(operation?.operationId).toMatch(/.+/)
      },
      vi.fn(),
    )
  })

  it('exposes nothing outside of an operation', () => {
    expect(currentAuditOperation()).toBeNull()
  })

  it('gives every operation its own identifier', async () => {
    const ids: string[] = []
    const collect = async () => {
      await runAuditedOperation(
        META,
        async () => {
          ids.push(currentAuditOperation()?.operationId ?? '')
        },
        vi.fn(),
      )
    }
    await collect()
    await collect()
    expect(ids[0]).not.toBe(ids[1])
  })

  it('flushes the buffered events once the work succeeded', async () => {
    const flush = vi.fn()
    await runAuditedOperation(
      META,
      async () => {
        pushAuditEvent(statusEvent())
      },
      flush,
    )

    expect(flush).toHaveBeenCalledTimes(1)
    const [operation] = flush.mock.calls[0]
    expect(operation.events).toHaveLength(1)
    expect(operation.events[0].entityId).toBe('article-1')
  })

  it('does not flush when the work threw', async () => {
    const flush = vi.fn()
    await expect(
      runAuditedOperation(
        META,
        async () => {
          pushAuditEvent(statusEvent())
          throw new Error('mutation failed')
        },
        flush,
      ),
    ).rejects.toThrow('mutation failed')
    expect(flush).not.toHaveBeenCalled()
  })

  it('does not flush when nothing was recorded', async () => {
    const flush = vi.fn()
    await runAuditedOperation(META, async () => 'nothing to record', flush)
    expect(flush).not.toHaveBeenCalled()
  })

  it('lets the work succeed even when flushing blows up', async () => {
    const flush = vi.fn().mockRejectedValue(new Error('database down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      runAuditedOperation(
        META,
        async () => {
          pushAuditEvent(statusEvent())
          return 'saved'
        },
        flush,
      ),
    ).resolves.toBe('saved')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('drops buffered events on the floor when there is no operation', () => {
    expect(() => pushAuditEvent(statusEvent())).not.toThrow()
  })
})

describe('deferred captures', () => {
  function recordingFlush() {
    const flushed: AuditOperation[] = []
    const flush = vi.fn(async (operation: AuditOperation) => {
      flushed.push(operation)
    })
    return { flush, flushed }
  }

  it('resolves them only once the work is over, so a committed transaction is seen', async () => {
    const order: string[] = []
    const { flush, flushed } = recordingFlush()

    await runAuditedOperation(
      META,
      async () => {
        pushAuditCapture(async () => {
          order.push('capture')
          return [statusEvent()]
        })
        order.push('work')
      },
      flush,
    )

    expect(order).toEqual(['work', 'capture'])
    expect(flush).toHaveBeenCalledOnce()
    expect(flushed[0].events).toHaveLength(1)
  })

  it('flushes nothing when every capture comes back empty', async () => {
    const { flush } = recordingFlush()
    await runAuditedOperation(META, async () => pushAuditCapture(async () => []), flush)
    expect(flush).not.toHaveBeenCalled()
  })

  it('keeps the other captures when one throws', async () => {
    const { flush, flushed } = recordingFlush()
    await runAuditedOperation(
      META,
      async () => {
        pushAuditCapture(async () => {
          throw new Error('read failed')
        })
        pushAuditCapture(async () => [statusEvent()])
      },
      flush,
    )
    expect(flushed[0].events).toHaveLength(1)
  })

  it('ignores a capture pushed outside any operation', () => {
    expect(() => pushAuditCapture(async () => [statusEvent()])).not.toThrow()
  })
})
