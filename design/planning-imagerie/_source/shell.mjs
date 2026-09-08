export const HELMET = `<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap">
  <style>
    *{ box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter Tight', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    a { color: #173d6e; text-decoration: none; }
    a:hover { color: #122f54; text-decoration: underline; }
  </style>
</helmet>`

const icon = (path, stroke = '#aac0dc', size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`

export const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"></path><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"></path>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>',
  planning: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path><path d="M8 14h3M8 17.5h3M14 14h2"></path>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-8.8 1.4 5.5 5.5 0 0 0-8.8-1.4c-2.4 2.4-2 6.2.4 8.6L12 21l7.6-6.8c2.4-2.4 3.6-6.2.4-8.6z"></path>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9"></path>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  globe: '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"></path>',
  chevronUp: '<path d="m18 15-6-6-6 6"></path>',
  chevronRight: '<path d="m9 6 6 6-6 6"></path>',
  chevronLeft: '<path d="m15 6-6 6 6 6"></path>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  x: '<path d="M18 6 6 18M6 6l12 12"></path>',
  minus: '<path d="M5 12h14"></path>',
  star: '<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"></path>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7.5-2"></path>',
  alert: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 9 5-5 5 5M12 4v12"></path>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 11 5 5 5-5M12 16V4"></path>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
  wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"></path>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.5.55.9 1.1 1H21a2 2 0 1 1 0 4h-.09c-.55.1-.96.5-1.1 1z"></path>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7z"></path>',
  swap: '<path d="M7 4 3 8l4 4"></path><path d="M3 8h13a4 4 0 0 1 0 8h-1"></path><path d="m17 20 4-4-4-4"></path>',
  chart: '<path d="M3 3v18h18"></path><path d="M7 15v3M12 10v8M17 6v12"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>',
  mail: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="m2 7 10 6 10-6"></path>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"></path>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"></path>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 3v6h-6"></path>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path><path d="M12 8v4.5l3 1.8"></path>'
}

const navItem = (label, iconKey, { active = false, admin = false } = {}) => {
  if (active) {
    return `<div style="position: relative; display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; background: #173d6e; color: #ffffff">
            <span style="position: absolute; left: 0; top: 50%; width: 4px; height: 24px; margin-top: -12px; border-radius: 0 4px 4px 0; background: #ec3b68"></span>
            ${icon(ICONS[iconKey], '#f55c83')}
            <span style="display: flex; flex: 1; align-items: center; gap: 6px">${label}${admin ? icon(ICONS.shield, '#f55c83', 14) : ''}</span>
          </div>`
  }
  return `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; color: #d6e0ee">
            ${icon(ICONS[iconKey])}
            <span style="display: flex; flex: 1; align-items: center; gap: 6px">${label}${admin ? icon(ICONS.shield, '#f55c83', 14) : ''}</span>
          </div>`
}

/**
 * @param {'app'|'admin'} active which sidebar entry is highlighted
 * @param {{initials: string, name: string, role: string}} user
 */
export const sidebar = (active, user) => `<aside style="display: flex; flex-direction: column; width: 256px; flex-shrink: 0; background: #122f54; color: #ffffff">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 24px; text-align: center">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 34s-13-8.2-13-17a7 7 0 0 1 13-3.7A7 7 0 0 1 33 17c0 8.8-13 17-13 17z"></path>
        <path d="M6 20h7l2.5-5 4 10 3-5H34"></path>
      </svg>
      <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase">Larib Portal</span>
    </div>

    <nav style="display: flex; flex-direction: column; gap: 24px; flex: 1; overflow: hidden; padding: 16px 12px">
      <div>
        <p style="margin: 0 0 8px; padding: 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7197c2">Vue d'ensemble</p>
        <div style="display: flex; flex-direction: column; gap: 4px">
          ${navItem('Tableau de bord', 'dashboard')}
        </div>
      </div>
      <div>
        <p style="margin: 0 0 8px; padding: 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7197c2">Applications</p>
        <div style="display: flex; flex-direction: column; gap: 4px">
          ${navItem('Best of Larib', 'cap')}
          ${navItem('Congés', 'calendar')}
          ${navItem('Publications', 'book')}
          ${navItem('CoreLab', 'heart')}
          ${navItem('Planning imagerie', 'planning', { active: active === 'app' })}
        </div>
      </div>
      <div>
        <p style="margin: 0 0 8px; padding: 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7197c2">Administration</p>
        <div style="display: flex; flex-direction: column; gap: 4px">
          ${navItem('Planning imagerie', 'planning', { active: active === 'admin', admin: true })}
          ${navItem('Utilisateurs', 'users')}
        </div>
      </div>
    </nav>

    <div style="border-top: 1px solid #173d6e; padding: 12px">
      <div style="display: flex; flex-direction: column; gap: 8px">
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; color: #d6e0ee">
          ${icon(ICONS.globe)}
          <span style="flex: 1">Langue</span>
          <span style="color: #aac0dc">FR</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 12px; background: #173d6e">
          <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; background: #ec3b68; color: #ffffff; font-size: 13px; font-weight: 600">${user.initials}</span>
          <span style="display: flex; flex-direction: column; flex: 1; min-width: 0">
            <span style="font-size: 14px; font-weight: 500; color: #ffffff">${user.name}</span>
            <span style="font-size: 12px; color: #aac0dc">${user.role}</span>
          </span>
          ${icon(ICONS.chevronUp)}
        </div>
      </div>
    </div>
  </aside>`

export const APP_GRADIENT =
  'background-color: #f5f7fa; background-image: radial-gradient(58% 52% at 10% 4%, rgba(214,31,85,0.10), transparent 60%), radial-gradient(52% 48% at 92% 12%, rgba(236,59,104,0.08), transparent 62%), radial-gradient(60% 60% at 84% 96%, rgba(214,31,85,0.07), transparent 60%), radial-gradient(48% 54% at 2% 94%, rgba(255,182,198,0.12), transparent 60%)'

export const pageHeader = (title, subtitle, actions = '') => `<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px">
      <div style="border-left: 4px solid #ec3b68; padding-left: 16px">
        <h1 style="margin: 0; font-size: 30px; font-weight: 700; line-height: 1.15; color: #141a22">${title}</h1>
        <p style="margin: 4px 0 0; font-size: 15px; color: #6b7685">${subtitle}</p>
      </div>
      ${actions ? `<div style="display: flex; gap: 8px; flex-shrink: 0">${actions}</div>` : ''}
    </div>`

const BTN_BASE =
  'display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 16px; border-radius: 10px; box-shadow: 0 1px 2px rgba(16,28,48,0.06); font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer'

export const button = (label, variant = 'default', iconKey = null, extra = '') => {
  const skins = {
    default: 'border: none; background: linear-gradient(to bottom right, #122f54, #0a1b30); color: #ffffff',
    primary: 'border: none; background: #d61f55; color: #ffffff',
    outline: 'border: 1px solid #dde2e9; background: #ffffff; color: #363f4c',
    secondary: 'border: none; background: #eceff3; color: #363f4c',
    ghost: 'border: none; background: transparent; box-shadow: none; color: #4d5765',
    destructive: 'border: none; background: #b91c1c; color: #ffffff'
  }
  const glyph = iconKey ? icon(ICONS[iconKey], 'currentColor') : ''
  return `<button type="button" style="${BTN_BASE}; ${skins[variant]}; ${extra}">${glyph}${label}</button>`
}

export const CARD =
  'border: 1px solid #dde2e9; border-radius: 16px; background: #ffffff; box-shadow: 0 1px 3px rgba(16,28,48,0.08), 0 1px 2px rgba(16,28,48,0.04)'

export const BADGE_TONES = {
  neutral: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765',
  info: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB',
  success: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857',
  warning: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C',
  danger: 'border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626',
  navy: 'border: 1px solid #173d6e; background: #173d6e; color: #ffffff'
}

export const badge = (label, tone = 'neutral') =>
  `<span style="display: inline-flex; align-items: center; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 500; white-space: nowrap; ${BADGE_TONES[tone]}">${label}</span>`

export const svg = icon

/** Mobile chrome: the portal has no phone shell yet, so this proposes one. */
export const mobileTopBar = (title, subtitle, user) => `<header style="display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; background: #122f54; color: #ffffff; padding: 14px 16px 16px">
    <div style="display: flex; align-items: center; gap: 12px">
      <button type="button" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; border-radius: 10px; background: rgba(255,255,255,0.08); cursor: pointer; padding: 0">${icon(ICONS.menu, '#d6e0ee', 20)}</button>
      <span style="flex: 1; min-width: 0; font-size: 16px; font-weight: 600">${title}</span>
      <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; background: #ec3b68; color: #ffffff; font-size: 12px; font-weight: 600">${user.initials}</span>
    </div>
    <p style="margin: 6px 0 0; padding-left: 48px; font-size: 13px; color: #aac0dc">${subtitle}</p>
  </header>`

export const mobileTabBar = (items) => `<nav style="display: grid; grid-template-columns: repeat(${items.length}, minmax(0, 1fr)); gap: 0; flex-shrink: 0; border-top: 1px solid #dde2e9; background: #ffffff; padding: 8px 8px 20px">
    ${items
      .map(
        (item) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 44px; padding: 6px 4px; border-radius: 12px; background: ${item.active ? '#fff1f4' : 'transparent'}">
      ${icon(ICONS[item.icon], item.active ? '#d61f55' : '#9aa5b3', 20)}
      <span style="font-size: 11px; font-weight: ${item.active ? '600' : '500'}; color: ${item.active ? '#d61f55' : '#6b7685'}">${item.label}</span>
    </div>`
      )
      .join('\n    ')}
  </nav>`

export const page = ({ width, height, body, logic, props }) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${HELMET}

<div style="display: flex; width: ${width}px; height: ${height}px; background: #ffffff; color: #141a22">
${body}
</div>
</x-dc>

<script data-dc-script data-props='${props}'>
${logic}
</script>
</body>
</html>
`
