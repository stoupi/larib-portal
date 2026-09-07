/* Review, engine report, publication, settings. */

function weekSegments(weeks, active, act) {
  return segmented(weeks.map((week) => ({ id: String(week), label: 'S' + week })), String(active), act)
}

function currentSlot() {
  const inWeek = SLOTS.filter((slot) => slot.week === S.week)
  const picked = SLOTS.find((slot) => slot.id === S.slotId)
  return picked || inWeek[0] || SLOTS[0]
}

VIEWS.revue = () => {
  const counts = seniorCounts()
  const unfilled = unfilledSlots()
  const target = equityTarget()
  const active = SENIORS.filter((person) => S.submissions[person.id] !== 'DECLINED_MONTH')
  const spread =
    Math.max.apply(null, active.map((person) => counts[person.id])) -
    Math.min.apply(null, active.map((person) => counts[person.id]))
  const doubles = doubleShifts()
  const opportunities = doubleShiftOpportunities()
  const picked = currentSlot()
  const pool = availableSeniors(picked.id)
  const excluded = SENIORS.filter((person) => pool.indexOf(person) === -1)

  const weekSlots = SLOTS.filter((slot) => slot.week === S.week)
  const dayNumbers = weekSlots.reduce((list, slot) => (list.indexOf(slot.dayNumber) === -1 ? list.concat(slot.dayNumber) : list), []).sort((left, right) => left - right)

  const renderSlot = (slot) => {
    const holderId = S.assignments[slot.id]
    const holder = holderId ? SENIORS.find((person) => person.id === holderId) : null
    const isPicked = slot.id === picked.id
    const locked = Boolean(S.locks[slot.id])
    const trailing = `<span style="display:inline-flex;align-items:center;gap:7px;flex-shrink:0;max-width:190px">
      ${holder
        ? avatar(holder.initials, holder.coordinator ? T.navy50 : T.gray100, holder.coordinator ? T.navy600 : T.gray600, 26) +
          `<span style="font-size:13px;font-weight:500;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${holder.name}</span>`
        : `<span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:${T.dangerBg};padding:4px 10px 4px 7px">${icon('alert', T.dangerText, 13)}<span style="font-size:11px;font-weight:600;color:${T.dangerText}">Non pourvue</span></span>`}
      ${locked ? icon('lock', T.text2, 14) : ''}
    </span>`
    return slotRow(slot, {
      trailing,
      bg: isPicked ? T.coral50 : holder ? T.surface : T.dangerBg,
      border: isPicked ? T.coral500 : holder ? T.line : T.dangerBorder,
      act: 'pick-slot',
      arg: slot.id
    })
  }

  const equityRows = active
    .map((person) => {
      const count = counts[person.id]
      const gap = Math.round((count - target) * 10) / 10
      return { person, count, gap }
    })
    .sort((left, right) => right.count - left.count)

  const alerts = []
  if (unfilled.length) {
    alerts.push(noteBox('danger', plural(unfilled.length, 'place') + ' non pourvue' + (unfilled.length > 1 ? 's' : ''), 'Bloquante à la publication, sauf acquittement explicite du coordinateur avec motif.'))
  }
  if (spread > 2) {
    alerts.push(noteBox('warning', 'Écart d’équité de ' + spread + ' vacations', 'Le seuil d’alerte PARAM-05 est fixé à 2.'))
  }
  const idle = active.filter((person) => counts[person.id] === 0 && declaredCount(person.id) > 0)
  idle.forEach((person) => {
    alerts.push(noteBox('warning', person.name + ' n’a reçu aucune affectation', 'Cette personne avait pourtant déclaré ' + plural(declaredCount(person.id), 'disponibilité') + '.'))
  })
  const silent = SENIORS.filter((person) => S.submissions[person.id] === 'NOT_STARTED')
  if (silent.length) {
    alerts.push(noteBox('info', plural(silent.length, 'senior') + ' sans réponse', 'Traité comme indisponible sur tout le mois (RG-21).', 'info'))
  }
  if (alerts.length === 0) alerts.push(noteBox('success', 'Aucune alerte active', 'Toutes les places sont pourvues et l’équité est dans le seuil.', 'check'))

  const narrative =
    (SLOTS.length - unfilled.length) + ' places pourvues sur ' + SLOTS.length + '. ' +
    'L’écart maximal entre seniors est de ' + spread + ' vacations, pour une cible de ' + String(target).replace('.', ',') + '. ' +
    doubles + ' doubles vacations ont pu être formées pour le coordinateur sur ' + opportunities +
    ' demi-journées où une IRM et un scanner coexistent sur le même centre.'

  return `
    ${pageHeader(
      'Revue du planning — Octobre 2026',
      'Population senior. La décision finale vous appartient : rien n’est diffusé avant votre publication.',
      button({ label: 'Rapport complet', variant: 'outline', icon: 'history', nav: 'rapport' }) +
      button({ label: 'Régénérer', variant: 'outline', icon: 'refresh', act: 'generate' }) +
      button({ label: 'Publier le planning', variant: 'primary', icon: 'send', nav: 'publication' })
    )}

    <section style="${CARD};display:flex;align-items:flex-start;gap:16px;padding:18px 24px;margin-bottom:20px;border-left:4px solid ${T.navy500}">
      <span style="flex-shrink:0;margin-top:2px">${icon('wand', T.navy500, 20)}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <h2 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Ce que le moteur a produit</h2>
          ${badge('Proposition v' + S.planVersion, 'info')}
          <span style="font-size:12px;color:${T.text3}">graine 4271 · 2,8 s · optimum atteint</span>
        </div>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${T.gray600}">${narrative}</p>
      </div>
      ${button({ label: 'Voir le détail', variant: 'outline', nav: 'rapport', style: 'height:32px;font-size:13px;flex-shrink:0' })}
    </section>

    <div style="display:flex;gap:20px;align-items:flex-start">

      <section style="${CARD};flex:1;min-width:0;overflow:hidden">
        ${sectionHead(
          'Grille mensuelle',
          `<span style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:${T.text2}">${plural(weekSlots.length, 'vacation')} cette semaine</span>${weekSegments(WEEKS, S.week, 'set-week')}</span>`
        )}
        ${halfDayHeads('180px')}
        ${dayNumbers.map((dayNumber, position) => {
          const daySlots = weekSlots.filter((slot) => slot.dayNumber === dayNumber)
          const morning = daySlots.filter((slot) => slot.halfDay === 'MORNING')
          const afternoon = daySlots.filter((slot) => slot.halfDay === 'AFTERNOON')
          const gaps = daySlots.filter((slot) => !S.assignments[slot.id]).length
          const holdsPicked = daySlots.some((slot) => slot.id === picked.id)
          const empty = `<span style="display:flex;align-items:center;min-height:46px;font-size:12px;color:${T.gray300};padding-left:8px">Aucune vacation</span>`
          return `<div style="display:grid;grid-template-columns:180px 1fr 1fr;gap:0;border-bottom:1px solid ${T.gray100};padding:14px 20px;background:${holdsPicked ? T.coral50 : position % 2 ? T.gray25 : T.surface}">
            ${dayCell(daySlots, `<span style="font-size:12px;color:${gaps ? T.dangerText : T.text3}">${gaps ? plural(gaps, 'place') + ' non pourvue' + (gaps > 1 ? 's' : '') : plural(daySlots.length, 'vacation')}</span>`)}
            <div style="display:flex;flex-direction:column;gap:7px;padding-right:12px">${morning.length ? morning.map(renderSlot).join('') : empty}</div>
            <div style="display:flex;flex-direction:column;gap:7px">${afternoon.length ? afternoon.map(renderSlot).join('') : empty}</div>
          </div>`
        }).join('')}
        ${gridLegend(`<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.text2}">${icon('lock', T.text2, 14)}verrouillée, conservée à la régénération</span>`)}
      </section>

      <aside style="display:flex;flex-direction:column;gap:16px;width:384px;flex-shrink:0">

        <section style="${CARD};overflow:hidden">
          <div style="border-bottom:1px solid ${T.line};background:${T.gray25};padding:14px 20px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div style="min-width:0">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${T.text2}">Vacation sélectionnée</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${T.text}">${CENTERS[picked.center].label} · ${picked.modality}</p>
                <p style="margin:2px 0 0;font-size:13px;color:${T.text2}">${slotWhen(picked)} · 1 place senior</p>
              </div>
              <button type="button" data-act="toggle-lock" data-arg="${picked.id}" title="Verrouiller cette affectation" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex-shrink:0;border:1px solid ${S.locks[picked.id] ? T.navy500 : T.line};border-radius:10px;background:${S.locks[picked.id] ? T.navy50 : T.surface};cursor:pointer;padding:0">${icon(S.locks[picked.id] ? 'lock' : 'unlock', S.locks[picked.id] ? T.navy600 : T.text2, 16)}</button>
            </div>
          </div>

          <div style="padding:14px 20px 8px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
              <p style="margin:0;font-size:13px;font-weight:600;color:${T.text}">Seniors disponibles sur ce créneau</p>
              <span style="font-size:12px;color:${T.text3}">${pool.length} sur ${SENIORS.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${pool.length === 0 ? `<p style="margin:0;font-size:13px;color:${T.dangerText};line-height:1.45">Personne ne s’est déclaré disponible. La place restera vide, sauf disponibilité exceptionnelle.</p>` : pool.map((person) => {
                const isHolder = S.assignments[picked.id] === person.id
                const gap = counts[person.id] - target
                return `<div data-act="assign" data-arg="${picked.id}|${person.id}" style="display:flex;align-items:center;gap:10px;border:1px solid ${isHolder ? T.okBorder : T.line};border-radius:10px;background:${isHolder ? T.okBg : T.surface};padding:8px 10px;cursor:pointer">
                  ${avatar(person.initials, isHolder ? T.ok700 : T.gray100, isHolder ? '#fff' : T.gray600)}
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${person.name}${person.coordinator ? ' · coordinateur' : ''}</span>
                    <span style="display:block;font-size:11px;color:${T.text2}">${plural(counts[person.id], 'vacation')} · écart ${gap >= 0 ? '+' : ''}${Math.round(gap * 10) / 10}${person.coordinator ? ' · double vacation autorisée' : ''}</span>
                  </span>
                  <span style="flex-shrink:0">${isHolder ? icon('check', T.ok700, 16) : ''}</span>
                </div>`
              }).join('')}
            </div>
          </div>

          <div style="padding:8px 20px 18px">
            <div style="border-top:1px dashed ${T.line};padding-top:12px">
              <p style="margin:0 0 8px;font-size:12px;color:${T.text3};line-height:1.45">${
                excluded.length === 0
                  ? 'Tout le monde est disponible sur ce créneau.'
                  : 'Non disponibles sur ce créneau — l’interface ne les propose jamais et refuse le glisser-déposer correspondant.'
              }</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
                ${excluded.map((person) => `<span data-act="toast" data-arg="${esc(person.name + ' n’a pas déclaré ce créneau disponible : aucune affectation n’est possible (RG-24).')}" style="display:inline-flex;align-items:center;gap:5px;border:1px dashed ${T.line};border-radius:999px;background:${T.gray25};padding:3px 9px;font-size:12px;color:${T.text3};cursor:pointer"><span style="width:5px;height:5px;border-radius:999px;background:${T.gray300}"></span>${person.name}</span>`).join('')}
              </div>
              <button type="button" data-act="exceptional" data-arg="${picked.id}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:36px;border:1px solid ${T.warnBorder};border-radius:10px;background:${T.warnBg};font-family:inherit;font-size:13px;font-weight:500;color:${T.warnText};cursor:pointer">${icon('mail', 'currentColor', 16)}Demander une disponibilité exceptionnelle</button>
              <p style="margin:8px 0 0;font-size:11px;color:${T.text3};line-height:1.45">RG-24 — l’intéressé doit accepter par email avant que l’affectation devienne possible. Il n’existe aucun autre contournement.</p>
            </div>
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px">
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Équité en temps réel</h3>
            <span style="font-size:12px;color:${T.text2}">cible ${String(target).replace('.', ',')} · écart max ${spread}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:9px">
            ${equityRows.map((row) => `<div style="display:flex;align-items:center;gap:10px">
              <span style="width:96px;flex-shrink:0;font-size:13px;font-weight:${row.person.coordinator ? 600 : 500};color:${T.gray700};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.person.name}</span>
              ${bar(Math.min(100, Math.round((row.count / (target * 1.7)) * 100)) + '%', row.person.coordinator ? T.navy500 : Math.abs(row.gap) >= 2 ? T.warnText : T.navy400, 18, Math.round((target / (target * 1.7)) * 100) + '%')}
              <span style="width:22px;flex-shrink:0;text-align:right;font-size:13px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${row.count}</span>
              <span style="width:34px;flex-shrink:0;text-align:right;font-size:12px;color:${Math.abs(row.gap) >= 2 ? T.warnText : T.text3};font-variant-numeric:tabular-nums">${row.gap > 0 ? '+' : ''}${row.gap}</span>
            </div>`).join('')}
          </div>
          <p style="margin:12px 0 0;font-size:11px;color:${T.text3}">Le trait gris marque la cible du mois, plafonnée par les disponibilités déclarées (RG-35).</p>
        </section>

        <section style="${CARD};padding:18px 20px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Alertes</h3>
            <span style="font-size:12px;color:${T.text2}">${unfilled.length ? '1 bloquante' : 'aucune bloquante'}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">${alerts.join('')}</div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Doubles vacations du coordinateur</h3>
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px">
            <span style="font-size:32px;font-weight:700;color:${T.text};line-height:1;font-variant-numeric:tabular-nums">${doubles}</span>
            <span style="font-size:14px;color:${T.text2}">sur ${opportunities} possibles ce mois-ci</span>
          </div>
          <span style="display:block;height:8px;border-radius:999px;background:${T.gray100};overflow:hidden"><span style="display:block;height:8px;width:${Math.round((doubles / opportunities) * 100)}%;border-radius:999px;background:${T.navy500}"></span></span>
          <p style="margin:10px 0 0;font-size:12px;color:${T.text2};line-height:1.45">Objectif S1, poids 200. Les demi-journées manquées le sont parce que le coordinateur n’avait pas déclaré les deux créneaux disponibles.</p>
        </section>
      </aside>
    </div>`
}

VIEWS.rapport = () => {
  const counts = seniorCounts()
  const unfilled = unfilledSlots()
  const target = equityTarget()
  const active = SENIORS.filter((person) => S.submissions[person.id] !== 'DECLINED_MONTH')
  const spread =
    Math.max.apply(null, active.map((person) => counts[person.id])) -
    Math.min.apply(null, active.map((person) => counts[person.id]))
  const doubles = doubleShifts()
  const opportunities = doubleShiftOpportunities()
  const preferred = SLOTS.filter((slot) => SENIORS.some((person) => availabilityOf(person.id, slot.id) === 'PREFERRED')).length
  const preferredHonoured = SLOTS.filter((slot) => S.assignments[slot.id] && availabilityOf(S.assignments[slot.id], slot.id) === 'PREFERRED').length

  const ranked = active.map((person) => ({ person, count: counts[person.id] })).sort((left, right) => right.count - left.count)
  const lowest = ranked[ranked.length - 1]
  const highest = ranked[0]

  const narrative = [
    (SLOTS.length - unfilled.length) + ' places pourvues sur ' + SLOTS.length + '. ' +
      (unfilled.length ? 'Les ' + unfilled.length + ' places vides sont détaillées ci-dessous avec leur cause.' : 'Aucune place ne reste vide.'),
    'L’écart maximal entre seniors est de ' + spread + ' vacations, pour une cible de ' + String(target).replace('.', ',') + '. ' +
      lowest.person.name + ' reçoit ' + plural(lowest.count, 'vacation') + ', parce qu’elle n’avait déclaré que ' +
      plural(declaredCount(lowest.person.id), 'disponibilité') + ' : sa cible est plafonnée par ce nombre et aucune dette d’équité ne lui est imputée (RG-35).',
    highest.person.name + ' reçoit ' + plural(highest.count, 'vacation') + ', le maximum du mois, avec ' +
      plural(declaredCount(highest.person.id), 'créneau') + ' déclarés disponibles.',
    doubles + ' doubles vacations ont été formées pour le coordinateur, sur ' + opportunities +
      ' demi-journées où une IRM et un scanner coexistent sur le même centre. Les manquantes le sont parce que le coordinateur n’avait pas déclaré les deux créneaux.',
    'Les affectations verrouillées sont conservées à l’identique d’une génération à l’autre, quelle que soit la graine.'
  ]

  const metrics = [
    { label: 'Taux de couverture', value: Math.round(((SLOTS.length - unfilled.length) / SLOTS.length) * 100) + ' %', color: unfilled.length ? T.warnText : T.ok700 },
    { label: 'Places non pourvues', value: String(unfilled.length), color: unfilled.length ? T.dangerText : T.ok700 },
    { label: 'Écart maximal d’équité', value: String(spread), color: spread > 2 ? T.warnText : T.text },
    { label: 'Somme des écarts absolus à la cible', value: String(Math.round(active.reduce((total, person) => total + Math.abs(counts[person.id] - target), 0) * 10) / 10).replace('.', ','), color: T.text },
    { label: 'Doubles vacations du coordinateur', value: doubles + ' / ' + opportunities, color: T.ok700 },
    { label: 'Créneaux prioritaires honorés', value: preferredHonoured + ' / ' + preferred, color: T.text },
    { label: 'Score de la fonction objectif', value: String(4218 + unfilled.length * 1000), color: T.text }
  ]

  const diffSets = {
    v2: [
      { glyph: 'swap', color: T.info, title: 'Bergère · IRM, lundi 5 octobre matin', detail: 'M. Nguyen remplace F. Leroy', tag: 'Changement', tone: 'info' },
      { glyph: 'swap', color: T.info, title: 'Lariboisière · Scanner, jeudi 15 octobre après-midi', detail: 'Théo Pezel remplace A. Bernard, formant une double vacation', tag: 'Changement', tone: 'info' },
      { glyph: 'plus', color: T.ok700, title: 'Blomet · IRM, mercredi 7 octobre après-midi', detail: 'Place précédemment vide, désormais tenue par J. Vidal', tag: 'Comblée', tone: 'success' },
      { glyph: 'lock', color: T.text2, title: Object.keys(S.locks).filter((key) => S.locks[key]).length + ' affectations verrouillées', detail: 'Conservées à l’identique, comme à chaque régénération', tag: 'Inchangé', tone: 'neutral' }
    ],
    v1: [
      { glyph: 'swap', color: T.info, title: '11 affectations modifiées', detail: 'La version 1 précédait le premier arbitrage manuel', tag: 'Changement', tone: 'info' },
      { glyph: 'plus', color: T.ok700, title: '4 places comblées', detail: 'Le passage du poids G1 de 500 à 1000 a priorisé la couverture', tag: 'Comblée', tone: 'success' }
    ],
    none: []
  }
  const diff = diffSets[S.diffVersion] || []

  return `
    ${pageHeader(
      'Rapport de génération — Octobre 2026',
      'Exécution ' + S.planVersion + ' du moteur, population senior. Ce rapport est descriptif : il ne formule aucune recommandation qui ne dérive pas d’un chiffre présent ici.',
      button({ label: 'Rejouer avec une autre graine', variant: 'outline', icon: 'refresh', act: 'generate' }) +
      button({ label: 'Retour à la revue', iconAfter: 'arrowRight', nav: 'revue' })
    )}

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="${CARD};padding:22px 24px;border-left:4px solid ${T.navy500}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            ${icon('wand', T.navy500, 20)}
            <h2 style="margin:0;flex:1;font-size:16px;font-weight:600;color:${T.text}">Restitution en langage naturel</h2>
            <span style="font-size:12px;color:${T.text3}">produite à partir des métriques du solveur, jamais l’inverse</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${narrative.map((paragraph) => `<p style="margin:0;font-size:14px;line-height:1.6;color:${T.gray700}">${paragraph}</p>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:16px;border-top:1px solid ${T.gray100};padding-top:14px">
            ${icon('info', T.text3, 15)}
            <span style="font-size:12px;color:${T.text3};line-height:1.45">RG-31 et RG-38 — le moteur d’optimisation et cette couche de restitution sont deux composants séparés. Ce texte ne crée, ne modifie et ne supprime jamais une affectation.</span>
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead('Places non pourvues et cause identifiée', badge(plural(unfilled.length, 'place'), unfilled.length ? 'danger' : 'success'))}
          ${unfilled.length === 0 ? `<p style="margin:0;padding:20px;font-size:14px;color:${T.ok700}">Toutes les places sont pourvues. La publication n’exigera aucun acquittement.</p>` : `
            ${tableHead([{ label: 'Vacation', width: '236px' }, { label: 'Cause déterminée par analyse des entrées', width: '1fr' }])}
            ${unfilled.map((slot) => {
              const cause = unfilledCause(slot)
              const noVolunteer = cause.indexOf('Aucune personne') === 0
              return `<div style="display:grid;grid-template-columns:236px 1fr;align-items:flex-start;gap:0;border-bottom:1px solid ${T.gray100};padding:12px 20px">
                <span style="display:flex;align-items:flex-start;gap:10px;padding-right:16px">
                  <span style="width:3px;height:32px;flex-shrink:0;border-radius:2px;background:${CENTERS[slot.center].color}"></span>
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:13px;font-weight:600;color:${T.text}">${CENTERS[slot.center].label} · ${slot.modality}</span>
                    <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2}">${slotWhen(slot)}</span>
                  </span>
                </span>
                <span>
                  <span style="display:block;margin-bottom:4px">${badge(noVolunteer ? 'Aucun volontaire' : 'Toutes déjà affectées', noVolunteer ? 'danger' : 'warning')}</span>
                  <span style="display:block;font-size:13px;color:${T.gray600};line-height:1.45">${cause}</span>
                </span>
              </div>`
            }).join('')}
            ${footnote('RG-37 — la cause est déterminée par analyse des données d’entrée, jamais par interprétation du solveur.')}
          `}
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead('Comparaison avec la version précédente', segmented([{ id: 'v1', label: 'vs v1' }, { id: 'v2', label: 'vs v2' }, { id: 'none', label: 'Aucune' }], S.diffVersion, 'diff-version'))}
          <div style="padding:8px 0">
            ${diff.length === 0 ? `<p style="margin:0;padding:12px 20px;font-size:13px;color:${T.text3}">Aucune comparaison affichée.</p>` : diff.map((change) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid ${T.gray50}">
              ${icon(change.glyph, change.color, 15)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:13px;color:${T.text}">${change.title}</span>
                <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2}">${change.detail}</span>
              </span>
              ${badge(change.tag, change.tone)}
            </div>`).join('')}
            ${diff.length ? `<p style="margin:0;padding:12px 20px 4px;font-size:12px;color:${T.text3}">Ces différences seront reprises telles quelles dans l’email de republication (RG-25).</p>` : ''}
          </div>
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:380px;flex-shrink:0">
        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Métriques de sortie</h3>
          <div style="display:flex;flex-direction:column;gap:11px">
            ${metrics.map((metric) => `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid ${T.gray50}">
              <span style="flex:1;min-width:0;font-size:13px;color:${T.gray600};line-height:1.35">${metric.label}</span>
              <span style="flex-shrink:0;font-size:15px;font-weight:600;color:${metric.color};font-variant-numeric:tabular-nums">${metric.value}</span>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Répartition obtenue</h3>
          <div style="display:flex;flex-direction:column;gap:9px">
            ${ranked.map((row) => `<div style="display:flex;align-items:center;gap:10px">
              <span style="width:92px;flex-shrink:0;font-size:13px;color:${T.gray700};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.person.name}</span>
              ${bar(Math.round((row.count / Math.max(1, highest.count)) * 100) + '%', row.person.coordinator ? T.navy500 : Math.abs(row.count - target) >= 2 ? T.warn500 : T.navy300, 16)}
              <span style="width:20px;flex-shrink:0;text-align:right;font-size:13px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${row.count}</span>
            </div>`).join('')}
          </div>
          <p style="margin:12px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Le nombre de vacations attribuées ne peut jamais dépasser le nombre de disponibilités déclarées : c’est la contrainte C1, garantie par construction du modèle.</p>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Reproductibilité</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${[['Empreinte des entrées', 'a3f9…c142'], ['Graine', '4271'], ['Temps de calcul', '2 843 ms'], ['Statut', 'SUCCESS, optimum']].map((row) => `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
              <span style="flex-shrink:0;font-size:13px;color:${T.text2}">${row[0]}</span>
              <span style="flex:1;min-width:0;text-align:right;font-size:12px;color:${T.gray700};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis">${row[1]}</span>
            </div>`).join('')}
          </div>
          <div style="display:flex;align-items:flex-start;gap:8px;margin-top:14px;border-top:1px solid ${T.gray100};padding-top:12px">
            ${icon('check', T.ok700, 15)}
            <span style="flex:1;font-size:12px;color:${T.text2};line-height:1.45">Deux exécutions partageant cette empreinte, ces poids et cette graine produisent exactement le même planning (RG-36, critère A04).</span>
          </div>
        </section>
      </aside>
    </div>`
}
