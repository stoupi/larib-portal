/* Domain model. One shared store drives every view, so a change made on one
   screen is visible on the next — that is the point of the prototype. */

const SENIORS = [
  { id: 'tp', initials: 'TP', name: 'Théo Pezel', short: 'Théo', role: 'Coordinateur et senior', coordinator: true },
  { id: 'ab', initials: 'AB', name: 'A. Bernard', short: 'Alix', role: 'Imageur senior' },
  { id: 'cd', initials: 'CD', name: 'C. Dumont', short: 'Claire', role: 'Imageur senior' },
  { id: 'fl', initials: 'FL', name: 'F. Leroy', short: 'Flore', role: 'Imageur senior' },
  { id: 'mn', initials: 'MN', name: 'M. Nguyen', short: 'Mai', role: 'Imageur senior' },
  { id: 'sr', initials: 'SR', name: 'S. Rousseau', short: 'Sacha', role: 'Imageur senior' },
  { id: 'jv', initials: 'JV', name: 'J. Vidal', short: 'Jules', role: 'Imageur senior' },
  { id: 'ml', initials: 'ML', name: 'M. Lefèvre', short: 'Marie', role: 'Imageur senior' }
]

const FELLOWS = [
  { id: 'la', initials: 'LA', name: 'L. Aubry', short: 'Léa', role: 'Fellow imagerie' },
  { id: 'nc', initials: 'NC', name: 'N. Chevalier', short: 'Noé', role: 'Fellow imagerie' },
  { id: 'pf', initials: 'PF', name: 'P. Fontaine', short: 'Paul', role: 'Fellow imagerie' },
  { id: 'rm', initials: 'RM', name: 'R. Marchand', short: 'Rim', role: 'Fellow imagerie' },
  { id: 'ts', initials: 'TS', name: 'T. Sabatier', short: 'Tom', role: 'Fellow imagerie' }
]

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const WEEKDAYS_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']

/** Weekly pattern replayed over every working day of October 2026. */
const PATTERN = {
  1: [['MORNING', 'BERGERE', 'IRM'], ['MORNING', 'BERGERE', 'Scanner'], ['AFTERNOON', 'LARIBOISIERE', 'IRM']],
  2: [['MORNING', 'BLOMET', 'Scanner'], ['AFTERNOON', 'BERGERE', 'IRM'], ['AFTERNOON', 'BLOMET', 'Scanner']],
  3: [['MORNING', 'LARIBOISIERE', 'IRM'], ['MORNING', 'LARIBOISIERE', 'Scanner'], ['AFTERNOON', 'BLOMET', 'IRM']],
  4: [['MORNING', 'BERGERE', 'Scanner'], ['AFTERNOON', 'LARIBOISIERE', 'IRM'], ['AFTERNOON', 'LARIBOISIERE', 'Scanner']],
  5: [['MORNING', 'BLOMET', 'IRM'], ['AFTERNOON', 'BERGERE', 'Scanner']]
}

function hash(text) {
  let value = 7
  for (let position = 0; position < text.length; position += 1) {
    value = (value * 31 + text.charCodeAt(position)) % 100000
  }
  return value
}

function isoWeek(date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = copy.getUTCDay() || 7
  copy.setUTCDate(copy.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1))
  return Math.ceil(((copy - yearStart) / 86400000 + 1) / 7)
}

function buildSlots() {
  const built = []
  for (let dayNumber = 1; dayNumber <= 31; dayNumber += 1) {
    const date = new Date(Date.UTC(2026, 9, dayNumber))
    const weekday = date.getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    ;(PATTERN[weekday] || []).forEach((entry, position) => {
      built.push({
        id: 'd' + dayNumber + '-' + position,
        dayNumber,
        date,
        weekday,
        week: isoWeek(date),
        halfDay: entry[0],
        center: entry[1],
        modality: entry[2],
        seniorCapacity: 1,
        fellowCapacity: entry[1] === 'BLOMET' && entry[0] === 'AFTERNOON' ? 0 : 1
      })
    })
  }
  return built
}

const SLOTS = buildSlots()
const WEEKS = SLOTS.reduce((list, slot) => (list.indexOf(slot.week) === -1 ? list.concat(slot.week) : list), []).sort(
  (left, right) => left - right
)

/** The three Blomet Tuesday-afternoon CT slots nobody volunteered for. */
const ORPHANS = SLOTS.filter((slot) => slot.weekday === 2 && slot.halfDay === 'AFTERNOON' && slot.modality === 'Scanner').map(
  (slot) => slot.id
)

/** Seeded declarations for everyone except the viewer, who edits their own. */
function seedAvailability(personId, slotId) {
  if (ORPHANS.indexOf(slotId) !== -1) return 'UNAVAILABLE'
  const person = SENIORS.concat(FELLOWS).find((entry) => entry.id === personId)
  if (person && person.id === 'ml') return 'UNAVAILABLE'
  const draw = hash(personId + '|' + slotId) % 100
  if (person && person.id === 'cd') return draw < 9 ? 'AVAILABLE' : 'UNAVAILABLE'
  if (person && person.id === 'jv') return 'UNAVAILABLE'
  if (person && person.id === 'sr') return draw < 52 ? 'AVAILABLE' : draw < 58 ? 'PREFERRED' : 'UNAVAILABLE'
  if (draw < 34) return 'AVAILABLE'
  if (draw < 40) return 'PREFERRED'
  if (draw < 92) return 'UNAVAILABLE'
  return 'NONE'
}

const SUBMISSION_SEED = {
  tp: 'SUBMITTED', ab: 'SUBMITTED', sr: 'SUBMITTED', mn: 'SUBMITTED',
  cd: 'SUBMITTED', fl: 'IN_PROGRESS', jv: 'NOT_STARTED', ml: 'DECLINED_MONTH'
}

const REMINDERS = { tp: 0, ab: 0, sr: 1, mn: 0, cd: 2, fl: 2, jv: 3, ml: 1 }
const LAST_OPENED = { tp: '14 sept.', ab: '13 sept.', sr: '15 sept.', mn: '11 sept.', cd: '15 sept.', fl: 'hier', jv: 'jamais', ml: '9 sept.' }

/** Carried-over equity debts and credits from the previous months (RG-34). */
const CARRY = { tp: 0, ab: 0, cd: 2, fl: -1, mn: 1, sr: -2, jv: 0, ml: 0 }

const S = {
  role: 'COORDINATOR',
  /** 'app' = /planning, 'admin' = /planning/admin — two sidebar entries. */
  space: 'admin',
  view: 'campagnes',
  campaignId: 'oct-2026',
  /** availability[personId][slotId] = 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE' | 'NONE' */
  availability: {},
  submissions: Object.assign({}, SUBMISSION_SEED),
  /** assignments[slotId] = personId | null, for the SENIOR population */
  assignments: {},
  fellowAssignments: {},
  locks: {},
  week: 41,
  slotId: null,
  acknowledged: false,
  published: false,
  planVersion: 3,
  importMethod: 'import',
  importMode: 'merge',
  settingsTab: 'weights',
  countersPeriod: 'month',
  swapTab: 'inbox',
  swapShiftId: null,
  swapKind: 'EXCHANGE',
  monthFilter: 'all',
  suiviFilter: 'all',
  showAllWeights: false,
  diffVersion: 'v2',
  mailLocale: 'fr',
  toast: null
}

function availabilityOf(personId, slotId) {
  const own = S.availability[personId]
  if (own && own[slotId] !== undefined) return own[slotId]
  return seedAvailability(personId, slotId)
}

function setAvailability(personId, slotId, value) {
  if (!S.availability[personId]) S.availability[personId] = {}
  S.availability[personId][slotId] = value
  if (S.submissions[personId] === 'NOT_STARTED') S.submissions[personId] = 'IN_PROGRESS'
}

const isFree = (status) => status === 'AVAILABLE' || status === 'PREFERRED'

function availableSeniors(slotId) {
  return SENIORS.filter((person) => isFree(availabilityOf(person.id, slotId)))
}

function declaredCount(personId) {
  return SLOTS.filter((slot) => isFree(availabilityOf(personId, slot.id))).length
}

/** Half-day + centre groups where a CMR and a CT coexist — the S1 targets. */
function doubleShiftGroups() {
  const groups = {}
  SLOTS.forEach((slot) => {
    const key = slot.dayNumber + '|' + slot.halfDay + '|' + slot.center
    if (!groups[key]) groups[key] = []
    groups[key].push(slot)
  })
  return Object.keys(groups)
    .filter((key) => {
      const pair = groups[key]
      return pair.length === 2 && pair[0].modality !== pair[1].modality
    })
    .sort()
    .map((key) => groups[key])
}

/** Deterministic first solve, honouring C1: never assign outside a declaration. */
function solveSeniors() {
  const counts = {}
  SENIORS.forEach((person) => { counts[person.id] = 0 })
  const takenHalfDays = {}
  const result = {}
  const coordinator = SENIORS.find((person) => person.coordinator)

  /* S1 first, weight 200: the coordinator covers a CMR and a CT on one
     centre. Capped near their equity target so the exception never turns
     into a privilege. */
  const doubleQuota = Math.max(1, Math.round(SLOTS.length / SENIORS.filter((person) => person.id !== 'ml').length / 3))
  let formed = 0
  doubleShiftGroups().forEach((pair) => {
    if (formed >= doubleQuota) return
    if (!pair.every((slot) => isFree(availabilityOf(coordinator.id, slot.id)))) return
    pair.forEach((slot) => {
      result[slot.id] = coordinator.id
      counts[coordinator.id] += 1
      takenHalfDays[coordinator.id + '|' + slot.dayNumber + '-' + slot.halfDay] = { center: slot.center, modality: slot.modality }
    })
    formed += 1
  })

  const ordered = SLOTS.filter((slot) => result[slot.id] === undefined).sort((left, right) => {
    const leftPool = availableSeniors(left.id).length
    const rightPool = availableSeniors(right.id).length
    if (leftPool !== rightPool) return leftPool - rightPool
    return left.id.localeCompare(right.id)
  })

  ordered.forEach((slot) => {
    const halfKey = slot.dayNumber + '-' + slot.halfDay
    const pool = availableSeniors(slot.id).filter((person) => {
      const held = takenHalfDays[person.id + '|' + halfKey]
      if (!held) return true
      // C5: the coordinator alone may hold two modalities on one centre.
      return person.coordinator && held.center === slot.center && held.modality !== slot.modality
    })
    if (pool.length === 0) { result[slot.id] = null; return }

    pool.sort((left, right) => {
      const leftScore = counts[left.id] - CARRY[left.id] * 0.6 - (availabilityOf(left.id, slot.id) === 'PREFERRED' ? 0.5 : 0)
      const rightScore = counts[right.id] - CARRY[right.id] * 0.6 - (availabilityOf(right.id, slot.id) === 'PREFERRED' ? 0.5 : 0)
      if (leftScore !== rightScore) return leftScore - rightScore
      const leftDouble = left.coordinator && takenHalfDays[left.id + '|' + halfKey] ? -1 : 0
      const rightDouble = right.coordinator && takenHalfDays[right.id + '|' + halfKey] ? -1 : 0
      if (leftDouble !== rightDouble) return leftDouble - rightDouble
      return left.id.localeCompare(right.id)
    })

    const chosen = pool[0]
    result[slot.id] = chosen.id
    counts[chosen.id] += 1
    takenHalfDays[chosen.id + '|' + halfKey] = { center: slot.center, modality: slot.modality }
  })

  return result
}

function solveFellows(seniorPlan) {
  const counts = {}
  FELLOWS.forEach((person) => { counts[person.id] = 0 })
  const withCoordinator = {}
  FELLOWS.forEach((person) => { withCoordinator[person.id] = 0 })
  const takenHalfDays = {}
  const result = {}

  /* F3, weight 100: the slots supervised by the coordinator are shared out
     first, so no fellow monopolises them. */
  const openSlots = SLOTS.filter((slot) => slot.fellowCapacity > 0)
  const ordered = openSlots
    .filter((slot) => seniorPlan[slot.id] === 'tp')
    .concat(openSlots.filter((slot) => seniorPlan[slot.id] !== 'tp'))

  ordered.forEach((slot) => {
    const halfKey = slot.dayNumber + '-' + slot.halfDay
    const pool = FELLOWS.filter(
      (person) => isFree(availabilityOf(person.id, slot.id)) && !takenHalfDays[person.id + '|' + halfKey]
    )
    if (pool.length === 0) { result[slot.id] = null; return }
    const coordinatorHere = seniorPlan[slot.id] === 'tp'
    pool.sort((left, right) => {
      if (coordinatorHere && withCoordinator[left.id] !== withCoordinator[right.id]) {
        return withCoordinator[left.id] - withCoordinator[right.id]
      }
      if (counts[left.id] !== counts[right.id]) return counts[left.id] - counts[right.id]
      return left.id.localeCompare(right.id)
    })
    const chosen = pool[0]
    result[slot.id] = chosen.id
    counts[chosen.id] += 1
    if (coordinatorHere) withCoordinator[chosen.id] += 1
    takenHalfDays[chosen.id + '|' + halfKey] = true
  })

  return result
}

function regenerate() {
  const keptLocks = {}
  Object.keys(S.locks).forEach((slotId) => {
    if (S.locks[slotId]) keptLocks[slotId] = S.assignments[slotId]
  })
  S.assignments = solveSeniors()
  Object.keys(keptLocks).forEach((slotId) => { S.assignments[slotId] = keptLocks[slotId] })
  S.fellowAssignments = solveFellows(S.assignments)
}

function seniorCounts() {
  const counts = {}
  SENIORS.forEach((person) => { counts[person.id] = 0 })
  Object.keys(S.assignments).forEach((slotId) => {
    const holder = S.assignments[slotId]
    if (holder) counts[holder] += 1
  })
  return counts
}

function fellowCounts() {
  const counts = {}
  FELLOWS.forEach((person) => {
    counts[person.id] = { total: 0, irm: 0, ct: 0, withCoordinator: 0, bySenior: {} }
  })
  Object.keys(S.fellowAssignments).forEach((slotId) => {
    const holder = S.fellowAssignments[slotId]
    if (!holder) return
    const slot = SLOTS.find((entry) => entry.id === slotId)
    const record = counts[holder]
    record.total += 1
    if (slot.modality === 'IRM') record.irm += 1
    else record.ct += 1
    const senior = S.assignments[slotId]
    if (senior) {
      record.bySenior[senior] = (record.bySenior[senior] || 0) + 1
      if (senior === 'tp') record.withCoordinator += 1
    }
  })
  return counts
}

function unfilledSlots() {
  return SLOTS.filter((slot) => !S.assignments[slot.id])
}

function doubleShifts() {
  const groups = {}
  SLOTS.forEach((slot) => {
    if (S.assignments[slot.id] !== 'tp') return
    const key = slot.dayNumber + '|' + slot.halfDay + '|' + slot.center
    groups[key] = (groups[key] || 0) + 1
  })
  return Object.keys(groups).filter((key) => groups[key] > 1).length
}

/** Half-days where a CMR and a CT coexist on one centre — the S1 opportunity. */
function doubleShiftOpportunities() {
  const groups = {}
  SLOTS.forEach((slot) => {
    const key = slot.dayNumber + '|' + slot.halfDay + '|' + slot.center
    if (!groups[key]) groups[key] = {}
    groups[key][slot.modality] = true
  })
  return Object.keys(groups).filter((key) => groups[key].IRM && groups[key].Scanner).length
}

function equityTarget() {
  return Math.round((SLOTS.length / SENIORS.filter((person) => person.id !== 'ml').length) * 10) / 10
}

function unfilledCause(slot) {
  const pool = availableSeniors(slot.id)
  if (pool.length === 0) return 'Aucune personne ne s’est déclarée disponible sur ce créneau.'
  const halfKey = slot.dayNumber + '-' + slot.halfDay
  const busy = pool.every((person) =>
    SLOTS.some(
      (other) =>
        other.id !== slot.id &&
        other.dayNumber + '-' + other.halfDay === halfKey &&
        S.assignments[other.id] === person.id
    )
  )
  if (busy) return 'Toutes les personnes disponibles sont déjà affectées ailleurs sur la même demi-journée.'
  return 'Toutes les personnes disponibles ont atteint leur plafond mensuel.'
}

const viewer = () => {
  if (S.role === 'COORDINATOR') return SENIORS[0]
  if (S.role === 'SENIOR') return SENIORS[1]
  return FELLOWS[0]
}

const slotLabel = (slot) =>
  CENTERS[slot.center].label + ' · ' + slot.modality + ' cardiaque'

const slotWhen = (slot) =>
  WEEKDAYS[slot.weekday] + ' ' + (slot.dayNumber === 1 ? '1er' : slot.dayNumber) + ' octobre, ' +
  (slot.halfDay === 'MORNING' ? 'matin' : 'après-midi')

const plural = (count, word) => count + ' ' + word + (count > 1 ? 's' : '')

regenerate()
