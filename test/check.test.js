import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import ayar from '../araclar/lint.config.js';
import { yasakDogrula } from '../araclar/yasak.js';

async function ornek(t, yol, kaynak) {
  const kok = await mkdtemp(join(tmpdir(), 'matik-check-'));
  t.after(() => rm(kok, { recursive: true, force: true }));
  const dosya = join(kok, yol);
  await mkdir(dirname(dosya), { recursive: true });
  await writeFile(dosya, kaynak + '\n');
  const lint = new ESLint({ cwd: kok, overrideConfigFile: true, overrideConfig: ayar });
  const sonuclar = await lint.lintFiles([dosya]);
  const hatalar = sonuclar.flatMap(sonuc => sonuc.messages.filter(m => m.severity === 2));
  return { hatalar, yasaklar: await yasakDogrula(kok) };
}

const REDLER = [
  ['Math.random', 'void Math.random();'],
  ['localStorage dizgisi', "const x = 'localStorage'; void x;"],
  ['document', 'void document;'],
  ['import', "import { x } from './ornek.js'; void x;"],
  ['setTimeout', 'setTimeout(() => {}, 1);'],
  ['console.log', "console.log('x');"],
  ['hex renk', "const x = '#ff0000'; void x;"],
  ['Türkçe literal', "const x = 'ışık'; void x;"],
  ['modül let', 'let x = 0; x++; void x;'],
  ['geo yolu', "const x = '/geo/nokta.js'; void x;"],
  ['motor yolu', "const x = '../motor/rng.js'; void x;"],
  ['defter yolu', "const x = '/defter/defter.js'; void x;"],
  ['widget yolu', "const x = '/widget/lazer.js'; void x;"],
  ['dolaylı belge', "void window['document'];"],
  ['dinamik import', "void import('./ornek.js');"],
  ['yeniden export', "export { x } from './ornek.js';"],
  ['yıldız export', "export * from './ornek.js';"],
  ['require', "void require('x');"],
  ['fetch', "void fetch('x');"],
  ['sessionStorage', 'void sessionStorage;'],
  ['indexedDB', 'void indexedDB;'],
  ['document.cookie', 'void document.cookie;'],
  ['canvas', 'const canvas = {}; void canvas;'],
  ['getContext', "export function kur(ctx) { ctx.getContext('2d'); }"],
  ['Path2D', 'void new Path2D();'],
  ['zaman', 'void Date.now();'],
  ['performance', 'void performance.now();'],
  ['setInterval', 'setInterval(() => {}, 1);'],
  ['requestAnimationFrame', 'requestAnimationFrame(() => {});'],
  ['eval', "eval('x');"],
  ['Function', "void new Function('return 1');"],
  ['innerHTML', "export function kur(ctx) { ctx.innerHTML = 'x'; }"],
  ['üç sözcük', "const x = 'bir iki uc'; void x;"],
  ['rgb renk', "const x = 'rgb(1,2,3)'; void x;"],
  ['querySelector', "export function kur(ctx) { ctx.querySelector('x'); }"],
  ['sekliDondur', 'export function kur(ctx) { ctx.geo.sekliDondur([]); }'],
  ['modül blok let', '{ let x = 0; x++; }'],
  ['modül export let', 'export let x = 0;'],
  ['veri atama', 'export function kur(ctx) { ctx.veri.x = 1; }'],
  ['veri alt atama', 'export function kur(ctx) { ctx.veri.x.y = 1; }'],
  ['veri artırma', 'export function kur(ctx) { ctx.veri.x++; }'],
  ['veri silme', 'export function kur(ctx) { delete ctx.veri.x; }'],
  ['veri assign', 'export function kur(ctx) { Object.assign(ctx.veri, {}); }'],
  ['kaçışlı literal', "const x = '\\u00e7'; void x;"],
  ['kaçışlı renk', "const x = '\\x23ff0000'; void x;"],
  ['kaçışlı depolama', "const x = 'local\\u0053torage'; void x;"]
];

describe('K-04 yasak kanıtları', () => {
  for (const [ad, kaynak] of REDLER) {
    it(ad + ' geçici düzenek dosyasında kırmızı olur.', async t => {
      const sonuc = await ornek(t, 'duzenekler/D99/D99.js', kaynak);
      assert.ok(sonuc.hatalar.length + sonuc.yasaklar.length > 0, ad);
    });
  }

  it('geo dosyasında document kırmızıdır.', async t => {
    const sonuc = await ornek(t, 'geo/ornek.js', 'void document;');
    assert.ok(sonuc.hatalar.length > 0);
  });

  it('Hesaplanan DOM özellikleri lint ve yasak ile ayrı ayrı kırmızıdır.', async t => {
    const tirnak = String.fromCharCode(96);
    const ornekler = [
      ['duzenekler/D99/D99.js', "void window['document'];"],
      ['geo/x.js', "void globalThis['document'];"],
      ['geo/x.js', 'void globalThis[' + tirnak + 'document' + tirnak + '];']
    ];
    for (const [yol, kaynak] of ornekler) {
      const sonuc = await ornek(t, yol, kaynak);
      assert.ok(sonuc.hatalar.length > 0, yol);
      assert.ok(sonuc.yasaklar.length > 0, yol);
    }
  });

  it('geo kendi göreli modülünü alabilir, dış modül alamaz.', async t => {
    const iyi = "import { x } from './nokta.js'; void x;";
    const kotu = "import { x } from '../motor/x.js'; void x;";
    assert.deepEqual(await ornek(t, 'geo/x.js', iyi), { hatalar: [], yasaklar: [] });
    assert.ok((await ornek(t, 'geo/x.js', kotu)).hatalar.length > 0);
    const dolayli = "import { x } from './../motor/x.js'; void x;";
    assert.ok((await ornek(t, 'geo/x.js', dolayli)).hatalar.length > 0);
  });

  it('motor/x.js depolama erişimi kırmızıdır.', async t => {
    const sonuc = await ornek(t, 'motor/x.js', 'void globalThis.localStorage;');
    assert.ok(sonuc.hatalar.length > 0);
  });

  it('motor/x.js depolama dizgisi kırmızıdır.', async t => {
    const sonuc = await ornek(t, 'motor/x.js', "const x = 'localStorage'; void x;");
    assert.ok(sonuc.yasaklar.length > 0);
  });

  it('motor/kayit.js depolama erişimi yeşildir.', async t => {
    const kaynak = "void globalThis.localStorage.getItem('matik.atolye.tema1');";
    const sonuc = await ornek(t, 'motor/kayit.js', kaynak);
    assert.deepEqual(sonuc, { hatalar: [], yasaklar: [] });
  });

  it('Türkçe yorum ve izinli anahtar/renk yeşildir.', async t => {
    const kaynak = "// Işık üç kez yanar. localStorage #ff0000\n" +
      "export function kur(ctx) { ctx.matik.soyle('giris'); ctx.durum.renk = 'mavi'; }";
    const sonuc = await ornek(t, 'duzenekler/D99/D99.js', kaynak);
    assert.deepEqual(sonuc, { hatalar: [], yasaklar: [] });
  });

  it('İşlev içindeki değişebilir yerel let yeşildir.', async t => {
    const kaynak = 'export function kur(ctx) { let x = 0; x++; ctx.durum.x = x; }';
    const sonuc = await ornek(t, 'duzenekler/D99/D99.js', kaynak);
    assert.deepEqual(sonuc, { hatalar: [], yasaklar: [] });
  });

  it('Şablon literal içindeki renk kırmızıdır.', async t => {
    const tirnak = String.fromCharCode(96);
    const kaynak = 'const x = ' + tirnak + '#ff0000' + tirnak + '; void x;';
    const sonuc = await ornek(t, 'duzenekler/D99/D99.js', kaynak);
    assert.ok(sonuc.yasaklar.length > 0);
  });

  it('Math.PI yalnız geo/aci.js için yeşildir.', async t => {
    const yesil = await ornek(t, 'geo/aci.js', 'export const x = Math.PI;');
    const kirmizi = await ornek(t, 'geo/x.js', 'export const x = Math.PI;');
    assert.deepEqual(yesil, { hatalar: [], yasaklar: [] });
    assert.ok(kirmizi.hatalar.length > 0);
  });

  it('getContext yalnız sahne/giris dosyalarında yeşildir.', async t => {
    const kaynak = "export function oku(x) { return x.getContext('2d'); }";
    for (const yol of ['motor/sahne.js', 'motor/giris.js']) {
      assert.deepEqual(await ornek(t, yol, kaynak), { hatalar: [], yasaklar: [] });
    }
    assert.ok((await ornek(t, 'motor/x.js', kaynak)).hatalar.length > 0);
  });

  it('Lint kapatma yorumu yasağı susturamaz.', async t => {
    const sonuc = await ornek(t, 'duzenekler/D99/D99.js',
      '/* eslint-disable */\nvoid document;');
    assert.ok(sonuc.hatalar.length > 0);
  });
});
