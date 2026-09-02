# Lot 0 — Sécuriser l'existant

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`.

**Objectif :** ne rien perdre du code CoreLab autonome, savoir s'il contient des données réelles, et versionner les maquettes dans le dépôt du portail.

**Durée :** une demi-journée. Aucun code applicatif.

---

### Tâche 0.1 : mettre le code CoreLab autonome sous git

**Fichiers :**
- Créer : `/Users/solenntoupin/Documents/wildcoding/corelab/.gitignore`

**Étape 1 : vérifier qu'il n'y a pas déjà de dépôt**

```bash
git -C /Users/solenntoupin/Documents/wildcoding/corelab rev-parse --is-inside-work-tree 2>&1
```
Attendu : `fatal: not a git repository`. Si un dépôt existe, passer à la tâche 0.2.

**Étape 2 : écrire le `.gitignore`**

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
uploads/
*.log
.DS_Store
```

**Étape 3 : initialiser et committer**

```bash
cd /Users/solenntoupin/Documents/wildcoding/corelab
git init -b main
git add .gitignore corelab-api corelab-ui docs data figma chatgpt.md
git status --short | grep -c "" 
git commit -m "chore: snapshot of the standalone CoreLab code before the port to larib-portal"
```
Vérifier avant le commit que `git status --short | grep "\.env$"` ne renvoie rien (les secrets ne doivent pas être stagés).

**Étape 4 : dépôt distant**

Demander à l'utilisateur de créer un dépôt privé GitHub `corelab-legacy` (ou le créer avec `gh repo create corelab-legacy --private --source=. --push` si `gh` est authentifié). Si `gh` n'est pas disponible, s'arrêter là et le signaler : le snapshot local suffit pour continuer.

---

### Tâche 0.2 : compter les données réelles dans la base CoreLab autonome

**Étape 1 : lire l'URL de la base**

```bash
grep DATABASE_URL /Users/solenntoupin/Documents/wildcoding/corelab/corelab-api/.env | cut -d= -f1
```
Ne jamais afficher la valeur complète dans la réponse.

**Étape 2 : compter**

```bash
cd /Users/solenntoupin/Documents/wildcoding/corelab/corelab-api
node -e "
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  for (const table of ['users','studies','patients','reading_submissions','signatures','audit_log']) {
    const rows = await sql('select count(*)::int as n from ' + table);
    console.log(table, rows[0].n);
  }
})();
"
```

**Étape 3 : conclure**

- `reading_submissions = 0` et `signatures = 0` → aucune donnée réelle, le portage repart de zéro. Écrire cette conclusion en mémoire (`corelab-portal-plan.md`, section « État de la base autonome »).
- Sinon, s'arrêter et le signaler à l'utilisateur avec les chiffres : une migration de données doit être décidée avant le lot 6.

---

### Tâche 0.3 : versionner les maquettes dans le portail

> **Déjà fait le 2 septembre 2026** (fichiers dans `docs/corelab/maquettes/`, commités avec les plans). Vérifier seulement que le dossier existe, puis passer à la tâche 0.4.

**Fichiers :**
- Créer : `docs/corelab/maquettes/` (copie de `/tmp/corelab-design/*.dc.html`, `parcours-corelab.html`, `canvas.json`, `logo.png`)
- Créer : `docs/corelab/maquettes/README.md`

**Étape 1 : copier**

```bash
cd /Users/solenntoupin/Documents/wildcoding/larib-portal
mkdir -p docs/corelab/maquettes
cp /tmp/corelab-design/*.dc.html /tmp/corelab-design/parcours-corelab.html /tmp/corelab-design/canvas.json /tmp/corelab-design/logo.png docs/corelab/maquettes/
du -sh docs/corelab/maquettes
```
Si `/tmp/corelab-design` n'existe plus, demander à l'utilisateur d'exporter le canvas (lien dans `corelab-crf-library-model.md` en mémoire) et passer cette tâche.

**Étape 2 : README**

```markdown
# Maquettes CoreLab

Artboards du canvas Claude Design (2 septembre 2026). `parcours-corelab.html` est le prototype cliquable ; ouvrir dans un navigateur.

| Écran | Fichier | Lot |
|---|---|---|
| Lecteur 2 Mes études | Studies.dc.html | 2 |
| Lecteur 2b, 3a Formation | TrainingLibrary, Training | 4 |
| Lecteur 3b–3e Calibration | Calibration, CalibrationCase, CalibrationFilled, CalibrationSign | 4 |
| Lecteur 4 Mes lectures | Main | 5 |
| Lecteur 5, 6 Lecture et signature | Reading, Signature | 6 |
| Lecteur 7a, 7b Retours | ReturnedReview, AdminReturn | 7, 6 |
| Admin 1, 2, 4b, 8 | AdminStudies, AdminConfig, AdminTeam, AdminUsers | 2 |
| Admin 3, 4 | AdminImport, AdminAssignment | 5 |
| Admin 5 | AdminCalibration | 4 |
| Admin 6 | AdminStats | 7 |
| Admin 9, 10 | AdminAudit, AdminExport | 8 |
| Admin 2b–2e, 7–7g | Crf*, Library* | 9 |

Écrans sans maquette (à produire avant le lot concerné, décision 6) : arbitrage du relecteur (lot 7), revue consolidée du PI (lot 4).
```

**Étape 3 : commit et push**

```bash
git add docs/corelab/maquettes
git commit -m "docs(corelab): version the design mockups and the lot plans"
git push
```
(Le hook lance typecheck + unitaires ; rien ne change côté code, il passe.)

---

### Tâche 0.4 : committer les plans

> **Déjà fait le 2 septembre 2026.** Rien à faire si `git log --oneline -1 -- docs/plans/corelab` renvoie un commit.

**Fini quand :** le snapshot CoreLab est commité localement (et poussé si possible), la question des données réelles est tranchée et écrite en mémoire, les maquettes et les plans sont sur `main`.
