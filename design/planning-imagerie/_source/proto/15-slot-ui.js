/* One shared way to draw a vacation, used by the availability grid and the
   coordinator's review grid.

   Two dimensions have to be readable at a glance without fighting each other:
   the CENTRE carries the colour (three values), the MODALITY carries the shape
   (two icons). State stays a pill on the right. */

const MODALITIES = {
  IRM: { label: 'IRM', full: 'IRM cardiaque', glyph: 'heart' },
  Scanner: { label: 'Scanner', full: 'Scanner cardiaque', glyph: 'ct' }
}

const CENTER_TINT = {
  BERGERE: '#eef2f8',
  BLOMET: '#ecfdf3',
  LARIBOISIERE: '#fff8eb'
}

const HALF_DAYS = {
  MORNING: { label: 'Matin', glyph: 'sun' },
  AFTERNOON: { label: 'Après-midi', glyph: 'moon' }
}

/** The coloured square carrying the modality icon in the centre's colour. */
function slotBadge(slot, size) {
  const side = size || 30
  const center = CENTERS[slot.center]
  return `<span style="display:flex;align-items:center;justify-content:center;width:${side}px;height:${side}px;flex-shrink:0;border-radius:9px;background:${CENTER_TINT[slot.center]};border:1px solid ${center.color}22">
    ${icon(MODALITIES[slot.modality].glyph, center.color, side > 28 ? 17 : 15)}
  </span>`
}

/**
 * A vacation row: colour bar, modality badge, centre in bold, modality in
 * words, then whatever the caller puts on the right.
 * @param {object} slot
 * @param {{trailing?: string, bg?: string, border?: string, act?: string,
 *          arg?: string, subdued?: boolean, secondary?: string}} options
 */
function slotRow(slot, options) {
  const settings = options || {}
  const center = CENTERS[slot.center]
  const modality = MODALITIES[slot.modality]
  const hook =
    (settings.act ? ` data-act="${settings.act}"` : '') +
    (settings.arg !== undefined ? ` data-arg="${esc(settings.arg)}"` : '')

  return `<div${hook} style="display:flex;align-items:center;gap:11px;min-height:46px;border:1px solid ${settings.border || T.line};border-radius:11px;background:${settings.bg || T.surface};padding:7px 11px 7px 8px;cursor:${settings.act ? 'pointer' : 'default'}">
    <span style="width:4px;height:30px;flex-shrink:0;border-radius:999px;background:${center.color}"></span>
    ${slotBadge(slot)}
    <span style="display:flex;flex-direction:column;flex:1;min-width:0;gap:1px">
      <span style="font-size:13px;font-weight:600;color:${settings.subdued ? T.text2 : T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${center.label}</span>
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:${T.text2}">
        <span style="font-weight:600;color:${center.color}">${modality.label}</span>
        ${settings.secondary ? `<span style="color:${T.gray300}">·</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${settings.secondary}</span>` : ''}
      </span>
    </span>
    ${settings.trailing || ''}
  </div>`
}

/** The day column of a weekly grid: big number, weekday, then a caller slot. */
function dayCell(daySlots, extra) {
  const first = daySlots[0]
  return `<div style="display:flex;align-items:flex-start;gap:11px;padding-right:12px">
    <span style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:44px;height:44px;flex-shrink:0;border-radius:11px;background:${T.gray50};border:1px solid ${T.gray100}">
      <span style="font-size:17px;font-weight:700;color:${T.text};line-height:1;font-variant-numeric:tabular-nums">${first.dayNumber}</span>
      <span style="font-size:10px;font-weight:600;color:${T.text2};text-transform:uppercase;letter-spacing:0.03em">${WEEKDAYS_SHORT[first.weekday]}</span>
    </span>
    <span style="display:flex;flex-direction:column;gap:5px;min-width:0;padding-top:2px">
      <span style="font-size:13px;font-weight:600;color:${T.text};text-transform:capitalize">${WEEKDAYS[first.weekday]}</span>
      ${extra || ''}
    </span>
  </div>`
}

/** Column headers with a sun / moon so the two halves never blur together. */
function halfDayHeads(dayWidth) {
  return `<div style="display:grid;grid-template-columns:${dayWidth} 1fr 1fr;gap:0;border-bottom:1px solid ${T.line};background:${T.gray25};padding:9px 20px">
    <span style="font-size:12px;font-weight:500;color:${T.text2}">Jour</span>
    ${['MORNING', 'AFTERNOON'].map((key) => `<span style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:${T.text2}">
      ${icon(HALF_DAYS[key].glyph, T.gray400, 14)}${HALF_DAYS[key].label}
    </span>`).join('')}
  </div>`
}

/** Legend spelling out both encodings, so nobody has to guess. */
function gridLegend(trailing) {
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:18px;border-top:1px solid ${T.gray100};padding:14px 20px">
    <span style="display:inline-flex;align-items:center;gap:14px">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Centre</span>
      ${Object.keys(CENTERS).map((key) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.gray700}">
        <span style="width:10px;height:10px;border-radius:3px;background:${CENTERS[key].color}"></span>${CENTERS[key].label}
      </span>`).join('')}
    </span>
    <span style="width:1px;height:16px;background:${T.line}"></span>
    <span style="display:inline-flex;align-items:center;gap:14px">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Modalité</span>
      ${Object.keys(MODALITIES).map((key) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.gray700}">
        ${icon(MODALITIES[key].glyph, T.gray600, 15)}${MODALITIES[key].full}
      </span>`).join('')}
    </span>
    ${trailing ? `<span style="margin-left:auto">${trailing}</span>` : ''}
  </div>`
}

/* The cycle in one strip. Two months run at once and that is exactly what
   confuses people, so every doctor-facing screen says which is which. */
function workflowBanner(context) {
  const collecting = !S.published
  const cards = [
    {
      tag: 'Ce mois-ci',
      title: LIVE.label,
      line: 'Votre planning est publié depuis le ' + PUBLISHED.publishedOn + '. C’est le mois que vous travaillez.',
      glyph: 'calendar',
      tone: 'success',
      here: context === 'monmois',
      nav: 'monmois',
      cta: 'Voir mon mois'
    },
    {
      tag: 'Le mois prochain',
      title: TARGET.label,
      line: collecting
        ? 'Recueil des disponibilités ouvert jusqu’au 15 septembre. Sans réponse, aucune vacation ne vous sera attribuée.'
        : 'Planning publié en version ' + S.planVersion + '. Il prend effet au 1er octobre.',
      glyph: collecting ? 'clockAlert' : 'check',
      tone: collecting ? 'warning' : 'success',
      here: context === 'dispos',
      nav: 'dispos',
      cta: 'Déclarer mes disponibilités'
    }
  ]

  return `<section style="display:flex;align-items:stretch;gap:0;border:1px solid ${T.line};border-radius:16px;background:${T.surface};box-shadow:${T.shadowXs};overflow:hidden;margin-bottom:20px">
    <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;flex-shrink:0;background:${T.coral600};padding:16px 20px;min-width:158px">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${T.coral100}">Nous sommes le</span>
      <span style="font-size:16px;font-weight:700;color:#fff">7 septembre 2026</span>
      <span style="font-size:11px;color:${T.coral100}">deux mois se chevauchent</span>
    </div>
    ${cards.map((card, position) => {
      const tone = TONES[card.tone]
      return `<div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;padding:16px 20px;background:${card.here ? tone.bg : T.surface};${position ? 'border-left:1px solid ' + T.line : ''}">
        <span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;flex-shrink:0;border-radius:11px;background:${tone.bg};border:1px solid ${tone.border}">${icon(card.glyph, tone.fg, 18)}</span>
        <span style="flex:1;min-width:0">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${T.text3}">${card.tag}</span>
            <span style="font-size:14px;font-weight:700;color:${T.text}">${card.title}</span>
            ${card.here ? badge('vous y êtes', card.tone) : ''}
          </span>
          <span style="display:block;margin-top:3px;font-size:12px;color:${T.text2};line-height:1.45">${card.line}</span>
        </span>
        ${card.here ? '' : `<button type="button" data-nav="${card.nav}" style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;height:32px;border:1px solid ${T.line};border-radius:9px;background:${T.surface};padding:0 12px;font-family:inherit;font-size:12px;font-weight:500;color:${T.gray700};cursor:pointer;white-space:nowrap">${card.cta}${icon('arrowRight', T.gray400, 13)}</button>`}
      </div>`
    }).join('')}
  </section>`
}
