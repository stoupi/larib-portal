# Récupération automatique des PDF en accès libre

**Date :** 2026-08-11
**Statut :** design validé

## Problème

Le PDF d'un article n'arrive dans l'app que si quelqu'un le téléverse à la main.
Or beaucoup d'articles du labo sont en accès libre : leur PDF est déjà public,
et son URL est calculable à partir du DOI ou du PMID qu'on stocke déjà.

## Objectif

Sur une publication acceptée ou publiée, un bouton « Chercher le PDF en ligne »
qui va récupérer le PDF en accès libre, le dépose sur R2 et l'attache à
l'article — exactement comme un téléversement manuel, sans le téléversement.

## Périmètre

- Déclenchement **manuel** uniquement (bouton). Pas d'automatisme à la saisie,
  pas de cron. Un cron de rattrapage pourra s'ajouter plus tard sans rien casser :
  la logique vit dans un service appelable ailleurs.
- Bouton visible sur les statuts `ACCEPTED` et `PUBLISHED` uniquement.
- Aucun écrasement : si un PDF est déjà attaché, le bouton n'apparaît pas.
- Échec = simple message. Pas de liste de liens candidats, pas de repli manuel guidé.

## Sources

Deux sources gratuites, essayées dans l'ordre, arrêt à la première qui donne
un vrai PDF.

### 1. PubMed → PMC → Europe PMC

À partir du `pubmedId` déjà stocké. PubMed n'héberge pas de PDF : c'est un index.
Les PDF vivent dans PubMed Central (PMC), qui ne contient que ce que l'éditeur ou
l'auteur a autorisé à déposer.

- PMID → PMCID : `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids={pmid}&format=json`
  Réponse : `records[0].pmcid`, ou `records[0].status === 'error'` si l'article
  n'est pas dans PMC.
- PDF : `https://europepmc.org/articles/{PMCID}?pdf=render`

**Chemins vérifiés en direct le 2026-08-11.** Deux pistes ont été écartées parce
qu'elles ne marchent pas :

- `elink.fcgi?dbfrom=pubmed&db=pmc` renvoie par intermittence une exception interne
  NCBI au lieu du lien. L'API idconv, elle, répond de façon stable et donne en prime
  le DOI. C'est aussi l'outil que NCBI documente pour cette conversion précise.
- `europepmc.org/webservices/rest/{PMCID}/fullTextPDF` renvoie 404 : cet endpoint
  n'existe pas, contrairement à son équivalent `fullTextXML`. L'URL `?pdf=render`
  a été testée et renvoie bien un PDF (200, `application/pdf`, en-tête `%PDF`).

On passe par Europe PMC plutôt que par NCBI pour le téléchargement : NCBI ne publie
pas d'URL de PDF stable et bloque les téléchargements automatisés sur ses pages PMC.
Europe PMC autorise cet accès, sur le même contenu.

L'API idconv accepte des paramètres de courtoisie `tool` et `email` — on les
renseigne, sinon elle répond avec un avertissement.

### 2. Unpaywall

À partir du `doi`. `https://api.unpaywall.org/v2/{doi}?email={OPEN_ACCESS_CONTACT_EMAIL}`
renvoie, quand elle existe, l'URL du PDF en accès libre — version éditeur ou
version déposée en archive (HAL, PMC, dépôts institutionnels). Gratuit, sans clé.

L'adresse de contact doit être **réelle** : testée avec `test@example.com`, l'API
répond `422 "Please use your own email address in API calls"`. La réponse n'a donc
pas pu être vérifiée en direct pendant le design — l'implémentation lit
`best_oa_location.url_for_pdf` et, à défaut, la première entrée de `oa_locations`
qui porte un `url_for_pdf`, et le premier appel réel servira de vérification.

Si `OPEN_ACCESS_CONTACT_EMAIL` n'est pas définie, on saute cette source au lieu de
planter. Un corps de réponse `{ error: true }` est traité comme « source
indisponible », pas comme une erreur fatale.

### Ce qu'on ne fait pas

Aucun contournement de paywall, aucun scraping d'éditeur, aucun miroir pirate.
On ne récupère que ce que l'éditeur ou l'auteur a lui-même rendu public.
Conséquence assumée : la fonctionnalité ne marchera pas sur tout — une bonne
partie des revues de cardiologie restent fermées.

## Architecture

### Service — `lib/services/publications/open-access-pdf.ts`

Une seule fonction publique :

```ts
findOpenAccessPdf({ doi, pubmedId }): Promise<OpenAccessPdf | null>
// OpenAccessPdf = { url: string; source: 'europepmc' | 'unpaywall' }
```

Elle enchaîne les sources, ignore celle qui échoue, renvoie `null` si aucune ne
donne rien. Délai maximum de 10 s par appel réseau.

Un module pur `lib/publications/open-access-pdf.ts` porte la logique testable
sans réseau : construction des URLs, lecture des réponses Unpaywall et Europe PMC,
et `looksLikePdf(contentType, firstBytes)`.

Comme `pubmed.ts`, le service lit `OPEN_ACCESS_FIXTURE_DIR` : si la variable est
définie, il résout depuis des fichiers locaux au lieu du réseau. C'est ce qui rend
le parcours E2E déterministe.

### Route — `app/api/publications/fetch-open-access-pdf/route.ts`

Décalquée de `app/api/uploads/publication-pdf/route.ts` : mêmes contrôles d'accès
(session, `canAccessApp(user,'PUBLICATIONS')`, puis `canAdminApp` ou
`userIsFirstAuthor`), même limite de 30 Mo, même forme de clé R2
(`publications/{articleId}/{timestamp}-{nom}`).

Elle reçoit un `articleId`, relit l'article en base pour prendre `doi`, `pubmedId`
et `status` — jamais les valeurs envoyées par le client —, refuse si le statut
n'est ni `ACCEPTED` ni `PUBLISHED`, cherche l'URL, télécharge, vérifie, envoie sur
R2 et renvoie `{ url, key }`. Elle n'écrit rien en base.

**Pourquoi une route et pas une server action :** les server actions passent mal
les fichiers volumineux, et l'upload PDF existant est déjà une route pour cette
raison. On reste cohérent.

### Écriture en base

Aucun code neuf : le client appelle `saveArticlePdfAction` avec le `{url, key}`
renvoyé, exactement comme après un téléversement manuel.

### Interface — `app/[locale]/publications/components/editor/editor-pdf.tsx`

Un bouton « Chercher le PDF en ligne » dans la carte PDF, affiché si :
statut `ACCEPTED` ou `PUBLISHED`, **et** un `doi` ou un `pubmedId` présent,
**et** aucun PDF déjà attaché, **et** carte éditable.

Le composant passe de 3 à 6 props → dépassement de la limite du projet.
Il prendra donc `{ article: { id, pdfUrl, doi, pubmedId, status }, editable }`.

Toasts traduits FR/EN : succès, « aucun PDF en accès libre trouvé », erreur.
Bouton désactivé pendant la recherche.

## Cas d'erreur

| Cas | Réponse |
|---|---|
| Une source lente ou en panne | Délai de 10 s, on passe à la suivante |
| Les deux sources échouent | Message « aucun PDF trouvé » — l'utilisateur n'a pas d'action différente à mener |
| L'URL renvoie du HTML (page de connexion, redirection éditeur) | Contrôle `application/pdf` + octets `%PDF` en tête ; on rejette et on tente la source suivante |
| Fichier > 30 Mo | Rejet, même limite que le téléversement manuel |
| Double clic | Bouton désactivé pendant la recherche |
| PDF déjà attaché | Bouton absent, on n'écrase jamais |
| Statut non éligible | Bouton absent, et route qui refuse |

## Tests

**Unitaires** (`lib/publications/open-access-pdf.test.ts`) sur le module pur :
lecture d'une réponse Unpaywall avec et sans PDF, extraction du PMCID d'une
réponse elink vide ou remplie, construction de l'URL Europe PMC, et
`looksLikePdf` sur un vrai en-tête PDF, sur du HTML, sur un corps vide.

**Service** (`lib/services/publications/open-access-pdf.test.ts`) avec `fetch`
simulé : PMID trouvé dans PMC, PMID absent mais DOI trouvé chez Unpaywall,
aucune source ne donne rien, source qui échoue en réseau,
`OPEN_ACCESS_CONTACT_EMAIL` absente.

**E2E** (`tests/e2e/publications-open-access-pdf.spec.ts`), un seul parcours,
les deux langues : ouvrir une publication publiée sans PDF, voir le bouton,
cliquer, voir le PDF attaché ; puis vérifier que le bouton disparaît une fois
le PDF présent et qu'il est absent sur un article en préparation.
Réseau neutralisé par `OPEN_ACCESS_FIXTURE_DIR`, câblé dans `playwright.config.ts`
à côté de `PUBMED_FIXTURE_DIR`.

## Variables d'environnement

- `OPEN_ACCESS_CONTACT_EMAIL` — adresse de contact réelle, exigée par Unpaywall et
  demandée par l'API idconv de NCBI. À définir en local et sur Vercel. Absente :
  Unpaywall est sauté, PMC continue de fonctionner.
- `OPEN_ACCESS_FIXTURE_DIR` — tests uniquement.

## Hors périmètre

- Cron de rattrapage sur les publications restées sans PDF.
- Récupération automatique à la saisie du DOI.
- Affichage de liens candidats non-OA en cas d'échec.
