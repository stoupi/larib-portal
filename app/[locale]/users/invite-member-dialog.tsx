"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Plus, Send, UserPlus } from "lucide-react"
import { useRouter } from "@/app/i18n/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ACTIVE_APPLICATIONS, type ActiveApplication } from "@/lib/permissions"
import { inviteMemberAction } from "./actions"
import { ApplicationChecklist } from "./application-checklist"
import { knownUserManagementError } from "./action-error"

const InviteFormSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  position: z.string(),
  arrivalDate: z.string().min(1),
  departureDate: z.string().min(1),
  locale: z.enum(["en", "fr"]),
  applications: z.array(z.enum(ACTIVE_APPLICATIONS)),
})

type InviteFormValues = z.infer<typeof InviteFormSchema>

export function InviteMemberDialog({
  grantable,
  positions,
  locale,
}: {
  grantable: ActiveApplication[]
  positions: string[]
  locale: "en" | "fr"
}) {
  const t = useTranslations("userManagement")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const defaultValues: InviteFormValues = {
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    arrivalDate: "",
    departureDate: "",
    locale,
    applications: [],
  }
  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<InviteFormValues>({
    resolver: zodResolver(InviteFormSchema),
    defaultValues,
  })

  const { execute, isExecuting } = useAction(inviteMemberAction, {
    onSuccess() {
      toast.success(t("inviteSuccess"))
      setOpen(false)
      reset(defaultValues)
      router.refresh()
    },
    onError({ error }) {
      const known = knownUserManagementError(error.serverError)
      toast.error(known ? t(`errors.${known}`) : t("errors.generic"))
    },
  })

  const onSubmit = handleSubmit((values) => execute({ ...values, position: values.position || null }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" />{t("inviteButton")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="size-5 text-coral-600" />{t("inviteTitle")}</DialogTitle>
            <DialogDescription>{t("inviteDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("firstName")}</span>
              <Input {...register("firstName")} aria-invalid={Boolean(formState.errors.firstName)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("lastName")}</span>
              <Input {...register("lastName")} aria-invalid={Boolean(formState.errors.lastName)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary md:col-span-2">
              <span>{t("email")}</span>
              <Input type="email" {...register("email")} aria-invalid={Boolean(formState.errors.email)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("position")}</span>
              <Select {...register("position")}>
                <option value="">{t("noPosition")}</option>
                {positions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("emailLanguage")}</span>
              <Select {...register("locale")}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </Select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("arrivalDate")}</span>
              <Input type="date" {...register("arrivalDate")} aria-invalid={Boolean(formState.errors.arrivalDate)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-text-primary">
              <span>{t("departureDate")}</span>
              <Input type="date" {...register("departureDate")} aria-invalid={Boolean(formState.errors.departureDate)} />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">{t("applications")}</p>
            <p className="text-xs text-text-secondary">{t("memberOnlyHint")}</p>
            <ApplicationChecklist
              options={grantable}
              selected={watch("applications")}
              onChange={(next) => setValue("applications", next)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={isExecuting}>
              <Send className="size-4" />
              {isExecuting ? t("sending") : t("sendInvite")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
