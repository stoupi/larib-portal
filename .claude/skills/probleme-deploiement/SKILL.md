---
name: probleme-deploiement
description: Diagnostiquer et réparer un déploiement Vercel qui échoue sur ce projet. Utiliser dès que le build de production casse, qu'un déploiement est en Error, que le site en ligne plante, ou que l'utilisateur dit "ça pète au build", "le déploiement a échoué", "Vercel plante", "le site est cassé", "erreur en prod", "build failed", "ça marche en local mais pas en prod", ou colle des logs de build Vercel.
---

# Déploiement cassé : diagnostic

Référence complète : `docs/DEPLOYMENT.md`. Cette skill est la procédure d'urgence.

L'utilisatrice ne lit pas les logs elle-même. **Va chercher l'erreur toi-même via
la CLI Vercel, ne demande jamais de copier-coller.** Termine toujours par une
explication en français simple de la cause.

## Étape 1 — Récupérer la vraie erreur

```bash
vercel whoami                      # doit renvoyer "stoupi"
vercel ls                          # trouver le déploiement en ● Error
vercel inspect <url> --logs | grep -iE 'error|failed|not found' | head -40
```

Si la CLI n'est pas authentifiée, demander de lancer `! vercel login` (interactif,
impossible à faire à sa place).

N'utilise **pas** les outils MCP Vercel : ce connecteur pointe vers le compte de
l'ancien développeur et ne voit pas ce projet.

Si l'erreur est un plantage du site **déjà déployé** (build vert), c'est du
runtime : `vercel logs <url>`.

## Étape 2 — Identifier la cause

Vérifie dans cet ordre, du plus fréquent au plus rare.

### `Module not found: Can't resolve '@/...'` → cause n°1

Un fichier source existe en local mais n'a jamais été commité. Le build local le
compile, Vercel clone GitHub et ne le trouve pas.

```bash
git status --short        # un "??" sur un fichier source = coupable
npm run check:untracked-sources
```

Correction : `git add <fichier>`, commit, `npm run verify:push`, push.

### Erreur TypeScript

Même diagnostic que ci-dessus : si le build local passait, le fichier fautif
n'était pas commité. Sinon, corriger le typage (jamais de `any` ni de `ts-ignore`).

### `prisma migrate deploy` échoue

Le `postinstall` applique les migrations sur la base de **production** pendant le
build. Lire l'erreur exacte, corriger le fichier de migration.

🚫 **Ne jamais lancer `prisma migrate reset`**, même si ça semble débloquer — c'est
interdit sur ce projet et ça détruirait la production. Si la base semble dans un
état intermédiaire, s'arrêter et le signaler clairement.

### Variable d'environnement manquante

À ajouter dans Vercel → Settings → Environment Variables (environnement
`Production`), puis **redéployer** — les variables ne s'appliquent pas
rétroactivement.

### Rien de tout ça

Lire les logs complets sans filtre : `vercel inspect <url> --logs | tail -60`.

## Étape 3 — Corriger et revalider

1. Corriger la **cause racine**, jamais le symptôme.
2. Ajouter un test si le bug pouvait être couvert.
3. `npm run verify:push` — doit passer entièrement.
4. Commit + `git push`.
5. Vérifier le résultat : `vercel ls` jusqu'à `● Ready`.

Interdits absolus :

- `git push --no-verify` pour contourner le hook
- Affaiblir, désactiver ou supprimer un test pour faire passer la validation
- Terminer la tâche tant que `.git/agent-push-validation-failed` existe

## Étape 4 — Expliquer

Dis en une ou deux phrases, sans jargon : ce qui a cassé, pourquoi, et ce qui a
été changé. Si la panne révèle un angle mort du pipeline, propose un garde-fou —
comme `check:untracked-sources` l'a été pour le cas n°1.
