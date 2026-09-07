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

  const shown = scopedSlots(SLOTS, S.week)

  const renderSlot = (slot) => {
    const status = availabilityOf(me.id, slot.id)
    const skin = AVAIL_SKINS[status]
    const pill = `<span style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;border-radius:999px;background:${skin.pillBg};padding:4px 10px 4px 7px">
      ${icon(skin.glyph, skin.pillFg, 13)}
      <span style="font-size:11px;font-weight:600;color:${skin.pillFg}">${skin.label}</span>
    </span>`
    return slotRow(slot, { trailing: pill, bg: skin.bg, border: skin.border, act: 'cycle', arg: slot.id })
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
      'Mes disponibilités — ' + TARGET.label,
      'Vous préparez le mois prochain. Recueil ouvert jusqu’au 15 septembre à 23h59, modifiable autant de fois que nécessaire.',
      button({ label: 'Vue liste', variant: 'outline', icon: 'filter', act: 'toast', arg: 'La vue liste triable est prévue pour la saisie rapide sur téléphone.' })
    )}

    ${workflowBanner('dispos')}

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
        ${sectionHead(
          TARGET.label + ' — ' + plural(SLOTS.length, 'vacation') + ' proposées',
          calendarControls({ weeks: WEEKS, week: S.week }, 'set-week', 'set-scope', plural(shown.length, 'vacation') + ' affichées')
        )}
        ${halfDayHeads('180px')}
        ${calendarRows(shown, {
          renderSlot,
          rowBg: (daySlots, position) => (position % 2 ? T.gray25 : T.surface),
          dayExtra: (daySlots) => {
            const allAvailable = daySlots.every((slot) => availabilityOf(me.id, slot.id) === 'AVAILABLE')
            const open = daySlots.filter((slot) => isFree(availabilityOf(me.id, slot.id))).length
            return `<span style="font-size:12px;color:${open ? T.ok700 : T.text3}">${open ? plural(open, 'créneau') + ' retenu' + (open > 1 ? 's' : '') : 'rien de retenu'}</span>
              <button type="button" data-act="bulk-day" data-arg="${daySlots[0].dayNumber}|${allAvailable ? 'UNAVAILABLE' : 'AVAILABLE'}" style="margin-top:2px;border:1px solid ${T.line};border-radius:8px;background:${T.surface};padding:5px 9px;font-family:inherit;font-size:11px;font-weight:500;color:${T.gray600};cursor:pointer;white-space:nowrap">${allAvailable ? 'Tout retirer' : 'Toute la journée'}</button>`
          }
        })}
        ${gridLegend(`<span style="display:inline-flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Un clic fait défiler</span>
          ${['UNAVAILABLE', 'AVAILABLE', 'PREFERRED'].map((key) => {
            const skin = AVAIL_SKINS[key]
            return `<span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:${skin.pillBg};padding:3px 9px 3px 6px">${icon(skin.glyph, skin.pillFg, 13)}<span style="font-size:11px;font-weight:600;color:${skin.pillFg}">${skin.label}</span></span>`
          }).join('')}
        </span>`)}
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
  const months = readableMonths()
  const chosen = months.some((month) => month.id === S.monthView) ? S.monthView : months[0].id
  const plan = planFor(chosen)
  const mine = plan.slots.filter((slot) => (isFellow ? plan.fellows : plan.seniors)[slot.id] === me.id)

  const irm = mine.filter((slot) => slot.modality === 'IRM').length
  const withCoordinator = mine.filter((slot) => plan.seniors[slot.id] === 'tp').length
  const population = isFellow ? FELLOWS : SENIORS
  const held = plan.slots.filter((slot) => (isFellow ? plan.fellows : plan.seniors)[slot.id]).length
  const average = Math.round((held / population.length) * 10) / 10

  const mentorCounts = {}
  mine.forEach((slot) => {
    const seniorId = plan.seniors[slot.id]
    if (!seniorId || seniorId === me.id) return
    mentorCounts[seniorId] = (mentorCounts[seniorId] || 0) + 1
  })
  const mentors = Object.keys(mentorCounts)
    .map((seniorId) => ({ person: SENIORS.find((entry) => entry.id === seniorId), count: mentorCounts[seniorId] }))
    .sort((left, right) => right.count - left.count)
  const mentorPeak = mentors.length ? mentors[0].count : 1

  /* The next one still ahead of today, else simply the first of the month. */
  const upcoming = mine.filter((slot) => slot.date >= TODAY)
  const next = upcoming[0] || mine[0]

  const summary = [
    { label: 'Mes vacations', value: mine.length, detail: 'moyenne de la population : ' + String(average).replace('.', ','), glyph: 'calendar' },
    { label: 'IRM cardiaque', value: irm, detail: 'sur ' + mine.length + ' vacations', glyph: 'heart' },
    { label: 'Scanner cardiaque', value: mine.length - irm, detail: 'sur ' + mine.length + ' vacations', glyph: 'ct' },
    isFellow
      ? { label: 'Avec le Dr Pezel', value: withCoordinator, detail: 'objectif F3, équité d’encadrement', glyph: 'users' }
      : { label: 'À venir', value: upcoming.length, detail: 'sur ' + mine.length + ' ce mois-ci', glyph: 'clock' }
  ]

  const holderOf = (slot) => (isFellow ? plan.fellows : plan.seniors)[slot.id]
  const onlyMine = S.monthFilter !== 'all'
  const inScope = scopedSlots(plan.slots, plan.week)
  const weekSlots = onlyMine ? inScope.filter((slot) => holderOf(slot) === me.id) : inScope
  const weekAct = chosen === 'sep' ? 'set-live-week' : 'set-week'

  const renderSlot = (slot) => {
    const ownerId = (isFellow ? plan.fellows : plan.seniors)[slot.id]
    const isMine = ownerId === me.id
    const partnerId = isFellow ? plan.seniors[slot.id] : plan.fellows[slot.id]
    const partner = partnerId ? (isFellow ? SENIORS : FELLOWS).find((entry) => entry.id === partnerId) : null
    const owner = ownerId ? population.find((entry) => entry.id === ownerId) : null
    const past = slot.date < TODAY

    if (isMine) {
      /* Coral is the portal's identity accent — the same one on your avatar.
         Green is reserved for success, which a vacation is not. */
      const swappable = plan.published && !past
      const trailing = `<span style="display:inline-flex;align-items:center;gap:7px;flex-shrink:0">
        ${partner ? avatar(partner.initials, partner.coordinator ? T.navy50 : T.gray100, partner.coordinator ? T.navy600 : T.gray600, 26) : ''}
        <span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:${past ? T.gray100 : T.coral100};padding:4px 10px 4px 7px">
          ${icon(past ? 'check' : 'star', past ? T.text2 : T.coral700, 13)}
          <span style="font-size:11px;font-weight:600;color:${past ? T.text2 : T.coral700}">${past ? 'Faite' : 'Ma vacation'}</span>
        </span>
        ${swappable ? `<span title="Céder ou échanger cette vacation" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid ${T.coral200};border-radius:9px;background:${T.surface}">${icon('swap', T.coral600, 15)}</span>` : ''}
      </span>`
      return slotRow(slot, {
        trailing,
        bg: past ? T.gray25 : T.coral50,
        border: past ? T.line : T.coral200,
        secondary: partner ? 'avec ' + partner.name : null,
        /* Any vacation is actionable, not just the next one. */
        act: swappable ? 'swap-from' : undefined,
        arg: swappable ? slot.id : undefined
      })
    }

    /* Everyone else's vacations stay visible but recede, so the month reads
       as a team calendar without competing with your own. */
    const trailing = `<span style="display:inline-flex;align-items:center;gap:7px;flex-shrink:0;opacity:0.75">
      ${owner ? avatar(owner.initials, T.gray100, T.text3, 24) : icon('minus', T.gray300, 14)}
      <span style="font-size:12px;color:${T.text3};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${owner ? owner.name : 'non pourvue'}</span>
    </span>`
    return slotRow(slot, { trailing, bg: T.surface, border: T.gray100, subdued: true })
  }

  return `
    ${pageHeader(
      'Mon mois — ' + plan.period.label,
      plan.id === 'sep'
        ? 'Planning publié le ' + plan.publishedOn + ' en version ' + plan.version + '. Les échanges sont ouverts jusqu’à la veille de chaque vacation.'
        : (plan.published
          ? 'Planning publié en version ' + plan.version + '. Les échanges sont ouverts.'
          : 'Le planning n’est pas encore publié : voici la proposition en cours de revue.'),
      button({ label: 'Exporter en PDF', variant: 'outline', icon: 'download', act: 'toast', arg: 'Un PDF paysage d’une page serait produit.' }) +
      button({ label: 'Proposer un échange', icon: 'swap', nav: 'echanges' })
    )}

    ${workflowBanner('monmois')}

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      ${segmented(months.map((month) => ({ id: month.id, label: month.label })), chosen, 'set-month')}
      <span style="font-size:13px;color:${T.text2}">${months.find((month) => month.id === chosen).note === 'mois en cours'
        ? 'le mois que vous travaillez en ce moment'
        : 'le mois que vous préparez'}</span>
    </div>

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
          ${sectionHead(
            plan.period.label + ' — ' + plural(mine.length, 'vacation') + ' pour moi',
            `<span style="display:flex;align-items:center;gap:12px">
              ${segmented([{ id: 'mine', label: 'Mes vacations' }, { id: 'all', label: 'Tout le mois' }], onlyMine ? 'mine' : 'all', 'month-filter')}
              ${calendarControls(plan, weekAct, 'set-scope')}
            </span>`
          )}
          ${halfDayHeads('180px')}
          ${weekSlots.length === 0 ? `<div style="padding:36px 24px;text-align:center">
            <p style="margin:0;font-size:14px;font-weight:500;color:${T.text}">Aucune vacation pour vous ${isMonthScope() ? 'ce mois-ci' : 'cette semaine'}.</p>
            <p style="margin:6px 0 0;font-size:13px;color:${T.text2}">Passez à « Tout le mois » pour voir celles de l’équipe${isMonthScope() ? '' : ', ou changez de semaine'}.</p>
          </div>` : ''}
          ${calendarRows(weekSlots, {
            renderSlot,
            rowBg: (daySlots, position) =>
              daySlots[0].date.getTime() === TODAY.getTime() ? T.infoBg : position % 2 ? T.gray25 : T.surface,
            dayExtra: (daySlots) => {
              const mineHere = daySlots.filter((slot) => holderOf(slot) === me.id).length
              const today = daySlots[0].date.getTime() === TODAY.getTime()
              return `<span style="font-size:12px;color:${mineHere ? T.coral700 : T.text3}">${mineHere ? plural(mineHere, 'vacation') + ' pour moi' : 'rien pour moi'}</span>${today ? `<span style="font-size:11px;font-weight:600;color:${T.info}">aujourd’hui</span>` : ''}`
            }
          })}
          ${gridLegend(`<span style="display:inline-flex;align-items:center;gap:10px">
            <span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:${T.coral100};padding:3px 9px 3px 6px">${icon('star', T.coral700, 13)}<span style="font-size:11px;font-weight:600;color:${T.coral700}">Mes vacations</span></span>
            <span style="font-size:12px;color:${T.text3}">${onlyMine ? 'les autres sont masquées' : 'les autres restent visibles, en retrait'} · cliquez l’une des vôtres pour la céder ou l’échanger</span>
          </span>`)}
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:372px;flex-shrink:0">
        ${next ? `<section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">${next.date >= TODAY ? 'Prochaine vacation' : 'Première du mois'}</h3>
          <div style="border:1px solid ${T.infoBorder};border-radius:12px;background:${T.infoBg};padding:14px 16px">
            <p style="margin:0;font-size:13px;font-weight:600;color:${T.info};text-transform:capitalize">${slotWhen(next)}</p>
            <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:${T.text}">${CENTERS[next.center].label} · ${MODALITIES[next.modality].full}</p>
            ${(function () {
              const partnerId = isFellow ? plan.seniors[next.id] : plan.fellows[next.id]
              const partner = partnerId ? (isFellow ? SENIORS : FELLOWS).find((entry) => entry.id === partnerId) : null
              return partner ? `<p style="margin:4px 0 0;font-size:13px;color:${T.gray600}">Avec ${partner.name}.</p>` : ''
            })()}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            ${button({ label: 'Céder ou échanger celle-ci', variant: 'outline', icon: 'swap', act: 'swap-from', arg: next.id, style: 'flex:1;font-size:13px' })}
          </div>
        </section>` : ''}

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
        </section>

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
              { label: 'Planning complet de l’équipe', detail: 'Toutes les vacations de ' + plan.period.lower, glyph: 'sheet', color: T.ok700 },
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
