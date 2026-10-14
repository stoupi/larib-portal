"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Search, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toActiveApplications, type ActiveApplication } from "@/lib/permissions"
import { applicationsToAdd } from "@/lib/user-management/grants"
import type { DirectoryUser } from "@/lib/services/user-managers"
import { directoryUserName } from "@/lib/user-management/display-name"
import { GrantApplicationsDialog } from "./grant-applications-dialog"

export function MemberDirectory({ users, grantable }: { users: DirectoryUser[]; grantable: ActiveApplication[] }) {
  const t = useTranslations("userManagement")
  const tAdmin = useTranslations("admin")
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()
  const visibleUsers = normalizedQuery
    ? users.filter((user) => `${directoryUserName(user)} ${user.email}`.toLowerCase().includes(normalizedQuery))
    : users

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          className="pl-9"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("applications")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-text-muted">{t("noResult")}</TableCell>
              </TableRow>
            )}
            {visibleUsers.map((user) => {
              const name = directoryUserName(user)
              const held = toActiveApplications(Array.from(new Set([...user.applications, ...user.adminApplications])))
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-text-primary">
                    <div>{name}</div>
                    {user.position && <div className="text-xs text-text-secondary">{user.position}</div>}
                  </TableCell>
                  <TableCell className="text-text-secondary">{user.email}</TableCell>
                  <TableCell>
                    {held.length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {held.map((application) => (
                          <span
                            key={application}
                            className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-xs font-medium text-text-primary"
                          >
                            {tAdmin(`app_${application}`)}
                            {user.adminApplications.includes(application) && <Shield className="size-3 text-navy-700" aria-label={tAdmin("appColAdmin")} />}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <GrantApplicationsDialog
                      userId={user.id}
                      userName={name}
                      options={applicationsToAdd(user, grantable)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
