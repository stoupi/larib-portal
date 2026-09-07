/* Doctor-facing views. The signed-in person comes from S.role, and the
   availability grid writes into the same store the coordinator reads. */

const AVAIL_SKINS = {
  AVAILABLE: { label: 'Disponible', short: 'Dispo', bg: T.surface, border: T.okBorder, pillBg: T.okBg, pillFg: T.ok700, glyph: 'check' },
  PREFERRED: { label: 'Prioritaire', short: 'Priorité', bg: T.surface, border: T.infoBorder, pillBg: T.infoBg, pillFg: T.info, glyph: 'star' },
  UNAVAILABLE: { label: 'Indisponible', short: 'Indispo', bg: T.gray25, border: T.line, pillBg: T.gray100, pillFg: T.text2, glyph: 'minus' },
  NONE: { label: 'Sans réponse', short: 'À remplir', bg: '#fffdf9', border: T.warnBorder, pillBg: T.warnBg, pillFg: T.warnText, glyph: 'clockAlert' }
}

VIEWS.dispos = () => {
  const me = viewer()
  const counts = { AVAILABLE: 0, PREFERRED: 0, UNAVAILABLE: 0, NONE: 0 }
  SLOTS.forEach((slot) => { counts[availabilityOf(me.id, slot.id)] += 1 })

  const population = S.role === 'FELLOW' ? FELLOWS : SENIORS
  const average = Math.round((SLOTS.length / population.length) * 10) / 10
  const submitted = S.submissions[me.id] === 'SUBMITTED'

  const weekSlots = SLOTS.filter((slot) => slot.week === S.week)
  const dayNumbers = weekSlots.reduce((list, slot) => (list.indexOf(slot.dayNumber) === -1 ? list.concat(slot.dayNumber) : list), []).sort((left, right) => left - right)

  const renderSlot = (slot) => {
    const status = availabilityOf(me.id, slot.id)
    const skin = AVAIL_SKINS[status]
    return `<div data-act="cycle" data-arg="${slot.id}" style="display:flex;align-items:center;gap:10px;min-height:44px;border:1px solid ${skin.border};border-left:3px solid ${CENTERS[slot.center].color};border-radius:10px;background:${skin.bg};padding:7px 10px;cursor:pointer">
      <span style="display:flex;flex-direction:column;flex:1;min-width:0">
        <span style="font-size:12px;font-weight:600;color:${T.gray700}">${CENTERS[slot.center].label}</span>
        <span style="font-size:11px;color:${T.text2}">${slot.modality}</span>
      </span>
      <span style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;border-radius:999px;background:${skin.pillBg};padding:3px 9px 3px 6px">
        ${icon(skin.glyph, skin.pillFg, 13)}
        <span style="font-size:11px;font-weight:600;color:${skin.pillFg}">${skin.label}</span>
      </span>
    </div>`
  }

  const quickActions = [
    { label: 'Tout marquer disponible', glyph: 'check', act: 'bulk', arg: 'all|AVAILABLE' },
    { label: 'Tout marquer indisponible', glyph: 'minus', act: 'bulk', arg: 'all|UNAVAILABLE' },
    { label: 'Tous les matins disponibles', glyph: 'sun', act: 'bulk', arg: 'morning|AVAILABLE' },
    { label: 'Bergère indisponible sur le mois', glyph: 'shield', act: 'bulk', arg: 'BERGERE|UNAVAILABLE' },
    { label: 'Tout le scanner en priorité', glyph: 'star', act: 'bulk', arg: 'Scanner|PREFERRED' }
  ]

  return `
    ${pageHeader(
      'Mes disponibilités — Octobre 2026',
      'Recueil ouvert jusqu’au 15 septembre à 23h59. Vous pouvez revenir modifier votre saisie autant de fois que nécessaire.',
      button({ label: 'Vue liste', variant: 'outline', icon: 'filter', act: 'toast', arg: 'La vue liste triable est prévue pour la saisie rapide sur téléphone.' })
    )}

    <section style="${CARD};display:flex;align-items:center;gap:20px;padding:16px 24px;margin-bottom:16px">
      ${[
        { value: counts.AVAILABLE, label: 'déclarées disponibles', bg: T.okBg, fg: T.ok700 },
        { value: counts.PREFERRED, label: 'souhaitées en priorité', bg: T.infoBg, fg: T.info },
        { value: counts.UNAVAILABLE, label: 'déclarées indisponibles', bg: T.gray100, fg: T.gray600 },
        { value: counts.NONE, label: 'encore sans réponse', bg: T.warnBg, fg: T.warnText }
      ].map((tally) => `<div style="display:flex;align-items:center;gap:12px;padding-right:20px;border-right:1px solid ${T.gray100}">
        <span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:${tally.bg};color:${tally.fg};font-size:15px;font-weight:700;font-variant-numeric:tabular-nums">${tally.value}</span>
        <span style="font-size:13px;color:${T.gray600};line-height:1.35;max-width:116px">${tally.label}</span>
      </div>`).join('')}
      <div style="flex:1;min-width:0"></div>
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:${T.ok700}">${icon('check', T.ok700, 15)}Enregistré automatiquement</span>
        ${button({ label: submitted ? 'Déclaration validée' : 'Valider ma déclaration', variant: submitted ? 'default' : 'primary', act: 'submit', style: submitted ? 'background:' + T.ok700 : '' })}
      </div>
    </section>

    <section style="display:flex;align-items:flex-start;gap:12px;border:1px solid ${T.warnBorder};border-radius:16px;background:${T.warnBg};padding:14px 20px;margin-bottom:20px">
      <span style="flex-shrink:0;margin-top:1px">${icon('alert', T.warnText, 18)}</span>
      <div style="flex:1;min-width:0">
        <p style="margin:0;font-size:14px;font-weight:500;color:${T.warnText}">Une vacation laissée sans réponse vaut indisponibilité.</p>
        <p style="margin:3px 0 0;font-size:13px;color:${T.warn700};line-height:1.45">Aucune vacation ne pourra vous être attribuée en dehors des créneaux que vous aurez déclarés disponibles. ${
          counts.NONE === 0 ? 'Toutes les vacations du mois ont reçu une réponse.' : 'Il vous reste ' + plural(counts.NONE, 'vacation') + ' sans réponse.'
        }</p>
      </div>
    </section>

    <div style="display:flex;gap:20px;align-items:flex-start">
      <section style="${CARD};flex:1;min-width:0;overflow:hidden">
        ${sectionHead('Octobre 2026 — ' + plural(SLOTS.length, 'vacation') + ' proposées', weekSegments('set-week'))}
        ${tableHead([{ label: 'Jour', width: '132px' }, { label: 'Matin', width: '1fr' }, { label: 'Après-midi', width: '1fr' }])}
        ${dayNumbers.map((dayNumber) => {
          const daySlots = weekSlots.filter((slot) => slot.dayNumber === dayNumber)
          const morning = daySlots.filter((slot) => slot.halfDay === 'MORNING')
          const afternoon = daySlots.filter((slot) => slot.halfDay === 'AFTERNOON')
          const allAvailable = daySlots.every((slot) => availabilityOf(me.id, slot.id) === 'AVAILABLE')
          return `<div style="display:grid;grid-template-columns:132px 1fr 1fr;gap:0;border-bottom:1px solid ${T.gray100};padding:12px 20px">
            <div style="padding-right:12px">
              <p style="margin:0;font-size:14px;font-weight:600;color:${T.text};text-transform:capitalize">${WEEKDAYS[daySlots[0].weekday]}</p>
              <p style="margin:1px 0 0;font-size:13px;color:${T.text2}">${dayNumber === 1 ? '1er' : dayNumber} octobre</p>
              <button type="button" data-act="bulk-day" data-arg="${dayNumber}|${allAvailable ? 'UNAVAILABLE' : 'AVAILABLE'}" style="margin-top:6px;border:1px solid ${T.line};border-radius:8px;background:${T.surface};padding:4px 8px;font-family:inherit;font-size:11px;font-weight:500;color:${T.gray600};cursor:pointer">Toute la journée</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;padding-right:10px">${morning.length ? morning.map(renderSlot).join('') : `<span style="font-size:12px;color:${T.gray300}">—</span>`}</div>
            <div style="display:flex;flex-direction:column;gap:6px">${afternoon.length ? afternoon.map(renderSlot).join('') : `<span style="font-size:12px;color:${T.gray300}">—</span>`}</div>
          </div>`
        }).join('')}
        <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;font-size:12px;color:${T.text2}">
          <span>Un clic fait défiler les trois états :</span>
          ${['UNAVAILABLE', 'AVAILABLE', 'PREFERRED'].map((key) => {
            const skin = AVAIL_SKINS[key]
            return `<span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:${skin.pillBg};padding:3px 9px 3px 6px">${icon(skin.glyph, skin.pillFg, 13)}<span style="font-size:11px;font-weight:600;color:${skin.pillFg}">${skin.label}</span></span>`
          }).join('')}
        </div>
      </section>

      <aside style="display:flex;flex-direction:column;gap:16px;width:340px;flex-shrink:0">
        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Actions rapides</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${quickActions.map((action) => `<button type="button" data-act="${action.act}" data-arg="${action.arg}" style="display:flex;align-items:center;gap:10px;min-height:40px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:8px 12px;font-family:inherit;font-size:13px;font-weight:500;color:${T.gray700};cursor:pointer;text-align:left">
              ${icon(action.glyph, T.text2, 16)}<span style="flex:1;min-width:0">${action.label}</span>
            </button>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:${T.text}">Pour calibrer votre réponse</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
              <span style="font-size:13px;color:${T.text2}">Vacations du mois</span>
              <span style="font-size:15px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${SLOTS.length}</span>
            </div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
              <span style="font-size:13px;color:${T.text2}">${S.role === 'FELLOW' ? 'Fellows sollicités' : 'Seniors sollicités'}</span>
              <span style="font-size:15px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${population.length}</span>
            </div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-top:1px solid ${T.gray100};padding-top:10px">
              <span style="font-size:13px;color:${T.text2}">Moyenne par personne</span>
              <span style="font-size:15px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${String(average).replace('.', ',')}</span>
            </div>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Information purement indicative (RG-22). Déclarer davantage de disponibilités ne vous engage pas à travailler davantage.</p>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:${T.text}">Mot au coordinateur</h3>
          <div style="border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:10px 12px;min-height:76px">
            <p style="margin:0;font-size:13px;color:${T.text2};line-height:1.5">Je suis en congés du 12 au 16 octobre. Je peux dépanner le 30 après-midi si vous êtes bloqués.</p>
          </div>
          <div data-act="decline" style="display:flex;align-items:flex-start;gap:10px;margin-top:14px;border:1px solid ${S.submissions[me.id] === 'DECLINED_MONTH' ? T.dangerBorder : T.line};border-radius:10px;background:${S.submissions[me.id] === 'DECLINED_MONTH' ? T.dangerBg : T.surface};padding:10px 12px;cursor:pointer">
            <span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;margin-top:1px;border:1.5px solid ${S.submissions[me.id] === 'DECLINED_MONTH' ? T.dangerText : T.gray300};border-radius:5px;background:${S.submissions[me.id] === 'DECLINED_MONTH' ? T.dangerText : T.surface}">${S.submissions[me.id] === 'DECLINED_MONTH' ? icon('check', '#fff', 12) : ''}</span>
            <span style="flex:1;min-width:0;font-size:13px;color:${T.gray700};line-height:1.45">Je ne suis disponible sur aucun créneau ce mois-ci</span>
          </div>
        </section>
      </aside>
    </div>`
}

VIEWS.monmois = () => {
  const me = viewer()
  const isFellow = S.role === 'FELLOW'
  const plan = isFellow ? S.fellowAssignments : S.assignments
  const mine = SLOTS.filter((slot) => plan[slot.id] === me.id)

  const tests = {
    all: () => true,
    irm: (slot) => slot.modality === 'IRM',
    ct: (slot) => slot.modality === 'Scanner',
    pezel: (slot) => S.assignments[slot.id] === 'tp'
  }
  const visible = mine.filter(tests[S.monthFilter] || tests.all)

  const irm = mine.filter((slot) => slot.modality === 'IRM').length
  const withCoordinator = mine.filter((slot) => S.assignments[slot.id] === 'tp').length

  const mentorCounts = {}
  mine.forEach((slot) => {
    const seniorId = S.assignments[slot.id]
    if (!seniorId || seniorId === me.id) return
    mentorCounts[seniorId] = (mentorCounts[seniorId] || 0) + 1
  })
  const mentors = Object.keys(mentorCounts)
    .map((seniorId) => ({ person: SENIORS.find((entry) => entry.id === seniorId), count: mentorCounts[seniorId] }))
    .sort((left, right) => right.count - left.count)
  const mentorPeak = mentors.length ? mentors[0].count : 1

  const next = mine[0]
  const population = isFellow ? FELLOWS : SENIORS
  const populationAverage = Math.round((Object.keys(plan).filter((key) => plan[key]).length / population.length) * 10) / 10

  const summary = [
    { label: 'Vacations du mois', value: mine.length, detail: 'moyenne de la population : ' + String(populationAverage).replace('.', ','), glyph: 'calendar' },
    { label: 'IRM cardiaque', value: irm, detail: 'sur ' + mine.length + ' vacations', glyph: 'heart' },
    { label: 'Scanner cardiaque', value: mine.length - irm, detail: 'sur ' + mine.length + ' vacations', glyph: 'ct' },
    { label: isFellow ? 'Avec le Dr Pezel' : 'Doubles vacations', value: isFellow ? withCoordinator : '—', detail: isFellow ? 'objectif F3, équité d’encadrement' : 'réservé au coordinateur', glyph: 'users' }
  ]

  return `
    ${pageHeader(
      'Mon mois — Octobre 2026',
      S.published
        ? 'Planning publié en version ' + S.planVersion + '. Les échanges entre pairs sont ouverts jusqu’à la veille de chaque vacation.'
        : 'Le planning n’est pas encore publié. Ce que vous voyez est la proposition en cours de revue par le coordinateur.',
      button({ label: 'Exporter en PDF', variant: 'outline', icon: 'download', act: 'toast', arg: 'Un PDF paysage d’une page serait produit.' }) +
      button({ label: 'Proposer un échange', icon: 'swap', nav: 'echanges' })
    )}

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
          ${summary.map((stat) => `<div style="${CARD};padding:16px 18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${icon(stat.glyph, T.navy500, 16)}<p style="margin:0;font-size:12px;font-weight:500;color:${T.text2}">${stat.label}</p></div>
            <p style="margin:0;font-size:26px;font-weight:700;color:${T.text};line-height:1;font-variant-numeric:tabular-nums">${stat.value}</p>
            <p style="margin:5px 0 0;font-size:12px;color:${T.text3};line-height:1.35">${stat.detail}</p>
          </div>`).join('')}
        </div>

        <section style="${CARD};overflow:hidden">
          ${sectionHead('Mes vacations', segmented([
            { id: 'all', label: 'Toutes' },
            { id: 'irm', label: 'IRM' },
            { id: 'ct', label: 'Scanner' },
            { id: 'pezel', label: 'Avec Dr Pezel' }
          ], S.monthFilter, 'month-filter'))}
          ${mine.length === 0 ? `<p style="margin:0;padding:24px 20px;font-size:14px;color:${T.text2}">Aucune vacation ce mois-ci. Vos disponibilités déclarées n’ont pas permis d’affectation, ou vous n’avez pas encore répondu.</p>` : `
            ${tableHead([
              { label: 'Date', width: '196px' },
              { label: 'Vacation', width: '1fr' },
              { label: isFellow ? 'Senior sur le créneau' : 'Fellow sur le créneau', width: '208px' },
              { label: 'Statut', width: '116px', align: 'right' }
            ])}
            ${visible.map((slot) => {
              const partnerId = isFellow ? S.assignments[slot.id] : S.fellowAssignments[slot.id]
              const partner = partnerId ? (isFellow ? SENIORS : FELLOWS).find((entry) => entry.id === partnerId) : null
              const isNext = next && slot.id === next.id
              return `<div style="display:grid;grid-template-columns:196px 1fr 208px 116px;align-items:center;gap:0;border-bottom:1px solid ${T.gray100};padding:12px 20px;background:${isNext ? T.gray25 : T.surface}">
                <span style="padding-right:12px">
                  <span style="display:block;font-size:14px;font-weight:500;color:${T.text};text-transform:capitalize">${WEEKDAYS[slot.weekday]} ${slot.dayNumber === 1 ? '1er' : slot.dayNumber} octobre</span>
                  <span style="display:block;font-size:12px;color:${T.text2}">${slot.halfDay === 'MORNING' ? 'matin' : 'après-midi'}</span>
                </span>
                <span style="display:flex;align-items:center;gap:10px;padding-right:12px">
                  <span style="width:3px;height:26px;flex-shrink:0;border-radius:2px;background:${CENTERS[slot.center].color}"></span>
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:14px;color:${T.text}">${CENTERS[slot.center].label}</span>
                    <span style="display:block;font-size:12px;color:${T.text2}">${slot.modality} cardiaque</span>
                  </span>
                </span>
                <span style="display:flex;align-items:center;gap:9px;padding-right:12px">
                  ${partner ? avatar(partner.initials, partner.coordinator ? T.navy50 : T.gray100, partner.coordinator ? T.navy600 : T.gray600, 26) : ''}
                  <span style="flex:1;min-width:0;font-size:13px;color:${partner ? T.gray700 : T.text3};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${partner ? partner.name : 'personne affectée'}</span>
                </span>
                <span style="display:flex;justify-content:flex-end">${badge(isNext ? 'À venir' : S.published ? 'Publiée' : 'Proposition', isNext ? 'info' : S.published ? 'neutral' : 'warning')}</span>
              </div>`
            }).join('')}
            ${footnote(S.monthFilter === 'all'
              ? 'Les compteurs reflètent toujours la dernière version publiée, jamais une proposition non publiée (RG-30).'
              : plural(visible.length, 'vacation') + ' sur ' + mine.length + ' correspondent à ce filtre.')}
          `}
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:372px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px;border-left:4px solid ${T.navy500}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            ${icon('calendar', T.navy500, 18)}
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Abonnement calendrier</h3>
          </div>
          <p style="margin:0 0 12px;font-size:13px;color:${T.gray600};line-height:1.5">Un lien personnel et permanent, à importer une seule fois dans votre agenda. Il se met à jour tout seul à chaque publication et à chaque échange validé.</p>
          <div style="display:flex;align-items:center;gap:8px;border:1px solid ${T.line};border-radius:10px;background:${T.gray25};padding:9px 12px">
            <span style="flex:1;min-width:0;font-size:12px;color:${T.text2};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">…/planning/me/calendar.ics?t=8f21…</span>
            <button type="button" data-act="toast" data-arg="Lien copié. Ce flux ne contient que vos propres vacations." style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0;border:1px solid ${T.line};border-radius:8px;background:${T.surface};cursor:pointer;padding:0">${icon('copy', T.gray600, 14)}</button>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Ce flux ne contient que vos propres vacations.</p>
        </section>

        ${next ? `<section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Prochaine vacation</h3>
          <div style="border:1px solid ${T.infoBorder};border-radius:12px;background:${T.infoBg};padding:14px 16px">
            <p style="margin:0;font-size:13px;font-weight:600;color:${T.info};text-transform:capitalize">${slotWhen(next)}</p>
            <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:${T.text}">${CENTERS[next.center].label} · ${next.modality} cardiaque</p>
            ${(() => {
              const partnerId = isFellow ? S.assignments[next.id] : S.fellowAssignments[next.id]
              const partner = partnerId ? (isFellow ? SENIORS : FELLOWS).find((entry) => entry.id === partnerId) : null
              return partner ? `<p style="margin:4px 0 0;font-size:13px;color:${T.gray600}">Avec ${partner.name}.</p>` : ''
            })()}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            ${button({ label: 'Céder cette vacation', variant: 'outline', nav: 'echanges', style: 'flex:1;font-size:13px' })}
          </div>
        </section>` : ''}

        ${isFellow && mentors.length ? `<section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Mon encadrement ce mois-ci</h3>
          <div style="display:flex;flex-direction:column;gap:11px">
            ${mentors.map((mentor) => `<div style="display:flex;align-items:center;gap:10px">
              <span style="width:96px;flex-shrink:0;font-size:13px;font-weight:${mentor.person.coordinator ? 600 : 500};color:${T.gray700};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${mentor.person.name}</span>
              ${bar(Math.round((mentor.count / mentorPeak) * 100) + '%', mentor.person.coordinator ? T.navy500 : T.navy300, 16)}
              <span style="width:18px;flex-shrink:0;text-align:right;font-size:13px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${mentor.count}</span>
            </div>`).join('')}
          </div>
          <p style="margin:12px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Calculé par co-présence : vous et le senior êtes affectés à la même vacation, même date, même demi-journée, même centre, même modalité (RG-29).</p>
        </section>` : ''}

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Exports</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              { label: 'Mes vacations en PDF', detail: 'Une page, format paysage', glyph: 'file', color: T.dangerText },
              { label: 'Planning complet de l’équipe', detail: 'Toutes les vacations d’octobre 2026', glyph: 'sheet', color: T.ok700 },
              { label: 'Fichier calendrier ICS', detail: 'Import ponctuel, sans mise à jour automatique', glyph: 'download', color: T.navy500 }
            ].map((item) => `<button type="button" data-act="toast" data-arg="${esc(item.label + ' — export non simulé dans le prototype.')}" style="display:flex;align-items:center;gap:10px;min-height:44px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:10px 12px;font-family:inherit;cursor:pointer;text-align:left">
              ${icon(item.glyph, item.color, 16)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${item.label}</span>
                <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2}">${item.detail}</span>
              </span>
            </button>`).join('')}
          </div>
        </section>
      </aside>
    </div>`
}
