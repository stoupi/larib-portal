import { Session } from '@/app/generated/prisma';
import { User } from '@/app/generated/prisma';
import type { AccessPeriodSummary } from '@/lib/permissions';

export type SessionUser = User & { accessPeriods?: AccessPeriodSummary[] };

export type BetterAuthSession = {
	user: SessionUser;
	session: Session;
};
