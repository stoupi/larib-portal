"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { AppWindow } from "lucide-react"
import { useRouter } from "@/app/i18n/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ActiveApplication } from "@/lib/permissions"
import { grantMemberApplicationsAction } from "./actions"
import { ApplicationChecklist } from "./application-checklist"
import { knownUserManagementError } from "./action-error"

export function GrantApplicationsDialog({
  userId,
  userName,
  options,
}: {
  userId: string
  userName: string
  options: ActiveApplication[]
}) {
  const t = useTranslations("userManagement")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ActiveApplication[]>([])

  const { execute, isExecuting } = useAction(grantMemberApplicationsAction, {
    onSuccess() {
      toast.success(t("grantSuccess"))
      setOpen(false)
      setSelected([])
      router.refresh()
    },
    onError({ error }) {
      const known = knownUserManagementError(error.serverError)
      toast.error(known ? t(`errors.${known}`) : t("errors.generic"))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={options.length === 0} aria-label={t("grantButtonFor", { name: userName })}>
          <AppWindow className="size-4" />
          {t("grantButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("grantTitle", { name: userName })}</DialogTitle>
          <DialogDescription>{t("memberOnlyHint")}</DialogDescription>
        </DialogHeader>
        <ApplicationChecklist options={options} selected={selected} onChange={setSelected} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button
            type="button"
            disabled={selected.length === 0 || isExecuting}
            onClick={() => execute({ userId, applications: selected })}
          >
            {isExecuting ? t("sending") : t("grantConfirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
