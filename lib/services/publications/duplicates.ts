import { prisma } from '@/lib/prisma'
import { authorDuplicateKey, duplicateGroups, journalDuplicateKey } from '@/lib/publications/duplicate-groups'

export type LibraryDuplicates = {
  authors: { count: number; samples: string[] }
  journals: { count: number; samples: string[] }
}

const SAMPLE_SIZE = 3

export async function findLibraryDuplicates(): Promise<LibraryDuplicates> {
  const [authors, journals] = await Promise.all([
    prisma.author.findMany({ select: { id: true, firstName: true, lastName: true } }),
    prisma.journal.findMany({ select: { id: true, name: true, issn: true } }),
  ])

  const authorGroups = duplicateGroups(
    authors.map((author) => ({
      id: author.id,
      label: `${author.firstName} ${author.lastName}`.trim(),
      key: authorDuplicateKey(author),
    })),
  )
  const journalGroups = duplicateGroups(
    journals.map((journal) => ({ id: journal.id, label: journal.name, key: journalDuplicateKey(journal) })),
  )

  return {
    authors: {
      count: authorGroups.length,
      samples: authorGroups.slice(0, SAMPLE_SIZE).map((group) => group.members[0].label),
    },
    journals: {
      count: journalGroups.length,
      samples: journalGroups.slice(0, SAMPLE_SIZE).map((group) => group.members[0].label),
    },
  }
}
