/* Publication and module settings. */

VIEWS.publication = () => {
  const unfilled = unfilledSlots()
  const counts = seniorCounts()
  const blocked = unfilled.length > 0 && !S.acknowledged
  const gateTone = unfilled.length === 0 ? 'success' : S.acknowledged ? 'warning' : 'danger'
  const skin = TONES[gateTone]

  const gateTitle =
    unfilled.length === 0
      ? 'Toutes les places sont pourvues'
      : S.acknowledged
        ? plural(unfilled.length, 'place') + ' non pourvue' + (unfilled.length > 1 ? 's' : '') + ', acquittée' + (unfilled.length > 1 ? 's' : '')
        : 'Publication bloquée : ' + plural(unfilled.length, 'place') + ' reste' + (unfilled.length > 1 ? 'nt' : '') + ' non pourvue' + (unfilled.length > 1 ? 's' : '')

  const gateDetail =
    unfilled.length === 0
      ? 'Rien ne s’oppose à la publication. La version ' + S.planVersion + ' deviendra la référence du mois.'
      : S.acknowledged
        ? 'La publication est débloquée. Le motif ci-dessous accompagnera la diffusion.'
        : 'RG-26 — la publication est refusée tant qu’une place reste vide, sauf acquittement explicite de votre part assorti d’un motif.'

  const recipients = SENIORS.map((person) => {
    const total = counts[person.id]
    const seed = hash(person.id) % 4
    const tone = total === 0 ? 'neutral' : seed === 0 ? 'neutral' : seed === 3 ? 'success' : 'info'
    const tag = total === 0 ? 'Pour information' : seed === 0 ? 'Inchangé' : seed === 3 ? 'Nouvelle' : plural(seed, 'changement')
    return { person, total, tag, tone }
  })

  /* Addressed to A. Bernard, and derived from the plan actually on screen —
     never a hardcoded list that could contradict the grid. */
  const reader = SENIORS[1]
  const mine = SLOTS.filter((slot) => S.assignments[slot.id] === reader.id)
  const shown = mine.slice(0, 3)
  const rest = mine.length - shown.length

  const listFr = shown
    .map((slot) => '  •  ' + slotWhen(slot) + ' — ' + CENTERS[slot.center].label + ', ' + (slot.modality === 'IRM' ? 'IRM' : 'scanner'))
    .join('\n') + (rest > 0 ? '\n  •  … ' + plural(rest, 'autre vacation') : '')

  const listEn = shown
    .map((slot) => {
      const englishHalf = slot.halfDay === 'MORNING' ? 'morning' : 'afternoon'
      return '  •  ' + slot.dayNumber + ' October, ' + englishHalf + ' — ' + CENTERS[slot.center].label + ', ' + (slot.modality === 'IRM' ? 'CMR' : 'CT')
    })
    .join('\n') + (rest > 0 ? '\n  •  … ' + rest + ' more session' + (rest > 1 ? 's' : '') : '')

  const unfilledFr = unfilled.length
    ? '\n' + plural(unfilled.length, 'place') + ' n’' + (unfilled.length > 1 ? 'ont' : 'a') +
      ' pas trouvé preneur ce mois-ci. Motif : le créneau sera redistribué avec le service concerné avant novembre.\n'
    : ''
  const unfilledEn = unfilled.length
    ? '\n' + unfilled.length + ' place' + (unfilled.length > 1 ? 's' : '') +
      ' found no taker this month. Reason: the slot will be reallocated with the relevant department before November.\n'
    : ''

  const mails = {
    fr: {
      subject: 'Planning d’imagerie d’octobre 2026, version ' + S.planVersion,
      body: `Bonjour ${reader.short},

Le planning d’imagerie cardiaque d’octobre 2026 vient d’être publié. Vos ${mine.length} vacations sont les suivantes :

${listFr}

Les différences avec la version précédente sont détaillées en pied de message, vacation par vacation.
${unfilledFr}
Le planning complet de l’équipe et un fichier calendrier de vos seules vacations sont joints à ce message.

Bien cordialement,
Théo Pezel
Coordination de l’activité d’imagerie cardiaque
Service de Cardiologie, Hôpital Lariboisière, AP-HP`
    },
    en: {
      subject: 'Cardiac imaging schedule for October 2026, version ' + S.planVersion,
      body: `Hello ${reader.short},

The cardiac imaging schedule for October 2026 has just been published. Your ${mine.length} sessions are:

${listEn}

Differences from the previous version are listed at the foot of this message, session by session.
${unfilledEn}
The full team schedule and a calendar file of your own sessions are attached.

Kind regards,
Théo Pezel
Cardiac imaging coordination
Cardiology Department, Hôpital Lariboisière, AP-HP`
    }
  }
  const mail = mails[S.mailLocale]

  const attachments = [
    { label: 'planning-octobre-2026.pdf', glyph: 'file', color: T.dangerText },
    { label: 'mes-vacations.ics', glyph: 'calendar', color: T.navy500 },
    { label: 'planning-et-compteurs.xlsx', glyph: 'sheet', color: T.ok700 }
  ]

  return `
    ${pageHeader(
      'Publier le planning — Octobre 2026',
      'Version ' + S.planVersion + ', population senior. La publication fige cette version, marque les précédentes comme remplacées et déclenche la diffusion.',
      button({ label: 'Retour à la revue', variant: 'ghost', icon: 'arrowLeft', nav: 'revue' })
    )}

    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;min-width:0">

        <section style="border-radius:16px;box-shadow:${T.shadowSm};overflow:hidden;border:1px solid ${skin.border};background:${skin.bg}">
          <div style="display:flex;align-items:flex-start;gap:14px;padding:20px 24px">
            <span style="flex-shrink:0;margin-top:1px">${icon(unfilled.length === 0 ? 'check' : S.acknowledged ? 'clockAlert' : 'alert', skin.fg, 20)}</span>
            <div style="flex:1;min-width:0">
              <h2 style="margin:0;font-size:16px;font-weight:600;color:${skin.fg}">${gateTitle}</h2>
              <p style="margin:5px 0 0;font-size:14px;line-height:1.5;color:${T.gray700}">${gateDetail}</p>

              ${unfilled.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
                ${unfilled.map((slot) => `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.dangerBorder};border-radius:10px;background:${T.surface};padding:9px 12px">
                  <span style="width:3px;height:26px;flex-shrink:0;border-radius:2px;background:${CENTERS[slot.center].color}"></span>
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${CENTERS[slot.center].label} · ${slot.modality}</span>
                    <span style="display:block;font-size:12px;color:${T.text2}">${slotWhen(slot)} — ${unfilledCause(slot).toLowerCase()}</span>
                  </span>
                </div>`).join('')}
              </div>

              <div style="margin-top:16px">
                <div data-act="toggle-ack" style="display:flex;align-items:flex-start;gap:10px;border:1px solid ${S.acknowledged ? T.warnBorder : T.line};border-radius:12px;background:${T.surface};padding:12px 14px;cursor:pointer">
                  <span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;margin-top:1px;border:1.5px solid ${S.acknowledged ? T.warnText : T.gray300};border-radius:5px;background:${S.acknowledged ? T.warnText : T.surface}">${S.acknowledged ? icon('check', '#fff', 12) : ''}</span>
                  <span style="flex:1;min-width:0">
                    <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">J’acquitte ces places non pourvues et je publie malgré tout</span>
                    <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};line-height:1.45">Le motif ci-dessous figurera dans l’email de diffusion envoyé à toute l’équipe senior.</span>
                  </span>
                </div>
                <div style="margin-top:10px;border:1px solid ${S.acknowledged ? T.line : T.gray100};border-radius:10px;background:${S.acknowledged ? T.surface : T.gray25};padding:10px 12px;min-height:58px">
                  <p style="margin:0;font-size:13px;color:${S.acknowledged ? T.gray700 : '#aeb7c2'};line-height:1.5">${
                    S.acknowledged
                      ? 'Le scanner de Blomet du mardi après-midi n’a trouvé aucun volontaire trois semaines de suite. Le créneau sera redistribué avec le service de Blomet avant novembre.'
                      : 'Saisissez ici le motif de l’acquittement…'
                  }</p>
                </div>
              </div>` : ''}
            </div>
          </div>
        </section>

        <section style="${CARD};overflow:hidden">
          ${sectionHead('Ce que chacun recevra', `<span style="font-size:13px;color:${T.text2}">${SENIORS.length} emails individuels · 1 fichier calendrier par personne</span>`)}
          <div style="padding:8px 0">
            ${recipients.map((entry) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid ${T.gray50}">
              ${avatar(entry.person.initials)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:14px;font-weight:500;color:${T.text}">${entry.person.name}</span>
                <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2}">${entry.total === 0 ? 'aucune vacation — indisponible ce mois' : plural(entry.total, 'vacation')}</span>
              </span>
              ${badge(entry.tag, entry.tone)}
            </div>`).join('')}
          </div>
          ${footnote('RG-25 — les personnes dont les affectations ne changent pas reçoivent également l’information, avec la mention que leur planning est inchangé.')}
        </section>

        <section style="${CARD};overflow:hidden">
          <div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid ${T.line};background:${T.gray25}">
            ${icon('mail', T.gray600, 17)}
            <h2 style="margin:0;flex:1;font-size:15px;font-weight:600;color:${T.text}">Aperçu de l’email E04</h2>
            ${segmented([{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }], S.mailLocale, 'mail-locale')}
          </div>
          <div style="padding:20px 24px">
            <p style="margin:0 0 14px;font-size:13px;color:${T.text2}">Objet : <span style="color:${T.text};font-weight:500">${mail.subject}</span></p>
            <div style="border:1px solid ${T.gray100};border-radius:12px;background:${T.gray25};padding:18px 20px">
              <pre style="margin:0;font-family:inherit;font-size:13px;line-height:1.65;color:${T.gray700};white-space:pre-wrap">${esc(mail.body.trim())}</pre>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
              ${attachments.map((file) => `<span style="display:inline-flex;align-items:center;gap:7px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:6px 11px;font-size:12px;color:${T.gray700}">${icon(file.glyph, file.color, 14)}${file.label}</span>`).join('')}
            </div>
          </div>
        </section>
      </div>

      <aside style="display:flex;flex-direction:column;gap:16px;width:372px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 14px;font-size:15px;font-weight:600;color:${T.text}">Motif de cette version</h3>
          <div style="border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:10px 12px;min-height:72px">
            <p style="margin:0;font-size:13px;color:${T.gray700};line-height:1.5">Arbitrage manuel du 16 septembre : permutation du 5 octobre à la demande de F. Leroy, et comblement de la place du 7 octobre après-midi.</p>
          </div>
          <p style="margin:8px 0 16px;font-size:12px;color:${T.text3};line-height:1.45">Affiché dans l’email de republication à côté de la liste des différences.</p>

          <button type="button" data-act="${blocked ? 'toast' : 'publish'}" data-arg="${blocked ? 'Acquittez les places non pourvues pour débloquer la publication.' : ''}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:40px;border:none;border-radius:10px;background:${blocked ? T.gray300 : T.coral600};box-shadow:${T.shadowXs};font-family:inherit;font-size:14px;font-weight:600;color:#fff;cursor:${blocked ? 'not-allowed' : 'pointer'}">
            ${icon('send', '#fff', 16)}${blocked ? 'Publication bloquée' : 'Publier et diffuser à ' + SENIORS.length + ' personnes'}
          </button>
          <p style="margin:8px 0 0;text-align:center;font-size:12px;color:${T.text3}">${
            blocked
              ? 'Acquittez les places non pourvues pour débloquer la publication.'
              : 'Cette version deviendra la référence. Les précédentes passeront au statut remplacé.'
          }</p>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Exports produits</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              { label: 'PDF du planning complet', detail: 'Calendrier mensuel lisible en une page, format paysage', glyph: 'file', color: T.dangerText },
              { label: 'Fichier ICS individuel', detail: 'Ne contient que les vacations de la personne', glyph: 'calendar', color: T.navy500 },
              { label: 'Abonnement calendrier permanent', detail: 'Mis à jour à chaque publication et à chaque échange validé', glyph: 'refresh', color: T.gray600 },
              { label: 'Export tableur', detail: 'Planning et compteurs — coordinateur uniquement', glyph: 'sheet', color: T.ok700 }
            ].map((item) => `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.line};border-radius:10px;background:${T.surface};padding:10px 12px">
              ${icon(item.glyph, item.color, 16)}
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${item.label}</span>
                <span style="display:block;margin-top:1px;font-size:12px;color:${T.text2};line-height:1.35">${item.detail}</span>
              </span>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:18px 20px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Après la publication</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${[
              { title: 'Ouverture du recueil des fellows', detail: 'Automatique à la publication. 5 liens personnels seront envoyés (email E05).' },
              { title: 'Génération du planning fellows', detail: 'Possible seulement maintenant : les objectifs F1 à F4 ont besoin du senior affecté à chaque créneau.' },
              { title: 'Ouverture des échanges', detail: 'À la publication des deux plannings, jusqu’à la veille de chaque vacation.' }
            ].map((step, position) => `<div style="display:flex;gap:12px">
              <span style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:3px">
                <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:${position === 0 ? T.coral500 : T.gray100};color:${position === 0 ? '#fff' : T.text2};font-size:10px;font-weight:600">${position + 1}</span>
                <span style="width:1px;flex:1;background:${T.line}"></span>
              </span>
              <span style="flex:1;min-width:0;padding-bottom:4px">
                <span style="display:block;font-size:13px;font-weight:500;color:${T.text}">${step.title}</span>
                <span style="display:block;margin-top:2px;font-size:12px;color:${T.text2};line-height:1.45">${step.detail}</span>
              </span>
            </div>`).join('')}
          </div>
        </section>
      </aside>
    </div>`
}

function slider(ratio, color) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  return `<span style="position:relative;display:block;height:6px;border-radius:999px;background:${T.gray100}">
    <span style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;border-radius:999px;background:${color}"></span>
    <span style="position:absolute;top:50%;left:${pct}%;width:16px;height:16px;margin:-8px 0 0 -8px;border:2px solid ${color};border-radius:999px;background:${T.surface};box-shadow:${T.shadowXs}"></span>
  </span>`
}

function toggleSwitch(on) {
  return `<span style="display:flex;justify-content:flex-end"><span style="position:relative;display:block;width:40px;height:22px;border-radius:999px;background:${on ? T.ok500 : T.gray300}">
    <span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:16px;height:16px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(16,28,48,0.12)"></span>
  </span></span>`
}

function fieldBox(text) {
  return `<span style="display:flex;align-items:center;justify-content:flex-end;height:34px;border:1px solid ${T.line};border-radius:9px;background:${T.surface};padding:0 12px;font-size:13px;color:${T.gray700}">${text}</span>`
}

VIEWS.parametres = () => {
  const panels = {
    weights: {
      title: 'Poids de la fonction objectif',
      hint: 'Les objectifs sont agrégés par somme pondérée. Ces poids sont copiés et figés dans la campagne au moment de la génération, pour que toute exécution reste rejouable à l’identique.',
      footnote: 'PARAM-10. G5 et G6 sont à zéro par défaut (PARAM-09) : le critère d’équité retenu porte sur le nombre total de vacations. Les activer se fait ici, sans modification de code.',
      rows: [
        { code: 'G1', label: 'Couverture maximale des vacations', detail: 'Poids volontairement très supérieur aux autres : un créneau ne doit jamais être laissé vide pour améliorer l’équité.', control: slider(1, T.navy500), value: '1000' },
        { code: 'S1', label: 'Doubles vacations du coordinateur', detail: 'Maximise les demi-journées où le coordinateur couvre une IRM et un scanner sur le même centre.', control: slider(0.2, T.navy500), value: '200' },
        { code: 'G2', label: 'Équité du nombre total de vacations', detail: 'Écart maximal entre personnes, départagé par la somme des écarts absolus à la cible.', control: slider(0.1, T.navy500), value: '100' },
        { code: 'G4', label: 'Correction inter-mois', detail: 'Favorise les personnes dont le cumul des mois précédents est inférieur à la moyenne.', control: slider(0.03, T.coral500), value: '30' },
        { code: 'G3', label: 'Respect des créneaux prioritaires', detail: 'Maximise les affectations sur les créneaux déclarés « disponible et souhaité en priorité ».', control: slider(0.02, T.coral500), value: '20' },
        { code: 'G7', label: 'Limitation de la concentration hebdomadaire', detail: 'Pénalise les semaines où une personne dépasse le seuil PARAM-06.', control: slider(0.01, T.coral500), value: '10' },
        { code: 'G5', label: 'Équilibre entre modalités', detail: 'Rapproche pour chaque personne la proportion IRM et scanner de la proportion globale du mois.', control: slider(0, T.gray300), value: '0', muted: true },
        { code: 'G6', label: 'Équilibre entre centres', detail: 'Rapproche pour chaque personne la répartition par centre de la répartition globale.', control: slider(0, T.gray300), value: '0', muted: true }
      ]
    },
    solver: {
      title: 'Comportement du moteur',
      hint: 'Bornes de calcul, seuils d’alerte et reproductibilité.',
      footnote: 'À l’expiration du temps de calcul, la meilleure solution trouvée est retournée, accompagnée de la mention explicite que l’optimum n’est pas garanti (RG-23).',
      rows: [
        { code: 'PARAM-04', label: 'Temps de calcul maximal', detail: 'Au-delà, la meilleure solution trouvée est retournée avec une mention explicite.', control: slider(0.3, T.navy500), value: '60 s' },
        { code: 'PARAM-05', label: 'Seuil d’alerte d’écart d’équité', detail: 'Au-delà de cet écart entre le maximum et le minimum, une alerte est levée à la revue.', control: slider(0.2, T.navy500), value: '2' },
        { code: 'PARAM-06', label: 'Seuil de concentration hebdomadaire', detail: 'Nombre de vacations par semaine et par personne au-delà duquel une alerte est levée.', control: slider(0.4, T.navy500), value: '4' },
        { code: 'PARAM-11', label: 'Prise en compte de l’historique inter-mois', detail: 'Fenêtre glissante sur laquelle les dettes et crédits d’équité sont calculés.', control: fieldBox('6 mois glissants'), value: '' },
        { code: 'PARAM-13', label: 'Graine aléatoire', detail: 'Fixée par campagne et affichée dans le rapport. La modifier explore une solution alternative de score équivalent.', control: fieldBox('4271'), value: '' },
        { code: 'PARAM-14', label: 'Propositions alternatives générées', detail: 'Au-delà de 1, plusieurs plannings de score voisin sont produits, entre lesquels vous arbitrez.', control: slider(0.1, T.navy500), value: '1' },
        { code: 'PARAM-12', label: 'Plafond mensuel individuel', detail: 'Aucun plafond par défaut. Se définit personne par personne depuis la gestion des comptes.', control: fieldBox('Aucun par défaut'), value: '' }
      ]
    },
    calendar: {
      title: 'Échéances du cycle mensuel',
      hint: 'Chaque échéance est exprimée en jour du mois M-1 et reste modifiable jusqu’à ce que l’étape correspondante soit atteinte.',
      footnote: 'PARAM-01 et PARAM-02. Les envois d’emails suivent la transition effective, jamais la date théorique.',
      rows: [
        { code: 'PARAM-02', label: 'Transitions automatiques aux échéances', detail: 'Activé : chaque étape bascule d’elle-même à l’échéance. Désactivez-le pour déclencher chaque transition à la main.', control: toggleSwitch(true), value: '' },
        { code: 'PARAM-01', label: 'Ouverture du recueil des seniors', detail: 'Envoi de l’email E01 et des liens personnels.', control: fieldBox('le 5 du mois M-1'), value: '' },
        { code: 'PARAM-01', label: 'Clôture du recueil des seniors', detail: 'À 23h59. Les disponibilités sont ensuite figées.', control: fieldBox('le 15 du mois M-1'), value: '' },
        { code: 'PARAM-01', label: 'Publication du planning des seniors', detail: 'Ouvre automatiquement le recueil des fellows.', control: fieldBox('le 18 du mois M-1'), value: '' },
        { code: 'PARAM-01', label: 'Clôture du recueil des fellows', detail: 'À 23h59.', control: fieldBox('le 24 du mois M-1'), value: '' },
        { code: 'PARAM-17', label: 'Relances automatiques', detail: 'Puis un dernier rappel la veille de la clôture, rappelant qu’une absence de réponse vaut indisponibilité.', control: fieldBox('à J-5 puis J-2'), value: '' },
        { code: 'PARAM-03', label: 'Validité des liens personnels', detail: 'À compter de la clôture de la phase de recueil concernée.', control: fieldBox('clôture + 7 jours'), value: '' }
      ]
    },
    swaps: {
      title: 'Échanges et notifications',
      hint: 'Règles applicables après publication, entre pairs d’une même population.',
      footnote: 'Un échange ne peut jamais créer de conflit : une permutation conduisant à deux affectations sur la même demi-journée est refusée à l’émission (RG-28), sauf double vacation autorisée.',
      rows: [
        { code: 'PARAM-07', label: 'Validation des échanges par le coordinateur', detail: 'Activé par défaut. Un échange accepté entre pairs vous est soumis avant de prendre effet.', control: toggleSwitch(true), value: '' },
        { code: 'PARAM-15', label: 'Expiration d’une demande sans réponse', detail: 'Et au plus tard la veille de la vacation concernée.', control: fieldBox('7 jours'), value: '' },
        { code: 'PARAM-16', label: 'Fermeture des échanges avant la vacation', detail: 'Zéro signifie que les échanges restent ouverts jusqu’à la veille.', control: fieldBox('0 jour'), value: '' },
        { code: 'PARAM-18', label: 'Récapitulatif de fin de mois', detail: 'Email E14, seul message désabonnable du module. E01 à E13 sont des messages de service.', control: toggleSwitch(true), value: '' },
        { code: 'RG-05', label: 'Visibilité des disponibilités individuelles', detail: 'Réservée au coordinateur, y compris après publication. Point ouvert V03, à confirmer.', control: fieldBox('Coordinateur seul'), value: '' },
        { code: 'RG-04', label: 'Visibilité nominative des compteurs', detail: 'Chacun voit les compteurs nominatifs de sa propre population. Point ouvert V04, à confirmer.', control: fieldBox('Nominative'), value: '' }
      ]
    }
  }

  const panel = panels[S.settingsTab]
  const tabs = [
    { id: 'weights', label: 'Poids du moteur', glyph: 'chart' },
    { id: 'solver', label: 'Comportement', glyph: 'settings' },
    { id: 'calendar', label: 'Échéances', glyph: 'calendar' },
    { id: 'swaps', label: 'Échanges et emails', glyph: 'swap' }
  ]

  return `
    ${pageHeader(
      'Paramètres du module',
      'Tout se règle ici, sans redéploiement. Aucune de ces valeurs n’est écrite en dur dans le code.',
      button({ label: 'Rétablir les valeurs par défaut', variant: 'ghost', act: 'toast', arg: 'Les poids reviendraient aux valeurs du chapitre 8.4.' }) +
      button({ label: 'Enregistrer', variant: 'primary', icon: 'check', act: 'toast', arg: 'Paramètres enregistrés. Ils s’appliqueront à la prochaine génération.' })
    )}

    <div style="display:flex;gap:12px;margin-bottom:20px;padding:4px;border-radius:14px;background:${T.gray100};width:fit-content">
      ${tabs.map((tab) => {
        const on = tab.id === S.settingsTab
        return `<button type="button" data-act="settings-tab" data-arg="${tab.id}" style="display:flex;align-items:center;gap:8px;border:none;border-radius:10px;background:${on ? T.surface : 'transparent'};box-shadow:${on ? T.shadowXs : 'none'};padding:8px 16px;font-family:inherit;font-size:14px;font-weight:${on ? 600 : 500};color:${on ? T.text : T.text2};cursor:pointer">${icon(tab.glyph, on ? T.coral600 : T.gray400, 16)}${tab.label}</button>`
      }).join('')}
    </div>

    <div style="display:flex;gap:20px;align-items:flex-start">
      <section style="${CARD};flex:1;min-width:0;overflow:hidden">
        <div style="padding:18px 24px;border-bottom:1px solid ${T.line}">
          <h2 style="margin:0;font-size:16px;font-weight:600;color:${T.text}">${panel.title}</h2>
          <p style="margin:4px 0 0;font-size:13px;color:${T.text2};line-height:1.45">${panel.hint}</p>
        </div>
        ${panel.rows.map((row) => `<div style="display:grid;grid-template-columns:1fr 268px;align-items:center;gap:20px;padding:16px 24px;border-bottom:1px solid ${T.gray50}">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="display:inline-flex;align-items:center;border-radius:6px;background:${T.gray100};padding:1px 6px;font-size:11px;font-weight:600;color:${T.text2};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${row.code}</span>
              <p style="margin:0;font-size:14px;font-weight:500;color:${T.text}">${row.label}</p>
            </div>
            <p style="margin:4px 0 0;font-size:13px;color:${T.text2};line-height:1.45">${row.detail}</p>
          </div>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:12px">
            <span style="flex:1;min-width:0">${row.control}</span>
            ${row.value ? `<span style="width:52px;flex-shrink:0;text-align:right;font-size:15px;font-weight:600;color:${row.muted ? T.text3 : T.text};font-variant-numeric:tabular-nums">${row.value}</span>` : ''}
          </div>
        </div>`).join('')}
        ${footnote(panel.footnote)}
      </section>

      <aside style="display:flex;flex-direction:column;gap:16px;width:380px;flex-shrink:0">
        <section style="${CARD};padding:20px 24px;border-left:4px solid ${T.navy500}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            ${icon('lock', T.navy500, 18)}
            <h3 style="margin:0;font-size:15px;font-weight:600;color:${T.text}">Ce qui ne se règle pas</h3>
          </div>
          <p style="margin:0 0 12px;font-size:13px;color:${T.gray600};line-height:1.55">Les contraintes dures C1 à C8 ne sont jamais relâchées. Aucune option de configuration ne permet de les désactiver.</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              ['C1', 'Aucune affectation en dehors d’une disponibilité déclarée. La variable n’est même pas créée dans le modèle.'],
              ['C4', 'Pas de chevauchement : une personne n’occupe qu’une demi-journée à la fois.'],
              ['C5', 'Seule exception, nominative : deux modalités différentes, même centre, même demi-journée, pour la personne désignée par PARAM-08.'],
              ['C6', 'Les affectations verrouillées sont imposées et conservées à chaque régénération.'],
              ['C8', 'Le plafond mensuel individuel, quand il est défini, n’est jamais dépassé.']
            ].map((rule) => `<div style="display:flex;align-items:flex-start;gap:9px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;flex-shrink:0;margin-top:1px;border-radius:5px;background:${T.navy50};padding:1px 0;font-size:10px;font-weight:700;color:${T.navy500}">${rule[0]}</span>
              <span style="flex:1;min-width:0;font-size:12px;color:${T.gray600};line-height:1.45">${rule[1]}</span>
            </div>`).join('')}
          </div>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 6px;font-size:15px;font-weight:600;color:${T.text}">Exception de double vacation</h3>
          <p style="margin:0 0 14px;font-size:13px;color:${T.text2};line-height:1.45">PARAM-08 désigne une personne, jamais un nom écrit dans le code. Changer de coordinateur ne demande aucune modification.</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[SENIORS[0], SENIORS[1], SENIORS[5], { id: 'none', name: 'Personne', role: 'Exception désactivée' }].map((person) => {
              const on = person.id === 'tp'
              return `<div data-act="toast" data-arg="${esc('Le prototype garde ' + SENIORS[0].name + ' comme bénéficiaire de la double vacation.')}" style="display:flex;align-items:center;gap:10px;border:1px solid ${on ? T.navy300 : T.line};border-radius:10px;background:${on ? T.navy50 : T.surface};padding:9px 11px;cursor:pointer">
                <span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;border:1.5px solid ${on ? T.navy500 : T.gray300};border-radius:999px;background:${T.surface}"><span style="width:8px;height:8px;border-radius:999px;background:${on ? T.navy500 : 'transparent'}"></span></span>
                <span style="flex:1;min-width:0;font-size:13px;font-weight:500;color:${T.text}">${person.name}</span>
                <span style="flex-shrink:0;font-size:12px;color:${T.text3}">${person.role}</span>
              </div>`
            }).join('')}
          </div>
          <p style="margin:12px 0 0;font-size:12px;color:${T.text3};line-height:1.45">Deux centres différents sur la même demi-journée restent interdits pour tout le monde, coordinateur inclus.</p>
        </section>

        <section style="${CARD};padding:20px 24px">
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${T.text}">Centres et modalités</h3>
          <p style="margin:0 0 12px;font-size:13px;color:${T.text2};line-height:1.45">Stockés en base. En ajouter un ne demande ni migration ni modification de code.</p>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
            ${[
              { label: 'Bergère', code: 'BERGERE', color: T.navy500 },
              { label: 'Blomet', code: 'BLOMET', color: T.ok700 },
              { label: 'Lariboisière', code: 'LARIBOISIERE', color: T.warn600 },
              { label: 'IRM cardiaque', code: 'CMR', color: T.gray600 },
              { label: 'Scanner cardiaque', code: 'CCT', color: T.gray600 }
            ].map((item) => `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${T.gray100};border-radius:10px;background:${T.gray25};padding:8px 11px">
              <span style="width:3px;height:20px;flex-shrink:0;border-radius:2px;background:${item.color}"></span>
              <span style="flex:1;min-width:0;font-size:13px;color:${T.text}">${item.label}</span>
              <span style="flex-shrink:0;font-size:11px;color:${T.text3};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${item.code}</span>
              ${badge('Actif', 'success')}
            </div>`).join('')}
          </div>
          ${button({ label: 'Ajouter un centre ou une modalité', variant: 'outline', icon: 'plus', act: 'toast', arg: 'Une nouvelle modalité serait immédiatement disponible à l’import.', style: 'width:100%;font-size:13px' })}
        </section>
      </aside>
    </div>`
}
