import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { motorOrtami } from './destek/motorOrtam.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));

function duzenekKaynagi(bosTur) {
  return [
    'export const id = \'D01\';',
    'export const surum = \'1.0.0\';',
    'export function kur(ctx, seed) {',
    '  void seed;',
    '  if (ctx.tur === ' + bosTur + ') return;',
    '  ctx.durum.raf = ctx.defter.tahminRafi({',
    '    etiketAnahtari: \'raf\', hucreler: [',
    '      { ad: \'n\', tur: \'sayac\', min: 0, max: 2 },',
    '      { ad: \'yon\', tur: \'secim\', secenekler: [\'x\', \'y\'] }',
    '    ]',
    '  });',
    '}',
    'export function ciz(ctx) { void ctx; }',
    'export function girdi(ctx, olay) { void ctx; void olay; }',
    'export function ipucu(ctx, seviye) { void ctx; void seviye; return {}; }',
    'export function calistir(ctx) {',
    '  void ctx; return { sure: 0, kare() {}, bitti() {} };',
    '}',
    'export function basari(ctx) {',
    '  void ctx; return { tamam: true, yanParca: false, neden: \'tamam\' };',
    '}',
    'export function tahta(ctx, ayar) { void ctx; void ayar; }'
  ].join('\n');
}

function depoOlustur(t, bosTur) {
  const kok = mkdtempSync(join(tmpdir(), 'matik-defter-tur-'));
  t.after(() => rmSync(kok, { recursive: true, force: true }));
  writeFileSync(join(kok, 'package.json'), '{"type":"module"}\n');
  for (const dizin of ['motor', 'geo', 'widget', 'defter']) {
    cpSync(join(KOK, dizin), join(kok, dizin), { recursive: true });
  }
  mkdirSync(join(kok, 'duzenekler', 'D01'), { recursive: true });
  writeFileSync(join(kok, 'duzenekler', 'D01', 'D01.js'), duzenekKaynagi(bosTur));
  return kok;
}

async function turOrtami(t, bosTur) {
  const ortam = motorOrtami(t);
  const icerik = ortam.kok.ownerDocument.createElement('div');
  icerik.dataset.defterIcerik = '';
  ortam.ogeler.defter.append(icerik);
  ortam.veri.surum = '1.0.0';
  ortam.veri.turSayisi = 3;
  ortam.veri.bayraklar.tahminRafi = true;
  const depo = depoOlustur(t, bosTur);
  const motor = await import(pathToFileURL(join(depo, 'motor', 'motor.js')).href);
  await motor.baslat({ kok: ortam.kok, url: new URLSearchParams('seed=42') });
  const ctx = await motor.duzenekAc('D01', 42);
  assert.equal(ortam.ogeler.hata.hidden, true);
  return { ortam, icerik, motor, ctx };
}

function ogeleriBul(kok, tur) {
  return kok.children.flatMap(oge => [
    ...(oge.tagName === tur.toUpperCase() ? [oge] : []), ...ogeleriBul(oge, tur)
  ]);
}

describe('calistir', () => {
  it('başarılı turdan sonra Defter nesnesi kurulmayan turda paneli boşaltır', async t => {
    const { ortam, icerik, motor, ctx } = await turOrtami(t, 1);
    const eskiRaf = ctx.durum.raf;
    const eskiArti = ogeleriBul(icerik, 'button')[1];
    assert.equal(icerik.children.length, 1);
    eskiArti.yay('click', {});
    assert.equal(eskiRaf.deger().n, 1);
    const sonuc = await motor.calistir(ctx);
    assert.deepEqual(sonuc, { tamam: true, yanParca: false, neden: 'tamam', tur: 0 });
    assert.equal(ctx.tur, 1);
    assert.equal(ctx.durum.raf, undefined);
    assert.equal(icerik.children.length, 0);
    assert.equal(eskiArti.disabled, true);
    assert.throws(() => eskiRaf.hucreKoy('n', 2), { message: 'WIDGET_AYAR_GECERSIZ' });
    assert.equal(ortam.ogeler.hata.hidden, true);
  });

  it('başarılı turdan sonraki yeni rafı eski satırlardan ve kilitten ayırır', async t => {
    const { icerik, motor, ctx } = await turOrtami(t, -1);
    const eskiRaf = ctx.durum.raf;
    ogeleriBul(icerik, 'button')[1].yay('click', {});
    const eskiSecim = ogeleriBul(icerik, 'select')[0];
    eskiSecim.selectedIndex = 1;
    eskiSecim.yay('change', {});
    assert.deepEqual(eskiRaf.deger(), { n: 1, yon: 'y' });
    assert.equal((await motor.calistir(ctx)).tamam, true);
    assert.equal(ctx.tur, 1);
    assert.notEqual(ctx.durum.raf, eskiRaf);
    assert.equal(icerik.children.length, 1);
    assert.deepEqual(ctx.durum.raf.deger(), { n: 0, yon: 'x' });
    const dugmeler = ogeleriBul(icerik, 'button');
    const secimler = ogeleriBul(icerik, 'select');
    assert.deepEqual(dugmeler.map(dugme => dugme.disabled), [true, false]);
    assert.equal(secimler.length, 1);
    assert.equal(secimler[0].disabled, false);
    dugmeler[1].yay('click', {});
    secimler[0].selectedIndex = 1;
    secimler[0].yay('change', {});
    assert.deepEqual(ctx.durum.raf.deger(), { n: 1, yon: 'y' });
    assert.equal(eskiSecim.disabled, true);
  });
});
