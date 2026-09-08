/* Tokens lifted from app/globals.css and components/ui/* of the portal. */
const T = {
  navy50: '#eef2f8', navy100: '#d6e0ee', navy200: '#aac0dc', navy300: '#7197c2',
  navy400: '#3f6aa3', navy500: '#1f4b86', navy600: '#173d6e', navy700: '#122f54',
  navy800: '#0e2542', navy900: '#0a1b30',
  coral50: '#fff1f4', coral100: '#ffdbe3', coral200: '#ffb6c6', coral300: '#fb88a3',
  coral400: '#f55c83', coral500: '#ec3b68', coral600: '#d61f55', coral700: '#b01547',
  gray0: '#ffffff', gray25: '#fafbfc', gray50: '#f5f7fa', gray100: '#eceff3',
  gray200: '#dde2e9', gray300: '#c4ccd6', gray400: '#9aa5b3', gray500: '#6b7685',
  gray600: '#4d5765', gray700: '#363f4c', gray800: '#232a34', gray900: '#141a22',
  ok700: '#047857', ok600: '#15803d', ok500: '#16a34a', okBg: '#ECFDF5', okBorder: '#A7F3D0',
  warn700: '#92400e', warn600: '#b45309', warn500: '#d97706', warnText: '#EA580C',
  warnBg: '#FFF3E9', warnBorder: '#FDBA74',
  danger600: '#b91c1c', danger500: '#dc2626', dangerText: '#DC2626',
  dangerBg: '#FEF2F2', dangerBorder: '#FECACA',
  info: '#2563EB', infoBg: '#EFF6FF', infoBorder: '#BFDBFE',
  line: '#dde2e9', surface: '#ffffff', app: '#f5f7fa',
  text: '#141a22', text2: '#6b7685', text3: '#9aa5b3',
  shadowXs: '0 1px 2px rgba(16,28,48,0.06)',
  shadowSm: '0 1px 3px rgba(16,28,48,0.08), 0 1px 2px rgba(16,28,48,0.04)',
  shadowMd: '0 6px 18px rgba(16,28,48,0.1)',
  shadowLg: '0 16px 40px rgba(16,28,48,0.16)'
}

const CENTERS = {
  BERGERE: { label: 'Bergère', color: T.navy500 },
  BLOMET: { label: 'Blomet', color: T.ok700 },
  LARIBOISIERE: { label: 'Lariboisière', color: T.warn600 }
}

const P = {
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
  chevronDown: '<path d="m6 9 6 6 6-6"></path>',
  chevronRight: '<path d="m9 6 6 6-6 6"></path>',
  chevronLeft: '<path d="m15 6-6 6 6 6"></path>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"></path>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"></path>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  x: '<path d="M18 6 6 18M6 6l12 12"></path>',
  minus: '<path d="M5 12h14"></path>',
  star: '<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"></path>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7.5-2"></path>',
  alert: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path>',
  clockAlert: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>',
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
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 3v18"></path>',
  mail: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="m2 7 10 6 10-6"></path>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"></path>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"></path>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 3v6h-6"></path>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path><path d="M12 8v4.5l3 1.8"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"></path>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"></rect><path d="M11 18.5h2"></path>',
  ct: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="3"></circle>'
}

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const icon = (key, color, size) =>
  `<svg width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="${color || T.gray500}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${P[key] || ''}</svg>`

const CARD = `border:1px solid ${T.line};border-radius:16px;background:${T.surface};box-shadow:${T.shadowSm}`

const TONES = {
  neutral: { bg: T.gray100, border: T.line, fg: T.gray600 },
  info: { bg: T.infoBg, border: T.infoBorder, fg: T.info },
  success: { bg: T.okBg, border: T.okBorder, fg: T.ok700 },
  warning: { bg: T.warnBg, border: T.warnBorder, fg: T.warnText },
  danger: { bg: T.dangerBg, border: T.dangerBorder, fg: T.dangerText },
  navy: { bg: T.navy600, border: T.navy600, fg: '#ffffff' }
}

const badge = (label, tone) => {
  const skin = TONES[tone || 'neutral']
  return `<span style="display:inline-flex;align-items:center;border-radius:10px;border:1px solid ${skin.border};background:${skin.bg};color:${skin.fg};padding:2px 8px;font-size:12px;font-weight:500;white-space:nowrap">${label}</span>`
}

const BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 16px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap'

const SKINS = {
  default: `border:none;background:linear-gradient(to bottom right,${T.navy700},${T.navy900});color:#fff;box-shadow:${T.shadowXs}`,
  primary: `border:none;background:${T.coral600};color:#fff;box-shadow:${T.shadowXs}`,
  outline: `border:1px solid ${T.line};background:${T.surface};color:${T.gray700};box-shadow:${T.shadowXs}`,
  secondary: `border:none;background:${T.gray100};color:${T.gray700};box-shadow:${T.shadowXs}`,
  ghost: `border:none;background:transparent;color:${T.gray600}`,
  destructive: `border:none;background:${T.danger600};color:#fff;box-shadow:${T.shadowXs}`,
  disabled: `border:none;background:${T.gray300};color:#fff;cursor:not-allowed`
}

/**
 * @param {{label:string, variant?:string, icon?:string, iconAfter?:string,
 *          nav?:string, act?:string, arg?:string, style?:string}} spec
 */
const button = (spec) => {
  const skin = SKINS[spec.variant || 'default']
  const glyph = spec.icon ? icon(spec.icon, 'currentColor', 16) : ''
  const after = spec.iconAfter ? icon(spec.iconAfter, 'currentColor', 16) : ''
  const hooks =
    (spec.nav ? ` data-nav="${spec.nav}"` : '') +
    (spec.act ? ` data-act="${spec.act}"` : '') +
    (spec.arg !== undefined ? ` data-arg="${esc(spec.arg)}"` : '')
  return `<button type="button"${hooks} style="${BTN};${skin};${spec.style || ''}">${glyph}${spec.label}${after}</button>`
}

const pageHeader = (title, subtitle, actions) =>
  `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:24px">
     <div style="border-left:4px solid ${T.coral500};padding-left:16px;min-width:0">
       <h1 style="margin:0;font-size:30px;font-weight:700;line-height:1.15;color:${T.text}">${title}</h1>
       <p style="margin:4px 0 0;font-size:15px;color:${T.text2}">${subtitle}</p>
     </div>
     ${actions ? `<div style="display:flex;gap:8px;flex-shrink:0">${actions}</div>` : ''}
   </div>`

/** Segmented control. Each option: {id, label}. */
const segmented = (options, activeId, act, extra) =>
  `<div style="display:flex;gap:4px;padding:4px;border-radius:12px;background:${T.gray100};${extra || ''}">
     ${options
       .map((option) => {
         const on = option.id === activeId
         return `<button type="button" data-act="${act}" data-arg="${esc(option.id)}" style="border:none;border-radius:8px;background:${on ? T.surface : 'transparent'};box-shadow:${on ? T.shadowXs : 'none'};padding:5px 12px;font-family:inherit;font-size:13px;font-weight:${on ? 600 : 500};color:${on ? T.text : T.text2};cursor:pointer;white-space:nowrap">${option.label}</button>`
       })
       .join('')}
   </div>`

const avatar = (initials, bg, fg, size) =>
  `<span style="display:flex;align-items:center;justify-content:center;width:${size || 30}px;height:${size || 30}px;flex-shrink:0;border-radius:999px;background:${bg || T.gray100};color:${fg || T.gray600};font-size:${(size || 30) < 28 ? 10 : 11}px;font-weight:600">${initials}</span>`

const statTile = (value, label, color) =>
  `<div style="border:1px solid ${T.gray100};border-radius:12px;background:${T.gray25};padding:12px 14px">
     <p style="margin:0;font-size:22px;font-weight:600;color:${color || T.text};font-variant-numeric:tabular-nums;line-height:1.1">${value}</p>
     <p style="margin:3px 0 0;font-size:12px;color:${T.text2};line-height:1.3">${label}</p>
   </div>`

const bar = (pct, color, height, targetPct) =>
  `<span style="position:relative;display:block;flex:1;height:${height || 16}px;border-radius:${(height || 16) > 10 ? 6 : 4}px;background:${T.gray50};overflow:hidden">
     <span style="position:absolute;left:0;top:0;bottom:0;width:${pct};border-radius:${(height || 16) > 10 ? 6 : 4}px;background:${color}"></span>
     ${targetPct ? `<span style="position:absolute;left:${targetPct};top:0;bottom:0;width:2px;background:${T.gray400}"></span>` : ''}
   </span>`

const noteBox = (tone, title, detail, glyph) => {
  const skin = TONES[tone]
  return `<div style="display:flex;align-items:flex-start;gap:10px;border:1px solid ${skin.border};border-radius:12px;background:${skin.bg};padding:10px 12px">
    <span style="flex-shrink:0;margin-top:1px">${icon(glyph || 'alert', skin.fg, 16)}</span>
    <span style="flex:1;min-width:0">
      <span style="display:block;font-size:13px;font-weight:500;color:${skin.fg}">${title}</span>
      ${detail ? `<span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};line-height:1.45">${detail}</span>` : ''}
    </span>
  </div>`
}

const footnote = (text) =>
  `<div style="display:flex;align-items:flex-start;gap:10px;padding:14px 20px">
     ${icon('info', T.text3, 15)}
     <span style="flex:1;font-size:12px;color:${T.text3};line-height:1.45">${text}</span>
   </div>`

const sectionHead = (title, right) =>
  `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid ${T.line}">
     <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">${title}</h2>
     ${right || ''}
   </div>`

const tableHead = (columns, padding) =>
  `<div style="display:grid;grid-template-columns:${columns.map((column) => column.width).join(' ')};gap:0;border-bottom:1px solid ${T.line};background:${T.gray25};padding:8px ${padding || 20}px">
     ${columns.map((column) => `<span style="font-size:12px;font-weight:500;color:${T.text2};text-align:${column.align || 'left'}">${column.label}</span>`).join('')}
   </div>`
