# Vocabulaire des parties d'un CRF

Décidé le 2026-09-08. Ce vocabulaire vaut pour le CRF, la bibliothèque et
l'écran de lecture : un même objet porte le même nom partout.

| Terme | Définition | Contient |
|---|---|---|
| **Variable** | L'unité de saisie. Son identifiant devient une colonne à l'export. | — |
| **Jeu de valeurs** | La liste de valeurs partagée qu'une variable catégorielle utilise. | des valeurs |
| **Section** | Un groupe ordonné de variables. | des variables |
| **Partie** | Un groupe ordonné de sections. Le niveau 1 d'un CRF. | des sections |
| **Bloc** | Le mot de la bibliothèque pour ce qui est réutilisable et s'insère dans un CRF : une section **ou** une partie. Un rôle, pas un niveau. | — |
| **CRF** | L'ensemble des parties d'une étude, versionné et publié. | des parties |

## Ce que « séquence » devient

« Séquence » n'est plus un niveau de structure. C'est le *nom* qu'un data
manager donne à une partie dans un CRF d'IRM — Cine, LGE, T1 Mapping. En
échocardiographie la même place serait tenue par une vue, en scanner par une
acquisition. Nommer le niveau « partie » est ce qui rend le modèle valable
hors de l'IRM cardiaque.

## Ce qui reste interne

Les identifiants stockés gardent leur ancien nom : la colonne `sequenceId`
des valeurs de lecture, et la valeur `SEQUENCE` de l'enum
`CorelabLibraryBlockKind`. Ils ne sont jamais montrés à un utilisateur, et les
renommer imposerait une migration sur des lectures signées. Le vocabulaire
visible se règle dans les traductions.

## Règles d'écriture

- Une partie et une section se nomment, elles ne se numérotent pas.
- Au singulier dans une étiquette d'action : « Partie vide », « + Variable ».
- Le fil d'Ariane d'un CRF se lit `partie <id> › section <id>`.
- La bibliothèque annonce la nature d'un bloc avant son nom : « Partie · 5 sections ».
