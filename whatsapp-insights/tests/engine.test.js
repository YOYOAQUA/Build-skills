// Run: node --test whatsapp-insights/tests/engine.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const W = require('../web/assets/engine.js');
const { demoData } = require('../web/assets/demo.js');

const FIX = path.join(__dirname, 'fixtures');
const read = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');

test('parses the iPhone export, skipping system and deleted lines', () => {
  const p = W.parseExport(read('ios_export.txt'), 'WhatsApp Chat - הים.txt');
  assert.strictEqual(p.name, 'הים');
  assert.strictEqual(p.messages.length, 14);
  assert.strictEqual(p.messages.filter((m) => m.media).length, 3);
  assert.strictEqual(p.messages[0].t, '2026-09-12T21:05:40');
  assert.ok(p.messages.some((m) => m.x.split('\n').length === 3), 'multiline message kept');
});

test('parses the Android Hebrew-locale export', () => {
  const p = W.parseExport(read('android_export.txt'), 'android.txt');
  assert.strictEqual(p.messages.length, 8);
  assert.strictEqual(p.messages[0].t, '2026-10-20T08:02:00');
  assert.strictEqual(p.senders['רון'], 4);
});

test('unzips the iPhone ZIP to the same messages as the TXT', async () => {
  const buf = fs.readFileSync(path.join(FIX, 'ios_export.zip'));
  const text = await W.unzipChatText(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  assert.deepStrictEqual(W.parseExport(text, 'a').messages, W.parseExport(read('ios_export.txt'), 'b').messages);
});

test('US dates with AM/PM and Hebrew AM/PM markers', () => {
  const us = W.parseExport('10/25/26, 9:14 PM - Dan: hi\n10/25/26, 12:05 AM - Dan: late', 'x');
  assert.strictEqual(us.messages[0].t, '2026-10-25T00:05:00');
  assert.strictEqual(us.messages[1].t, '2026-10-25T21:14:00');
  const he = W.parseExport('25.10.2026, 9:14 אחה״צ - דן: היי', 'x');
  assert.strictEqual(he.messages[0].t, '2026-10-25T21:14:00');
});

test('guessMe picks the person who appears in every chat', () => {
  const a = W.parseExport(read('ios_export.txt'), 'a');
  const b = W.parseExport(read('android_export.txt'), 'b');
  assert.strictEqual(W.guessMe([a, b]).guess, 'רון');
});

test('recovery score formula matches the shared definition', () => {
  const r = W.recoveryFrom(0.25, 0.4, 0.2, 1);
  // 100 - 35 - 20 - 8.57 - 6 = 30.43
  assert.strictEqual(r.score, 30);
  assert.strictEqual(r.band, 'נמוך');
  assert.strictEqual(W.recoveryFrom(0, 0, 0, 0).score, 100);
});

test('distress is flagged, but not the laughing slang', () => {
  const one = (x) => W.analyze({ me: 'a', chats: [{ name: 'c', type: 'private', messages: [{ t: '2026-10-01T10:00:00', s: 'a', me: true, x, media: false }] }] }).distress;
  assert.strictEqual(one('אני לא רוצה לחיות ככה'), true);
  assert.strictEqual(one('רוצה למות מצחוק חחח'), false);
});

test('demo data produces a full report', () => {
  const r = W.analyze(demoData());
  assert.ok(r.archetype.name);
  assert.ok(r.recovery.score >= 0 && r.recovery.score <= 100);
  assert.strictEqual(r.highlights.length, 3);
  assert.strictEqual(r.cta.key, 'dad');
  assert.ok(r.language.limiting[0].count > 0);
  assert.ok(W.ARCHETYPE_KEYS.includes(r.archetype.key));
  assert.notStrictEqual(r.archetype.secondary.key, r.archetype.key);
});

test('twelve archetypes, each in both genders', () => {
  assert.strictEqual(W.ARCHETYPE_KEYS.length, 12);
  for (const key of W.ARCHETYPE_KEYS) {
    const m = W.archetypeInfo(key, { gender: 'm' }), f = W.archetypeInfo(key, { gender: 'f' });
    for (const field of ['name', 'tagline', 'desc', 'shadow', 'step']) assert.ok(m[field] && f[field], key + '.' + field);
    assert.notStrictEqual(m.name, f.name);
  }
  assert.strictEqual(W.archetypeInfo('caregiver', { gender: 'f' }).name, 'המטפלת');
  assert.strictEqual(W.archetypeInfo('nope', {}), null);
});
