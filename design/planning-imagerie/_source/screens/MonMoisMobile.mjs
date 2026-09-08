import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Mon mois', 'Octobre 2026 · publié le 27 sept.', { initials: 'LA' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}; padding: 14px 16px">

    <section style="border: 1px solid #BFDBFE; border-radius: 14px; background: #EFF6FF; padding: 14px 16px; margin-bottom: 14px">
      <p style="margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #2563EB">Prochaine vacation</p>
      <p style="margin: 6px 0 0; font-size: 17px; font-weight: 700; color: #141a22">Lariboisière · IRM</p>
      <p style="margin: 3px 0 0; font-size: 13px; color: #4d5765">Jeudi 1er octobre, après-midi · avec Théo Pezel</p>
    </section>

    <div style="display: flex; gap: 8px; margin-bottom: 14px">
      <sc-for list="{{summary}}" as="stat" hint-placeholder-count="3">
        <div style="flex: 1; border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 10px 11px">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
          <p style="margin: 3px 0 0; font-size: 11px; color: #6b7685; line-height: 1.25">{{stat.label}}</p>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; gap: 6px; margin-bottom: 12px; overflow: hidden">
      <sc-for list="{{filters}}" as="filter" hint-placeholder-count="4">
        <button type="button" onClick="{{filter.pick}}" style="flex: 1; min-height: 34px; border: 1px solid {{filter.border}}; border-radius: 10px; background: {{filter.bg}}; font-family: inherit; font-size: 12px; font-weight: {{filter.weight}}; color: {{filter.fg}}; cursor: pointer; padding: 0 4px; white-space: nowrap">{{filter.label}}</button>
      </sc-for>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px; height: 388px; overflow: hidden">
      <sc-for list="{{shifts}}" as="shift" hint-placeholder-count="6">
        <div style="display: flex; align-items: center; gap: 11px; min-height: 62px; border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 10px 13px">
          <span style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 10px; background: {{shift.dateBg}}">
            <span style="font-size: 16px; font-weight: 700; color: {{shift.dateFg}}; line-height: 1">{{shift.dayNumber}}</span>
            <span style="font-size: 10px; font-weight: 500; color: {{shift.dateFg}}">{{shift.weekday}}</span>
          </span>
          <span style="width: 3px; height: 36px; flex-shrink: 0; border-radius: 2px; background: {{shift.centerColor}}"></span>
          <span style="flex: 1; min-width: 0">
            <span style="display: block; font-size: 14px; font-weight: 500; color: #141a22">{{shift.title}}</span>
            <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{shift.line}}</span>
            <span style="display: flex; align-items: center; gap: 5px; margin-top: 3px">
              <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; background: {{shift.seniorBg}}; color: {{shift.seniorFg}}; font-size: 8px; font-weight: 700">{{shift.seniorInitials}}</span>
              <span style="font-size: 11px; color: #6b7685">{{shift.senior}}</span>
            </span>
          </span>
          <sc-if value="{{shift.flagged}}" hint-placeholder-val="{{true}}">
            <span style="display: inline-flex; align-items: center; border-radius: 8px; padding: 2px 7px; flex-shrink: 0; font-size: 10px; font-weight: 600; {{shift.tagStyle}}">{{shift.tag}}</span>
          </sc-if>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; gap: 8px; margin-top: 12px">
      <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 7px; flex: 1; min-height: 44px; border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; font-family: inherit; font-size: 13px; font-weight: 500; color: #363f4c; cursor: pointer">
        ${svg(ICONS.calendar, '#4d5765', 16)}Ajouter à mon agenda
      </button>
      <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 7px; flex: 1; min-height: 44px; border: none; border-radius: 12px; background: linear-gradient(to bottom right, #122f54, #0a1b30); font-family: inherit; font-size: 13px; font-weight: 500; color: #ffffff; cursor: pointer">
        ${svg(ICONS.swap, '#ffffff', 16)}Échanger
      </button>
    </div>
  </div>

  ${mobileTabBar([
    { label: 'Mon mois', icon: 'calendar', active: true },
    { label: 'Dispos', icon: 'check', active: false },
    { label: 'Compteurs', icon: 'chart', active: false },
    { label: 'Échanges', icon: 'swap', active: false }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { filter: 'all' };
  }

  shiftData() {
    return [
      { dayNumber: '1', weekday: 'jeu', title: 'Lariboisière · IRM', half: 'après-midi', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'next' },
      { dayNumber: '5', weekday: 'lun', title: 'Bergère · IRM', half: 'matin', senior: 'M. Nguyen', initials: 'MN', status: 'planned' },
      { dayNumber: '7', weekday: 'mer', title: 'Lariboisière · Scanner', half: 'matin', senior: 'S. Rousseau', initials: 'SR', status: 'planned' },
      { dayNumber: '8', weekday: 'jeu', title: 'Lariboisière · IRM', half: 'après-midi', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'planned' },
      { dayNumber: '13', weekday: 'mar', title: 'Bergère · IRM', half: 'après-midi', senior: 'A. Bernard', initials: 'AB', status: 'swapping' },
      { dayNumber: '16', weekday: 'ven', title: 'Blomet · IRM', half: 'matin', senior: 'F. Leroy', initials: 'FL', status: 'planned' },
      { dayNumber: '19', weekday: 'lun', title: 'Bergère · Scanner', half: 'matin', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'planned' },
      { dayNumber: '28', weekday: 'mer', title: 'Lariboisière · IRM', half: 'matin', senior: 'S. Rousseau', initials: 'SR', status: 'swapped' }
    ];
  }

  renderVals() {
    const centerColors = { 'Bergère': '#1f4b86', 'Blomet': '#047857', 'Lariboisière': '#b45309' };

    const statusTones = {
      next: { tag: 'À venir', style: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB', flagged: true },
      planned: { tag: '', style: '', flagged: false },
      swapping: { tag: 'Échange', style: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C', flagged: true },
      swapped: { tag: 'Reçue', style: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857', flagged: true }
    };

    const filterDefs = [
      { id: 'all', label: 'Toutes' },
      { id: 'irm', label: 'IRM' },
      { id: 'ct', label: 'Scanner' },
      { id: 'pezel', label: 'Dr Pezel' }
    ];

    const filters = filterDefs.map((entry) => {
      const active = this.state.filter === entry.id;
      return {
        label: entry.label,
        bg: active ? '#122f54' : '#ffffff',
        border: active ? '#122f54' : '#dde2e9',
        fg: active ? '#ffffff' : '#4d5765',
        weight: active ? '600' : '500',
        pick: () => this.setState({ filter: entry.id })
      };
    });

    const all = this.shiftData();
    const tests = {
      all: () => true,
      irm: (shift) => shift.title.indexOf('IRM') !== -1,
      ct: (shift) => shift.title.indexOf('Scanner') !== -1,
      pezel: (shift) => Boolean(shift.coordinator)
    };
    const visible = all.filter(tests[this.state.filter] || tests.all);

    const shifts = visible.map((shift) => {
      const tone = statusTones[shift.status];
      const center = Object.keys(centerColors).find((name) => shift.title.indexOf(name) === 0);
      return {
        dayNumber: shift.dayNumber,
        weekday: shift.weekday,
        title: shift.title,
        line: shift.half,
        centerColor: centerColors[center],
        senior: shift.senior,
        seniorInitials: shift.initials,
        seniorBg: shift.coordinator ? '#eef2f8' : '#eceff3',
        seniorFg: shift.coordinator ? '#1f4b86' : '#4d5765',
        dateBg: shift.status === 'next' ? '#EFF6FF' : '#f5f7fa',
        dateFg: shift.status === 'next' ? '#2563EB' : '#4d5765',
        tag: tone.tag,
        tagStyle: tone.style,
        flagged: tone.flagged
      };
    });

    const withPezel = all.filter((shift) => shift.coordinator).length;
    const irm = all.filter((shift) => shift.title.indexOf('IRM') !== -1).length;

    return {
      filters,
      shifts,
      summary: [
        { value: String(all.length), label: 'vacations ce mois' },
        { value: irm + ' / ' + (all.length - irm), label: 'IRM / scanner' },
        { value: String(withPezel), label: 'avec le Dr Pezel' }
      ]
    };
  }
}`

export default {
  file: 'MonMoisMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
