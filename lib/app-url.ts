export const PRODUCTION_APP_URL = 'https://www.cardiolarib-portal.com'

const LOCAL_APP_URL = 'http://localhost:3000'

export type AppUrlEnv = { VERCEL_ENV?: string; NEXT_PUBLIC_APP_URL?: string; [key: string]: string | undefined }

// Every link that leaves the app — password reset, invitation, recap emails — must
// point at the custom domain. A deployment's *.vercel.app URL is per-build and
// protected, so a link built from it is already dead by the time the mail is read.
export function resolveAppBaseUrl(env: AppUrlEnv = process.env): string {
  if (env.VERCEL_ENV === 'production') return PRODUCTION_APP_URL
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return LOCAL_APP_URL
}
