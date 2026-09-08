import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('admin', { initials: 'TP', name: 'Théo', role: 'Coordinateur' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Avant génération — Octobre 2026',
      'Recueil des seniors clos le 15 septembre à 23h59. Vérifiez l’état des lieux avant de lancer le moteur.',
      `${button('Rouvrir le recueil', 'outline', 'unlock')}${button('Lancer la génération', 'primary', 'wand')}`
    )}

    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px">
      <sc-for list="{{headline}}" as="stat" hint-placeholder-count="4">
        <div style="${CARD}; padding: 18px 20px">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
            <span style="display: flex">{{stat.icon}}</span>
            <p style="margin: 0; font-size: 12px; font-weight: 500; color: #6b7685">{{stat.label}}</p>
          </div>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: {{stat.color}}; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
          <p style="margin: 6px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.4">{{stat.detail}}</p>
        </div>
      </sc-for>
    </div>

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <section style="${CARD}; flex: 1; min-width: 0; overflow: hidden">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Suivi des réponses</h2>
          <div style="display: flex; align-items: center; gap: 10px">
            <span style="font-size: 13px; color: #6b7685">{{responseSummary}}</span>
            ${button('Relancer les non-répondants', 'outline', 'mail', 'height: 32px; font-size: 13px')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 168px 108px 116px 108px; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
          <span style="font-size: 12px; font-weight: 500; color: #6b7685">Personne</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685">Statut</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Déclarées</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Dernière ouverture</span>
          <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Relances</span>
        </div>

        <sc-for list="{{people}}" as="person" hint-placeholder-count="7">
          <div style="display: grid; grid-template-columns: 1fr 168px 108px 116px 108px; align-items: center; gap: 0; border-bottom: 1px solid #eceff3; padding: 11px 20px; background: {{person.bg}}">
            <span style="display: flex; align-items: center; gap: 10px; min-width: 0; padding-right: 12px">
              <span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 999px; background: {{person.avatarBg}}; color: {{person.avatarFg}}; font-size: 11px; font-weight: 600">{{person.initials}}</span>
              <span style="flex: 1; min-width: 0">
                <span style="display: block; font-size: 14px; font-weight: 500; color: #141a22">{{person.name}}</span>
                <span style="display: block; font-size: 12px; color: #9aa5b3">{{person.role}}</span>
              </span>
            </span>
            <span>
              <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; {{person.statusStyle}}">{{person.statusLabel}}</span>
            </span>
            <span style="text-align: right; font-size: 14px; color: {{person.countColor}}; font-variant-numeric: tabular-nums">{{person.declared}}</span>
            <span style="text-align: right; font-size: 13px; color: #6b7685">{{person.lastOpened}}</span>
            <span style="display: flex; align-items: center; justify-content: flex-end; gap: 8px">
              <span style="font-size: 13px; color: #6b7685; font-variant-numeric: tabular-nums">{{person.reminders}}</span>
              <button type="button" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid #dde2e9; border-radius: 8px; background: #ffffff; cursor: pointer; padding: 0">{{person.action}}</button>
            </span>
          </div>
        </sc-for>

        <div style="display: flex; align-items: center; gap: 10px; padding: 14px 20px">
          ${svg(ICONS.info, '#9aa5b3', 15)}
          <span style="font-size: 12px; color: #9aa5b3; line-height: 1.45">La dernière ouverture du formulaire distingue un défaut de réception d’un défaut de réponse. Une absence de réponse vaut indisponibilité totale (RG-21).</span>
        </div>
      </section>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 412px; flex-shrink: 0">

        <section style="${CARD}; overflow: hidden; border-color: #FECACA">
          <div style="display: flex; align-items: center; gap: 10px; background: #FEF2F2; padding: 14px 20px; border-bottom: 1px solid #FECACA">
            ${svg(ICONS.alert, '#DC2626', 18)}
            <h3 style="margin: 0; flex: 1; font-size: 15px; font-weight: 600; color: #DC2626">Créneaux sans aucun volontaire</h3>
            <span style="font-size: 13px; font-weight: 600; color: #DC2626">{{orphanCount}}</span>
          </div>
          <div style="padding: 8px 0">
            <sc-for list="{{orphans}}" as="orphan" hint-placeholder-count="3">
              <div style="display: flex; align-items: center; gap: 12px; padding: 10px 20px; border-bottom: 1px solid #f5f7fa">
                <span style="width: 3px; height: 30px; flex-shrink: 0; border-radius: 2px; background: {{orphan.color}}"></span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{orphan.title}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{orphan.when}}</span>
                </span>
                <button type="button" style="display: inline-flex; align-items: center; gap: 6px; height: 30px; flex-shrink: 0; border: 1px solid #FDBA74; border-radius: 8px; background: #FFF3E9; padding: 0 10px; font-family: inherit; font-size: 12px; font-weight: 500; color: #EA580C; cursor: pointer">Solliciter</button>
              </div>
            </sc-for>
          </div>
          <p style="margin: 0; padding: 12px 20px; font-size: 12px; color: #6b7685; line-height: 1.45">Ces places resteront non pourvues. La cause figurera au rapport de diagnostic, et la publication demandera un acquittement motivé (RG-26).</p>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #dde2e9">
            <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #141a22">Poids utilisés pour cette génération</h3>
            <button type="button" onClick="{{toggleWeights}}" style="border: none; background: transparent; padding: 0; font-family: inherit; font-size: 13px; font-weight: 500; color: #173d6e; cursor: pointer">{{weightsToggle}}</button>
          </div>
          <div style="padding: 6px 20px 16px">
            <sc-for list="{{weights}}" as="weight" hint-placeholder-count="5">
              <div style="display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid #f5f7fa">
                <span style="width: 26px; flex-shrink: 0; font-size: 11px; font-weight: 600; color: #9aa5b3">{{weight.code}}</span>
                <span style="flex: 1; min-width: 0; font-size: 13px; color: #363f4c">{{weight.label}}</span>
                <span style="position: relative; width: 72px; flex-shrink: 0; height: 6px; border-radius: 999px; background: #eceff3; overflow: hidden">
                  <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{weight.pct}}; border-radius: 999px; background: {{weight.color}}"></span>
                </span>
                <span style="width: 38px; flex-shrink: 0; text-align: right; font-size: 13px; font-weight: 600; color: {{weight.valueColor}}; font-variant-numeric: tabular-nums">{{weight.value}}</span>
              </div>
            </sc-for>
            <p style="margin: 12px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">{{weightsNote}}</p>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Couverture prévisible</h3>
          <div style="display: flex; flex-direction: column; gap: 12px">
            <sc-for list="{{coverage}}" as="row" hint-placeholder-count="3">
              <div>
                <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 5px">
                  <span style="font-size: 13px; color: #4d5765">{{row.label}}</span>
                  <span style="font-size: 13px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{row.value}}</span>
                </div>
                <span style="display: block; height: 7px; border-radius: 999px; background: #eceff3; overflow: hidden">
                  <span style="display: block; height: 7px; width: {{row.pct}}; border-radius: 999px; background: {{row.color}}"></span>
                </span>
              </div>
            </sc-for>
          </div>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { showAllWeights: false };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  renderVals() {
    const roster = [
      { initials: 'TP', name: 'Théo Pezel', role: 'Coordinateur et senior', status: 'SUBMITTED', declared: 21, lastOpened: '14 sept.', reminders: 0 },
      { initials: 'AB', name: 'A. Bernard', role: 'Imageur senior', status: 'SUBMITTED', declared: 18, lastOpened: '13 sept.', reminders: 0 },
      { initials: 'SR', name: 'S. Rousseau', role: 'Imageur senior', status: 'SUBMITTED', declared: 24, lastOpened: '15 sept.', reminders: 1 },
      { initials: 'MN', name: 'M. Nguyen', role: 'Imageur senior', status: 'SUBMITTED', declared: 12, lastOpened: '11 sept.', reminders: 0 },
      { initials: 'CD', name: 'C. Dumont', role: 'Imageur senior', status: 'SUBMITTED', declared: 4, lastOpened: '15 sept.', reminders: 2 },
      { initials: 'FL', name: 'F. Leroy', role: 'Imageur senior', status: 'IN_PROGRESS', declared: 7, lastOpened: 'hier', reminders: 2 },
      { initials: 'JV', name: 'J. Vidal', role: 'Imageur senior', status: 'NOT_STARTED', declared: 0, lastOpened: 'jamais', reminders: 3 },
      { initials: 'ML', name: 'M. Lefèvre', role: 'Imageur senior', status: 'DECLINED_MONTH', declared: 0, lastOpened: '9 sept.', reminders: 1 }
    ];

    const statusStyles = {
      SUBMITTED: { label: 'Validée', style: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857' },
      IN_PROGRESS: { label: 'En cours', style: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C' },
      NOT_STARTED: { label: 'Aucune réponse', style: 'border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626' },
      DECLINED_MONTH: { label: 'Indisponible ce mois', style: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' }
    };

    const mailGlyph = this.glyph('<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="m2 7 10 6 10-6"></path>', '#6b7685', 14);
    const eyeGlyph = this.glyph('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle>', '#6b7685', 14);

    const people = roster.map((person) => {
      const tone = statusStyles[person.status];
      const pending = person.status === 'NOT_STARTED' || person.status === 'IN_PROGRESS';
      return {
        initials: person.initials,
        name: person.name,
        role: person.role,
        statusLabel: tone.label,
        statusStyle: tone.style,
        declared: person.status === 'DECLINED_MONTH' ? '—' : String(person.declared),
        countColor: person.declared > 0 && person.declared < 6 ? '#EA580C' : '#363f4c',
        lastOpened: person.lastOpened,
        reminders: String(person.reminders),
        bg: pending ? '#fffdf9' : '#ffffff',
        avatarBg: person.status === 'SUBMITTED' ? '#eceff3' : '#FFF3E9',
        avatarFg: person.status === 'SUBMITTED' ? '#4d5765' : '#EA580C',
        action: pending ? mailGlyph : eyeGlyph
      };
    });

    const submitted = roster.filter((person) => person.status === 'SUBMITTED').length;
    const declarations = roster.reduce((total, person) => total + person.declared, 0);

    const headline = [
      {
        label: 'Réponses validées', value: submitted + ' / ' + roster.length, color: '#141a22',
        detail: '1 en cours, 1 sans réponse, 1 indisponible sur tout le mois',
        icon: this.glyph('<path d="M20 6 9 17l-5-5"></path>', '#047857')
      },
      {
        label: 'Places à pourvoir', value: '51', color: '#141a22',
        detail: '46 vacations, dont 5 à deux places senior',
        icon: this.glyph('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>', '#1f4b86')
      },
      {
        label: 'Déclarations reçues', value: String(declarations), color: '#141a22',
        detail: 'soit 1,7 candidat par place en moyenne',
        icon: this.glyph('<path d="M3 3v18h18"></path><path d="M7 15v3M12 10v8M17 6v12"></path>', '#1f4b86')
      },
      {
        label: 'Créneaux sans volontaire', value: '3', color: '#DC2626',
        detail: 'la place restera vide, la cause sera tracée',
        icon: this.glyph('<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>', '#DC2626')
      }
    ];

    const orphans = [
      { title: 'Blomet · Scanner', when: 'mardi 13 octobre, après-midi', color: '#047857' },
      { title: 'Blomet · Scanner', when: 'mardi 20 octobre, après-midi', color: '#047857' },
      { title: 'Blomet · Scanner', when: 'mardi 27 octobre, après-midi', color: '#047857' }
    ];

    const allWeights = [
      { code: 'G1', label: 'Couverture maximale des vacations', value: 1000, primary: true },
      { code: 'G2', label: 'Équité du nombre total de vacations', value: 100, primary: true },
      { code: 'S1', label: 'Doubles vacations du coordinateur', value: 200, primary: true },
      { code: 'G4', label: 'Correction inter-mois, dettes reportées', value: 30, primary: true },
      { code: 'G3', label: 'Respect des créneaux prioritaires', value: 20, primary: true },
      { code: 'G7', label: 'Limitation de la concentration hebdomadaire', value: 10, primary: false },
      { code: 'G5', label: 'Équilibre entre modalités', value: 0, primary: false },
      { code: 'G6', label: 'Équilibre entre centres', value: 0, primary: false }
    ];

    const shown = this.state.showAllWeights ? allWeights : allWeights.filter((weight) => weight.primary);

    const weights = shown.map((weight) => ({
      code: weight.code,
      label: weight.label,
      value: String(weight.value),
      pct: Math.max(3, Math.round((weight.value / 1000) * 100)) + '%',
      color: weight.value === 0 ? '#dde2e9' : weight.value >= 200 ? '#1f4b86' : '#7197c2',
      valueColor: weight.value === 0 ? '#9aa5b3' : '#141a22'
    }));

    return {
      headline,
      people,
      responseSummary: submitted + ' validées, ' + (roster.length - submitted) + ' à traiter',
      orphans,
      orphanCount: orphans.length + ' places',
      weights,
      weightsToggle: this.state.showAllWeights ? 'Réduire' : 'Tout afficher',
      toggleWeights: () => this.setState({ showAllWeights: !this.state.showAllWeights }),
      weightsNote: this.state.showAllWeights
        ? 'G5 et G6 sont à zéro par défaut (PARAM-09) : le critère d’équité retenu porte sur le nombre total de vacations. Les activer ne demande aucune modification de code.'
        : 'Les poids sont copiés et figés dans la campagne au lancement, pour que la génération reste rejouable à l’identique.',
      coverage: [
        { label: 'Places couvertes par au moins un volontaire', value: '48 / 51', pct: '94%', color: '#16a34a' },
        { label: 'Places avec au moins trois volontaires', value: '31 / 51', pct: '61%', color: '#3f6aa3' },
        { label: 'Personnes ayant déclaré moins de 6 créneaux', value: '2 / 8', pct: '25%', color: '#d97706' }
      ]
    };
  }
}`

export default {
  file: 'Suivi.dc.html',
  width: 1440,
  height: 1000,
  body,
  logic,
  props: '{}'
}
