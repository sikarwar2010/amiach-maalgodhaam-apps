import type { Env } from "../env"

/**
 * Operators list their own e-mail(s) in SUPER_ADMIN_EMAILS so the first admin never depends on a
 * dashboard click. The address only counts once the identity provider says it is *verified* —
 * otherwise anyone could sign up with someone else's address and inherit the role.
 */
export function isBootstrapAdmin(env: Pick<Env, "superAdminEmails">, email: string, emailVerified: boolean): boolean {
  return emailVerified && env.superAdminEmails.includes(email.trim().toLowerCase())
}
