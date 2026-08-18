export const CAROUSEL_CC_RECIPIENTS = [
  'camille.gersdorff.com@gmail.com',
  'theo.pezelccf@gmail.com',
  'solenn.toupin@gmail.com',
  'brahim.melarbi@gmail.com',
] as const

export const CAROUSEL_REPLY_TO = 'camille.gersdorff.com@gmail.com'

export const CAROUSEL_CONTACT_FIRST_NAME = 'Camille'

export const CAROUSEL_EMAIL_SUBJECT = '[Nouvelle publication] Préparation du post LinkedIn'

export const CAROUSEL_EMAIL_EYEBROW = 'Nouvelle publication'

export type CarouselAuthor = { firstName: string; lastName: string; isTeamMember: boolean }

export type CarouselEmailDraftParams = {
  articleTitle: string
  journalName: string | null
  firstAuthor: CarouselAuthor & { email: string | null }
  seniorAuthor: CarouselAuthor | null
}

export type CarouselEmailDraft = {
  to: string
  cc: readonly string[]
  subject: string
  body: string
}

function fullName(author: CarouselAuthor): string {
  return `${author.firstName} ${author.lastName}`.trim()
}

// The senior referent is the team member signing closest to the end of the author
// list; without any team member beyond the first author, the last signer is the
// best guess and the email asks the first author to confirm it anyway.
export function selectSeniorAuthor(authors: CarouselAuthor[]): CarouselAuthor | null {
  const coAuthors = authors.slice(1)
  const teamCoAuthors = coAuthors.filter((author) => author.isTeamMember)
  return teamCoAuthors.at(-1) ?? coAuthors.at(-1) ?? null
}

const REQUESTED_ITEMS = [
  'le PDF de l’article accepté ou le lien vers sa publication ;',
  'les éventuels logos à intégrer (journal, universités, centres partenaires, sociétés savantes, etc.), de préférence au format PNG et en haute définition ;',
  'quatre à six messages clés, formulés en une phrase maximum chacun et compréhensibles par un public non spécialiste ;',
  'les figures, graphiques ou images à mettre en avant, en précisant le message clé associé à chaque élément ;',
  'le cas échéant, les principales limites, questions ouvertes ou perspectives à mentionner en conclusion, en deux phrases maximum ;',
  'les personnes ou structures à citer en complément des coauteurs (financeurs, équipes de recherche, établissements, partenaires, etc.).',
]

export function buildCarouselEmailDraft(params: CarouselEmailDraftParams): CarouselEmailDraft {
  const contact = CAROUSEL_CONTACT_FIRST_NAME
  const congratulations = params.journalName
    ? `Félicitations pour l’acceptation de ton article « ${params.articleTitle} » dans ${params.journalName} !`
    : `Félicitations pour l’acceptation de ton article « ${params.articleTitle} » !`
  const seniorSentence = params.seniorAuthor
    ? `Avant sa mise en ligne, le contenu sera relu par le senior référent de l’article. Merci de confirmer qu’il s’agit bien de ${fullName(params.seniorAuthor)}.`
    : 'Avant sa mise en ligne, le contenu sera relu par le senior référent de l’article. Merci de nous confirmer de qui il s’agit.'

  const body = `Bonjour ${params.firstAuthor.firstName.trim()},

${congratulations}

Afin de préparer un carrousel LinkedIn présentant cette publication, merci de transmettre à ${contact}, en copie de ce message, les éléments suivants :

${REQUESTED_ITEMS.map((item) => `- ${item}`).join('\n')}

Tu peux également ajouter tout élément qui te semblerait utile pour valoriser cette publication.

${seniorSentence}

Le post sera ensuite publié sur le compte LinkedIn du service de cardiologie ou de MIRACL.ai, selon le contexte de l’étude.

Merci de transmettre ces éléments à ${contact} dans un délai de sept jours.

Encore félicitations pour cette publication !`

  return {
    to: params.firstAuthor.email ?? '',
    cc: CAROUSEL_CC_RECIPIENTS,
    subject: CAROUSEL_EMAIL_SUBJECT,
    body,
  }
}
