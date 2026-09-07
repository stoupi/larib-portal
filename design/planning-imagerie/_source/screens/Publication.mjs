import { sidebar, pageHeader, button, svg, ICONS, CARD, APP_GRADIENT } from '../shell.mjs'

const body = `${sidebar('admin', { initials: 'TP', name: 'Théo', role: 'Coordinateur' })}

  <main style="flex: 1; min-width: 0; overflow: hidden; ${APP_GRADIENT}; padding: 32px">

    ${pageHeader(
      'Publier le planning — Octobre 2026',
      'Version 3, population senior. La publication fige cette version, marque les précédentes comme remplacées et déclenche la diffusion.',
      `${button('Retour à la revue', 'ghost')}`
    )}

    <div style="display: flex; gap: 20px; align-items: flex-start">

      <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0">

        <section style="border-radius: 16px; box-shadow: 0 1px 3px rgba(16,28,48,0.08), 0 1px 2px rgba(16,28,48,0.04); overflow: hidden; border: 1px solid {{gate.border}}; background: {{gate.bg}}">
          <div style="display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px">
            <span style="flex-shrink: 0; margin-top: 1px">{{gate.icon}}</span>
            <div style="flex: 1; min-width: 0">
              <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: {{gate.fg}}">{{gate.title}}</h2>
              <p style="margin: 5px 0 0; font-size: 14px; line-height: 1.5; color: {{gate.detailColor}}">{{gate.detail}}</p>

              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px">
                <sc-for list="{{gate.rows}}" as="row" hint-placeholder-count="3">
                  <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #FECACA; border-radius: 10px; background: #ffffff; padding: 9px 12px">
                    <span style="width: 3px; height: 26px; flex-shrink: 0; border-radius: 2px; background: {{row.color}}"></span>
                    <span style="flex: 1; min-width: 0">
                      <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{row.title}}</span>
                      <span style="display: block; font-size: 12px; color: #6b7685">{{row.when}}</span>
                    </span>
                  </div>
                </sc-for>
              </div>

              <div style="margin-top: 16px">
                <label onClick="{{gate.toggle}}" style="display: flex; align-items: flex-start; gap: 10px; border: 1px solid {{gate.checkBorder}}; border-radius: 12px; background: #ffffff; padding: 12px 14px; cursor: pointer">
                  <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; border: 1.5px solid {{gate.checkBox}}; border-radius: 5px; background: {{gate.checkFill}}">{{gate.checkMark}}</span>
                  <span style="flex: 1; min-width: 0">
                    <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">J’acquitte ces places non pourvues et je publie malgré tout</span>
                    <span style="display: block; margin-top: 2px; font-size: 12px; color: #6b7685; line-height: 1.45">Le motif ci-dessous figurera dans l’email de diffusion envoyé à toute l’équipe senior.</span>
                  </span>
                </label>
                <div style="margin-top: 10px; border: 1px solid {{gate.reasonBorder}}; border-radius: 10px; background: {{gate.reasonBg}}; padding: 10px 12px; min-height: 58px">
                  <p style="margin: 0; font-size: 13px; color: {{gate.reasonColor}}; line-height: 1.5">{{gate.reasonText}}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #dde2e9">
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #141a22">Ce que chacun recevra</h2>
            <span style="font-size: 13px; color: #6b7685">8 emails individuels · 1 fichier calendrier par personne</span>
          </div>
          <div style="padding: 8px 0">
            <sc-for list="{{recipients}}" as="person" hint-placeholder-count="5">
              <div style="display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid #f5f7fa">
                <span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 999px; background: #eceff3; color: #4d5765; font-size: 11px; font-weight: 600">{{person.initials}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 14px; font-weight: 500; color: #141a22">{{person.name}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685">{{person.detail}}</span>
                </span>
                <span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; flex-shrink: 0; font-size: 12px; font-weight: 500; {{person.tagStyle}}">{{person.tag}}</span>
              </div>
            </sc-for>
          </div>
          <p style="margin: 0; padding: 14px 20px; font-size: 12px; color: #9aa5b3; line-height: 1.45">RG-25 — les personnes dont les affectations ne changent pas reçoivent également l’information, avec la mention que leur planning est inchangé.</p>
        </section>

        <section style="${CARD}; overflow: hidden">
          <div style="display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #dde2e9; background: #fafbfc">
            ${svg(ICONS.mail, '#4d5765', 17)}
            <h2 style="margin: 0; flex: 1; font-size: 15px; font-weight: 600; color: #141a22">Aperçu de l’email E04</h2>
            <div style="display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: #eceff3">
              <sc-for list="{{locales}}" as="locale" hint-placeholder-count="2">
                <button type="button" onClick="{{locale.pick}}" style="border: none; border-radius: 7px; background: {{locale.bg}}; box-shadow: {{locale.shadow}}; padding: 4px 10px; font-family: inherit; font-size: 12px; font-weight: 500; color: {{locale.fg}}; cursor: pointer">{{locale.label}}</button>
              </sc-for>
            </div>
          </div>
          <div style="padding: 20px 24px">
            <p style="margin: 0 0 14px; font-size: 13px; color: #6b7685">Objet : <span style="color: #141a22; font-weight: 500">{{mail.subject}}</span></p>
            <div style="border: 1px solid #eceff3; border-radius: 12px; background: #fafbfc; padding: 18px 20px">
              <pre style="margin: 0; font-family: inherit; font-size: 13px; line-height: 1.65; color: #363f4c; white-space: pre-wrap">{{mail.body}}</pre>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px">
              <sc-for list="{{attachments}}" as="file" hint-placeholder-count="3">
                <span style="display: inline-flex; align-items: center; gap: 7px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 6px 11px; font-size: 12px; color: #363f4c">
                  <span style="display: flex">{{file.icon}}</span>{{file.label}}
                </span>
              </sc-for>
            </div>
          </div>
        </section>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 16px; width: 372px; flex-shrink: 0">

        <section style="${CARD}; padding: 20px 24px">
          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #141a22">Motif de cette version</h3>
          <div style="border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 10px 12px; min-height: 72px">
            <p style="margin: 0; font-size: 13px; color: #363f4c; line-height: 1.5">Arbitrage manuel du 16 septembre : permutation du 5 octobre à la demande de F. Leroy, et comblement de la place du 7 octobre après-midi.</p>
          </div>
          <p style="margin: 8px 0 16px; font-size: 12px; color: #9aa5b3; line-height: 1.45">Affiché dans l’email de republication à côté de la liste des différences.</p>

          <button type="button" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 40px; border: none; border-radius: 10px; background: {{publishBg}}; box-shadow: 0 1px 2px rgba(16,28,48,0.06); font-family: inherit; font-size: 14px; font-weight: 600; color: #ffffff; cursor: {{publishCursor}}; opacity: {{publishOpacity}}">
            {{publishIcon}}{{publishLabel}}
          </button>
          <p style="margin: 8px 0 0; text-align: center; font-size: 12px; color: #9aa5b3">{{publishHint}}</p>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Exports produits</h3>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <sc-for list="{{exports}}" as="item" hint-placeholder-count="4">
              <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #dde2e9; border-radius: 10px; background: #ffffff; padding: 10px 12px">
                <span style="display: flex; flex-shrink: 0">{{item.icon}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{item.label}}</span>
                  <span style="display: block; margin-top: 1px; font-size: 12px; color: #6b7685; line-height: 1.35">{{item.detail}}</span>
                </span>
              </div>
            </sc-for>
          </div>
        </section>

        <section style="${CARD}; padding: 18px 20px">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #141a22">Après la publication</h3>
          <div style="display: flex; flex-direction: column; gap: 14px">
            <sc-for list="{{next}}" as="step" hint-placeholder-count="3">
              <div style="display: flex; gap: 12px">
                <span style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; padding-top: 3px">
                  <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: {{step.dotBg}}; color: {{step.dotFg}}; font-size: 10px; font-weight: 600">{{step.index}}</span>
                  <span style="width: 1px; flex: 1; background: #dde2e9"></span>
                </span>
                <span style="flex: 1; min-width: 0; padding-bottom: 4px">
                  <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{step.title}}</span>
                  <span style="display: block; margin-top: 2px; font-size: 12px; color: #6b7685; line-height: 1.45">{{step.detail}}</span>
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
    this.state = { acknowledged: false, locale: 'fr' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  renderVals() {
    const acknowledged = this.state.acknowledged;

    const gate = acknowledged
      ? {
          bg: '#FFF3E9', border: '#FDBA74', fg: '#EA580C', detailColor: '#92400e',
          icon: this.glyph('<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>', '#EA580C', 20),
          title: '3 places non pourvues, acquittées',
          detail: 'La publication est débloquée. Le motif saisi ci-dessous accompagnera la diffusion.'
        }
      : {
          bg: '#FEF2F2', border: '#FECACA', fg: '#DC2626', detailColor: '#991b1b',
          icon: this.glyph('<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>', '#DC2626', 20),
          title: 'Publication bloquée : 3 places restent non pourvues',
          detail: 'RG-26 — la publication est refusée tant qu’une place reste vide, sauf acquittement explicite de votre part assorti d’un motif.'
        };

    const checkGlyph = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';

    Object.assign(gate, {
      rows: [
        { title: 'Blomet · Scanner', when: 'mardi 13 octobre, après-midi — aucun volontaire', color: '#047857' },
        { title: 'Blomet · Scanner', when: 'mardi 20 octobre, après-midi — aucun volontaire', color: '#047857' },
        { title: 'Lariboisière · IRM', when: 'jeudi 22 octobre, après-midi — toutes les personnes disponibles sont déjà affectées', color: '#b45309' }
      ],
      toggle: () => this.setState({ acknowledged: !acknowledged }),
      checkBorder: acknowledged ? '#FDBA74' : '#dde2e9',
      checkBox: acknowledged ? '#EA580C' : '#c4ccd6',
      checkFill: acknowledged ? '#EA580C' : '#ffffff',
      checkMark: acknowledged ? checkGlyph : '',
      reasonBorder: acknowledged ? '#dde2e9' : '#eceff3',
      reasonBg: acknowledged ? '#ffffff' : '#fafbfc',
      reasonColor: acknowledged ? '#363f4c' : '#aeb7c2',
      reasonText: acknowledged
        ? 'Le scanner de Blomet du mardi après-midi n’a trouvé aucun volontaire trois semaines de suite. Le créneau sera redistribué avec le service de Blomet avant novembre. Le 22 octobre reste ouvert à une disponibilité exceptionnelle.'
        : 'Saisissez ici le motif de l’acquittement…'
    });

    const recipients = [
      { initials: 'TP', name: 'Théo Pezel', detail: '8 vacations, dont 6 doubles vacations', tag: '2 changements', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
      { initials: 'SR', name: 'S. Rousseau', detail: '9 vacations', tag: 'Inchangé', tagStyle: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' },
      { initials: 'AB', name: 'A. Bernard', detail: '8 vacations', tag: '1 changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
      { initials: 'FL', name: 'F. Leroy', detail: '7 vacations', tag: '1 changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
      { initials: 'MN', name: 'M. Nguyen', detail: '6 vacations', tag: '1 changement', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB' },
      { initials: 'JV', name: 'J. Vidal', detail: '6 vacations', tag: 'Nouvelle', tagStyle: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857' },
      { initials: 'CD', name: 'C. Dumont', detail: '4 vacations', tag: 'Inchangé', tagStyle: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' },
      { initials: 'ML', name: 'M. Lefèvre', detail: 'aucune vacation — indisponible ce mois', tag: 'Pour information', tagStyle: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765' }
    ];

    const localeDefs = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }];
    const locales = localeDefs.map((entry) => ({
      label: entry.label,
      bg: this.state.locale === entry.id ? '#ffffff' : 'transparent',
      fg: this.state.locale === entry.id ? '#141a22' : '#6b7685',
      shadow: this.state.locale === entry.id ? '0 1px 2px rgba(16,28,48,0.06)' : 'none',
      pick: () => this.setState({ locale: entry.id })
    }));

    const mails = {
      fr: {
        subject: 'Planning d’imagerie d’octobre 2026, version 3',
        body: 'Bonjour Alix,\\n\\nLe planning d’imagerie cardiaque d’octobre 2026 vient d’être publié. Vos vacations sont les suivantes :\\n\\n  •  lundi 5 octobre, matin — Bergère, IRM\\n  •  mercredi 7 octobre, après-midi — Blomet, IRM\\n  •  jeudi 15 octobre, matin — Bergère, scanner\\n  •  … 5 autres vacations\\n\\nUne affectation a changé depuis la version 2 : le 5 octobre matin vous est désormais attribué, à la place de F. Leroy.\\n\\nTrois places n’ont pas trouvé preneur ce mois-ci, sur le scanner de Blomet du mardi après-midi et l’IRM de Lariboisière du 22 octobre. Motif : le créneau sera redistribué avec le service de Blomet avant novembre.\\n\\nLe planning complet de l’équipe et un fichier calendrier de vos seules vacations sont joints à ce message.\\n\\nBien cordialement,\\nThéo Pezel\\nCoordination de l’activité d’imagerie cardiaque\\nService de Cardiologie, Hôpital Lariboisière, AP-HP'
      },
      en: {
        subject: 'Cardiac imaging schedule for October 2026, version 3',
        body: 'Hello Alix,\\n\\nThe cardiac imaging schedule for October 2026 has just been published. Your sessions are:\\n\\n  •  Monday 5 October, morning — Bergère, CMR\\n  •  Wednesday 7 October, afternoon — Blomet, CMR\\n  •  Thursday 15 October, morning — Bergère, CT\\n  •  … 5 more sessions\\n\\nOne assignment changed since version 2: 5 October morning is now yours instead of F. Leroy’s.\\n\\nThree places found no taker this month, on the Blomet CT of Tuesday afternoons and the Lariboisière CMR of 22 October. Reason: the slot will be reallocated with the Blomet department before November.\\n\\nThe full team schedule and a calendar file of your own sessions are attached.\\n\\nKind regards,\\nThéo Pezel\\nCardiac imaging coordination\\nCardiology Department, Hôpital Lariboisière, AP-HP'
      }
    };

    const fileGlyph = (path, color) => this.glyph(path, color, 14);

    return {
      gate,
      recipients,
      locales,
      mail: mails[this.state.locale],
      attachments: [
        { label: 'planning-octobre-2026.pdf', icon: fileGlyph('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>', '#DC2626') },
        { label: 'mes-vacations.ics', icon: fileGlyph('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>', '#1f4b86') },
        { label: 'planning-et-compteurs.xlsx', icon: fileGlyph('<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 3v18"></path>', '#047857') }
      ],
      publishBg: acknowledged ? '#d61f55' : '#c4ccd6',
      publishCursor: acknowledged ? 'pointer' : 'not-allowed',
      publishOpacity: acknowledged ? '1' : '0.7',
      publishIcon: this.glyph('<path d="m22 2-7 20-4-9-9-4 20-7z"></path>', '#ffffff', 16),
      publishLabel: acknowledged ? 'Publier et diffuser à 8 personnes' : 'Publication bloquée',
      publishHint: acknowledged
        ? 'Cette version deviendra la référence. Les versions 1 et 2 passeront au statut remplacé.'
        : 'Acquittez les places non pourvues pour débloquer la publication.',
      exports: [
        { label: 'PDF du planning complet', detail: 'Calendrier mensuel lisible en une page, format paysage', icon: fileGlyph('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>', '#DC2626') },
        { label: 'Fichier ICS individuel', detail: 'Ne contient que les vacations de la personne', icon: fileGlyph('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>', '#1f4b86') },
        { label: 'Abonnement calendrier permanent', detail: 'Mis à jour à chaque publication et à chaque échange validé', icon: fileGlyph('<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path>', '#4d5765') },
        { label: 'Export tableur', detail: 'Planning et compteurs, pour archivage — coordinateur uniquement', icon: fileGlyph('<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 3v18"></path>', '#047857') }
      ],
      next: [
        { index: '1', title: 'Ouverture du recueil des fellows', dotBg: '#ec3b68', dotFg: '#ffffff', detail: 'Automatique à la publication. 5 liens personnels seront envoyés (email E05).' },
        { index: '2', title: 'Génération du planning fellows', dotBg: '#eceff3', dotFg: '#6b7685', detail: 'Possible seulement maintenant : les objectifs F1 à F4 ont besoin du senior affecté à chaque créneau.' },
        { index: '3', title: 'Ouverture des échanges', dotBg: '#eceff3', dotFg: '#6b7685', detail: 'À la publication des deux plannings, jusqu’à la veille de chaque vacation.' }
      ]
    };
  }
}`

export default {
  file: 'Publication.dc.html',
  width: 1440,
  height: 1420,
  body,
  logic,
  props: '{}'
}
