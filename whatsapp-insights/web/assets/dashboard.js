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
      '<div class="wai-hero__main"><p class="wai-eyebrow">' + g(p, 'הטיפוס שלך בוואטסאפ', 'הטיפוס שלך בוואטסאפ') + '</p>' +
      '<h2 class="wai-arch">' + esc(a.name) + '</h2><p class="wai-tagline">' + esc(a.tagline) + '</p>' +
      '<p class="wai-desc">' + esc(a.desc) + '</p><p class="wai-secondary">ויש בך גם קצת <b>' + esc(a.secondary.name) + '</b></p></div>' +
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
      '<figure class="wai-figure">' + hoursChart(r.rhythm.hours) + '<figcaption>ההודעות שלך לפי שעה. בכתום: שעות הלילה.</figcaption></figure>' +
      '<figure class="wai-figure">' + weekdayChart(r.rhythm.weekdays) + '<figcaption>לפי יום בשבוע. בכתום: שבת.</figcaption></figure></div>' +
      '<div class="wai-stats">' +
      stat('מההודעות שלך בלילה', W.pct(rec.nightShare)) +
      stat('לילות בשבוע אחרי חצות', rec.lateDaysPerWeek.toFixed(1)) +
      stat('זמן תגובה חציוני', W.fmtMinutes(rec.myMedianReply)) +
      stat('מהתשובות תוך 2 דקות', W.pct(rec.fastShare)) + '</div>' +
      '<div class="wai-drains"><p class="wai-drains__title">מה מוריד לך את הציון</p><ul>' + drains + '</ul></div>';
    return section('rhythm', 'קצב', g(p, 'מתי הטלפון שלך עובד', 'מתי הטלפון שלך עובד'),
      'השעה הכי עמוסה שלך: <b>' + (peak < 10 ? '0' : '') + peak + ':00</b>. ' + W.pct(rec.nightShare) + ' מההודעות שלך יוצאות בלילה.', body);
  }

  function circleHTML(r) {
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
    return section('circle', 'מעגל', g(p, 'עם מי אתה באמת מדבר', 'עם מי את באמת מדברת'),
      'את <b>' + W.pct(c.initShare) + '</b> מהשיחות ' + g(p, 'אתה פותח', 'את פותחת') + '. שלחת ' + c.supportGiven + ' הודעות תמיכה וקיבלת ' + c.supportReceived + '.', energy + table);
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
    var link = (opts.links && opts.links[r.cta.key]) || '#';
    return section('direction', 'כיוון', r.pattern.title, esc(r.pattern.body),
      '<div class="wai-grid wai-grid--two"><div class="wai-card"><p class="wai-card__title">הצד השני של המטבע</p><p>' + esc(r.archetype.shadow) + '</p></div>' +
      '<div class="wai-card wai-card--step"><p class="wai-card__title">צעד אחד לשבוע הקרוב</p><p>' + esc(r.nextStep) + '</p></div></div>' +
      '<aside class="wai-cta"><div><p class="wai-cta__title">' + esc(r.cta.title) + '</p><p>' + esc(r.cta.text) + '</p></div>' +
      '<a class="wai-btn wai-btn--primary" href="' + esc(link) + '" target="_blank" rel="noopener">לפרטים</a></aside>');
  }

  function aiHTML(ai, r) {
    if (!ai) return '';
    var p = r.profile, out = '';
    if (ai.pattern) out += '<div class="wai-card wai-card--ai"><p class="wai-card__title">' + esc(ai.pattern.title) + '</p><p>' + esc(ai.pattern.body) + '</p></div>';
    if (ai.insights && ai.insights.length) out += '<div class="wai-grid wai-grid--cards">' + ai.insights.map(function (i) {
      return '<div class="wai-card"><span class="wai-tag">' + esc(i.layer) + '</span><p class="wai-card__title">' + esc(i.title) + '</p><p>' + esc(i.body) + '</p>' + (i.evidence ? '<p class="wai-evidence">' + esc(i.evidence) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
    if (ai.limitingBeliefs && ai.limitingBeliefs.length) out += '<p class="wai-subhead">אמונות מגבילות</p><ul class="wai-beliefs">' + ai.limitingBeliefs.map(function (b) {
      return '<li><b>' + esc(b.belief) + '</b>' + (b.evidence ? '<span class="wai-evidence">' + esc(b.evidence) + '</span>' : '') + (b.reframe ? '<span class="wai-reframe">' + esc(b.reframe) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
    if (ai.circle && ai.circle.length) out += '<p class="wai-subhead">המעגל שלך</p><ul class="wai-people">' + ai.circle.map(function (c) {
      return '<li><b>' + esc(c.name) + '</b><span class="wai-chip wai-chip--neutral">' + esc(c.role) + '</span><span>' + esc(c.why) + '</span></li>';
    }).join('') + '</ul>';
    if (ai.lens) out += '<div class="wai-card"><p class="wai-card__title">' + esc(ai.lens.title) + '</p><p>' + esc(ai.lens.body) + '</p></div>';
    if (ai.nextStep) out += '<div class="wai-card wai-card--step"><p class="wai-card__title">הצעד שלך</p><p>' + esc(ai.nextStep) + '</p></div>';
    return section('ai', 'ניתוח עומק', g(p, 'מה Claude ראה בשיחות שלך', 'מה Claude ראה בשיחות שלך'), 'ניתוח של דגימה מההודעות שלך, שנעשה ב-Claude שלך.', out);
  }

  function distressHTML() {
    return '<aside class="wai-care" role="note"><p><b>רגע לפני הכל.</b> חלק מההודעות שלך נשמעות כבדות. אם קשה עכשיו, לא צריך להתמודד עם זה לבד.</p>' +
      '<p>ער״ן, עזרה ראשונה נפשית, זמינים 24/7 בטלפון <b class="wai-select">1201</b> ובצ׳אט באתר ער״ן.</p></aside>';
  }

  function render(el, report, opts) {
    opts = opts || {};
    var r = report, m = r.meta, distress = r.distress || (opts.ai && opts.ai.distress);
    var meta = '<p class="wai-meta">נותחו ' + num(m.total) + ' הודעות ב-' + m.chats + ' צ׳אטים, ' + heDate(m.from) + ' עד ' + heDate(m.to) + '. ' + num(m.mine) + ' מהן שלך.</p>';
    if (opts.compact) {
      el.innerHTML = '<div class="wai-report wai-report--compact">' + heroHTML(r, opts) + rhythmHTML(r) + '</div>';
      return;
    }
    el.innerHTML = '<div class="wai-report">' + (distress ? distressHTML() : '') + meta + heroHTML(r, opts) + aiHTML(opts.ai, r) +
      rhythmHTML(r) + circleHTML(r) + contentHTML(r) + languageHTML(r) + coreHTML(r) + lensHTML(r) + directionHTML(r, opts) +
      '<footer class="wai-foot"><p>זו מראה, לא אבחון. המספרים נספרים ממילים ושעות, והפרשנות שלך.</p><p>אם קשה לך, ער״ן זמינים 24/7 בטלפון <span class="wai-select">1201</span>.</p></footer></div>';
    el.querySelectorAll('[data-wai]').forEach(function (b) {
      b.addEventListener('click', function () { shareCard(r, opts, b.getAttribute('data-wai'), b); });
    });
  }

  // ---------- story card ----------

  function cardCanvas(r, opts) {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1920;
    var x = c.getContext('2d');
    var ink = '#0F1F2B', ice = '#EAF1F5', ember = '#FF7448', muted = '#8FA6B6';
    x.fillStyle = ink; x.fillRect(0, 0, 1080, 1920);
    x.fillStyle = ember; x.fillRect(0, 0, 1080, 18);
    x.direction = 'rtl'; x.textAlign = 'right';
    var R = 990, body = '"IBM Plex Sans Hebrew", "Heebo", Arial, sans-serif', disp = '"Karantina", "IBM Plex Sans Hebrew", Arial, sans-serif';
    x.fillStyle = muted; x.font = '500 44px ' + body;
    x.fillText('מה הוואטסאפ שלי יודע עליי', R, 170);
    x.fillStyle = ice; x.font = '700 230px ' + disp;
    x.fillText(r.archetype.name, R, 420);
    x.font = '400 52px ' + body;
    x.fillText(r.archetype.tagline, R, 510);
    x.fillStyle = muted; x.font = '500 44px ' + body;
    x.fillText('ציון התאוששות דיגיטלית', R, 700);
    x.direction = 'ltr';
    x.fillStyle = muted; x.font = '700 110px ' + disp;
    x.fillText('/100', R, 960);
    var w = x.measureText('/100').width;
    x.fillStyle = ember; x.font = '700 300px ' + disp;
    x.fillText(String(r.recovery.score), R - w - 12, 960);
    x.direction = 'rtl';
    var full = Math.round(r.recovery.score / 10);
    for (var i = 0; i < 10; i++) {
      x.fillStyle = i < full ? ember : '#24394A';
      x.fillRect(R - (i + 1) * 90 + 10, 1010, 74, 44);
    }
    x.strokeStyle = '#24394A'; x.lineWidth = 2;
    r.highlights.forEach(function (h, k) {
      var y = 1240 + k * 170;
      x.beginPath(); x.moveTo(90, y - 110); x.lineTo(990, y - 110); x.stroke();
      x.fillStyle = ice; x.font = '700 120px ' + disp;
      x.fillText(h.value, R, y);
      x.fillStyle = muted; x.font = '500 42px ' + body;
      x.textAlign = 'left'; x.fillText(h.label, 90, y - 20); x.textAlign = 'right';
    });
    x.fillStyle = ice; x.font = '500 46px ' + body;
    x.fillText('בדקו מה הוואטסאפ שלכם יודע עליכם', R, 1760);
    x.fillStyle = ember; x.font = '700 46px ' + body;
    x.fillText(opts.siteUrl || '', R, 1830);
    return c;
  }

  function shareCard(r, opts, mode, btn) {
    var fonts = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('700 230px "Karantina"'), document.fonts.load('500 44px "IBM Plex Sans Hebrew"')
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
