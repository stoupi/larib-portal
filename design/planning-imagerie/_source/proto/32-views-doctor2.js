/* Counters and peer swaps. */

VIEWS.compteurs = () => {
  const isFellow = S.role === 'FELLOW'
  const me = viewer()
  const population = isFellow ? FELLOWS : SENIORS
  /* RG-30: counters reflect the last published version, never a proposal —
     so they read September, not the October plan still under review. */
  const live = planFor('sep')
  const plan = isFellow ? live.fellows : live.seniors

  const monthRows = population.map((person) => {
    const mine = live.slots.filter((slot) => plan[slot.id] === person.id)
    const irm = mine.filter((slot) => slot.modality === 'IRM').length
    const morning = mine.filter((slot) => slot.halfDay === 'MORNING').length
    const withCoordinator = isFellow ? mine.filter((slot) => live.seniors[slot.id] === 'tp').length : 0
    const doubles = !isFellow && person.coordinator ? doubleShiftsIn(live.seniors, live.slots) : 0
    const byCenter = {}
    Object.keys(CENTERS).forEach((key) => { byCenter[key] = mine.filter((slot) => slot.center === key).length })
    return {
      person, total: mine.length, irm, ct: mine.length - irm, morning,
      afternoon: mine.length - morning, withCoordinator, doubles, byCenter,
      declared: declaredCount(person.id, live.slots)
    }
  })

  /* Yearly and rolling figures scale the live month, so the three tabs never
     contradict each other. */
  const factor = S.countersPeriod === 'year' ? 8.4 : S.countersPeriod === 'rolling' ? 12.6 : 1
  const scaleValue = (value) => (factor === 1 ? value : Math.round(value * factor))

  const rows = monthRows.map((row) => ({
    person: row.person,
    total: scaleValue(row.total),
    irm: scaleValue(row.irm),
    ct: scaleValue(row.ct),
    morning: scaleValue(row.morning),
    afternoon: scaleValue(row.afternoon),
    withCoordinator: scaleValue(row.withCoordinator),
    doubles: scaleValue(row.doubles),
    byCenter: row.byCenter,
    declared: scaleValue(row.declared)
  }))

  const active = rows.filter((row) => S.submissions[row.person.id] !== 'DECLINED_MONTH')
  const totals = active.map((row) => row.total)
  const target = Math.round((totals.reduce((sum, value) => sum + value, 0) / Math.max(1, active.length)) * 10) / 10
  const peak = Math.max.apply(null, totals.concat([1]))
  const spread = Math.max.apply(null, totals) - Math.min.apply(null, totals)

  const sorted = rows.slice().sort((left, right) => right.total - left.total)
  const mine = rows.find((row) => row.person.id === me.id) || rows[0]
  const rank = sorted.findIndex((row) => row.person.id === mine.person.id) + 1

  const averageIrm = active.reduce((sum, row) => sum + row.irm, 0) / Math.max(1, active.length)
  const averageCt = active.reduce((sum, row) => sum + row.ct, 0) / Math.max(1, active.length)

  const deltaOf = (value, reference) => {
    const gap = Math.round((value - reference) * 10) / 10
    return {
      text: (gap > 0 ? '+' : '') + String(gap).replace('.', ',') + ' vs moyenne',
      color: Math.abs(gap) < 1 ? T.text3 : gap > 0 ? T.info : T.warnText
    }
  }

  const totalDelta = deltaOf(mine.total, target)
  const irmDelta = deltaOf(mine.irm, averageIrm)
  const ctDelta = deltaOf(mine.ct, averageCt)

  const myStats = [
    { label: 'Vacations', value: mine.total, delta: totalDelta.text, color: totalDelta.color },
    { label: 'IRM cardiaque', value: mine.irm, delta: irmDelta.text, color: irmDelta.color },
    { label: 'Scanner cardiaque', value: mine.ct, delta: ctDelta.text, color: ctDelta.color },
    { label: 'Matin / après-midi', value: mine.morning + ' / ' + mine.afternoon, delta: 'réparti', color: T.text3 },
    isFellow
      ? { label: 'Avec le Dr Pezel', value: mine.withCoordinator, delta: 'objectif F3', color: T.text3 }
      : { label: 'Doubles vacations', value: mine.person.coordinator ? mine.doubles : '—', delta: mine.person.coordinator ? 'objectif S1' : 'réservé au coordinateur', color: T.text3 },
    { label: 'Créneaux déclarés disponibles', value: mine.declared, delta: mine.declared ? 'taux d’affectation ' + Math.round((mine.total / mine.declared) * 100) + ' %' : 'aucun', color: T.text3 },
    { label: 'Écart à la cible', value: (mine.total - target > 0 ? '+' : '') + String(Math.round((mine.total - target) * 10) / 10).replace('.', ','), delta: 'cible ' + String(target).replace('.', ','), color: T.text3 },
    { label: 'Rang dans la population', value: rank + 'e', delta: 'sur ' + population.length, color: T.text3 }
  ]

  const gapTone = (gap) => (Math.abs(gap) < 1 ? 'neutral' : gap > 0 ? 'info' : 'warning')

  const monthNames = ['oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.']
  const trendPeak = Math.max(1, Math.round(mine.total * 1.3))
  const trend = monthNames.map((label, position) => {
    const wobble = ((hash(label + me.id) % 40) - 20) / 100
    const mineValue = Math.max(0, Math.round(monthRows.find((row) => row.person.id === mine.person.id).total * (1 + wobble)))
    const averageValue = Math.max(0, Math.round(target / factor * (1 + wobble / 2)))
    return {
      label,
      mine: Math.round((mineValue / trendPeak) * 100),
      average: Math.round((averageValue / trendPeak) * 100),
      last: position === monthNames.length - 1
    }
  })

  const monthMine = monthRows.find((row) => row.person.id === mine.person.id)
  const breakdowns = [
    {
      title: 'Par modalité',
      rows: [
        { label: 'IRM cardiaque', value: monthMine.irm, color: T.navy500 },
        { label: 'Scanner', value: monthMine.ct, color: T.navy400 }
      ]
    },
    {
      title: 'Par centre',
      rows: Object.keys(CENTERS).map((key) => ({ label: CENTERS[key].label, value: monthMine.byCenter[key], color: CENTERS[key].color }))
    },
    {
      title: 'Par demi-journée',
      rows: [
        { label: 'Matin', value: monthMine.morning, color: T.gray500 },
        { label: 'Après-midi', value: monthMine.afternoon, color: T.gray400 }
      ]
    }
  ]
  const breakdownPeak = Math.max(1, monthMine.total)

  const debts = SENIORS.filter((person) => CARRY[person.id] !== 0)
    .map((person) => ({
      name: person.id === me.id ? person.name + ', vous' : person.name,
      value: CARRY[person.id] > 0 ? '+' + CARRY[person.id] + ' crédit' + (CARRY[person.id] > 1 ? 's' : '') : CARRY[person.id] + ' dette' + (CARRY[person.id] < -1 ? 's' : ''),
      tone: CARRY[person.id] > 0 ? 'success' : 'warning'
    }))

  return `
    ${pageHeader(
      'Compteurs et équité',
      isFellow
        ? 'Vous voyez les compteurs nominatifs de l’ensemble des fellows. C’est ce qui rend l’équité vérifiable par chacun.'
        : 'Vous voyez les compteurs nominatifs de l’ensemble des seniors. C’est ce qui rend l’équité vérifiable par chacun.',
      button({ label: 'Exporter', variant: 'outline', icon: 'download', act: 'toast', arg: 'Export tableur et PDF, réservé au coordinateur.' })
    )}

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      ${segmented([
        { id: 'month', label: live.period.label },
        { id: 'year', label: 'Cumul annuel' },
        { id: 'rolling', label: '12 mois glissants' }
      ], S.countersPeriod, 'counters-period')}
      <span style="font-size:13px;color:${T.text2}">${
        S.countersPeriod === 'month' ? 'planning publié de ' + live.period.lower + ', après échanges validés'
        : S.countersPeriod === 'year' ? 'cumul depuis le 1er janvier 2026'
        : 'douze derniers mois glissants'
      }</span>
    </div>

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="${CARD};padding:22px 24px;border-left:4px solid ${T.coral500}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            ${avatar(me.initials, T.coral500, '#fff', 32)}
            <h2 style="margin:0;flex:1;font-size:16px;font-weight:600;color:${T.text}">Mes compteurs</h2>
            <span style="font-size:13px;color:${T.text2}">${rank}e sur ${population.length} · écart ${mine.total - target > 0 ? '+' : ''}${String(Math.round((mine.total - target) * 10) / 10).replace('.', ',')}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">
            ${myStats.map((stat) => `<div style="border:1px solid ${T.gray100};border-radius:12px;background:${T.gray25};padding:13px 14px">
              <p style="margin:0;font-size:12px;color:${T.text2};line-height:1.3;min-height:31px">${stat.label}</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${T.text};line-height:1;font-variant-numeric:tabular-nums">${stat.value}</p>
              <p style="margin:4px 0 0;font-size:12px;font-weight:500;color:${stat.color}">${stat.delta}</p>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead(isFellow ? 'Tous les fellows' : 'Tous les seniors', `<span style="font-size:13px;color:${T.text2}">trié par écart à la moyenne · écart max ${spread}</span>`)}
          ${tableHead([
            { label: 'Personne', width: '1fr' },
            { label: 'Vacations', width: '208px' },
            { label: 'IRM', width: '72px', align: 'right' },
            { label: 'Scanner', width: '76px', align: 'right' },
            { label: isFellow ? 'Dr Pezel' : 'Doubles', width: '84px', align: 'right' },
            { label: 'Écart', width: '92px', align: 'right' }
          ])}
          ${sorted.map((row) => {
            const gap = Math.round((row.total - target) * 10) / 10
            const isMe = row.person.id === me.id
            return `<div style="display:grid;grid-template-columns:1fr 208px 72px 76px 84px 92px;align-items:center;gap:0;border-bottom:1px solid ${T.gray100};padding:11px 20px;background:${isMe ? '#fff8fa' : T.surface}">
              <span style="display:flex;align-items:center;gap:10px;min-width:0;padding-right:12px">
                ${avatar(row.person.initials, isMe ? T.coral500 : T.gray100, isMe ? '#fff' : T.gray600)}
                <span style="flex:1;min-width:0">
                  <span style="display:block;font-size:14px;font-weight:${isMe ? 600 : 500};color:${T.text}">${row.person.name}</span>
                  <span style="display:block;font-size:12px;color:${T.text3}">${isMe ? 'vous' : row.person.coordinator ? 'coordinateur' : plural(row.declared, 'créneau') + ' déclarés'}</span>
                </span>
              </span>
              <span style="display:flex;align-items:center;gap:10px;padding-right:20px">
                ${bar(Math.round((row.total / peak) * 100) + '%', isMe ? T.coral500 : row.person.coordinator ? T.navy500 : T.navy300, 18, Math.round((target / peak) * 100) + '%')}
                <span style="width:24px;flex-shrink:0;text-align:right;font-size:14px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${row.total}</span>
              </span>
              <span style="text-align:right;font-size:13px;color:${T.gray600};font-variant-numeric:tabular-nums">${row.irm}</span>
              <span style="text-align:right;font-size:13px;color:${T.gray600};font-variant-numeric:tabular-nums">${row.ct}</span>
              <span style="text-align:right;font-size:13px;color:${(isFellow ? row.withCoordinator : row.doubles) ? T.navy500 : T.gray300};font-variant-numeric:tabular-nums">${(isFellow ? row.withCoordinator : row.doubles) || '—'}</span>
              <span style="display:flex;justify-content:flex-end">${badge((gap > 0 ? '+' : '') + String(gap).replace('.', ','), gapTone(gap))}</span>
            </div>`
          }).join('')}
          ${footnote('Le trait gris marque la cible, plafonnée par le nombre de créneaux déclarés disponibles : une personne peu disponible n’accumule pas de dette pour des vacations qu’elle n’aurait de toute façon pas pu prendre (RG-35).')}
        </section>

        <section style="${CARD};padding:22px 24px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px">
            <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">Cumul mensuel sur douze mois</h2>
            <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:${T.text2}">
              <span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:3px;border-radius:2px;background:${T.coral500}"></span>Moi</span>
              <span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:3px;border-radius:2px;background:${T.gray300}"></span>Moyenne</span>
            </div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:10px;height:168px">
            ${trend.map((month) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0;height:100%">
              <span style="display:flex;align-items:flex-end;justify-content:center;gap:3px;flex:1;width:100%">
                <span style="width:45%;height:${month.mine}%;border-radius:4px 4px 0 0;background:${T.coral500}"></span>
                <span style="width:45%;height:${month.average}%;border-radius:4px 4px 0 0;background:${T.gray200}"></span>
              </span>
              <span style="font-size:11px;color:${month.last ? T.text : T.text3};white-space:nowrap">${month.label}</span>
            </div>`).join('')}
          </div>
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:356px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Ma ventilation du mois</h3>
          <div style="display:flex;flex-direction:column;gap:18px">
            ${breakdowns.map((group) => `<div>
              <p style="margin:0 0 9px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">${group.title}</p>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${group.rows.map((row) => `<div style="display:flex;align-items:center;gap:10px">
                  <span style="width:92px;flex-shrink:0;font-size:13px;color:${T.gray700};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.label}</span>
                  ${bar(Math.round((row.value / breakdownPeak) * 100) + '%', row.color, 14)}
                  <span style="width:18px;flex-shrink:0;text-align:right;font-size:13px;font-weight:600;color:${T.text};font-variant-numeric:tabular-nums">${row.value}</span>
                </div>`).join('')}
              </div>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Taux d’affectation</h3>
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px">
            <span style="font-size:34px;font-weight:700;color:${T.text};line-height:1;font-variant-numeric:tabular-nums">${mine.declared ? Math.round((mine.total / mine.declared) * 100) : 0} %</span>
            <span style="font-size:13px;color:${T.text2}">de mes disponibilités</span>
          </div>
          <span style="display:block;height:8px;border-radius:999px;background:${T.gray100};overflow:hidden"><span style="display:block;height:8px;width:${mine.declared ? Math.round((mine.total / mine.declared) * 100) : 0}%;border-radius:999px;background:${T.coral500}"></span></span>
          <p style="margin:12px 0 0;font-size:12px;color:${T.text2};line-height:1.5">Vous avez déclaré ${plural(mine.declared, 'créneau')} disponibles et reçu ${plural(mine.total, 'vacation')}. Déclarer davantage augmente les options du moteur sans augmenter mécaniquement votre charge.</p>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Dettes et crédits reportés</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${debts.map((entry) => `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.gray100};border-radius:10px;background:${T.gray25};padding:9px 12px">
              <span style="flex:1;min-width:0;font-size:13px;color:${T.gray700}">${entry.name}</span>
              ${badge(entry.value, entry.tone)}
            </div>`).join('')}
          </div>
          <p style="margin:12px 0 0;font-size:12px;color:${T.text3};line-height:1.45">À la clôture d’une campagne, l’écart entre les vacations reçues et la cible du mois est enregistré. L’objectif G4 favorise les personnes créditrices le mois suivant (RG-34).</p>
        </section>
      </aside>
    </div>`
}

VIEWS.echanges = () => {
  const me = viewer()
  const isFellow = S.role === 'FELLOW'
  const population = isFellow ? FELLOWS : SENIORS
  /* Swaps only exist on a published plan, so they run on the live month. */
  const live = planFor('sep')
  const plan = isFellow ? live.fellows : live.seniors
  const mine = live.slots.filter((slot) => plan[slot.id] === me.id)

  const picked = mine.find((slot) => slot.id === S.swapShiftId) || mine[0]
  const isExchange = S.swapKind === 'EXCHANGE'

  const compatible = picked
    ? population.filter((person) => person.id !== me.id && isFree(availabilityOf(person.id, picked.id)))
    : []
  const excluded = picked ? population.filter((person) => person.id !== me.id && compatible.indexOf(person) === -1) : []

  const counts = {}
  population.forEach((person) => {
    counts[person.id] = live.slots.filter((slot) => plan[slot.id] === person.id).length
  })

  const candidates = compatible.slice(0, 4).map((person) => {
    const theirSlots = live.slots.filter((slot) => plan[slot.id] === person.id && isFree(availabilityOf(me.id, slot.id)))
    const offer = theirSlots[0]
    return { person, offer, hasOffer: Boolean(offer) }
  }).filter((entry) => (isExchange ? entry.hasOffer : true))

  const tabs = [
    { id: 'compose', label: 'Proposer', count: mine.length },
    { id: 'inbox', label: 'Reçues', count: 2 },
    { id: 'outbox', label: 'Envoyées', count: 4 }
  ]

  const inbox = (() => {
    const partner = population.find((person) => person.id !== me.id && counts[person.id] > 0)
    const theirs = partner ? live.slots.filter((slot) => plan[slot.id] === partner.id)[0] : null
    const ours = mine[1] || mine[0]
    if (!partner || !theirs || !ours) return []
    const giver = population.find((person) => person.id !== me.id && person.id !== partner.id && counts[person.id] > 0)
    const gift = giver ? live.slots.filter((slot) => plan[slot.id] === giver.id)[0] : null
    const entries = [{
      person: partner, kind: 'Permutation', when: 'hier 18:42',
      inSlot: theirs, outSlot: ours,
      message: '« Je dois être ailleurs sur ce créneau. Ça t’arrange ? »',
      expiry: 'Expire le 22 septembre, ou la veille de la vacation si elle survient avant.',
      impact: [
        { name: 'Vous', before: counts[me.id], after: counts[me.id] },
        { name: partner.name, before: counts[partner.id], after: counts[partner.id] }
      ]
    }]
    if (giver && gift) {
      entries.push({
        person: giver, kind: 'Cession', when: 'il y a 3 jours',
        inSlot: gift, outSlot: null,
        message: '',
        expiry: 'Expire demain.',
        impact: [
          { name: 'Vous', before: counts[me.id], after: counts[me.id] + 1 },
          { name: giver.name, before: counts[giver.id], after: counts[giver.id] - 1 }
        ]
      })
    }
    return entries
  })()

  const outbox = [
    { glyph: 'clock', color: T.warnText, title: 'Permutation proposée', detail: 'En attente de la réponse de votre pair', tag: 'En attente', tone: 'warning' },
    { glyph: 'check', color: T.ok700, title: 'Cession acceptée', detail: 'Soumise à la validation du coordinateur (PARAM-07)', tag: 'À valider', tone: 'info' },
    { glyph: 'check', color: T.ok700, title: 'Permutation validée', detail: 'Compteurs recalculés, nouvelle version de planning créée', tag: 'Validé', tone: 'success' },
    { glyph: 'x', color: T.gray500, title: 'Demande devenue sans objet', detail: 'Un autre échange validé portait sur la même affectation', tag: 'Caduque', tone: 'neutral' }
  ]

  const arrow = (before, after) => {
    if (after > before) return { glyph: 'arrowUp', color: T.info }
    if (after < before) return { glyph: 'arrowDown', color: T.warnText }
    return { glyph: 'arrowRight', color: T.gray300 }
  }

  return `
    ${pageHeader(
      'Échanges de vacations — ' + live.period.label,
      'Sur le planning publié du mois en cours. Ajustez entre pairs sans repasser par le coordinateur : tout est tracé et les compteurs se recalculent.',
      ''
    )}

    ${workflowBanner('echanges')}

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="display:flex;gap:4px;padding:4px;border-radius:12px;background:${T.gray100}">
        ${tabs.map((tab) => {
          const on = tab.id === S.swapTab
          return `<button type="button" data-act="swap-tab" data-arg="${tab.id}" style="display:flex;align-items:center;gap:8px;border:none;border-radius:8px;background:${on ? T.surface : 'transparent'};box-shadow:${on ? T.shadowXs : 'none'};padding:7px 14px;font-family:inherit;font-size:13px;font-weight:${on ? 600 : 500};color:${on ? T.text : T.text2};cursor:pointer">${tab.label}<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:999px;background:${on ? T.coral500 : T.gray200};padding:0 5px;font-size:11px;font-weight:600;color:${on ? '#fff' : T.text2}">${tab.count}</span></button>`
        }).join('')}
      </div>
      <span style="font-size:13px;color:${T.text2}">${
        S.swapTab === 'compose' ? 'Échanges ouverts jusqu’à la veille de chaque vacation.'
        : S.swapTab === 'inbox' ? plural(inbox.length, 'demande') + ' attend' + (inbox.length > 1 ? 'ent' : '') + ' votre réponse.'
        : '1 en attente, 1 à valider par le coordinateur.'
      }</span>
    </div>

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        ${S.swapTab === 'compose' ? (mine.length === 0 ? `<section style="${CARD};padding:24px"><p style="margin:0;font-size:14px;color:${T.text2}">Vous n’avez aucune vacation ce mois-ci : il n’y a rien à échanger.</p></section>` : `
          <section style="${CARD};overflow:hidden">
            <div style="padding:18px 20px;border-bottom:1px solid ${T.line}"><h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">1 · La vacation dont vous voulez vous défaire</h2></div>
            <div style="padding:8px 0">
              ${mine.map((slot) => {
                const on = slot.id === picked.id
                return `<div data-act="swap-shift" data-arg="${slot.id}" style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid ${T.gray50};background:${on ? T.coral50 : T.surface};cursor:pointer">
                  <span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;border:1.5px solid ${on ? T.coral500 : T.gray300};border-radius:999px;background:${T.surface}"><span style="width:8px;height:8px;border-radius:999px;background:${on ? T.coral500 : 'transparent'}"></span></span>
                  <span style="width:3px;height:28px;flex-shrink:0;border-radius:2px;background:${CENTERS[slot.center].color}"></span>
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${CENTERS[slot.center].label} · ${slot.modality} cardiaque</span>
                    <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2};text-transform:capitalize">${slotWhen(slot)}</span>
                  </span>
                  ${badge('Échangeable', 'neutral')}
                </div>`
              }).join('')}
            </div>
          </section>

          <section style="${CARD};overflow:hidden">
            <div style="padding:18px 20px;border-bottom:1px solid ${T.line}"><h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">2 · Le type de demande</h2></div>
            <div style="display:flex;gap:12px;padding:18px 20px">
              ${[
                { id: 'EXCHANGE', label: 'Permutation', glyph: 'swap', detail: 'Vous cédez cette vacation et en reprenez une de votre pair en contrepartie.' },
                { id: 'GIVEAWAY', label: 'Cession', glyph: 'arrowRight', detail: 'Vous cédez cette vacation sans contrepartie. Votre compteur baisse d’une unité.' }
              ].map((kind) => {
                const on = kind.id === S.swapKind
                return `<div data-act="swap-kind" data-arg="${kind.id}" style="display:flex;align-items:flex-start;gap:12px;flex:1;border:1px solid ${on ? T.coral500 : T.line};border-radius:12px;background:${on ? T.coral50 : T.surface};padding:14px 16px;cursor:pointer">
                  ${icon(kind.glyph, on ? T.coral600 : T.gray400, 18)}
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:14px;font-weight:600;color:${T.text}">${kind.label}</span>
                    <span style="display:block;margin-top:3px;font-size:13px;color:${T.text2};line-height:1.45">${kind.detail}</span>
                  </span>
                </div>`
              }).join('')}
            </div>
          </section>

          <section style="${CARD};overflow:hidden">
            ${sectionHead('3 · Contreparties compatibles', `<span style="font-size:13px;color:${T.text2}">${candidates.length} sur ${population.length - 1}</span>`)}
            <div style="padding:8px 0">
              ${candidates.length === 0 ? `<p style="margin:0;padding:16px 20px;font-size:13px;color:${T.text2};line-height:1.5">Aucune contrepartie compatible : personne n’a déclaré ce créneau disponible${isExchange ? ', ou aucune de leurs vacations ne tombe sur un créneau que vous avez vous-même déclaré' : ''}.</p>` : candidates.map((entry) => `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid ${T.gray50}">
                ${avatar(entry.person.initials, T.gray100, T.gray600, 34)}
                <span style="flex:1;min-width:0">
                  <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${entry.person.name}</span>
                  <span style="display:block;margin-top:2px;font-size:13px;color:${T.text2};line-height:1.4">${
                    isExchange && entry.offer
                      ? 'vous propose ' + CENTERS[entry.offer.center].label + ' · ' + entry.offer.modality + ', ' + slotWhen(entry.offer)
                      : 'reprendrait votre vacation sans contrepartie'
                  }</span>
                </span>
                <span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;width:176px">
                  <span style="font-size:12px;color:${T.text3}">après échange</span>
                  <span style="font-size:12px;color:${T.gray600}">vous ${counts[me.id]} → ${isExchange ? counts[me.id] : counts[me.id] - 1} · ${entry.person.initials} ${counts[entry.person.id]} → ${isExchange ? counts[entry.person.id] : counts[entry.person.id] + 1}</span>
                </span>
                ${button({ label: 'Proposer', act: 'toast', arg: 'Demande envoyée à ' + entry.person.name + '. Elle expirera dans 7 jours (PARAM-15).', style: 'flex-shrink:0;height:34px;font-size:13px' })}
              </div>`).join('')}
            </div>
            <div style="border-top:1px dashed ${T.line};padding:16px 20px">
              <p style="margin:0 0 10px;font-size:13px;color:${T.text2};line-height:1.5">${
                excluded.length === 0
                  ? 'Tout le monde a déclaré ce créneau disponible.'
                  : 'Ces personnes n’apparaissent pas : elles n’ont pas déclaré de disponibilité sur ' + CENTERS[picked.center].label + ' · ' + picked.modality + ' du ' + slotWhen(picked) + '.'
              }</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
                ${excluded.map((person) => `<span style="display:inline-flex;align-items:center;gap:5px;border:1px dashed ${T.line};border-radius:999px;background:${T.gray25};padding:3px 9px;font-size:12px;color:${T.text3}"><span style="width:5px;height:5px;border-radius:999px;background:${T.gray300}"></span>${person.name}</span>`).join('')}
              </div>
              <button type="button" data-act="toast" data-arg="Un email leur serait envoyé. Leur acceptation vaudrait déclaration de disponibilité, source SWAP." style="display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;border:1px solid ${T.warnBorder};border-radius:10px;background:${T.warnBg};padding:0 16px;font-family:inherit;font-size:13px;font-weight:500;color:${T.warnText};cursor:pointer">${icon('mail', 'currentColor', 16)}Solliciter une personne non disponible</button>
              <p style="margin:8px 0 0;font-size:12px;color:${T.text3};line-height:1.45">RG-27 — leur acceptation explicite vaut déclaration de disponibilité, enregistrée avec la source SWAP. C’est le pendant entre pairs de la disponibilité exceptionnelle.</p>
            </div>
          </section>
        `) : ''}

        ${S.swapTab === 'inbox' ? inbox.map((request) => `<section style="${CARD};overflow:hidden">
          <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid ${T.line};background:${T.gray25}">
            ${avatar(request.person.initials)}
            <span style="flex:1;min-width:0">
              <span style="display:block;font-size:14px;font-weight:600;color:${T.text}">${request.person.name} vous propose une ${request.kind.toLowerCase()}</span>
              <span style="display:block;font-size:12px;color:${T.text2}">${request.when}</span>
            </span>
            ${badge('En attente de votre réponse', 'warning')}
          </div>

          <div style="display:grid;grid-template-columns:1fr 44px 1fr;align-items:center;gap:0;padding:18px 20px">
            <div style="border:1px solid ${T.line};border-radius:12px;background:${T.surface};padding:13px 15px">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${T.text3}">Vous recevez</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:${T.text}">${CENTERS[request.inSlot.center].label} · ${request.inSlot.modality}</p>
              <p style="margin:2px 0 0;font-size:13px;color:${T.text2};text-transform:capitalize">${slotWhen(request.inSlot)}</p>
            </div>
            <div style="display:flex;align-items:center;justify-content:center">${icon(request.outSlot ? 'swap' : 'arrowRight', T.gray400, 22)}</div>
            <div style="border:1px solid ${T.line};border-radius:12px;background:${T.surface};padding:13px 15px">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${T.text3}">Vous cédez</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:${request.outSlot ? T.text : T.text3}">${request.outSlot ? CENTERS[request.outSlot.center].label + ' · ' + request.outSlot.modality : 'Rien en contrepartie'}</p>
              <p style="margin:2px 0 0;font-size:13px;color:${T.text2};text-transform:capitalize">${request.outSlot ? slotWhen(request.outSlot) : 'cession simple'}</p>
            </div>
          </div>

          <div style="margin:0 20px;border:1px solid ${T.gray100};border-radius:12px;background:${T.gray25};padding:14px 16px">
            <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Impact sur les compteurs, avant décision</p>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
              ${request.impact.map((row) => {
                const mark = arrow(row.before, row.after)
                return `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:9px 12px">
                  <span style="flex:1;min-width:0;font-size:13px;color:${T.gray700}">${row.name}</span>
                  <span style="flex-shrink:0;font-size:13px;color:${T.text3};font-variant-numeric:tabular-nums">${row.before}</span>
                  ${icon(mark.glyph, mark.color, 13)}
                  <span style="flex-shrink:0;font-size:13px;font-weight:600;color:${mark.color === T.gray300 ? T.gray600 : mark.color};font-variant-numeric:tabular-nums">${row.after}</span>
                </div>`
              }).join('')}
            </div>
          </div>

          ${request.message ? `<p style="margin:14px 20px 0;border-left:3px solid ${T.line};padding-left:12px;font-size:13px;color:${T.gray600};line-height:1.5">${request.message}</p>` : ''}

          <div style="display:flex;align-items:center;gap:10px;padding:18px 20px">
            <span style="flex:1;font-size:12px;color:${T.text3}">${request.expiry}</span>
            ${button({ label: 'Refuser', variant: 'outline', act: 'toast', arg: 'Refus enregistré. L’émetteur en est informé et la demande est close.', style: 'font-size:13px' })}
            ${button({ label: 'Accepter', variant: 'primary', icon: 'check', act: 'toast', arg: 'Accepté. La demande part en validation chez le coordinateur (PARAM-07).', style: 'font-size:13px' })}
          </div>
        </section>`).join('') : ''}

        ${S.swapTab === 'outbox' ? `<section style="${CARD};overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid ${T.line}"><h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">Mes demandes envoyées</h2></div>
          <div style="padding:8px 0">
            ${outbox.map((request) => `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid ${T.gray50}">
              ${icon(request.glyph, request.color, 18)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${request.title}</span>
                <span style="display:block;margin-top:2px;font-size:13px;color:${T.text2};line-height:1.4">${request.detail}</span>
              </span>
              ${badge(request.tag, request.tone)}
            </div>`).join('')}
          </div>
        </section>` : ''}
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:348px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px;border-left:4px solid ${T.navy500}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            ${icon('info', T.navy500, 18)}
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Ce que le système refuse</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${[
              ['RG-27', 'Une contrepartie ne peut être proposée qu’à une personne ayant déclaré une disponibilité sur le créneau concerné.'],
              ['RG-28', 'Une permutation qui vous affecterait deux fois sur la même demi-journée est refusée à l’émission.'],
              ['PARAM-16', 'Les échanges se ferment automatiquement la veille de la vacation concernée.'],
              ['§12', 'Si deux demandes portent sur la même affectation, la première validée rend les autres caduques et leurs émetteurs sont prévenus.']
            ].map((rule) => `<div style="display:flex;align-items:flex-start;gap:9px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:38px;flex-shrink:0;margin-top:1px;border-radius:5px;background:${T.navy50};padding:1px 0;font-size:10px;font-weight:700;color:${T.navy500}">${rule[0]}</span>
              <span style="flex:1;min-width:0;font-size:12px;color:${T.gray600};line-height:1.45">${rule[1]}</span>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Circuit d’un échange</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${[
              ['Vous envoyez la demande', 'Avec un message libre si vous le souhaitez.'],
              ['Votre pair reçoit un email et une notification', 'Son écran de réponse affiche l’impact sur vos deux compteurs avant décision.'],
              ['Il accepte ou refuse', 'En cas de refus, vous êtes informé et la demande est close.'],
              ['Le coordinateur valide', 'Requis par défaut (PARAM-07), désactivable par le coordinateur.'],
              ['Une nouvelle version de planning est créée', 'Compteurs recalculés, confirmation aux deux intéressés et au coordinateur.']
            ].map((step, position) => `<div style="display:flex;gap:12px">
              <span style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:2px">
                <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:${position === 0 ? T.coral500 : T.gray100};color:${position === 0 ? '#fff' : T.text2};font-size:10px;font-weight:600">${position + 1}</span>
                <span style="width:1px;flex:1;background:${T.line}"></span>
              </span>
              <span style="flex:1;min-width:0;padding-bottom:3px">
                <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${step[0]}</span>
                <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};line-height:1.45">${step[1]}</span>
              </span>
            </div>`).join('')}
          </div>
        </section>
      </aside>
    </div>`
}
