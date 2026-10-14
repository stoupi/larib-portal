export function directoryUserName(user: {
  email: string
  name: string | null
  firstName: string | null
  lastName: string | null
}): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || user.email
}
