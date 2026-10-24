/* The tool page: profile, upload, "who are you", then the report. Everything stays in the browser. */
(function () {
  var cfg = window.WAI_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var parsed = [];

  // profile, prefilled from the landing form when available
  try {
    var saved = JSON.parse(localStorage.getItem('wai-profile') || 'null');
    if (saved) {
      check('gender', saved.gender);
      check('kids', saved.kids ? 'yes' : 'no');
      check('occupation', saved.occupation);
    }
  } catch (_) { /* no storage: defaults stay */ }

  function check(name, value) {
    var el = document.querySelector('#step-profile input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }
  function profile() {
    var v = function (n) { var el = document.querySelector('#step-profile input[name="' + n + '"]:checked'); return el ? el.value : ''; };
    return { gender: v('gender') || 'x', kids: v('kids') === 'yes', occupation: v('occupation') || 'other' };
  }

  // export instructions tabs
  ['ios', 'android'].forEach(function (k) {
    $('tab-' + k).addEventListener('click', function () {
      ['ios', 'android'].forEach(function (o) {
        $('tab-' + o).setAttribute('aria-selected', String(o === k));
        $('howto-' + o).hidden = o !== k;
      });
    });
  });
  if (/android/i.test(navigator.userAgent)) $('tab-android').click();

  // upload
  var drop = $('drop'), input = $('file-input'), err = $('upload-error');
  input.addEventListener('change', function () { handle(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { handle(e.dataTransfer.files); });

  function readText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file, 'utf-8');
    });
  }

  function readFile(file) {
    if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
      return file.arrayBuffer().then(WAI.unzipChatText).catch(function (e) {
        if (!window.JSZip) throw e;
        return JSZip.loadAsync(file).then(function (zip) {
          var txt = Object.keys(zip.files).filter(function (n) { return /\.txt$/i.test(n) && !zip.files[n].dir; });
          if (!txt.length) throw new Error('notxt');
          return zip.files[txt[0]].async('string');
        });
      });
    }
    return readText(file);
  }

  function handle(files) {
    err.hidden = true;
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    $('file-list').innerHTML = '<li><span>קורא את הקבצים...</span></li>';
    Promise.all(list.map(function (f) {
      return readFile(f).then(function (text) {
        var p = WAI.parseExport(text, f.name);
        return { file: f.name, parsed: p };
      }).catch(function (e) { return { file: f.name, error: e && e.message }; });
    })).then(function (results) {
      results.forEach(function (r) { if (r.parsed && r.parsed.messages.length) parsed.push(r.parsed); });
      var bad = results.filter(function (r) { return !r.parsed || !r.parsed.messages.length; });
      renderFiles();
      if (bad.length) {
        err.textContent = 'לא מצאתי הודעות ב: ' + bad.map(function (b) { return b.file; }).join(', ') + '. צריך את קובץ הייצוא של וואטסאפ (ZIP או TXT), בלי לפתוח ולשמור אותו מחדש.';
        err.hidden = false;
      }
      if (parsed.length) renderWho();
    });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderFiles() {
    $('file-list').innerHTML = parsed.map(function (p) {
      return '<li><span>' + esc(p.name) + '</span><span>' + p.messages.length.toLocaleString('he-IL') + ' הודעות</span></li>';
    }).join('');
  }

  function renderWho() {
    var g = WAI.guessMe(parsed);
    var pick = g.guess || (g.candidates[0] && g.candidates[0].name);
    $('who').innerHTML = g.candidates.slice(0, 10).map(function (c, i) {
      return '<label><input type="radio" name="me" id="me-' + i + '" value="' + esc(c.name) + '"' + (c.name === pick ? ' checked' : '') + '> ' +
        esc(c.name) + ' <span class="wai-muted">(' + c.count.toLocaleString('he-IL') + ')</span></label>';
    }).join('');
    $('step-who').hidden = false;
    $('step-who').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function show(report) {
    $('steps').hidden = true;
    var el = $('report');
    WAI.renderDashboard(el, report, { siteUrl: cfg.siteUrl, links: cfg.links });
    var again = document.createElement('div');
    again.innerHTML = '<button type="button" class="wai-btn">ניתוח חדש</button>';
    again.firstChild.addEventListener('click', function () { location.reload(); });
    el.insertBefore(again, el.firstChild);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('run').addEventListener('click', function () {
    var me = document.querySelector('#who input:checked');
    if (!me) return;
    var p = profile();
    var data = WAI.buildData(parsed, me.value, p);
    show(WAI.analyze(data, p));
  });

  $('show-demo').addEventListener('click', function () {
    var data = WAI.demoData();
    var p = profile();
    show(WAI.analyze(data, p));
    var note = document.createElement('p');
    note.className = 'wai-meta';
    note.textContent = 'זו דוגמה עם צ׳אטים מומצאים. כדי לראות את שלך: "ניתוח חדש".';
    $('report').insertBefore(note, $('report').children[1]);
  });

  // Claude Code skill install
  var zipUrl = new URL(cfg.skillZip || 'downloads/whatsapp-insights-skill.zip', location.href).href;
  $('skill-zip').href = zipUrl;
  $('install-cmd').textContent = 'curl -fsSL "' + zipUrl + '" -o /tmp/wai.zip && mkdir -p ~/.claude/skills && unzip -o /tmp/wai.zip -d ~/.claude/skills/';
  $('copy-install').addEventListener('click', function () {
    var btn = this, text = $('install-cmd').textContent;
    var done = function () { btn.textContent = 'הועתק'; setTimeout(function () { btn.textContent = 'העתקה'; }, 1800); };
    var fallback = function () {
      var range = document.createRange(); range.selectNodeContents($('install-cmd'));
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      btn.textContent = 'סומן, להעתקה: Cmd+C';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });
})();
