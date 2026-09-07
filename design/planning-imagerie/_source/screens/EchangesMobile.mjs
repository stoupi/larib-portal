import { mobileTopBar, mobileTabBar, svg, ICONS, APP_GRADIENT } from '../shell.mjs'

const body = `<div style="display: flex; flex-direction: column; flex: 1; min-width: 0">

  ${mobileTopBar('Échanges', 'Octobre 2026 · 2 demandes reçues', { initials: 'AB' })}

  <div style="flex: 1; min-height: 0; overflow: hidden; ${APP_GRADIENT}; padding: 14px 16px">

    <div style="display: flex; gap: 6px; margin-bottom: 14px">
      <sc-for list="{{tabs}}" as="tab" hint-placeholder-count="3">
        <button type="button" onClick="{{tab.pick}}" style="display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; min-height: 38px; border: 1px solid {{tab.border}}; border-radius: 10px; background: {{tab.bg}}; font-family: inherit; font-size: 12px; font-weight: {{tab.weight}}; color: {{tab.fg}}; cursor: pointer; padding: 0 6px">
          {{tab.label}}
          <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; border-radius: 999px; background: {{tab.countBg}}; padding: 0 4px; font-size: 10px; font-weight: 700; color: {{tab.countFg}}">{{tab.count}}</span>
        </button>
      </sc-for>
    </div>

    <sc-if value="{{isInbox}}" hint-placeholder-val="{{true}}">
      <div style="display: flex; flex-direction: column; gap: 12px; height: 592px; overflow: hidden">
        <sc-for list="{{inbox}}" as="request" hint-placeholder-count="2">
          <section style="border: 1px solid #dde2e9; border-radius: 14px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); overflow: hidden">
            <div style="display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid #eceff3; background: #fafbfc">
              <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 999px; background: #eceff3; color: #4d5765; font-size: 10px; font-weight: 600">{{request.initials}}</span>
              <span style="flex: 1; min-width: 0">
                <span style="display: block; font-size: 13px; font-weight: 600; color: #141a22">{{request.who}}</span>
                <span style="display: block; font-size: 11px; color: #6b7685">{{request.kind}} · {{request.when}}</span>
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 14px">
              <div style="display: flex; align-items: center; gap: 10px; border: 1px solid #A7F3D0; border-radius: 10px; background: #ECFDF5; padding: 9px 11px">
                <span style="display: flex; flex-shrink: 0">{{request.inIcon}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #047857">Vous recevez</span>
                  <span style="display: block; margin-top: 2px; font-size: 13px; font-weight: 600; color: #141a22">{{request.inTitle}}</span>
                  <span style="display: block; font-size: 11px; color: #4d5765">{{request.inWhen}}</span>
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; border: 1px solid {{request.outBorder}}; border-radius: 10px; background: {{request.outBg}}; padding: 9px 11px">
                <span style="display: flex; flex-shrink: 0">{{request.outIcon}}</span>
                <span style="flex: 1; min-width: 0">
                  <span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: {{request.outLabelColor}}">Vous cédez</span>
                  <span style="display: block; margin-top: 2px; font-size: 13px; font-weight: 600; color: {{request.outTitleColor}}">{{request.outTitle}}</span>
                  <span style="display: block; font-size: 11px; color: #4d5765">{{request.outWhen}}</span>
                </span>
              </div>
            </div>

            <div style="margin: 0 14px; border: 1px solid #eceff3; border-radius: 10px; background: #fafbfc; padding: 10px 12px">
              <p style="margin: 0 0 7px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #9aa5b3">Impact sur les compteurs</p>
              <div style="display: flex; flex-direction: column; gap: 6px">
                <sc-for list="{{request.impact}}" as="row" hint-placeholder-count="2">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span style="flex: 1; min-width: 0; font-size: 12px; color: #363f4c">{{row.name}}</span>
                    <span style="flex-shrink: 0; font-size: 12px; color: #9aa5b3; font-variant-numeric: tabular-nums">{{row.before}}</span>
                    <span style="display: flex; flex-shrink: 0">{{row.arrow}}</span>
                    <span style="flex-shrink: 0; font-size: 13px; font-weight: 600; color: {{row.color}}; font-variant-numeric: tabular-nums">{{row.after}}</span>
                  </div>
                </sc-for>
              </div>
            </div>

            <sc-if value="{{request.hasMessage}}" hint-placeholder-val="{{true}}">
              <p style="margin: 11px 14px 0; border-left: 3px solid #dde2e9; padding-left: 10px; font-size: 12px; color: #4d5765; line-height: 1.45">{{request.message}}</p>
            </sc-if>

            <div style="display: flex; gap: 8px; padding: 12px 14px">
              <button type="button" style="flex: 1; min-height: 44px; border: 1px solid #dde2e9; border-radius: 11px; background: #ffffff; font-family: inherit; font-size: 13px; font-weight: 500; color: #363f4c; cursor: pointer">Refuser</button>
              <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 7px; flex: 1.4; min-height: 44px; border: none; border-radius: 11px; background: #d61f55; font-family: inherit; font-size: 13px; font-weight: 600; color: #ffffff; cursor: pointer">
                ${svg(ICONS.check, '#ffffff', 15)}Accepter
              </button>
            </div>
            <p style="margin: 0; padding: 0 14px 12px; font-size: 11px; color: #9aa5b3">{{request.expiry}}</p>
          </section>
        </sc-for>
      </div>
    </sc-if>

    <sc-if value="{{isCompose}}" hint-placeholder-val="{{false}}">
      <div style="height: 592px; overflow: hidden">
        <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #141a22">La vacation dont vous voulez vous défaire</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px">
          <sc-for list="{{mine}}" as="shift" hint-placeholder-count="4">
            <div onClick="{{shift.pick}}" style="display: flex; align-items: center; gap: 10px; min-height: 56px; border: 1px solid {{shift.border}}; border-radius: 12px; background: {{shift.bg}}; padding: 10px 13px; cursor: pointer">
              <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; border: 1.5px solid {{shift.dotBorder}}; border-radius: 999px; background: #ffffff">
                <span style="width: 9px; height: 9px; border-radius: 999px; background: {{shift.dotFill}}"></span>
              </span>
              <span style="width: 3px; height: 32px; flex-shrink: 0; border-radius: 2px; background: {{shift.centerColor}}"></span>
              <span style="flex: 1; min-width: 0">
                <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{shift.title}}</span>
                <span style="display: block; margin-top: 1px; font-size: 11px; color: #6b7685">{{shift.when}}</span>
              </span>
            </div>
          </sc-for>
        </div>

        <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #141a22">Contreparties compatibles</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px">
          <sc-for list="{{candidates}}" as="candidate" hint-placeholder-count="3">
            <div style="display: flex; align-items: center; gap: 10px; min-height: 60px; border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 10px 13px">
              <span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 999px; background: #eceff3; color: #4d5765; font-size: 10px; font-weight: 600">{{candidate.initials}}</span>
              <span style="flex: 1; min-width: 0">
                <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{candidate.name}}</span>
                <span style="display: block; margin-top: 1px; font-size: 11px; color: #6b7685; line-height: 1.35">{{candidate.offer}}</span>
              </span>
              <button type="button" style="min-height: 36px; flex-shrink: 0; border: none; border-radius: 10px; background: linear-gradient(to bottom right, #122f54, #0a1b30); padding: 0 14px; font-family: inherit; font-size: 12px; font-weight: 500; color: #ffffff; cursor: pointer">Proposer</button>
            </div>
          </sc-for>
        </div>

        <div style="display: flex; align-items: flex-start; gap: 9px; border: 1px solid #FDBA74; border-radius: 12px; background: #FFF3E9; padding: 11px 13px">
          <span style="flex-shrink: 0; margin-top: 1px">${svg(ICONS.info, '#EA580C', 15)}</span>
          <p style="margin: 0; flex: 1; font-size: 11px; color: #92400e; line-height: 1.45">3 seniors n’apparaissent pas : ils n’ont pas déclaré de disponibilité sur ce créneau. Vous pouvez les solliciter, leur acceptation valant déclaration.</p>
        </div>
      </div>
    </sc-if>

    <sc-if value="{{isOutbox}}" hint-placeholder-val="{{false}}">
      <div style="display: flex; flex-direction: column; gap: 8px; height: 592px; overflow: hidden">
        <sc-for list="{{outbox}}" as="request" hint-placeholder-count="4">
          <div style="display: flex; align-items: center; gap: 11px; min-height: 66px; border: 1px solid #dde2e9; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 2px rgba(16,28,48,0.06); padding: 11px 13px">
            <span style="display: flex; flex-shrink: 0">{{request.icon}}</span>
            <span style="flex: 1; min-width: 0">
              <span style="display: block; font-size: 13px; font-weight: 500; color: #141a22">{{request.title}}</span>
              <span style="display: block; margin-top: 2px; font-size: 11px; color: #6b7685; line-height: 1.35">{{request.detail}}</span>
              <span style="display: inline-flex; align-items: center; border-radius: 8px; padding: 2px 7px; margin-top: 4px; font-size: 10px; font-weight: 600; {{request.tagStyle}}">{{request.tag}}</span>
            </span>
          </div>
        </sc-for>
      </div>
    </sc-if>
  </div>

  ${mobileTabBar([
    { label: 'Mon mois', icon: 'calendar', active: false },
    { label: 'Dispos', icon: 'check', active: false },
    { label: 'Compteurs', icon: 'chart', active: false },
    { label: 'Échanges', icon: 'swap', active: true }
  ])}
</div>`

const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'inbox', shiftId: 's2' };
  }

  glyph(path, color, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  renderVals() {
    const tabDefs = [
      { id: 'inbox', label: 'Reçues', count: 2 },
      { id: 'compose', label: 'Proposer', count: 4 },
      { id: 'outbox', label: 'Envoyées', count: 4 }
    ];

    const tabs = tabDefs.map((entry) => {
      const active = entry.id === this.state.tab;
      return {
        label: entry.label,
        count: String(entry.count),
        bg: active ? '#122f54' : '#ffffff',
        border: active ? '#122f54' : '#dde2e9',
        fg: active ? '#ffffff' : '#4d5765',
        weight: active ? '600' : '500',
        countBg: active ? '#ec3b68' : '#eceff3',
        countFg: active ? '#ffffff' : '#6b7685',
        pick: () => this.setState({ tab: entry.id })
      };
    });

    const upGlyph = this.glyph('<path d="M12 19V5M6 11l6-6 6 6"></path>', '#2563EB', 13);
    const downGlyph = this.glyph('<path d="M12 5v14M6 13l6 6 6-6"></path>', '#EA580C', 13);
    const flatGlyph = this.glyph('<path d="M5 12h14M13 6l6 6-6 6"></path>', '#c4ccd6', 13);
    const inGlyph = this.glyph('<path d="M12 5v14M6 13l6 6 6-6"></path>', '#047857', 17);
    const outGlyph = this.glyph('<path d="M12 19V5M6 11l6-6 6 6"></path>', '#6b7685', 17);
    const noneGlyph = this.glyph('<path d="M5 12h14"></path>', '#9aa5b3', 17);

    const inbox = [
      {
        initials: 'SR', who: 'S. Rousseau', kind: 'Permutation', when: 'hier 18:42',
        inIcon: inGlyph, inTitle: 'Lariboisière · Scanner', inWhen: 'jeudi 15 octobre, après-midi',
        outIcon: outGlyph, outTitle: 'Bergère · Scanner', outWhen: 'jeudi 15 octobre, matin',
        outBorder: '#dde2e9', outBg: '#fafbfc', outLabelColor: '#6b7685', outTitleColor: '#141a22',
        hasMessage: true,
        message: '« Je dois être à Lariboisière le matin ce jeudi-là. Ça t’arrange ? »',
        expiry: 'Expire le 22 septembre.',
        impact: [
          { name: 'Vous', before: '8', after: '8', color: '#4d5765', arrow: flatGlyph },
          { name: 'S. Rousseau', before: '9', after: '9', color: '#4d5765', arrow: flatGlyph }
        ]
      },
      {
        initials: 'CD', who: 'C. Dumont', kind: 'Cession', when: 'il y a 3 jours',
        inIcon: inGlyph, inTitle: 'Bergère · IRM', inWhen: 'lundi 26 octobre, matin',
        outIcon: noneGlyph, outTitle: 'Rien en contrepartie', outWhen: 'cession simple',
        outBorder: '#eceff3', outBg: '#fafbfc', outLabelColor: '#9aa5b3', outTitleColor: '#9aa5b3',
        hasMessage: false, message: '',
        expiry: 'Expire demain.',
        impact: [
          { name: 'Vous', before: '8', after: '9', color: '#2563EB', arrow: upGlyph },
          { name: 'C. Dumont', before: '4', after: '3', color: '#EA580C', arrow: downGlyph }
        ]
      }
    ];

    const shiftDefs = [
      { id: 's1', title: 'Bergère · IRM', when: 'lundi 5 octobre, matin', center: '#1f4b86' },
      { id: 's2', title: 'Blomet · IRM', when: 'mercredi 7 octobre, après-midi', center: '#047857' },
      { id: 's3', title: 'Bergère · Scanner', when: 'jeudi 15 octobre, matin', center: '#1f4b86' },
      { id: 's4', title: 'Lariboisière · IRM', when: 'jeudi 22 octobre, après-midi', center: '#b45309' }
    ];

    const mine = shiftDefs.map((shift) => {
      const active = shift.id === this.state.shiftId;
      return {
        title: shift.title,
        when: shift.when,
        centerColor: shift.center,
        bg: active ? '#fff1f4' : '#ffffff',
        border: active ? '#ec3b68' : '#dde2e9',
        dotBorder: active ? '#ec3b68' : '#c4ccd6',
        dotFill: active ? '#ec3b68' : 'transparent',
        pick: () => this.setState({ shiftId: shift.id })
      };
    });

    const candidates = [
      { initials: 'MN', name: 'M. Nguyen', offer: 'propose Lariboisière · Scanner, mardi 20 oct. matin' },
      { initials: 'JV', name: 'J. Vidal', offer: 'propose Bergère · IRM, vendredi 30 oct. après-midi' },
      { initials: 'FL', name: 'F. Leroy', offer: 'propose Blomet · Scanner, mardi 13 oct. matin' }
    ];

    const outbox = [
      {
        icon: this.glyph('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', '#EA580C', 18),
        title: 'Permutation proposée à M. Nguyen', detail: 'Bergère · Scanner du 15 oct. contre Lariboisière · IRM du 20 oct.',
        tag: 'En attente', tagStyle: 'border: 1px solid #FDBA74; background: #FFF3E9; color: #EA580C'
      },
      {
        icon: this.glyph('<path d="M20 6 9 17l-5-5"></path>', '#047857', 18),
        title: 'Cession acceptée par J. Vidal', detail: 'Blomet · IRM du 7 octobre après-midi',
        tag: 'À valider par le coordinateur', tagStyle: 'border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB'
      },
      {
        icon: this.glyph('<path d="M20 6 9 17l-5-5"></path>', '#047857', 18),
        title: 'Permutation validée avec F. Leroy', detail: 'Compteurs recalculés, nouvelle version créée',
        tag: 'Validé', tagStyle: 'border: 1px solid #A7F3D0; background: #ECFDF5; color: #047857'
      },
      {
        icon: this.glyph('<path d="M18 6 6 18M6 6l12 12"></path>', '#6b7685', 18),
        title: 'Demande devenue sans objet', detail: 'Un autre échange validé portait sur la même affectation',
        tag: 'Caduque', tagStyle: 'border: 1px solid #dde2e9; background: #eceff3; color: #4d5765'
      }
    ];

    return {
      tabs,
      isInbox: this.state.tab === 'inbox',
      isCompose: this.state.tab === 'compose',
      isOutbox: this.state.tab === 'outbox',
      inbox,
      mine,
      candidates,
      outbox
    };
  }
}`

export default {
  file: 'EchangesMobile.dc.html',
  width: 390,
  height: 844,
  body,
  logic,
  props: '{}'
}
