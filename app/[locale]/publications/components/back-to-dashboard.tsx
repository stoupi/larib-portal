import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'

export async function BackToDashboard({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'publications.adminHome' })
  return (
    <Link
      href="/publications/admin"
      className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-line bg-bg-surface px-3.5 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 hover:text-coral-600 dark:hover:bg-white/5 dark:hover:text-coral-300"
    >
      <ArrowLeft className="size-4" strokeWidth={2.2} />
      {t('backToDashboard')}
    </Link>
  )
}
