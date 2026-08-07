# Déploiement & diagnostic de build

Tout ce qu'il faut savoir quand un déploiement échoue. Si tu ne sais pas par où
commencer, demande à Claude d'utiliser la skill `probleme-deploiement`.

## Où vit la production

| Élément | Valeur |
|---|---|
| Compte Vercel | `stoupis-projects` (utilisateur `stoupi`) |
| Projet Vercel | `larib-portal` |
| URL technique | `larib-portal-psi.vercel.app` |
| Domaine public | `www.cardiolarib-portal.com` |
| Apex | `cardiolarib-portal.com` → redirection 308 vers `www` |
| DNS | AWS Route 53, zone `cardiolarib-portal.com` |
| Base de données | Neon PostgreSQL, base `prod` (région `eu-central-1`) |
| Repo GitHub | `stoupi/larib-portal`, branche `main` |

Chaque push sur `main` déclenche un déploiement de production automatique.

### Enregistrements DNS (Route 53)

Ne pas y toucher sans raison — la configuration est valide.

| Nom | Type | Valeur |
|---|---|---|
| `cardiolarib-portal.com` | A | `216.198.79.1` (IP apex Vercel) |
| `www.cardiolarib-portal.com` | CNAME | `3748a2544d537b4a.vercel-dns-017.com` |

## Le pipeline, étape par étape

```
git push
   │
   ├─ 1. hook pre-push (.githooks/pre-push) → npm run verify:push
   │        a. check:untracked-sources   ← garde-fou, échoue en ~2 s
   │        b. test:unit                 ← vitest
   │        c. build                     ← next build local
   │        d. test:push                 ← 69 tests Playwright
   │      ✗ échec → push bloqué, marqueur .git/agent-push-validation-failed
   │
   ├─ 2. GitHub reçoit le commit
   │
   └─ 3. Vercel clone, puis :
            a. npm install
            b. postinstall → prisma migrate deploy && prisma generate
            c. npm run build
            d. déploiement
```

⚠️ **Le `postinstall` applique les migrations Prisma sur la base de production
pendant le build.** Une migration cassée échoue le build *et* peut laisser la base
dans un état intermédiaire. Ne jamais improviser une migration juste avant un push.

## Pourquoi un build local vert peut quand même casser en prod

C'est le piège principal, et il a réellement cassé la prod le 2026-08-07.

`next build` compile **les fichiers présents sur ton disque**. Vercel, lui, clone
**depuis GitHub**. Un fichier créé localement mais jamais `git add` :

- existe sur ton disque → le build local passe ✅
- n'existe pas sur GitHub → le build Vercel échoue ❌

L'erreur ressemble à ça :

```
Module not found: Can't resolve '@/lib/services/publications/duplicates'
```

Aucun build local ne peut détecter ce cas, par construction.

**Le garde-fou.** `npm run check:untracked-sources` (premier maillon de
`verify:push`) bloque le push si un fichier source non commité traîne dans
`actions/ app/ components/ lib/ messages/ prisma/ scripts/ types/`.

Logique dans `lib/git/untracked-sources.ts`, testée dans le fichier `.test.ts`
voisin, exécutée par `scripts/check-untracked-sources.ts`.

Si le push est bloqué avec la liste des fichiers : soit tu les commites
(`git add <fichier>`), soit tu les supprimes si c'était du brouillon.

## Diagnostiquer un build raté

La CLI Vercel est authentifiée en tant que `stoupi` et le repo est lié au projet
(`.vercel/project.json`, gitignoré). Claude peut lancer ces commandes directement,
sans que tu aies à copier-coller quoi que ce soit.

```bash
vercel ls                          # état des derniers déploiements
vercel inspect <url> --logs        # logs de build complets d'un déploiement
vercel inspect <url> --logs | grep -iE 'error|failed'
vercel logs <url>                  # erreurs runtime (app déployée qui plante)
```

`<url>` est l'URL complète affichée par `vercel ls`, par exemple
`https://larib-portal-c1hkv6ipf-stoupis-projects.vercel.app`.

> ⚠️ Le connecteur Vercel de claude.ai (outils MCP) pointe vers le compte de
> l'ancien développeur et **ne voit pas ce projet**. Toujours passer par la CLI.

Si `vercel whoami` ne renvoie pas `stoupi`, relancer `vercel login`.

## Catalogue des pannes courantes

### `Module not found: Can't resolve '@/...'`

Fichier non commité (voir plus haut) — ou faux chemin d'import.

```bash
git status --short          # un ?? sur un fichier source = coupable
```

### `Type error:` / erreur TypeScript

Le build local aurait dû l'attraper. Si ce n'est pas le cas, c'est que le fichier
fautif n'était pas commité non plus. Même diagnostic.

### `prisma migrate deploy` échoue

Une migration ne s'applique pas sur la base de prod. Ne **jamais** faire
`prisma migrate reset` — c'est interdit sur ce projet et ça détruirait la prod.
Lire l'erreur exacte dans les logs de build, corriger le fichier de migration, et
demander de l'aide si la base est dans un état intermédiaire.

### Variable d'environnement manquante

Erreur au build ou au runtime mentionnant une clé absente. Les variables se
configurent dans Vercel → Settings → Environment Variables, environnement
`Production`. Après ajout, il faut **redéployer** pour qu'elles soient prises en
compte.

### Le build passe mais le site affiche une erreur

C'est du runtime, pas du build. Utiliser `vercel logs <url>`, pas
`vercel inspect --logs`.

### Domaine « Verification Required » dans Vercel

Ajouter l'enregistrement TXT `_vercel` demandé dans Route 53, avec **un seul**
record set contenant toutes les valeurs (une par ligne, guillemets compris).
Créer deux enregistrements séparés du même nom est refusé par Route 53.

Vérifier la propagation avec `dig +short _vercel.cardiolarib-portal.com TXT`,
puis cliquer « Refresh » dans Vercel.

## Historique

**2026-08-07 — reprise du projet.** Le repo GitHub a été transféré de
`monkeycs60/larib-portal` à `stoupi/larib-portal`, et un nouveau projet Vercel a
été créé sous le compte `stoupis-projects`. Les domaines ont été revérifiés par
enregistrement TXT ; les enregistrements A et CNAME de Route 53 n'ont pas bougé.

Le premier build sous le nouveau compte a échoué sur le fichier
`lib/services/publications/duplicates.ts`, jamais commité — d'où le garde-fou
ajouté depuis.

L'ancien projet Vercel a été supprimé par l'ancien développeur le 2026-08-08 ; il
redéployait le même repo en parallèle sur la même base de production.
