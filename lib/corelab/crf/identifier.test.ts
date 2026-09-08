import { describe, expect, it } from 'vitest'
import { asIdentifier, slugify } from './identifier'

describe('slugify', () => {
  it('derives an identifier a reader name can carry', () => {
    expect(slugify('LV Strain global')).toBe('lv_strain_global')
    expect(slugify('Épaisseur maximale')).toBe('epaisseur_maximale')
    expect(slugify('  T1 / T2 ratio  ')).toBe('t1_t2_ratio')
  })

  it('gives an empty identifier back when nothing survives', () => {
    expect(slugify('—')).toBe('')
  })
})

describe('asIdentifier', () => {
  it('keeps what the schema accepts and replaces the rest', () => {
    expect(asIdentifier('LV Strain')).toBe('lv_strain')
    expect(asIdentifier('lv-edv')).toBe('lv_edv')
    expect(asIdentifier('already_fine_2')).toBe('already_fine_2')
  })
})
