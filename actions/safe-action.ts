import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { getTypedSession } from "../lib/auth-helpers";
import type { Application, User } from '@/app/generated/prisma'
import { canAccessApp, canAdminApp, isSuperAdmin } from '@/lib/permissions'
import { runAuditedOperation } from '@/lib/audit/context'
import { writeAuditOperation } from '@/lib/audit/writer'
import { prismaWithoutAudit } from '@/lib/prisma'
// role is now hydrated on session.user in getTypedSession

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);
    // Surface full error message to client as requested
    return e.message || DEFAULT_SERVER_ERROR_MESSAGE;
  },
});

// Frozen on the logbook entry, so a renamed or deleted account never rewrites history.
function actorLabelOf(user: User): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return fullName || user.name || user.email
}

export const authenticatedAction = actionClient.use(async ({ next }) => {
  const session = await getTypedSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return runAuditedOperation(
    { actorId: session.user.id, actorLabel: actorLabelOf(session.user), source: 'UI', summary: null, ipAddress: session.session.ipAddress ?? null },
    () =>
      next({
        ctx: {
          userId: session.user.id,
          user: session.user,
          session,
        },
      }),
    (operation) => writeAuditOperation(prismaWithoutAudit, operation),
  );
});

export const unauthenticatedAction = actionClient;

export const superAdminAction = authenticatedAction.use(async ({ next, ctx }) => {
  if (!isSuperAdmin(ctx.user)) {
    throw new Error('Forbidden')
  }
  return next({ ctx })
})

export const appAdminAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAdminApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })

export const appMemberAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAccessApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })
