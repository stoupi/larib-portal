import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('app', { initials: 'AB', name: 'Alix', role: 'Imageur senior' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Mes disponibilités — Octobre 2026',
      'Recueil ouvert jusqu’au 15 septembre à 23h59. Vous pouvez revenir modifier votre saisie autant de fois que nécessaire.',
      `${button('Vue liste', 'outline', 'filter')}`
    )}

    <section style="${CARD}; display: flex; align-items: center; gap: 20px; padding: 16px 24px; margin-bottom: 16px">
      <sc-for list="{{tallies}}" as="tally" hint-placeholder-count="4">
        <div style="display: flex; align-items: center; gap: 12px; padding-right: 20px; border-right: 1px solid #eceff3">
          <span style="display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; background: {{tally.bg}}; color: {{tally.fg}}; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums">{{tally.value}}</span>
          <span style="font-size: 13px; color: #4d5765; line-height: 1.35; max-width: 116px">{{tally.label}}</span>
        </div>
      </sc-for>
      <div style="flex: 1; min-width: 0"></div>
      <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0">
        <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: {{saveColor}}">{{saveIcon}}{{saveLabel}}</span>
        <button type="button" onClick="{{submit}}" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 16px; border: none; border-radius: 10px; background: {{submitBg}}; box-shadow: 0 1px 2px rgba(16,28,48,0.06); font-family: inherit; font-size: 14px; font-weight: 500; color: #ffffff; cursor: pointer">{{submitLabel}}</button>
      </div>
    </section>

    <section style="display: flex; align-items: flex-start; gap: 12px; border: 1px solid #FDBA74; border-radius: 16px; background: #FFF3E9; padding: 14px 20px; margin-bottom: 20px">
      <span style="flex-shrink: 0; margin-top: 1px">${svg(ICONS.alert, '#EA580C', 18)}</span>
      <div style="flex: 1; min-width: 0">
        <p style="margin: 0; font-size: 14px; font-weight: 500; color: #EA580C">Une vacation laissée sans réponse vaut indisponibilité.</p>
        <p style="margin: 3px 0 0; font-size: 13px; color: #92400e; line-height: 1.45">Aucune vacation ne pourra vous être attribuée en dehors des créneaux que vous aurez déclarés disponibles. {{remainingLabel}}</p>
      </div>
    </section>

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <section style="${CARD}; flex: 1; min-width: 0; overflow: hidden">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #dde2e9">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Octobre 2026 — 46 vacations proposées</h2>
          <div style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eceff3">
            <sc-for list="{{weeks}}" as="week" hint-placeholder-count="5">
              <button type="button" onClick="{{week.pick}}" style="border: none; border-radius: 8px; background: {{week.bg}}; box-shadow: {{week.shadow}}; padding: 5px 12px; font-family: inherit; font-size: 13px; font-weight: 500; color: {{week.fg}}; cursor: pointer">{{week.label}}</button>
            </sc-for>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 132px 1fr 1fr; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
          <span style="font-size: 12px; font-weight: 500; color: #6b7685">Jour</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685">Matin</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685">Après-midi</span>
        </div>

        <sc-for list="{{days}}" as="day" hint-placeholder-count="5">
          <div style="display: grid; grid-template-columns: 132px 1fr 1fr; gap: 0; border-bottom: 1px solid #eceff3; padding: 12px 20px">
            <div style="padding-right: 12px">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #141a22">{{day.weekday}}</p>
              <p style="margin: 1px 0 0; font-size: 13px; color: #6b7685">{{day.dayLabel}}</p>
              <button type="button" onClick="{{day.markAll}}" style="margin-top: 6px; border: 1px solid #dde2e9; border-radius: 8px; background: #ffffff; padding: 3px 8px; font-family: inherit; font-size: 11px; font-weight: 500; color: #4d5765; cursor: pointer">Toute la journée</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; padding-right: 10px">
              <sc-for list="{{day.morning}}" as="slot" hint-placeholder-count="2">
                <div onClick="{{slot.cycle}}" style="display: flex; align-items: center; gap: 10px; min-height: 44px; border: 1px solid {{slot.border}}; border-left: 3px solid {{slot.centerColor}}; border-radius: 10px; background: {{slot.bg}}; padding: 7px 10px; cursor: pointer">
                  <span style="display: flex; flex-direction: column; flex: 1; min-width: 0">
                    <span style="font-size: 12px; font-weight: 600; color: #363f4c">{{slot.center}}</span>
                    <span style="font-size: 11px; color: #6b7685">{{slot.modality}}</span>
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; border-radius: 999px; background: {{slot.pillBg}}; padding: 3px 9px 3px 6px">
                    <span style="display: flex">{{slot.icon}}</span>
                    <span style="font-size: 11px; font-weight: 600; color: {{slot.pillFg}}">{{slot.stateLabel}}</span>
                  </span>
                </div>
              </sc-for>
              <sc-if value="{{day.morningEmpty}}" hint-placeholder-val="{{false}}">
                <span style="font-size: 12px; color: #c4ccd6">—</span>
              </sc-if>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px">
              <sc-for list="{{day.afternoon}}" as="slot" hint-placeholder-count="2">
                <div onClick="{{slot.cycle}}" style="display: flex; align-items: center; gap: 10px; min-height: 44px; border: 1px solid {{slot.border}}; border-left: 3px solid {{slot.centerColor}}; border-radius: 10px; background: {{slot.bg}}; padding: 7px 10px; cursor: pointer">
                  <span style="display: flex; flex-direction: column; flex: 1; min-width: 0">
                    <span style="font-size: 12px; font-weight: 600; color: #363f4c">{{slot.center}}</span>
                    <span style="font-size: 11px; color: #6b7685">{{slot.modality}}</span>
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; border-radius: 999px; background: {{slot.pillBg}}; padding: 3px 9px 3px 6px">
                    <span style="display: flex">{{slot.icon}}</span>
                    <span style="font-size: 11px; font-weight: 600; color: {{slot.pillFg}}">{{slot.stateLabel}}</span>
                  </span>
                </div>
              </sc-for>
              <sc-if value="{{day.afternoonEmpty}}" hint-placeholder-val="{{false}}">
                <span style="font-size: 12px; color: #c4ccd6">—</span>
              </sc-if>
            </div>
          </div>
        </sc-for>

        <div style="display: flex; align-items: center; gap: 16px; padding: 14px 20px; font-size: 12px; color: #6b7685">
          <span>Un clic fait défiler les trois états :</span>
          <span style="display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; background: #eceff3; padding: 3px 9px 3px 6px">${svg(ICONS.minus, '#6b7685', 13)}<span style="font-size: 11px; font-weight: 600; color: #6b7685">Indisponible</span></span>
          <span style="display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; background: #ECFDF5; padding: 3px 9px 3px 6px">${svg(ICONS.check, '#047857', 13)}<span style="font-size: 11px; font-weight: 600; color: #047857">Disponible</span></span>
          <span style="display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; background: #EFF6FF; padding: 3px 9px 3px 6px">${svg(ICONS.star, '#2563EB', 13)}<span style="font-size: 11px; font-weight: 600; color: #2563EB">Prioritaire</span></span>
        </div>
      </section>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 340px; flex-shrink: 0">

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Actions rapides</h3>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <sc-for list="{{quickActions}}" as="action" hint-placeholder-count="4">
              <button type="button" onClick="{{action.run}}" style="display: flex; align-items: center; gap: 10px; min-height: 40px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 8px 12px; font-family: inherit; font-size: 13px; font-weight: 500; color: #363f4c; cursor: pointer; text-align: left">
                <span style="display: flex; flex-shrink: 0">{{action.icon}}</span>
                <span style="flex: 1; min-width: 0">{{action.label}}</span>
              </button>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #141a22">Pour calibrer votre réponse</h3>
          <div style="display: flex; flex-direction: column; gap: 10px">
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
              <span style="font-size: 13px; color: #6b7685">Vacations du mois</span>
              <span style="font-size: 15px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">46</span>
            </div>
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
              <span style="font-size: 13px; color: #6b7685">Seniors sollicités</span>
              <span style="font-size: 15px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">7</span>
            </div>
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; border-top: 1px solid #eceff3; padding-top: 10px">
              <span style="font-size: 13px; color: #6b7685">Moyenne par personne</span>
              <span style="font-size: 15px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">6,6</span>
            </div>
          </div>
          <p style="margin: 10px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">Information purement indicative (RG-22). Déclarer davantage de disponibilités ne vous engage pas à travailler davantage.</p>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #141a22">Mot au coordinateur</h3>
          <div style="border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 10px 12px; min-height: 76px">
            <p style="margin: 0; font-size: 13px; color: #6b7685; line-height: 1.5">Je suis en congés du 12 au 16 octobre. Je peux dépanner le 30 après-midi si vous êtes bloqués.</p>
          </div>
          <label onClick="{{toggleDecline}}" style="display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; border: 1px solid {{declineBorder}}; border-radius: 10px; background: {{declineBg}}; padding: 10px 12px; cursor: pointer">
            <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; border: 1.5px solid {{declineBox}}; border-radius: 5px; background: {{declineFill}}">{{declineMark}}</span>
            <span style="flex: 1; min-width: 0; font-size: 13px; color: #363f4c; line-height: 1.45">Je ne suis disponible sur aucun créneau ce mois-ci</span>
          </label>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { week: 41, states: {}, submitted: false, declined: false };
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
          dayNumber,
          date,
          halfDay: entry[0],
          center: entry[1],
          modality: entry[2]
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

  /** Seeded starting point so the mockup opens on a partially filled form. */
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

  setSlot(id, value) {
    const next = Object.assign({}, this.state.states);
    next[id] = value;
    this.setState({ states: next, submitted: false });
  }

  paint(status) {
    const glyph = (path, color) =>
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    const map = {
      AVAILABLE: {
        label: 'Disponible', bg: '#ffffff', border: '#A7F3D0', pillBg: '#ECFDF5', pillFg: '#047857',
        icon: glyph('<path d="M20 6 9 17l-5-5"></path>', '#047857')
      },
      PREFERRED: {
        label: 'Prioritaire', bg: '#ffffff', border: '#BFDBFE', pillBg: '#EFF6FF', pillFg: '#2563EB',
        icon: glyph('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"></path>', '#2563EB')
      },
      UNAVAILABLE: {
        label: 'Indisponible', bg: '#fafbfc', border: '#dde2e9', pillBg: '#eceff3', pillFg: '#6b7685',
        icon: glyph('<path d="M5 12h14"></path>', '#6b7685')
      },
      NONE: {
        label: 'Sans réponse', bg: '#ffffff', border: '#FDBA74', pillBg: '#FFF3E9', pillFg: '#EA580C',
        icon: glyph('<path d="M12 9v4M12 17h.01"></path><circle cx="12" cy="12" r="9"></circle>', '#EA580C')
      }
    };
    return map[status];
  }

  renderVals() {
    const weekdayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const centers = this.centers();
    const all = this.slots();
    const order = ['UNAVAILABLE', 'AVAILABLE', 'PREFERRED'];

    const weekNumbers = [];
    all.forEach((slot) => {
      const week = this.isoWeek(slot.date);
      if (weekNumbers.indexOf(week) === -1) weekNumbers.push(week);
    });
    weekNumbers.sort((left, right) => left - right);

    const weeks = weekNumbers.map((week) => ({
      label: 'S' + week,
      bg: this.state.week === week ? '#ffffff' : 'transparent',
      fg: this.state.week === week ? '#141a22' : '#6b7685',
      shadow: this.state.week === week ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
      pick: () => this.setState({ week })
    }));

    const activeWeek = weekNumbers.indexOf(this.state.week) === -1 ? weekNumbers[0] : this.state.week;
    const weekSlots = all.filter((slot) => this.isoWeek(slot.date) === activeWeek);

    const decorate = (slot) => {
      const status = this.stateOf(slot.id);
      const skin = this.paint(status);
      return {
        center: centers[slot.center].label,
        centerColor: centers[slot.center].color,
        modality: slot.modality,
        stateLabel: skin.label,
        bg: skin.bg,
        border: skin.border,
        pillBg: skin.pillBg,
        pillFg: skin.pillFg,
        icon: skin.icon,
        cycle: () => {
          const position = order.indexOf(status);
          const next = order[(position + 1) % order.length];
          this.setSlot(slot.id, next);
        }
      };
    };

    const dayNumbers = [];
    weekSlots.forEach((slot) => {
      if (dayNumbers.indexOf(slot.dayNumber) === -1) dayNumbers.push(slot.dayNumber);
    });
    dayNumbers.sort((left, right) => left - right);

    const days = dayNumbers.map((dayNumber) => {
      const daySlots = weekSlots.filter((slot) => slot.dayNumber === dayNumber);
      const morning = daySlots.filter((slot) => slot.halfDay === 'MORNING');
      const afternoon = daySlots.filter((slot) => slot.halfDay === 'AFTERNOON');
      return {
        weekday: weekdayNames[daySlots[0].date.getUTCDay()],
        dayLabel: dayNumber + ' octobre',
        morning: morning.map(decorate),
        afternoon: afternoon.map(decorate),
        morningEmpty: morning.length === 0,
        afternoonEmpty: afternoon.length === 0,
        markAll: () => {
          const next = Object.assign({}, this.state.states);
          const allAvailable = daySlots.every((slot) => this.stateOf(slot.id) === 'AVAILABLE');
          daySlots.forEach((slot) => { next[slot.id] = allAvailable ? 'UNAVAILABLE' : 'AVAILABLE'; });
          this.setState({ states: next, submitted: false });
        }
      };
    });

    const counts = { AVAILABLE: 0, PREFERRED: 0, UNAVAILABLE: 0, NONE: 0 };
    all.forEach((slot) => { counts[this.stateOf(slot.id)] += 1; });

    const tallies = [
      { value: String(counts.AVAILABLE), label: 'déclarées disponibles', bg: '#ECFDF5', fg: '#047857' },
      { value: String(counts.PREFERRED), label: 'souhaitées en priorité', bg: '#EFF6FF', fg: '#2563EB' },
      { value: String(counts.UNAVAILABLE), label: 'déclarées indisponibles', bg: '#eceff3', fg: '#4d5765' },
      { value: String(counts.NONE), label: 'encore sans réponse', bg: '#FFF3E9', fg: '#EA580C' }
    ];

    const applyAll = (value) => () => {
      const next = {};
      all.forEach((slot) => { next[slot.id] = value; });
      this.setState({ states: next, submitted: false });
    };

    const applyWhere = (test, value) => () => {
      const next = Object.assign({}, this.state.states);
      all.filter(test).forEach((slot) => { next[slot.id] = value; });
      this.setState({ states: next, submitted: false });
    };

    const quickGlyph = (path) =>
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7685" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';

    const quickActions = [
      { label: 'Tout marquer disponible', icon: quickGlyph('<path d="M20 6 9 17l-5-5"></path>'), run: applyAll('AVAILABLE') },
      { label: 'Tout marquer indisponible', icon: quickGlyph('<path d="M5 12h14"></path>'), run: applyAll('UNAVAILABLE') },
      { label: 'Tous les matins disponibles', icon: quickGlyph('<circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>'), run: applyWhere((slot) => slot.halfDay === 'MORNING', 'AVAILABLE') },
      { label: 'Bergère indisponible sur le mois', icon: quickGlyph('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'), run: applyWhere((slot) => slot.center === 'BERGERE', 'UNAVAILABLE') },
      { label: 'Tout le scanner en priorité', icon: quickGlyph('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"></path>'), run: applyWhere((slot) => slot.modality === 'Scanner', 'PREFERRED') }
    ];

    const checkGlyph = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
    const savedGlyph = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';

    return {
      weeks,
      days,
      tallies,
      quickActions,
      remainingLabel: counts.NONE === 0
        ? 'Toutes les vacations du mois ont reçu une réponse.'
        : 'Il vous reste ' + counts.NONE + ' vacation' + (counts.NONE > 1 ? 's' : '') + ' sans réponse.',
      saveIcon: savedGlyph,
      saveLabel: 'Enregistré automatiquement',
      saveColor: '#047857',
      submitLabel: this.state.submitted ? 'Déclaration validée' : 'Valider ma déclaration',
      submitBg: this.state.submitted ? '#047857' : '#d61f55',
      submit: () => this.setState({ submitted: !this.state.submitted }),
      toggleDecline: () => this.setState({ declined: !this.state.declined }),
      declineBg: this.state.declined ? '#FEF2F2' : '#ffffff',
      declineBorder: this.state.declined ? '#FECACA' : '#dde2e9',
      declineBox: this.state.declined ? '#DC2626' : '#c4ccd6',
      declineFill: this.state.declined ? '#DC2626' : '#ffffff',
      declineMark: this.state.declined ? checkGlyph : ''
    };
  }
}`

export default {
  file: 'Disponibilites.dc.html',
  width: 1440,
  height: 1140,
  body,
  logic,
  props: '{}'
}
