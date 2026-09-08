import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Compteurs', 'Équité entre seniors', { initials: 'AB' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}; padding: 14px 16px">

    <div style="display: flex; gap: 6px; margin-bottom: 14px">
      <sc-for list="{{periods}}" as="period" hint-placeholder-count="3">
        <button type="button" onClick="{{period.pick}}" style="flex: 1; min-height: 36px; border: 1px solid {{period.border}}; border-radius: 10px; background: {{period.bg}}; font-family: inherit; font-size: 12px; font-weight: {{period.weight}}; color: {{period.fg}}; cursor: pointer; padding: 0 4px; white-space: nowrap">{{period.label}}</button>
      </sc-for>
    </div>

    <section style="border: 1px solid #dde2e9; border-left: 4px solid #ec3b68; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 14px 16px; margin-bottom: 14px">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
        <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: #ec3b68; color: #ffffff; font-size: 11px; font-weight: 600">AB</span>
        <span style="flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #141a22">Mes compteurs</span>
        <span style="font-size: 12px; color: #6b7685">{{myPosition}}</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
        <sc-for list="{{myStats}}" as="stat" hint-placeholder-count="6">
          <div style="border: 1px solid #eceff3; border-radius: 10px; background: #fafbfc; padding: 9px 10px">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
            <p style="margin: 3px 0 0; font-size: 10px; color: #6b7685; line-height: 1.25">{{stat.label}}</p>
            <p style="margin: 2px 0 0; font-size: 10px; font-weight: 600; color: {{stat.deltaColor}}">{{stat.delta}}</p>
          </div>
        </sc-for>
      </div>
    </section>

    <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); overflow: hidden; margin-bottom: 14px">
      <div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #eceff3; background: #fafbfc">
        <span style="flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #141a22">Tous les seniors</span>
        <span style="font-size: 11px; color: #6b7685">{{spreadNote}}</span>
      </div>
      <div style="display: flex; flex-direction: column">
        <sc-for list="{{roster}}" as="person" hint-placeholder-count="7">
          <div style="display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 8px 14px; border-bottom: 1px solid #f5f7fa; background: {{person.bg}}">
            <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 999px; background: {{person.avatarBg}}; color: {{person.avatarFg}}; font-size: 10px; font-weight: 600">{{person.initials}}</span>
            <span style="flex: 1; min-width: 0">
              <span style="display: block; font-size: 13px; font-weight: {{person.weight}}; color: #141a22; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{person.name}}</span>
              <span style="position: relative; display: block; height: 6px; margin-top: 4px; border-radius: 999px; background: #f5f7fa; overflow: hidden">
                <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{person.pct}}; border-radius: 999px; background: {{person.color}}"></span>
                <span style="position: absolute; left: {{person.targetPct}}; top: 0; bottom: 0; width: 2px; background: #9aa5b3"></span>
              </span>
            </span>
            <span style="width: 24px; flex-shrink: 0; text-align: right; font-size: 14px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{person.total}}</span>
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 42px; flex-shrink: 0; border-radius: 8px; padding: 2px 0; font-size: 11px; font-weight: 600; {{person.gapStyle}}">{{person.gap}}</span>
          </div>
        </sc-for>
      </div>
    </section>

    <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 14px 16px">
      <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #141a22">Ma ventilation</p>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <sc-for list="{{breakdown}}" as="row" hint-placeholder-count="5">
          <div style="display: flex; align-items: center; gap: 10px">
            <span style="width: 82px; flex-shrink: 0; font-size: 12px; color: #363f4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{row.label}}</span>
            <span style="position: relative; flex: 1; height: 12px; border-radius: 4px; background: #f5f7fa; overflow: hidden">
              <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{row.pct}}; border-radius: 4px; background: {{row.color}}"></span>
            </span>
            <span style="width: 16px; flex-shrink: 0; text-align: right; font-size: 12px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{row.value}}</span>
          </div>
        </sc-for>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; border-top: 1px solid #f5f7fa; padding-top: 10px">
        ${svg(ICONS.info, '#9aa5b3', 14)}
        <span style="flex: 1; font-size: 11px; color: #9aa5b3; line-height: 1.4">Le trait gris marque la cible, plafonnée par vos disponibilités déclarées.</span>
      </div>
    </section>
  </div>

  ${mobileTabBar([
    { label: 'Mon mois', icon: 'calendar', active: false },
    { label: 'Dispos', icon: 'check', active: false },
    { label: 'Compteurs', icon: 'chart', active: true },
    { label: 'Échanges', icon: 'swap', active: false }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { period: 'month' };
  }

  datasets() {
    return {
      month: {
        target: 6.6, scale: 11,
        roster: [
          { initials: 'SR', name: 'S. Rousseau', total: 9, irm: 5, ct: 4 },
          { initials: 'AB', name: 'A. Bernard', total: 8, irm: 5, ct: 3, me: true },
          { initials: 'TP', name: 'Théo Pezel', total: 8, irm: 4, ct: 4, coordinator: true },
          { initials: 'FL', name: 'F. Leroy', total: 7, irm: 3, ct: 4 },
          { initials: 'MN', name: 'M. Nguyen', total: 6, irm: 4, ct: 2 },
          { initials: 'JV', name: 'J. Vidal', total: 6, irm: 2, ct: 4 },
          { initials: 'CD', name: 'C. Dumont', total: 4, irm: 2, ct: 2 }
        ]
      },
      year: {
        target: 58.4, scale: 74,
        roster: [
          { initials: 'TP', name: 'Théo Pezel', total: 68, irm: 34, ct: 34, coordinator: true },
          { initials: 'SR', name: 'S. Rousseau', total: 64, irm: 36, ct: 28 },
          { initials: 'AB', name: 'A. Bernard', total: 61, irm: 33, ct: 28, me: true },
          { initials: 'FL', name: 'F. Leroy', total: 58, irm: 27, ct: 31 },
          { initials: 'MN', name: 'M. Nguyen', total: 54, irm: 31, ct: 23 },
          { initials: 'JV', name: 'J. Vidal', total: 51, irm: 22, ct: 29 },
          { initials: 'CD', name: 'C. Dumont', total: 33, irm: 16, ct: 17 }
        ]
      },
      rolling: {
        target: 77.7, scale: 96,
        roster: [
          { initials: 'TP', name: 'Théo Pezel', total: 89, irm: 45, ct: 44, coordinator: true },
          { initials: 'SR', name: 'S. Rousseau', total: 86, irm: 48, ct: 38 },
          { initials: 'AB', name: 'A. Bernard', total: 82, irm: 44, ct: 38, me: true },
          { initials: 'FL', name: 'F. Leroy', total: 78, irm: 36, ct: 42 },
          { initials: 'MN', name: 'M. Nguyen', total: 72, irm: 41, ct: 31 },
          { initials: 'JV', name: 'J. Vidal', total: 69, irm: 30, ct: 39 },
          { initials: 'CD', name: 'C. Dumont', total: 48, irm: 23, ct: 25 }
        ]
      }
    };
  }

  renderVals() {
    const sets = this.datasets();
    const periodDefs = [
      { id: 'month', label: 'Ce mois' },
      { id: 'year', label: 'Année' },
      { id: 'rolling', label: '12 mois' }
    ];

    const periods = periodDefs.map((entry) => {
      const active = entry.id === this.state.period;
      return {
        label: entry.label,
        bg: active ? '#122f54' : '#ffffff',
        border: active ? '#122f54' : '#dde2e9',
        fg: active ? '#ffffff' : '#4d5765',
        weight: active ? '600' : '500',
        pick: () => this.setState({ period: entry.id })
      };
    });

    const data = sets[this.state.period];
    const target = data.target;
    const scale = data.scale;

    const gapStyleFor = (gap) => {
      if (Math.abs(gap) < 1) return 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765';
      if (gap > 0) return 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB';
      return 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C';
    };

    const roster = data.roster.map((person) => {
      const gap = Math.round((person.total - target) * 10) / 10;
      return {
        initials: person.initials,
        name: person.name + (person.me ? ' · vous' : ''),
        total: String(person.total),
        pct: Math.round((person.total / scale) * 100) + '%',
        targetPct: Math.round((target / scale) * 100) + '%',
        color: person.me ? '#ec3b68' : person.coordinator ? '#1f4b86' : '#7197c2',
        bg: person.me ? '#fff8fa' : '#ffffff',
        weight: person.me ? '600' : '500',
        avatarBg: person.me ? '#ec3b68' : '#eceff3',
        avatarFg: person.me ? '#ffffff' : '#4d5765',
        gap: (gap > 0 ? '+' : '') + gap,
        gapStyle: gapStyleFor(gap)
      };
    });

    const me = data.roster.find((person) => person.me);
    const totals = data.roster.map((person) => person.total);
    const spread = Math.round((Math.max.apply(null, totals) - Math.min.apply(null, totals)) * 10) / 10;
    const rank = data.roster.slice().sort((left, right) => right.total - left.total).findIndex((person) => person.me) + 1;

    const averageIrm = data.roster.reduce((sum, person) => sum + person.irm, 0) / data.roster.length;
    const averageCt = data.roster.reduce((sum, person) => sum + person.ct, 0) / data.roster.length;

    const deltaOf = (value, reference) => {
      const gap = Math.round((value - reference) * 10) / 10;
      return {
        text: (gap > 0 ? '+' : '') + gap,
        color: Math.abs(gap) < 1 ? '#9aa5b3' : gap > 0 ? '#2563EB' : '#EA580C'
      };
    };

    const totalDelta = deltaOf(me.total, target);
    const irmDelta = deltaOf(me.irm, averageIrm);
    const ctDelta = deltaOf(me.ct, averageCt);

    const myStats = [
      { label: 'vacations', value: String(me.total), delta: totalDelta.text, deltaColor: totalDelta.color },
      { label: 'IRM', value: String(me.irm), delta: irmDelta.text, deltaColor: irmDelta.color },
      { label: 'scanner', value: String(me.ct), delta: ctDelta.text, deltaColor: ctDelta.color },
      { label: 'matin', value: String(Math.ceil(me.total / 2)), delta: '', deltaColor: '#9aa5b3' },
      { label: 'après-midi', value: String(Math.floor(me.total / 2)), delta: '', deltaColor: '#9aa5b3' },
      { label: 'rang', value: rank + 'e', delta: 'sur ' + data.roster.length, deltaColor: '#9aa5b3' }
    ];

    const barOf = (value, max, color) => ({ pct: Math.round((value / max) * 100) + '%', color });

    const breakdown = [
      Object.assign({ label: 'IRM', value: String(me.irm) }, barOf(me.irm, me.total, '#1f4b86')),
      Object.assign({ label: 'Scanner', value: String(me.ct) }, barOf(me.ct, me.total, '#3f6aa3')),
      Object.assign({ label: 'Bergère', value: String(Math.round(me.total * 0.45)) }, barOf(Math.round(me.total * 0.45), me.total, '#1f4b86')),
      Object.assign({ label: 'Blomet', value: String(Math.round(me.total * 0.2)) }, barOf(Math.round(me.total * 0.2), me.total, '#047857')),
      Object.assign({ label: 'Lariboisière', value: String(Math.round(me.total * 0.35)) }, barOf(Math.round(me.total * 0.35), me.total, '#b45309'))
    ];

    return {
      periods,
      roster,
      myStats,
      myPosition: rank + 'e sur ' + data.roster.length,
      spreadNote: 'écart max ' + spread,
      breakdown
    };
  }
}`

export default {
  file: 'CompteursMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
