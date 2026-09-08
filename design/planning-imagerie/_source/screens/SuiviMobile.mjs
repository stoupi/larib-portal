import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Suivi des réponses', 'Octobre 2026 · seniors', { initials: 'TP' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}; padding: 14px 16px">

    <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 14px 16px; margin-bottom: 12px">
      <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px">
        <span style="font-size: 28px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">{{doneLabel}}</span>
        <span style="flex: 1; font-size: 13px; color: #6b7685">réponses validées</span>
        <span style="font-size: 12px; color: #9aa5b3">clôture le 15</span>
      </div>
      <span style="display: flex; gap: 3px; height: 8px">
        <sc-for list="{{progress}}" as="cell" hint-placeholder-count="8">
          <span style="flex: 1; border-radius: 3px; background: {{cell.color}}"></span>
        </sc-for>
      </span>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px">
        <sc-for list="{{legend}}" as="item" hint-placeholder-count="4">
          <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #6b7685">
            <span style="width: 8px; height: 8px; border-radius: 3px; background: {{item.color}}"></span>{{item.label}}
          </span>
        </sc-for>
      </div>
    </section>

    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
      <div style="display: flex; gap: 5px; flex: 1">
        <sc-for list="{{filters}}" as="filter" hint-placeholder-count="2">
          <button type="button" onClick="{{filter.pick}}" style="flex: 1; min-height: 36px; border: 1px solid {{filter.border}}; border-radius: 10px; background: {{filter.bg}}; font-family: inherit; font-size: 12px; font-weight: {{filter.weight}}; color: {{filter.fg}}; cursor: pointer; padding: 0 8px; white-space: nowrap">{{filter.label}}</button>
        </sc-for>
      </div>
      <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; flex-shrink: 0; border: 1px solid #FDBA74; border-radius: 10px; background: #FFF3E9; padding: 0 12px; font-family: inherit; font-size: 12px; font-weight: 500; color: #EA580C; cursor: pointer">
        ${svg(ICONS.mail, 'currentColor', 14)}Relancer
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 7px; height: 402px; overflow: hidden">
      <sc-for list="{{people}}" as="person" hint-placeholder-count="8">
        <div style="display: flex; align-items: center; gap: 10px; min-height: 58px; border: 1px solid #dde2e9; border-radius: 12px; background: {{person.bg}}; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 9px 12px">
          <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 999px; background: {{person.avatarBg}}; color: {{person.avatarFg}}; font-size: 11px; font-weight: 600">{{person.initials}}</span>
          <span style="flex: 1; min-width: 0">
            <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{person.name}}</span>
            <span style="display: block; margin-top: 2px; font-size: 11px; color: #6b7685">{{person.detail}}</span>
          </span>
          <span style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0">
            <span style="display: inline-flex; align-items: center; border-radius: 9px; padding: 2px 7px; font-size: 10px; font-weight: 600; {{person.statusStyle}}">{{person.statusLabel}}</span>
            <sc-if value="{{person.pending}}" hint-placeholder-val="{{true}}">
              <button type="button" style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #dde2e9; border-radius: 9px; background: #ffffff; cursor: pointer; padding: 0">{{person.action}}</button>
            </sc-if>
          </span>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; align-items: flex-start; gap: 9px; margin-top: 12px; border: 1px solid #FECACA; border-radius: 12px; background: #FEF2F2; padding: 11px 13px">
      <span style="flex-shrink: 0; margin-top: 1px">${svg(ICONS.alert, '#DC2626', 15)}</span>
      <p style="margin: 0; flex: 1; font-size: 11px; color: #991b1b; line-height: 1.45">3 créneaux n’ont aucun volontaire : Blomet scanner, mardis 13, 20 et 27 après-midi. Ces places resteront vides.</p>
    </div>
  </div>

  ${mobileTabBar([
    { label: 'Campagnes', icon: 'calendar', active: false },
    { label: 'Suivi', icon: 'users', active: true },
    { label: 'Planning', icon: 'planning', active: false },
    { label: 'Compteurs', icon: 'chart', active: false }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { filter: 'all' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  roster() {
    return [
      { initials: 'TP', name: 'Théo Pezel', status: 'SUBMITTED', declared: 21, lastOpened: '14 sept.', reminders: 0 },
      { initials: 'AB', name: 'A. Bernard', status: 'SUBMITTED', declared: 18, lastOpened: '13 sept.', reminders: 0 },
      { initials: 'SR', name: 'S. Rousseau', status: 'SUBMITTED', declared: 24, lastOpened: '15 sept.', reminders: 1 },
      { initials: 'MN', name: 'M. Nguyen', status: 'SUBMITTED', declared: 12, lastOpened: '11 sept.', reminders: 0 },
      { initials: 'CD', name: 'C. Dumont', status: 'SUBMITTED', declared: 4, lastOpened: '15 sept.', reminders: 2 },
      { initials: 'FL', name: 'F. Leroy', status: 'IN_PROGRESS', declared: 7, lastOpened: 'hier', reminders: 2 },
      { initials: 'JV', name: 'J. Vidal', status: 'NOT_STARTED', declared: 0, lastOpened: 'jamais', reminders: 3 },
      { initials: 'ML', name: 'M. Lefèvre', status: 'DECLINED_MONTH', declared: 0, lastOpened: '9 sept.', reminders: 1 }
    ];
  }

  renderVals() {
    const statusStyles = {
      SUBMITTED: { label: 'Validée', style: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857', color: '#16a34a' },
      IN_PROGRESS: { label: 'En cours', style: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C', color: '#d97706' },
      NOT_STARTED: { label: 'Aucune', style: 'border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626', color: '#dc2626' },
      DECLINED_MONTH: { label: 'Indispo mois', style: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765', color: '#c4ccd6' }
    };

    const all = this.roster();

    const filterDefs = [
      { id: 'all', label: 'Tout le monde' },
      { id: 'pending', label: 'À relancer' }
    ];

    const filters = filterDefs.map((entry) => {
      const active = entry.id === this.state.filter;
      return {
        label: entry.label,
        bg: active ? '#122f54' : '#ffffff',
        border: active ? '#122f54' : '#dde2e9',
        fg: active ? '#ffffff' : '#4d5765',
        weight: active ? '600' : '500',
        pick: () => this.setState({ filter: entry.id })
      };
    });

    const isPending = (person) => person.status === 'NOT_STARTED' || person.status === 'IN_PROGRESS';
    const visible = this.state.filter === 'pending' ? all.filter(isPending) : all;

    const mailGlyph = this.glyph('<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="m2 7 10 6 10-6"></path>', '#EA580C', 15);

    const people = visible.map((person) => {
      const tone = statusStyles[person.status];
      const pending = isPending(person);
      return {
        initials: person.initials,
        name: person.name,
        detail: person.status === 'DECLINED_MONTH'
          ? 'aucun créneau ce mois-ci'
          : person.declared + ' créneaux déclarés · vu ' + person.lastOpened + (person.reminders ? ' · ' + person.reminders + ' relances' : ''),
        statusLabel: tone.label,
        statusStyle: tone.style,
        bg: pending ? '#fffdf9' : '#ffffff',
        avatarBg: person.status === 'SUBMITTED' ? '#eceff3' : '#FFF3E9',
        avatarFg: person.status === 'SUBMITTED' ? '#4d5765' : '#EA580C',
        pending,
        action: mailGlyph
      };
    });

    const submitted = all.filter((person) => person.status === 'SUBMITTED').length;

    return {
      filters,
      people,
      doneLabel: submitted + ' / ' + all.length,
      progress: all.map((person) => ({ color: statusStyles[person.status].color })),
      legend: [
        { label: 'validée', color: '#16a34a' },
        { label: 'en cours', color: '#d97706' },
        { label: 'aucune réponse', color: '#dc2626' },
        { label: 'indisponible', color: '#c4ccd6' }
      ]
    };
  }
}`

export default {
  file: 'SuiviMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
