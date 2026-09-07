/* Coordinator views. Every button that leads somewhere carries data-nav. */

const VIEWS = {}

const CAMPAIGN_STEPS = [
  { label: 'Chargement', deadline: 'avant le 3', nav: 'vacations' },
  { label: 'Recueil seniors', deadline: 'du 5 au 15', nav: 'suivi' },
  { label: 'Planning seniors', deadline: 'du 16 au 18', nav: 'revue' },
  { label: 'Recueil fellows', deadline: 'du 18 au 24', nav: 'suivi' },
  { label: 'Planning fellows', deadline: 'du 25 au 27', nav: 'revue' },
  { label: 'Échanges, clôture', deadline: 'fin du mois', nav: 'echanges' }
]

function stepper(activeIndex, compact) {
  return `<div style="display:flex;align-items:flex-start;gap:0">
    ${CAMPAIGN_STEPS.map((step, position) => {
      const number = position + 1
      const done = number < activeIndex
      const current = number === activeIndex
      const dotBg = current ? T.coral500 : done ? T.navy600 : T.surface
      const dotBorder = current ? T.coral500 : done ? T.navy600 : T.line
      const dotFg = current || done ? '#fff' : T.gray400
      const leftLine = position === 0 ? 'transparent' : number <= activeIndex ? T.navy600 : T.line
      const rightLine = position === CAMPAIGN_STEPS.length - 1 ? 'transparent' : number < activeIndex ? T.navy600 : T.line
      return `<div data-nav="${step.nav}" style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;cursor:pointer">
        <div style="display:flex;align-items:center;gap:0">
          <span style="height:2px;flex:1;background:${leftLine}"></span>
          <span style="display:flex;align-items:center;justify-content:center;width:${compact ? 22 : 26}px;height:${compact ? 22 : 26}px;flex-shrink:0;border-radius:999px;border:2px solid ${dotBorder};background:${dotBg};color:${dotFg};font-size:${compact ? 10 : 11}px;font-weight:700">${number}</span>
          <span style="height:2px;flex:1;background:${rightLine}"></span>
        </div>
        <div style="padding:0 6px;text-align:center">
          <p style="margin:0;font-size:${compact ? 9 : 12}px;font-weight:600;color:${current ? T.text : done ? T.gray600 : T.gray400};line-height:1.3">${step.label}</p>
          ${compact ? '' : `<p style="margin:2px 0 0;font-size:11px;color:${T.text3}">${step.deadline}</p>`}
        </div>
      </div>`
    }).join('')}
  </div>`
}

VIEWS.campagnes = () => {
  const counts = seniorCounts()
  const unfilled = unfilledSlots()
  const submitted = SENIORS.filter((person) => S.submissions[person.id] === 'SUBMITTED').length
  const target = equityTarget()
  const spread =
    Math.max.apply(null, SENIORS.map((person) => counts[person.id])) -
    Math.min.apply(null, SENIORS.filter((person) => person.id !== 'ml').map((person) => counts[person.id]))

  const rows = [
    {
      id: 'oct-2026', month: 'Octobre 2026', tone: S.published ? 'success' : 'warning',
      status: S.published ? 'Planning senior publié' : 'Recueil seniors ouvert',
      seniorDone: submitted, seniorTotal: SENIORS.length,
      fellowDone: S.published ? 0 : 0, fellowTotal: FELLOWS.length,
      slots: SLOTS.length
    },
    { id: 'sep-2026', month: 'Septembre 2026', tone: 'success', status: 'Publié, échanges ouverts', seniorDone: 8, seniorTotal: 8, fellowDone: 5, fellowTotal: 5, slots: 44 },
    { id: 'nov-2026', month: 'Novembre 2026', tone: 'neutral', status: 'Brouillon', seniorDone: 0, seniorTotal: 8, fellowDone: 0, fellowTotal: 5, slots: 0 },
    { id: 'aou-2026', month: 'Août 2026', tone: 'neutral', status: 'Clôturée', seniorDone: 8, seniorTotal: 8, fellowDone: 4, fellowTotal: 5, slots: 38 }
  ]

  const stats = [
    statTile(SLOTS.length, 'vacations chargées'),
    statTile(SLOTS.reduce((total, slot) => total + slot.seniorCapacity, 0), 'places senior à pourvoir'),
    statTile(String(target).replace('.', ','), 'vacations par senior en moyenne'),
    statTile(ORPHANS.length, 'créneaux sans volontaire', T.dangerText)
  ]

  const pending = SENIORS.filter((person) => S.submissions[person.id] === 'IN_PROGRESS' || S.submissions[person.id] === 'NOT_STARTED')

  const alerts = []
  if (pending.length) {
    alerts.push(noteBox('warning', plural(pending.length, 'senior') + ' sans réponse validée',
      pending.map((person) => person.name).join(' et ') + ' — dernière relance le 10 septembre.'))
  }
  if (unfilled.length) {
    alerts.push(noteBox('danger', plural(unfilled.length, 'place') + ' non pourvue' + (unfilled.length > 1 ? 's' : ''),
      'Bloquant à la publication, sauf acquittement motivé (RG-26).'))
  }
  alerts.push(noteBox(S.published ? 'success' : 'info',
    S.published ? 'Recueil des fellows ouvert' : 'Recueil des fellows non ouvert',
    S.published
      ? 'Ouvert automatiquement à la publication du planning senior. 5 liens personnels envoyés.'
      : 'Il s’ouvrira à la publication du planning senior (RG-06).', 'info'))

  const journal = [
    { dot: T.coral500, text: 'Relance automatique envoyée à ' + plural(pending.length, 'senior'), when: 'Aujourd’hui, 08:00' },
    { dot: T.navy600, text: 'S. Rousseau a validé ses disponibilités', when: 'Hier, 21:14' },
    { dot: T.navy600, text: 'Recueil des seniors ouvert, 8 liens personnels envoyés', when: '5 septembre, 07:00' },
    { dot: T.gray400, text: SLOTS.length + ' vacations importées depuis vacations-octobre.csv', when: '2 septembre, 17:32' }
  ]

  return `
    ${pageHeader(
      'Planning d’imagerie cardiaque',
      'Campagnes mensuelles de vacations IRM et scanner — Bergère, Blomet, Lariboisière',
      button({ label: 'Paramètres', variant: 'outline', icon: 'settings', nav: 'parametres' }) +
      button({ label: 'Nouvelle campagne', variant: 'primary', icon: 'plus', act: 'toast', arg: 'La création de campagne n’est pas maquettée ici.' })
    )}

    <div style="display:flex;gap:24px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="${CARD};padding:24px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px">
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:10px">
                <h2 style="margin:0;font-size:18px;font-weight:600;color:${T.text}">Octobre 2026</h2>
                ${badge(S.published ? 'Planning senior publié' : 'Recueil seniors ouvert', S.published ? 'success' : 'warning')}
              </div>
              <p style="margin:6px 0 0;font-size:14px;color:${T.text2}">${
                S.published
                  ? 'Planning senior publié en version ' + S.planVersion + '. Le recueil des fellows est ouvert jusqu’au 24 septembre.'
                  : 'Recueil ouvert depuis le 5 septembre — clôture le 15 septembre à 23h59.'
              }</p>
            </div>
            ${button({ label: S.published ? 'Ouvrir le planning publié' : 'Voir le suivi des réponses', iconAfter: 'arrowRight', nav: S.published ? 'revue' : 'suivi', style: 'flex-shrink:0' })}
          </div>
          ${stepper(S.published ? 4 : 2)}
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead('Campagnes', segmented([{ id: 'active', label: 'En cours' }, { id: 'closed', label: 'Clôturées' }, { id: 'all', label: 'Toutes' }], 'active', 'noop'))}
          ${tableHead([
            { label: 'Mois cible', width: '150px' },
            { label: 'Statut', width: '182px' },
            { label: 'Réponses seniors', width: '1fr' },
            { label: 'Réponses fellows', width: '1fr' },
            { label: 'Vacations', width: '104px', align: 'right' },
            { label: '', width: '32px' }
          ])}
          ${rows.map((row) => {
            const isCurrent = row.id === S.campaignId
            const seniorRatio = row.seniorTotal ? row.seniorDone / row.seniorTotal : 0
            const fellowRatio = row.fellowTotal ? row.fellowDone / row.fellowTotal : 0
            const tone = TONES[row.tone]
            return `<div data-act="${isCurrent ? 'nav-suivi' : 'toast'}" data-arg="Seule la campagne d’octobre 2026 est maquettée." style="display:grid;grid-template-columns:150px 182px 1fr 1fr 104px 32px;align-items:center;gap:0;padding:12px 20px;border-bottom:1px solid ${T.gray100};background:${isCurrent ? T.gray25 : T.surface};cursor:pointer">
              <span style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:${isCurrent ? 600 : 500};color:${T.text}">
                <span style="width:3px;height:18px;border-radius:999px;background:${isCurrent ? T.coral500 : 'transparent'}"></span>${row.month}
              </span>
              <span>${badge(row.status, row.tone)}</span>
              <span style="display:flex;align-items:center;gap:10px;padding-right:24px">
                ${bar(Math.round(seniorRatio * 100) + '%', seniorRatio === 1 ? T.ok500 : seniorRatio > 0 ? T.coral500 : T.gray300, 6)}
                <span style="font-size:13px;color:${T.gray600};font-variant-numeric:tabular-nums;white-space:nowrap">${row.seniorDone}/${row.seniorTotal}</span>
              </span>
              <span style="display:flex;align-items:center;gap:10px;padding-right:24px">
                ${bar(Math.round(fellowRatio * 100) + '%', fellowRatio === 1 ? T.ok500 : fellowRatio > 0 ? T.coral500 : T.gray300, 6)}
                <span style="font-size:13px;color:${T.gray600};font-variant-numeric:tabular-nums;white-space:nowrap">${row.fellowDone}/${row.fellowTotal}</span>
              </span>
              <span style="font-size:14px;color:${T.gray700};text-align:right;font-variant-numeric:tabular-nums">${row.slots || '—'}</span>
              <span style="display:flex;justify-content:flex-end">${icon('chevronRight', T.gray400, 16)}</span>
            </div>`
          }).join('')}
          <div style="padding:14px 20px;font-size:13px;color:${T.text3}">4 campagnes affichées</div>
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:316px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Octobre 2026 en chiffres</h3>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${stats.join('')}</div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">À traiter</h3>
          <div style="display:flex;flex-direction:column;gap:10px">${alerts.join('')}</div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Journal de campagne</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${journal.map((entry) => `<div style="display:flex;gap:12px">
              <span style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:4px">
                <span style="width:8px;height:8px;border-radius:999px;background:${entry.dot}"></span>
                <span style="width:1px;flex:1;background:${T.line}"></span>
              </span>
              <span style="flex:1;min-width:0;padding-bottom:2px">
                <span style="display:block;font-size:13px;color:${T.gray700};line-height:1.4">${entry.text}</span>
                <span style="display:block;margin-top:2px;font-size:11px;color:${T.text3}">${entry.when}</span>
              </span>
            </div>`).join('')}
          </div>
        </section>
      </aside>
    </div>`
}

VIEWS.vacations = () => {
  const methods = [
    { id: 'import', label: 'Import de fichier', icon: 'upload', hint: 'Fichier CSV ou tableur au format de l’annexe A. Le fichier est analysé intégralement avant tout enregistrement : aucune ligne n’est écrite tant qu’une erreur bloquante subsiste.' },
    { id: 'duplicate', label: 'Dupliquer le mois précédent', icon: 'copy', hint: 'Les vacations sont reportées sur les mêmes jours de semaine. Les jours fériés français sont exclus automatiquement et peuvent être réintégrés un par un.' },
    { id: 'manual', label: 'Saisie manuelle', icon: 'plus', hint: 'Saisie unitaire ou récurrente. Les centres et les modalités proviennent de la base : ajouter un centre ne demande aucune modification de code.' }
  ]
  const method = methods.find((entry) => entry.id === S.importMethod)

  const findings = [
    { kind: 'danger', line: '17', title: 'Le centre n’existe pas en base ou est inactif', raw: '2026-11-09;MATIN;BERGERES;IRM;1;1;', expected: 'BERGERE, BLOMET ou LARIBOISIERE. Le centre manquant peut être créé depuis cet écran.' },
    { kind: 'danger', line: '23', title: 'La date n’appartient pas au mois cible', raw: '2026-12-01;APRES_MIDI;BLOMET;SCANNER;1;1;', expected: 'Une date comprise entre le 2026-11-01 et le 2026-11-30.' },
    { kind: 'danger', line: '31', title: 'Demi-journée non reconnue', raw: '2026-11-17;MATINEE;LARIBOISIERE;IRM;1;1;', expected: 'MATIN ou APRES_MIDI. Aucune autre granularité horaire n’est gérée.' },
    { kind: 'warning', line: '38', title: 'La date est un jour férié français', raw: '2026-11-11;MATIN;BERGERE;SCANNER;1;1;', expected: 'Avertissement non bloquant. La ligne sera conservée si elle est confirmée.' },
    { kind: 'warning', line: '42', title: 'Doublon avec une vacation déjà chargée', raw: '2026-11-24;MATIN;BLOMET;SCANNER;1;1;', expected: 'Traité selon le mode d’import retenu ci-dessus.' }
  ]
  const errors = findings.filter((entry) => entry.kind === 'danger').length
  const warnings = findings.length - errors

  const centerColors = { BERGERE: T.navy500, BLOMET: T.ok700, LARIBOISIERE: T.warn600 }
  const novemberPattern = { 1: ['BERGERE', 'BERGERE', 'LARIBOISIERE'], 2: ['BLOMET', 'BERGERE'], 3: ['LARIBOISIERE', 'LARIBOISIERE', 'BLOMET'], 4: ['BERGERE', 'LARIBOISIERE', 'LARIBOISIERE'], 5: ['BLOMET', 'BERGERE'] }
  const cells = []
  const firstWeekday = new Date(Date.UTC(2026, 10, 1)).getUTCDay() || 7
  for (let blank = 1; blank < firstWeekday; blank += 1) cells.push('<div></div>')
  for (let dayNumber = 1; dayNumber <= 30; dayNumber += 1) {
    const weekday = new Date(Date.UTC(2026, 10, dayNumber)).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const holiday = dayNumber === 11
    const centers = weekend ? [] : novemberPattern[weekday] || []
    cells.push(`<div style="display:flex;flex-direction:column;gap:3px;min-height:52px;border:1px solid ${holiday ? T.warnBorder : weekend ? T.gray50 : T.gray100};border-radius:8px;background:${weekend ? T.gray25 : holiday ? T.warnBg : T.surface};padding:4px 5px">
      <span style="font-size:11px;font-weight:500;color:${weekend ? T.gray300 : T.gray600}">${dayNumber}</span>
      <span style="display:flex;flex-wrap:wrap;gap:2px">${centers.map((center) => `<span style="width:6px;height:6px;border-radius:999px;background:${centerColors[center]}"></span>`).join('')}</span>
      <span style="font-size:10px;color:${holiday ? T.warnText : T.text3}">${holiday ? 'férié' : centers.length ? centers.length + ' vac.' : ''}</span>
    </div>`)
  }

  const modes = [
    { id: 'add', label: 'Ajouter', detail: 'Les 48 lignes s’ajoutent aux 12 existantes. Les doublons seront refusés.' },
    { id: 'replace', label: 'Remplacer', detail: 'Les 12 vacations existantes sont annulées, puis remplacées.' },
    { id: 'merge', label: 'Fusionner', detail: 'Les doublons sont ignorés silencieusement, le reste est ajouté.' }
  ]

  return `
    ${pageHeader(
      'Chargement des vacations — Novembre 2026',
      'Rien n’est enregistré tant que le fichier comporte une erreur bloquante. La validation se fait sur la prévisualisation.',
      button({ label: 'Annuler', variant: 'ghost', nav: 'campagnes' }) +
      button({ label: 'Valider et enregistrer', variant: errors ? 'disabled' : 'primary', icon: 'check', act: errors ? 'toast' : 'nav-campagnes', arg: errors ? 'Corrigez d’abord les ' + errors + ' erreurs bloquantes.' : '' })
    )}

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="${CARD};overflow:hidden">
          <div style="display:flex;gap:0;border-bottom:1px solid ${T.line};padding:0 20px">
            ${methods.map((entry) => {
              const on = entry.id === S.importMethod
              return `<button type="button" data-act="import-method" data-arg="${entry.id}" style="display:flex;align-items:center;gap:8px;border:none;border-bottom:2px solid ${on ? T.coral500 : 'transparent'};background:transparent;padding:14px 16px;font-family:inherit;font-size:14px;font-weight:${on ? 600 : 500};color:${on ? T.text : T.text2};cursor:pointer">${icon(entry.icon, on ? T.coral600 : T.gray400, 16)}${entry.label}</button>`
            }).join('')}
          </div>

          <div style="padding:20px">
            <p style="margin:0 0 16px;font-size:14px;color:${T.text2};line-height:1.5">${method.hint}</p>

            ${S.importMethod === 'import' ? `<div style="display:flex;align-items:center;gap:16px;border:1.5px dashed ${T.gray300};border-radius:14px;background:${T.gray25};padding:20px 24px">
              <span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;flex-shrink:0;border-radius:14px;background:${T.gray100}">${icon('file', T.gray600, 22)}</span>
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:14px;font-weight:600;color:${T.text}">vacations-novembre-2026.csv</span>
                <span style="display:block;margin-top:2px;font-size:13px;color:${T.text2}">48 lignes lues · UTF-8, séparateur point-virgule · déposé il y a 12 secondes</span>
              </span>
              ${button({ label: 'Remplacer le fichier', variant: 'outline', icon: 'upload', style: 'flex-shrink:0' })}
            </div>` : ''}

            ${S.importMethod === 'duplicate' ? `<div style="display:flex;align-items:center;gap:16px;border:1px solid ${T.line};border-radius:14px;background:${T.gray25};padding:20px 24px">
              <span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;flex-shrink:0;border-radius:14px;background:${T.gray100}">${icon('copy', T.gray600, 22)}</span>
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:14px;font-weight:600;color:${T.text}">Report d’octobre 2026 sur les mêmes jours de semaine</span>
                <span style="display:block;margin-top:2px;font-size:13px;color:${T.text2}">${SLOTS.length} vacations reportées · 1 jour férié exclu automatiquement, réintégrable</span>
              </span>
            </div>` : ''}

            ${S.importMethod === 'manual' ? `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
              ${[['Date', '2026-11-03', T.text], ['Demi-journée', 'Matin', T.text], ['Centre', 'Bergère', T.text], ['Modalité', 'Choisir…', '#aeb7c2']].map((field) => `<div>
                <p style="margin:0 0 6px;font-size:12px;font-weight:500;color:${T.gray600}">${field[0]}</p>
                <div style="display:flex;align-items:center;height:36px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:0 12px;font-size:13px;color:${field[2]}">${field[1]}</div>
              </div>`).join('')}
            </div>
            <p style="margin:14px 0 0;font-size:13px;color:${T.text2}">Saisie récurrente : « tous les mardis matin, IRM, Bergère, pour tout le mois » crée 4 vacations d’un coup.</p>` : ''}

            <div style="margin-top:20px;border-top:1px solid ${T.gray100};padding-top:16px">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${T.text}">La campagne contient déjà 12 vacations. Que faire des nouvelles ?</p>
              <div style="display:flex;gap:10px">
                ${modes.map((mode) => {
                  const on = mode.id === S.importMode
                  return `<div data-act="import-mode" data-arg="${mode.id}" style="display:flex;align-items:flex-start;gap:10px;flex:1;border:1px solid ${on ? T.coral500 : T.line};border-radius:12px;background:${on ? T.coral50 : T.surface};padding:12px 14px;cursor:pointer">
                    <span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;margin-top:2px;border:1.5px solid ${on ? T.coral500 : T.gray300};border-radius:999px;background:${T.surface}">
                      <span style="width:8px;height:8px;border-radius:999px;background:${on ? T.coral500 : 'transparent'}"></span>
                    </span>
                    <span style="flex:1;min-width:0">
                      <span style="display:block;font-size:13px;font-weight:600;color:${T.text}">${mode.label}</span>
                      <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};line-height:1.4">${mode.detail}</span>
                    </span>
                  </div>`
                }).join('')}
              </div>
            </div>
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead(
            'Rapport d’analyse',
            `<span style="display:flex;align-items:center;gap:10px"><span style="font-size:13px;color:${T.text2}">${plural(errors, 'erreur')} bloquante${errors > 1 ? 's' : ''} · ${plural(warnings, 'avertissement')}</span>${badge(errors ? 'Enregistrement bloqué' : 'Prêt à enregistrer', errors ? 'danger' : 'success')}</span>`
          )}
          ${tableHead([{ label: 'Ligne', width: '64px' }, { label: 'Constat', width: '1fr' }, { label: 'Valeur attendue', width: '208px' }])}
          ${findings.map((entry) => {
            const tone = TONES[entry.kind]
            return `<div style="display:grid;grid-template-columns:64px 1fr 208px;align-items:flex-start;gap:0;border-bottom:1px solid ${T.gray100};padding:11px 20px;background:${tone.bg}">
              <span style="display:flex;align-items:center;gap:6px;font-size:13px;color:${T.gray600};font-variant-numeric:tabular-nums">${icon(entry.kind === 'danger' ? 'alert' : 'clockAlert', tone.fg, 14)}${entry.line}</span>
              <span style="padding-right:16px">
                <span style="display:block;font-size:13px;font-weight:500;color:${tone.fg}">${entry.title}</span>
                <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc(entry.raw)}</span>
              </span>
              <span style="font-size:12px;color:${T.text2};line-height:1.45">${entry.expected}</span>
            </div>`
          }).join('')}
          ${footnote('RG-13 à RG-18. Un jour férié est un avertissement non bloquant : la ligne est conservée après confirmation explicite.')}
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:396px;flex-shrink:0">
        <section style="${CARD};overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid ${T.line}">
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Prévisualisation</h3>
            <span style="font-size:12px;color:${T.text2}">novembre 2026</span>
          </div>
          <div style="padding:14px 16px">
            <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-bottom:6px">
              ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label) => `<span style="text-align:center;font-size:11px;font-weight:500;color:${T.text3}">${label}</span>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${cells.join('')}</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid ${T.gray100};padding:12px 20px;font-size:12px;color:${T.text2}">
            ${Object.keys(CENTERS).map((key) => `<span style="display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:999px;background:${CENTERS[key].color}"></span>${CENTERS[key].label}</span>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Ce qui sera enregistré</h3>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            ${statTile('48', 'lignes lues')}
            ${statTile('43', 'vacations valides', T.ok700)}
            ${statTile(String(errors), 'lignes rejetées', T.dangerText)}
            ${statTile(String(warnings), 'à confirmer', T.warnText)}
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:${T.text}">Format attendu</h3>
          <div style="border:1px solid ${T.line};border-radius:10px;background:${T.gray25};padding:12px;overflow-x:auto">
            <pre style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.65;color:${T.gray600}">date;demi_journee;centre;modalite;
places_senior;places_fellow;commentaire
2026-11-02;MATIN;BERGERE;IRM;1;1;
2026-11-02;MATIN;BERGERE;SCANNER;1;1;
2026-11-03;APRES_MIDI;BLOMET;IRM;1;0;Pas de fellow</pre>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Les deux premières lignes illustrent le cas visé par la double vacation : une IRM et un scanner, même jour, même demi-journée, même centre.</p>
        </section>
      </aside>
    </div>`
}

VIEWS.suivi = () => {
  const submitted = SENIORS.filter((person) => S.submissions[person.id] === 'SUBMITTED').length
  const declarations = SENIORS.reduce((total, person) => total + declaredCount(person.id), 0)
  const places = SLOTS.reduce((total, slot) => total + slot.seniorCapacity, 0)

  const statusStyles = {
    SUBMITTED: { label: 'Validée', tone: 'success' },
    IN_PROGRESS: { label: 'En cours', tone: 'warning' },
    NOT_STARTED: { label: 'Aucune réponse', tone: 'danger' },
    DECLINED_MONTH: { label: 'Indisponible ce mois', tone: 'neutral' }
  }

  const isPending = (person) => S.submissions[person.id] === 'IN_PROGRESS' || S.submissions[person.id] === 'NOT_STARTED'
  const visible = S.suiviFilter === 'pending' ? SENIORS.filter(isPending) : SENIORS

  const headline = [
    { label: 'Réponses validées', value: submitted + ' / ' + SENIORS.length, detail: '1 en cours, 1 sans réponse, 1 indisponible sur tout le mois', glyph: 'check', color: T.ok700 },
    { label: 'Places à pourvoir', value: String(places), detail: SLOTS.length + ' vacations, une place senior chacune', glyph: 'calendar', color: T.navy500 },
    { label: 'Déclarations reçues', value: String(declarations), detail: 'soit ' + (Math.round((declarations / places) * 10) / 10).toString().replace('.', ',') + ' candidats par place en moyenne', glyph: 'chart', color: T.navy500 },
    { label: 'Créneaux sans volontaire', value: String(ORPHANS.length), detail: 'la place restera vide, la cause sera tracée', glyph: 'alert', color: T.dangerText }
  ]

  const allWeights = [
    { code: 'G1', label: 'Couverture maximale des vacations', value: 1000, primary: true },
    { code: 'S1', label: 'Doubles vacations du coordinateur', value: 200, primary: true },
    { code: 'G2', label: 'Équité du nombre total de vacations', value: 100, primary: true },
    { code: 'G4', label: 'Correction inter-mois, dettes reportées', value: 30, primary: true },
    { code: 'G3', label: 'Respect des créneaux prioritaires', value: 20, primary: true },
    { code: 'G7', label: 'Limitation de la concentration hebdomadaire', value: 10, primary: false },
    { code: 'G5', label: 'Équilibre entre modalités', value: 0, primary: false },
    { code: 'G6', label: 'Équilibre entre centres', value: 0, primary: false }
  ]
  const shownWeights = S.showAllWeights ? allWeights : allWeights.filter((weight) => weight.primary)

  const coveredOnce = SLOTS.filter((slot) => availableSeniors(slot.id).length > 0).length
  const coveredThrice = SLOTS.filter((slot) => availableSeniors(slot.id).length >= 3).length
  const thin = SENIORS.filter((person) => declaredCount(person.id) > 0 && declaredCount(person.id) < 6).length

  return `
    ${pageHeader(
      'Avant génération — Octobre 2026',
      'Recueil des seniors clos le 15 septembre à 23h59. Vérifiez l’état des lieux avant de lancer le moteur.',
      button({ label: 'Rouvrir le recueil', variant: 'outline', icon: 'unlock', act: 'toast', arg: 'La réouverture invaliderait les propositions déjà générées.' }) +
      button({ label: 'Lancer la génération', variant: 'primary', icon: 'wand', act: 'generate' })
    )}

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px">
      ${headline.map((stat) => `<div style="${CARD};padding:18px 20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${icon(stat.glyph, stat.color, 16)}<p style="margin:0;font-size:12px;font-weight:500;color:${T.text2}">${stat.label}</p></div>
        <p style="margin:0;font-size:28px;font-weight:700;color:${stat.color === T.dangerText ? T.dangerText : T.text};line-height:1;font-variant-numeric:tabular-nums">${stat.value}</p>
        <p style="margin:6px 0 0;font-size:12px;color:${T.text3};line-height:1.4">${stat.detail}</p>
      </div>`).join('')}
    </div>

    <div style="display:flex;gap:20px;align-items:flex-start">
      <section style="${CARD};flex:1;min-width:0;overflow:hidden">
        ${sectionHead('Suivi des réponses', `<span style="display:flex;align-items:center;gap:10px">${segmented([{ id: 'all', label: 'Tout le monde' }, { id: 'pending', label: 'À relancer' }], S.suiviFilter, 'suivi-filter')}${button({ label: 'Relancer', variant: 'outline', icon: 'mail', act: 'remind-all', style: 'height:32px;font-size:13px' })}</span>`)}
        ${tableHead([
          { label: 'Personne', width: '1fr' },
          { label: 'Statut', width: '176px' },
          { label: 'Déclarées', width: '96px', align: 'right' },
          { label: 'Dernière ouverture', width: '132px', align: 'right' },
          { label: 'Relances', width: '104px', align: 'right' }
        ])}
        ${visible.map((person) => {
          const status = S.submissions[person.id]
          const skin = statusStyles[status]
          const pending = isPending(person)
          const declared = declaredCount(person.id)
          return `<div style="display:grid;grid-template-columns:1fr 176px 96px 132px 104px;align-items:center;gap:0;border-bottom:1px solid ${T.gray100};padding:11px 20px;background:${pending ? '#fffdf9' : T.surface}">
            <span style="display:flex;align-items:center;gap:10px;min-width:0;padding-right:12px">
              ${avatar(person.initials, status === 'SUBMITTED' ? T.gray100 : T.warnBg, status === 'SUBMITTED' ? T.gray600 : T.warnText)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${person.name}</span>
                <span style="display:block;font-size:12px;color:${T.text3}">${person.role}</span>
              </span>
            </span>
            <span>${badge(skin.label, skin.tone)}</span>
            <span style="text-align:right;font-size:14px;color:${declared > 0 && declared < 6 ? T.warnText : T.gray700};font-variant-numeric:tabular-nums">${status === 'DECLINED_MONTH' ? '—' : declared}</span>
            <span style="text-align:right;font-size:13px;color:${T.text2}">${LAST_OPENED[person.id]}</span>
            <span style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
              <span style="font-size:13px;color:${T.text2};font-variant-numeric:tabular-nums">${REMINDERS[person.id]}</span>
              <button type="button" data-act="${pending ? 'remind' : 'toast'}" data-arg="${pending ? person.id : 'Les disponibilités individuelles ne sont visibles que du coordinateur (RG-05).'}" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid ${T.line};border-radius:8px;background:${T.surface};cursor:pointer;padding:0">${icon(pending ? 'mail' : 'eye', T.text2, 14)}</button>
            </span>
          </div>`
        }).join('')}
        ${footnote('La dernière ouverture du formulaire distingue un défaut de réception d’un défaut de réponse. Une absence de réponse vaut indisponibilité totale (RG-21).')}
      </section>

      <aside style="display:flex;flex-direction:column;gap:16px;width:412px;flex-shrink:0">
        <section style="${CARD};overflow:hidden;border-color:${T.dangerBorder}">
          <div style="display:flex;align-items:center;gap:10px;background:${T.dangerBg};padding:14px 20px;border-bottom:1px solid ${T.dangerBorder}">
            ${icon('alert', T.dangerText, 18)}
            <h3 style="margin:0;flex:1;font-size:15px;font-weight:600;color:${T.dangerText}">Créneaux sans aucun volontaire</h3>
            <span style="font-size:13px;font-weight:600;color:${T.dangerText}">${plural(ORPHANS.length, 'place')}</span>
          </div>
          <div style="padding:8px 0">
            ${ORPHANS.map((slotId) => {
              const slot = SLOTS.find((entry) => entry.id === slotId)
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-bottom:1px solid ${T.gray50}">
                <span style="width:3px;height:30px;flex-shrink:0;border-radius:2px;background:${CENTERS[slot.center].color}"></span>
                <span style="flex:1;min-width:0">
                  <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${CENTERS[slot.center].label} · ${slot.modality}</span>
                  <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2}">${slotWhen(slot)}</span>
                </span>
                <button type="button" data-act="toast" data-arg="Un email de disponibilité exceptionnelle serait envoyé (E08)." style="display:inline-flex;align-items:center;gap:6px;height:30px;flex-shrink:0;border:1px solid ${T.warnBorder};border-radius:8px;background:${T.warnBg};padding:0 10px;font-family:inherit;font-size:12px;font-weight:500;color:${T.warnText};cursor:pointer">Solliciter</button>
              </div>`
            }).join('')}
          </div>
          <p style="margin:0;padding:12px 20px;font-size:12px;color:${T.text2};line-height:1.45">Ces places resteront non pourvues. La cause figurera au rapport de diagnostic, et la publication demandera un acquittement motivé (RG-26).</p>
        </section>

        <section style="${CARD};overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid ${T.line}">
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Poids utilisés pour cette génération</h3>
            <button type="button" data-act="toggle-weights" style="border:none;background:transparent;padding:0;font-family:inherit;font-size:13px;font-weight:500;color:${T.navy600};cursor:pointer">${S.showAllWeights ? 'Réduire' : 'Tout afficher'}</button>
          </div>
          <div style="padding:6px 20px 16px">
            ${shownWeights.map((weight) => `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid ${T.gray50}">
              <span style="width:26px;flex-shrink:0;font-size:11px;font-weight:600;color:${T.text3}">${weight.code}</span>
              <span style="flex:1;min-width:0;font-size:13px;color:${T.gray700}">${weight.label}</span>
              <span style="width:72px;flex-shrink:0;display:flex">${bar(Math.max(3, Math.round((weight.value / 1000) * 100)) + '%', weight.value === 0 ? T.line : weight.value >= 200 ? T.navy500 : T.navy300, 6)}</span>
              <span style="width:38px;flex-shrink:0;text-align:right;font-size:13px;font-weight:600;color:${weight.value === 0 ? T.text3 : T.text};font-variant-numeric:tabular-nums">${weight.value}</span>
            </div>`).join('')}
            <p style="margin:12px 0 0;font-size:12px;color:${T.text3};line-height:1.45">${
              S.showAllWeights
                ? 'G5 et G6 sont à zéro par défaut (PARAM-09) : le critère d’équité retenu porte sur le nombre total de vacations. Les activer ne demande aucune modification de code.'
                : 'Les poids sont copiés et figés dans la campagne au lancement, pour que la génération reste rejouable à l’identique.'
            }</p>
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Couverture prévisible</h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              { label: 'Places couvertes par au moins un volontaire', value: coveredOnce + ' / ' + places, pct: Math.round((coveredOnce / places) * 100), color: T.ok500 },
              { label: 'Places avec au moins trois volontaires', value: coveredThrice + ' / ' + places, pct: Math.round((coveredThrice / places) * 100), color: T.navy400 },
              { label: 'Personnes ayant déclaré moins de 6 créneaux', value: thin + ' / ' + SENIORS.length, pct: Math.round((thin / SENIORS.length) * 100), color: T.warn500 }
            ].map((row) => `<div>
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:5px">
                <span style="font-size:13px;color:${T.gray600}">${row.label}</span>
                <span style="font-size:13px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${row.value}</span>
              </div>
              <span style="display:block;height:7px;border-radius:999px;background:${T.gray100};overflow:hidden"><span style="display:block;height:7px;width:${row.pct}%;border-radius:999px;background:${row.color}"></span></span>
            </div>`).join('')}
          </div>
        </section>
      </aside>
    </div>`
}
