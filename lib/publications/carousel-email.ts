export const CAROUSEL_CC_RECIPIENTS = [
  'camille.gersdorff.com@gmail.com',
  'theo.pezelccf@gmail.com',
  'solenn.toupin@gmail.com',
  'brahim.melarbi@gmail.com',
] as const

export const CAROUSEL_REPLY_TO = 'camille.gersdorff.com@gmail.com'

export type CarouselAuthor = { firstName: string; lastName: string }

export type CarouselEmailDraftParams = {
  articleTitle: string
  journalName: string | null
  firstAuthor: CarouselAuthor & { email: string | null }
  lastAuthor: CarouselAuthor | null
}

export type CarouselEmailDraft = {
  to: string
  cc: readonly string[]
  subject: string
  body: string
}

function fullName(author: CarouselAuthor): string {
  return `${author.firstName} ${author.lastName.toUpperCase()}`.trim()
}

export function buildCarouselEmailDraft(params: CarouselEmailDraftParams): CarouselEmailDraft {
  const journalName = params.journalName ?? 'le journal'
  const seniorAuthorName = params.lastAuthor ? fullName(params.lastAuthor) : 'le dernier auteur'
  const body = `Bonjour ${fullName(params.firstAuthor)},

Toutes mes félicitations pour l'acceptation de ton article intitulé « ${params.articleTitle} » dans ${journalName} !

Afin de préparer un carrousel LinkedIn mettant en valeur tes travaux, je te serais reconnaissant(e) de bien vouloir me transmettre les éléments suivants :

- Le PDF ou le lien vers l'article accepté pour publication.
- Les logos à intégrer (journal, universités, centres partenaires, sociétés savantes, etc.) en haute définition, au format PNG de préférence.
- 4 à 6 messages clés que tu souhaites faire ressortir de l'article, formulés en une phrase maximum chacun. L'objectif est qu'un lecteur non spécialiste puisse saisir les principaux résultats en quelques secondes, sans avoir à lire l'article.
- Les figures, graphiques ou images à mettre en avant (en haute définition), en précisant pour chacune le message clé associé.
- Le cas échéant, les questions ouvertes, limites de l'étude ou pistes de réflexion que tu souhaiterais mentionner en fin de carrousel (2 phrases maximum).
- Les personnes ou structures à citer en plus des co-auteurs (financeurs, équipes de recherche, hôpitaux, partenaires, etc.).

N'hésite pas à me signaler tout ce qui te semblerait pertinent pour valoriser tes travaux auprès d'un public non spécialiste.

Pour t'inspirer, je te joins un exemple de post réalisé pour un ancien article que nous avons publié. Le post sera vérifié par le senior de l'étude — merci de confirmer s'il s'agit bien de ${seniorAuthorName} — avant d'être publié sur le compte LinkedIn du service de cardiologie ou de MIRACL.ai selon le contexte de l'étude.

Merci de me transmettre ces éléments d'ici une semaine afin de respecter le calendrier de publication.

Encore toutes mes félicitations, et merci pour ton aide !`

  return {
    to: params.firstAuthor.email ?? '',
    cc: CAROUSEL_CC_RECIPIENTS,
    subject: `Félicitations — ${params.articleTitle}`,
    body,
  }
}
