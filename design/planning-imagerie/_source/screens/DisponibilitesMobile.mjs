import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Mes disponibilités', 'Octobre 2026 · clôture le 15 sept.', { initials: 'AB' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}">

    <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #ffffff; border-bottom: 1px solid #dde2e9">
      <sc-for list="{{tallies}}" as="tally" hint-placeholder-count="4">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; border-radius: 10px; background: {{tally.bg}}; padding: 7px 4px">
          <span style="font-size: 16px; font-weight: 700; color: {{tally.fg}}; line-height: 1; font-variant-numeric: tabular-nums">{{tally.value}}</span>
          <span style="font-size: 10px; font-weight: 500; color: {{tally.fg}}; text-align: center; line-height: 1.2">{{tally.label}}</span>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; align-items: flex-start; gap: 8px; margin: 12px 16px 0; border: 1px solid #FDBA74; border-radius: 12px; background: #FFF3E9; padding: 10px 12px">
      <span style="flex-shrink: 0; margin-top: 1px">${svg(ICONS.alert, '#EA580C', 15)}</span>
      <p style="margin: 0; flex: 1; font-size: 12px; color: #92400e; line-height: 1.4">Sans réponse vaut indisponibilité. {{remainingLabel}}</p>
    </div>

    <div style="display: flex; align-items: center; gap: 6px; padding: 12px 16px 8px; overflow: hidden">
      <sc-for list="{{weeks}}" as="week" hint-placeholder-count="5">
        <button type="button" onClick="{{week.pick}}" style="flex: 1; min-height: 34px; border: 1px solid {{week.border}}; border-radius: 10px; background: {{week.bg}}; font-family: inherit; font-size: 13px; font-weight: {{week.weight}}; color: {{week.fg}}; cursor: pointer; padding: 0">{{week.label}}</button>
      </sc-for>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px; padding: 4px 16px 16px; height: 452px; overflow: hidden">
      <sc-for list="{{days}}" as="day" hint-placeholder-count="3">
        <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); overflow: hidden">
          <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #eceff3; background: #fafbfc">
            <span style="flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #141a22">{{day.label}}</span>
            <button type="button" onClick="{{day.markAll}}" style="min-height: 30px; border: 1px solid #dde2e9; border-radius: 8px; background: #ffffff; padding: 0 10px; font-family: inherit; font-size: 12px; font-weight: 500; color: #4d5765; cursor: pointer">{{day.markLabel}}</button>
          </div>
          <div style="display: flex; flex-direction: column">
            <sc-for list="{{day.slots}}" as="slot" hint-placeholder-count="3">
              <div onClick="{{slot.cycle}}" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 9px 14px; border-bottom: 1px solid #f5f7fa; background: {{slot.bg}}; cursor: pointer">
                <span style="width: 3px; height: 34px; flex-shrink: 0; border-radius: 2px; background: {{slot.centerColor}}"></span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; font-weight: 500; color: #141a22">{{slot.center}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{slot.line}}</span>
                </span>
                <span style="display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; border-radius: 999px; background: {{slot.pillBg}}; padding: 5px 11px 5px 8px">
                  <span style="display: flex">{{slot.icon}}</span>
                  <span style="font-size: 11px; font-weight: 600; color: {{slot.pillFg}}">{{slot.stateLabel}}</span>
                </span>
              </div>
            </sc-for>
          </div>
        </section>
      </sc-for>
    </div>

    <div style="display: flex; align-items: center; gap: 10px; padding: 0 16px 14px">
      <span style="display: inline-flex; align-items: center; gap: 6px; flex: 1; font-size: 12px; color: #047857">${svg(ICONS.check, '#047857', 14)}Enregistré</span>
      <button type="button" onClick="{{submit}}" style="min-height: 44px; border: none; border-radius: 12px; background: {{submitBg}}; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 0 20px; font-family: inherit; font-size: 14px; font-weight: 600; color: #ffffff; cursor: pointer">{{submitLabel}}</button>
    </div>
  </div>

  ${mobileTabBar([
    { label: 'Mon mois', icon: 'calendar', active: false },
    { label: 'Dispos', icon: 'check', active: true },
    { label: 'Compteurs', icon: 'chart', active: false },
    { label: 'Échanges', icon: 'swap', active: false }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { week: 41, states: {}, submitted: false };
  }

  centers() {
    return {
      BERGERE: { label: 'Bergère', color: '#1f4b86' },
      BLOMET: { label: 'Blomet', color: '#047857' },
      LARIBOISIERE: { label: 'Lariboisière', color: '#b45309' }
    };
  }

  pattern() {
    return {
      1: [['MORNING', 'BERGERE', 'IRM'], ['MORNING', 'BERGERE', 'Scanner'], ['AFTERNOON', 'LARIBOISIERE', 'IRM']],
      2: [['MORNING', 'BLOMET', 'Scanner'], ['AFTERNOON', 'BERGERE', 'IRM']],
      3: [['MORNING', 'LARIBOISIERE', 'IRM'], ['MORNING', 'LARIBOISIERE', 'Scanner'], ['AFTERNOON', 'BLOMET', 'IRM']],
      4: [['MORNING', 'BERGERE', 'Scanner'], ['AFTERNOON', 'LARIBOISIERE', 'IRM'], ['AFTERNOON', 'LARIBOISIERE', 'Scanner']],
      5: [['MORNING', 'BLOMET', 'IRM'], ['AFTERNOON', 'BERGERE', 'Scanner']]
    };
  }

  hash(text) {
    let value = 7;
    for (let position = 0; position < text.length; position += 1) {
      value = (value * 31 + text.charCodeAt(position)) % 100000;
    }
    return value;
  }

  slots() {
    const pattern = this.pattern();
    const built = [];
    for (let dayNumber = 1; dayNumber <= 31; dayNumber += 1) {
      const date = new Date(Date.UTC(2026, 9, dayNumber));
      const weekday = date.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      (pattern[weekday] || []).forEach((entry, position) => {
        built.push({
          id: 'd' + dayNumber + '-' + position,
          dayNumber, date, halfDay: entry[0], center: entry[1], modality: entry[2]
        });
      });
    }
    return built;
  }

  isoWeek(date) {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil(((copy - yearStart) / 86400000 + 1) / 7);
  }

  initialState(id) {
    const draw = this.hash(id) % 10;
    if (draw < 4) return 'AVAILABLE';
    if (draw === 4) return 'PREFERRED';
    if (draw < 7) return 'UNAVAILABLE';
    return 'NONE';
  }

  stateOf(id) {
    return this.state.states[id] === undefined ? this.initialState(id) : this.state.states[id];
  }

  paint(status) {
    const glyph = (path, color) =>
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    return {
      AVAILABLE: { label: 'Dispo', bg: '#ffffff', pillBg: '#ECFDF5', pillFg: '#047857', icon: glyph('<path d="M20 6 9 17l-5-5"></path>', '#047857') },
      PREFERRED: { label: 'Priorité', bg: '#ffffff', pillBg: '#EFF6FF', pillFg: '#2563EB', icon: glyph('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"></path>', '#2563EB') },
      UNAVAILABLE: { label: 'Indispo', bg: '#fafbfc', pillBg: '#eceff3', pillFg: '#6b7685', icon: glyph('<path d="M5 12h14"></path>', '#6b7685') },
      NONE: { label: 'À remplir', bg: '#fffdf9', pillBg: '#FFF3E9', pillFg: '#EA580C', icon: glyph('<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>', '#EA580C') }
    }[status];
  }

  renderVals() {
    const weekdayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const centers = this.centers();
    const all = this.slots();
    const order = ['UNAVAILABLE', 'AVAILABLE', 'PREFERRED'];

    const weekNumbers = [];
    all.forEach((slot) => {
      const week = this.isoWeek(slot.date);
      if (weekNumbers.indexOf(week) === -1) weekNumbers.push(week);
    });
    weekNumbers.sort((left, right) => left - right);

    const weeks = weekNumbers.map((week) => {
      const active = this.state.week === week;
      return {
        label: 'S' + week,
        bg: active ? '#122f54' : '#ffffff',
        border: active ? '#122f54' : '#dde2e9',
        fg: active ? '#ffffff' : '#4d5765',
        weight: active ? '600' : '500',
        pick: () => this.setState({ week })
      };
    });

    const activeWeek = weekNumbers.indexOf(this.state.week) === -1 ? weekNumbers[0] : this.state.week;
    const weekSlots = all.filter((slot) => this.isoWeek(slot.date) === activeWeek);

    const dayNumbers = [];
    weekSlots.forEach((slot) => {
      if (dayNumbers.indexOf(slot.dayNumber) === -1) dayNumbers.push(slot.dayNumber);
    });
    dayNumbers.sort((left, right) => left - right);

    const days = dayNumbers.slice(0, 3).map((dayNumber) => {
      const daySlots = weekSlots.filter((slot) => slot.dayNumber === dayNumber);
      const allAvailable = daySlots.every((slot) => this.stateOf(slot.id) === 'AVAILABLE');
      return {
        label: weekdayNames[daySlots[0].date.getUTCDay()] + ' ' + dayNumber + ' octobre',
        markLabel: allAvailable ? 'Tout indispo' : 'Tout dispo',
        markAll: () => {
          const next = Object.assign({}, this.state.states);
          daySlots.forEach((slot) => { next[slot.id] = allAvailable ? 'UNAVAILABLE' : 'AVAILABLE'; });
          this.setState({ states: next, submitted: false });
        },
        slots: daySlots.map((slot) => {
          const status = this.stateOf(slot.id);
          const skin = this.paint(status);
          return {
            center: centers[slot.center].label,
            centerColor: centers[slot.center].color,
            line: slot.modality + ' · ' + (slot.halfDay === 'MORNING' ? 'matin' : 'après-midi'),
            stateLabel: skin.label,
            bg: skin.bg,
            pillBg: skin.pillBg,
            pillFg: skin.pillFg,
            icon: skin.icon,
            cycle: () => {
              const position = order.indexOf(status);
              const next = Object.assign({}, this.state.states);
              next[slot.id] = order[(position + 1) % order.length];
              this.setState({ states: next, submitted: false });
            }
          };
        })
      };
    });

    const counts = { AVAILABLE: 0, PREFERRED: 0, UNAVAILABLE: 0, NONE: 0 };
    all.forEach((slot) => { counts[this.stateOf(slot.id)] += 1; });

    return {
      weeks,
      days,
      tallies: [
        { value: String(counts.AVAILABLE), label: 'dispo', bg: '#ECFDF5', fg: '#047857' },
        { value: String(counts.PREFERRED), label: 'priorité', bg: '#EFF6FF', fg: '#2563EB' },
        { value: String(counts.UNAVAILABLE), label: 'indispo', bg: '#eceff3', fg: '#4d5765' },
        { value: String(counts.NONE), label: 'à remplir', bg: '#FFF3E9', fg: '#EA580C' }
      ],
      remainingLabel: counts.NONE === 0
        ? 'Tout est renseigné.'
        : 'Il reste ' + counts.NONE + ' vacation' + (counts.NONE > 1 ? 's' : '') + ' sans réponse.',
      submitLabel: this.state.submitted ? 'Validé' : 'Valider',
      submitBg: this.state.submitted ? '#047857' : '#d61f55',
      submit: () => this.setState({ submitted: !this.state.submitted })
    };
  }
}`

export default {
  file: 'DisponibilitesMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
