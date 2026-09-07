import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('admin', { initials: 'TP', name: 'Théo', role: 'Coordinateur' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Rapport de génération — Octobre 2026',
      'Exécution 3 du moteur, population senior. Ce rapport est descriptif : il ne formule aucune recommandation qui ne dérive pas d’un chiffre présent ici.',
      `${button('Comparer les versions', 'outline', 'history')}${button('Retour à la revue', 'default', 'arrowRight')}`
    )}

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <section style="${CARD}; padding: 22px 24px; border-left: 4px solid #1f4b86">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
            ${svg(ICONS.wand, '#1f4b86', 20)}
            <h2 style="margin: 0; flex: 1; font-size: 16px; font-weight: 600; color: #141a22">Restitution en langage naturel</h2>
            <span style="font-size: 12px; color: #9aa5b3">produite à partir des métriques du solveur, jamais l’inverse</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px">
            <sc-for list="{{narrative}}" as="paragraph" hint-placeholder-count="5">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #363f4c">{{paragraph.text}}</p>
            </sc-for>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 16px; border-top: 1px solid #eceff3; padding-top: 14px">
            ${svg(ICONS.info, '#9aa5b3', 15)}
            <span style="font-size: 12px; color: #9aa5b3; line-height: 1.45">RG-31 et RG-38 — le moteur d’optimisation et cette couche de restitution sont deux composants séparés. Ce texte ne crée, ne modifie et ne supprime jamais une affectation.</span>
          </div>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Places non pourvues et cause identifiée</h2>
            <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626">{{unfilledCount}}</span>
          </div>

          <div style="display: grid; grid-template-columns: 236px 1fr; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Vacation</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Cause déterminée par analyse des entrées</span>
          </div>

          <sc-for list="{{unfilled}}" as="row" hint-placeholder-count="4">
            <div style="display: grid; grid-template-columns: 236px 1fr; align-items: flex-start; gap: 0; border-bottom: 1px solid #eceff3; padding: 12px 20px">
              <span style="display: flex; align-items: flex-start; gap: 10px; padding-right: 16px">
                <span style="width: 3px; height: 32px; flex-shrink: 0; border-radius: 2px; background: {{row.color}}"></span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 13px; font-weight: 600; color: #141a22">{{row.title}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{row.when}}</span>
                </span>
              </span>
              <span>
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; margin-bottom: 4px; font-size: 12px; font-weight: 500; {{row.tagStyle}}">{{row.tag}}</span>
                <span style="display: block; font-size: 13px; color: #4d5765; line-height: 1.45">{{row.detail}}</span>
              </span>
            </div>
          </sc-for>

          <p style="margin: 0; padding: 14px 20px; font-size: 12px; color: #9aa5b3; line-height: 1.45">RG-37 — la cause est déterminée par analyse des données d’entrée, jamais par interprétation du solveur.</p>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Comparaison avec la version précédente</h2>
            <div style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eceff3">
              <sc-for list="{{versions}}" as="version" hint-placeholder-count="3">
                <button type="button" onClick="{{version.pick}}" style="border: none; border-radius: 8px; background: {{version.bg}}; box-shadow: {{version.shadow}}; padding: 5px 12px; font-family: inherit; font-size: 13px; font-weight: 500; color: {{version.fg}}; cursor: pointer">{{version.label}}</button>
              </sc-for>
            </div>
          </div>
          <div style="padding: 8px 0">
            <sc-for list="{{diff}}" as="change" hint-placeholder-count="4">
              <div style="display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid #f5f7fa">
                <span style="display: flex; flex-shrink: 0">{{change.icon}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 13px; color: #141a22">{{change.title}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{change.detail}}</span>
                </span>
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; flex-shrink: 0; font-size: 12px; font-weight: 500; {{change.tagStyle}}">{{change.tag}}</span>
              </div>
            </sc-for>
            <p style="margin: 0; padding: 12px 20px 4px; font-size: 12px; color: #9aa5b3">{{diffSummary}}</p>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 380px; flex-shrink: 0">

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #141a22">Métriques de sortie</h3>
          <div style="display: flex; flex-direction: column; gap: 11px">
            <sc-for list="{{metrics}}" as="metric" hint-placeholder-count="6">
              <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid #f5f7fa">
                <span style="flex: 1; min-width: 0; font-size: 13px; color: #4d5765; line-height: 1.35">{{metric.label}}</span>
                <span style="flex-shrink: 0; font-size: 15px; font-weight: 600; color: {{metric.color}}; font-variant-numeric: tabular-nums">{{metric.value}}</span>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Répartition obtenue</h3>
          <div style="display: flex; flex-direction: column; gap: 9px">
            <sc-for list="{{spread}}" as="person" hint-placeholder-count="7">
              <div style="display: flex; align-items: center; gap: 10px">
                <span style="width: 92px; flex-shrink: 0; font-size: 13px; color: #363f4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{person.name}}</span>
                <span style="position: relative; flex: 1; height: 16px; border-radius: 5px; background: #f5f7fa; overflow: hidden">
                  <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{person.pct}}; border-radius: 5px; background: {{person.color}}"></span>
                </span>
                <span style="width: 20px; flex-shrink: 0; text-align: right; font-size: 13px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{person.count}}</span>
              </div>
            </sc-for>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">{{spreadNote}}</p>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Reproductibilité</h3>
          <div style="display: flex; flex-direction: column; gap: 10px">
            <sc-for list="{{reproducibility}}" as="row" hint-placeholder-count="4">
              <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
                <span style="flex-shrink: 0; font-size: 13px; color: #6b7685">{{row.label}}</span>
                <span style="flex: 1; min-width: 0; text-align: right; font-size: 12px; color: #363f4c; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; text-overflow: ellipsis">{{row.value}}</span>
              </div>
            </sc-for>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; border-top: 1px solid #eceff3; padding-top: 12px">
            ${svg(ICONS.check, '#047857', 15)}
            <span style="flex: 1; font-size: 12px; color: #6b7685; line-height: 1.45">Deux exécutions partageant cette empreinte, ces poids et cette graine produisent exactement le même planning (RG-36, critère A04).</span>
          </div>
          <button type="button" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 36px; margin-top: 14px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; font-family: inherit; font-size: 13px; font-weight: 500; color: #363f4c; cursor: pointer">
            ${svg(ICONS.refresh, 'currentColor', 15)}Rejouer avec une autre graine
          </button>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { version: 'v2' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  renderVals() {
    const narrative = [
      { text: '48 places pourvues sur 51. Les trois places vides portent toutes sur le scanner de Blomet, les mardis après-midi : aucun senior ne s’est déclaré disponible sur ces créneaux.' },
      { text: 'L’écart maximal entre seniors est de 2 vacations, pour une cible de 6,6. C. Dumont reçoit 4 vacations, soit 2,6 de moins que la moyenne, parce qu’elle n’avait déclaré que 4 disponibilités : sa cible est plafonnée par ce nombre et aucune dette d’équité ne lui est imputée.' },
      { text: 'S. Rousseau reçoit 9 vacations, soit 2,4 de plus que la moyenne. Il avait déclaré 24 disponibilités et portait un crédit d’équité de 2 vacations reporté d’août, que l’objectif G4 a résorbé.' },
      { text: '6 doubles vacations ont été formées pour le coordinateur, sur 8 demi-journées où une IRM et un scanner coexistent sur le même centre. Les deux manquantes tombent les 6 et 20 octobre : le coordinateur n’avait déclaré disponible qu’une des deux vacations.' },
      { text: 'Par rapport à la version 2, trois affectations changent et une place non pourvue a été comblée. Les deux affectations que vous aviez verrouillées sont conservées à l’identique.' }
    ];

    const unfilled = [
      {
        title: 'Blomet · Scanner', when: 'mardi 13 octobre, après-midi', color: '#047857',
        tag: 'Aucun volontaire',
        tagStyle: 'border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626',
        detail: 'Aucune personne ne s’est déclarée disponible sur ce créneau. Une demande de disponibilité exceptionnelle est le seul recours.'
      },
      {
        title: 'Blomet · Scanner', when: 'mardi 20 octobre, après-midi', color: '#047857',
        tag: 'Aucun volontaire',
        tagStyle: 'border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626',
        detail: 'Aucune personne ne s’est déclarée disponible sur ce créneau.'
      },
      {
        title: 'Lariboisière · IRM', when: 'jeudi 22 octobre, après-midi', color: '#b45309',
        tag: 'Toutes déjà affectées',
        tagStyle: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C',
        detail: 'Les 3 personnes disponibles sur ce créneau sont déjà affectées ailleurs sur la même demi-journée. La contrainte C4 interdit le chevauchement.'
      }
    ];

    const metrics = [
      { label: 'Taux de couverture', value: '94 %', color: '#EA580C' },
      { label: 'Places non pourvues', value: '3', color: '#DC2626' },
      { label: 'Écart maximal d’équité', value: '2', color: '#EA580C' },
      { label: 'Somme des écarts absolus à la cible', value: '9,4', color: '#141a22' },
      { label: 'Doubles vacations du coordinateur', value: '6 / 8', color: '#047857' },
      { label: 'Créneaux prioritaires honorés', value: '14 / 17', color: '#141a22' },
      { label: 'Dépassements hebdomadaires', value: '1', color: '#EA580C' },
      { label: 'Score de la fonction objectif', value: '4 218', color: '#141a22' }
    ];

    const roster = [
      { name: 'S. Rousseau', count: 9 },
      { name: 'Théo Pezel', count: 8, coordinator: true },
      { name: 'A. Bernard', count: 8 },
      { name: 'F. Leroy', count: 7 },
      { name: 'M. Nguyen', count: 6 },
      { name: 'J. Vidal', count: 6 },
      { name: 'C. Dumont', count: 4 }
    ];
    const target = 6.6;

    const spread = roster.map((person) => ({
      name: person.name,
      count: String(person.count),
      pct: Math.round((person.count / 11) * 100) + '%',
      color: person.coordinator ? '#1f4b86' : Math.abs(person.count - target) >= 2 ? '#d97706' : '#3f6aa3'
    }));

    const versionDefs = [
      { id: 'v1', label: 'vs v1' },
      { id: 'v2', label: 'vs v2' },
      { id: 'none', label: 'Aucune' }
    ];

    const versions = versionDefs.map((entry) => ({
      label: entry.label,
      bg: this.state.version === entry.id ? '#ffffff' : 'transparent',
      fg: this.state.version === entry.id ? '#141a22' : '#6b7685',
      shadow: this.state.version === entry.id ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
      pick: () => this.setState({ version: entry.id })
    }));

    const plusGlyph = this.glyph('<path d="M12 5v14M5 12h14"></path>', '#047857', 15);
    const swapGlyph = this.glyph('<path d="M7 4 3 8l4 4"></path><path d="M3 8h13a4 4 0 0 1 0 8h-1"></path><path d="m17 20 4-4-4-4"></path>', '#2563EB', 15);
    const lockGlyph = this.glyph('<rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>', '#6b7685', 15);

    const diffSets = {
      v2: [
        { icon: swapGlyph, title: 'Bergère · IRM, lundi 5 octobre matin', detail: 'M. Nguyen remplace F. Leroy', tag: 'Changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
        { icon: swapGlyph, title: 'Lariboisière · Scanner, jeudi 15 octobre après-midi', detail: 'Théo Pezel remplace A. Bernard, formant une double vacation', tag: 'Changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
        { icon: plusGlyph, title: 'Blomet · IRM, mercredi 7 octobre après-midi', detail: 'Place précédemment vide, désormais tenue par J. Vidal', tag: 'Comblée', tagStyle: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857' },
        { icon: lockGlyph, title: '2 affectations verrouillées', detail: 'Conservées à l’identique, comme à chaque régénération', tag: 'Inchangé', tagStyle: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' }
      ],
      v1: [
        { icon: swapGlyph, title: '11 affectations modifiées', detail: 'La version 1 précédait votre premier arbitrage manuel', tag: 'Changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
        { icon: plusGlyph, title: '4 places comblées', detail: 'Le passage du poids G1 de 500 à 1000 a priorisé la couverture', tag: 'Comblée', tagStyle: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857' }
      ],
      none: []
    };

    const diff = diffSets[this.state.version] || [];

    return {
      narrative,
      unfilled,
      unfilledCount: unfilled.length + ' places',
      metrics,
      spread,
      spreadNote: 'Le nombre de vacations attribuées ne peut jamais dépasser le nombre de disponibilités déclarées : c’est la contrainte C1, garantie par construction du modèle.',
      versions,
      diff,
      diffSummary: this.state.version === 'none'
        ? 'Aucune comparaison affichée.'
        : diff.length + ' entrées comparées. Ces différences seront reprises telles quelles dans l’email de republication (RG-25).',
      reproducibility: [
        { label: 'Empreinte des entrées', value: 'a3f9…c142' },
        { label: 'Graine', value: '4271' },
        { label: 'Temps de calcul', value: '2 843 ms' },
        { label: 'Statut', value: 'SUCCESS, optimum' }
      ]
    };
  }
}`

export default {
  file: 'Rapport.dc.html',
  width: 1440,
  height: 1160,
  body,
  logic,
  props: '{}'
}
