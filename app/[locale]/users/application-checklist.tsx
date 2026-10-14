"use client"
import { useTranslations } from "next-intl"
import { Checkbox } from "@/components/ui/checkbox"
import type { ActiveApplication } from "@/lib/permissions"

export function ApplicationChecklist({
  options,
  selected,
  onChange,
}: {
  options: ActiveApplication[]
  selected: ActiveApplication[]
  onChange: (next: ActiveApplication[]) => void
}) {
  const tAdmin = useTranslations("admin")

  function toggle(application: ActiveApplication, checked: boolean) {
    onChange(checked ? [...selected, application] : selected.filter((entry) => entry !== application))
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((application) => (
        <label
          key={application}
          className="flex items-center gap-3 rounded-lg border border-line bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary"
        >
          <Checkbox
            checked={selected.includes(application)}
            onCheckedChange={(checked) => toggle(application, checked === true)}
            aria-label={tAdmin(`app_${application}`)}
          />
          {tAdmin(`app_${application}`)}
        </label>
      ))}
    </div>
  )
}
