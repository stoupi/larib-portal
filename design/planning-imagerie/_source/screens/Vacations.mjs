import { sidebar, pageHeader, button, badge, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('admin', { initials: 'TP', name: 'Théo', role: 'Coordinateur' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Chargement des vacations — Novembre 2026',
      'Rien n’est enregistré tant que le fichier comporte une erreur bloquante. Vous validez sur la prévisualisation.',
      `${button('Annuler', 'ghost')}${button('Valider et enregistrer', 'primary', 'check')}`
    )}

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; gap: 0; border-bottom: 1px solid #dde2e9; padding: 0 20px">
            <sc-for list="{{methods}}" as="method" hint-placeholder-count="3">
              <button type="button" onClick="{{method.pick}}" style="display: flex; align-items: center; gap: 8px; border: none; border-bottom: 2px solid {{method.underline}}; background: transparent; padding: 14px 16px; font-family: inherit; font-size: 14px; font-weight: {{method.weight}}; color: {{method.fg}}; cursor: pointer">
                <span style="display: flex">{{method.icon}}</span>{{method.label}}
              </button>
            </sc-for>
          </div>

          <div style="padding: 20px">
            <p style="margin: 0 0 16px; font-size: 14px; color: #6b7685; line-height: 1.5">{{method.hint}}</p>

            <sc-if value="{{isImport}}" hint-placeholder-val="{{true}}">
              <div style="display: flex; align-items: center; gap: 16px; border: 1.5px dashed #c4ccd6; border-radius: 14px; background: #fafbfc; padding: 20px 24px">
                <span style="display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; background: #eceff3">${svg(ICONS.file, '#4d5765', 22)}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; font-weight: 600; color: #141a22">vacations-novembre-2026.csv</span>
                  <span style="display: block; margin-top: 2px; font-size: 13px; color: #6b7685">48 lignes lues · UTF-8, séparateur point-virgule · déposé il y a 12 secondes</span>
                </span>
                ${button('Remplacer le fichier', 'outline', 'upload', 'flex-shrink: 0')}
              </div>
            </sc-if>

            <sc-if value="{{isDuplicate}}" hint-placeholder-val="{{false}}">
              <div style="display: flex; align-items: center; gap: 16px; border: 1px solid #dde2e9; border-radius: 14px; background: #fafbfc; padding: 20px 24px">
                <span style="display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; background: #eceff3">${svg(ICONS.copy, '#4d5765', 22)}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; font-weight: 600; color: #141a22">Report d’octobre 2026 sur les mêmes jours de semaine</span>
                  <span style="display: block; margin-top: 2px; font-size: 13px; color: #6b7685">46 vacations reportées · 2 jours fériés français exclus automatiquement, réintégrables un par un</span>
                </span>
              </div>
            </sc-if>

            <sc-if value="{{isManual}}" hint-placeholder-val="{{false}}">
              <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">
                <sc-for list="{{manualFields}}" as="field" hint-placeholder-count="4">
                  <div>
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 500; color: #4d5765">{{field.label}}</p>
                    <div style="display: flex; align-items: center; height: 36px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 0 12px; font-size: 13px; color: {{field.color}}">{{field.value}}</div>
                  </div>
                </sc-for>
              </div>
              <p style="margin: 14px 0 0; font-size: 13px; color: #6b7685">Saisie récurrente : « tous les mardis matin, IRM, Bergère, pour tout le mois » crée 4 vacations d’un coup.</p>
            </sc-if>

            <div style="margin-top: 20px; border-top: 1px solid #eceff3; padding-top: 16px">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #141a22">La campagne contient déjà 12 vacations. Que faire des nouvelles ?</p>
              <div style="display: flex; gap: 10px">
                <sc-for list="{{modes}}" as="mode" hint-placeholder-count="3">
                  <div onClick="{{mode.pick}}" style="display: flex; align-items: flex-start; gap: 10px; flex: 1; border: 1px solid {{mode.border}}; border-radius: 12px; background: {{mode.bg}}; padding: 12px 14px; cursor: pointer">
                    <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; border: 1.5px solid {{mode.dotBorder}}; border-radius: 999px; background: #ffffff">
                      <span style="width: 8px; height: 8px; border-radius: 999px; background: {{mode.dotFill}}"></span>
                    </span>
                    <span style="flex: 1; min-width: 0">
                      <span style="display: block; font-size: 13px; font-weight: 600; color: #141a22">{{mode.label}}</span>
                      <span style="display: block; margin-top: 2px; font-size: 12px; color: #6b7685; line-height: 1.4">{{mode.detail}}</span>
                    </span>
                  </div>
                </sc-for>
              </div>
            </div>
          </div>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <div style="display: flex; align-items: center; gap: 10px">
              <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Rapport d’analyse</h2>
              {{reportBadge}}
            </div>
            <span style="font-size: 13px; color: #6b7685">{{reportSummary}}</span>
          </div>

          <div style="display: grid; grid-template-columns: 64px 1fr 200px; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Ligne</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Constat</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Valeur attendue</span>
          </div>

          <sc-for list="{{findings}}" as="finding" hint-placeholder-count="4">
            <div style="display: grid; grid-template-columns: 64px 1fr 200px; align-items: flex-start; gap: 0; border-bottom: 1px solid #eceff3; padding: 11px 20px; background: {{finding.bg}}">
              <span style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4d5765; font-variant-numeric: tabular-nums">
                <span style="display: flex; flex-shrink: 0">{{finding.icon}}</span>{{finding.line}}
              </span>
              <span style="padding-right: 16px">
                <span style="display: block; font-size: 13px; font-weight: 500; color: {{finding.fg}}">{{finding.title}}</span>
                <span style="display: block; margin-top: 2px; font-size: 12px; color: #6b7685; font-family: ui-monospace, SFMono-Regular, Menlo, monospace">{{finding.raw}}</span>
              </span>
              <span style="font-size: 12px; color: #6b7685; line-height: 1.45">{{finding.expected}}</span>
            </div>
          </sc-for>

          <div style="display: flex; align-items: center; gap: 10px; padding: 14px 20px">
            ${svg(ICONS.info, '#9aa5b3', 15)}
            <span style="font-size: 12px; color: #9aa5b3; line-height: 1.45">RG-13 à RG-18. Un jour férié est un avertissement non bloquant : la ligne est conservée après confirmation explicite.</span>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 396px; flex-shrink: 0">

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #dde2e9">
            <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #141a22">Prévisualisation</h3>
            <span style="font-size: 12px; color: #6b7685">{{previewSummary}}</span>
          </div>

          <div style="padding: 14px 16px">
            <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; margin-bottom: 6px">
              <sc-for list="{{weekdayHeads}}" as="head" hint-placeholder-count="7">
                <span style="text-align: center; font-size: 11px; font-weight: 500; color: #9aa5b3">{{head.label}}</span>
              </sc-for>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px">
              <sc-for list="{{calendar}}" as="cell" hint-placeholder-count="35">
                <div style="display: flex; flex-direction: column; gap: 3px; min-height: 52px; border: 1px solid {{cell.border}}; border-radius: 8px; background: {{cell.bg}}; padding: 4px 5px">
                  <span style="font-size: 11px; font-weight: 500; color: {{cell.dayColor}}">{{cell.day}}</span>
                  <span style="display: flex; flex-wrap: wrap; gap: 2px">
                    <sc-for list="{{cell.dots}}" as="dot" hint-placeholder-count="2">
                      <span style="width: 6px; height: 6px; border-radius: 999px; background: {{dot.color}}"></span>
                    </sc-for>
                  </span>
                  <span style="font-size: 10px; color: {{cell.noteColor}}">{{cell.note}}</span>
                </div>
              </sc-for>
            </div>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 12px; border-top: 1px solid #eceff3; padding: 12px 20px; font-size: 12px; color: #6b7685">
            <span style="display: flex; align-items: center; gap: 6px"><span style="width: 7px; height: 7px; border-radius: 999px; background: #1f4b86"></span>Bergère</span>
            <span style="display: flex; align-items: center; gap: 6px"><span style="width: 7px; height: 7px; border-radius: 999px; background: #047857"></span>Blomet</span>
            <span style="display: flex; align-items: center; gap: 6px"><span style="width: 7px; height: 7px; border-radius: 999px; background: #b45309"></span>Lariboisière</span>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #141a22">Ce qui sera enregistré</h3>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
            <sc-for list="{{stats}}" as="stat" hint-placeholder-count="4">
              <div style="border: 1px solid #eceff3; border-radius: 12px; background: #fafbfc; padding: 12px">
                <p style="margin: 0; font-size: 22px; font-weight: 600; color: {{stat.color}}; font-variant-numeric: tabular-nums">{{stat.value}}</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #6b7685; line-height: 1.3">{{stat.label}}</p>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #141a22">Format attendu</h3>
          <div style="border: 1px solid #dde2e9; border-radius: 10px; background: #fafbfc; padding: 12px; overflow-x: auto">
            <pre style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.65; color: #4d5765">date;demi_journee;centre;modalite;
places_senior;places_fellow;commentaire
2026-11-02;MATIN;BERGERE;IRM;1;1;
2026-11-02;MATIN;BERGERE;SCANNER;1;1;
2026-11-03;APRES_MIDI;BLOMET;IRM;1;0;Pas de fellow</pre>
          </div>
          <p style="margin: 10px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">Les deux premières lignes illustrent le cas visé par la double vacation : une IRM et un scanner, même jour, même demi-journée, même centre.</p>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { method: 'import', mode: 'merge' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  renderVals() {
    const methodDefs = [
      {
        id: 'import', label: 'Import de fichier',
        path: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 9 5-5 5 5M12 4v12"></path>',
        hint: 'Fichier CSV ou tableur au format de l’annexe A. Le fichier est analysé intégralement avant tout enregistrement : aucune ligne n’est écrite tant qu’une erreur bloquante subsiste.'
      },
      {
        id: 'duplicate', label: 'Dupliquer le mois précédent',
        path: '<rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
        hint: 'Les vacations sont reportées sur les mêmes jours de semaine. Les jours fériés français sont exclus automatiquement et peuvent être réintégrés un par un.'
      },
      {
        id: 'manual', label: 'Saisie manuelle',
        path: '<path d="M12 5v14M5 12h14"></path>',
        hint: 'Saisie unitaire ou récurrente. Les centres et les modalités proviennent de la base : ajouter un centre ne demande aucune modification de code.'
      }
    ];

    const method = methodDefs.find((entry) => entry.id === this.state.method) || methodDefs[0];

    const methods = methodDefs.map((entry) => {
      const active = entry.id === this.state.method;
      return {
        label: entry.label,
        icon: this.glyph(entry.path, active ? '#d61f55' : '#9aa5b3'),
        underline: active ? '#ec3b68' : 'transparent',
        fg: active ? '#141a22' : '#6b7685',
        weight: active ? '600' : '500',
        pick: () => this.setState({ method: entry.id })
      };
    });

    const modeDefs = [
      { id: 'add', label: 'Ajouter', detail: 'Les 48 lignes s’ajoutent aux 12 existantes. Les doublons seront refusés.' },
      { id: 'replace', label: 'Remplacer', detail: 'Les 12 vacations existantes sont annulées, puis remplacées.' },
      { id: 'merge', label: 'Fusionner', detail: 'Les doublons sont ignorés silencieusement, le reste est ajouté.' }
    ];

    const modes = modeDefs.map((entry) => {
      const active = entry.id === this.state.mode;
      return {
        label: entry.label,
        detail: entry.detail,
        bg: active ? '#fff1f4' : '#ffffff',
        border: active ? '#ec3b68' : '#dde2e9',
        dotBorder: active ? '#ec3b68' : '#c4ccd6',
        dotFill: active ? '#ec3b68' : 'transparent',
        pick: () => this.setState({ mode: entry.id })
      };
    });

    const findings = [
      {
        kind: 'error', line: '17',
        title: 'Le centre n’existe pas en base ou est inactif',
        raw: '2026-11-09;MATIN;BERGERES;IRM;1;1;',
        expected: 'BERGERE, BLOMET ou LARIBOISIERE. Vous pouvez créer le centre manquant depuis cet écran.'
      },
      {
        kind: 'error', line: '23',
        title: 'La date n’appartient pas au mois cible',
        raw: '2026-12-01;APRES_MIDI;BLOMET;SCANNER;1;1;',
        expected: 'Une date comprise entre le 2026-11-01 et le 2026-11-30.'
      },
      {
        kind: 'error', line: '31',
        title: 'Demi-journée non reconnue',
        raw: '2026-11-17;MATINEE;LARIBOISIERE;IRM;1;1;',
        expected: 'MATIN ou APRES_MIDI. Aucune autre granularité horaire n’est gérée.'
      },
      {
        kind: 'warning', line: '38',
        title: 'La date est un jour férié français',
        raw: '2026-11-11;MATIN;BERGERE;SCANNER;1;1;',
        expected: 'Avertissement non bloquant. La ligne sera conservée si vous la confirmez.'
      },
      {
        kind: 'warning', line: '42',
        title: 'Doublon avec une vacation déjà chargée',
        raw: '2026-11-24;MATIN;BLOMET;SCANNER;1;1;',
        expected: 'Traité selon le mode d’import retenu ci-dessus.'
      }
    ];

    const tones = {
      error: { bg: '#FEF2F2', fg: '#DC2626', icon: this.glyph('<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>', '#DC2626', 14) },
      warning: { bg: '#FFF3E9', fg: '#EA580C', icon: this.glyph('<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>', '#EA580C', 14) }
    };

    const errors = findings.filter((entry) => entry.kind === 'error').length;
    const warnings = findings.length - errors;

    const centerColors = { BERGERE: '#1f4b86', BLOMET: '#047857', LARIBOISIERE: '#b45309' };
    const pattern = {
      1: ['BERGERE', 'BERGERE', 'LARIBOISIERE'],
      2: ['BLOMET', 'BERGERE'],
      3: ['LARIBOISIERE', 'LARIBOISIERE', 'BLOMET'],
      4: ['BERGERE', 'LARIBOISIERE', 'LARIBOISIERE'],
      5: ['BLOMET', 'BERGERE']
    };

    const holidays = [11];
    const calendar = [];
    const firstWeekday = new Date(Date.UTC(2026, 10, 1)).getUTCDay() || 7;
    for (let blank = 1; blank < firstWeekday; blank += 1) {
      calendar.push({ day: '', bg: 'transparent', border: 'transparent', dayColor: 'transparent', dots: [], note: '', noteColor: 'transparent' });
    }
    let planned = 0;
    for (let dayNumber = 1; dayNumber <= 30; dayNumber += 1) {
      const weekday = new Date(Date.UTC(2026, 10, dayNumber)).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const holiday = holidays.indexOf(dayNumber) !== -1;
      const centers = weekend ? [] : (pattern[weekday] || []);
      planned += centers.length;
      calendar.push({
        day: String(dayNumber),
        bg: weekend ? '#fafbfc' : holiday ? '#FFF3E9' : '#ffffff',
        border: holiday ? '#FDBA74' : weekend ? '#f5f7fa' : '#eceff3',
        dayColor: weekend ? '#c4ccd6' : '#4d5765',
        dots: centers.map((center) => ({ color: centerColors[center] })),
        note: holiday ? 'férié' : centers.length ? centers.length + ' vac.' : '',
        noteColor: holiday ? '#EA580C' : '#9aa5b3'
      });
    }

    const weekdayHeads = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label) => ({ label }));

    const manualFields = [
      { label: 'Date', value: '2026-11-03', color: '#141a22' },
      { label: 'Demi-journée', value: 'Matin', color: '#141a22' },
      { label: 'Centre', value: 'Bergère', color: '#141a22' },
      { label: 'Modalité', value: 'Choisir…', color: '#aeb7c2' }
    ];

    return {
      methods,
      method: { hint: method.hint },
      isImport: this.state.method === 'import',
      isDuplicate: this.state.method === 'duplicate',
      isManual: this.state.method === 'manual',
      modes,
      manualFields,
      findings: findings.map((entry) => {
        const tone = tones[entry.kind];
        return {
          line: entry.line,
          title: entry.title,
          raw: entry.raw,
          expected: entry.expected,
          bg: tone.bg,
          fg: tone.fg,
          icon: tone.icon
        };
      }),
      reportBadge: errors > 0
        ? '<span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626">Enregistrement bloqué</span>'
        : '<span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857">Prêt à enregistrer</span>',
      reportSummary: errors + ' erreur' + (errors > 1 ? 's' : '') + ' bloquante' + (errors > 1 ? 's' : '') + ' · ' + warnings + ' avertissement' + (warnings > 1 ? 's' : ''),
      previewSummary: 'novembre 2026',
      weekdayHeads,
      calendar,
      stats: [
        { value: '48', label: 'lignes lues', color: '#141a22' },
        { value: '43', label: 'vacations valides', color: '#047857' },
        { value: String(errors), label: 'lignes rejetées', color: '#DC2626' },
        { value: String(warnings), label: 'à confirmer', color: '#EA580C' }
      ]
    };
  }
}`

export default {
  file: 'Vacations.dc.html',
  width: 1440,
  height: 1120,
  body,
  logic,
  props: '{}'
}
