import { PrismaClient } from '../app/generated/prisma';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables before initializing auth.
// `override: true` is required: importing `../lib/auth` (hoisted above this line)
// initializes Prisma, which auto-loads `.env` and sets DATABASE_URL to the dev db
// first. Without override this seed would wipe/write the DEV database instead of testdb.
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test'), override: true });

import { auth } from '../lib/auth';
import { MIR_DIJON_CRF_V1 } from '../lib/corelab/crf/mir-dijon-v1';
import { toJsonValue } from '../lib/corelab/crf/json';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding test database...');

	// Get Better Auth context for password hashing
	const ctx = await auth.$context;

	// Clean existing data (delete in correct order due to foreign keys)
	console.log('🧹 Cleaning existing data...');
	await prisma.leaveRequest.deleteMany();
	await prisma.caseAttempt.deleteMany();
	await prisma.userCaseSettings.deleteMany();
	await prisma.clinicalCase.deleteMany();
	await prisma.examType.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.account.deleteMany();
	await prisma.authorshipAffiliation.deleteMany();
	await prisma.authorship.deleteMany();
	await prisma.submission.deleteMany();
	await prisma.journalTarget.deleteMany();
	await prisma.article.deleteMany();
	await prisma.study.deleteMany();
	await prisma.author.deleteMany();
	await prisma.affiliation.deleteMany();
	await prisma.centre.deleteMany();
	await prisma.journal.deleteMany();
	const immutableTables = ['AuditChange', 'AuditEvent', 'CorelabSignature', 'CorelabCalibrationReview', 'CorelabReadingSubmission'];
	for (const table of immutableTables) await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
	await prisma.auditChange.deleteMany();
	await prisma.auditEvent.deleteMany();
	await prisma.corelabSignature.deleteMany();
	await prisma.corelabCalibrationReview.deleteMany();
	await prisma.corelabReadingSubmission.deleteMany();
	for (const table of immutableTables) await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
	await prisma.corelabReadingValue.deleteMany();
	await prisma.corelabSequenceFlag.deleteMany();
	await prisma.corelabReadingDocument.deleteMany();
	await prisma.corelabDocumentReturn.deleteMany();
	await prisma.corelabStudyDocument.deleteMany();
	await prisma.corelabImportMapping.deleteMany();
	await prisma.corelabReadingAssignment.deleteMany();
	await prisma.corelabAssignmentBatch.deleteMany();
	await prisma.corelabExam.deleteMany();
	await prisma.corelabPatient.deleteMany();
	await prisma.corelabCohortImport.deleteMany();
	await prisma.corelabCalibrationAssignment.deleteMany();
	await prisma.corelabCalibrationCase.deleteMany();
	await prisma.corelabTrainingCompletion.deleteMany();
	await prisma.corelabStudyTrainingRequirement.deleteMany();
	await prisma.corelabTrainingModule.deleteMany();
	await prisma.corelabCrfVersion.deleteMany();
	await prisma.corelabStudyMembership.deleteMany();
	await prisma.corelabSite.deleteMany();
	await prisma.corelabStudy.deleteMany();
	await prisma.applicationAccessPeriod.deleteMany();
	await prisma.user.deleteMany();

	// Create test admin user
	const adminPassword = await ctx.password.hash('ristifou');
	const adminUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Test Admin',
			email: 'test-admin@larib-portal.test',
			emailVerified: true,
			role: 'ADMIN',
			applications: ['BESTOF_LARIB', 'CONGES'],
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'test-admin@larib-portal.test',
					password: adminPassword,
				},
			},
		},
	});

	console.log('✅ Created admin user:', adminUser.email);

	// Create test regular user
	const userPassword = await ctx.password.hash('ristifou');
	const regularUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Test User',
			firstName: 'Test',
			lastName: 'User',
			email: 'test-user@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB', 'CONGES'],
			congesTotalDays: 30,
			position: 'Developer',
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'test-user@larib-portal.test',
					password: userPassword,
				},
			},
		},
	});

	console.log('✅ Created regular user:', regularUser.email);

	// Create a placeholder user (invitation sent, no password yet)
	const placeholderUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: null,
			firstName: 'Placeholder',
			lastName: 'User',
			email: 'placeholder@larib-portal.test',
			emailVerified: false,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
		},
	});

	// Create invitation for placeholder user (valid for 7 days)
	await prisma.verification.create({
		data: {
			id: randomUUID(),
			identifier: `INVITE:${placeholderUser.email}`,
			value: JSON.stringify({
				email: placeholderUser.email,
				locale: 'en',
				firstName: 'Placeholder',
				lastName: 'User',
				role: 'USER',
				applications: ['BESTOF_LARIB'],
				token: 'test-invitation-token',
			}),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
		},
	});

	console.log('✅ Created placeholder user with pending invitation:', placeholderUser.email);

	// Create a placeholder user with expired invitation
	const expiredPlaceholderUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: null,
			firstName: 'Expired',
			lastName: 'Invitation',
			email: 'expired@larib-portal.test',
			emailVerified: false,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
		},
	});

	// Create expired invitation
	await prisma.verification.create({
		data: {
			id: randomUUID(),
			identifier: `INVITE:${expiredPlaceholderUser.email}`,
			value: JSON.stringify({
				email: expiredPlaceholderUser.email,
				locale: 'en',
				firstName: 'Expired',
				lastName: 'Invitation',
				role: 'USER',
				applications: ['BESTOF_LARIB'],
				token: 'expired-invitation-token',
			}),
			expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
		},
	});

	console.log('✅ Created placeholder user with expired invitation:', expiredPlaceholderUser.email);

	// Create a user without CONGES access for filtering tests
	const noCongesPassword = await ctx.password.hash('ristifou');
	const userWithoutConges = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'No Conges User',
			email: 'no-conges@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
			congesTotalDays: 25,
			accounts: {
				create: {
					id: randomUUID(),
					providerId: 'credential',
					accountId: 'no-conges@larib-portal.test',
					password: noCongesPassword,
				},
			},
		},
	});

	console.log('✅ Created user without CONGES access:', userWithoutConges.email);

	// Create per-app admin users for RBAC tests
	const congesAdminPassword = await ctx.password.hash('ristifou');
	const congesAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Conges Admin',
			email: 'conges-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['CONGES'],
			adminApplications: ['CONGES'],
			congesTotalDays: 30,
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'conges-admin@larib-portal.test', password: congesAdminPassword } },
		},
	});
	console.log('✅ Created Conges admin:', congesAdmin.email);

	const bestofAdminPassword = await ctx.password.hash('ristifou');
	const bestofAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Bestof Admin',
			email: 'bestof-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['BESTOF_LARIB'],
			adminApplications: ['BESTOF_LARIB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'bestof-admin@larib-portal.test', password: bestofAdminPassword } },
		},
	});
	console.log('✅ Created Bestof admin:', bestofAdmin.email);

	// Create publications users (member + app-admin) for RBAC tests
	const publicationsAdminPassword = await ctx.password.hash('ristifou');
	const publicationsAdmin = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Publications Admin',
			email: 'publications-admin@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			adminApplications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-admin@larib-portal.test', password: publicationsAdminPassword } },
		},
	});
	console.log('✅ Created Publications admin:', publicationsAdmin.email);

	const publicationsUserPassword = await ctx.password.hash('ristifou');
	const publicationsUser = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Publications User',
			email: 'publications-user@larib-portal.test',
			// Set their own password from an invitation and never verified their email:
			// the portal status must read them as active all the same.
			emailVerified: false,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-user@larib-portal.test', password: publicationsUserPassword } },
		},
	});
	console.log('✅ Created Publications user:', publicationsUser.email);

	// A member whose profile name matches the PubMed fixtures, so the member-facing PubMed
	// import (which only accepts papers you signed) can be exercised end to end. They have
	// no author record yet on purpose: the import must create and link one.
	const publicationsPubmedAuthorPassword = await ctx.password.hash('ristifou');
	const publicationsPubmedAuthor = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Theo Pezel',
			firstName: 'Theo',
			lastName: 'Pezel',
			email: 'publications-pubmed-author@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-pubmed-author@larib-portal.test', password: publicationsPubmedAuthorPassword } },
		},
	});
	console.log('✅ Created Publications PubMed author:', publicationsPubmedAuthor.email);

	const publicationsReaderPassword = await ctx.password.hash('ristifou');
	const publicationsReader = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: 'Publications Reader',
			email: 'publications-reader@larib-portal.test',
			emailVerified: true,
			role: 'USER',
			applications: ['PUBLICATIONS'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'publications-reader@larib-portal.test', password: publicationsReaderPassword } },
		},
	});
	console.log('✅ Created Publications reader:', publicationsReader.email);

	const corelabAdminUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Admin', firstName: 'CoreLab', lastName: 'Admin',
			email: 'corelab-admin@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'], adminApplications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-admin@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabMemberUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Reader One', firstName: 'Reader', lastName: 'One',
			email: 'corelab-reader-1@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-reader-1@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabExpiredUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Expired', firstName: 'CoreLab', lastName: 'Expired',
			email: 'corelab-expired@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB', 'CONGES'],
			accessPeriods: { create: { application: 'CORELAB', endsAt: new Date('2026-01-31T23:59:59.999Z') } },
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-expired@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabPiUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab PI', firstName: 'CoreLab', lastName: 'Investigator',
			email: 'corelab-pi@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-pi@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabReader2User = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Reader Two', firstName: 'Reader', lastName: 'Two',
			email: 'corelab-reader-2@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-reader-2@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabTraineeUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Trainee', firstName: 'Reader', lastName: 'Trainee',
			email: 'corelab-trainee@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-trainee@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabReaderNewUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Reader New', firstName: 'Reader', lastName: 'New',
			email: 'corelab-reader-new@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-reader-new@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	console.log('✅ Created CoreLab users:', corelabAdminUser.email, corelabMemberUser.email, corelabExpiredUser.email, corelabPiUser.email, corelabReader2User.email, corelabReaderNewUser.email, corelabTraineeUser.email);

	const mirStudy = await prisma.corelabStudy.create({
		data: {
			code: 'MIR-DJ-TEST', name: 'MIR-Dijon test study', modalities: ['CMR'], phase: 'PRODUCTION',
			maxExamsPerPatient: 3, startedAt: new Date('2026-03-01T00:00:00.000Z'),
			documentSlots: toJsonValue(MIR_DIJON_CRF_V1.documentSlots), createdById: corelabAdminUser.id,
			crfVersions: { create: { number: 1, definition: toJsonValue(MIR_DIJON_CRF_V1.sequences), discordanceThresholds: toJsonValue(MIR_DIJON_CRF_V1.discordanceThresholds), publishedById: corelabAdminUser.id } },
			sites: { create: [{ code: 'CHU-DIJ-1', name: 'CHU Dijon' }] },
			memberships: { create: [
				{ userId: corelabPiUser.id, canRead: false, canAuthorReference: true, canCertify: true, certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabMemberUser.id, canRead: true, canAdjudicate: true, certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabReader2User.id, canRead: true, certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabTraineeUser.id, canRead: true, addedById: corelabAdminUser.id },
			] },
		},
	});
	console.log('✅ Created CoreLab study:', mirStudy.code);
	const coreModule = await prisma.corelabTrainingModule.create({
		data: {
			scope: 'CORE', order: 1, title: 'Core lab reading principles', type: 'VIDEO', durationMinutes: 14,
			videoKey: 'corelab/training/seed/sample.mp4', videoMimeType: 'video/mp4', videoSize: 1024,
		},
	});
	const studyQuizModule = await prisma.corelabTrainingModule.create({
		data: {
			scope: 'STUDY', studyId: mirStudy.id, order: 2, title: 'MIR-Dijon final quiz', type: 'QUIZ',
			durationMinutes: 5, passThreshold: 50,
			quiz: {
				questions: [
					{ id: 'q1', prompt: 'Which sequence measures LVEF?', choices: [{ id: 'a', label: 'Cine' }, { id: 'b', label: 'LGE' }], correctChoiceId: 'a' },
					{ id: 'q2', prompt: 'How many AHA segments?', choices: [{ id: 'a', label: '12' }, { id: 'b', label: '17' }], correctChoiceId: 'b' },
				],
			},
		},
	});
	await prisma.corelabStudyTrainingRequirement.createMany({
		data: [
			{ studyId: mirStudy.id, moduleId: coreModule.id, order: 1 },
			{ studyId: mirStudy.id, moduleId: studyQuizModule.id, order: 2 },
		],
	});

	const goldStandard = {
		'1': {
			cine: {
				visual_lvef: { value: 52, source: 'MANUAL' },
				lvef: { value: 52, source: 'MANUAL' },
				lv_edv: { value: 172, source: 'MANUAL' },
				lv_esv: { value: 82, source: 'MANUAL' },
				lv_measurable: { value: true, source: 'MANUAL' },
			},
		},
	};
	const calibrationCase = await prisma.corelabCalibrationCase.create({
		data: {
			studyId: mirStudy.id, code: 'CAL-MIR-DJ-TEST-001',
			exams: [{ index: 1, date: '2026-01-14', timeLabel: 'Baseline' }],
			goldStandard, goldStandardUserId: corelabPiUser.id,
		},
	});
	const mirSite = await prisma.corelabSite.findFirstOrThrow({ where: { studyId: mirStudy.id, code: 'CHU-DIJ-1' }, select: { id: true } });
	for (let index = 1; index <= 6; index += 1) {
		await prisma.corelabPatient.create({
			data: {
				studyId: mirStudy.id, siteId: mirSite.id, code: `MIR-DJ-T-00${index}`,
				exams: { create: [
					{ index: 1, modality: 'CMR', examDate: new Date('2026-04-01T00:00:00.000Z'), timeLabel: 'Baseline' },
					{ index: 2, modality: 'CMR', examDate: new Date('2026-10-01T00:00:00.000Z'), timeLabel: 'FU1' },
				] },
			},
		});
	}
	console.log('✅ Created CoreLab cohort: 6 patients');

	console.log('✅ Created CoreLab training and calibration:', coreModule.title, studyQuizModule.title, calibrationCase.code);

	// Minimal publications sample dataset (article where publicationsUser is first author)
	const publicationsJournal = await prisma.journal.create({
		data: { name: 'European Heart Journal', publisher: 'Oxford University Press', impactFactor: 39.3 },
	});
	const publicationsCentre = await prisma.centre.create({
		data: { name: 'Lariboisière Hospital', city: 'Paris', country: 'France', isOwn: true },
	});
	await prisma.centre.upsert({
		where: { name: 'Hôpital Européen Georges-Pompidou, AP-HP' },
		update: {},
		create: { name: 'Hôpital Européen Georges-Pompidou, AP-HP', city: 'Paris', country: 'France', isOwn: true },
	});
	await prisma.centre.upsert({
		where: { name: 'Università degli Studi di Milano' },
		update: {},
		create: { name: 'Università degli Studi di Milano', city: 'Milano', country: 'Italy', isOwn: false },
	});
	const publicationsAffiliation = await prisma.affiliation.create({
		data: {
			name: 'Lariboisière Hospital, APHP, Paris, France',
			institution: 'APHP',
			city: 'Paris',
			country: 'France',
			centre: { connect: { id: publicationsCentre.id } },
		},
	});
	const publicationsFirstAuthor = await prisma.author.create({
		data: {
			firstName: 'Publications',
			lastName: 'User',
			degrees: 'MD',
			type: 'OUR_TEAM',
			centre: { connect: { id: publicationsCentre.id } },
			emails: [publicationsUser.email],
			user: { connect: { id: publicationsUser.id } },
			defaultAffiliation: { connect: { id: publicationsAffiliation.id } },
		},
	});
	const publicationsCoAuthor = await prisma.author.create({
		data: {
			firstName: 'Jane',
			lastName: 'Coauthor',
			degrees: 'MD, PhD',
			type: 'OUR_TEAM',
			centre: { connect: { id: publicationsCentre.id } },
			emails: ['jane.coauthor@larib-portal.test'],
			defaultAffiliation: { connect: { id: publicationsAffiliation.id } },
			paperAffiliations: {
				create: [{ raw: 'Inserm MASCOT - UMRS 942, University Hospital of Lariboisiere, 75010, Paris, France.', order: 0 }],
			},
		},
	});
	const publicationsStudy = await prisma.study.create({
		data: { title: 'MULTIVALVE registry', description: 'Retrospective multi-valve cohort', createdBy: { connect: { id: publicationsAdmin.id } } },
	});
	await prisma.article.create({
		data: {
			title: 'Outcomes of multi-valve intervention: a retrospective cohort',
			type: 'ORIGINAL',
			status: 'UNDER_REVIEW',
			study: { connect: { id: publicationsStudy.id } },
			createdBy: { connect: { id: publicationsUser.id } },
			authorships: {
				create: [
					{
						order: 1,
						author: { connect: { id: publicationsFirstAuthor.id } },
						affiliations: { create: [{ order: 0, affiliation: { connect: { id: publicationsAffiliation.id } } }] },
					},
					{ order: 2, isCorresponding: true, author: { connect: { id: publicationsCoAuthor.id } } },
				],
			},
		},
	});
	// A paper the member co-signs without leading it: the only shape where the
	// "report an error" entry point appears.
	await prisma.article.create({
		data: {
			title: 'Co-signed review of valve imaging',
			type: 'REVIEW',
			status: 'UNDER_REVIEW',
			createdBy: { connect: { id: publicationsAdmin.id } },
			authorships: {
				create: [
					{ order: 1, author: { connect: { id: publicationsCoAuthor.id } } },
					{ order: 2, author: { connect: { id: publicationsFirstAuthor.id } } },
				],
			},
		},
	});
	await prisma.article.create({
		data: {
			title: 'Personal cohort study from a previous laboratory',
			type: 'ORIGINAL',
			status: 'PUBLISHED',
			pubmedId: '34512303',
			scope: 'OUTSIDE_TEAM',
			publishedAt: new Date('2024-05-12T00:00:00.000Z'),
			createdBy: { connect: { id: publicationsUser.id } },
			authorships: { create: [{ order: 1, author: { connect: { id: publicationsFirstAuthor.id } } }] },
		},
	});
	// Second published year for the same member: "My publications" needs two year bars
	// before its year-range slider appears, and both stay out of the team library.
	await prisma.article.create({
		data: {
			title: 'Prior-laboratory follow-up of aortic stenosis',
			type: 'ORIGINAL',
			status: 'PUBLISHED',
			scope: 'OUTSIDE_TEAM',
			publishedAt: new Date('2021-09-03T00:00:00.000Z'),
			createdBy: { connect: { id: publicationsUser.id } },
			authorships: { create: [{ order: 1, author: { connect: { id: publicationsFirstAuthor.id } } }] },
		},
	});
	// Dedicated fixture for the carousel email flow: its own authors and a submission
	// carrying the journal name the email draft quotes. They stay EXTERNAL and their
	// last names sort last, so the author picker "team" tab and the author-merge spec
	// keep seeing exactly the rows they already assert on.
	const carouselFirstAuthor = await prisma.author.create({
		data: {
			firstName: 'Nina',
			lastName: 'Zellweger',
			degrees: 'MD',
			type: 'EXTERNAL',
			centre: { connect: { name: 'Università degli Studi di Milano' } },
			emails: ['nina.zellweger@larib-portal.test'],
		},
	});
	const carouselLastAuthor = await prisma.author.create({
		data: {
			firstName: 'Marc',
			lastName: 'Zurbrugg',
			degrees: 'MD, PhD',
			type: 'EXTERNAL',
			centre: { connect: { name: 'Università degli Studi di Milano' } },
			emails: ['marc.zurbrugg@larib-portal.test'],
		},
	});
	await prisma.article.create({
		data: {
			title: 'Carousel pilot: valvular imaging in routine practice',
			type: 'ORIGINAL',
			status: 'UNDER_REVIEW',
			createdBy: { connect: { id: publicationsAdmin.id } },
			authorships: {
				create: [
					{ order: 1, author: { connect: { id: carouselFirstAuthor.id } } },
					{ order: 2, isCorresponding: true, author: { connect: { id: carouselLastAuthor.id } } },
				],
			},
			submissions: {
				create: [
					{
						journal: { connect: { id: publicationsJournal.id } },
						submittedAt: new Date('2026-01-15T00:00:00.000Z'),
						status: 'SUBMITTED',
					},
				],
			},
		},
	});
	// Already communicated: the Communication module lists it under "Sent" with the green tag.
	// It signs its own author: the authors table sorts by authorship count first, so giving a
	// second paper to Nina or Marc would push them into the top rows the author-merge spec merges.
	const communicatedAuthor = await prisma.author.create({
		data: {
			firstName: 'Yara',
			lastName: 'Zwicky',
			degrees: 'MD',
			type: 'EXTERNAL',
			centre: { connect: { name: 'Università degli Studi di Milano' } },
			emails: ['yara.zwicky@larib-portal.test'],
		},
	});
	await prisma.article.create({
		data: {
			title: 'Carousel done: strain imaging after valve repair',
			type: 'ORIGINAL',
			status: 'PUBLISHED',
			acceptedAt: new Date('2026-02-10T00:00:00.000Z'),
			publishedAt: new Date('2026-02-20T00:00:00.000Z'),
			carouselEmailSentAt: new Date('2026-02-24T00:00:00.000Z'),
			createdBy: { connect: { id: publicationsAdmin.id } },
			authorships: { create: [{ order: 1, author: { connect: { id: communicatedAuthor.id } } }] },
		},
	});
	const recentlyAccepted = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
	await prisma.article.create({
		data: {
			title: 'Freshly accepted: myocardial mapping in amyloidosis',
			type: 'ORIGINAL',
			scope: 'LARIB_TEAM',
			status: 'ACCEPTED',
			acceptedAt: recentlyAccepted,
			createdBy: { connect: { id: publicationsAdmin.id } },
			authorships: { create: [{ order: 1, author: { connect: { id: communicatedAuthor.id } } }] },
		},
	});
	console.log('✅ Created publications sample data');

	// Create exam types first (using upsert to handle duplicates)
	console.log('📦 Creating exam types...');
	const examTypeNames = ['ECG', 'ECHO', 'HOLTER'];
	const createdExamTypes = [];

	for (const typeName of examTypeNames) {
		const examType = await prisma.examType.upsert({
			where: { name: typeName },
			update: {},
			create: {
				id: randomUUID(),
				name: typeName,
			},
		});
		createdExamTypes.push(examType);
	}

	console.log('✅ Created exam types');

	// Create test cases for bestof-larib
	console.log('📦 Creating test clinical cases...');
	const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
	const statuses = ['PUBLISHED', 'DRAFT'] as const;

	const createdCases: Array<{ id: string; name: string }> = [];

	for (let i = 0; i < 6; i++) {
		const caseData = await prisma.clinicalCase.create({
			data: {
				id: randomUUID(),
				name: `Test Case ${i + 1}`,
				examType: {
					connect: {
						id: createdExamTypes[i % createdExamTypes.length].id,
					},
				},
				difficulty: difficulties[i % difficulties.length],
				status: statuses[i < 4 ? 0 : 1],
				createdBy: {
					connect: {
						id: adminUser.id,
					},
				},
				createdAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
			},
		});
		createdCases.push({ id: caseData.id, name: `Test Case ${i + 1}` });
	}

	console.log('✅ Created 6 test clinical cases');

	console.log('📦 Creating user attempts and settings for sorting tests...');

	await prisma.caseAttempt.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[0].id,
			validatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		},
	});

	await prisma.caseAttempt.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[1].id,
			validatedAt: null,
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[0].id,
			personalDifficulty: 'ADVANCED',
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[1].id,
			personalDifficulty: 'BEGINNER',
		},
	});

	await prisma.userCaseSettings.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			caseId: createdCases[2].id,
			personalDifficulty: 'INTERMEDIATE',
		},
	});

	console.log('✅ Created user attempts and settings');

	console.log('📦 Creating leave request test data...');

	// Set up user with leave allocation and contract dates
	// Use dynamic dates to ensure contract is always valid
	const contractStartDate = new Date();
	contractStartDate.setFullYear(contractStartDate.getFullYear() - 2);
	const contractEndDate = new Date();
	contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

	await prisma.user.update({
		where: { id: regularUser.id },
		data: {
			congesTotalDays: 30,
			arrivalDate: contractStartDate,
			departureDate: contractEndDate,
		},
	});

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			startDate: new Date('2024-12-19'),
			endDate: new Date('2024-12-27'),
			status: 'APPROVED',
			approverId: adminUser.id,
			decisionAt: new Date('2024-12-01'),
		},
	});

	const pendingStart = new Date();
	pendingStart.setMonth(pendingStart.getMonth() + 2);
	pendingStart.setDate(10);
	const pendingEnd = new Date(pendingStart);
	pendingEnd.setDate(pendingStart.getDate() + 3);

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			startDate: pendingStart,
			endDate: pendingEnd,
			reason: 'Pending request awaiting admin decision',
			status: 'PENDING',
		},
	});

	const secondPendingStart = new Date(pendingStart);
	secondPendingStart.setMonth(pendingStart.getMonth() + 1);
	const secondPendingEnd = new Date(secondPendingStart);
	secondPendingEnd.setDate(secondPendingStart.getDate() + 1);

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: regularUser.id,
			startDate: secondPendingStart,
			endDate: secondPendingEnd,
			reason: 'Second pending request awaiting admin decision',
			status: 'PENDING',
		},
	});

	// Create a leave for the user WITHOUT CONGES access (should be filtered out in admin view)
	const today = new Date();
	const noCongesLeaveStart = new Date(today);
	noCongesLeaveStart.setDate(today.getDate() - 1);
	const noCongesLeaveEnd = new Date(today);
	noCongesLeaveEnd.setDate(today.getDate() + 2);

	await prisma.leaveRequest.create({
		data: {
			id: randomUUID(),
			userId: userWithoutConges.id,
			startDate: noCongesLeaveStart,
			endDate: noCongesLeaveEnd,
			reason: 'Should not appear in admin view',
			status: 'APPROVED',
			approverId: adminUser.id,
			decisionAt: new Date(),
		},
	});

	console.log('✅ Created leave request test data');

	console.log('✨ Test database seeded successfully!');
	console.log('');
	console.log('Test credentials:');
	console.log('  Admin: test-admin@larib-portal.test / ristifou');
	console.log('  User:  test-user@larib-portal.test / ristifou');
	console.log('  No Conges User: no-conges@larib-portal.test / ristifou');
	console.log('  Conges Admin: conges-admin@larib-portal.test / ristifou');
	console.log('  Bestof Admin: bestof-admin@larib-portal.test / ristifou');
	console.log('  Publications Admin: publications-admin@larib-portal.test / ristifou');
	console.log('  Publications User: publications-user@larib-portal.test / ristifou');
	console.log('  Publications PubMed author: publications-pubmed-author@larib-portal.test / ristifou');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('❌ Error seeding database:', e);
		await prisma.$disconnect();
		process.exit(1);
	});
