type CentreRule = { match: RegExp; centre: string }

// Curated map for known hospital sites -> their canonical centre. The right-hand
// side must match a Centre.name already in the bank, otherwise the import creates
// a twin of a centre that already exists (see centre-extract.test.ts).
const CENTRE_RULES: CentreRule[] = [
  { match: /lariboisi[eè]re/i, centre: 'AP-HP - Lariboisière' },
  { match: /institut cardiovasculaire paris sud|\bICPS\b|jacques cartier|ramsay/i, centre: 'Institut Cardiovasculaire Paris Sud' },
  { match: /bichat/i, centre: 'AP-HP - Bichat' },
  { match: /piti[eé][- ]salp[eê]tri[eè]re/i, centre: 'AP-HP - Pitié-Salpêtrière' },
  { match: /pompidou|\bHEGP\b/i, centre: 'AP-HP - HEGP' },
  { match: /\bmondor\b/i, centre: 'AP-HP - Henri Mondor' },
  { match: /saint[- ]antoine/i, centre: 'AP-HP - Saint-Antoine' },
  { match: /cochin/i, centre: 'AP-HP - Cochin' },
  { match: /\bbic[eê]tre\b/i, centre: 'AP-HP - Hôpital Bicêtre' },
  { match: /\bnecker\b/i, centre: 'AP-HP - Hôpital Necker Enfants Malades' },
  { match: /rangueil/i, centre: 'CHU de Toulouse' },
  { match: /nouvel h[oô]pital civil|\bNHC\b/i, centre: 'CHU de Strasbourg' },
  { match: /haut[- ]l[eé]v[eê]que/i, centre: 'CHU de Bordeaux' },
  { match: /f[eé]lix[- ]guyon/i, centre: 'CHU de La Réunion' },
  { match: /duffaut|\bavignon\b/i, centre: "CH d'Avignon" },
  { match: /clinique[^,]{0,40}(?:ambroise|a\.?)[- ]?par[eé]/i, centre: 'Clinique Ambroise Paré' },
  { match: /\bindependent\b/i, centre: 'Independent' },
  { match: /montpied/i, centre: 'CHU de Clermont-Ferrand' },
  { match: /louis pradel/i, centre: 'CHU de Lyon' },
  { match: /\bAP[- ]?HM\b|h[oô]pitaux (?:universitaires )?de marseille/i, centre: 'CHU de Marseille' },
  { match: /annecy/i, centre: 'CH Annecy Genevois' },
  { match: /fr[eé]jus/i, centre: 'CH de Fréjus/Saint-Raphaël' },
  { match: /saint[- ]gatien/i, centre: 'Clinique Saint-Gatien' },
  { match: /institut catholique de lille|lille catholic institute/i, centre: 'GCS-Groupement des Hôpitaux de l\'Institut Catholique de Lille' },
  { match: /\bCHUV\b|lausanne university hospitals?|university hospitals? (?:of )?lausanne/i, centre: 'University Hospital Lausanne' },
  { match: /villa dei fiori/i, centre: 'Villa dei Fiori Hospital' },
  { match: /policlinico consorziale|policlinic.{0,20}bari/i, centre: 'CHU de Policlinic' },
  { match: /mayo clinic/i, centre: 'Mayo Clinic College of Medicine' },
  { match: /loyola university/i, centre: 'Loyola University of Chicago' },
]

// A hospital always wins over a university / INSERM / research unit / department.
const HOSPITAL_KW = /\b(hospital|h[oô]pital|h[oô]pitaux|CHU|CHRU|CHR|clinique|clinic|klinik|klinikum|infirmary|hospices civils|medical cent(?:er|re)|centre hospitalier|AP[- ]?HP|APHP)\b/i
const UNIVERSITY_KW = /\b(university|universit[eé]|universit[aä]t|college)\b/i

const TRAILING_COUNTRY =
  /[\s,]+(?:france|italy|italia|spain|espa[ñn]a|germany|deutschland|belgium|belgique|switzerland|suisse|united kingdom|england|scotland|uk|usa|united states|canada|netherlands|the netherlands|portugal|greece|israel|brazil|brasil|denmark|norway|sweden|finland|poland|austria|turkey|t[üu]rkiye|japan|china|india|australia|ireland|czech republic|hungary|romania|serbia|croatia|slovenia|russia|iran|mexico|argentina|colombia|chile)\.?$/i

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matches(pattern: RegExp, segment: string): boolean {
  return pattern.test(segment) || pattern.test(stripDiacritics(segment))
}

// Umbrella groups / generic labels are never a centre on their own — they must name a specific hospital.
const GENERIC_CENTRES = new Set([
  'aphp', 'universityhospital', 'universityhospitals', 'hospital', 'hopital',
  'university', 'chu', 'chru', 'chr', 'centrehospitalier', 'centrehospitalieruniversitaire',
  'centrehospitalouniversitaire', 'centrehospitalouniversitairechu',
  'medicalcenter', 'medicalcentre', 'rehabilitationcenter', 'rehabilitationcentre',
  'childrenshospital', 'chestdiseases', 'cardiovascularsciencesdepartment',
  'cardiologydivision', 'cardiology', 'cardiologue', 'cardiologist',
  'assistancepubliquehopitauxdeparis', 'assistancepubliquedeshopitauxdeparis',
  'assistancepubliquehopitaux', 'universityhospitalcenter', 'teachinghospital',
])
function isGenericCentre(segment: string): boolean {
  return GENERIC_CENTRES.has(stripDiacritics(segment).toLowerCase().replace(/[^a-z]/g, ''))
}

// An umbrella group ("AP-HP") or a bare label ("University Hospital") names no site,
// so it must never become a centre even when nothing more precise could be extracted.
export function isUmbrellaCentreName(name: string): boolean {
  return isGenericCentre(stripNoise(name))
}

// A department prefix is never the centre, even when the segment also names the hospital.
const DEPARTMENT_PREFIX = /^(?:the\s+)?(?:department|dept\.?|division|service|unit[eé]?)\b[^,]*?\b(?:of|de|des|du|d')\s+/i

// Specialty wording sits between the department and the site name once commas are gone:
// "Cardiovascular Medicine Rouen University Hospital" must yield Rouen, not the specialty.
const SPECIALTY_HEAD =
  /^(?:cardiology|cardiologie|cardiovascular|cardiovasculaire|radiology|radiologie|imaging|imagerie|internal|interne|thoracic|thoracique|vascular|vasculaire|surgery|surgical|chirurgie|medicine|m[eé]decine|electrophysiology|rythmologie|intensive|emergency|urgences|clinical|research|recherche)\b\s*/i

function trimSpecialtyHead(place: string): string {
  let trimmed = place.trim()
  while (SPECIALTY_HEAD.test(trimmed)) trimmed = trimmed.replace(SPECIALTY_HEAD, '').trim()
  return trimmed
}

function capitalisedRun(): string {
  return "[A-ZÀ-ÖØ-Þ][\\p{L}0-9'’.-]*(?:[ -](?:de|du|des|d'|la|le|les|of|the|and|et|von|van|dei|del|di)?[ -]?[A-ZÀ-ÖØ-Þ][\\p{L}0-9'’.-]*)*"
}

// "University Hospital of Dijon Dijon" -> one Dijon: sources repeat the city right after the site name.
function dropRepeatedTail(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  for (let size = Math.floor(words.length / 2); size >= 1; size -= 1) {
    for (let start = 0; start + size * 2 <= words.length; start += 1) {
      const head = words.slice(start, start + size).join(' ').toLowerCase()
      const tail = words.slice(start + size, start + size * 2).join(' ').toLowerCase()
      if (head === tail) return words.slice(0, start + size).concat(words.slice(start + size * 2)).join(' ').trim()
    }
  }
  return words.join(' ')
}

export function cleanCentreName(name: string): string {
  return stripNoise(name)
}

function stripNoise(segment: string): string {
  let cleaned = segment.trim().replace(/\.$/, '').replace(/[,;]+$/, '').trim()
  cleaned = cleaned.replace(TRAILING_COUNTRY, '').trim()
  cleaned = cleaned.replace(/[\s,]+\d{4,6}$/, '').trim()
  return dropRepeatedTail(cleaned)
}

function frenchOf(place: string): string {
  return /^[aeiouyàâéèêëîïôöûüh]/i.test(place) ? `d'${place}` : `de ${place}`
}

type Extractor = { pattern: RegExp; build: (place: string) => string }

// Ordered from the most specific wording to the loosest: the first hit wins.
function hospitalExtractors(): Extractor[] {
  const place = capitalisedRun()
  return [
    { pattern: new RegExp(`centre hospitalier r[eé]gional universitaire (?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CHRU ${frenchOf(value)}` },
    { pattern: new RegExp(`centre hospitalier universitaire (?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CHU ${frenchOf(value)}` },
    { pattern: new RegExp(`centre hospitalier (?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CH ${frenchOf(value)}` },
    { pattern: new RegExp(`\\bCHRU\\s+(?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CHRU ${frenchOf(value)}` },
    { pattern: new RegExp(`\\bCHU\\s+(?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CHU ${frenchOf(value)}` },
    { pattern: new RegExp(`\\bCHR\\s+(?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `CHR ${frenchOf(value)}` },
    { pattern: new RegExp(`university hospitals?\\s+(?:of |de |du |des |d')(${place})`, 'iu'), build: (value) => `CHU ${frenchOf(value)}` },
    { pattern: new RegExp(`(${place})\\s+university hospitals?\\b`, 'iu'), build: (value) => `CHU ${frenchOf(value)}` },
    { pattern: new RegExp(`university hospitals?\\s+(${place})`, 'iu'), build: (value) => `CHU ${frenchOf(value)}` },
    { pattern: new RegExp(`h[oô]pital\\s+(?:universitaire\\s+)?(?:de |du |des |d')?(${place})`, 'iu'), build: (value) => `Hôpital ${value}` },
    { pattern: new RegExp(`(${place})\\s+hospital\\b`, 'iu'), build: (value) => `${value} Hospital` },
    { pattern: new RegExp(`hospital\\s+(${place})`, 'iu'), build: (value) => `${value} Hospital` },
  ]
}

function extractHospitalName(segment: string): string | null {
  const cleaned = stripNoise(segment).replace(DEPARTMENT_PREFIX, '').trim()
  if (!cleaned) return null
  for (const extractor of hospitalExtractors()) {
    const found = cleaned.match(extractor.pattern) ?? stripDiacritics(cleaned).match(extractor.pattern)
    if (!found?.[1]) continue
    const place = trimSpecialtyHead(dropRepeatedTail(found[1]))
    if (place && !isGenericCentre(place)) return extractor.build(place)
  }
  return isGenericCentre(cleaned) ? null : cleaned
}

// English/French equivalences -> canonical French form.
function normalizeCentreName(name: string): string {
  const uniOf = name.match(/^university hospitals? of (.+)$/i)
  if (uniOf) return `CHU ${frenchOf(uniOf[1].trim())}`
  const uniSuffix = name.match(/^(.+?) university hospitals?$/i)
  if (uniSuffix) return `CHU ${frenchOf(uniSuffix[1].trim())}`
  const chuBare = name.match(/^chu\s+(?!de\b|d')(.+)$/i)
  if (chuBare) return `CHU ${frenchOf(chuBare[1].trim())}`
  const chruRegional = name.match(/^centre hospitalier r[eé]gional universitaire (?:de |d'|du |des )?(.+)$/i)
  if (chruRegional) return `CHRU ${frenchOf(chruRegional[1].trim())}`
  const chruBare = name.match(/^chru\s+(?!de\b|d')(.+)$/i)
  if (chruBare) return `CHRU ${frenchOf(chruBare[1].trim())}`
  const chu = name.match(/^centre hospitalier universitaire (?:de |d'|du |des )?(.+)$/i)
  if (chu) return `CHU ${frenchOf(chu[1].trim())}`
  const ch = name.match(/^centre hospitalier (.+)$/i)
  if (ch) return `CH ${ch[1].trim()}`
  return name
}

export function guessCentre(rawAffiliation: string): string | null {
  const raw = rawAffiliation.trim()
  if (!raw) return null

  // 1. Curated rules (highest priority).
  for (const rule of CENTRE_RULES) {
    if (rule.match.test(raw) || rule.match.test(stripDiacritics(raw))) return rule.centre
  }

  const segments = raw.split(',').map((segment) => segment.trim()).filter(Boolean)

  // 2. Prefer a specific hospital segment (never a bare umbrella / generic label).
  const hospitalSegment = segments.find((segment) => matches(HOSPITAL_KW, segment) && !isGenericCentre(stripNoise(segment)))
  if (hospitalSegment) {
    const extracted = extractHospitalName(hospitalSegment)
    if (extracted) return normalizeCentreName(extracted)
  }

  // 3. Otherwise a (specific) university.
  const university = segments.find((segment) => matches(UNIVERSITY_KW, segment) && !isGenericCentre(stripNoise(segment)))
  if (university) {
    const cleaned = stripNoise(university).replace(DEPARTMENT_PREFIX, '').trim()
    if (cleaned && !isGenericCentre(cleaned)) return normalizeCentreName(cleaned)
  }

  // 4. No hospital/university identified -> no centre (a bare department is not a centre).
  return null
}

const KEY_STOPWORDS = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'of', 'the', 'a', 'at', 'and', 'et', 'regional', 'universitaire', 'regionale'])
const HOSPITAL_GROUP_TOKENS = new Set(['ch', 'chu', 'chr', 'chru', 'chuv'])

// Comparison key used to decide whether two centre names are the same site.
// "CHU Dijon", "CHU de Dijon" and "Chu De DIJON" all collapse to "chx dijon".
export function normalizeCentreKey(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length > 0 && !KEY_STOPWORDS.has(token))
    .map((token) => (HOSPITAL_GROUP_TOKENS.has(token) ? 'chx' : token))
    .join(' ')
}
