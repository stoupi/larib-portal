import type { ActiveApplication } from '@/lib/permissions'
import { COLORS, FONT_SANS, FONT_SERIF, emailLayout } from './layout'

export type UserManagerNotificationKind = 'INVITED' | 'APPLICATIONS_ADDED'

export type UserManagerNotificationEmailParams = {
  kind: UserManagerNotificationKind
  locale: 'en' | 'fr'
  managerName: string
  targetName: string
  targetEmail: string
  applications: ActiveApplication[]
  usersUrl: string
}

const APPLICATION_LABELS: Record<'en' | 'fr', Record<ActiveApplication, string>> = {
  fr: { BESTOF_LARIB: 'Training Best-of', CONGES: 'Gestion des congés', PUBLICATIONS: 'Publications', CORELAB: 'Core Lab' },
  en: { BESTOF_LARIB: 'Training Best-of', CONGES: 'Leave management', PUBLICATIONS: 'Publications', CORELAB: 'Core Lab' },
}

const WORDING = {
  fr: {
    eyebrow: 'GESTION DES UTILISATEURS',
    subject: {
      INVITED: (manager: string, target: string) => `${manager} a invité ${target}`,
      APPLICATIONS_ADDED: (manager: string, target: string) => `${manager} a ouvert des applications à ${target}`,
    },
    intro: {
      INVITED: (manager: string) => `${manager} vient d’inviter un nouvel utilisateur sur le portail.`,
      APPLICATIONS_ADDED: (manager: string) => `${manager} vient d’ouvrir de nouvelles applications à un utilisateur.`,
    },
    applicationsLabel: 'Applications (accès membre)',
    noApplication: 'Aucune application',
    cta: 'Voir les utilisateurs',
  },
  en: {
    eyebrow: 'USER MANAGEMENT',
    subject: {
      INVITED: (manager: string, target: string) => `${manager} invited ${target}`,
      APPLICATIONS_ADDED: (manager: string, target: string) => `${manager} opened applications to ${target}`,
    },
    intro: {
      INVITED: (manager: string) => `${manager} has just invited a new user to the portal.`,
      APPLICATIONS_ADDED: (manager: string) => `${manager} has just opened new applications to a user.`,
    },
    applicationsLabel: 'Applications (member access)',
    noApplication: 'No application',
    cta: 'View users',
  },
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderUserManagerNotificationEmail({
  kind,
  locale,
  managerName,
  targetName,
  targetEmail,
  applications,
  usersUrl,
}: UserManagerNotificationEmailParams): { subject: string; text: string; html: string } {
  const wording = WORDING[locale]
  const labels = applications.map((application) => APPLICATION_LABELS[locale][application])
  const applicationsLine = labels.length > 0 ? labels.join(', ') : wording.noApplication
  const targetLine = targetName === targetEmail ? targetEmail : `${targetName} (${targetEmail})`

  const subject = wording.subject[kind](managerName, targetName)
  const intro = wording.intro[kind](managerName)
  const text = [intro, targetLine, `${wording.applicationsLabel} : ${applicationsLine}`, usersUrl].join('\n\n')

  const body = `
    <p style="margin:0 0 12px 0;font-family:${FONT_SANS};font-size:12px;font-weight:600;letter-spacing:1.5px;color:${COLORS.accent};">${wording.eyebrow}</p>
    <h1 style="margin:0 0 18px 0;font-family:${FONT_SERIF};font-size:24px;line-height:32px;font-weight:700;color:${COLORS.foreground};">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 20px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">${escapeHtml(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;background-color:${COLORS.secondary};border-left:3px solid ${COLORS.accent};border-radius:6px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px 0;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${COLORS.primary};">${escapeHtml(targetName)}</p>
          <p style="margin:0 0 12px 0;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};">${escapeHtml(targetEmail)}</p>
          <p style="margin:0 0 4px 0;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:${COLORS.mutedForeground};">${wording.applicationsLabel}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};">${escapeHtml(applicationsLine)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:${COLORS.primary};border-radius:8px;">
          <a href="${usersUrl}" style="display:inline-block;padding:12px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${COLORS.primaryForeground};text-decoration:none;">${wording.cta}</a>
        </td>
      </tr>
    </table>`

  return { subject, text, html: emailLayout(body, intro) }
}
