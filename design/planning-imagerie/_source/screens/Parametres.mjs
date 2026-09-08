import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('admin', { initials: 'TP', name: 'Théo', role: 'Coordinateur' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Paramètres du module',
      'Tout se règle ici, sans redéploiement. Aucune de ces valeurs n’est écrite en dur dans le code.',
      `${button('Rétablir les valeurs par défaut', 'ghost')}${button('Enregistrer', 'primary', 'check')}`
    )}

    <div style="display: flex; gap: 12px; margin-bottom: 20px; padding: 4px; border-radius: 14px; background: #eceff3; width: fit-content">
      <sc-for list="{{tabs}}" as="tab" hint-placeholder-count="4">
        <button type="button" onClick="{{tab.pick}}" style="display: flex; align-items: center; gap: 8px; border: none; border-radius: 10px; background: {{tab.bg}}; box-shadow: {{tab.shadow}}; padding: 8px 16px; font-family: inherit; font-size: 14px; font-weight: {{tab.weight}}; color: {{tab.fg}}; cursor: pointer">
          <span style="display: flex">{{tab.icon}}</span>{{tab.label}}
        </button>
      </sc-for>
    </div>

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <section style="${CARD}; overflow: hidden">
          <div style="padding: 18px 24px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">{{panel.title}}</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #6b7685; line-height: 1.45">{{panel.hint}}</p>
          </div>

          <sc-for list="{{panel.rows}}" as="row" hint-placeholder-count="6">
            <div style="display: grid; grid-template-columns: 1fr 268px; align-items: center; gap: 20px; padding: 16px 24px; border-bottom: 1px solid #f5f7fa">
              <div style="min-width: 0">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="display: inline-flex; align-items: center; border-radius: 6px; background: #eceff3; padding: 1px 6px; font-size: 11px; font-weight: 600; color: #6b7685; font-family: ui-monospace, SFMono-Regular, Menlo, monospace">{{row.code}}</span>
                  <p style="margin: 0; font-size: 14px; font-weight: 500; color: #141a22">{{row.label}}</p>
                </div>
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7685; line-height: 1.45">{{row.detail}}</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px">
                <span style="flex: 1; min-width: 0">{{row.control}}</span>
                <span style="width: 52px; flex-shrink: 0; text-align: right; font-size: 15px; font-weight: 600; color: {{row.valueColor}}; font-variant-numeric: tabular-nums">{{row.value}}</span>
              </div>
            </div>
          </sc-for>

          <div style="display: flex; align-items: flex-start; gap: 10px; padding: 16px 24px">
            ${svg(ICONS.info, '#9aa5b3', 15)}
            <span style="flex: 1; font-size: 12px; color: #9aa5b3; line-height: 1.45">{{panel.footnote}}</span>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 380px; flex-shrink: 0">

        <section style="${CARD}; padding: 20px 24px; border-left: 4px solid #1f4b86">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
            ${svg(ICONS.lock, '#1f4b86', 18)}
            <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #141a22">Ce qui ne se règle pas</h3>
          </div>
          <p style="margin: 0 0 12px; font-size: 13px; color: #4d5765; line-height: 1.55">Les contraintes dures C1 à C8 ne sont jamais relâchées. Aucune option de configuration ne permet de les désactiver.</p>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <sc-for list="{{hardConstraints}}" as="rule" hint-placeholder-count="4">
              <div style="display: flex; align-items: flex-start; gap: 9px">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; flex-shrink: 0; margin-top: 1px; border-radius: 5px; background: #eef2f8; padding: 1px 0; font-size: 10px; font-weight: 700; color: #1f4b86">{{rule.code}}</span>
                <span style="flex: 1; min-width: 0; font-size: 12px; color: #4d5765; line-height: 1.45">{{rule.text}}</span>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #141a22">Exception de double vacation</h3>
          <p style="margin: 0 0 14px; font-size: 13px; color: #6b7685; line-height: 1.45">PARAM-08 désigne une personne, jamais un nom écrit dans le code. Changer de coordinateur ne demande aucune modification.</p>
          <div style="display: flex; flex-direction: column; gap: 6px">
            <sc-for list="{{doubleShiftCandidates}}" as="person" hint-placeholder-count="4">
              <div onClick="{{person.pick}}" style="display: flex; align-items: center; gap: 10px; border: 1px solid {{person.border}}; border-radius: 10px; background: {{person.bg}}; padding: 9px 11px; cursor: pointer">
                <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; border: 1.5px solid {{person.dotBorder}}; border-radius: 999px; background: #ffffff">
                  <span style="width: 8px; height: 8px; border-radius: 999px; background: {{person.dotFill}}"></span>
                </span>
                <span style="flex: 1; min-width: 0; font-size: 13px; font-weight: 500; color: #141a22">{{person.name}}</span>
                <span style="flex-shrink: 0; font-size: 12px; color: #9aa5b3">{{person.role}}</span>
              </div>
            </sc-for>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">Deux centres différents sur la même demi-journée restent interdits pour tout le monde, coordinateur inclus.</p>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Centres et modalités</h3>
          <p style="margin: 0 0 12px; font-size: 13px; color: #6b7685; line-height: 1.45">Stockés en base. En ajouter un ne demande ni migration ni modification de code.</p>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px">
            <sc-for list="{{referenceData}}" as="item" hint-placeholder-count="5">
              <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #eceff3; border-radius: 10px; background: #fafbfc; padding: 8px 11px">
                <span style="width: 3px; height: 20px; flex-shrink: 0; border-radius: 2px; background: {{item.color}}"></span>
                <span style="flex: 1; min-width: 0; font-size: 13px; color: #141a22">{{item.label}}</span>
                <span style="flex-shrink: 0; font-size: 11px; color: #9aa5b3; font-family: ui-monospace, SFMono-Regular, Menlo, monospace">{{item.code}}</span>
                <span style="display: inline-flex; align-items: center; border-radius: 8px; padding: 1px 7px; flex-shrink: 0; font-size: 11px; font-weight: 500; {{item.tagStyle}}">{{item.tag}}</span>
              </div>
            </sc-for>
          </div>
          ${button('Ajouter un centre ou une modalité', 'outline', 'plus', 'width: 100%; font-size: 13px')}
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'weights', coordinator: 'tp' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  slider(ratio, color) {
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    return '<span style="position: relative; display: block; height: 6px; border-radius: 999px; background: #eceff3">' +
      '<span style="position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; border-radius: 999px; background: ' + color + '"></span>' +
      '<span style="position: absolute; top: 50%; left: ' + pct + '%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border: 2px solid ' + color + '; border-radius: 999px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06)"></span>' +
      '</span>';
  }

  toggle(on) {
    return '<span style="display: flex; justify-content: flex-end"><span style="position: relative; display: block; width: 40px; height: 22px; border-radius: 999px; background: ' + (on ? '#16a34a' : '#c4ccd6') + '">' +
      '<span style="position: absolute; top: 3px; left: ' + (on ? '21px' : '3px') + '; width: 16px; height: 16px; border-radius: 999px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.12)"></span>' +
      '</span></span>';
  }

  field(text) {
    return '<span style="display: flex; align-items: center; justify-content: flex-end; height: 34px; border: 1px solid #dde2e9; border-radius: 9px; background: #ffffff; padding: 0 12px; font-size: 13px; color: #363f4c">' + text + '</span>';
  }

  panels() {
    const navy = '#1f4b86';
    const coral = '#ec3b68';
    return {
      weights: {
        title: 'Poids de la fonction objectif',
        hint: 'Les objectifs sont agrégés par somme pondérée. Ces poids sont copiés et figés dans la campagne au moment de la génération, pour que toute exécution reste rejouable à l’identique.',
        footnote: 'PARAM-10. G5 et G6 sont à zéro par défaut (PARAM-09) : le critère d’équité retenu porte sur le nombre total de vacations. Les activer se fait ici, sans modification de code.',
        rows: [
          { code: 'G1', label: 'Couverture maximale des vacations', detail: 'Poids volontairement très supérieur aux autres : un créneau ne doit jamais être laissé vide pour améliorer l’équité.', control: this.slider(1, navy), value: '1000', valueColor: '#141a22' },
          { code: 'S1', label: 'Doubles vacations du coordinateur', detail: 'Maximise les demi-journées où le coordinateur couvre une IRM et un scanner sur le même centre.', control: this.slider(0.2, navy), value: '200', valueColor: '#141a22' },
          { code: 'G2', label: 'Équité du nombre total de vacations', detail: 'Écart maximal entre personnes, départagé par la somme des écarts absolus à la cible.', control: this.slider(0.1, navy), value: '100', valueColor: '#141a22' },
          { code: 'G4', label: 'Correction inter-mois', detail: 'Favorise les personnes dont le cumul des mois précédents est inférieur à la moyenne.', control: this.slider(0.03, coral), value: '30', valueColor: '#141a22' },
          { code: 'G3', label: 'Respect des créneaux prioritaires', detail: 'Maximise les affectations sur les créneaux déclarés « disponible et souhaité en priorité ».', control: this.slider(0.02, coral), value: '20', valueColor: '#141a22' },
          { code: 'G7', label: 'Limitation de la concentration hebdomadaire', detail: 'Pénalise les semaines où une personne dépasse le seuil PARAM-06.', control: this.slider(0.01, coral), value: '10', valueColor: '#141a22' },
          { code: 'G5', label: 'Équilibre entre modalités', detail: 'Rapproche pour chaque personne la proportion IRM et scanner de la proportion globale du mois.', control: this.slider(0, '#c4ccd6'), value: '0', valueColor: '#9aa5b3' },
          { code: 'G6', label: 'Équilibre entre centres', detail: 'Rapproche pour chaque personne la répartition par centre de la répartition globale.', control: this.slider(0, '#c4ccd6'), value: '0', valueColor: '#9aa5b3' }
        ]
      },
      solver: {
        title: 'Comportement du moteur',
        hint: 'Bornes de calcul, seuils d’alerte et reproductibilité.',
        footnote: 'À l’expiration du temps de calcul, la meilleure solution trouvée est retournée, accompagnée de la mention explicite que l’optimum n’est pas garanti (RG-23).',
        rows: [
          { code: 'PARAM-04', label: 'Temps de calcul maximal', detail: 'Au-delà, la meilleure solution trouvée est retournée avec une mention explicite.', control: this.slider(0.3, '#1f4b86'), value: '60 s', valueColor: '#141a22' },
          { code: 'PARAM-05', label: 'Seuil d’alerte d’écart d’équité', detail: 'Au-delà de cet écart entre le maximum et le minimum, une alerte est levée à la revue.', control: this.slider(0.2, '#1f4b86'), value: '2', valueColor: '#141a22' },
          { code: 'PARAM-06', label: 'Seuil de concentration hebdomadaire', detail: 'Nombre de vacations par semaine et par personne au-delà duquel une alerte est levée.', control: this.slider(0.4, '#1f4b86'), value: '4', valueColor: '#141a22' },
          { code: 'PARAM-11', label: 'Prise en compte de l’historique inter-mois', detail: 'Fenêtre glissante sur laquelle les dettes et crédits d’équité sont calculés.', control: this.field('6 mois glissants'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-13', label: 'Graine aléatoire', detail: 'Fixée par campagne et affichée dans le rapport. La modifier explore une solution alternative de score équivalent.', control: this.field('4271'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-14', label: 'Propositions alternatives générées', detail: 'Au-delà de 1, plusieurs plannings de score voisin sont produits, entre lesquels vous arbitrez.', control: this.slider(0.1, '#1f4b86'), value: '1', valueColor: '#141a22' },
          { code: 'PARAM-12', label: 'Plafond mensuel individuel', detail: 'Aucun plafond par défaut. Se définit personne par personne depuis la gestion des comptes.', control: this.field('Aucun par défaut'), value: '', valueColor: '#141a22' }
        ]
      },
      calendar: {
        title: 'Échéances du cycle mensuel',
        hint: 'Chaque échéance est exprimée en jour du mois M-1 et reste modifiable jusqu’à ce que l’étape correspondante soit atteinte.',
        footnote: 'PARAM-01 et PARAM-02. Les envois d’emails suivent la transition effective, jamais la date théorique.',
        rows: [
          { code: 'PARAM-02', label: 'Transitions automatiques aux échéances', detail: 'Désactivé, vous déclenchez chaque transition manuellement.', control: this.toggle(true), value: '', valueColor: '#141a22' },
          { code: 'PARAM-01', label: 'Ouverture du recueil des seniors', detail: 'Envoi de l’email E01 et des liens personnels.', control: this.field('le 5 du mois M-1'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-01', label: 'Clôture du recueil des seniors', detail: 'À 23h59. Les disponibilités sont ensuite figées.', control: this.field('le 15 du mois M-1'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-01', label: 'Publication du planning des seniors', detail: 'Ouvre automatiquement le recueil des fellows.', control: this.field('le 18 du mois M-1'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-01', label: 'Clôture du recueil des fellows', detail: 'À 23h59.', control: this.field('le 24 du mois M-1'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-17', label: 'Relances automatiques', detail: 'Puis un dernier rappel la veille de la clôture, rappelant qu’une absence de réponse vaut indisponibilité.', control: this.field('à J-5 puis J-2'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-03', label: 'Validité des liens personnels', detail: 'À compter de la clôture de la phase de recueil concernée.', control: this.field('clôture + 7 jours'), value: '', valueColor: '#141a22' }
        ]
      },
      swaps: {
        title: 'Échanges et notifications',
        hint: 'Règles applicables après publication, entre pairs d’une même population.',
        footnote: 'Un échange ne peut jamais créer de conflit : une permutation conduisant à deux affectations sur la même demi-journée est refusée à l’émission (RG-28), sauf double vacation autorisée.',
        rows: [
          { code: 'PARAM-07', label: 'Validation des échanges par le coordinateur', detail: 'Activé par défaut. Un échange accepté entre pairs vous est soumis avant de prendre effet.', control: this.toggle(true), value: '', valueColor: '#141a22' },
          { code: 'PARAM-15', label: 'Expiration d’une demande sans réponse', detail: 'Et au plus tard la veille de la vacation concernée.', control: this.field('7 jours'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-16', label: 'Fermeture des échanges avant la vacation', detail: 'Zéro signifie que les échanges restent ouverts jusqu’à la veille.', control: this.field('0 jour'), value: '', valueColor: '#141a22' },
          { code: 'PARAM-18', label: 'Récapitulatif de fin de mois', detail: 'Email E14, seul message désabonnable du module. E01 à E13 sont des messages de service.', control: this.toggle(true), value: '', valueColor: '#141a22' },
          { code: 'RG-05', label: 'Visibilité des disponibilités individuelles', detail: 'Réservée au coordinateur, y compris après publication. Point ouvert V03, à confirmer.', control: this.field('Coordinateur seul'), value: '', valueColor: '#141a22' },
          { code: 'RG-04', label: 'Visibilité nominative des compteurs', detail: 'Chacun voit les compteurs nominatifs de sa propre population. Point ouvert V04, à confirmer.', control: this.field('Nominative'), value: '', valueColor: '#141a22' }
        ]
      }
    };
  }

  renderVals() {
    const panels = this.panels();
    const tabDefs = [
      { id: 'weights', label: 'Poids du moteur', path: '<path d="M3 3v18h18"></path><path d="M7 15v3M12 10v8M17 6v12"></path>' },
      { id: 'solver', label: 'Comportement', path: '<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"></path>' },
      { id: 'calendar', label: 'Échéances', path: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>' },
      { id: 'swaps', label: 'Échanges et emails', path: '<path d="M7 4 3 8l4 4"></path><path d="M3 8h13a4 4 0 0 1 0 8h-1"></path><path d="m17 20 4-4-4-4"></path>' }
    ];

    const tabs = tabDefs.map((entry) => {
      const active = entry.id === this.state.tab;
      return {
        label: entry.label,
        icon: this.glyph(entry.path, active ? '#d61f55' : '#9aa5b3', 16),
        bg: active ? '#ffffff' : 'transparent',
        fg: active ? '#141a22' : '#6b7685',
        weight: active ? '600' : '500',
        shadow: active ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
        pick: () => this.setState({ tab: entry.id })
      };
    });

    const candidateDefs = [
      { id: 'tp', name: 'Théo Pezel', role: 'Coordinateur, senior' },
      { id: 'ab', name: 'A. Bernard', role: 'Senior' },
      { id: 'sr', name: 'S. Rousseau', role: 'Senior' },
      { id: 'none', name: 'Personne', role: 'Exception désactivée' }
    ];

    const doubleShiftCandidates = candidateDefs.map((entry) => {
      const active = entry.id === this.state.coordinator;
      return {
        name: entry.name,
        role: entry.role,
        bg: active ? '#eef2f8' : '#ffffff',
        border: active ? '#7197c2' : '#dde2e9',
        dotBorder: active ? '#1f4b86' : '#c4ccd6',
        dotFill: active ? '#1f4b86' : 'transparent',
        pick: () => this.setState({ coordinator: entry.id })
      };
    });

    const activeTagStyle = 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857';

    return {
      tabs,
      panel: panels[this.state.tab],
      doubleShiftCandidates,
      hardConstraints: [
        { code: 'C1', text: 'Aucune affectation en dehors d’une disponibilité déclarée. La variable n’est même pas créée dans le modèle.' },
        { code: 'C4', text: 'Pas de chevauchement : une personne n’occupe qu’une demi-journée à la fois.' },
        { code: 'C5', text: 'Seule exception, nominative : deux modalités différentes, même centre, même demi-journée, pour la personne désignée par PARAM-08.' },
        { code: 'C6', text: 'Les affectations verrouillées sont imposées et conservées à chaque régénération.' },
        { code: 'C8', text: 'Le plafond mensuel individuel, quand il est défini, n’est jamais dépassé.' }
      ],
      referenceData: [
        { label: 'Bergère', code: 'BERGERE', color: '#1f4b86', tag: 'Actif', tagStyle: activeTagStyle },
        { label: 'Blomet', code: 'BLOMET', color: '#047857', tag: 'Actif', tagStyle: activeTagStyle },
        { label: 'Lariboisière', code: 'LARIBOISIERE', color: '#b45309', tag: 'Actif', tagStyle: activeTagStyle },
        { label: 'IRM cardiaque', code: 'CMR', color: '#4d5765', tag: 'Actif', tagStyle: activeTagStyle },
        { label: 'Scanner cardiaque', code: 'CCT', color: '#4d5765', tag: 'Actif', tagStyle: activeTagStyle }
      ]
    };
  }
}`

export default {
  file: 'Parametres.dc.html',
  width: 1440,
  height: 1080,
  body,
  logic,
  props: '{}'
}
