import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('app', { initials: 'AB', name: 'Alix', role: 'Imageur senior' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Compteurs et équité',
      'Vous voyez les compteurs nominatifs de l’ensemble des seniors. C’est ce qui rend l’équité vérifiable par chacun.',
      `${button('Exporter', 'outline', 'download')}`
    )}

    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px">
      <div style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eceff3">
        <sc-for list="{{periods}}" as="period" hint-placeholder-count="3">
          <button type="button" onClick="{{period.pick}}" style="border: none; border-radius: 8px; background: {{period.bg}}; box-shadow: {{period.shadow}}; padding: 7px 14px; font-family: inherit; font-size: 13px; font-weight: {{period.weight}}; color: {{period.fg}}; cursor: pointer">{{period.label}}</button>
        </sc-for>
      </div>
      <span style="font-size: 13px; color: #6b7685">{{periodNote}}</span>
    </div>

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <section style="${CARD}; padding: 22px 24px; border-left: 4px solid #ec3b68">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px">
            <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; background: #ec3b68; color: #ffffff; font-size: 12px; font-weight: 600">AB</span>
            <h2 style="margin: 0; flex: 1; font-size: 16px; font-weight: 600; color: #141a22">Mes compteurs</h2>
            <span style="font-size: 13px; color: #6b7685">{{myPosition}}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px">
            <sc-for list="{{myStats}}" as="stat" hint-placeholder-count="8">
              <div style="border: 1px solid #eceff3; border-radius: 12px; background: #fafbfc; padding: 13px 14px">
                <p style="margin: 0; font-size: 12px; color: #6b7685; line-height: 1.3; min-height: 31px">{{stat.label}}</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
                <p style="margin: 4px 0 0; font-size: 12px; font-weight: 500; color: {{stat.deltaColor}}">{{stat.delta}}</p>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Tous les seniors</h2>
            <span style="font-size: 13px; color: #6b7685">trié par écart à la moyenne · {{spreadNote}}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 200px 76px 76px 76px 92px; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Personne</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Vacations</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">IRM</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Scanner</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Doubles</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Écart</span>
          </div>

          <sc-for list="{{roster}}" as="person" hint-placeholder-count="7">
            <div style="display: grid; grid-template-columns: 1fr 200px 76px 76px 76px 92px; align-items: center; gap: 0; border-bottom: 1px solid #eceff3; padding: 11px 20px; background: {{person.bg}}">
              <span style="display: flex; align-items: center; gap: 10px; min-width: 0; padding-right: 12px">
                <span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 999px; background: {{person.avatarBg}}; color: {{person.avatarFg}}; font-size: 11px; font-weight: 600">{{person.initials}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; font-weight: {{person.weight}}; color: #141a22">{{person.name}}</span>
                  <span style="display: block; font-size: 12px; color: #9aa5b3">{{person.note}}</span>
                </span>
              </span>
              <span style="display: flex; align-items: center; gap: 10px; padding-right: 20px">
                <span style="position: relative; flex: 1; height: 18px; border-radius: 6px; background: #f5f7fa; overflow: hidden">
                  <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{person.pct}}; border-radius: 6px; background: {{person.color}}"></span>
                  <span style="position: absolute; left: {{person.targetPct}}; top: 0; bottom: 0; width: 2px; background: #9aa5b3"></span>
                </span>
                <span style="width: 20px; flex-shrink: 0; text-align: right; font-size: 14px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{person.total}}</span>
              </span>
              <span style="text-align: right; font-size: 13px; color: #4d5765; font-variant-numeric: tabular-nums">{{person.irm}}</span>
              <span style="text-align: right; font-size: 13px; color: #4d5765; font-variant-numeric: tabular-nums">{{person.ct}}</span>
              <span style="text-align: right; font-size: 13px; color: {{person.doubleColor}}; font-variant-numeric: tabular-nums">{{person.doubles}}</span>
              <span style="display: flex; justify-content: flex-end">
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; {{person.gapStyle}}">{{person.gap}}</span>
              </span>
            </div>
          </sc-for>

          <div style="display: flex; align-items: center; gap: 10px; padding: 14px 20px">
            ${svg(ICONS.info, '#9aa5b3', 15)}
            <span style="font-size: 12px; color: #9aa5b3; line-height: 1.45">Le trait gris marque la cible, plafonnée par le nombre de créneaux déclarés disponibles : une personne peu disponible n’accumule pas de dette pour des vacations qu’elle n’aurait de toute façon pas pu prendre (RG-35).</span>
          </div>
        </section>

        <section style="${CARD}; padding: 22px 24px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Cumul mensuel sur douze mois</h2>
            <div style="display: flex; align-items: center; gap: 16px; font-size: 12px; color: #6b7685">
              <span style="display: flex; align-items: center; gap: 6px"><span style="width: 14px; height: 3px; border-radius: 2px; background: #ec3b68"></span>Moi</span>
              <span style="display: flex; align-items: center; gap: 6px"><span style="width: 14px; height: 3px; border-radius: 2px; background: #c4ccd6"></span>Moyenne des seniors</span>
            </div>
          </div>
          <div style="display: flex; align-items: flex-end; gap: 10px; height: 168px">
            <sc-for list="{{trend}}" as="month" hint-placeholder-count="12">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; min-width: 0; height: 100%">
                <span style="display: flex; align-items: flex-end; justify-content: center; gap: 3px; flex: 1; width: 100%">
                  <span style="width: 45%; height: {{month.mineHeight}}; border-radius: 4px 4px 0 0; background: #ec3b68"></span>
                  <span style="width: 45%; height: {{month.averageHeight}}; border-radius: 4px 4px 0 0; background: #dde2e9"></span>
                </span>
                <span style="font-size: 11px; color: {{month.labelColor}}; white-space: nowrap">{{month.label}}</span>
              </div>
            </sc-for>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 356px; flex-shrink: 0">

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #141a22">Ma ventilation</h3>
          <div style="display: flex; flex-direction: column; gap: 18px">
            <sc-for list="{{breakdowns}}" as="group" hint-placeholder-count="3">
              <div>
                <p style="margin: 0 0 9px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #9aa5b3">{{group.title}}</p>
                <div style="display: flex; flex-direction: column; gap: 8px">
                  <sc-for list="{{group.rows}}" as="row" hint-placeholder-count="3">
                    <div style="display: flex; align-items: center; gap: 10px">
                      <span style="width: 92px; flex-shrink: 0; font-size: 13px; color: #363f4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{row.label}}</span>
                      <span style="position: relative; flex: 1; height: 14px; border-radius: 4px; background: #f5f7fa; overflow: hidden">
                        <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{row.pct}}; border-radius: 4px; background: {{row.color}}"></span>
                      </span>
                      <span style="width: 18px; flex-shrink: 0; text-align: right; font-size: 13px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{row.value}}</span>
                    </div>
                  </sc-for>
                </div>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Taux d’affectation</h3>
          <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px">
            <span style="font-size: 34px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">44 %</span>
            <span style="font-size: 13px; color: #6b7685">de mes disponibilités</span>
          </div>
          <span style="display: block; height: 8px; border-radius: 999px; background: #eceff3; overflow: hidden">
            <span style="display: block; height: 8px; width: 44%; border-radius: 999px; background: #ec3b68"></span>
          </span>
          <p style="margin: 12px 0 0; font-size: 12px; color: #6b7685; line-height: 1.5">Vous avez déclaré 18 créneaux disponibles ce mois-ci et reçu 8 vacations. Déclarer davantage de disponibilités augmente les options du moteur sans augmenter mécaniquement votre charge.</p>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Dettes et crédits reportés</h3>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <sc-for list="{{debts}}" as="entry" hint-placeholder-count="4">
              <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #eceff3; border-radius: 10px; background: #fafbfc; padding: 9px 12px">
                <span style="flex: 1; min-width: 0; font-size: 13px; color: #363f4c">{{entry.name}}</span>
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; flex-shrink: 0; font-size: 12px; font-weight: 600; {{entry.style}}">{{entry.value}}</span>
              </div>
            </sc-for>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">À la clôture d’une campagne, l’écart entre les vacations reçues et la cible du mois est enregistré. L’objectif G4 favorise les personnes créditrices le mois suivant (RG-34).</p>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { period: 'month' };
  }

  datasets() {
    return {
      month: {
        note: 'campagne d’octobre 2026, après échanges validés',
        target: 6.6,
        scale: 11,
        roster: [
          { initials: 'SR', name: 'S. Rousseau', total: 9, irm: 5, ct: 4, doubles: 0, declared: 24 },
          { initials: 'AB', name: 'A. Bernard', total: 8, irm: 5, ct: 3, doubles: 0, declared: 18, me: true },
          { initials: 'TP', name: 'Théo Pezel', total: 8, irm: 4, ct: 4, doubles: 6, declared: 21, coordinator: true },
          { initials: 'FL', name: 'F. Leroy', total: 7, irm: 3, ct: 4, doubles: 0, declared: 16 },
          { initials: 'MN', name: 'M. Nguyen', total: 6, irm: 4, ct: 2, doubles: 0, declared: 12 },
          { initials: 'JV', name: 'J. Vidal', total: 6, irm: 2, ct: 4, doubles: 0, declared: 14 },
          { initials: 'CD', name: 'C. Dumont', total: 4, irm: 2, ct: 2, doubles: 0, declared: 4 }
        ]
      },
      year: {
        note: 'cumul depuis le 1er janvier 2026',
        target: 58.4,
        scale: 74,
        roster: [
          { initials: 'TP', name: 'Théo Pezel', total: 68, irm: 34, ct: 34, doubles: 41, declared: 172, coordinator: true },
          { initials: 'SR', name: 'S. Rousseau', total: 64, irm: 36, ct: 28, doubles: 0, declared: 188 },
          { initials: 'AB', name: 'A. Bernard', total: 61, irm: 33, ct: 28, doubles: 0, declared: 141, me: true },
          { initials: 'FL', name: 'F. Leroy', total: 58, irm: 27, ct: 31, doubles: 0, declared: 132 },
          { initials: 'MN', name: 'M. Nguyen', total: 54, irm: 31, ct: 23, doubles: 0, declared: 108 },
          { initials: 'JV', name: 'J. Vidal', total: 51, irm: 22, ct: 29, doubles: 0, declared: 119 },
          { initials: 'CD', name: 'C. Dumont', total: 33, irm: 16, ct: 17, doubles: 0, declared: 41 }
        ]
      },
      rolling: {
        note: 'douze derniers mois glissants, d’octobre 2025 à septembre 2026',
        target: 77.7,
        scale: 96,
        roster: [
          { initials: 'TP', name: 'Théo Pezel', total: 89, irm: 45, ct: 44, doubles: 53, declared: 224, coordinator: true },
          { initials: 'SR', name: 'S. Rousseau', total: 86, irm: 48, ct: 38, doubles: 0, declared: 246 },
          { initials: 'AB', name: 'A. Bernard', total: 82, irm: 44, ct: 38, doubles: 0, declared: 189, me: true },
          { initials: 'FL', name: 'F. Leroy', total: 78, irm: 36, ct: 42, doubles: 0, declared: 176 },
          { initials: 'MN', name: 'M. Nguyen', total: 72, irm: 41, ct: 31, doubles: 0, declared: 143 },
          { initials: 'JV', name: 'J. Vidal', total: 69, irm: 30, ct: 39, doubles: 0, declared: 158 },
          { initials: 'CD', name: 'C. Dumont', total: 48, irm: 23, ct: 25, doubles: 0, declared: 62 }
        ]
      }
    };
  }

  renderVals() {
    const sets = this.datasets();
    const periodDefs = [
      { id: 'month', label: 'Octobre 2026' },
      { id: 'year', label: 'Cumul annuel' },
      { id: 'rolling', label: '12 mois glissants' }
    ];

    const periods = periodDefs.map((entry) => {
      const active = entry.id === this.state.period;
      return {
        label: entry.label,
        bg: active ? '#ffffff' : 'transparent',
        fg: active ? '#141a22' : '#6b7685',
        weight: active ? '600' : '500',
        shadow: active ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
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
        name: person.name,
        note: person.me ? 'vous' : person.coordinator ? 'coordinateur' : person.declared + ' créneaux déclarés',
        total: String(person.total),
        irm: String(person.irm),
        ct: String(person.ct),
        doubles: person.doubles ? String(person.doubles) : '—',
        doubleColor: person.doubles ? '#1f4b86' : '#c4ccd6',
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
    const spread = Math.max.apply(null, totals) - Math.min.apply(null, totals);
    const rank = data.roster.slice().sort((left, right) => right.total - left.total).findIndex((person) => person.me) + 1;

    const deltaOf = (value, reference, unit) => {
      const gap = Math.round((value - reference) * 10) / 10;
      return {
        text: (gap > 0 ? '+' : '') + gap + (unit || '') + ' vs moyenne',
        color: Math.abs(gap) < 1 ? '#9aa5b3' : gap > 0 ? '#2563EB' : '#EA580C'
      };
    };

    const averageIrm = data.roster.reduce((sum, person) => sum + person.irm, 0) / data.roster.length;
    const averageCt = data.roster.reduce((sum, person) => sum + person.ct, 0) / data.roster.length;

    const totalDelta = deltaOf(me.total, target);
    const irmDelta = deltaOf(me.irm, averageIrm);
    const ctDelta = deltaOf(me.ct, averageCt);

    const myStats = [
      { label: 'Vacations', value: String(me.total), delta: totalDelta.text, deltaColor: totalDelta.color },
      { label: 'IRM cardiaque', value: String(me.irm), delta: irmDelta.text, deltaColor: irmDelta.color },
      { label: 'Scanner cardiaque', value: String(me.ct), delta: ctDelta.text, deltaColor: ctDelta.color },
      { label: 'Matin / après-midi', value: Math.ceil(me.total / 2) + ' / ' + Math.floor(me.total / 2), delta: 'réparti', deltaColor: '#9aa5b3' },
      { label: 'Doubles vacations', value: '—', delta: 'réservé au coordinateur', deltaColor: '#9aa5b3' },
      { label: 'Créneaux déclarés disponibles', value: String(me.declared), delta: 'taux d’affectation ' + Math.round((me.total / me.declared) * 100) + ' %', deltaColor: '#9aa5b3' },
      { label: 'Écart à la cible', value: (me.total - target > 0 ? '+' : '') + Math.round((me.total - target) * 10) / 10, delta: 'cible ' + target, deltaColor: '#9aa5b3' },
      { label: 'Rang dans la population', value: rank + 'e', delta: 'sur ' + data.roster.length + ' seniors', deltaColor: '#9aa5b3' }
    ];

    const monthNames = ['oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.'];
    const mineSeries = [7, 8, 5, 9, 8, 7, 8, 9, 6, 4, 5, 8];
    const averageSeries = [6.4, 7.1, 5.8, 7.9, 7.4, 6.8, 7.2, 8.1, 6.6, 4.8, 5.4, 7.3];
    const peak = 10;

    const trend = monthNames.map((label, position) => ({
      label,
      mineHeight: Math.round((mineSeries[position] / peak) * 100) + '%',
      averageHeight: Math.round((averageSeries[position] / peak) * 100) + '%',
      labelColor: position === monthNames.length - 1 ? '#141a22' : '#9aa5b3'
    }));

    const barOf = (value, max, color) => ({ pct: Math.round((value / max) * 100) + '%', color });

    const breakdowns = [
      {
        title: 'Par modalité',
        rows: [
          Object.assign({ label: 'IRM cardiaque', value: String(me.irm) }, barOf(me.irm, me.total, '#1f4b86')),
          Object.assign({ label: 'Scanner', value: String(me.ct) }, barOf(me.ct, me.total, '#3f6aa3'))
        ]
      },
      {
        title: 'Par centre',
        rows: [
          Object.assign({ label: 'Bergère', value: String(Math.round(me.total * 0.45)) }, barOf(Math.round(me.total * 0.45), me.total, '#1f4b86')),
          Object.assign({ label: 'Blomet', value: String(Math.round(me.total * 0.2)) }, barOf(Math.round(me.total * 0.2), me.total, '#047857')),
          Object.assign({ label: 'Lariboisière', value: String(Math.round(me.total * 0.35)) }, barOf(Math.round(me.total * 0.35), me.total, '#b45309'))
        ]
      },
      {
        title: 'Par demi-journée',
        rows: [
          Object.assign({ label: 'Matin', value: String(Math.ceil(me.total / 2)) }, barOf(Math.ceil(me.total / 2), me.total, '#6b7685')),
          Object.assign({ label: 'Après-midi', value: String(Math.floor(me.total / 2)) }, barOf(Math.floor(me.total / 2), me.total, '#9aa5b3'))
        ]
      }
    ];

    const creditStyle = 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857';
    const debtStyle = 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C';
    const flatStyle = 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765';

    return {
      periods,
      periodNote: data.note,
      myStats,
      myPosition: rank + 'e sur ' + data.roster.length + ' · écart à la cible ' + (me.total - target > 0 ? '+' : '') + Math.round((me.total - target) * 10) / 10,
      roster,
      spreadNote: 'écart max ' + Math.round(spread * 10) / 10,
      trend,
      breakdowns,
      debts: [
        { name: 'C. Dumont', value: '+2 crédits', style: creditStyle },
        { name: 'M. Nguyen', value: '+1 crédit', style: creditStyle },
        { name: 'A. Bernard, vous', value: 'à l’équilibre', style: flatStyle },
        { name: 'S. Rousseau', value: '−2 dettes', style: debtStyle }
      ]
    };
  }
}`

export default {
  file: 'Compteurs.dc.html',
  width: 1440,
  height: 1240,
  body,
  logic,
  props: '{}'
}
