# Maquettes — Planning des vacations d'imagerie cardiaque

Spécification de référence : `Cahier_des_charges_Planning_Imagerie_Cardiaque_CardioLarib.docx`
(hors dépôt). Deux livrables, produits depuis `_source/`.

## Prototype navigable

Un seul document, une sidebar, trois rôles, et un état partagé entre tous les
écrans : ce qu'un médecin déclare dans « Mes disponibilités » change ce que le
coordinateur voit dans le suivi, la revue et les compteurs.

```bash
node _source/proto/smoke.mjs        # rend chaque vue sous chaque rôle
node _source/proto/build-proto.mjs  # écrit prototype-planning-imagerie.html
```

Les retours laissés depuis le bouton « Signaler quelque chose » vont dans la
collection `feedback` du stockage de l'artifact, relisible avec l'outil
Artifact (`action: "read_db"`).

## Canvas d'artboards

17 écrans figés, éditables visuellement, dont les six variantes mobiles.

```bash
node _source/build.mjs   # écrit les *.dc.html
node _source/check.mjs   # exécute chaque renderVals() et traque les trous
```

Puis `seed-canvas.mjs` de la skill `design` assemble `canvas.json` et les
artboards en un document publiable.

## Ce qui est fictif

Seul le Dr Théo Pezel vient du cahier des charges. Les sept autres seniors et
les cinq fellows sont inventés, ainsi que toutes les dates, disponibilités et
affectations.
