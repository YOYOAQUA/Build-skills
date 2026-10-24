/* Renders a report from WAI.analyze() into HTML, plus the 1080x1920 story card. */
(function (root) {
  var W = root.WAI;
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function g(p, m, f) { return p && p.gender === 'f' ? f : m; }
  function num(n) { return Number(n).toLocaleString('he-IL'); }
  function heDate(iso) { return iso ? +iso.slice(8, 10) + '.' + +iso.slice(5, 7) + '.' + iso.slice(0, 4) : ''; }
  function bandClass(band) { return band === 'נמוך' ? 'low' : band === 'בינוני' ? 'mid' : 'high'; }

  function battery(score, band) {
    var full = Math.round(score / 10), cells = '';
    for (var i = 0; i < 10; i++) cells += '<span class="wai-cell' + (i < full ? ' is-on' : '') + '"></span>';
    return '<div class="wai-battery wai-battery--' + bandClass(band) + '" role="img" aria-label="ציון התאוששות ' + score + ' מתוך 100">' + cells + '</div>';
  }

  function hoursChart(hours) {
    var max = Math.max.apply(null, hours) || 1, bars = '', labels = '';
    for (var h = 0; h < 24; h++) {
      var x = 480 - (h + 1) * 20 + 2, hgt = Math.max(2, Math.round(hours[h] / max * 110));
      var night = h >= 23 || h < 6;
      bars += '<rect class="wai-bar' + (night ? ' wai-bar--night' : '') + '" x="' + x + '" y="' + (124 - hgt) + '" width="16" height="' + hgt + '" rx="3"><title>' + (h < 10 ? '0' : '') + h + ':00 · ' + hours[h] + ' הודעות</title></rect>';
      if (h % 6 === 0 || h === 23) labels += '<text x="' + (x + 8) + '" y="144" text-anchor="middle">' + (h < 10 ? '0' : '') + h + ':00</text>';
    }
    return '<svg class="wai-chart" viewBox="-18 0 516 152" role="img" aria-label="ההודעות שלך לפי שעה ביממה">' +
      '<line class="wai-axis" x1="0" x2="480" y1="125" y2="125"/>' + bars + labels + '</svg>';
  }

  function weekdayChart(days) {
    var max = Math.max.apply(null, days) || 1, out = '';
    for (var d = 0; d < 7; d++) {
      var x = 280 - (d + 1) * 40 + 6, hgt = Math.max(2, Math.round(days[d] / max * 70));
      out += '<rect class="wai-bar' + (d === 6 ? ' wai-bar--night' : '') + '" x="' + x + '" y="' + (84 - hgt) + '" width="28" height="' + hgt + '" rx="3"><title>' + DAYS[d] + ' · ' + days[d] + '</title></rect>' +
        '<text x="' + (x + 14) + '" y="102" text-anchor="middle">' + DAYS[d] + '</text>';
    }
    return '<svg class="wai-chart wai-chart--week" viewBox="0 0 280 110" role="img" aria-label="ההודעות שלך לפי יום בשבוע"><line class="wai-axis" x1="0" x2="280" y1="85" y2="85"/>' + out + '</svg>';
  }

  function hbars(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; })) || 1;
    return '<ul class="wai-hbars">' + rows.map(function (r) {
      return '<li><span class="wai-hbars__label">' + esc(r.label) + '</span><span class="wai-hbars__track"><span class="wai-hbars__fill" style="width:' + Math.max(2, r.value / max * 100).toFixed(1) + '%"></span></span><span class="wai-hbars__val">' + esc(r.text) + '</span></li>';
    }).join('') + '</ul>';
  }

  function stat(label, value, note) {
    return '<div class="wai-stat"><span class="wai-stat__val">' + esc(value) + '</span><span class="wai-stat__label">' + esc(label) + '</span>' + (note ? '<span class="wai-stat__note">' + esc(note) + '</span>' : '') + '</div>';
  }

  function section(id, eyebrow, title, lead, body) {
    return '<section class="wai-section" id="wai-' + id + '"><p class="wai-eyebrow">' + esc(eyebrow) + '</p><h3>' + esc(title) + '</h3>' +
      (lead ? '<p class="wai-lead">' + lead + '</p>' : '') + body + '</section>';
  }

  function heroHTML(r, opts) {
    var p = r.profile, a = r.archetype, rec = r.recovery;
    var hl = r.highlights.map(function (h) { return '<li><span class="wai-hl__val">' + esc(h.value) + '</span><span class="wai-hl__label">' + esc(h.label) + '</span></li>'; }).join('');
    return '<section class="wai-hero">' +
      '<div class="wai-hero__main"><p class="wai-eyebrow">' + g(p, 'הארכיטיפ שלך', 'הארכיטיפ שלך') + '</p>' +
      '<h2 class="wai-arch">' + esc(a.name) + '</h2><p class="wai-tagline">' + esc(a.tagline) + '</p>' +
      '<p class="wai-desc">' + esc(a.desc) + '</p>' + evidence(a.evidence) +
      '<p class="wai-secondary">ויש בך גם הרבה <b>' + esc(a.secondary.name) + '</b></p></div>' +
      '<div class="wai-hero__score"><p class="wai-eyebrow">ציון התאוששות דיגיטלית</p>' +
      '<p class="wai-score"><span class="wai-score__num">' + rec.score + '</span><span class="wai-score__of">/100</span></p>' +
      battery(rec.score, rec.band) + '<span class="wai-chip wai-chip--' + bandClass(rec.band) + '">' + esc(rec.band) + '</span></div>' +
      '<ul class="wai-hl">' + hl + '</ul>' +
      (opts.compact ? '' : '<div class="wai-actions"><button type="button" class="wai-btn wai-btn--primary" data-wai="share">שיתוף הכרטיס לסטורי</button><button type="button" class="wai-btn" data-wai="download">הורדת הכרטיס</button></div>') +
      '</section>';
  }

  function rhythmHTML(r) {
    var p = r.profile, rec = r.recovery, peak = r.rhythm.peakHour;
    var drains = [
      { k: 'night', t: 'הודעות בלילה (23:00-06:00)' }, { k: 'fast', t: 'תשובות תוך 2 דקות' },
      { k: 'late', t: 'לילות ער אחרי חצות' }, { k: 'sat', t: 'וואטסאפ בשבת' }
    ].map(function (d) { return { t: d.t, v: rec.penalties[d.k] }; }).sort(function (a, b) { return b.v - a.v; })
      .map(function (d) { return '<li><span>' + esc(d.t) + '</span><b dir="ltr">' + (d.v ? '-' + Math.round(d.v) : '0') + '</b></li>'; }).join('');
    var body = '<div class="wai-grid wai-grid--chart">' +
      '<figure class="wai-figure">' + hoursChart(r.rhythm.hours) + '<figcaption>ההודעות שלך לפי שעה. מודגש: שעות הלילה.</figcaption></figure>' +
      '<figure class="wai-figure">' + weekdayChart(r.rhythm.weekdays) + '<figcaption>לפי יום בשבוע. מודגש: שבת.</figcaption></figure></div>' +
      '<div class="wai-stats">' +
      stat('מההודעות שלך בלילה', W.pct(rec.nightShare)) +
      stat('לילות בשבוע אחרי חצות', rec.lateDaysPerWeek.toFixed(1)) +
      stat('זמן תגובה חציוני', W.fmtMinutes(rec.myMedianReply)) +
      stat('מהתשובות תוך 2 דקות', W.pct(rec.fastShare)) + '</div>' +
      '<div class="wai-drains"><p class="wai-drains__title">מה מוריד לך את הציון</p><ul>' + drains + '</ul></div>';
    return section('rhythm', 'קצב', g(p, 'מתי הטלפון שלך עובד', 'מתי הטלפון שלך עובד'),
      'השעה הכי עמוסה שלך: <b>' + (peak < 10 ? '0' : '') + peak + ':00</b>. ' + W.pct(rec.nightShare) + ' מההודעות שלך יוצאות בלילה.', body);
  }

  function circleHTML(r, ai) {
    var p = r.profile, c = r.circle;
    var rows = c.chats.map(function (ch) {
      var energy = ch.energy ? '<span class="wai-chip wai-chip--' + (ch.energy === 'מטעין' ? 'high' : ch.energy === 'מרוקן' ? 'low' : 'neutral') + '">' + esc(ch.energy) + '</span>' : '';
      var starts = ch.startsByMe + ch.startsByThem;
      return '<tr><th scope="row">' + esc(ch.name) + (ch.type === 'group' ? ' <span class="wai-tag">קבוצה</span>' : '') + '</th>' +
        '<td>' + num(ch.total) + '</td><td>' + W.pct(ch.myShare) + '</td><td>' + (starts ? W.pct(ch.startsByMe / starts) : '-') + '</td>' +
        '<td>' + W.fmtMinutes(ch.myMedianReply) + '</td><td>' + W.fmtMinutes(ch.theirMedianReply) + '</td><td>' + energy + '</td></tr>';
    }).join('');
    var table = '<div class="wai-table-wrap"><table class="wai-table"><thead><tr><th scope="col">צ׳אט</th><th scope="col">הודעות</th><th scope="col">שלך</th><th scope="col">' + g(p, 'אתה פותח', 'את פותחת') + '</th><th scope="col">' + g(p, 'אתה עונה תוך', 'את עונה תוך') + '</th><th scope="col">עונים לך תוך</th><th scope="col">אנרגיה</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    function people(list, kind) {
      if (!list.length) return '<p class="wai-muted">אין מספיק הודעות כדי לקבוע.</p>';
      return '<ul class="wai-people">' + list.map(function (x) {
        var note = kind === 'charge' ? W.pct(x.posShare) + ' מההודעות חיוביות' : W.pct(x.negShare) + ' מההודעות תלונות או לחץ';
        return '<li><b>' + esc(x.name) + '</b><span>' + note + '</span></li>';
      }).join('') + '</ul>';
    }
    var energy = '<div class="wai-grid wai-grid--two"><div class="wai-card wai-card--charge"><p class="wai-card__title">מי מטעין אותך</p>' + people(c.chargers, 'charge') + '</div>' +
      '<div class="wai-card wai-card--drain"><p class="wai-card__title">מי מרוקן אותך</p>' + people(c.drainers, 'drain') + '</div></div>';
    var roles = ai && ai.circle && ai.circle.length ? '<p class="wai-subhead">' + g(p, 'מה כל אחד נותן לך', 'מה כל אחד נותן לך') + '</p><ul class="wai-people">' + ai.circle.map(function (x) {
      return '<li><b>' + esc(x.name) + '</b><span class="wai-chip wai-chip--neutral">' + esc(x.role) + '</span><span>' + esc(x.why) + '</span></li>';
    }).join('') + '</ul>' : '';
    return section('circle', 'מעגל', g(p, 'עם מי אתה באמת מדבר', 'עם מי את באמת מדברת'),
      'את <b>' + W.pct(c.initShare) + '</b> מהשיחות ' + g(p, 'אתה פותח', 'את פותחת') + '. שלחת ' + c.supportGiven + ' הודעות תמיכה וקיבלת ' + c.supportReceived + '.', energy + roles + table);
  }

  function contentHTML(r) {
    var p = r.profile, top = r.content.topics.filter(function (t) { return t.share > 0; });
    var body = top.length ? hbars(top.map(function (t) { return { label: t.label, value: t.share, text: W.pct(t.share) }; }))
      : '<p class="wai-muted">לא זוהו נושאים בולטים.</p>';
    return section('content', 'תוכן', g(p, 'על מה אתה מדבר', 'על מה את מדברת'),
      top.length ? 'הנושא הכי נוכח אצלך: <b>' + esc(top[0].label) + '</b>, ב-' + W.pct(top[0].share) + ' מההודעות שלך.' : '', body);
  }

  function languageHTML(r) {
    var p = r.profile, L = r.language;
    var lim = L.limiting.length ? '<ul class="wai-limits">' + L.limiting.map(function (l) {
      return '<li><div class="wai-limits__head"><b>"' + esc(l.term) + '"</b><span class="wai-count">' + W.times(l.count) + '</span></div>' +
        (l.examples[0] ? '<q>' + esc(l.examples[0]) + '</q>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="wai-muted">לא נמצאו משפטים מגבילים חוזרים. יפה.</p>';
    var body = '<div class="wai-stats">' + stat('הודעות חיוביות', W.pct(L.positive)) + stat('הודעות שליליות', W.pct(L.negative)) +
      stat('הודעות על העתיד', W.pct(L.future)) + stat('הודעות על העבר', W.pct(L.past)) + stat('הודעות עם תודה', W.pct(L.gratitude)) + '</div>' +
      '<p class="wai-subhead">המשפטים שחוזרים אצלך</p>' + lim;
    return section('language', 'שפה', g(p, 'איך אתה מדבר', 'איך את מדברת'),
      (L.negative ? 'על כל הודעה שלילית שלך יש <b>' + (L.positive / L.negative).toFixed(1) + '</b> הודעות חיוביות. בקשרים יציבים היחס הוא לפחות 5 ל-1.' : 'כמעט אין אצלך הודעות שליליות. ' + W.pct(L.positive) + ' מההודעות שלך חיוביות.'), body);
  }

  function coreHTML(r) {
    var p = r.profile, c = r.core;
    var rows = [
      { label: 'תשוקה', value: c.passion }, { label: 'משמעות', value: c.meaning },
      { label: 'עשייה מחוץ לעבודה', value: c.outsideWork }, { label: 'יצירתיות', value: c.creativity }
    ].map(function (x) { return { label: x.label, value: x.value, text: (x.value * 100).toFixed(1) + ' ל-100' }; });
    return section('core', 'תשוקה ומשמעות', g(p, 'מה מדליק אותך', 'מה מדליק אותך'),
      'כמה פעמים מכל 100 הודעות שלך מופיעות מילים של תשוקה, משמעות, עשייה ויצירה.', hbars(rows));
  }

  function lensHTML(r) {
    if (!r.lens.items.length) return '';
    var cards = r.lens.items.map(function (i) {
      return '<div class="wai-card"><p class="wai-card__title">' + esc(i.title) + '</p><p class="wai-card__val">' + esc(i.value) + '</p><p>' + esc(i.text) + '</p></div>';
    }).join('');
    return section('lens', 'העדשה שלך', r.lens.title.replace('העדשה שלך: ', ''), '', '<div class="wai-grid wai-grid--cards">' + cards + '</div>');
  }

  function directionHTML(r, opts) {
    var link = (opts.links && opts.links[r.cta.key]) || '#', lens = opts.ai && opts.ai.lens;
    return section('direction', 'כיוון', r.pattern.title, esc(r.pattern.body),
      (lens && lens.title ? '<div class="wai-card wai-card--ai"><p class="wai-card__title">' + esc(lens.title) + '</p><p>' + esc(lens.body) + '</p></div>' : '') +
      '<div class="wai-grid wai-grid--two"><div class="wai-card"><p class="wai-card__title">הצד השני של ' + esc(r.archetype.name) + '</p><p>' + esc(r.archetype.shadow) + '</p></div>' +
      '<div class="wai-card wai-card--step"><p class="wai-card__title">צעד אחד לשבוע הקרוב</p><p>' + esc(r.nextStep) + '</p></div></div>' +
      '<aside class="wai-cta"><div><p class="wai-cta__title">' + esc(r.cta.title) + '</p><p>' + esc(r.cta.text) + '</p></div>' +
      '<a class="wai-btn wai-btn--primary" href="' + esc(link) + '" target="_blank" rel="noopener">לפרטים</a></aside>');
  }

  // ---------- personality (Claude's reading in insights.json + the numbers from summary.json) ----------

  var BIG5 = [
    { key: 'openness', title: 'סקרנות ופתיחות', low: 'מוכר ויציב', high: 'סקרנות וחידוש' },
    { key: 'conscientiousness', title: 'סדר ואחריות', low: 'ספונטניות', high: 'סדר ואחריות' },
    { key: 'extraversion', title: 'מוחצנות', low: 'שקט ופנימיות', high: 'חברתיות ויוזמה' },
    { key: 'agreeableness', title: 'חום והתחשבות', low: 'ישירות', high: 'חום והתחשבות' },
    { key: 'stability', title: 'יציבות רגשית', low: 'רגישות ותגובתיות', high: 'רוגע ויציבות' }
  ];
  var LOVE_LABELS = { words: 'מילים טובות', time: 'זמן ביחד', service: 'עזרה מעשית', gifts: 'מתנות והפתעות', presence: 'מגע ונוכחות' };

  function evidence(e) {
    if (!e) return '';
    return '<p class="wai-evidence">' + esc([].concat(e).join(' · ')) + '</p>';
  }
  function card(title, body, ev, extra) {
    return '<div class="wai-card"><p class="wai-card__title">' + esc(title) + '</p>' + (extra || '') + (body ? '<p>' + esc(body) + '</p>' : '') + evidence(ev) + '</div>';
  }
  function P(opts) { return (opts.summary && opts.summary.personality) || null; }

  function scale(score) {
    var cells = '';
    for (var i = 1; i <= 5; i++) cells += '<span class="wai-scale__cell' + (i === score ? ' is-on' : i < score ? ' is-past' : '') + '"></span>';
    return '<span class="wai-scale__cells" role="img" aria-label="' + score + ' מתוך 5">' + cells + '</span>';
  }

  function bigFiveHTML(ai, r, opts) {
    if (!ai.bigFive || !ai.bigFive.length) return '';
    var byKey = {};
    ai.bigFive.forEach(function (b) { byKey[b.trait] = b; });
    var rows = BIG5.filter(function (t) { return byKey[t.key]; }).map(function (t) {
      var b = byKey[t.key], sc = Math.max(1, Math.min(5, Math.round(+b.score || 3)));
      return '<li class="wai-trait"><div class="wai-trait__head"><b>' + esc(t.title) + '</b>' + scale(sc) + '</div>' +
        '<div class="wai-scale__ends"><span>' + esc(t.low) + '</span><span>' + esc(t.high) + '</span></div>' +
        (b.body ? '<p>' + esc(b.body) + '</p>' : '') + evidence(b.evidence) + '</li>';
    }).join('');
    var st = P(opts) && P(opts).style, stats = '';
    if (st) {
      stats = '<div class="wai-stats">' + stat('מההודעות שלך עם שאלה', W.pct(st.question)) + stat('מילים בהודעה, בממוצע', String(st.avgWords)) +
        stat('עם אימוג׳י', W.pct(st.emoji)) + stat('עם "אני"', W.pct(st.i)) + stat('עם "אנחנו"', W.pct(st.we)) + '</div>';
    }
    return section('personality', 'אישיות', g(r.profile, 'חמשת הממדים שלך', 'חמשת הממדים שלך'),
      'המודל המחקרי המוכר ביותר לאישיות, כפי שהוא נשמע בהודעות שלך. כל ממד הוא סקאלה, לא תווית.', stats + '<ul class="wai-traits">' + rows + '</ul>');
  }

  function facesHTML(ai, r) {
    if (!ai.faces || !ai.faces.length) return '';
    var cards = ai.faces.map(function (f) {
      var extra = (f.tone ? '<span class="wai-chip wai-chip--neutral">' + esc(f.tone) + '</span>' : '') + (f.chats ? '<p class="wai-meta">' + esc(f.chats) + '</p>' : '');
      return card(f.context, f.body, f.evidence, extra);
    }).join('');
    return section('faces', 'הפרצופים שלך', g(r.profile, 'אותו אדם, כמה פרצופים', 'אותה אישה, כמה פרצופים'),
      'איך הטון, האורך והמהירות שלך משתנים מעולם לעולם.', '<div class="wai-grid wai-grid--cards">' + cards + '</div>');
  }

  function relationshipHTML(ai, r, opts) {
    var rel = P(opts) && P(opts).relationship, a = ai.relationship, p = r.profile;
    if (!a && !rel) return '';
    var stats = rel ? '<div class="wai-stats">' + stat(g(p, 'מהשיחות האישיות אתה פותח', 'מהשיחות האישיות את פותחת'), W.pct(rel.initShare)) +
      stat(g(p, 'מהשיחות נגמרות במילה שלך', 'מהשיחות נגמרות במילה שלך'), W.pct(rel.lastWordShare)) +
      stat(g(p, 'פעמים כתבת שוב כשלא ענו לך', 'פעמים כתבת שוב כשלא ענו לך'), String(rel.followUps)) +
      stat('עונים לך תוך', W.fmtMinutes(rel.theirMedianReplyMin), g(p, 'ואתה עונה תוך ', 'ואת עונה תוך ') + W.fmtMinutes(rel.myMedianReplyMin)) + '</div>' : '';
    var body = a ? card(a.title || 'הדפוס שלך', a.body, a.evidence) + (a.whenUnanswered ? card('כשלא עונים לך', a.whenUnanswered) : '') : '';
    return section('relationship', 'סגנון קשר', g(p, 'איך אתה מתקרב ומתרחק', 'איך את מתקרבת ומתרחקת'),
      'מי יוזם, מי מחכה, ומה קורה כשהצד השני שותק. רק בשיחות אחד על אחד.', stats + '<div class="wai-grid wai-grid--two">' + body + '</div>');
  }

  function loveHTML(ai, r, opts) {
    var love = P(opts) && P(opts).love, a = ai.love, p = r.profile;
    if (!a && !love) return '';
    var bars = love ? hbars(Object.keys(LOVE_LABELS).map(function (k) {
      return { label: LOVE_LABELS[k], value: love[k] ? love[k].per1000 : 0, text: (love[k] ? love[k].per1000 : 0) + ' ל-1,000' };
    })) : '';
    var body = a ? '<div class="wai-grid wai-grid--two">' + card(g(p, 'איך אתה נותן', 'איך את נותנת'), a.body, a.evidence) +
      (a.ask ? card(g(p, 'ומה אתה מבקש', 'ומה את מבקשת'), a.ask) : '') + '</div>' : '';
    return section('love', 'אהבה', g(p, 'איך אתה נותן אהבה', 'איך את נותנת אהבה'),
      'חמש דרכים לתת אהבה, כמה פעמים מכל 1,000 הודעות אישיות שלך.', bars + body);
  }

  function valuesHTML(ai, r, opts) {
    var v = ai.values, topics = P(opts) && P(opts).topics, p = r.profile;
    if (!v) return '';
    var tops = (v.top || []).map(function (x) { return card(x.value, x.why, x.evidence); }).join('');
    var reality = topics ? hbars(Object.keys(topics).filter(function (k) { return k !== 'logistics' && topics[k].share > 0; })
      .sort(function (a, b) { return topics[b].share - topics[a].share; })
      .map(function (k) { return { label: topics[k].label, value: topics[k].share, text: W.pct(topics[k].share) }; })) : '';
    return section('values', 'ערכים', g(p, 'מה חשוב לך, ואיפה אתה באמת נמצא', 'מה חשוב לך, ואיפה את באמת נמצאת'), '',
      '<div class="wai-grid wai-grid--cards">' + tops + '</div>' +
      '<p class="wai-subhead">איפה ההודעות שלך באמת הולכות</p>' + reality + (v.reality ? '<p>' + esc(v.reality) + '</p>' : '') +
      (v.gap ? '<div class="wai-card wai-card--step"><p class="wai-card__title">הפער</p><p>' + esc(v.gap) + '</p></div>' : ''));
  }

  function innerVoiceHTML(ai, r) {
    var v = ai.innerVoice, p = r.profile;
    if (!v) return '';
    var phrases = r.language.limiting.slice(0, 6).map(function (l) {
      return '<span class="wai-chip wai-chip--neutral">"' + esc(l.term) + '" · ' + W.times(l.count) + '</span>';
    }).join(' ');
    var beliefs = (v.beliefs || []).length ? '<ul class="wai-beliefs">' + v.beliefs.map(function (b) {
      return '<li><b>' + esc(b.belief) + '</b>' + (b.evidence ? '<span class="wai-evidence">' + esc(b.evidence) + '</span>' : '') + (b.reframe ? '<span class="wai-reframe">' + esc(b.reframe) + '</span>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    return section('voice', 'הקול הפנימי', v.tone ? g(p, 'הקול שלך: ', 'הקול שלך: ') + v.tone : g(p, 'איך אתה מדבר אל עצמך', 'איך את מדברת אל עצמך'),
      esc(v.body || ''), (phrases ? '<p class="wai-subhead">המשפטים שחוזרים</p><p class="wai-chips">' + phrases + '</p>' : '') +
      (beliefs ? '<p class="wai-subhead">אמונות, ומה אפשר להגיד במקום</p>' + beliefs : ''));
  }

  function groupsHTML(ai, r, opts) {
    var roles = ai.groups, list = P(opts) && P(opts).groups, p = r.profile;
    if (!roles || !roles.length) return '';
    var cards = roles.map(function (x) { return card(x.role, x.body, x.evidence, x.where ? '<p class="wai-meta">' + esc(x.where) + '</p>' : ''); }).join('');
    var table = list && list.length ? '<div class="wai-table-wrap"><table class="wai-table"><thead><tr><th scope="col">קבוצה</th><th scope="col">ההודעות שלך</th><th scope="col">' +
      g(p, 'אתה פותח', 'את פותחת') + '</th><th scope="col">לוגיסטיקה</th><th scope="col">צחוק</th><th scope="col">פרגון</th></tr></thead><tbody>' +
      list.slice(0, 6).map(function (x) {
        return '<tr><th scope="row">' + esc(x.name) + '</th><td>' + num(x.mine) + '</td><td>' + W.pct(x.opensShare) + '</td><td>' + W.pct(x.logistics) + '</td><td>' + W.pct(x.laugh) + '</td><td>' + W.pct(x.praise) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '';
    return section('groups', 'בקבוצות', g(p, 'מה אתה מביא לכל קבוצה', 'מה את מביאה לכל קבוצה'), '', '<div class="wai-grid wai-grid--cards">' + cards + '</div>' + table);
  }

  var MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  function monthName(key) { return key ? MONTHS[+key.slice(5, 7) - 1] + ' ' + key.slice(2, 4) : ''; }

  function yearChart(months) {
    var n = months.length, w = 480 / n, maxMine = Math.max.apply(null, months.map(function (m) { return m.mine; })) || 1;
    var moods = months.map(function (m) { return m.mood; }), lo = Math.min.apply(null, moods), hi = Math.max.apply(null, moods);
    var span = hi - lo || 1, bars = '', pts = [], labels = '';
    months.forEach(function (m, i) {
      var x = 480 - (i + 1) * w, hgt = Math.max(2, Math.round(m.mine / maxMine * 60));
      bars += '<rect class="wai-bar" x="' + (x + 3).toFixed(1) + '" y="' + (130 - hgt) + '" width="' + Math.max(2, w - 6).toFixed(1) + '" height="' + hgt + '" rx="2"><title>' + monthName(m.month) + ' · ' + m.mine + ' הודעות</title></rect>';
      pts.push((x + w / 2).toFixed(1) + ',' + (20 + (1 - (m.mood - lo) / span) * 70).toFixed(1));
      if (n <= 7 || i % 2 === 0) labels += '<text x="' + (x + w / 2).toFixed(1) + '" y="146" text-anchor="middle">' + monthName(m.month) + '</text>';
    });
    var dots = pts.map(function (pt) { var xy = pt.split(','); return '<circle class="wai-mood__dot" cx="' + xy[0] + '" cy="' + xy[1] + '" r="3.5"/>'; }).join('');
    return '<svg class="wai-chart" viewBox="0 0 480 152" role="img" aria-label="מצב הרוח וכמות ההודעות לפי חודש">' +
      '<line class="wai-axis" x1="0" x2="480" y1="131" y2="131"/>' + bars + '<polyline class="wai-mood" points="' + pts.join(' ') + '"/>' + dots + labels + '</svg>';
  }

  function yearHTML(ai, r, opts) {
    var months = P(opts) && P(opts).monthly, y = ai.yearWave, p = r.profile;
    if (!y && !(months && months.length > 2)) return '';
    var chart = months && months.length > 2 ? '<figure class="wai-figure">' + yearChart(months) + '<figcaption>הקו: מצב הרוח בהודעות שלך (מילים טובות פחות מילים קשות). העמודות: כמה כתבת.</figcaption></figure>' : '';
    var cards = y ? '<div class="wai-grid wai-grid--two">' + (y.high ? card('השיא: ' + monthName(y.high.month), y.high.why) : '') + (y.low ? card('השפל: ' + monthName(y.low.month), y.low.why) : '') + '</div>' : '';
    return section('year', 'השנה שלך', g(p, 'השנה שלך כגל', 'השנה שלך כגל'), y ? esc(y.body || '') : '', chart + cards);
  }

  // Claude's archetype replaces the counting guess, in the hero and on the story card.
  function withArchetype(r, ai) {
    var a = ai && ai.archetype, info = a && W.archetypeInfo && W.archetypeInfo(a.primary, r.profile);
    if (!info) return r.archetype;
    var second = a.secondary && W.archetypeInfo(a.secondary, r.profile);
    info.tagline = a.tagline || info.tagline;
    info.desc = a.why || info.desc;
    info.evidence = a.evidence;
    info.secondary = second ? { key: second.key, name: second.name } : r.archetype.secondary;
    return info;
  }

  function distressHTML() {
    return '<aside class="wai-care" role="note"><p><b>רגע לפני הכל.</b> חלק מההודעות שלך נשמעות כבדות. אם קשה עכשיו, לא צריך להתמודד עם זה לבד.</p>' +
      '<p>ער״ן, עזרה ראשונה נפשית, זמינים 24/7 בטלפון <b class="wai-select">1201</b> ובצ׳אט באתר ער״ן.</p></aside>';
  }

  function render(el, report, opts) {
    opts = opts || {};
    var r = report, m = r.meta, ai = opts.ai, distress = r.distress || (ai && ai.distress);
    r.archetype = withArchetype(r, ai);
    if (ai && ai.pattern) r.pattern = ai.pattern;
    if (ai && ai.nextStep) r.nextStep = ai.nextStep;
    var meta = '<p class="wai-meta">נותחו ' + num(m.total) + ' הודעות ב-' + m.chats + ' צ׳אטים, ' + heDate(m.from) + ' עד ' + heDate(m.to) + '. ' + num(m.mine) + ' מהן שלך.</p>';
    if (opts.compact) {
      el.innerHTML = '<div class="wai-report wai-report--compact">' + heroHTML(r, opts) + rhythmHTML(r) + '</div>';
      return;
    }
    var body = ai
      ? bigFiveHTML(ai, r, opts) + facesHTML(ai, r) + relationshipHTML(ai, r, opts) + loveHTML(ai, r, opts) + valuesHTML(ai, r, opts) +
        innerVoiceHTML(ai, r) + groupsHTML(ai, r, opts) + yearHTML(ai, r, opts) + rhythmHTML(r) + circleHTML(r, ai) + directionHTML(r, opts)
      : rhythmHTML(r) + circleHTML(r) + contentHTML(r) + languageHTML(r) + coreHTML(r) + lensHTML(r) + directionHTML(r, opts);
    el.innerHTML = '<div class="wai-report">' + (distress ? distressHTML() : '') + meta + heroHTML(r, opts) + body +
      '<footer class="wai-foot"><p>זו מראה, לא אבחון. המספרים נספרים ממילים ושעות, והפרשנות שלך.</p><p>אם קשה לך, ער״ן זמינים 24/7 בטלפון <span class="wai-select">1201</span>.</p></footer></div>';
    el.querySelectorAll('[data-wai]').forEach(function (b) {
      b.addEventListener('click', function () { shareCard(r, opts, b.getAttribute('data-wai'), b); });
    });
  }

  // ---------- story card ----------

  // The card draws with the page's own fonts (the --font-* variables), so a page that swaps fonts swaps them here too.
  function cardFonts() {
    var css = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
    var pick = function (name, fallback) { return (css && css.getPropertyValue(name).trim()) || fallback; };
    return {
      body: pick('--font-body', '"IBM Plex Sans Hebrew", "Heebo", Arial, sans-serif'),
      disp: pick('--font-display', '"Karantina", "IBM Plex Sans Hebrew", Arial, sans-serif')
    };
  }

  // Shrinks the font until the text fits the card's width.
  function fitFont(x, text, weight, size, family, maxWidth) {
    x.font = weight + ' ' + size + 'px ' + family;
    while (size > 40 && x.measureText(text).width > maxWidth) {
      size -= 6;
      x.font = weight + ' ' + size + 'px ' + family;
    }
  }

  function cardCanvas(r, opts) {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1920;
    var x = c.getContext('2d');
    // Yoav's palette: plum background, cream text, powder blue for the quiet parts.
    var plum = '#4A414A', cream = '#F6EAD0', sky = '#BFCFDD', dim = '#625661';
    x.fillStyle = plum; x.fillRect(0, 0, 1080, 1920);
    x.fillStyle = sky; x.fillRect(0, 0, 1080, 18);
    x.direction = 'rtl'; x.textAlign = 'right';
    var fonts = cardFonts(), R = 990, body = fonts.body, disp = fonts.disp;
    x.fillStyle = sky; x.font = '500 44px ' + body;
    x.fillText('מה הוואטסאפ שלי יודע עליי', R, 170);
    x.fillStyle = cream; fitFont(x, r.archetype.name, 900, 200, disp, 900);
    x.fillText(r.archetype.name, R, 420);
    fitFont(x, r.archetype.tagline, 400, 52, body, 900);
    x.fillText(r.archetype.tagline, R, 510);
    x.fillStyle = sky; x.font = '500 44px ' + body;
    x.fillText('ציון התאוששות דיגיטלית', R, 700);
    x.direction = 'ltr';
    x.fillStyle = sky; x.font = '700 110px ' + disp;
    x.fillText('/100', R, 960);
    var w = x.measureText('/100').width;
    x.fillStyle = cream; x.font = '700 300px ' + disp;
    x.fillText(String(r.recovery.score), R - w - 12, 960);
    x.direction = 'rtl';
    var full = Math.round(r.recovery.score / 10);
    for (var i = 0; i < 10; i++) {
      x.fillStyle = i < full ? sky : dim;
      x.fillRect(R - (i + 1) * 90 + 10, 1010, 74, 44);
    }
    x.strokeStyle = dim; x.lineWidth = 2;
    r.highlights.forEach(function (h, k) {
      var y = 1240 + k * 170;
      x.beginPath(); x.moveTo(90, y - 110); x.lineTo(990, y - 110); x.stroke();
      x.fillStyle = cream; fitFont(x, h.value, 700, 120, disp, 500);
      x.fillText(h.value, R, y);
      x.fillStyle = sky; x.font = '500 42px ' + body;
      x.textAlign = 'left'; x.fillText(h.label, 90, y - 20); x.textAlign = 'right';
    });
    x.fillStyle = cream; x.font = '500 46px ' + body;
    x.fillText('בדקו מה הוואטסאפ שלכם יודע עליכם', R, 1760);
    x.fillStyle = sky; x.font = '700 46px ' + body;
    x.fillText(opts.siteUrl || '', R, 1830);
    return c;
  }

  function shareCard(r, opts, mode, btn) {
    var f = cardFonts();
    var fonts = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('700 230px ' + f.disp), document.fonts.load('500 44px ' + f.body)
    ]).catch(function () {}) : Promise.resolve();
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'מכין את הכרטיס...';
    fonts.then(function () {
      var canvas = cardCanvas(r, opts);
      canvas.toBlob(function (blob) {
        btn.disabled = false; btn.textContent = label;
        if (!blob) return;
        var file = new File([blob], 'whatsapp-card.png', { type: 'image/png' });
        var fallback = function () {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'whatsapp-card.png';
          document.body.appendChild(a); a.click(); a.remove();
          var preview = document.querySelector('[data-wai-card-preview]');
          if (preview) {
            preview.src = url;
            var box = preview.closest('[hidden]');
            if (box) box.hidden = false;
            preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
        if (mode === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'מה הוואטסאפ שלי יודע עליי' }).catch(function (e) {
            if (!e || e.name !== 'AbortError') fallback();
          });
          return;
        }
        fallback();
      }, 'image/png');
    });
  }

  W.renderDashboard = render;
  W.cardCanvas = cardCanvas;
})(typeof window !== 'undefined' ? window : globalThis);
