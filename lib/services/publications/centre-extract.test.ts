import { describe, it, expect } from 'vitest'
import { guessCentre, normalizeCentreKey } from './centre-extract'

describe('guessCentre', () => {
  it('maps curated AP-HP hospitals onto the "AP-HP - Site" names used by the centre bank', () => {
    expect(guessCentre('CMR Lab, Hopital Lariboisiere, AP-HP, Paris, France')).toBe('AP-HP - Lariboisière')
    expect(guessCentre('Department of Cardiology, Cochin Hospital, Paris, France')).toBe('AP-HP - Cochin')
    expect(guessCentre('Cardiology, Hôpital Saint-Antoine, Paris, France')).toBe('AP-HP - Saint-Antoine')
    expect(guessCentre('Henri Mondor Hospital, Creteil, France')).toBe('AP-HP - Henri Mondor')
    expect(guessCentre('Bichat (APHP)')).toBe('AP-HP - Bichat')
    expect(guessCentre('Georges Pompidou European Hospital (AP-HP)')).toBe('AP-HP - HEGP')
  })

  it('maps curated hospital sites to their CHU/CH', () => {
    expect(guessCentre('Rangueil University Hospital, Toulouse, France')).toBe('CHU de Toulouse')
    expect(guessCentre('Nouvel Hôpital Civil, Strasbourg, France')).toBe('CHU de Strasbourg')
    expect(guessCentre('Hôpital Cardiologique du Haut-Lévêque, Pessac, France')).toBe('CHU de Bordeaux')
    expect(guessCentre('CNRS SIGMA UCA UMR 6602, University Hospital Gabriel Montpied, Clermont-Ferrand')).toBe('CHU de Clermont-Ferrand')
    expect(guessCentre('Hôpital Henri Duffaut, Avignon, France')).toBe("CH d'Avignon")
  })

  it('canonicalizes EN/FR equivalences', () => {
    expect(guessCentre('Department of Cardiology, University Hospital of Bordeaux, France')).toBe('CHU de Bordeaux')
    expect(guessCentre('Rouen University Hospital, Rouen, France')).toBe('CHU de Rouen')
    expect(guessCentre('Centre Hospitalier de Chartres, Chartres, France')).toBe('CH de Chartres')
    expect(guessCentre('Service de Cardiologie, CHU de Toulouse, France')).toBe('CHU de Toulouse')
    expect(guessCentre('Cardiology, CHU Lille, Lille, France')).toBe('CHU de Lille')
    expect(guessCentre('Cardiology, Centre Hospitalier Régional Universitaire de Nancy, France')).toBe('CHRU de Nancy')
    expect(guessCentre('Hôpital Cardiologique Louis Pradel, Bron, France')).toBe('CHU de Lyon')
  })

  it('groups independent contributors and merges Clinique Ambroise Paré variants', () => {
    expect(guessCentre('Independent Biostatistician, Paris')).toBe('Independent')
    expect(guessCentre('Clinique A.-Paré, Toulouse, France')).toBe('Clinique Ambroise Paré')
    expect(guessCentre('Clinique Médico-Chirurgicale Ambroise Paré, Neuilly, France')).toBe('Clinique Ambroise Paré')
  })

  it('returns null for generic labels and bare departments (no centre)', () => {
    expect(guessCentre('Department of Cardiology, University Hospital, City')).toBeNull()
    expect(guessCentre('Cardiology, AP-HP, Paris')).toBeNull()
    expect(guessCentre('Rehabilitation Center, City')).toBeNull()
    expect(guessCentre("Children's Hospital, City")).toBeNull()
    expect(guessCentre('Department of Cardiology')).toBeNull()
    expect(guessCentre('')).toBeNull()
  })

  it('falls back to a university when no hospital is present', () => {
    expect(guessCentre('Department of Cardiology, INSERM U970, Université de Paris, Paris, France')).toBe('Université de Paris')
  })

  // Some sources hand over the whole affiliation as one comma-free block. Splitting on
  // commas then left the entire sentence as the centre name, creating one bogus centre
  // per publication instead of matching the CHU that already existed.
  it('isolates the hospital inside a comma-free affiliation', () => {
    expect(guessCentre('Department of Cardiology University Hospital of Dijon Dijon France.')).toBe('CHU de Dijon')
    expect(guessCentre('Department of Cardiology University Hospital of Lille Lille France.')).toBe('CHU de Lille')
    expect(guessCentre('Department of Cardiology University Hospital of Grenoble Grenoble France.')).toBe('CHU de Grenoble')
    expect(guessCentre('Department of Cardiology University Hospital of Poitiers Poitiers France.')).toBe('CHU de Poitiers')
    expect(guessCentre('Department of Cardiology University Hospital of La Réunion La Réunion France.')).toBe('CHU de La Réunion')
    expect(guessCentre('Department of Cardiovascular Medicine Rouen University Hospital Rouen France.')).toBe('CHU de Rouen')
    expect(guessCentre('Department of Cardiovascular Medicine Amiens University Hospital Amiens France.')).toBe("CHU d'Amiens")
    expect(guessCentre('Department of Cardiology University Hospital Brest France.')).toBe('CHU de Brest')
    expect(guessCentre('Department of Cardiovascular Medicine Metz Hospital Metz France.')).toBe('Metz Hospital')
  })

  it('never turns the AP-HP umbrella into a centre', () => {
    expect(guessCentre('Assistance Publique Hôpitaux de Paris')).toBeNull()
    expect(guessCentre('Assistance Publique-Hôpitaux de Paris, Paris Saint-Joseph Hospital Paris France.')).toBe('Paris Saint-Joseph Hospital')
  })

  // Names coming from ClinicalTrials.gov site lists, which used to be stored verbatim.
  it('canonicalizes the site names used by ClinicalTrials.gov', () => {
    expect(guessCentre('CHU Dijon')).toBe('CHU de Dijon')
    expect(guessCentre('CHU Saint Etienne')).toBe('CHU de Saint Etienne')
    expect(guessCentre('APHM')).toBe('CHU de Marseille')
    expect(guessCentre('CHU Annecy')).toBe('CH Annecy Genevois')
    expect(guessCentre('Saint Gatien hospital')).toBe('Clinique Saint-Gatien')
    expect(guessCentre('Jacques Cartier Private Hospital, Massy')).toBe('Institut Cardiovasculaire Paris Sud')
    expect(guessCentre('Lille Catholic Institute Hospital Group, Lille')).toBe("GCS-Groupement des Hôpitaux de l'Institut Catholique de Lille")
    expect(guessCentre('Lausanne University Hospital-CHUV')).toBe('University Hospital Lausanne')
    expect(guessCentre('CHU de Fréjus / Saint-Raphael')).toBe('CH de Fréjus/Saint-Raphaël')
  })

  it('is idempotent on the names it produces', () => {
    for (const name of ['AP-HP - Bichat', 'CHU de Dijon', "CH d'Avignon", 'CH Annecy Genevois', 'Institut Cardiovasculaire Paris Sud']) {
      expect(guessCentre(name)).toBe(name)
    }
  })
})

describe('normalizeCentreKey', () => {
  it('collapses spelling variants of the same site onto one key', () => {
    expect(normalizeCentreKey('CHU Dijon')).toBe(normalizeCentreKey('CHU de Dijon'))
    expect(normalizeCentreKey('CHU de Nancy')).toBe(normalizeCentreKey('CHRU de Nancy'))
    expect(normalizeCentreKey("CHR d'Orléans")).toBe(normalizeCentreKey('CH Régional d’Orléans'))
    expect(normalizeCentreKey('CHU Saint Etienne')).toBe(normalizeCentreKey('CHU de Saint-Etienne'))
    expect(normalizeCentreKey('Loyola University of Chicago,')).toBe(normalizeCentreKey('Loyola University of Chicago'))
    expect(normalizeCentreKey('AP-HP - Bichat')).toBe(normalizeCentreKey('ap-hp bichat'))
  })

  it('keeps genuinely different sites apart', () => {
    expect(normalizeCentreKey('CHU de Lille')).not.toBe(normalizeCentreKey('CHU de Lyon'))
    expect(normalizeCentreKey('AP-HP - Bichat')).not.toBe(normalizeCentreKey('AP-HP - Cochin'))
    expect(normalizeCentreKey('CH de Versailles')).not.toBe(normalizeCentreKey('CH de Chartres'))
  })
})
