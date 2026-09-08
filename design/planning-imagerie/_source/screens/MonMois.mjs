import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('app', { initials: 'LA', name: 'Léa', role: 'Fellow imagerie' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Mon mois — Octobre 2026',
      'Planning publié le 27 septembre, version 1. Les échanges entre pairs sont ouverts jusqu’à la veille de chaque vacation.',
      `${button('Exporter en PDF', 'outline', 'download')}${button('Proposer un échange', 'default', 'swap')}`
    )}

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px">
          <sc-for list="{{summary}}" as="stat" hint-placeholder-count="4">
            <div style="${CARD}; padding: 16px 18px">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                <span style="display: flex">{{stat.icon}}</span>
                <p style="margin: 0; font-size: 12px; font-weight: 500; color: #6b7685">{{stat.label}}</p>
              </div>
              <p style="margin: 0; font-size: 26px; font-weight: 700; color: #141a22; line-height: 1; font-variant-numeric: tabular-nums">{{stat.value}}</p>
              <p style="margin: 5px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.35">{{stat.detail}}</p>
            </div>
          </sc-for>
        </div>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Mes vacations</h2>
            <div style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eceff3">
              <sc-for list="{{filters}}" as="filter" hint-placeholder-count="4">
                <button type="button" onClick="{{filter.pick}}" style="border: none; border-radius: 8px; background: {{filter.bg}}; box-shadow: {{filter.shadow}}; padding: 5px 12px; font-family: inherit; font-size: 13px; font-weight: 500; color: {{filter.fg}}; cursor: pointer">{{filter.label}}</button>
              </sc-for>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 176px 1fr 200px 128px; gap: 0; border-bottom: 1px solid #dde2e9; background: #fafbfc; padding: 8px 20px">
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Date</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Vacation</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685">Senior sur le créneau</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7685; text-align: right">Statut</span>
          </div>

          <sc-for list="{{shifts}}" as="shift" hint-placeholder-count="9">
            <div style="display: grid; grid-template-columns: 176px 1fr 200px 128px; align-items: center; gap: 0; border-bottom: 1px solid #eceff3; padding: 12px 20px; background: {{shift.bg}}">
              <span style="padding-right: 12px">
                <span style="display: block; font-size: 14px; font-weight: 500; color: #141a22">{{shift.date}}</span>
                <span style="display: block; font-size: 12px; color: #6b7685">{{shift.halfDay}}</span>
              </span>
              <span style="display: flex; align-items: center; gap: 10px; padding-right: 12px">
                <span style="width: 3px; height: 26px; flex-shrink: 0; border-radius: 2px; background: {{shift.centerColor}}"></span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; color: #141a22">{{shift.center}}</span>
                  <span style="display: block; font-size: 12px; color: #6b7685">{{shift.modality}}</span>
                </span>
              </span>
              <span style="display: flex; align-items: center; gap: 9px; padding-right: 12px">
                <span style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex-shrink: 0; border-radius: 999px; background: {{shift.seniorBg}}; color: {{shift.seniorFg}}; font-size: 10px; font-weight: 600">{{shift.seniorInitials}}</span>
                <span style="flex: 1; min-width: 0; font-size: 13px; color: #363f4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{shift.senior}}</span>
              </span>
              <span style="display: flex; justify-content: flex-end">
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; {{shift.tagStyle}}">{{shift.tag}}</span>
              </span>
            </div>
          </sc-for>

          <div style="display: flex; align-items: center; gap: 10px; padding: 14px 20px">
            ${svg(ICONS.info, '#9aa5b3', 15)}
            <span style="font-size: 12px; color: #9aa5b3; line-height: 1.45">{{listNote}}</span>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 372px; flex-shrink: 0">

        <section style="${CARD}; padding: 20px 24px; border-left: 4px solid #1f4b86">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
            ${svg(ICONS.calendar, '#1f4b86', 18)}
            <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #141a22">Abonnement calendrier</h3>
          </div>
          <p style="margin: 0 0 12px; font-size: 13px; color: #4d5765; line-height: 1.5">Un lien personnel et permanent, à importer une seule fois dans votre agenda. Il se met à jour tout seul à chaque publication et à chaque échange validé.</p>
          <div style="display: flex; align-items: center; gap: 8px; border: 1px solid #dde2e9; border-radius: 10px; background: #fafbfc; padding: 9px 12px">
            <span style="flex: 1; min-width: 0; font-size: 12px; color: #6b7685; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">…/planning/me/calendar.ics?t=8f21…</span>
            <button type="button" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border: 1px solid #dde2e9; border-radius: 8px; background: #ffffff; cursor: pointer; padding: 0">${svg(ICONS.copy, '#4d5765', 14)}</button>
          </div>
          <p style="margin: 10px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">Ce flux ne contient que vos propres vacations.</p>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #141a22">Mon encadrement ce mois-ci</h3>
          <div style="display: flex; flex-direction: column; gap: 11px">
            <sc-for list="{{mentors}}" as="mentor" hint-placeholder-count="5">
              <div style="display: flex; align-items: center; gap: 10px">
                <span style="width: 96px; flex-shrink: 0; font-size: 13px; font-weight: {{mentor.weight}}; color: #363f4c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{mentor.name}}</span>
                <span style="position: relative; flex: 1; height: 16px; border-radius: 5px; background: #f5f7fa; overflow: hidden">
                  <span style="position: absolute; left: 0; top: 0; bottom: 0; width: {{mentor.pct}}; border-radius: 5px; background: {{mentor.color}}"></span>
                </span>
                <span style="width: 18px; flex-shrink: 0; text-align: right; font-size: 13px; font-weight: 600; color: #141a22; font-variant-numeric: tabular-nums">{{mentor.count}}</span>
              </div>
            </sc-for>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9aa5b3; line-height: 1.45">Calculé par co-présence : vous et le senior êtes affectés à la même vacation, même date, même demi-journée, même centre, même modalité (RG-29).</p>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Prochaine vacation</h3>
          <div style="border: 1px solid #BFDBFE; border-radius: 12px; background: #EFF6FF; padding: 14px 16px">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #2563EB">Jeudi 1er octobre, après-midi</p>
            <p style="margin: 6px 0 0; font-size: 15px; font-weight: 600; color: #141a22">Lariboisière · IRM cardiaque</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #4d5765">Avec Théo Pezel, qui couvre aussi le scanner sur le même créneau.</p>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px">
            ${button('Céder cette vacation', 'outline', null, 'flex: 1; font-size: 13px')}
          </div>
        </section>

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Exports</h3>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <sc-for list="{{exports}}" as="item" hint-placeholder-count="3">
              <button type="button" style="display: flex; align-items: center; gap: 10px; min-height: 44px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 10px 12px; font-family: inherit; cursor: pointer; text-align: left">
                <span style="display: flex; flex-shrink: 0">{{item.icon}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{item.label}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{item.detail}}</span>
                </span>
              </button>
            </sc-for>
          </div>
        </section>
      </aside>
    </div>
  </main>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { filter: 'all' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  shiftData() {
    return [
      { day: 'Jeudi 1 octobre', halfDay: 'Après-midi', center: 'Lariboisière', modality: 'IRM cardiaque', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'next' },
      { day: 'Lundi 5 octobre', halfDay: 'Matin', center: 'Bergère', modality: 'IRM cardiaque', senior: 'M. Nguyen', initials: 'MN', status: 'planned' },
      { day: 'Mercredi 7 octobre', halfDay: 'Matin', center: 'Lariboisière', modality: 'Scanner cardiaque', senior: 'S. Rousseau', initials: 'SR', status: 'planned' },
      { day: 'Jeudi 8 octobre', halfDay: 'Après-midi', center: 'Lariboisière', modality: 'IRM cardiaque', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'planned' },
      { day: 'Mardi 13 octobre', halfDay: 'Après-midi', center: 'Bergère', modality: 'IRM cardiaque', senior: 'A. Bernard', initials: 'AB', status: 'swapping' },
      { day: 'Vendredi 16 octobre', halfDay: 'Matin', center: 'Blomet', modality: 'IRM cardiaque', senior: 'F. Leroy', initials: 'FL', status: 'planned' },
      { day: 'Lundi 19 octobre', halfDay: 'Matin', center: 'Bergère', modality: 'Scanner cardiaque', senior: 'Théo Pezel', initials: 'TP', coordinator: true, status: 'planned' },
      { day: 'Jeudi 22 octobre', halfDay: 'Matin', center: 'Bergère', modality: 'Scanner cardiaque', senior: 'J. Vidal', initials: 'JV', status: 'planned' },
      { day: 'Mercredi 28 octobre', halfDay: 'Matin', center: 'Lariboisière', modality: 'IRM cardiaque', senior: 'S. Rousseau', initials: 'SR', status: 'swapped' }
    ];
  }

  renderVals() {
    const centerColors = { 'Bergère': '#1f4b86', 'Blomet': '#047857', 'Lariboisière': '#b45309' };

    const statusTones = {
      next: { tag: 'À venir', style: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
      planned: { tag: 'Planifiée', style: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' },
      swapping: { tag: 'Échange en cours', style: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C' },
      swapped: { tag: 'Reçue par échange', style: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857' }
    };

    const filterDefs = [
      { id: 'all', label: 'Toutes' },
      { id: 'irm', label: 'IRM' },
      { id: 'ct', label: 'Scanner' },
      { id: 'pezel', label: 'Avec Dr Pezel' }
    ];

    const filters = filterDefs.map((entry) => ({
      label: entry.label,
      bg: this.state.filter === entry.id ? '#ffffff' : 'transparent',
      fg: this.state.filter === entry.id ? '#141a22' : '#6b7685',
      shadow: this.state.filter === entry.id ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
      pick: () => this.setState({ filter: entry.id })
    }));

    const all = this.shiftData();
    const tests = {
      all: () => true,
      irm: (shift) => shift.modality.indexOf('IRM') === 0,
      ct: (shift) => shift.modality.indexOf('Scanner') === 0,
      pezel: (shift) => Boolean(shift.coordinator)
    };
    const visible = all.filter(tests[this.state.filter] || tests.all);

    const shifts = visible.map((shift) => {
      const tone = statusTones[shift.status];
      return {
        date: shift.day,
        halfDay: shift.halfDay,
        center: shift.center,
        centerColor: centerColors[shift.center],
        modality: shift.modality,
        senior: shift.senior,
        seniorInitials: shift.initials,
        seniorBg: shift.coordinator ? '#eef2f8' : '#eceff3',
        seniorFg: shift.coordinator ? '#1f4b86' : '#4d5765',
        tag: tone.tag,
        tagStyle: tone.style,
        bg: shift.status === 'next' ? '#fafbfc' : '#ffffff'
      };
    });

    const withPezel = all.filter((shift) => shift.coordinator).length;
    const irm = all.filter((shift) => shift.modality.indexOf('IRM') === 0).length;

    const mentorCounts = {};
    all.forEach((shift) => { mentorCounts[shift.senior] = (mentorCounts[shift.senior] || 0) + 1; });
    const maxCount = Math.max.apply(null, Object.keys(mentorCounts).map((name) => mentorCounts[name]));

    const mentors = Object.keys(mentorCounts)
      .map((name) => ({
        name,
        count: String(mentorCounts[name]),
        pct: Math.round((mentorCounts[name] / maxCount) * 100) + '%',
        color: name === 'Théo Pezel' ? '#1f4b86' : '#7197c2',
        weight: name === 'Théo Pezel' ? '600' : '500'
      }))
      .sort((left, right) => Number(right.count) - Number(left.count));

    const fileGlyph = (path, color) => this.glyph(path, color, 16);

    return {
      filters,
      shifts,
      listNote: this.state.filter === 'all'
        ? 'Les compteurs reflètent toujours la dernière version publiée, jamais une proposition non publiée (RG-30).'
        : visible.length + ' vacation' + (visible.length > 1 ? 's' : '') + ' sur ' + all.length + ' correspondent à ce filtre.',
      summary: [
        {
          label: 'Vacations du mois', value: String(all.length), detail: 'moyenne de la promotion : 8,2',
          icon: this.glyph('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>', '#1f4b86')
        },
        {
          label: 'IRM cardiaque', value: String(irm), detail: 'écart à la promotion : +0,4',
          icon: this.glyph('<path d="M20.8 5.6a5.5 5.5 0 0 0-8.8 1.4 5.5 5.5 0 0 0-8.8-1.4c-2.4 2.4-2 6.2.4 8.6L12 21l7.6-6.8c2.4-2.4 3.6-6.2.4-8.6z"></path>', '#1f4b86')
        },
        {
          label: 'Scanner cardiaque', value: String(all.length - irm), detail: 'écart à la promotion : −0,4',
          icon: this.glyph('<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="3"></circle>', '#1f4b86')
        },
        {
          label: 'Avec le Dr Pezel', value: String(withPezel), detail: 'écart à la promotion : +0,6',
          icon: this.glyph('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9"></path>', '#1f4b86')
        }
      ],
      mentors,
      exports: [
        { label: 'Mes vacations en PDF', detail: 'Une page, format paysage', icon: fileGlyph('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>', '#DC2626') },
        { label: 'Planning complet de l’équipe', detail: 'Toutes les vacations d’octobre 2026', icon: fileGlyph('<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 3v18"></path>', '#047857') },
        { label: 'Fichier calendrier ICS', detail: 'Import ponctuel, sans mise à jour automatique', icon: fileGlyph('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 11 5 5 5-5M12 16V4"></path>', '#1f4b86') }
      ]
    };
  }
}`

export default {
  file: 'MonMois.dc.html',
  width: 1440,
  height: 1020,
  body,
  logic,
  props: '{}'
}
