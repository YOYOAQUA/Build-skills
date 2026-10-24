/* Builds a deterministic, made-up WhatsApp history for the landing page preview
   and the "show me an example" button. No real people or messages. */
(function (root) {
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  var CHATS = [
    { name: 'דני', type: 'private', others: ['דני'], perDay: 0.9, hours: [8, 13, 20, 22, 23, 0, 1],
      mine: ['אחי מה קורה?', 'יאללה מחר אימון קרח ב-6', 'אין לי זמן השבוע בכלל', 'מרגיש שאני צריך הפסקה', 'וואו זה מטורף', 'בדרך, מגיע עוד 10', 'קשה לי עם העבודה עכשיו', 'אתה מדהים אחי, תודה', 'מתי נפגשים?', 'תמיד אני זה שמארגן חח'],
      theirs: ['הכל טוב אחי', 'מחר בשש? אש', 'תודה אחי', 'נמאס לי מהבוס', 'מגיע', 'איפה אתה?', 'כל הכבוד על האימון', 'עייף מת'] },
    { name: 'משפחה', type: 'group', others: ['אמא', 'אבא', 'נועה'], perDay: 1.4, hours: [7, 9, 12, 17, 19, 21],
      mine: ['ארוחת שישי אצלנו?', 'הילדים שולחים נשיקות', 'אני אאסוף את סבתא', 'מזל טוב!!', 'אוהב אתכם', 'אין לי זמן ביום חמישי'],
      theirs: ['בוקר טוב לכולם', 'מתי אתם מגיעים?', 'תביאו את הילדים', 'אוהבת אתכם', 'ראיתם את החדשות?', 'אל תשכחו את המתנה לסבא'] },
    { name: 'קבוצת האימון', type: 'group', others: ['רון', 'עידו', 'אלון'], perDay: 1.1, hours: [5, 6, 7, 18, 21],
      mine: ['מי בא לים מחר ב-6?', 'אמבט קרח היום היה אש', 'יאללה נתחיל תוכנית נשימות', 'כל הכבוד אלופים', 'למדתי טכניקה חדשה'],
      theirs: ['אני בפנים', 'כל הכבוד אחי', 'אש', 'מחר אני לא מגיע, עייף', 'יאללה', 'איזה כיף היה'] },
    { name: 'מיכל', type: 'private', others: ['מיכל'], perDay: 2.2, hours: [7, 8, 12, 16, 18, 22],
      mine: ['אני אאסוף את הילדים מהגן', 'צריך לקנות חלב', 'אוהב אותך', 'מתי החוג של נועם?', 'אני בדרך', 'אין לי ראש היום', 'גאה בך', 'מה אם נטוס בחנוכה?'],
      theirs: ['תביא לחם', 'הילדים שאלו עליך', 'אוהבת', 'איפה אתה?', 'יש אסיפת הורים ביום שלישי', 'אתה מדהים'] },
    { name: 'צוות עבודה', type: 'group', others: ['שירן', 'אבי', 'טל'], perDay: 1.6, hours: [9, 10, 14, 17, 22, 23, 0],
      mine: ['שלחתי את המצגת', 'הלקוח אישר', 'אני על זה', 'אין לי זמן לפגישה', 'אני חייב לסגור את זה היום', 'יש לי רעיון לפרויקט', 'אני לא יכול מחר'],
      theirs: ['מי סוגר את הדדליין?', 'הלקוח מחכה', 'נמאס מהזום הזה', 'פגישה ב-10', 'תודה על העזרה', 'דחוף!'] }
  ];

  function build() {
    var r = rng(20261024);
    var end = Date.UTC(2026, 9, 24);
    var chats = CHATS.map(function (c) {
      var msgs = [];
      for (var day = 90; day >= 0; day--) {
        var base = end - day * 86400000;
        var convs = r() < c.perDay % 1 ? Math.ceil(c.perDay) : Math.floor(c.perDay);
        for (var k = 0; k < convs; k++) {
          var hour = pick(r, c.hours), t = base + hour * 3600000 + Math.floor(r() * 50) * 60000;
          var len = 2 + Math.floor(r() * 6), mine = r() < 0.55;
          for (var i = 0; i < len; i++) {
            var d = new Date(t);
            var stamp = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
            var who = mine ? 'אני' : pick(r, c.others);
            msgs.push({ t: stamp, s: who, me: mine, x: pick(r, mine ? c.mine : c.theirs), media: r() < 0.05 });
            t += (r() < 0.6 ? 20 + Math.floor(r() * 100) : 120 + Math.floor(r() * 1500)) * 1000;
            mine = r() < 0.4 ? mine : !mine;
          }
        }
      }
      msgs.sort(function (a, b) { return a.t < b.t ? -1 : 1; });
      msgs.forEach(function (m) { if (m.media) m.x = ''; });
      return { name: c.name, type: c.type, messages: msgs };
    });
    return { version: 1, source: 'demo', generatedAt: '2026-10-24T12:00:00', me: 'אני',
      profile: { gender: 'm', kids: true, occupation: 'founder' },
      range: { from: '2026-07-26', to: '2026-10-24' }, chats: chats };
  }

  root.WAI = root.WAI || {};
  root.WAI.demoData = build;
  if (typeof module !== 'undefined' && module.exports) module.exports = { demoData: build };
})(typeof window !== 'undefined' ? window : globalThis);
