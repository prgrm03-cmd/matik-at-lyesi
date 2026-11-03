import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dosyalar, jsAgaci } from '../araclar/checkOrtak.js';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const TOLERANS_ADI = /^(?:tol(?:erans)?(?:_?birim)?|hat_?birim)$/i;
const TOLERANS_ARGUMANI = {
  gecerMi: 1, dogruUzerindeMi: 2, noktalariDene: 3
};

function ad(dugum) {
  if (dugum?.type === 'Identifier') return dugum.name;
  if (dugum?.type === 'Literal') return dugum.value;
  if (dugum?.type === 'MemberExpression') return ad(dugum.property);
  return '';
}

function sayisal(dugum) {
  if (!dugum) return false;
  if (dugum.type === 'Literal') return typeof dugum.value === 'number';
  if (dugum.type === 'UnaryExpression') {
    return ['+', '-'].includes(dugum.operator) && sayisal(dugum.argument);
  }
  return dugum.type === 'BinaryExpression' && sayisal(dugum.left) && sayisal(dugum.right);
}

function sabit(dugum) {
  if (sayisal(dugum)) return true;
  if (dugum?.type === 'LogicalExpression') return sabit(dugum.right);
  return dugum?.type === 'ConditionalExpression' &&
    (sabit(dugum.consequent) || sabit(dugum.alternate));
}

function gez(dugum, islem, ust = null, islev = '') {
  if (!dugum || typeof dugum !== 'object') return;
  if (/Function/.test(dugum.type)) {
    islev = ad(dugum.id) || ad(ust?.id) || ad(ust?.key) || ad(ust?.left);
  }
  if (dugum.type) islem(dugum, islev);
  for (const [anahtar, deger] of Object.entries(dugum)) {
    if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(anahtar)) continue;
    if (Array.isArray(deger)) deger.forEach(alt => gez(alt, islem, dugum, islev));
    else if (deger && typeof deger === 'object') gez(deger, islem, dugum, islev);
  }
}

function sabitTolerans(dugum, islev) {
  const atama = {
    VariableDeclarator: [dugum.id, dugum.init],
    AssignmentExpression: [dugum.left, dugum.right],
    AssignmentPattern: [dugum.left, dugum.right],
    Property: [dugum.key, dugum.value]
  }[dugum.type];
  if (atama && TOLERANS_ADI.test(ad(atama[0])) && sabit(atama[1])) return true;
  if (TOLERANS_ADI.test(islev)) {
    if (dugum.type === 'ReturnStatement' && sabit(dugum.argument)) return true;
    if (dugum.type === 'ArrowFunctionExpression' && sabit(dugum.body)) return true;
  }
  if (dugum.type !== 'CallExpression') return false;
  const indis = TOLERANS_ARGUMANI[ad(dugum.callee)];
  return indis !== undefined && sabit(dugum.arguments[indis]);
}

// ADT-010 grep denetimi: yalnız kod taranır; yorumlar ve dizgiler kanıt sayılmaz.
function tara(kaynak, denetle) {
  const satirlar = new Set();
  gez(jsAgaci(kaynak), (dugum, islev) => {
    if (denetle(dugum, islev)) satirlar.add(dugum.loc.start.line);
  });
  return [...satirlar];
}

function pxCagrisi(dugum) {
  return dugum.type === 'CallExpression' && ad(dugum.callee) === 'pxToBirim';
}

for (const yol of ['widget/lazer.js', 'duzenekler/D02/D02.js']) {
  test('ADT-010 grep: ' + yol + ' sabit sayısal hat toleransı içermez', async t => {
    let kaynak;
    try {
      kaynak = await readFile(resolve(KOK, yol), 'utf8');
    } catch (hata) {
      if (hata.code !== 'ENOENT' || yol !== 'duzenekler/D02/D02.js') throw hata;
      t.skip('D02 main üzerinde yok; GM-D PR #6 birleşince bu denetim etkinleşir.');
      return;
    }
    assert.deepEqual(tara(kaynak, sabitTolerans), [], yol + ': sabit tolerans satırları');
  });
}

test('ADT-010 grep: duzenekler/**/*.js pxToBirim çağrısı içermez', async () => {
  const yollar = dosyalar(KOK, 'duzenekler').filter(yol => yol.endsWith('.js'));
  assert.ok(yollar.length > 0, 'Düzenek taraması boş olmamalı.');
  for (const yol of yollar) {
    const kaynak = await readFile(resolve(KOK, yol), 'utf8');
    assert.deepEqual(tara(kaynak, pxCagrisi), [], yol + ': pxToBirim çağrı satırları');
  }
});

test('ADT-010 grep sabit atama, varsayılan, dönüş ve iç içe çağrıları yakalar', () => {
  const ornekler = [
    'const tolBirim = 12;',
    'const HAT_BIRIM = 6 * 2;',
    'const ayar = { toleransBirim: 12 };',
    'ayar.hatBirim = 12;',
    'function gecerMi(noktalar, tolBirim = 12) {}',
    'function toleransBirim(ctx) { return 12; }',
    'const toleransBirim = () => 12;',
    'function toleransBirim(ctx) { return ctx.geo.TOLERANS.hatBirim || 12; }',
    'lazer.gecerMi(sensorler.map(P => ({ ...P })),\n  12);',
    'geo.dogruUzerindeMi(P, { A: nokta(1, 2), yon: 0 }, 12);',
    'noktalariDene(durum, donenIsin, noktalar, 12);'
  ];
  for (const kaynak of ornekler) {
    assert.ok(tara(kaynak, sabitTolerans).length > 0, kaynak);
  }
  const uygun = 'const tolBirim = ctx.geo.TOLERANS.hatBirim;\n' +
    '// const hatBirim = 12;\nconst aciklama = "tolBirim = 12";\n' +
    'lazer.gecerMi(sensorler, tolBirim);\nif (tolBirim < 0) reddet();\n' +
    'ctx.geo.esitMi(lazer.A, lazer.B, 1);';
  assert.deepEqual(tara(uygun, sabitTolerans), []);
});

test('ADT-010 grep çok satırlı ve köşeli pxToBirim çağrılarını yakalar', () => {
  for (const kaynak of ['ctx.sahne.pxToBirim\n(16);', 'ctx.sahne["pxToBirim"](16);']) {
    assert.ok(tara(kaynak, pxCagrisi).length > 0, kaynak);
  }
  assert.deepEqual(tara('// pxToBirim(16)\nconst not = "pxToBirim(16)";', pxCagrisi), []);
});
