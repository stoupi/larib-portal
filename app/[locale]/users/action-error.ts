const KNOWN_ERRORS = ["USER_ALREADY_EXISTS", "APPLICATION_NOT_GRANTABLE", "Forbidden"] as const

export type KnownUserManagementError = (typeof KNOWN_ERRORS)[number]

export function knownUserManagementError(serverError: string | undefined): KnownUserManagementError | null {
  return KNOWN_ERRORS.find((code) => serverError?.includes(code)) ?? null
}
