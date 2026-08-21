export type SignInAccount = { providerId: string; password: string | null }

// An account is live once it can actually sign in: a credential account whose password was
// set during onboarding, or an external provider such as Google. `emailVerified` says nothing
// about it — an invited user who sets their password never verifies their email address, and
// would otherwise be shown as still invited forever.
export function accountsAreActivated(accounts: SignInAccount[]): boolean {
  return accounts.some((account) => (account.providerId === 'credential' ? account.password !== null : true))
}
