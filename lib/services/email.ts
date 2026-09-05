import { renderCorelabAssignmentEmail, type CorelabAssignmentEmailParams } from '@/lib/email/corelab-assignment-template'
import { COLORS, FONT_SERIF, FONT_SANS, emailLayout } from '@/lib/email/layout'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { renderWelcomeEmail, type WelcomeEmailParams } from '@/lib/email/welcome-template'
import { renderPublicationRequestEmail } from '@/lib/email/publication-request-template'
import { renderCarouselRequestEmailHtml } from '@/lib/email/carousel-template'

export { renderCarouselRequestEmailHtml }
import { eachDayOfInterval, endOfDay, endOfWeek, format, isWithinInterval, startOfDay, startOfWeek } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import type { RecapPeriod, RecapRow, RecapStatus } from '@/lib/services/conges/recap'
import {
  selectOngoingArticles,
  selectStalledArticles,
  waitingLabel,
  type RecapArticle,
  type RecapCelebration,
  type RecapStatusValue,
} from '@/lib/publications/recap'
import type { AcceptedPaper } from '@/lib/publications/accepted-recap'
import { renderCorelabReviewEmail, type ReviewEmailParams } from '@/lib/email/corelab-review-template'

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ id: string } | { error: string }>
{
  const { subject, text, html } = renderWelcomeEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = await res.json() as { id?: string }
  return { id: json.id ?? '' }
}

type ResetPasswordEmailParams = {
  to: string
  resetUrl: string
  locale: 'en' | 'fr'
}

function renderResetPasswordEmail({ resetUrl, locale }: ResetPasswordEmailParams) {
  const subject = locale === 'fr'
    ? 'Réinitialisation de votre mot de passe'
    : 'Reset your password'

  const greeting = locale === 'fr' ? 'Bonjour,' : 'Hello,'
  const intro = locale === 'fr'
    ? 'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe.'
    : 'You requested to reset your password. Click the link below to create a new password.'
  const ctaText = locale === 'fr' ? 'Réinitialiser mon mot de passe' : 'Reset my password'
  const expiryNote = locale === 'fr'
    ? 'Ce lien expirera dans 1 heure.'
    : 'This link will expire in 1 hour.'
  const securityNote = locale === 'fr'
    ? 'Si vous n\'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.'
    : 'If you did not request this reset, you can safely ignore this email.'

  const text = `${greeting}\n\n${intro}\n\n${resetUrl}\n\n${expiryNote} ${securityNote}`

  const preheader = locale === 'fr'
    ? 'Votre lien de réinitialisation de mot de passe'
    : 'Your password reset link'

  const body = `
    <p style="margin:0 0 6px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">
      ${greeting}
    </p>
    <p style="margin:0 0 24px 0;font-family:${FONT_SERIF};font-size:14px;line-height:20px;color:${COLORS.mutedForeground};">
      ${subject}
    </p>
    <p style="margin:0 0 32px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${intro}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border-top:1px solid ${COLORS.border};padding-top:20px;">
          <p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.mutedForeground};">
            ${expiryNote}
          </p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.mutedForeground};">
            ${securityNote}
          </p>
        </td>
      </tr>
    </table>`

  const html = emailLayout(body, preheader)
  return { subject, text, html }
}

export async function sendResetPasswordEmail(params: ResetPasswordEmailParams): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderResetPasswordEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = await res.json() as { id?: string }
  return { id: json.id ?? '' }
}

type LeaveNotificationEventType = 'created' | 'edited' | 'cancelled'

type LeaveNotificationParams = {
  adminEmails: string[]
  userEmail: string
  locale: 'en' | 'fr'
  eventType: LeaveNotificationEventType
  userName: string
  startDate: string
  endDate: string
  dayCount: number
  remainingDays: number
  reason: string | null
}

function eventTypePillStyle(eventType: LeaveNotificationEventType): { bgColor: string; textColor: string; borderColor: string } {
  const styles: Record<LeaveNotificationEventType, { bgColor: string; textColor: string; borderColor: string }> = {
    created: { bgColor: '#10b981', textColor: '#ffffff', borderColor: '#10b981' },
    edited: { bgColor: '#f59e0b', textColor: '#ffffff', borderColor: '#f59e0b' },
    cancelled: { bgColor: '#ef4444', textColor: '#ffffff', borderColor: '#ef4444' },
  }
  return styles[eventType]
}

function eventTypeLabel(eventType: LeaveNotificationEventType, locale: 'fr' | 'en'): string {
  const labels: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: { fr: 'Nouvelle demande', en: 'New request' },
    edited: { fr: 'Demande modifiée', en: 'Updated request' },
    cancelled: { fr: 'Demande annulée', en: 'Cancelled request' },
  }
  return labels[eventType][locale]
}

function renderLeaveNotificationEmail({
  locale,
  eventType,
  userName,
  startDate,
  endDate,
  dayCount,
  remainingDays,
  reason,
}: LeaveNotificationParams) {
  const subjects: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: {
      fr: `Nouvelle demande de congés - ${userName}`,
      en: `New leave request - ${userName}`,
    },
    edited: {
      fr: `Demande de congés modifiée - ${userName}`,
      en: `Leave request updated - ${userName}`,
    },
    cancelled: {
      fr: `Demande de congés annulée - ${userName}`,
      en: `Leave request cancelled - ${userName}`,
    },
  }

  const actions: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: {
      fr: 'a soumis une demande de congés',
      en: 'submitted a leave request',
    },
    edited: {
      fr: 'a modifié sa demande de congés',
      en: 'updated their leave request',
    },
    cancelled: {
      fr: 'a annulé sa demande de congés',
      en: 'cancelled their leave request',
    },
  }

  const subject = subjects[eventType][locale]
  const action = actions[eventType][locale]

  const daysLabel = locale === 'fr'
    ? (dayCount > 1 ? 'jours ouvrés' : 'jour ouvré')
    : (dayCount > 1 ? 'working days' : 'working day')
  const remainingLabel = locale === 'fr'
    ? (remainingDays > 1 ? 'jours restants' : 'jour restant')
    : (remainingDays > 1 ? 'days remaining' : 'day remaining')
  const dateRange = `${startDate} &rarr; ${endDate}`
  const balanceLine = locale === 'fr'
    ? `Solde restant : ${remainingDays} ${remainingLabel}`
    : `Remaining balance: ${remainingDays} ${remainingLabel}`
  const reasonLine = reason
    ? (locale === 'fr' ? `Raison : ${reason}` : `Reason: ${reason}`)
    : null
  const ctaText = locale === 'fr' ? 'Consulter sur le portail' : 'Review on portal'

  const textParts = [
    `${userName} ${action}`,
    `${startDate} → ${endDate} (${dayCount} ${daysLabel})`,
    balanceLine,
    ...(reasonLine ? [reasonLine] : []),
    '',
    locale === 'fr'
      ? 'Connectez-vous au portail pour consulter cette demande.'
      : 'Log in to the portal to review this request.',
  ]
  const text = textParts.join('\n')

  const pill = eventTypePillStyle(eventType)
  const pillLabel = eventTypeLabel(eventType, locale)
  const portalLink = `${resolveAppBaseUrl()}/${locale}/conges`

  const reasonRow = reason
    ? `<tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Raison' : 'Reason'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${reason}</td>
      </tr>`
    : ''

  const preheader = `${userName} ${action}`

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 4px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">
            ${userName}
          </p>
          <p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:15px;line-height:22px;color:${COLORS.mutedForeground};">
            ${action}
          </p>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;">
            <tr>
              <td style="background-color:${pill.bgColor};border:1px solid ${pill.borderColor};border-radius:6px;padding:5px 12px;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:${pill.textColor};letter-spacing:0.3px;white-space:nowrap;">
                ${pillLabel}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:${COLORS.secondary};width:140px;">${locale === 'fr' ? 'Dates' : 'Dates'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:${COLORS.secondary};">${dateRange}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Durée' : 'Duration'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};"><strong>${dayCount}</strong> ${daysLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:${COLORS.secondary};border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Solde restant' : 'Remaining'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:${COLORS.secondary};border-top:1px solid ${COLORS.secondary};"><strong>${remainingDays}</strong> ${remainingLabel}</td>
      </tr>
      ${reasonRow}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.primary};border-radius:8px;">
                <a href="${portalLink}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`

  const html = emailLayout(body, preheader)

  return { subject, text, html }
}

export async function sendLeaveNotificationEmail(
  params: LeaveNotificationParams
): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderLeaveNotificationEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.adminEmails,
      cc: [params.userEmail],
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = await res.json() as { id?: string }
  return { id: json.id ?? '' }
}

export type AuthorListRequestEmailParams = {
  recipients: string[]
  articleTitle: string
  requesterName: string
  note: string | null
  articleUrl: string
}

export async function sendAuthorListRequestEmail(
  params: AuthorListRequestEmailParams,
): Promise<{ ok: boolean }> {
  if (params.recipients.length === 0) return { ok: true }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const { subject, text, html } = renderPublicationRequestEmail({
    kind: 'AUTHOR_LIST',
    articleTitle: params.articleTitle,
    requesterName: params.requesterName,
    body: params.note,
    articleUrl: params.articleUrl,
  })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: params.recipients, subject, text, html }),
  })
  return { ok: res.ok }
}

export type PublicationIssueEmailParams = {
  to: string[]
  cc: string[]
  articleTitle: string
  reporterName: string
  message: string
  articleUrl: string
}

export async function sendPublicationIssueEmail(
  params: PublicationIssueEmailParams,
): Promise<{ ok: boolean }> {
  if (params.to.length === 0) return { ok: true }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const { subject, text, html } = renderPublicationRequestEmail({
    kind: 'ERROR_REPORT',
    articleTitle: params.articleTitle,
    requesterName: params.reporterName,
    body: params.message,
    articleUrl: params.articleUrl,
  })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Larib Portal <${fromEmail}>`,
      to: params.to,
      cc: params.cc.length > 0 ? params.cc : undefined,
      subject,
      text,
      html,
    }),
  })
  return { ok: res.ok }
}

export type LeaveRecapEmailParams = {
  to: string[]
  locale: 'en' | 'fr'
  period: RecapPeriod
  rangeStart: Date
  rangeEnd: Date
  rows: RecapRow[]
}

const RECAP_STATUS_STYLE: Record<RecapStatus, { bgColor: string; label: Record<'fr' | 'en', string> }> = {
  APPROVED: { bgColor: '#10b981', label: { fr: 'Approuvé', en: 'Approved' } },
  PENDING: { bgColor: '#f59e0b', label: { fr: 'En attente', en: 'Pending' } },
}

function abbreviateFirstName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  const [firstName, ...rest] = parts
  return `${firstName.charAt(0).toUpperCase()}. ${rest.join(' ')}`
}

export function renderLeaveRecapEmail({
  locale,
  period,
  rangeStart,
  rangeEnd,
  rows,
}: LeaveRecapEmailParams): { subject: string; text: string; html: string } {
  const dateLocale = locale === 'fr' ? fr : enUS

  const titles: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    weekly: { fr: 'Congés de la semaine', en: "This week's leave" },
    monthly: { fr: 'Congés du mois', en: "This month's leave" },
  }
  const emptyStates: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    weekly: { fr: 'Personne en congé cette semaine.', en: 'No one is on leave this week.' },
    monthly: { fr: 'Personne en congé ce mois-ci.', en: 'No one is on leave this month.' },
  }

  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
  const monthLabel = capitalize(format(rangeStart, 'LLLL yyyy', { locale: dateLocale }))
  const weekDay = format(rangeStart, 'd', { locale: dateLocale })
  const subjectByPeriod: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    monthly: { fr: `Congés - ${monthLabel}`, en: `Leave - ${monthLabel}` },
    weekly: {
      fr: `Congés - Semaine du ${weekDay} ${monthLabel}`,
      en: `Leave - Week of ${weekDay} ${monthLabel}`,
    },
  }
  const subject = subjectByPeriod[period][locale]
  const title = titles[period][locale]
  const rangeLabel = `${format(rangeStart, 'd MMM', { locale: dateLocale })} → ${format(rangeEnd, 'd MMM yyyy', { locale: dateLocale })}`

  const daysWord = (count: number) =>
    locale === 'fr' ? (count > 1 ? 'jours' : 'jour') : count > 1 ? 'days' : 'day'

  const textLines = rows.length
    ? rows.map((row) => {
        const dates = `${format(row.startDate, 'd MMM', { locale: dateLocale })} → ${format(row.endDate, 'd MMM', { locale: dateLocale })}`
        const statusLabel = RECAP_STATUS_STYLE[row.status].label[locale]
        const positionPart = row.position ? ` (${row.position})` : ''
        const remainingPart = locale === 'fr' ? `${row.remainingDays} j restants` : `${row.remainingDays} d left`
        return `- ${row.name}${positionPart} : ${dates}, ${row.daysInRange} ${daysWord(row.daysInRange)} [${statusLabel}] — ${remainingPart}`
      })
    : [emptyStates[period][locale]]
  const text = `${title}\n${rangeLabel}\n\n${textLines.join('\n')}`

  const preheader = `${title} — ${rangeLabel}`

  const gridStart = startOfWeek(rangeStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 })
  const weekdayLabels = locale === 'fr'
    ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const headerCells = weekdayLabels
    .map((label) => `<th style="padding:6px 2px;font-family:${FONT_SANS};font-size:11px;font-weight:600;color:${COLORS.mutedForeground};text-transform:uppercase;letter-spacing:0.4px;text-align:center;border-bottom:1px solid ${COLORS.border};">${label}</th>`)
    .join('')

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks: Date[][] = []
  for (let index = 0; index < allDays.length; index += 7) {
    weeks.push(allDays.slice(index, index + 7))
  }

  const weekRows = weeks
    .map((week) => {
      const cells = week
        .map((day) => {
          const isActive = isWithinInterval(day, { start: rangeStart, end: rangeEnd })
          const absentees = isActive
            ? rows.filter((row) => day >= startOfDay(row.startDate) && day <= endOfDay(row.endDate))
            : []
          const useInitials = absentees.length > 2
          const pills = absentees
            .map((row) => {
              const displayName = useInitials ? abbreviateFirstName(row.name) : row.name
              return `<div style="margin:2px 0;background-color:${RECAP_STATUS_STYLE[row.status].bgColor};border-radius:4px;padding:2px 5px;font-family:${FONT_SANS};font-size:10px;line-height:13px;color:#ffffff;">${displayName}</div>`
            })
            .join('')
          const dayColor = isActive ? COLORS.foreground : '#c2cad6'
          const cellBg = isActive ? '#ffffff' : COLORS.secondary
          return `<td valign="top" style="width:14.28%;height:66px;padding:4px;border:1px solid ${COLORS.secondary};background-color:${cellBg};">
            <div style="font-family:${FONT_SANS};font-size:12px;font-weight:600;color:${dayColor};margin-bottom:2px;">${format(day, 'd')}</div>
            ${pills}
          </td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const legend = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
    <tr>
      <td style="padding-right:18px;font-family:${FONT_SANS};font-size:12px;color:${COLORS.mutedForeground};"><span style="display:inline-block;width:10px;height:10px;background-color:${RECAP_STATUS_STYLE.APPROVED.bgColor};border-radius:2px;margin-right:6px;"></span>${RECAP_STATUS_STYLE.APPROVED.label[locale]}</td>
      <td style="font-family:${FONT_SANS};font-size:12px;color:${COLORS.mutedForeground};"><span style="display:inline-block;width:10px;height:10px;background-color:${RECAP_STATUS_STYLE.PENDING.bgColor};border-radius:2px;margin-right:6px;"></span>${RECAP_STATUS_STYLE.PENDING.label[locale]}</td>
    </tr>
  </table>`

  const listTitle = locale === 'fr' ? 'Détail des congés' : 'Leave details'

  const whenPhrase = (row: RecapRow) => {
    const sameDay = format(row.startDate, 'yyyy-MM-dd') === format(row.endDate, 'yyyy-MM-dd')
    if (locale === 'fr') {
      return sameDay
        ? `le ${format(row.endDate, 'd MMMM', { locale: dateLocale })}`
        : `du ${format(row.startDate, 'd', { locale: dateLocale })} au ${format(row.endDate, 'd MMMM', { locale: dateLocale })}`
    }
    return sameDay
      ? `on ${format(row.endDate, 'MMMM d', { locale: dateLocale })}`
      : `from ${format(row.startDate, 'MMM d', { locale: dateLocale })} to ${format(row.endDate, 'MMM d', { locale: dateLocale })}`
  }

  type PersonSummary = { name: string; position: string | null; totalDays: number; remainingDays: number; firstStart: number; leaves: RecapRow[] }
  const byPerson = new Map<string, PersonSummary>()
  for (const row of rows) {
    const existing = byPerson.get(row.userId)
    if (existing) {
      existing.totalDays += row.daysInRange
      existing.firstStart = Math.min(existing.firstStart, row.startDate.getTime())
      existing.leaves.push(row)
    } else {
      byPerson.set(row.userId, {
        name: row.name,
        position: row.position,
        totalDays: row.daysInRange,
        remainingDays: row.remainingDays,
        firstStart: row.startDate.getTime(),
        leaves: [row],
      })
    }
  }
  const people = [...byPerson.values()].sort(
    (first, second) => first.firstStart - second.firstStart || first.name.localeCompare(second.name),
  )

  const personSpan = (person: PersonSummary) => {
    const dayCount = `${person.totalDays} ${daysWord(person.totalDays)}`
    return person.leaves.length === 1 ? `${dayCount} ${whenPhrase(person.leaves[0])}` : dayCount
  }

  const remainingLabel = (count: number) =>
    locale === 'fr'
      ? `${count} ${count > 1 ? 'jours restants' : 'jour restant'}`
      : `${count} ${count > 1 ? 'days left' : 'day left'}`

  const balancesList = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
        <tr><td colspan="2" style="padding-bottom:8px;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:${COLORS.mutedForeground};text-transform:uppercase;letter-spacing:0.5px;">${listTitle}</td></tr>
        ${people
          .map((person) => `<tr>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.secondary};font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};vertical-align:top;">${person.name}${person.position ? ` <span style="color:${COLORS.mutedForeground};font-size:12px;">· ${person.position}</span>` : ''}</td>
          <td style="padding:10px 0;border-top:1px solid ${COLORS.secondary};text-align:right;vertical-align:top;white-space:nowrap;">
            <div style="font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};">${personSpan(person)}</div>
            <div style="font-family:${FONT_SANS};font-size:11px;color:#9aa5b4;margin-top:2px;">${remainingLabel(person.remainingDays)}</div>
          </td>
        </tr>`)
          .join('')}
      </table>`
    : ''

  const emptyNote = rows.length === 0
    ? `<p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:14px;color:${COLORS.mutedForeground};">${emptyStates[period][locale]}</p>`
    : ''

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td>
          <p style="margin:0 0 4px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">${title}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${COLORS.mutedForeground};">${rangeLabel}</p>
        </td>
      </tr>
    </table>
    ${emptyNote}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${weekRows}</tbody>
    </table>
    ${legend}
    ${balancesList}`

  const html = emailLayout(body, preheader)
  return { subject, text, html }
}

export async function sendLeaveRecapEmail(
  params: LeaveRecapEmailParams,
): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderLeaveRecapEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const from = `Larib Portal <${fromEmail}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: params.to, subject, text, html }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}

export type PublicationsRecapEmailParams = {
  locale: 'en' | 'fr'
  firstName: string | null
  articles: RecapArticle[]
  celebrations?: RecapCelebration[]
  appUrl: string
}

const PUBLICATION_STATUS_STYLE: Record<
  RecapStatusValue,
  { bgColor: string; label: Record<'fr' | 'en', string> }
> = {
  IN_PREPARATION: { bgColor: '#64748b', label: { fr: 'En préparation', en: 'In preparation' } },
  UNDER_REVIEW: { bgColor: '#3b82f6', label: { fr: 'En revue', en: 'Under review' } },
  REVISION: { bgColor: '#7c3aed', label: { fr: 'En révision', en: 'In revision' } },
  TO_RESUBMIT: { bgColor: '#ea580c', label: { fr: 'À resoumettre', en: 'To resubmit' } },
}

const RECAP_WORDS = {
  fr: {
    subject: 'Vos publications en cours — récap mensuel',
    subjectNone: 'Votre récap mensuel de publications',
    eyebrow: 'Récap mensuel',
    hello: (name: string | null) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    congrats: 'Félicitations !',
    congratsLead: (count: number) =>
      count > 1
        ? `${count} de vos publications ont été acceptées depuis le dernier récap.`
        : 'Une de vos publications a été acceptée depuis le dernier récap.',
    heading: (count: number) =>
      count === 0
        ? 'Aucune publication en cours pour le moment.'
        : `Vous avez ${count} publication${count > 1 ? 's' : ''} en cours.`,
    stalledTitle: 'À resoumettre',
    stalledLead:
      'Ces publications ont été refusées et n’ont pas encore été renvoyées ailleurs. Ce sont celles qui risquent le plus de rester en suspens.',
    ongoingTitle: 'En cours',
    colTitle: 'Publication',
    colStatus: 'Statut',
    colJournal: 'Journal',
    colSince: 'Depuis le',
    noJournal: 'aucun journal visé',
    notSubmitted: 'pas encore soumise',
    askTitle: 'Ces données servent au suivi du service',
    askBody:
      'Un statut à jour nous permet de suivre précisément l’activité de l’équipe et de ne laisser aucun travail s’enliser. Si une information n’est plus exacte, corrigez-la directement depuis votre espace : cela prend quelques secondes.',
    askReply:
      'Vous pouvez aussi répondre à ce message, et n’hésitez pas à nous dire si vous êtes bloqué sur une publication : on est là pour aider.',
    button: 'Ouvrir mes publications',
    footer: 'Ceci est un email automatique envoyé depuis Larib Portal.',
  },
  en: {
    subject: 'Your in-progress publications — monthly recap',
    subjectNone: 'Your monthly publications recap',
    eyebrow: 'Monthly recap',
    hello: (name: string | null) => (name ? `Hello ${name},` : 'Hello,'),
    congrats: 'Congratulations!',
    congratsLead: (count: number) =>
      count > 1
        ? `${count} of your publications were accepted since the last recap.`
        : 'One of your publications was accepted since the last recap.',
    heading: (count: number) =>
      count === 0
        ? 'No publication in progress at the moment.'
        : `You have ${count} publication${count > 1 ? 's' : ''} in progress.`,
    stalledTitle: 'To resubmit',
    stalledLead:
      'These publications were turned down and have not been sent anywhere since. They are the ones most likely to stall.',
    ongoingTitle: 'In progress',
    colTitle: 'Publication',
    colStatus: 'Status',
    colJournal: 'Journal',
    colSince: 'Since',
    noJournal: 'no target journal',
    notSubmitted: 'not submitted yet',
    askTitle: 'These records drive the department’s follow-up',
    askBody:
      'An up-to-date status lets us follow the team’s activity precisely and keeps work from stalling. If anything is no longer accurate, correct it from your own space — it takes seconds.',
    askReply:
      'You can also simply reply to this message, and do tell us if you are stuck on a publication: we are here to help.',
    button: 'Open my publications',
    footer: 'This is an automatic email sent from Larib Portal.',
  },
}

function recapDate(iso: string | null, locale: 'fr' | 'en'): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function renderPublicationsRecapEmail({
  locale,
  firstName,
  articles,
  celebrations = [],
  appUrl,
}: PublicationsRecapEmailParams): { subject: string; text: string; html: string } {
  const words = RECAP_WORDS[locale]
  const stalled = selectStalledArticles(articles)
  const ongoing = selectOngoingArticles(articles)
  const subject = articles.length === 0 ? words.subjectNone : words.subject
  const publicationsLink = `${appUrl}/${locale}/publications`

  const textLines = [
    words.hello(firstName),
    '',
    ...(celebrations.length > 0
      ? [
          `${words.congrats} ${words.congratsLead(celebrations.length)}`,
          ...celebrations.map(
            (celebration) =>
              `- ${celebration.title}${celebration.journalName ? ` — ${celebration.journalName}` : ''} (${recapDate(celebration.acceptedAt, locale)})`,
          ),
          '',
        ]
      : []),
    words.heading(articles.length),
    '',
    ...articles.map((article) => {
      const status = PUBLICATION_STATUS_STYLE[article.status].label[locale]
      const journal = article.journalName ?? words.noJournal
      const since = article.since ? recapDate(article.since, locale) : words.notSubmitted
      const waiting = article.waitingDays === null ? '' : ` (${waitingLabel(article.waitingDays, locale)})`
      return `- [${status}] ${article.title} — ${journal} — ${since}${waiting}`
    }),
    '',
    words.askBody,
    words.askReply,
    publicationsLink,
  ]

  function tableRows(rows: RecapArticle[]): string {
    return rows
      .map((article) => {
        const style = PUBLICATION_STATUS_STYLE[article.status]
        const journal = escapeHtml(article.journalName ?? words.noJournal)
        const since = article.since ? recapDate(article.since, locale) : words.notSubmitted
        const waiting =
          article.waitingDays === null
            ? ''
            : `<br /><span style="font-size:11px;color:${COLORS.mutedForeground};">${escapeHtml(waitingLabel(article.waitingDays, locale))}</span>`
        return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:13px;line-height:19px;color:${COLORS.foreground};">${escapeHtml(article.title)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};white-space:nowrap;vertical-align:top;"><span style="background-color:${style.bgColor};border-radius:4px;padding:3px 8px;font-family:${FONT_SANS};font-size:11px;color:#ffffff;white-space:nowrap;">${style.label[locale]}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:12px;color:${COLORS.mutedForeground};vertical-align:top;">${journal}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:12px;color:${COLORS.foreground};white-space:nowrap;vertical-align:top;">${escapeHtml(since)}${waiting}</td>
      </tr>`
      })
      .join('')
  }

  function tableHead(): string {
    const cell = (label: string) =>
      `<th align="left" style="padding:8px 12px;border-bottom:2px solid ${COLORS.border};font-family:${FONT_SANS};font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.mutedForeground};">${escapeHtml(label)}</th>`
    return `<tr>${cell(words.colTitle)}${cell(words.colStatus)}${cell(words.colJournal)}${cell(words.colSince)}</tr>`
  }

  const celebrationBlock =
    celebrations.length === 0
      ? ''
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
      <tr>
        <td style="background-color:#F0FDF4;border-left:4px solid #10B981;border-radius:6px;padding:18px 20px;">
          <p style="margin:0 0 6px 0;font-family:${FONT_SERIF};font-size:20px;line-height:26px;font-weight:700;color:#047857;">🎉 ${escapeHtml(words.congrats)}</p>
          <p style="margin:0 0 12px 0;font-family:${FONT_SANS};font-size:14px;line-height:21px;color:#065F46;">${escapeHtml(words.congratsLead(celebrations.length))}</p>
          ${celebrations
            .map(
              (celebration) =>
                `<p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:13px;line-height:19px;color:${COLORS.foreground};"><strong>${escapeHtml(celebration.title)}</strong><br /><span style="color:${COLORS.mutedForeground};">${escapeHtml(celebration.journalName ?? words.noJournal)} · ${escapeHtml(recapDate(celebration.acceptedAt, locale))}</span></p>`,
            )
            .join('')}
        </td>
      </tr>
    </table>`

  const stalledBlock =
    stalled.length === 0
      ? ''
      : `<p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#EA580C;">${escapeHtml(words.stalledTitle)}</p>
    <p style="margin:0 0 12px 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.foreground};">${escapeHtml(words.stalledLead)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF3E9;border-radius:6px;margin:0 0 26px 0;">${tableHead()}${tableRows(stalled)}</table>`

  const ongoingBlock =
    ongoing.length === 0
      ? ''
      : `${stalled.length > 0 ? `<p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.mutedForeground};">${escapeHtml(words.ongoingTitle)}</p>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">${tableHead()}${tableRows(ongoing)}</table>`

  const body = `<p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.accent};">${escapeHtml(words.eyebrow)}</p>
    <p style="margin:0 0 20px 0;font-family:${FONT_SANS};font-size:15px;line-height:23px;color:${COLORS.foreground};">${escapeHtml(words.hello(firstName))}</p>
    ${celebrationBlock}
    <p style="margin:0 0 18px 0;font-family:${FONT_SERIF};font-size:22px;line-height:29px;font-weight:700;color:${COLORS.primary};">${escapeHtml(words.heading(articles.length))}</p>
    ${stalledBlock}
    ${ongoingBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
      <tr>
        <td style="background-color:${COLORS.secondary};border-radius:8px;padding:18px 20px;">
          <p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:13px;font-weight:700;color:${COLORS.primary};">${escapeHtml(words.askTitle)}</p>
          <p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.foreground};">${escapeHtml(words.askBody)}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.foreground};">${escapeHtml(words.askReply)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
        <a href="${publicationsLink}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(words.button)}</a>
      </td>
    </tr></table>`

  return { subject, text: textLines.join('\n'), html: emailLayout(body, subject, words.footer) }
}

export type AcceptedPapersEmailParams = {
  locale: 'en' | 'fr'
  firstName: string | null
  papers: AcceptedPaper[]
  since: Date
  appUrl: string
}

const ACCEPTED_WORDS = {
  fr: {
    subject: (count: number) => `${count} publication${count > 1 ? 's' : ''} acceptée${count > 1 ? 's' : ''} 🎉`,
    eyebrow: 'Publications acceptées',
    hello: (name: string | null) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    heading: (count: number) =>
      count > 1
        ? `${count} publications de l’équipe ont été acceptées.`
        : 'Une publication de l’équipe a été acceptée.',
    lead: (since: string) => `Voici les papiers acceptés depuis le ${since}. Bravo à toutes les équipes concernées !`,
    colTitle: 'Publication',
    colAuthor: 'Premier auteur',
    colJournal: 'Journal',
    colDate: 'Date',
    published: 'Publié',
    noJournal: 'journal non renseigné',
    unknownAuthor: 'auteur non renseigné',
    button: 'Voir toutes les publications',
    footer: 'Ceci est un email automatique envoyé depuis Larib Portal.',
  },
  en: {
    subject: (count: number) => `${count} publication${count > 1 ? 's' : ''} accepted 🎉`,
    eyebrow: 'Accepted publications',
    hello: (name: string | null) => (name ? `Hello ${name},` : 'Hello,'),
    heading: (count: number) =>
      count > 1 ? `${count} of the team’s publications were accepted.` : 'One of the team’s publications was accepted.',
    lead: (since: string) => `Here are the papers accepted since ${since}. Congratulations to everyone involved!`,
    colTitle: 'Publication',
    colAuthor: 'First author',
    colJournal: 'Journal',
    colDate: 'Date',
    published: 'Published',
    noJournal: 'no journal recorded',
    unknownAuthor: 'author not recorded',
    button: 'See all publications',
    footer: 'This is an automatic email sent from Larib Portal.',
  },
}

export function renderAcceptedPapersEmail({
  locale,
  firstName,
  papers,
  since,
  appUrl,
}: AcceptedPapersEmailParams): { subject: string; text: string; html: string } {
  const words = ACCEPTED_WORDS[locale]
  const subject = words.subject(papers.length)
  const publicationsLink = `${appUrl}/${locale}/publications`
  const sinceLabel = recapDate(since.toISOString(), locale)

  const textLines = [
    words.hello(firstName),
    '',
    words.heading(papers.length),
    words.lead(sinceLabel),
    '',
    ...papers.map((paper) => {
      const author = paper.firstAuthorName ?? words.unknownAuthor
      const journal = paper.journalName ?? words.noJournal
      return `- ${paper.title} — ${author} — ${journal} — ${recapDate(paper.date, locale)}`
    }),
    '',
    publicationsLink,
  ]

  const head = (label: string) =>
    `<th align="left" style="padding:8px 12px;border-bottom:2px solid ${COLORS.border};font-family:${FONT_SANS};font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.mutedForeground};">${escapeHtml(label)}</th>`

  const rows = papers
    .map((paper) => {
      const badge = paper.published
        ? `<span style="background-color:#10B981;border-radius:4px;padding:2px 7px;font-family:${FONT_SANS};font-size:10px;color:#ffffff;white-space:nowrap;">${escapeHtml(words.published)}</span>`
        : ''
      return `<tr>
        <td style="padding:11px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:13px;line-height:19px;color:${COLORS.foreground};"><strong>${escapeHtml(paper.title)}</strong>${badge ? `<br />${badge}` : ''}</td>
        <td style="padding:11px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:12px;color:${COLORS.foreground};vertical-align:top;white-space:nowrap;">${escapeHtml(paper.firstAuthorName ?? words.unknownAuthor)}</td>
        <td style="padding:11px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:12px;color:${COLORS.mutedForeground};vertical-align:top;">${escapeHtml(paper.journalName ?? words.noJournal)}</td>
        <td style="padding:11px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:12px;color:${COLORS.foreground};vertical-align:top;white-space:nowrap;">${escapeHtml(recapDate(paper.date, locale))}</td>
      </tr>`
    })
    .join('')

  const body = `<p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.accent};">${escapeHtml(words.eyebrow)}</p>
    <p style="margin:0 0 20px 0;font-family:${FONT_SANS};font-size:15px;line-height:23px;color:${COLORS.foreground};">${escapeHtml(words.hello(firstName))}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F0FDF4;border-left:4px solid #10B981;border-radius:6px;padding:20px;">
          <p style="margin:0 0 8px 0;font-family:${FONT_SERIF};font-size:22px;line-height:28px;font-weight:700;color:#047857;">🎉 ${escapeHtml(words.heading(papers.length))}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:21px;color:#065F46;">${escapeHtml(words.lead(sinceLabel))}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;"><tr>${head(words.colTitle)}${head(words.colAuthor)}${head(words.colJournal)}${head(words.colDate)}</tr>${rows}</table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
        <a href="${publicationsLink}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(words.button)}</a>
      </td>
    </tr></table>`

  return { subject, text: textLines.join('\n'), html: emailLayout(body, subject, words.footer) }
}

// Takes the rendered message rather than the ingredients, so the preview an admin
// approved and the message that leaves are the same bytes.
export async function sendPublicationsRecapEmail(params: {
  to: string
  cc?: string[]
  subject: string
  text: string
  html: string
}): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = params
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const from = `Larib Portal <${fromEmail}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [params.to],
      cc: params.cc && params.cc.length > 0 ? params.cc : undefined,
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}

export type CarouselRequestEmailParams = {
  to: string
  cc: string[]
  replyTo: string
  subject: string
  body: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export async function sendCarouselRequestEmail(
  params: CarouselRequestEmailParams,
): Promise<{ id: string } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const from = `Larib Portal <${fromEmail}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [params.to],
      cc: params.cc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.body,
      html: renderCarouselRequestEmailHtml(params.body, params.subject),
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}

export type CorelabAssignmentMailParams = CorelabAssignmentEmailParams & { to: string }

export async function sendCorelabAssignmentEmail(params: CorelabAssignmentMailParams): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const { subject, text, html } = renderCorelabAssignmentEmail(params)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: [params.to], subject, text, html }),
  })
  return { ok: res.ok }
}

export async function sendCorelabReviewEmail(params: ReviewEmailParams & { to: string }): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const { subject, text, html } = renderCorelabReviewEmail(params)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: [params.to], subject, text, html }),
  })
  return { ok: res.ok }
}
