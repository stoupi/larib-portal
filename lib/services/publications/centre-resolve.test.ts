import { describe, it, expect } from 'vitest'
import type { Prisma } from '@/app/generated/prisma'
import { loadCentreIndex, previewCentreResolutions, proposeCentreName, resolveCentre } from './centre-resolve'

type FakeCentre = { id: string; name: string; city: string | null; country: string | null; isOwn: boolean }
type FakeAlias = { centreId: string; normalized: string }

function fakeTx(centres: FakeCentre[], aliases: FakeAlias[] = []) {
  let nextId = centres.length + 1
  const tx = {
    centre: {
      findMany: async () => centres.map((centre) => ({ id: centre.id, name: centre.name })),
      findUnique: async ({ where }: { where: { id: string } }) => centres.find((centre) => centre.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { name: string } }) => centres.find((centre) => centre.name === where.name) ?? null,
      create: async ({ data }: { data: { name: string; city: string | null; country: string | null } }) => {
        if (centres.some((centre) => centre.name === data.name)) throw new Error('unique violation')
        const created: FakeCentre = { id: `new-${nextId++}`, name: data.name, city: data.city, country: data.country, isOwn: false }
        centres.push(created)
        return created
      },
      update: async ({ where, data }: { where: { id: string }; data: { city: string | null; country: string | null } }) => {
        const centre = centres.find((row) => row.id === where.id)
        if (centre) Object.assign(centre, data)
        return centre
      },
    },
    centreAlias: {
      findMany: async () => aliases,
      findUnique: async ({ where }: { where: { normalized: string } }) => aliases.find((alias) => alias.normalized === where.normalized) ?? null,
      create: async ({ data }: { data: { centreId: string; normalized: string } }) => {
        const created = { centreId: data.centreId, normalized: data.normalized }
        aliases.push(created)
        return created
      },
    },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, centres, aliases }
}

const BANK: FakeCentre[] = [
  { id: 'bichat', name: 'AP-HP - Bichat', city: 'Paris', country: 'France', isOwn: false },
  { id: 'dijon', name: 'CHU de Dijon', city: 'Dijon', country: 'France', isOwn: false },
  { id: 'nancy', name: 'CHRU de Nancy', city: null, country: null, isOwn: false },
  { id: 'lariboisiere', name: 'AP-HP - Lariboisière', city: 'Paris', country: 'France', isOwn: true },
]

describe('proposeCentreName', () => {
  it('drops an affiliation that names no hospital, but keeps an unrecognised trial site', () => {
    expect(proposeCentreName({ rawName: 'Department of Cardiology', keepUnrecognisedName: false })).toBeNull()
    expect(proposeCentreName({ rawName: 'Elbeuf Louviers Val de Reuil', keepUnrecognisedName: false })).toBeNull()
    expect(proposeCentreName({ rawName: 'Elbeuf Louviers Val de Reuil', keepUnrecognisedName: true })).toBe('Elbeuf Louviers Val de Reuil')
  })

  // A trial whose only declared site is the group would otherwise end up with no centre.
  it('keeps an umbrella name for a trial site but never invents one from an affiliation', () => {
    expect(proposeCentreName({ rawName: 'Assistance Publique Hôpitaux de Paris', keepUnrecognisedName: true })).toBe('Assistance Publique Hôpitaux de Paris')
    expect(proposeCentreName({ rawName: 'Cardiology, AP-HP, Paris', keepUnrecognisedName: false })).toBeNull()
  })

  it('strips the trailing punctuation ClinicalTrials.gov leaves on site names', () => {
    expect(proposeCentreName({ rawName: 'IRCCS Policlinico San Donato,', keepUnrecognisedName: true })).toBe('IRCCS Policlinico San Donato')
  })
})

describe('resolveCentre', () => {
  it('maps every spelling of a known site onto the centre that already exists', async () => {
    const { tx, centres } = fakeTx([...BANK])
    const index = await loadCentreIndex(tx)
    const before = centres.length

    for (const [rawName, expectedId] of [
      ['CHU Dijon', 'dijon'],
      ['CHU de Dijon', 'dijon'],
      ['chu   DIJON', 'dijon'],
      ['CHU de Nancy', 'nancy'],
      ['Bichat (APHP)', 'bichat'],
      ['Cardiology Department, Bichat Hospital, Paris, France', 'bichat'],
      ['Department of Cardiology University Hospital of Dijon Dijon France.', 'dijon'],
    ] as const) {
      const resolved = await resolveCentre(tx, index, { rawName, keepUnrecognisedName: true })
      expect(resolved, rawName).not.toBeNull()
      expect(resolved?.centreId, rawName).toBe(expectedId)
      expect(resolved?.created, rawName).toBe(false)
    }
    expect(centres.length).toBe(before)
  })

  it('creates an unknown site once and reuses it for the next spelling', async () => {
    const { tx, centres } = fakeTx([...BANK])
    const index = await loadCentreIndex(tx)

    const first = await resolveCentre(tx, index, { rawName: 'Ospedale Villa dei Colli', city: 'Rome', country: 'Italy', keepUnrecognisedName: true })
    expect(first?.created).toBe(true)
    expect(centres).toHaveLength(BANK.length + 1)

    const second = await resolveCentre(tx, index, { rawName: 'ospedale villa dei colli,', keepUnrecognisedName: true })
    expect(second?.created).toBe(false)
    expect(second?.centreId).toBe(first?.centreId)
    expect(centres).toHaveLength(BANK.length + 1)
  })

  it('completes a centre whose city was never filled in', async () => {
    const { tx, centres } = fakeTx([...BANK])
    const index = await loadCentreIndex(tx)

    await resolveCentre(tx, index, { rawName: 'CHU de Nancy', city: 'Vandoeuvre-Les-Nancy', country: 'France', keepUnrecognisedName: true })

    const nancy = centres.find((centre) => centre.id === 'nancy')
    expect(nancy?.city).toBe('Vandoeuvre-Les-Nancy')
    expect(nancy?.country).toBe('France')
  })

  it('follows an alias left behind by a merge instead of recreating the duplicate', async () => {
    const { tx, centres } = fakeTx([...BANK], [{ centreId: 'bichat', normalized: 'hopital claude bernard' }])
    const index = await loadCentreIndex(tx)

    const resolved = await resolveCentre(tx, index, { rawName: 'Hôpital Claude Bernard', keepUnrecognisedName: true })

    expect(resolved?.centreId).toBe('bichat')
    expect(resolved?.created).toBe(false)
    expect(centres).toHaveLength(BANK.length)
  })

  it('previews each site without touching the bank', async () => {
    const { tx, centres } = fakeTx([...BANK])

    const preview = await previewCentreResolutions(tx, ['CHU Dijon', 'Bichat (APHP)', 'Ospedale Villa dei Colli'])

    expect(preview).toEqual([
      { rawName: 'CHU Dijon', resolvedName: 'CHU de Dijon', status: 'existing', centreId: 'dijon' },
      { rawName: 'Bichat (APHP)', resolvedName: 'AP-HP - Bichat', status: 'existing', centreId: 'bichat' },
      { rawName: 'Ospedale Villa dei Colli', resolvedName: 'Ospedale Villa dei Colli', status: 'new', centreId: null },
    ])
    expect(centres).toHaveLength(BANK.length)
  })

  // The admin correction must not be a one-off: the raw spelling becomes an alias, so the
  // next import of the same site lands on the right centre without asking again.
  it('honours a hand-picked centre and remembers the site spelling as an alias', async () => {
    const { tx, centres, aliases } = fakeTx([...BANK])
    const index = await loadCentreIndex(tx)

    const resolved = await resolveCentre(tx, index, { rawName: 'Chu Lille- Hopital Cardiologique', keepUnrecognisedName: true, overrideCentreId: 'dijon' })

    expect(resolved?.centreId).toBe('dijon')
    expect(resolved?.created).toBe(false)
    expect(centres).toHaveLength(BANK.length)
    expect(aliases.some((alias) => alias.centreId === 'dijon')).toBe(true)

    const again = await resolveCentre(tx, index, { rawName: 'Chu Lille- Hopital Cardiologique', keepUnrecognisedName: true })
    expect(again?.centreId).toBe('dijon')
    expect(centres).toHaveLength(BANK.length)
  })

  it('returns nothing when an affiliation carries no identifiable hospital', async () => {
    const { tx, centres } = fakeTx([...BANK])
    const index = await loadCentreIndex(tx)

    expect(await resolveCentre(tx, index, { rawName: 'Department of Cardiology, University Hospital, City', keepUnrecognisedName: false })).toBeNull()
    expect(centres).toHaveLength(BANK.length)
  })
})
