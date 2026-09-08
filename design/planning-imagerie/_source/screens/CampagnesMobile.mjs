import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Planning imagerie', 'Coordination · 3 campagnes actives', { initials: 'TP' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}; padding: 14px 16px">

    <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 14px 16px; margin-bottom: 14px">
      <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 12px">
        <span style="flex: 1; min-width: 0; font-size: 16px; font-weight: 700; color: #141a22">{{selected.monthLabel}}</span>
        <span style="display: inline-flex; align-items: center; border-radius: 9px; padding: 2px 8px; flex-shrink: 0; font-size: 11px; font-weight: 500; {{selected.statusStyle}}">{{selected.statusLabel}}</span>
      </div>

      <div style="display: flex; align-items: flex-start; gap: 0; margin-bottom: 12px">
        <sc-for list="{{selected.steps}}" as="step" hint-placeholder-count="6">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; min-width: 0">
            <span style="display: flex; align-items: center; width: 100%">
              <span style="height: 2px; flex: 1; background: {{step.leftLine}}"></span>
              <span style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 999px; border: 2px solid {{step.dotBorder}}; background: {{step.dotBg}}; color: {{step.dotFg}}; font-size: 10px; font-weight: 700">{{step.index}}</span>
              <span style="height: 2px; flex: 1; background: {{step.rightLine}}"></span>
            </span>
            <span style="font-size: 9px; font-weight: 600; color: {{step.labelColor}}; text-align: center; line-height: 1.2">{{step.label}}</span>
          </div>
        </sc-for>
      </div>

      <p style="margin: 0 0 12px; font-size: 12px; color: #6b7685; line-height: 1.45">{{selected.summary}}</p>

      <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; border: none; border-radius: 11px; background: linear-gradient(to bottom right, #122f54, #0a1b30); font-family: inherit; font-size: 13px; font-weight: 600; color: #ffffff; cursor: pointer">
        {{selected.primaryAction}}${svg(ICONS.arrowRight, '#ffffff', 15)}
      </button>
    </section>

    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px">
      <sc-for list="{{selected.stats}}" as="stat" hint-placeholder-count="4">
        <div style="border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 11px 12px">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: {{stat.color}}; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
          <p style="margin: 3px 0 0; font-size: 11px; color: #6b7685; line-height: 1.3">{{stat.label}}</p>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px">
      <sc-for list="{{selected.alerts}}" as="alert" hint-placeholder-count="2">
        <div style="display: flex; align-items: flex-start; gap: 9px; border: 1px solid {{alert.border}}; border-radius: 12px; background: {{alert.bg}}; padding: 10px 12px">
          <span style="flex-shrink: 0; margin-top: 1px">{{alert.icon}}</span>
          <span style="flex: 1; min-width: 0">
            <span style="display: block; font-size: 12px; font-weight: 600; color: {{alert.fg}}">{{alert.title}}</span>
            <span style="display: block; margin-top: 2px; font-size: 11px; color: #6b7685; line-height: 1.4">{{alert.detail}}</span>
          </span>
        </div>
      </sc-for>
    </div>

    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #9aa5b3">Toutes les campagnes</p>
    <div style="display: flex; flex-direction: column; gap: 7px; height: 216px; overflow: hidden">
      <sc-for list="{{campaigns}}" as="row" hint-placeholder-count="4">
        <div onClick="{{row.pick}}" style="display: flex; align-items: center; gap: 10px; min-height: 52px; border: 1px solid {{row.border}}; border-radius: 12px; background: {{row.bg}}; padding: 9px 12px; cursor: pointer">
          <span style="width: 3px; height: 30px; flex-shrink: 0; border-radius: 2px; background: {{row.marker}}"></span>
          <span style="flex: 1; min-width: 0">
            <span style="display: block; font-size: 13px; font-weight: {{row.weight}}; color: #141a22">{{row.monthLabel}}</span>
            <span style="display: block; margin-top: 2px; font-size: 11px; color: #6b7685">{{row.detail}}</span>
          </span>
          <span style="display: inline-flex; align-items: center; border-radius: 9px; padding: 2px 7px; flex-shrink: 0; font-size: 10px; font-weight: 500; {{row.statusStyle}}">{{row.statusLabel}}</span>
        </div>
      </sc-for>
    </div>
  </div>

  ${mobileTabBar([
    { label: 'Campagnes', icon: 'calendar', active: true },
    { label: 'Suivi', icon: 'users', active: false },
    { label: 'Planning', icon: 'planning', active: false },
    { label: 'Compteurs', icon: 'chart', active: false }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { selectedId: 'oct-2026' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 15) + '" height="' + (size || 15) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  statusStyle(kind) {
    return {
      neutral: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765',
      info: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB',
      warning: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C',
      success: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857'
    }[kind];
  }

  data() {
    return [
      {
        id: 'oct-2026', monthLabel: 'Octobre 2026', kind: 'warning', statusLabel: 'Recueil seniors',
        stepIndex: 2, detail: '46 vacations · 5 réponses sur 7',
        summary: 'Recueil ouvert depuis le 5 septembre, clôture le 15 à 23h59.',
        primaryAction: 'Voir le suivi des réponses',
        stats: [
          { value: '5/7', label: 'réponses seniors', color: '#EA580C' },
          { value: '46', label: 'vacations chargées', color: '#141a22' },
          { value: '51', label: 'places à pourvoir', color: '#141a22' },
          { value: '3', label: 'créneaux sans volontaire', color: '#DC2626' }
        ],
        alerts: [
          { kind: 'warning', title: '2 seniors n’ont pas répondu', detail: 'C. Dumont et J. Vidal — relance du 10 septembre.' },
          { kind: 'danger', title: '3 créneaux sans volontaire', detail: 'Blomet scanner, mardis après-midi.' }
        ]
      },
      {
        id: 'sep-2026', monthLabel: 'Septembre 2026', kind: 'success', statusLabel: 'Publié',
        stepIndex: 6, detail: '44 vacations · échanges ouverts',
        summary: 'Les deux plannings sont publiés. Échanges ouverts jusqu’au 30 septembre.',
        primaryAction: 'Ouvrir le planning publié',
        stats: [
          { value: '44', label: 'vacations planifiées', color: '#141a22' },
          { value: '0', label: 'place non pourvue', color: '#047857' },
          { value: '1', label: 'écart max entre seniors', color: '#141a22' },
          { value: '4', label: 'échanges en attente', color: '#EA580C' }
        ],
        alerts: [
          { kind: 'warning', title: '2 échanges à valider', detail: 'A. Bernard ↔ F. Leroy, et une cession de M. Nguyen.' }
        ]
      },
      {
        id: 'nov-2026', monthLabel: 'Novembre 2026', kind: 'neutral', statusLabel: 'Brouillon',
        stepIndex: 1, detail: 'aucune vacation chargée',
        summary: 'La campagne peut être dupliquée depuis octobre ou alimentée par import.',
        primaryAction: 'Charger les vacations',
        stats: [
          { value: '0', label: 'vacations chargées', color: '#9aa5b3' },
          { value: '—', label: 'places à pourvoir', color: '#9aa5b3' },
          { value: '7', label: 'seniors actifs', color: '#141a22' },
          { value: '5', label: 'fellows actifs', color: '#141a22' }
        ],
        alerts: [
          { kind: 'info', title: 'Rien à charger pour l’instant', detail: 'Dupliquez octobre ou importez un CSV.' }
        ]
      },
      {
        id: 'aou-2026', monthLabel: 'Août 2026', kind: 'neutral', statusLabel: 'Clôturée',
        stepIndex: 6, detail: '38 vacations · compteurs consolidés',
        summary: 'Campagne clôturée le 31 août, compteurs consolidés.',
        primaryAction: 'Consulter les compteurs',
        stats: [
          { value: '38', label: 'vacations réalisées', color: '#141a22' },
          { value: '2', label: 'places non pourvues', color: '#EA580C' },
          { value: '2', label: 'écart max entre seniors', color: '#141a22' },
          { value: '6', label: 'doubles vacations', color: '#141a22' }
        ],
        alerts: [
          { kind: 'info', title: 'Dettes reportées sur octobre', detail: 'C. Dumont +2, F. Leroy −1, via l’objectif G4.' }
        ]
      }
    ];
  }

  steps(activeIndex) {
    const labels = ['Charg.', 'Rec. sen.', 'Plan. sen.', 'Rec. fel.', 'Plan. fel.', 'Clôture'];
    return labels.map((label, position) => {
      const number = position + 1;
      const done = number < activeIndex;
      const current = number === activeIndex;
      return {
        index: String(number),
        label,
        dotBg: current ? '#ec3b68' : done ? '#173d6e' : '#ffffff',
        dotBorder: current ? '#ec3b68' : done ? '#173d6e' : '#dde2e9',
        dotFg: current || done ? '#ffffff' : '#9aa5b3',
        labelColor: current ? '#141a22' : done ? '#4d5765' : '#9aa5b3',
        leftLine: position === 0 ? 'transparent' : number <= activeIndex ? '#173d6e' : '#dde2e9',
        rightLine: position === labels.length - 1 ? 'transparent' : number < activeIndex ? '#173d6e' : '#dde2e9'
      };
    });
  }

  renderVals() {
    const all = this.data();
    const selected = all.find((entry) => entry.id === this.state.selectedId) || all[0];

    const alertTone = {
      warning: { bg: '#FFF3E9', border: '#FDBA74', fg: '#EA580C', path: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>' },
      danger: { bg: '#FEF2F2', border: '#FECACA', fg: '#DC2626', path: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>' },
      info: { bg: '#EFF6FF', border: '#BFDBFE', fg: '#2563EB', path: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path>' }
    };

    const campaigns = all.map((entry) => {
      const isSelected = entry.id === selected.id;
      return {
        monthLabel: entry.monthLabel,
        detail: entry.detail,
        statusLabel: entry.statusLabel,
        statusStyle: this.statusStyle(entry.kind),
        bg: isSelected ? '#fff8fa' : '#ffffff',
        border: isSelected ? '#ffb6c6' : '#dde2e9',
        marker: isSelected ? '#ec3b68' : '#eceff3',
        weight: isSelected ? '600' : '500',
        pick: () => this.setState({ selectedId: entry.id })
      };
    });

    return {
      campaigns,
      selected: {
        monthLabel: selected.monthLabel,
        statusLabel: selected.statusLabel,
        statusStyle: this.statusStyle(selected.kind),
        summary: selected.summary,
        primaryAction: selected.primaryAction,
        steps: this.steps(selected.stepIndex),
        stats: selected.stats,
        alerts: selected.alerts.map((alert) => {
          const tone = alertTone[alert.kind];
          return {
            title: alert.title,
            detail: alert.detail,
            bg: tone.bg,
            border: tone.border,
            fg: tone.fg,
            icon: this.glyph(tone.path, tone.fg, 15)
          };
        })
      }
    };
  }
}`

export default {
  file: 'CampagnesMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
