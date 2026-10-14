import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { canManageUsers, grantableApplications } from "@/lib/permissions"
import { listDirectoryUsers } from "@/lib/services/user-managers"
import { listPositions } from "@/lib/services/positions"
import { PageHeader } from "@/app/[locale]/components/page-header"
import { InviteMemberDialog } from "./invite-member-dialog"
import { MemberDirectory } from "./member-directory"

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canManageUsers(session.user)) notFound()

  const t = await getTranslations({ locale, namespace: "userManagement" })
  const [users, positions] = await Promise.all([listDirectoryUsers(), listPositions()])
  const grantable = grantableApplications(session.user)

  return (
    <div className="min-h-full px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader title={t("title")} subtitle={t("subtitle")} />
          <InviteMemberDialog
            grantable={grantable}
            positions={positions.map((position) => position.name)}
            locale={locale === "fr" ? "fr" : "en"}
          />
        </div>
        <MemberDirectory users={users} grantable={grantable} />
      </div>
    </div>
  )
}
