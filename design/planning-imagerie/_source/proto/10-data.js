/* Domain model.

   Two months are live at once, and that is the whole point of the cycle
   (§5): a campaign targets month M and runs during M-1.

     TODAY  = 7 September 2026
     LIVE   = September 2026 — its plan is published, people work it now
     TARGET = October 2026   — the campaign now collecting availabilities

   So "Mon mois" and the counters read the LIVE month (RG-30: counters
   reflect the published version, never a proposal), while "Mes
   disponibilités" and every coordination screen work on the TARGET month. */

const TODAY = new Date(Date.UTC(2026, 8, 7))

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const LIVE = { id: 'sep', year: 2026, month: 8, label: 'Septembre 2026', lower: 'septembre 2026', short: 'septembre' }
const TARGET = { id: 'oct', year: 2026, month: 9, label: 'Octobre 2026', lower: 'octobre 2026', short: 'octobre' }

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

function buildSlots(period) {
  const built = []
  const days = new Date(Date.UTC(period.year, period.month + 1, 0)).getUTCDate()
  for (let dayNumber = 1; dayNumber <= days; dayNumber += 1) {
    const date = new Date(Date.UTC(period.year, period.month, dayNumber))
    const weekday = date.getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    ;(PATTERN[weekday] || []).forEach((entry, position) => {
      built.push({
        id: period.id + '-' + dayNumber + '-' + position,
        period: period.id,
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

const LIVE_SLOTS = buildSlots(LIVE)
const SLOTS = buildSlots(TARGET)

const weeksOf = (slots) =>
  slots.reduce((list, slot) => (list.indexOf(slot.week) === -1 ? list.concat(slot.week) : list), []).sort((left, right) => left - right)

const WEEKS = weeksOf(SLOTS)
const LIVE_WEEKS = weeksOf(LIVE_SLOTS)

/** The Blomet Tuesday-afternoon CT slots nobody volunteered for, in October. */
const ORPHANS = SLOTS.filter((slot) => slot.weekday === 2 && slot.halfDay === 'AFTERNOON' && slot.modality === 'Scanner').map(
  (slot) => slot.id
)

function seedAvailability(personId, slotId) {
  if (ORPHANS.indexOf(slotId) !== -1) return 'UNAVAILABLE'
  const person = SENIORS.concat(FELLOWS).find((entry) => entry.id === personId)
  /* September is behind us: everyone answered, so no NONE remains there. */
  const live = slotId.indexOf('sep-') === 0
  const draw = hash(personId + '|' + slotId) % 100
  if (person && person.id === 'ml' && !live) return 'UNAVAILABLE'
  if (person && person.id === 'cd' && !live) return draw < 9 ? 'AVAILABLE' : 'UNAVAILABLE'
  if (person && person.id === 'jv' && !live) return 'UNAVAILABLE'
  if (person && person.id === 'sr') return draw < 52 ? 'AVAILABLE' : draw < 58 ? 'PREFERRED' : 'UNAVAILABLE'
  if (draw < 34) return 'AVAILABLE'
  if (draw < 40) return 'PREFERRED'
  if (draw < 92 || live) return 'UNAVAILABLE'
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
  /** Which month "Mon mois" shows: 'sep' (live) or 'oct' (once published). */
  monthView: 'sep',
  /** availability[personId][slotId] = 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE' | 'NONE' */
  availability: {},
  submissions: Object.assign({}, SUBMISSION_SEED),
  /** The October proposal under review. September is frozen in PUBLISHED. */
  assignments: {},
  fellowAssignments: {},
  locks: {},
  week: 0,
  liveWeek: 0,
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

S.week = WEEKS[1] || WEEKS[0]
S.liveWeek = LIVE_WEEKS[1] || LIVE_WEEKS[0]

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

function declaredCount(personId, slots) {
  return (slots || SLOTS).filter((slot) => isFree(availabilityOf(personId, slot.id))).length
}

function doubleShiftGroups(slots) {
  const groups = {}
  slots.forEach((slot) => {
    const key = slot.dayNumber + '|' + slot.halfDay + '|' + slot.center
    if (!groups[key]) groups[key] = []
    groups[key].push(slot)
  })
  return Object.keys(groups)
    .filter((key) => groups[key].length === 2 && groups[key][0].modality !== groups[key][1].modality)
    .sort()
    .map((key) => groups[key])
}

/** Deterministic solve honouring C1: never assign outside a declaration. */
function solveSeniors(slots, locks) {
  const counts = {}
  SENIORS.forEach((person) => { counts[person.id] = 0 })
  const takenHalfDays = {}
  const result = {}
  const coordinator = SENIORS.find((person) => person.coordinator)
  const active = SENIORS.filter((person) => person.id !== 'ml')

  /* S1 first, weight 200: the coordinator covers a CMR and a CT on one centre,
     capped near their equity target so the exception stays an exception. */
  const doubleQuota = Math.max(1, Math.round(slots.length / active.length / 3))
  let formed = 0
  doubleShiftGroups(slots).forEach((pair) => {
    if (formed >= doubleQuota) return
    if (!pair.every((slot) => isFree(availabilityOf(coordinator.id, slot.id)))) return
    pair.forEach((slot) => {
      result[slot.id] = coordinator.id
      counts[coordinator.id] += 1
      takenHalfDays[coordinator.id + '|' + slot.dayNumber + '-' + slot.halfDay] = { center: slot.center, modality: slot.modality }
    })
    formed += 1
  })

  const ordered = slots.filter((slot) => result[slot.id] === undefined).sort((left, right) => {
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
      return left.id.localeCompare(right.id)
    })

    const chosen = pool[0]
    result[slot.id] = chosen.id
    counts[chosen.id] += 1
    takenHalfDays[chosen.id + '|' + halfKey] = { center: slot.center, modality: slot.modality }
  })

  if (locks) {
    Object.keys(locks).forEach((slotId) => {
      if (locks[slotId] !== undefined && locks[slotId] !== null) result[slotId] = locks[slotId]
    })
  }
  return result
}

function solveFellows(slots, seniorPlan) {
  const counts = {}
  const withCoordinator = {}
  FELLOWS.forEach((person) => { counts[person.id] = 0; withCoordinator[person.id] = 0 })
  const takenHalfDays = {}
  const result = {}

  /* F3, weight 100: share out the coordinator's slots first. */
  const open = slots.filter((slot) => slot.fellowCapacity > 0)
  const ordered = open
    .filter((slot) => seniorPlan[slot.id] === 'tp')
    .concat(open.filter((slot) => seniorPlan[slot.id] !== 'tp'))

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

/** September, solved once then frozen: it is a published plan (v2). */
const PUBLISHED = (function () {
  const seniors = solveSeniors(LIVE_SLOTS)
  return { seniors, fellows: solveFellows(LIVE_SLOTS, seniors), version: 2, publishedOn: '19 août' }
})()

function regenerate() {
  const keptLocks = {}
  Object.keys(S.locks).forEach((slotId) => {
    if (S.locks[slotId]) keptLocks[slotId] = S.assignments[slotId]
  })
  S.assignments = solveSeniors(SLOTS, keptLocks)
  S.fellowAssignments = solveFellows(SLOTS, S.assignments)
}

/** Everything a screen needs about one month, live or target. */
function planFor(periodId) {
  if (periodId === 'sep') {
    return {
      id: 'sep', period: LIVE, slots: LIVE_SLOTS, weeks: LIVE_WEEKS,
      seniors: PUBLISHED.seniors, fellows: PUBLISHED.fellows,
      published: true, version: PUBLISHED.version, publishedOn: PUBLISHED.publishedOn,
      week: S.liveWeek
    }
  }
  return {
    id: 'oct', period: TARGET, slots: SLOTS, weeks: WEEKS,
    seniors: S.assignments, fellows: S.fellowAssignments,
    published: S.published, version: S.planVersion,
    publishedOn: S.published ? '18 septembre' : null,
    week: S.week
  }
}

/** Months a doctor may open in "Mon mois": the live one always, the target
    one only once its plan has been published. */
function readableMonths() {
  const months = [{ id: 'sep', label: LIVE.label, note: 'mois en cours' }]
  if (S.published) months.push({ id: 'oct', label: TARGET.label, note: 'à venir' })
  return months
}

function seniorCounts(assignments, slots) {
  const plan = assignments || S.assignments
  const list = slots || SLOTS
  const counts = {}
  SENIORS.forEach((person) => { counts[person.id] = 0 })
  list.forEach((slot) => {
    const holder = plan[slot.id]
    if (holder) counts[holder] += 1
  })
  return counts
}

function unfilledSlots() {
  return SLOTS.filter((slot) => !S.assignments[slot.id])
}

function doubleShiftsIn(assignments, slots) {
  const groups = {}
  slots.forEach((slot) => {
    if (assignments[slot.id] !== 'tp') return
    const key = slot.dayNumber + '|' + slot.halfDay + '|' + slot.center
    groups[key] = (groups[key] || 0) + 1
  })
  return Object.keys(groups).filter((key) => groups[key] > 1).length
}

const doubleShifts = () => doubleShiftsIn(S.assignments, SLOTS)
const doubleShiftOpportunities = () => doubleShiftGroups(SLOTS).length

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

const viewer = function () {
  if (S.role === 'COORDINATOR') return SENIORS[0]
  if (S.role === 'SENIOR') return SENIORS[1]
  return FELLOWS[0]
}

const ordinal = (dayNumber) => (dayNumber === 1 ? '1er' : String(dayNumber))

const slotWhen = (slot) =>
  WEEKDAYS[slot.weekday] + ' ' + ordinal(slot.dayNumber) + ' ' + MONTH_NAMES[slot.date.getUTCMonth()] +
  ', ' + (slot.halfDay === 'MORNING' ? 'matin' : 'après-midi')

const plural = (count, word) => count + ' ' + word + (count > 1 ? 's' : '')

regenerate()
