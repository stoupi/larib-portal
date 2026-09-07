/* App shell: sidebar, role switcher, router, feedback channel. */

const ROLES = {
  COORDINATOR: { label: 'Coordinateur', detail: 'Dr Théo Pezel — administre le module', person: 'tp' },
  SENIOR: { label: 'Imageur senior', detail: 'A. Bernard — déclare et consulte', person: 'ab' },
  FELLOW: { label: 'Fellow', detail: 'L. Aubry — déclare et consulte', person: 'la' }
}

const NAV = {
  COORDINATOR: [
    { section: 'Cycle mensuel', items: [
      { id: 'campagnes', label: 'Campagnes', glyph: 'planning' },
      { id: 'vacations', label: 'Charger les vacations', glyph: 'upload' },
      { id: 'suivi', label: 'Suivi des réponses', glyph: 'users' },
      { id: 'revue', label: 'Revue du planning', glyph: 'calendar' },
      { id: 'rapport', label: 'Rapport du moteur', glyph: 'wand' },
      { id: 'publication', label: 'Publier et diffuser', glyph: 'send' }
    ]},
    { section: 'Mon activité', items: [
      { id: 'dispos', label: 'Mes disponibilités', glyph: 'check' },
      { id: 'monmois', label: 'Mon mois', glyph: 'clock' },
      { id: 'compteurs', label: 'Compteurs et équité', glyph: 'chart' },
      { id: 'echanges', label: 'Échanges', glyph: 'swap' }
    ]},
    { section: 'Administration', items: [
      { id: 'parametres', label: 'Paramètres du module', glyph: 'settings' }
    ]}
  ],
  SENIOR: [
    { section: 'Mon activité', items: [
      { id: 'dispos', label: 'Mes disponibilités', glyph: 'check' },
      { id: 'monmois', label: 'Mon mois', glyph: 'calendar' },
      { id: 'compteurs', label: 'Compteurs et équité', glyph: 'chart' },
      { id: 'echanges', label: 'Échanges', glyph: 'swap' }
    ]}
  ],
  FELLOW: [
    { section: 'Mon activité', items: [
      { id: 'dispos', label: 'Mes disponibilités', glyph: 'check' },
      { id: 'monmois', label: 'Mon mois', glyph: 'calendar' },
      { id: 'compteurs', label: 'Compteurs et équité', glyph: 'chart' },
      { id: 'echanges', label: 'Échanges', glyph: 'swap' }
    ]}
  ]
}

const VIEW_TITLES = {
  campagnes: 'Campagnes', vacations: 'Charger les vacations', suivi: 'Suivi des réponses',
  revue: 'Revue du planning', rapport: 'Rapport du moteur', publication: 'Publier et diffuser',
  parametres: 'Paramètres du module', dispos: 'Mes disponibilités', monmois: 'Mon mois',
  compteurs: 'Compteurs et équité', echanges: 'Échanges', retours: 'Retours et anomalies'
}

function allowedViews() {
  const list = []
  NAV[S.role].forEach((group) => group.items.forEach((item) => list.push(item.id)))
  list.push('retours')
  return list
}

function sidebarHtml() {
  const me = viewer()
  const groups = NAV[S.role]
  const feedbackCount = FEEDBACK.items.length

  return `<aside style="display:flex;flex-direction:column;width:256px;flex-shrink:0;background:${T.navy700};color:#fff;height:100vh;position:sticky;top:0">
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 24px;text-align:center">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 34s-13-8.2-13-17a7 7 0 0 1 13-3.7A7 7 0 0 1 33 17c0 8.8-13 17-13 17z"></path>
        <path d="M6 20h7l2.5-5 4 10 3-5H34"></path>
      </svg>
      <span style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Larib Portal</span>
      <span style="font-size:11px;color:${T.navy200}">Planning imagerie</span>
    </div>

    <div style="padding:0 12px 12px">
      <p style="margin:0 0 8px;padding:0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.navy300}">Je suis connecté comme</p>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${Object.keys(ROLES).map((key) => {
          const on = key === S.role
          const role = ROLES[key]
          const person = SENIORS.concat(FELLOWS).find((entry) => entry.id === role.person)
          return `<button type="button" data-act="set-role" data-arg="${key}" style="display:flex;align-items:center;gap:10px;width:100%;min-height:44px;border:1px solid ${on ? T.coral500 : 'transparent'};border-radius:10px;background:${on ? T.navy600 : 'transparent'};padding:7px 10px;font-family:inherit;cursor:pointer;text-align:left">
            <span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0;border-radius:999px;background:${on ? T.coral500 : T.navy600};color:#fff;font-size:10px;font-weight:700">${person.initials}</span>
            <span style="flex:1;min-width:0">
              <span style="display:block;font-size:13px;font-weight:${on ? 600 : 500};color:${on ? '#fff' : T.navy100}">${role.label}</span>
              <span style="display:block;font-size:11px;color:${T.navy200};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${person.name}</span>
            </span>
          </button>`
        }).join('')}
      </div>
    </div>

    <nav style="display:flex;flex-direction:column;gap:20px;flex:1;overflow-y:auto;padding:8px 12px 16px;border-top:1px solid ${T.navy600}">
      ${groups.map((group) => `<div>
        <p style="margin:12px 0 8px;padding:0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.navy300}">${group.section}</p>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${group.items.map((item) => {
            const on = item.id === S.view
            return `<button type="button" data-nav="${item.id}" style="position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:40px;border:none;border-radius:12px;background:${on ? T.navy600 : 'transparent'};padding:8px 12px;font-family:inherit;font-size:14px;font-weight:500;color:${on ? '#fff' : T.navy100};cursor:pointer;text-align:left">
              ${on ? `<span style="position:absolute;left:0;top:50%;width:4px;height:24px;margin-top:-12px;border-radius:0 4px 4px 0;background:${T.coral500}"></span>` : ''}
              ${icon(item.glyph, on ? T.coral400 : T.navy200, 16)}
              <span style="flex:1;min-width:0">${item.label}</span>
            </button>`
          }).join('')}
        </div>
      </div>`).join('')}

      <div>
        <p style="margin:12px 0 8px;padding:0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.navy300}">Recette</p>
        <button type="button" data-nav="retours" style="position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:40px;border:none;border-radius:12px;background:${S.view === 'retours' ? T.navy600 : 'transparent'};padding:8px 12px;font-family:inherit;font-size:14px;font-weight:500;color:${S.view === 'retours' ? '#fff' : T.navy100};cursor:pointer;text-align:left">
          ${S.view === 'retours' ? `<span style="position:absolute;left:0;top:50%;width:4px;height:24px;margin-top:-12px;border-radius:0 4px 4px 0;background:${T.coral500}"></span>` : ''}
          ${icon('alert', S.view === 'retours' ? T.coral400 : T.navy200, 16)}
          <span style="flex:1;min-width:0">Retours et anomalies</span>
          ${feedbackCount ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:999px;background:${T.coral500};padding:0 6px;font-size:11px;font-weight:700;color:#fff">${feedbackCount}</span>` : ''}
        </button>
      </div>
    </nav>

    <div style="border-top:1px solid ${T.navy600};padding:12px">
      <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:12px;background:${T.navy600}">
        ${avatar(me.initials, T.coral500, '#fff', 32)}
        <span style="display:flex;flex-direction:column;flex:1;min-width:0">
          <span style="font-size:14px;font-weight:500;color:#fff">${me.short}</span>
          <span style="font-size:12px;color:${T.navy200}">${me.role}</span>
        </span>
      </div>
    </div>
  </aside>`
}

/* ---- Feedback -------------------------------------------------------- */

const FEEDBACK = {
  db: null,
  ready: false,
  items: [],
  open: false,
  kind: 'BUG',
  draft: '',
  author: '',
  sending: false
}

const FEEDBACK_KINDS = [
  { id: 'BUG', label: 'Ça ne marche pas', glyph: 'alert', tone: 'danger' },
  { id: 'FIX', label: 'À corriger', glyph: 'settings', tone: 'warning' },
  { id: 'IDEA', label: 'Idée, question', glyph: 'info', tone: 'info' }
]

const KIND_LABELS = { BUG: 'Anomalie', FIX: 'Correction', IDEA: 'Idée' }
const KIND_TONES = { BUG: 'danger', FIX: 'warning', IDEA: 'info' }

async function initFeedback() {
  try {
    FEEDBACK.db = await claude.use('db')
  } catch (error) {
    FEEDBACK.db = null
  }
  FEEDBACK.ready = true
  if (!FEEDBACK.db) {
    try {
      FEEDBACK.items = JSON.parse(localStorage.getItem('planning-feedback') || '[]')
    } catch (error) {
      FEEDBACK.items = []
    }
    render()
    return
  }
  try {
    FEEDBACK.db.collection('feedback').orderBy('createdAt', 'desc').limit(200).onSnapshot(
      (snapshot) => {
        FEEDBACK.items = snapshot.docs.map((document) => {
          const body = document.data() || {}
          return {
            id: document.id,
            kind: typeof body.kind === 'string' ? body.kind : 'IDEA',
            view: typeof body.view === 'string' ? body.view : '',
            role: typeof body.role === 'string' ? body.role : '',
            author: typeof body.author === 'string' ? body.author : '',
            text: typeof body.text === 'string' ? body.text : '',
            createdAt: typeof body.createdAt === 'string' ? body.createdAt : ''
          }
        })
        render()
      },
      () => {}
    )
  } catch (error) {
    FEEDBACK.db = null
    render()
  }
}

async function sendFeedback() {
  const text = FEEDBACK.draft.trim()
  if (!text || FEEDBACK.sending) return
  FEEDBACK.sending = true
  render()

  const entry = {
    kind: FEEDBACK.kind,
    view: VIEW_TITLES[S.view] || S.view,
    role: ROLES[S.role].label,
    author: FEEDBACK.author.trim(),
    text,
    createdAt: new Date().toISOString()
  }
  const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8)

  if (FEEDBACK.db) {
    try {
      await FEEDBACK.db.collection('feedback').doc(id).set(entry)
      toast('Retour envoyé. Il est visible dans « Retours et anomalies ».')
    } catch (error) {
      toast('Envoi impossible pour le moment. Votre texte est conservé.')
      FEEDBACK.sending = false
      render()
      return
    }
  } else {
    FEEDBACK.items = [Object.assign({ id }, entry)].concat(FEEDBACK.items)
    try {
      localStorage.setItem('planning-feedback', JSON.stringify(FEEDBACK.items))
    } catch (error) {
      /* private window: the entry stays in memory for this visit */
    }
    toast('Retour enregistré sur cet appareil uniquement.')
  }

  FEEDBACK.draft = ''
  FEEDBACK.sending = false
  FEEDBACK.open = false
  render()
}

function feedbackButton() {
  return `<button type="button" data-act="feedback-open" style="position:fixed;right:24px;bottom:24px;z-index:40;display:inline-flex;align-items:center;gap:9px;height:48px;border:none;border-radius:999px;background:${T.coral600};box-shadow:${T.shadowLg};padding:0 20px;font-family:inherit;font-size:14px;font-weight:600;color:#fff;cursor:pointer">
    ${icon('send', '#fff', 17)}Signaler quelque chose
  </button>`
}

function feedbackPanel() {
  if (!FEEDBACK.open) return ''
  const stored = FEEDBACK.db
    ? 'Enregistré côté serveur : votre retour remonte directement à l’équipe de développement.'
    : 'Le stockage partagé n’est pas disponible sur cette vue : le retour reste sur cet appareil.'

  return `<div data-overlay="1" style="position:fixed;inset:0;z-index:50;background:rgba(10,27,48,0.45);display:flex;align-items:flex-end;justify-content:flex-end;padding:24px">
    <div style="width:460px;max-height:calc(100vh - 48px);overflow-y:auto;border-radius:18px;background:${T.surface};box-shadow:${T.shadowLg}">
      <div style="display:flex;align-items:flex-start;gap:12px;padding:20px 24px;border-bottom:1px solid ${T.line}">
        <div style="flex:1;min-width:0">
          <h2 style="margin:0;font-size:17px;font-weight:600;color:${T.text}">Signaler quelque chose</h2>
          <p style="margin:4px 0 0;font-size:13px;color:${T.text2};line-height:1.45">Écran concerné : <strong style="color:${T.text};font-weight:600">${VIEW_TITLES[S.view] || S.view}</strong>, vu comme <strong style="color:${T.text};font-weight:600">${ROLES[S.role].label}</strong>.</p>
        </div>
        <button type="button" data-act="feedback-close" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border:1px solid ${T.line};border-radius:9px;background:${T.surface};cursor:pointer;padding:0">${icon('x', T.text2, 16)}</button>
      </div>

      <div style="padding:20px 24px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">De quoi s’agit-il ?</p>
        <div style="display:flex;gap:8px;margin-bottom:18px">
          ${FEEDBACK_KINDS.map((kind) => {
            const on = kind.id === FEEDBACK.kind
            const tone = TONES[kind.tone]
            return `<button type="button" data-act="feedback-kind" data-arg="${kind.id}" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-height:64px;border:1px solid ${on ? tone.fg : T.line};border-radius:12px;background:${on ? tone.bg : T.surface};padding:10px 8px;font-family:inherit;cursor:pointer">
              ${icon(kind.glyph, on ? tone.fg : T.gray400, 18)}
              <span style="font-size:12px;font-weight:${on ? 600 : 500};color:${on ? tone.fg : T.text2};text-align:center;line-height:1.25">${kind.label}</span>
            </button>`
          }).join('')}
        </div>

        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Ce que vous avez constaté</p>
        <textarea id="feedback-text" rows="6" placeholder="Ce que vous attendiez, ce qui s’est passé à la place…" style="width:100%;border:1px solid ${T.line};border-radius:12px;background:${T.surface};padding:12px 14px;font-family:inherit;font-size:14px;line-height:1.55;color:${T.text};resize:vertical;outline:none">${esc(FEEDBACK.draft)}</textarea>

        <p style="margin:16px 0 8px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${T.text3}">Votre nom, si vous voulez</p>
        <input id="feedback-author" type="text" placeholder="Dr Théo Pezel" value="${esc(FEEDBACK.author)}" style="width:100%;height:40px;border:1px solid ${T.line};border-radius:12px;background:${T.surface};padding:0 14px;font-family:inherit;font-size:14px;color:${T.text};outline:none">

        <div style="display:flex;align-items:center;gap:10px;margin-top:18px">
          <span style="flex:1;font-size:11px;color:${T.text3};line-height:1.4">${stored}</span>
          ${button({ label: FEEDBACK.sending ? 'Envoi…' : 'Envoyer', variant: FEEDBACK.sending ? 'disabled' : 'primary', icon: 'send', act: 'feedback-send', style: 'flex-shrink:0' })}
        </div>
      </div>
    </div>
  </div>`
}

VIEWS.retours = () => {
  const items = FEEDBACK.items
  const byKind = { BUG: 0, FIX: 0, IDEA: 0 }
  items.forEach((entry) => { byKind[entry.kind] = (byKind[entry.kind] || 0) + 1 })

  return `
    ${pageHeader(
      'Retours et anomalies',
      FEEDBACK.db
        ? 'Tout ce qui est signalé ici remonte à l’équipe de développement, avec l’écran et le rôle d’où le retour a été émis.'
        : 'Le stockage partagé n’est pas disponible sur cette vue : les retours listés ci-dessous sont conservés sur cet appareil uniquement.',
      button({ label: 'Signaler quelque chose', variant: 'primary', icon: 'send', act: 'feedback-open' })
    )}

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px">
      ${[
        { label: 'Retours au total', value: items.length, color: T.text },
        { label: 'Anomalies', value: byKind.BUG || 0, color: T.dangerText },
        { label: 'Corrections demandées', value: byKind.FIX || 0, color: T.warnText },
        { label: 'Idées et questions', value: byKind.IDEA || 0, color: T.info }
      ].map((stat) => `<div style="${CARD};padding:18px 20px">
        <p style="margin:0;font-size:12px;font-weight:500;color:${T.text2}">${stat.label}</p>
        <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:${stat.color};line-height:1;font-variant-numeric:tabular-nums">${stat.value}</p>
      </div>`).join('')}
    </div>

    <section style="${CARD};overflow:hidden">
      ${sectionHead('Ce qui a été signalé', `<span style="font-size:13px;color:${T.text2}">du plus récent au plus ancien</span>`)}
      ${items.length === 0 ? `<div style="padding:40px 24px;text-align:center">
        <p style="margin:0;font-size:15px;font-weight:500;color:${T.text}">Rien n’a encore été signalé.</p>
        <p style="margin:6px auto 0;max-width:520px;font-size:13px;color:${T.text2};line-height:1.55">Parcourez les écrans en changeant de rôle dans la colonne de gauche. Dès que quelque chose vous surprend, cliquez sur « Signaler quelque chose » en bas à droite : l’écran et le rôle sont joints automatiquement.</p>
      </div>` : items.map((entry) => `<div style="display:flex;align-items:flex-start;gap:14px;padding:16px 20px;border-bottom:1px solid ${T.gray100}">
        <span style="flex-shrink:0;margin-top:2px">${badge(KIND_LABELS[entry.kind] || 'Retour', KIND_TONES[entry.kind] || 'neutral')}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:14px;color:${T.text};line-height:1.55;white-space:pre-wrap">${esc(entry.text)}</span>
          <span style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:8px;font-size:12px;color:${T.text3}">
            <span>${esc(entry.view) || 'écran non précisé'}</span>
            <span>·</span>
            <span>vu comme ${esc(entry.role) || 'rôle non précisé'}</span>
            ${entry.author ? '<span>·</span><span>' + esc(entry.author) + '</span>' : ''}
            ${entry.createdAt ? '<span>·</span><span>' + esc(formatStamp(entry.createdAt)) + '</span>' : ''}
          </span>
        </span>
      </div>`).join('')}
      ${items.length ? footnote('Ces retours sont écrits par les personnes qui essaient le prototype. Ils sont affichés tels quels, sans interprétation.') : ''}
    </section>`
}

function formatStamp(iso) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const pad = (value) => (value < 10 ? '0' + value : String(value))
  return date.getDate() + ' ' + months[date.getMonth()] + ' à ' + pad(date.getHours()) + 'h' + pad(date.getMinutes())
}

/* ---- Router and actions --------------------------------------------- */

let toastTimer = null

function toast(message) {
  S.toast = message
  render()
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { S.toast = null; render() }, 4200)
}

function toastHtml() {
  if (!S.toast) return ''
  return `<div style="position:fixed;top:20px;right:24px;z-index:60;display:flex;align-items:flex-start;gap:10px;max-width:420px;border:1px solid ${T.line};border-radius:12px;background:${T.surface};box-shadow:${T.shadowMd};padding:12px 16px">
    ${icon('info', T.navy500, 16)}
    <span style="flex:1;font-size:13px;color:${T.gray700};line-height:1.45">${esc(S.toast)}</span>
  </div>`
}

function banner() {
  if (S.role === 'COORDINATOR') return ''
  const me = viewer()
  return `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.infoBorder};border-radius:12px;background:${T.infoBg};padding:10px 16px;margin-bottom:20px">
    ${icon('info', T.info, 16)}
    <span style="flex:1;font-size:13px;color:${T.info};line-height:1.45">Vous voyez le module comme <strong>${me.name}</strong>. ${
      S.role === 'FELLOW'
        ? 'Un fellow ne voit que ses propres disponibilités et les compteurs de sa promotion.'
        : 'Un senior ne voit que ses propres disponibilités et les compteurs des seniors.'
    } Les écrans de coordination ne lui sont pas accessibles.</span>
  </div>`
}

function render() {
  const allowed = allowedViews()
  if (allowed.indexOf(S.view) === -1) S.view = allowed[0]
  const view = VIEWS[S.view] || VIEWS.campagnes

  document.getElementById('app').innerHTML =
    `<div style="display:flex;min-height:100vh;background:${T.app}">
       ${sidebarHtml()}
       <main style="flex:1;min-width:0;${APP_GRADIENT_CSS};padding:32px 32px 96px">
         ${banner()}
         ${view()}
       </main>
     </div>
     ${feedbackButton()}
     ${feedbackPanel()}
     ${toastHtml()}`

  if (FEEDBACK.open) {
    const textarea = document.getElementById('feedback-text')
    if (textarea) {
      textarea.focus()
      textarea.selectionStart = textarea.value.length
    }
  }
}

const APP_GRADIENT_CSS =
  'background-color:#f5f7fa;background-image:radial-gradient(58% 52% at 10% 4%, rgba(214,31,85,0.10), transparent 60%),radial-gradient(52% 48% at 92% 12%, rgba(236,59,104,0.08), transparent 62%),radial-gradient(60% 60% at 84% 96%, rgba(214,31,85,0.07), transparent 60%),radial-gradient(48% 54% at 2% 94%, rgba(255,182,198,0.12), transparent 60%)'

const ACTIONS = {
  toast: (arg) => { if (arg) toast(arg) },
  noop: () => {},
  'nav-suivi': () => { S.view = 'suivi' },
  'nav-campagnes': () => { S.view = 'campagnes'; toast('Les 43 vacations valides ont été enregistrées.') },

  'set-role': (arg) => {
    S.role = arg
    const allowed = allowedViews()
    if (allowed.indexOf(S.view) === -1) S.view = allowed[0]
    S.swapShiftId = null
  },

  'set-week': (arg) => { S.week = Number(arg) },
  'pick-slot': (arg) => { S.slotId = arg },
  'toggle-lock': (arg) => {
    S.locks[arg] = !S.locks[arg]
    toast(S.locks[arg] ? 'Affectation verrouillée : elle sera conservée à la régénération.' : 'Verrou retiré.')
  },
  assign: (arg) => {
    const parts = arg.split('|')
    const slotId = parts[0]
    const personId = parts[1]
    if (!isFree(availabilityOf(personId, slotId))) {
      toast('Impossible : cette personne n’a pas déclaré ce créneau disponible (RG-24).')
      return
    }
    S.assignments[slotId] = S.assignments[slotId] === personId ? null : personId
    S.fellowAssignments = solveFellows(S.assignments)
  },
  exceptional: (arg) => {
    const slot = SLOTS.find((entry) => entry.id === arg)
    toast('Email E08 envoyé pour ' + CENTERS[slot.center].label + ' · ' + slot.modality + ' du ' + slotWhen(slot) + '. L’affectation ne sera possible qu’après acceptation explicite.')
  },
  generate: () => {
    S.planVersion += 1
    regenerate()
    S.view = 'revue'
    toast('Proposition v' + S.planVersion + ' générée. Les affectations verrouillées ont été conservées.')
  },

  'import-method': (arg) => { S.importMethod = arg },
  'import-mode': (arg) => { S.importMode = arg },
  'toggle-weights': () => { S.showAllWeights = !S.showAllWeights },
  'suivi-filter': (arg) => { S.suiviFilter = arg },
  remind: (arg) => {
    const person = SENIORS.find((entry) => entry.id === arg)
    toast('Relance envoyée à ' + person.name + ' (email E02).')
  },
  'remind-all': () => {
    const pending = SENIORS.filter((person) => S.submissions[person.id] === 'IN_PROGRESS' || S.submissions[person.id] === 'NOT_STARTED')
    toast(pending.length ? plural(pending.length, 'relance') + ' envoyée' + (pending.length > 1 ? 's' : '') + '.' : 'Tout le monde a répondu : aucune relance à envoyer.')
  },

  'diff-version': (arg) => { S.diffVersion = arg },
  'mail-locale': (arg) => { S.mailLocale = arg },
  'toggle-ack': () => { S.acknowledged = !S.acknowledged },
  publish: () => {
    S.published = true
    S.view = 'campagnes'
    toast('Planning publié en version ' + S.planVersion + '. ' + SENIORS.length + ' emails envoyés, le recueil des fellows est ouvert.')
  },
  'settings-tab': (arg) => { S.settingsTab = arg },

  cycle: (arg) => {
    const me = viewer()
    const order = ['UNAVAILABLE', 'AVAILABLE', 'PREFERRED']
    const current = availabilityOf(me.id, arg)
    setAvailability(me.id, arg, order[(order.indexOf(current) + 1) % order.length])
    S.submissions[me.id] = S.submissions[me.id] === 'DECLINED_MONTH' ? 'IN_PROGRESS' : S.submissions[me.id]
    regenerate()
  },
  'bulk-day': (arg) => {
    const parts = arg.split('|')
    const me = viewer()
    SLOTS.filter((slot) => slot.dayNumber === Number(parts[0])).forEach((slot) => setAvailability(me.id, slot.id, parts[1]))
    regenerate()
  },
  bulk: (arg) => {
    const parts = arg.split('|')
    const scope = parts[0]
    const value = parts[1]
    const me = viewer()
    const matches = (slot) => {
      if (scope === 'all') return true
      if (scope === 'morning') return slot.halfDay === 'MORNING'
      if (scope === 'Scanner') return slot.modality === 'Scanner'
      return slot.center === scope
    }
    SLOTS.filter(matches).forEach((slot) => setAvailability(me.id, slot.id, value))
    regenerate()
    toast('Vos déclarations ont été mises à jour. Le planning en tient compte immédiatement.')
  },
  submit: () => {
    const me = viewer()
    S.submissions[me.id] = S.submissions[me.id] === 'SUBMITTED' ? 'IN_PROGRESS' : 'SUBMITTED'
    toast(S.submissions[me.id] === 'SUBMITTED' ? 'Déclaration validée. Vous pouvez encore la modifier jusqu’à la clôture.' : 'Validation retirée.')
  },
  decline: () => {
    const me = viewer()
    if (S.submissions[me.id] === 'DECLINED_MONTH') {
      S.submissions[me.id] = 'IN_PROGRESS'
    } else {
      S.submissions[me.id] = 'DECLINED_MONTH'
      SLOTS.forEach((slot) => setAvailability(me.id, slot.id, 'UNAVAILABLE'))
      S.submissions[me.id] = 'DECLINED_MONTH'
      regenerate()
      toast('Vous êtes déclaré indisponible sur tout le mois. Aucune vacation ne vous sera attribuée.')
    }
    regenerate()
  },

  'month-filter': (arg) => { S.monthFilter = arg },
  'counters-period': (arg) => { S.countersPeriod = arg },
  'swap-tab': (arg) => { S.swapTab = arg },
  'swap-shift': (arg) => { S.swapShiftId = arg },
  'swap-kind': (arg) => { S.swapKind = arg },

  'feedback-open': () => { FEEDBACK.open = true },
  'feedback-close': () => { captureDraft(); FEEDBACK.open = false },
  'feedback-kind': (arg) => { captureDraft(); FEEDBACK.kind = arg },
  'feedback-send': () => { captureDraft(); sendFeedback() }
}

function captureDraft() {
  const textarea = document.getElementById('feedback-text')
  const author = document.getElementById('feedback-author')
  if (textarea) FEEDBACK.draft = textarea.value
  if (author) FEEDBACK.author = author.value
}

document.addEventListener('click', (event) => {
  /* Clicking the dimmed backdrop closes the panel; clicking inside it —
     the textarea included — must not. */
  if (event.target.getAttribute && event.target.getAttribute('data-overlay') === '1') {
    captureDraft()
    FEEDBACK.open = false
    render()
    return
  }

  const actionNode = event.target.closest('[data-act]')
  const navNode = event.target.closest('[data-nav]')

  if (actionNode) {
    const name = actionNode.getAttribute('data-act')
    const arg = actionNode.getAttribute('data-arg')
    const handler = ACTIONS[name]
    if (handler) {
      handler(arg)
      if (name !== 'feedback-send') render()
      return
    }
  }

  if (navNode) {
    const target = navNode.getAttribute('data-nav')
    if (allowedViews().indexOf(target) === -1) {
      toast('Cet écran n’est pas accessible avec le rôle ' + ROLES[S.role].label + '.')
      return
    }
    S.view = target
    window.scrollTo(0, 0)
    render()
  }
})

render()
initFeedback()
