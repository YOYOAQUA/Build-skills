/* Landing page: live demo preview and the lead form. */
(function () {
  var cfg = window.WAI_CONFIG || {};
  var LABELS = {
    gender: { m: 'גבר', f: 'אישה', x: 'לא צוין' },
    kids: { yes: 'כן', no: 'לא' },
    occupation: { employee: 'שכיר', freelancer: 'עצמאי', founder: 'יזם', other: 'אחר' }
  };

  var demo = document.getElementById('demo');
  if (demo && window.WAI && WAI.demoData) {
    WAI.renderDashboard(demo, WAI.analyze(WAI.demoData()), { compact: true, siteUrl: cfg.siteUrl });
  }

  var form = document.getElementById('lead-form');
  if (!form) return;
  var err = document.getElementById('lead-error');
  var source = new URLSearchParams(location.search).get('src') || '';

  function value(name) {
    var el = form.querySelector('[name="' + name + '"]:checked') || form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  function showError(msg) { err.textContent = msg; err.hidden = false; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var lead = {
      name: value('name'), email: value('email'), gender: value('gender'),
      kids: value('kids'), occupation: value('occupation'), source: source
    };
    if (!lead.name) return showError('חסר שם פרטי.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return showError('המייל לא נראה תקין. כדאי לבדוק שוב.');
    if (!document.getElementById('lead-consent').checked) return showError('כדי לקבל את הכלי במייל צריך לאשר קבלת מיילים.');

    try {
      localStorage.setItem('wai-profile', JSON.stringify({ name: lead.name, gender: lead.gender, kids: lead.kids === 'yes', occupation: lead.occupation }));
    } catch (_) { /* storage blocked: the tool asks again */ }

    var rm = cfg.ravMesser || {};
    if (rm.action) {
      var post = document.createElement('form');
      post.method = 'POST'; post.action = rm.action; post.acceptCharset = 'UTF-8';
      var fields = rm.fields || {};
      var values = {
        name: lead.name, email: lead.email, gender: LABELS.gender[lead.gender],
        kids: LABELS.kids[lead.kids], occupation: LABELS.occupation[lead.occupation], source: lead.source
      };
      Object.keys(values).forEach(function (k) {
        if (!fields[k]) return;
        var input = document.createElement('input');
        input.type = 'hidden'; input.name = fields[k]; input.value = values[k] || '';
        post.appendChild(input);
      });
      Object.keys(rm.hidden || {}).forEach(function (k) {
        var input = document.createElement('input');
        input.type = 'hidden'; input.name = k; input.value = rm.hidden[k];
        post.appendChild(input);
      });
      document.body.appendChild(post);
      post.submit();
      return;
    }

    var go = function () { location.href = 'app.html' + (source ? '?src=' + encodeURIComponent(source) : ''); };
    if (cfg.leadWebhook) {
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'שולח...';
      fetch(cfg.leadWebhook, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(Object.assign({ consent: true, at: new Date().toISOString() }, lead))
      }).catch(function () {}).then(go);
      return;
    }
    if (window.console) console.warn('WAI: no lead capture configured in config.js - the lead was not saved anywhere.');
    go();
  });
})();
