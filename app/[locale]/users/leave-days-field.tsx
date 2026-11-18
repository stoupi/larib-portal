"use client"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { MAX_LEAVE_DAYS } from "@/lib/user-management/grants"

export function parseLeaveDays(rawValue: string): number | null {
  if (!/^\d+$/.test(rawValue.trim())) return null
  const days = Number.parseInt(rawValue, 10)
  return days <= MAX_LEAVE_DAYS ? days : null
}

export function LeaveDaysField({
  value,
  onChange,
  invalid,
}: {
  value: string
  onChange: (next: string) => void
  invalid: boolean
}) {
  const tAdmin = useTranslations("admin")
  const t = useTranslations("userManagement")

  return (
    <label className="block space-y-1.5 text-sm font-medium text-text-primary">
      <span>{tAdmin("leaveDaysLabel")}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_LEAVE_DAYS}
        placeholder="25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
      />
      <span className="block text-xs font-normal text-text-secondary">{t("leaveDaysHint")}</span>
    </label>
  )
}
