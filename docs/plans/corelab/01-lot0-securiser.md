# Lot 0 — Sécuriser l'existant

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`.

**Objectif :** ne rien perdre du code CoreLab autonome, savoir s'il contient des données réelles, et versionner les maquettes dans le dépôt du portail.

**Durée :** une demi-journée. Aucun code applicatif.

---

### Tâche 0.1 : instantané du code CoreLab autonome

> **Déjà fait le 2 septembre 2026.** L'utilisateur ne veut pas travailler dans l'ancien dossier ; il n'est donc pas mis sous git. Un instantané `corelab-snapshot-2026-09-02.tgz` (7 Mo, sans `node_modules`, `.env`, `uploads`) est dans `/Users/solenntoupin/Documents/wildcoding/`. Vérifier seulement que le fichier existe.

---

### Tâche 0.2 : données réelles dans la base CoreLab autonome

> **Déjà fait le 2 septembre 2026.** Base Neon du projet autonome : 8 utilisateurs, 1 étude, 5 patients, **0 soumission, 0 signature**, 34 lignes d'audit de démonstration. Le portage repart de zéro ; aucune migration de données.

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

**Fini quand :** l'instantané existe, les maquettes et les plans sont sur `main`, le worktree `larib-portal-corelab` existe (voir `00-cadre.md` §2 bis). Tout est fait au 2 septembre 2026 : le lot 0 est clos.
