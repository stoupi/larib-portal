# La demande de liste d'auteurs a une durée de vie

## Le problème

Le bouton « Demander la liste d'auteurs » restait offert au premier auteur pendant toute
la vie d'une publication. Or la liste d'auteurs part chez l'éditeur avec la soumission :
une fois l'article soumis, la renégocier n'a plus de sens. Le bouton promettait une action
qui n'en était plus une.

## Le seuil retenu

La demande n'existe qu'**en préparation**. Dès la première soumission — statut en révision,
révisions demandées, à resoumettre, acceptée ou publiée — elle disparaît.

## Ce qui la remplace

Le vide ainsi créé serait pire que le mal : après soumission, le premier auteur n'aurait
plus aucun moyen de signaler qu'un co-auteur manque, puisque seule l'administration compose
la liste. Le signalement d'erreur du lot 4 prend donc le relais.

| Moment | Premier auteur | Co-auteur |
| --- | --- | --- |
| En préparation | Demander la liste d'auteurs | Signaler une erreur |
| Après soumission | Signaler une erreur | Signaler une erreur |

Un seul point d'entrée à la fois, jamais deux, jamais zéro.

## Les règles

Deux prédicats purs dans `lib/publications/editor-mode.ts`, l'un défini par rapport à l'autre :

```ts
canRequestAuthorList = espace personnel && premier auteur && statut EN_PRÉPARATION
canReportIssue       = espace personnel && signataire && !canRequestAuthorList
```

Cette dépendance est délibérée : elle rend l'exclusion mutuelle vraie par construction plutôt
que par coïncidence. Un statut ajouté plus tard à l'énumération bascule automatiquement du bon
côté sans qu'on ait à y penser.

L'espace admin ne voit ni l'un ni l'autre : il corrige la publication directement.

## Destinataires

Le signalement part au premier auteur, admins Publications en copie. Deux cas l'envoient aux
seuls admins : le premier auteur n'a pas d'adresse enregistrée, ou c'est lui qui signale —
personne ne s'écrit à soi-même. L'expéditeur en est informé dans le toast.

## Les emails

Les deux messages — demande de liste et signalement — partagent un gabarit HTML unique,
`lib/email/publication-request-template.ts`, aligné sur les emails d'invitation et de
récapitulatif : bandeau navy, logo, filet corail, bloc de citation du message, bouton menant
droit à la publication dans l'espace admin. Ils étaient tous deux en texte brut anglais, au
point que Gmail proposait de les traduire.

## Tests

- `lib/publications/editor-mode.test.ts` : les deux prédicats, statut par statut.
- `lib/publications/issue-recipients.test.ts` : les destinataires, y compris l'auto-envoi.
- `lib/email/publication-request-template.test.ts` : objets, échappement, lien, repli texte.
- `tests/e2e/publications-editor.spec.ts` : la bascule au moment de la soumission.
- `tests/e2e/publications-report-issue.spec.ts` : le parcours co-auteur jusqu'au panneau admin.
