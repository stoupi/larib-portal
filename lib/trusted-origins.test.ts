import { afterEach, describe, expect, it } from 'vitest';
import { buildTrustedOrigins } from './auth';

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
	process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe('buildTrustedOrigins', () => {
	it('trusts the public production domain even when the base URL is the vercel domain', () => {
		process.env.NEXT_PUBLIC_APP_URL = 'https://larib-portal.vercel.app';
		const origins = buildTrustedOrigins();
		expect(origins).toContain('https://www.cardiolarib-portal.com');
		expect(origins).toContain('https://cardiolarib-portal.com');
		expect(origins).toContain('https://larib-portal.vercel.app');
	});

	it('drops undefined entries and duplicates', () => {
		process.env.NEXT_PUBLIC_APP_URL = 'https://www.cardiolarib-portal.com';
		const origins = buildTrustedOrigins();
		expect(origins.every((origin) => Boolean(origin))).toBe(true);
		expect(new Set(origins).size).toBe(origins.length);
	});
});
