import { prisma } from '@/lib/prisma'
import { articleStatusBackfill } from '@/lib/publications/submission-rules'
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

// Publications written before the status followed its submission kept whatever status was
// last typed by hand. This realigns them once; from then on the app keeps them in step.
// Dry run by default — pass --apply to write.
const APPLY = process.argv.includes('--apply')

async function main() {
  const articles = await prisma.article.findMany({
    where: { submissions: { some: {} } },
    select: {
      id: true,
      title: true,
      status: true,
      submissions: { orderBy: { submittedAt: 'asc' }, select: { status: true } },
    },
    orderBy: { title: 'asc' },
  })

  const changes = articles.flatMap((article) => {
    const latest = article.submissions.at(-1)
    if (!latest) return []
    const next = articleStatusBackfill(latest.status as SubmissionStatusValue, article.status as ArticleStatusValue)
    if (!next) return []
    return [{ id: article.id, title: article.title, from: article.status, to: next, submission: latest.status }]
  })

  console.log(`${articles.length} publications with at least one submission`)
  console.log(`${changes.length} to realign${APPLY ? '' : ' (dry run — pass --apply to write)'}\n`)

  for (const change of changes) {
    console.log(`  ${change.from} → ${change.to}  [submission: ${change.submission}]  ${change.title.slice(0, 70)}`)
  }

  if (APPLY) {
    for (const change of changes) {
      await prisma.article.update({ where: { id: change.id }, data: { status: change.to } })
    }
    console.log(`\n✅ ${changes.length} publications realigned`)
  }

  await prisma.$disconnect()
}

main()
