import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { IMZA_LISTESI, imzaDogrula, kaynakDogrula } from '../araclar/imza.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const SOZLESME = readFileSync(join(KOK, 'docs/sozlesme_v1.md'), 'utf8');

function geciciDepo(t) {
  const kok = mkdtempSync(join(tmpdir(), 'matik-imza-'));
  t.after(() => rmSync(kok, { recursive: true, force: true }));
  writeFileSync(join(kok, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(kok, 'sozlesme.md'), SOZLESME);
  for (const yol of ['geo', 'widget', 'duzenekler']) {
    cpSync(join(KOK, yol), join(kok, yol), { recursive: true });
  }
  return kok;
}

function degistir(kok, yol, degisim) {
  const dosya = join(kok, yol);
  writeFileSync(dosya, degisim(readFileSync(dosya, 'utf8')));
}

test('K-04: imza listesi sözleşme §3.2/3.3/3.4/4.1 kaynaklarıyla eşleşir', () => {
  assert.equal(IMZA_LISTESI.sozlesmeSurumu, '1.0-taslak');
  assert.equal(Object.keys(IMZA_LISTESI.duzenek).length, 9);
  assert.deepEqual(kaynakDogrula(SOZLESME), []);
  const bozuk = structuredClone(IMZA_LISTESI);
  bozuk.duzenek.kur = 1;
  bozuk.arayuzler.Pergel.acikligiAl = 1;
  const hatalar = kaynakDogrula(SOZLESME, bozuk);
  assert.ok(hatalar.some(hata => hata.includes('§4.1')));
  assert.ok(hatalar.some(hata => hata.includes('Pergel')));
});

test('K-04: mevcut D01, geo ve lazer geçer; eksik dosyalar bekleniyor', async () => {
  const sonuc = await imzaDogrula(KOK);
  assert.deepEqual(sonuc.hatalar, []);
  assert.ok(sonuc.uyarilar.includes('defter/defter.js: bekleniyor'));
});

const BOZUK_DUZENEKLER = [
  ['fazla export', kod => kod + '\nexport const fazla = 1;\n', 'fazla'],
  ['eksik export', kod => kod.replace('export function tahta', 'function tahta'), 'eksik'],
  ['yanlış length', kod => kod.replace('kur(ctx, seed)', 'kur(ctx, seed = 42)'), 'length=2'],
  ['yanlış sabit türü', kod => kod.replace("id = 'D01'", 'id = 1'), 'string'],
  ['import istisnası', kod => kod + "\nthrow new Error('KASITLI');\n", 'KASITLI']
];

for (const [ad, degisim, beklenen] of BOZUK_DUZENEKLER) {
  test('K-04: düzenek ' + ad + ' kırmızı', async t => {
    const kok = geciciDepo(t);
    degistir(kok, 'duzenekler/D01/D01.js', degisim);
    const sonuc = await imzaDogrula(kok);
    assert.ok(sonuc.hatalar.some(hata => hata.includes(beklenen)), sonuc.hatalar.join('\n'));
  });
}

test('K-04: geo fazladan export kırmızı', async t => {
  const kok = geciciDepo(t);
  degistir(kok, 'geo/index.js', kod => kod + '\nexport const fazla = 1;\n');
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('geo/index.js: fazla')));
});

test('K-04: geo işlevinin parametre sayısı kırmızı', async t => {
  const kok = geciciDepo(t);
  degistir(kok, 'geo/nokta.js', kod => kod.replace('uzaklik(P, Q)', 'uzaklik(P, Q, ek)'));
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('uzaklik imzası length=2')));
});

test('K-04: widget fazladan export kırmızı', async t => {
  const kok = geciciDepo(t);
  degistir(kok, 'widget/lazer.js', kod => kod + '\nexport const fazla = 1;\n');
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('widget/lazer.js: fazla')));
});

test('K-04: lazer nesnesinin yöntem length farkı kırmızı', async t => {
  const kok = geciciDepo(t);
  degistir(kok, 'widget/lazer.js', kod => kod.replace('hat() { return', 'hat(ek) { return'));
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('Lazer: hat imzası length=0')));
});

test('K-04: listede olmayan widget dosyası kırmızı', async t => {
  const kok = geciciDepo(t);
  const yol = join(kok, 'widget/yeni.js');
  writeFileSync(yol, 'export const yeni = 1;\n');
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('imza listesinde olmayan modül')));
});

test('K-04: yeni planlı dosyada tanımsız modül export adı sessiz kabul edilmez', async t => {
  const kok = geciciDepo(t);
  writeFileSync(join(kok, 'widget/aciTablosu.js'), 'export function aciTablosu(ayar) {}\n');
  const sonuc = await imzaDogrula(kok);
  assert.ok(sonuc.hatalar.some(hata => hata.includes('export eşlemesi için ADT gerekli')));
});
