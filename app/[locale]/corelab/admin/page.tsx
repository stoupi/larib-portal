import { redirect } from 'next/navigation'
import { applicationLink } from '@/lib/application-link'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabAdminPage({ params }: PageParams) {
  const { locale } = await params
  redirect(applicationLink(locale, '/corelab/admin/studies'))
}
