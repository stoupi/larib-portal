/* Creating next month's campaign (§5.2, §6.4).
   Deadlines are expressed as a day of month M-1 (PARAM-01) and derived from
   the target month, so the coordinator sees real dates before committing. */

const NEW_CAMPAIGN = {
  target: '2026-11',
  autoTransition: true,
  source: 'duplicate',
  seniorOpen: 5,
  seniorClose: 15,
  seniorPublish: 18,
  fellowClose: 24,
  fellowPublish: 27
}

/** Months that already carry a campaign — RG-07 forbids a second one. */
const TAKEN_MONTHS = ['2026-08', '2026-09', '2026-10']

function monthOptions() {
  const options = []
  for (let offset = 1; offset <= 4; offset += 1) {
    const date = new Date(Date.UTC(2026, 9 + offset, 1))
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const id = year + '-' + String(month + 1).padStart(2, '0')
    options.push({
      id,
      year,
      month,
      label: MONTH_NAMES[month].charAt(0).toUpperCase() + MONTH_NAMES[month].slice(1) + ' ' + year,
      taken: TAKEN_MONTHS.indexOf(id) !== -1
    })
  }
  return options
}

function deadlineDate(targetId, dayOfPreviousMonth) {
  const parts = targetId.split('-')
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 2, dayOfPreviousMonth))
  return WEEKDAYS[date.getUTCDay()] + ' ' + ordinal(date.getUTCDate()) + ' ' + MONTH_NAMES[date.getUTCMonth()]
}

VIEWS['nouvelle-campagne'] = () => {
  const options = monthOptions()
  const target = options.find((option) => option.id === NEW_CAMPAIGN.target) || options[0]
  const workingDays = buildSlots({ id: 'tmp', year: target.year, month: target.month }).length
  const activeSeniors = SENIORS.filter((person) => person.id !== 'ml').length

  const steps = [
    { key: 'seniorOpen', label: 'Ouverture du recueil des seniors', detail: 'Envoi de l’email E01 et des liens personnels', param: 'PARAM-01' },
    { key: 'seniorClose', label: 'Clôture du recueil des seniors', detail: 'À 23h59. Les disponibilités sont ensuite figées', param: 'PARAM-01' },
    { key: 'seniorPublish', label: 'Publication du planning des seniors', detail: 'Ouvre automatiquement le recueil des fellows (RG-06)', param: 'PARAM-01' },
    { key: 'fellowClose', label: 'Clôture du recueil des fellows', detail: 'À 23h59', param: 'PARAM-01' },
    { key: 'fellowPublish', label: 'Publication du planning des fellows', detail: 'Ouvre les échanges entre pairs', param: 'PARAM-01' }
  ]

  const sources = [
    { id: 'duplicate', label: 'Dupliquer ' + TARGET.lower, glyph: 'copy', detail: 'Report sur les mêmes jours de semaine, jours fériés exclus et réintégrables un par un.' },
    { id: 'import', label: 'Importer un fichier', glyph: 'upload', detail: 'CSV ou tableur au format de l’annexe A, analysé intégralement avant tout enregistrement.' },
    { id: 'blank', label: 'Partir de zéro', glyph: 'plus', detail: 'Saisie unitaire ou récurrente, du type « tous les mardis matin, IRM, Bergère ».' }
  ]

  return `
    ${pageHeader(
      'Nouvelle campagne',
      'Une campagne porte sur un mois cible et se déroule pendant le mois précédent. Rien n’est envoyé à l’équipe tant que vous n’ouvrez pas le recueil.',
      button({ label: 'Annuler', variant: 'ghost', nav: 'campagnes' }) +
      button({ label: 'Créer la campagne', variant: target.taken ? 'disabled' : 'primary', icon: 'check', act: target.taken ? 'toast' : 'create-campaign', arg: target.taken ? 'Une campagne existe déjà pour ce mois (RG-07).' : target.id })
    )}

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="${CARD};overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid ${T.line}">
            <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">1 · Le mois à planifier</h2>
            <p style="margin:4px 0 0;font-size:13px;color:${T.text2}">Une seule campagne peut exister par mois cible (RG-07).</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:18px 20px">
            ${options.map((option) => {
              const on = option.id === target.id
              return `<button type="button" data-act="${option.taken ? 'toast' : 'campaign-month'}" data-arg="${option.taken ? esc('Une campagne existe déjà pour ' + option.label.toLowerCase() + ' (RG-07).') : option.id}" style="display:flex;flex-direction:column;align-items:flex-start;gap:5px;border:1px solid ${on ? T.coral500 : T.line};border-radius:12px;background:${option.taken ? T.gray25 : on ? T.coral50 : T.surface};padding:14px 16px;font-family:inherit;cursor:${option.taken ? 'not-allowed' : 'pointer'};text-align:left">
                <span style="font-size:14px;font-weight:600;color:${option.taken ? T.text3 : T.text}">${option.label}</span>
                ${option.taken ? badge('Déjà créée', 'neutral') : badge(on ? 'Sélectionné' : 'Disponible', on ? 'danger' : 'success')}
              </button>`
            }).join('')}
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid ${T.line}">
            <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">2 · Les échéances du cycle</h2>
            <p style="margin:4px 0 0;font-size:13px;color:${T.text2}">Exprimées en jour du mois précédent, reprises des valeurs par défaut du module et modifiables ici.</p>
          </div>
          ${steps.map((step, position) => `<div style="display:grid;grid-template-columns:32px 1fr 168px 200px;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid ${T.gray50}">
            <span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${T.gray100};color:${T.text2};font-size:11px;font-weight:700">${position + 1}</span>
            <span style="min-width:0">
              <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${step.label}</span>
              <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2}">${step.detail}</span>
            </span>
            <span style="display:flex;align-items:center;justify-content:center;height:34px;border:1px solid ${T.line};border-radius:9px;background:${T.surface};font-size:13px;color:${T.gray700}">le ${NEW_CAMPAIGN[step.key]} du mois M-1</span>
            <span style="font-size:13px;color:${T.text2};text-transform:capitalize">${deadlineDate(target.id, NEW_CAMPAIGN[step.key])}</span>
          </div>`).join('')}
          <div style="display:grid;grid-template-columns:32px 1fr 368px;align-items:center;gap:14px;padding:14px 20px">
            <span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${T.gray100};color:${T.text2}">${icon('refresh', T.text2, 14)}</span>
            <span style="min-width:0">
              <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">Transitions automatiques aux échéances</span>
              <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2}">PARAM-02. Désactivez-le pour déclencher chaque étape à la main. Les emails suivent la transition effective, jamais la date théorique.</span>
            </span>
            <span data-act="campaign-auto" style="cursor:pointer">${toggleSwitch(NEW_CAMPAIGN.autoTransition)}</span>
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid ${T.line}">
            <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">3 · Comment charger les vacations</h2>
            <p style="margin:4px 0 0;font-size:13px;color:${T.text2}">Vous pourrez encore changer d’avis : les trois moyens aboutissent au même écran de prévisualisation.</p>
          </div>
          <div style="display:flex;gap:12px;padding:18px 20px">
            ${sources.map((source) => {
              const on = source.id === NEW_CAMPAIGN.source
              return `<div data-act="campaign-source" data-arg="${source.id}" style="display:flex;flex-direction:column;gap:8px;flex:1;border:1px solid ${on ? T.coral500 : T.line};border-radius:12px;background:${on ? T.coral50 : T.surface};padding:14px 16px;cursor:pointer">
                <span style="display:flex;align-items:center;gap:9px">
                  ${icon(source.glyph, on ? T.coral600 : T.gray400, 18)}
                  <span style="font-size:14px;font-weight:600;color:${T.text}">${source.label}</span>
                </span>
                <span style="font-size:12px;color:${T.text2};line-height:1.45">${source.detail}</span>
              </div>`
            }).join('')}
          </div>
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:396px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px;border-left:4px solid ${T.coral500}">
          <h3 style="margin:0 0 4px;font-size:15px;font-weight:600;color:${T.text}">Ce que vous créez</h3>
          <p style="margin:0 0 16px;font-size:13px;color:${T.text2};line-height:1.45">La campagne naîtra au statut brouillon. Aucun email ne part avant l’ouverture du recueil.</p>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            ${statTile(target.label.split(' ')[0], 'mois cible')}
            ${statTile(workingDays, 'vacations si vous dupliquez')}
            ${statTile(activeSeniors, 'seniors actifs sollicités')}
            ${statTile(FELLOWS.length, 'fellows actifs sollicités')}
          </div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Le cycle qui s’enclenchera</h3>
          <div style="display:flex;flex-direction:column;gap:13px">
            ${steps.map((step, position) => `<div style="display:flex;gap:12px">
              <span style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:2px">
                <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:${position === 0 ? T.coral500 : T.gray100};color:${position === 0 ? '#fff' : T.text2};font-size:10px;font-weight:600">${position + 1}</span>
                ${position < steps.length - 1 ? `<span style="width:1px;flex:1;background:${T.line}"></span>` : ''}
              </span>
              <span style="flex:1;min-width:0;padding-bottom:2px">
                <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${step.label}</span>
                <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2};text-transform:capitalize">${deadlineDate(target.id, NEW_CAMPAIGN[step.key])}</span>
              </span>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:${T.text}">Paramètres figés à la création</h3>
          <p style="margin:0 0 12px;font-size:13px;color:${T.text2};line-height:1.45">Les poids du moteur sont copiés dans la campagne au moment de la génération, pour que toute exécution reste rejouable à l’identique.</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${[['G1', '1000'], ['S1', '200'], ['G2', '100'], ['G4', '30'], ['G3', '20'], ['G7', '10'], ['G5', '0'], ['G6', '0']].map((weight) => `<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid ${T.line};border-radius:8px;background:${T.gray25};padding:4px 9px;font-size:12px;color:${T.gray700}">
              <span style="font-weight:600;color:${T.text3};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${weight[0]}</span>${weight[1]}
            </span>`).join('')}
          </div>
          ${button({ label: 'Modifier les poids', variant: 'outline', icon: 'settings', nav: 'parametres', style: 'width:100%;margin-top:14px;font-size:13px' })}
        </section>
      </aside>
    </div>`
}
