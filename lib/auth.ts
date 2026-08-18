import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './prisma';
import { sendResetPasswordEmail } from './services/email';
import { PRODUCTION_APP_URL, resolveAppBaseUrl } from './app-url';

export function buildTrustedOrigins(): string[] {
	const configuredOrigins = [
		process.env.NEXT_PUBLIC_APP_URL,
		process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
		process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
		PRODUCTION_APP_URL,
		'https://cardiolarib-portal.com',
		'http://localhost:3000',
		process.env.PLAYWRIGHT_PORT && `http://localhost:${process.env.PLAYWRIGHT_PORT}`,
		process.env.PORT && `http://localhost:${process.env.PORT}`,
	];
	return Array.from(new Set(configuredOrigins.filter((origin): origin is string => Boolean(origin))));
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: 'postgresql',
	}),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			const userRecord = await prisma.user.findUnique({
				where: { id: user.id },
				select: { language: true },
			});
			const locale = userRecord?.language === 'FR' ? 'fr' : 'en';
			await sendResetPasswordEmail({
				to: user.email,
				resetUrl: url,
				locale,
			});
		},
	},
	secret: process.env.BETTER_AUTH_SECRET!,
	baseURL: resolveAppBaseUrl(),
	trustedOrigins: buildTrustedOrigins(),
	plugins: [nextCookies()],
});
