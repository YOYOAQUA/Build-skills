/* WhatsApp insights engine: parses chat exports and turns normalized chat data
   into a report object. Runs in the browser (window.WAI) and in Node (require).
   Metric definitions here must stay identical to the skill's analyze.py. */
(function (root) {
  var LEX = root.WAI_LEX || (typeof require !== 'undefined' ? require('./lexicon.js') : null);

  var NIGHT_FROM = 23, NIGHT_TO = 6;        // night = hour >= 23 or hour < 6
  var LATE_TO = 5;                          // late day = a message between 00:00 and 04:59
  var START_GAP = 6 * 3600;                 // a new conversation starts after 6h of silence
  var REPLY_GAP = 12 * 3600;                // replies count only within 12h
  var FAST_REPLY = 2 * 60;                  // fast reply = 2 minutes or less

  // ---------- text matching ----------

  var HEB_LETTER = /[א-ת]/;

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildMatcher(terms, flags) {
    var hebLong = [], hebShort = [], eng = [], sym = [];
    terms.forEach(function (t) {
      if (HEB_LETTER.test(t)) {
        (t.replace(/[^א-ת]/g, '').length <= 2 ? hebShort : hebLong).push(escapeRe(t));
      } else if (/[a-z]/i.test(t)) {
        eng.push(escapeRe(t));
      } else {
        sym.push(escapeRe(t));
      }
    });
    var parts = [];
    var pre = '(?:^|[^\\u05D0-\\u05EA])[\\u05D5\\u05D4\\u05D1\\u05DC\\u05DE\\u05E9\\u05DB]{0,2}';
    if (hebLong.length) parts.push(pre + '(?:' + hebLong.join('|') + ')');
    if (hebShort.length) parts.push(pre + '(?:' + hebShort.join('|') + ')(?![\\u05D0-\\u05EA])');
    if (eng.length) parts.push('(?:^|[^a-z])(?:' + eng.join('|') + ')(?![a-z])');
    if (sym.length) parts.push('(?:' + sym.join('|') + ')');
    return new RegExp(parts.join('|'), 'i' + (flags || ''));
  }

  var M = null;
  function matchers() {
    if (M) return M;
    M = { topics: {} };
    Object.keys(LEX.topics).forEach(function (k) { M.topics[k] = buildMatcher(LEX.topics[k].terms); });
    ['positive', 'negative', 'past', 'future', 'gratitude', 'emotion', 'passion', 'meaning', 'creativity',
      'outsideWork', 'kids', 'support', 'mentalLoad', 'distress'].forEach(function (k) { M[k] = buildMatcher(LEX[k]); });
    M.limiting = LEX.limiting.map(function (t) { return { term: t, re: buildMatcher([t], 'g') }; });
    return M;
  }

  // ---------- parsing WhatsApp exports ----------

  var BIDI = /[‎‏‪-‮⁦-⁩﻿]/g;
  var LINE_IOS = /^\[(\d{1,4})[.\/-](\d{1,2})[.\/-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?|לפנה[\"״]צ|אחה[\"״]צ)?\]\s?(.*)$/;
  var LINE_ANDROID = /^(\d{1,4})[.\/-](\d{1,2})[.\/-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?|לפנה[\"״]צ|אחה[\"״]צ)?\s[-–]\s(.*)$/;
  var MEDIA = /(<media omitted>|<המדיה הושמטה>|<מדיה הושמטה>|(image|video|audio|sticker|gif|document|contact card) omitted|(תמונה|סרטון|הקלטה|שמע|מדבקה|מסמך|GIF|כרטיס איש קשר) הושמט|\(file attached\)|\(הקובץ מצורף\)|<attached: )/i;
  var DELETED = /^(this message was deleted|you deleted this message|הודעה זו נמחקה|מחקת את ההודעה הזו)\.?$/i;
  var JOKE = /מצחוק|\u{1F602}|\u{1F923}|חחח/u;
  var EDITED = /\s*<(this message was edited|ההודעה נערכה)>\s*$/i;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function matchLine(line) {
    var m = LINE_IOS.exec(line);
    if (m) return { m: m, ios: true };
    m = LINE_ANDROID.exec(line);
    if (m) return { m: m, ios: false };
    return null;
  }

  function detectOrder(lines) {
    var order = 'DMY';
    for (var i = 0; i < lines.length && i < 3000; i++) {
      var hit = matchLine(lines[i].replace(BIDI, '').replace(/[  ]/g, ' '));
      if (!hit) continue;
      var a = +hit.m[1], b = +hit.m[2];
      if (hit.m[1].length === 4) return 'YMD';
      if (a > 12) return 'DMY';
      if (b > 12) order = 'MDY';
    }
    return order;
  }

  function cleanChatName(fileName) {
    var n = (fileName || 'צ׳אט').replace(/\.(txt|zip)$/i, '');
    n = n.replace(/^WhatsApp Chat (with|-)\s*/i, '').replace(/^צ['׳]אט WhatsApp (עם|-)\s*/, '').replace(/^_chat$/, 'צ׳אט');
    return n.trim() || 'צ׳אט';
  }

  function parseExport(text, fileName) {
    var lines = String(text).split(/\r?\n/);
    var order = detectOrder(lines);
    var messages = [], senders = {}, last = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var clean = raw.replace(BIDI, '').replace(/[  ]/g, ' ');
      var hit = matchLine(clean);
      if (!hit) {
        if (last && clean.trim()) last.x += '\n' + clean;
        continue;
      }
      var m = hit.m, d, mo, y;
      if (order === 'YMD') { y = +m[1]; mo = +m[2]; d = +m[3]; }
      else if (order === 'MDY') { mo = +m[1]; d = +m[2]; y = +m[3]; }
      else { d = +m[1]; mo = +m[2]; y = +m[3]; }
      if (y < 100) y += 2000;
      var h = +m[4], min = +m[5], sec = m[6] ? +m[6] : 0;
      if (m[7]) {
        var pm = /^p/i.test(m[7]) || /^אחה/.test(m[7]);
        if (pm && h < 12) h += 12;
        if (!pm && h === 12) h = 0;
      }
      var rest = m[8];
      var colon = rest.indexOf(': ');
      last = null;
      if (colon < 1) continue;                           // system line without a sender
      var sender = rest.slice(0, colon).trim();
      var body = rest.slice(colon + 2);
      var rawBody = raw.slice(raw.indexOf(': ') + 2);
      var media = MEDIA.test(body);
      if (!media && hit.ios && /^‎/.test(rawBody)) continue;   // iOS system note
      body = body.replace(EDITED, '');
      if (DELETED.test(body.trim())) continue;
      if (/^null$/i.test(body.trim())) continue;
      var t = y + '-' + pad(mo) + '-' + pad(d) + 'T' + pad(h) + ':' + pad(min) + ':' + pad(sec);
      last = { t: t, s: sender, x: media ? '' : body, media: media };
      messages.push(last);
      senders[sender] = (senders[sender] || 0) + 1;
    }
    messages.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
    messages.forEach(function (msg) { if (msg.x.length > 1000) msg.x = msg.x.slice(0, 1000); });
    return { name: cleanChatName(fileName), messages: messages, senders: senders };
  }

  // Reads the chat text out of a WhatsApp export ZIP (iPhone exports are zipped).
  // Uses the browser's own DecompressionStream, so no library is needed.
  function unzipChatText(buffer) {
    var dv = new DataView(buffer), u8 = new Uint8Array(buffer), eocd = -1;
    for (var i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('notzip'));
    var count = dv.getUint16(eocd + 10, true), off = dv.getUint32(eocd + 16, true), entries = [];
    for (var n = 0; n < count && dv.getUint32(off, true) === 0x02014b50; n++) {
      var nameLen = dv.getUint16(off + 28, true);
      entries.push({
        method: dv.getUint16(off + 10, true), size: dv.getUint32(off + 20, true), local: dv.getUint32(off + 42, true),
        name: new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nameLen))
      });
      off += 46 + nameLen + dv.getUint16(off + 30, true) + dv.getUint16(off + 32, true);
    }
    var txt = entries.filter(function (e) { return /\.txt$/i.test(e.name) && !/__MACOSX/.test(e.name); })
      .sort(function (a, b) { return (/_chat\.txt$/.test(b.name) ? 1 : 0) - (/_chat\.txt$/.test(a.name) ? 1 : 0); });
    if (!txt.length) return Promise.reject(new Error('notxt'));
    var e = txt[0], start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
    var data = u8.subarray(start, start + e.size);
    if (e.method === 0) return Promise.resolve(new TextDecoder('utf-8').decode(data));
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') return Promise.reject(new Error('unsupported'));
    var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  function guessMe(parsedList) {
    var totals = {};
    parsedList.forEach(function (p) {
      Object.keys(p.senders).forEach(function (s) { totals[s] = (totals[s] || 0) + p.senders[s]; });
    });
    var candidates = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; })
      .map(function (s) { return { name: s, count: totals[s] }; });
    var guess = null;
    if (parsedList.length > 1) {
      var common = candidates.filter(function (c) {
        return parsedList.every(function (p) { return p.senders[c.name]; });
      });
      if (common.length) guess = common[0].name;
    }
    return { candidates: candidates, guess: guess };
  }

  function buildData(parsedList, meName, profile) {
    var all = [];
    var chats = parsedList.map(function (p) {
      var msgs = p.messages.map(function (m) {
        return { t: m.t, s: m.s, me: m.s === meName, x: m.x, media: m.media };
      });
      all = all.concat(msgs);
      return { name: p.name, type: Object.keys(p.senders).length > 2 ? 'group' : 'private', messages: msgs };
    }).filter(function (c) { return c.messages.length; });
    var ts = all.map(function (m) { return m.t; }).sort();
    return {
      version: 1, source: 'export', generatedAt: new Date().toISOString().slice(0, 19), me: meName,
      profile: profile || null,
      range: ts.length ? { from: ts[0].slice(0, 10), to: ts[ts.length - 1].slice(0, 10) } : null,
      chats: chats
    };
  }

  // ---------- analysis helpers ----------

  function secs(t) {
    return Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10), +t.slice(11, 13), +t.slice(14, 16), +t.slice(17, 19)) / 1000;
  }
  function weekday(t) { return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10))).getUTCDay(); }
  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function share(a, b) { return b ? a / b : 0; }

  function recoveryFrom(nightShare, fastShare, satShare, lateDaysPerWeek) {
    var p = {
      night: Math.min(35, nightShare * 140),
      fast: Math.min(25, fastShare * 50),
      sat: Math.min(15, Math.max(0, satShare - 1 / 7) * 150),
      late: Math.min(25, lateDaysPerWeek * 6)
    };
    var score = Math.round(clamp(100 - p.night - p.fast - p.sat - p.late, 0, 100));
    return { score: score, band: score < 40 ? 'נמוך' : score < 70 ? 'בינוני' : 'גבוה', penalties: p };
  }

  function quoteAround(text, re) {
    re.lastIndex = 0;
    var m = re.exec(text);
    var at = m ? m.index : 0;
    var from = Math.max(0, at - 30), to = Math.min(text.length, at + (m ? m[0].length : 0) + 40);
    return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ').trim() + (to < text.length ? '…' : '');
  }

  function g(profile, m, f) { return profile && profile.gender === 'f' ? f : m; }

  // ---------- archetypes and copy ----------

  // The 12 classic archetypes. Claude picks the primary and secondary in insights.json (with evidence);
  // the counting fallback below is used only when there are no insights.
  function A(m, f, tagline, desc, shadow, step) {
    return { name: [m, f], tagline: tagline, desc: desc, shadow: shadow, step: step };
  }
  var ARCHETYPES = {
    creator: A('היוצר', 'היוצרת',
      function (p) { return g(p, 'רואה משהו שעוד לא קיים, ובונה אותו', 'רואה משהו שעוד לא קיים, ובונה אותו'); },
      function (p) { return g(p, 'רעיונות, פרויקטים, "מה אם". השיחות שלך מלאות בדברים שאתה רוצה להביא לעולם.', 'רעיונות, פרויקטים, "מה אם". השיחות שלך מלאות בדברים שאת רוצה להביא לעולם.'); },
      function () { return 'יותר רעיונות מזמן. חלק מהם נשארים בצ׳אט.'; },
      function (p) { return g(p, 'השבוע: בחר רעיון אחד מהצ׳אט, ותן לו 30 דקות ביומן.', 'השבוע: בחרי רעיון אחד מהצ׳אט, ותני לו 30 דקות ביומן.'); }),
    explorer: A('החוקר', 'החוקרת',
      function () { return 'שואל, מחפש, לא נח במקום'; },
      function () { return 'שאלות, לינקים, דברים חדשים. הסקרנות היא הדלק שלך.'; },
      function () { return 'קשה להישאר עם דבר אחד מספיק זמן כדי שיעמיק.'; },
      function (p) { return g(p, 'השבוע: בחר שאלה אחת שמעסיקה אותך, ותן לה ערב שלם.', 'השבוע: בחרי שאלה אחת שמעסיקה אותך, ותני לה ערב שלם.'); }),
    caregiver: A('המטפל', 'המטפלת',
      function (p) { return g(p, 'דואג שלכולם יהיה טוב', 'דואגת שלכולם יהיה טוב'); },
      function () { return 'תמיכה, "אני פה", "מה שלומך". אנשים יודעים לאן לפנות.'; },
      function (p) { return g(p, 'נותן הרבה יותר ממה שמבקש. מי מטפל במטפל?', 'נותנת הרבה יותר ממה שמבקשת. מי מטפלת במטפלת?'); },
      function (p) { return g(p, 'השבוע: בקש עזרה אחת קטנה ממישהו שאתה סומך עליו.', 'השבוע: בקשי עזרה אחת קטנה ממישהו שאת סומכת עליו.'); }),
    warrior: A('הלוחם', 'הלוחמת',
      function (p) { return g(p, 'מתמודד, הולך קדימה, לא מוותר', 'מתמודדת, הולכת קדימה, לא מוותרת'); },
      function (p) { return g(p, 'יעדים, אימונים, "יאללה". אתה ממשיך גם כשקשה.', 'יעדים, אימונים, "יאללה". את ממשיכה גם כשקשה.'); },
      function () { return 'קשה לנוח בלי להרגיש שמפסידים משהו.'; },
      function () { return 'השבוע: יום אחד בלי יעד. רק להיות.'; }),
    leader: A('המנהיג', 'המנהיגה',
      function (p) { return g(p, 'לוקח אחריות ומזיז דברים', 'לוקחת אחריות ומזיזה דברים'); },
      function (p) { return g(p, 'אתה פותח שיחות, קובע מועדים וסוגר עניינים. בלעדיך דברים לא קורים.', 'את פותחת שיחות, קובעת מועדים וסוגרת עניינים. בלעדייך דברים לא קורים.'); },
      function () { return 'כשהכל עליך, קשה לשחרר. וגם קשה שמישהו אחר ייקח.'; },
      function (p) { return g(p, 'השבוע: העבר משימה אחת למישהו אחר, ואל תבדוק אותה.', 'השבוע: העבירי משימה אחת למישהו אחר, ואל תבדקי אותה.'); }),
    sage: A('החכם', 'החכמה',
      function (p) { return g(p, 'מבין לעומק לפני שמגיב', 'מבינה לעומק לפני שמגיבה'); },
      function () { return 'הסברים, נקודות מבט, עצות. אנשים באים אליך כדי להבין.'; },
      function () { return 'לפעמים מנתחים במקום להרגיש.'; },
      function (p) { return g(p, 'השבוע: שאל מישהו קרוב "מה אתה מרגיש?", והקשב בלי לייעץ.', 'השבוע: שאלי מישהו קרוב "מה את מרגישה?", והקשיבי בלי לייעץ.'); }),
    rebel: A('המורד', 'המורדת',
      function (p) { return g(p, 'לא מקבל דברים כמו שהם', 'לא מקבלת דברים כמו שהם'); },
      function (p) { return g(p, 'דעות חזקות, ויכוחים, "זה לא הגיוני". אתה דוחף לשינוי.', 'דעות חזקות, ויכוחים, "זה לא הגיוני". את דוחפת לשינוי.'); },
      function () { return 'האש שמזיזה את העולם שורפת גם אותך.'; },
      function (p) { return g(p, 'השבוע: בחר מאבק אחד ששווה את האנרגיה, ושחרר שניים.', 'השבוע: בחרי מאבק אחד ששווה את האנרגיה, ושחררי שניים.'); }),
    magician: A('הקוסם', 'הקוסמת',
      function (p) { return g(p, 'הופך חזון למציאות', 'הופכת חזון למציאות'); },
      function (p) { return g(p, 'חיבורים בין אנשים ורעיונות, "בוא נעשה את זה". אתה רואה אפשרויות שאחרים לא רואים.', 'חיבורים בין אנשים ורעיונות, "בואי נעשה את זה". את רואה אפשרויות שאחרים לא רואים.'); },
      function () { return 'החזון רץ מהר יותר מהגוף.'; },
      function (p) { return g(p, 'השבוע: כתוב את החזון במשפט אחד, ושתף אדם אחד.', 'השבוע: כתבי את החזון במשפט אחד, ושתפי אדם אחד.'); }),
    everyman: A('החבר', 'החברה',
      function () { return 'שייך, נוכח, תמיד שם'; },
      function (p) { return g(p, 'הרבה אנשים, הרבה קבוצות, שיחות פשוטות וחמות. אתה הדבק של החבר׳ה.', 'הרבה אנשים, הרבה קבוצות, שיחות פשוטות וחמות. את הדבק של החבר׳ה.'); },
      function () { return 'קל ללכת לאיבוד בתוך כולם.'; },
      function () { return 'השבוע: שיחה עמוקה אחת, אחד על אחד.'; }),
    jester: A('המצחיק', 'המצחיקה',
      function (p) { return g(p, 'מביא אור לכל שיחה', 'מביאה אור לכל שיחה'); },
      function () { return 'חחח, אימוג׳ים, בדיחות פנימיות. איתך כולם נושמים.'; },
      function () { return 'הצחוק יכול להסתיר את מה שבאמת קורה.'; },
      function (p) { return g(p, 'השבוע: שתף מישהו קרוב במשהו רציני, בלי בדיחה בסוף.', 'השבוע: שתפי מישהו קרוב במשהו רציני, בלי בדיחה בסוף.'); }),
    lover: A('האוהב', 'האוהבת',
      function (p) { return g(p, 'חי דרך הקשרים הקרובים', 'חיה דרך הקשרים הקרובים'); },
      function () { return '"אוהב", "מתגעגע", לבבות. הקרבה היא מה שמניע אותך.'; },
      function () { return 'כשהקשר רועד, הכל רועד.'; },
      function () { return 'השבוע: זמן אחד רק לעצמך, בלי טלפון.'; }),
    innocent: A('התמים', 'התמימה',
      function (p) { return g(p, 'רואה את הטוב, ומאמין בו', 'רואה את הטוב, ומאמינה בו'); },
      function (p) { return g(p, 'אופטימיות, תודה, "יהיה טוב". אתה מחזיק את האמונה גם בשביל אחרים.', 'אופטימיות, תודה, "יהיה טוב". את מחזיקה את האמונה גם בשביל אחרים.'); },
      function () { return 'קשה להודות כשמשהו לא בסדר.'; },
      function (p) { return g(p, 'השבוע: כתוב דבר אחד שמציק לך, ואמור אותו בקול.', 'השבוע: כתבי דבר אחד שמציק לך, ואמרי אותו בקול.'); })
  };

  function archetypeName(key, p) { return ARCHETYPES[key].name[p && p.gender === 'f' ? 1 : 0]; }

  // Everything the report shows about one archetype, in the right gender.
  function archetypeInfo(key, p) {
    var a = ARCHETYPES[key];
    if (!a) return null;
    return { key: key, name: archetypeName(key, p), tagline: a.tagline(p), desc: a.desc(p), shadow: a.shadow(p), step: a.step(p) };
  }

  function fmtMinutes(min) {
    if (min == null) return '-';
    if (min < 1) return 'פחות מדקה';
    if (min < 60) return Math.round(min) + ' דק׳';
    var h = min / 60;
    return (h < 10 ? h.toFixed(1) : Math.round(h)) + ' שעות';
  }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function times(n) { return n === 1 ? 'פעם אחת' : n === 2 ? 'פעמיים' : n + ' פעמים'; }

  // ---------- main analysis ----------

  function analyze(data, profileIn) {
    var mt = matchers();
    var profile = profileIn || data.profile || { gender: 'x', kids: false, occupation: 'other' };
    var me = data.me;
    var hours = new Array(24).fill(0), weekdays = new Array(7).fill(0);
    var myCount = 0, myText = 0, total = 0, night = 0, sat = 0, lateDates = {};
    var myReplies = [], fastReplies = 0, startsMe = 0, startsThem = 0;
    var cat = {};
    Object.keys(LEX.topics).forEach(function (k) { cat[k] = 0; });
    ['positive', 'negative', 'past', 'future', 'gratitude', 'emotion', 'passion', 'meaning', 'creativity',
      'outsideWork', 'kids', 'support', 'mentalLoad'].forEach(function (k) { cat[k] = 0; });
    var limiting = mt.limiting.map(function (l) { return { term: l.term, re: l.re, count: 0, examples: [] }; });
    var distress = false;
    var deep = 0, logistic = 0, qMsgs = 0, laughMsgs = 0;
    var mentalMine = 0, mentalOthers = 0, supportGiven = 0, supportReceived = 0;
    var people = {};
    var firstMine = null, lastMine = null, allFrom = null, allTo = null;
    var chatStats = [];

    data.chats.forEach(function (chat) {
      var cs = { name: chat.name, type: chat.type, total: 0, mine: 0, myReplies: [], theirReplies: [], startsByMe: 0, startsByThem: 0, othersPos: 0, othersNeg: 0, othersText: 0 };
      var prev = null, prevSec = null;
      chat.messages.forEach(function (msg) {
        var sec = secs(msg.t);
        var gap = prevSec == null ? Infinity : sec - prevSec;
        total++; cs.total++;
        if (!allFrom || msg.t < allFrom) allFrom = msg.t;
        if (!allTo || msg.t > allTo) allTo = msg.t;
        if (gap > START_GAP) {
          if (msg.me) { startsMe++; cs.startsByMe++; } else { startsThem++; cs.startsByThem++; }
        }
        var text = msg.media ? '' : (msg.x || '');
        if (msg.me) {
          myCount++; cs.mine++;
          if (!firstMine || msg.t < firstMine) firstMine = msg.t;
          if (!lastMine || msg.t > lastMine) lastMine = msg.t;
          var hr = +msg.t.slice(11, 13);
          hours[hr]++;
          var wd = weekday(msg.t);
          weekdays[wd]++;
          if (hr >= NIGHT_FROM || hr < NIGHT_TO) night++;
          if (hr < LATE_TO) lateDates[msg.t.slice(0, 10)] = 1;
          if (wd === 6) sat++;
          if (prev && !prev.me && gap <= REPLY_GAP) {
            myReplies.push(gap / 60); cs.myReplies.push(gap / 60);
            if (gap <= FAST_REPLY) fastReplies++;
          }
          if (text) {
            myText++;
            if (text.indexOf('?') >= 0) qMsgs++;
            if (JOKE.test(text)) laughMsgs++;
            Object.keys(LEX.topics).forEach(function (k) { if (mt.topics[k].test(text)) cat[k]++; });
            var hitEmotion = false, hitSupport = false, hitMeaning = false;
            Object.keys(cat).forEach(function (k) {
              if (LEX.topics[k]) return;
              if (mt[k].test(text)) {
                cat[k]++;
                if (k === 'emotion') hitEmotion = true;
                if (k === 'support') hitSupport = true;
                if (k === 'meaning') hitMeaning = true;
              }
            });
            if (mt.distress.test(text) && !JOKE.test(text)) distress = true;
            if (hitSupport) supportGiven++;
            if (mt.mentalLoad.test(text)) mentalMine++;
            if (chat.type === 'private') {
              var isDeep = hitEmotion || hitSupport || hitMeaning || text.split(/\s+/).length >= 25;
              if (isDeep) deep++;
              else if (mt.topics.logistics.test(text)) logistic++;
            }
            limiting.forEach(function (l) {
              l.re.lastIndex = 0;
              var found = text.match(l.re);
              if (found) {
                l.count += found.length;
                if (l.examples.length < 3 && text.length <= 220) l.examples.push(quoteAround(text, l.re));
              }
            });
          }
        } else {
          var who = msg.s || chat.name;
          var person = people[who] || (people[who] = { name: who, count: 0, text: 0, pos: 0, neg: 0, replies: [] });
          person.count++;
          if (prev && prev.me && gap <= REPLY_GAP) { cs.theirReplies.push(gap / 60); person.replies.push(gap / 60); }
          if (text) {
            person.text++; cs.othersText++;
            if (mt.positive.test(text)) { person.pos++; cs.othersPos++; }
            if (mt.negative.test(text) || mt.topics.complaints.test(text)) { person.neg++; cs.othersNeg++; }
            if (mt.support.test(text)) supportReceived++;
            if (mt.mentalLoad.test(text)) mentalOthers++;
          }
        }
        prev = msg; prevSec = sec;
      });
      chatStats.push(cs);
    });

    var spanDays = firstMine ? Math.max(7, (secs(lastMine) - secs(firstMine)) / 86400) : 7;
    var nightShare = share(night, myCount), satShare = share(sat, myCount), fastShare = share(fastReplies, myReplies.length);
    var lateDaysPerWeek = Object.keys(lateDates).length / Math.max(1, spanDays / 7);
    var rec = recoveryFrom(nightShare, fastShare, satShare, lateDaysPerWeek);
    var myMedianReply = median(myReplies);
    var rates = {};
    Object.keys(cat).forEach(function (k) { rates[k] = share(cat[k], myText); });
    var initShare = share(startsMe, startsMe + startsThem);

    // circle
    var chats = chatStats.filter(function (c) { return c.total; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 10)
      .map(function (c) {
        var energy = share(c.othersPos - c.othersNeg, c.othersText);
        return {
          name: c.name, type: c.type, total: c.total, mine: c.mine, myShare: share(c.mine, c.total),
          myMedianReply: median(c.myReplies), theirMedianReply: median(c.theirReplies),
          startsByMe: c.startsByMe, startsByThem: c.startsByThem,
          energy: c.othersText >= 15 ? (energy >= 0.12 ? 'מטעין' : energy <= 0.02 ? 'מרוקן' : 'ניטרלי') : null
        };
      });
    var ranked = Object.keys(people).map(function (k) { return people[k]; }).filter(function (p) { return p.text >= 20; })
      .map(function (p) { return { name: p.name, count: p.count, posShare: share(p.pos, p.text), negShare: share(p.neg, p.text), score: share(p.pos - p.neg, p.text), medianReply: median(p.replies) }; })
      .sort(function (a, b) { return b.score - a.score; });
    var chargers = ranked.filter(function (p) { return p.score > 0.05; }).slice(0, 3);
    var drainers = ranked.slice().reverse().filter(function (p) { return p.negShare >= 0.06 && chargers.indexOf(p) < 0; }).slice(0, 3);

    // content
    var topics = Object.keys(LEX.topics).filter(function (k) { return k !== 'logistics'; })
      .map(function (k) { return { key: k, label: LEX.topics[k].label, share: rates[k] }; })
      .sort(function (a, b) { return b.share - a.share; });

    // language
    limiting = limiting.filter(function (l) { return l.count; }).sort(function (a, b) { return b.count - a.count; })
      .map(function (l) { return { term: l.term, count: l.count, examples: l.examples }; });

    // archetype
    // A rough guess from word counts. Claude's reading in insights.json replaces it.
    var questions = share(qMsgs, myText), laughs = share(laughMsgs, myText);
    var scores = {
      creator: rates.creativity * 4 + rates.passion * 2,
      explorer: rates.growth * 3 + questions * 0.6,
      caregiver: (rates.support + rates.gratitude) * 4,
      warrior: rates.health * 3 + rates.future * 1.5,
      leader: Math.max(0, initShare - 0.4) * 2 + rates.logistics * 1.2,
      sage: rates.meaning * 4 + rates.growth,
      rebel: (rates.politics + rates.news + rates.complaints) * 3 + rates.negative,
      magician: (rates.meaning + rates.creativity + rates.future) * 2,
      everyman: rates.family + rates.logistics * 0.5,
      jester: laughs * 3,
      lover: rates.emotion * 3 + rates.positive * 0.5,
      innocent: Math.max(0, rates.positive - rates.negative * 2) * 1.5
    };
    var order = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    var archetype = archetypeInfo(order[0], profile);
    archetype.secondary = { key: order[1], name: archetypeName(order[1], profile) };
    archetype.scores = scores;

    // the biggest drain on recovery
    var drains = {
      night: pct(nightShare) + ' מההודעות שלך נשלחו בין 23:00 ל-06:00.',
      fast: pct(fastShare) + ' מהתשובות שלך יצאו תוך 2 דקות.',
      sat: pct(satShare) + ' מההודעות שלך נשלחו בשבת.',
      late: 'בממוצע ' + lateDaysPerWeek.toFixed(1) + ' לילות בשבוע ' + g(profile, 'אתה', 'את') + ' עוד בוואטסאפ אחרי חצות.'
    };
    var topDrain = Object.keys(rec.penalties).sort(function (a, b) { return rec.penalties[b] - rec.penalties[a]; })[0];
    var topLimit = limiting.filter(function (l) { return l.term !== 'תמיד' && l.term !== 'אף פעם'; })[0] || limiting[0];
    var patternBody = drains[topDrain];
    if (topLimit) patternBody += ' והמשפט שחוזר אצלך הכי הרבה: "' + topLimit.term + '" (' + times(topLimit.count) + ').';

    // lens
    var lens = { type: profile.gender === 'f' ? 'f' : profile.gender === 'm' ? 'm' : 'x', items: [] };
    var depthShare = share(deep, deep + logistic);
    var emotionPer100 = rates.emotion * 100;
    var fireRate = (rates.passion + rates.outsideWork) * 100;
    if (lens.type === 'm') {
      lens.title = 'העדשה שלך: גבר בשיחה';
      lens.items.push({ key: 'depth', title: 'חברות אמיתית או רק לוגיסטיקה', value: pct(depthShare) + ' עומק',
        text: 'מתוך ההודעות שלך בשיחות אישיות, ' + pct(depthShare) + ' עוסקות ברגש, תמיכה או משמעות, והשאר בלוגיסטיקה.' });
      lens.items.push({ key: 'emotion', title: 'אוצר מילים רגשי', value: emotionPer100.toFixed(1) + ' ל-100 הודעות',
        text: 'מילים כמו "מרגיש", "מתגעגע", "גאה" מופיעות ב-' + emotionPer100.toFixed(1) + ' מכל 100 הודעות שלך.' });
      if (profile.kids) lens.items.push({ key: 'dad', title: 'אבא נוכח', value: pct(rates.kids),
        text: pct(rates.kids) + ' מההודעות שלך עוסקות בילדים: גן, חוגים, איסופים, בית ספר.' });
      lens.items.push({ key: 'fire', title: 'האש הפנימית', value: fireRate.toFixed(1) + ' ל-100 הודעות',
        text: 'תשוקה ועשייה מחוץ לעבודה (אימונים, ים, תחביבים) מופיעות ב-' + fireRate.toFixed(1) + ' מכל 100 הודעות שלך.' });
    } else if (lens.type === 'f') {
      lens.title = 'העדשה שלך: אישה בשיחה';
      var loadShare = share(mentalMine, mentalMine + mentalOthers);
      lens.items.push({ key: 'load', title: 'העומס המנטלי', value: pct(loadShare),
        text: 'מכל הודעות הסידורים בשיחות שלך (קניות, תורים, הסעות, תזכורות), ' + pct(loadShare) + ' נשלחו ממך.' });
      var selfRate = rates.passion + rates.growth + rates.outsideWork + rates.creativity;
      if (profile.kids) lens.items.push({ key: 'mom', title: 'אמא ועוד', value: pct(rates.kids) + ' מול ' + pct(selfRate),
        text: pct(rates.kids) + ' מההודעות שלך על הילדים, ' + pct(selfRate) + ' על דברים שהם רק שלך: תשוקות, למידה, תחביבים.' });
      lens.items.push({ key: 'give', title: 'נתינה מול קבלה', value: supportGiven + ' מול ' + supportReceived,
        text: 'שלחת ' + supportGiven + ' הודעות תמיכה ועידוד, וקיבלת ' + supportReceived + '.' });
    }

    // call to action by segment
    var cta;
    // All the men's segments lead to the masterclass "גבר בתנועה" for now, each with its own angle.
    if (profile.gender !== 'f' && profile.kids) cta = { key: 'dad', title: 'גבר בתנועה', text: 'ראית את המספרים. מאסטרקלאס לייב לגברים: למצוא משמעות וליצור, ולהיות נוכח באמת, גם בבית.' };
    else if (profile.gender !== 'f' && (profile.occupation === 'founder' || profile.occupation === 'freelancer')) cta = { key: 'coaching', title: 'גבר בתנועה', text: 'מי שעונה תוך 2 דקות עובד בשביל הטלפון. מאסטרקלאס לייב לגברים: למצוא משמעות וליצור, בקצב שמחזיק.' };
    else if (profile.gender !== 'f') cta = { key: 'workshops', title: 'גבר בתנועה', text: 'מקום לעבוד על מה שהצ׳אט הראה לך, יחד עם גברים אחרים. מאסטרקלאס לייב: למצוא משמעות וליצור.' };
    else cta = { key: 'general', title: 'רוצה עוד כלים כאלה?', text: 'באינסטגרם אני משתף כלים לחוסן, לאנרגיה ולקצב חיים בריא יותר.' };

    var highlights = [
      { label: 'מההודעות בלילה', value: pct(nightShare) },
      { label: 'זמן תגובה חציוני', value: fmtMinutes(myMedianReply) },
      { label: topLimit ? '"' + topLimit.term + '"' : 'חיוביות', value: topLimit ? times(topLimit.count) : pct(rates.positive) }
    ];

    return {
      meta: { me: me, from: allFrom ? allFrom.slice(0, 10) : null, to: allTo ? allTo.slice(0, 10) : null, chats: data.chats.length, total: total, mine: myCount, source: data.source },
      profile: profile,
      recovery: { score: rec.score, band: rec.band, penalties: rec.penalties, nightShare: nightShare, fastShare: fastShare, satShare: satShare, lateDaysPerWeek: lateDaysPerWeek, myMedianReply: myMedianReply },
      rhythm: { hours: hours, weekdays: weekdays, peakHour: hours.indexOf(Math.max.apply(null, hours)) },
      circle: { chats: chats, chargers: chargers, drainers: drainers, initShare: initShare, supportGiven: supportGiven, supportReceived: supportReceived },
      content: { topics: topics },
      language: { positive: rates.positive, negative: rates.negative, past: rates.past, future: rates.future, gratitude: rates.gratitude, emotion: rates.emotion, limiting: limiting.slice(0, 6) },
      core: { passion: rates.passion, meaning: rates.meaning, creativity: rates.creativity, outsideWork: rates.outsideWork },
      lens: lens,
      archetype: archetype,
      pattern: { title: 'הדפוס שלך: ' + archetype.name, body: patternBody },
      nextStep: archetype.step,
      cta: cta,
      distress: distress,
      highlights: highlights
    };
  }

  var WAI = {
    parseExport: parseExport, unzipChatText: unzipChatText, guessMe: guessMe, buildData: buildData, analyze: analyze,
    recoveryFrom: recoveryFrom, fmtMinutes: fmtMinutes, pct: pct, times: times, _buildMatcher: buildMatcher,
    archetypeInfo: archetypeInfo, ARCHETYPE_KEYS: Object.keys(ARCHETYPES)
  };
  root.WAI = Object.assign(root.WAI || {}, WAI);
  if (typeof module !== 'undefined' && module.exports) module.exports = WAI;
})(typeof window !== 'undefined' ? window : globalThis);
