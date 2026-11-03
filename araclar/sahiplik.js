import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { dogrudan, raporla } from './checkOrtak.js';

const DUZENEK_SAHIPLERI = {
  'CX-M': ['D01'],
  'CX-A': ['D09'],
  'CX-Z': ['D08', 'D11', 'D12', 'D12b', 'D13', 'D16', 'D17', 'D18'],
  'GM-D': ['D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D10', 'D10b', 'D14', 'D15']
};

function git(kok, ...arg) {
  const ayar = { cwd: kok, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  return execFileSync('git', arg, ayar);
}

/** §7.1: gm/ altında cihaz biletleri ile düzenek biletleri ayrı sahiplerdir. */
export function dalAjani(dal) {
  if (dal === 'main') return 'main';
  if (/^gm\/G-T/.test(dal)) return 'GM-T';
  if (/^gm\/G-E/.test(dal)) return 'GM-E';
  const onekler = {
    'cx-m/': 'CX-M', 'cx-a/': 'CX-A', 'cx-z/': 'CX-Z',
    'gm/': 'GM-D', 'm/': 'Matematikce', 'sozlesme/': 'Fable'
  };
  return Object.entries(onekler).find(([onek]) => dal.startsWith(onek))?.[1] || null;
}

function metinAlani(yol) {
  return /^(baslik|notlar)$/.test(yol) ||
    /^(matik|nedenler|etiketler)\.[^.]+$/.test(yol) ||
    /^ipucu\.\d+\.(metin|ne)$/.test(yol) ||
    /^siparisler\.\d+\.metin$/.test(yol) ||
    /^tahminRafi\.\d+\.etiket$/.test(yol) ||
    /^yanParca\.(metin|basari)$/.test(yol);
}

function teknikVeri(deger, yol = '') {
  if (typeof deger === 'string' && /^kartlar\.[^.]+\.kalip$/.test(yol)) {
    return deger.match(/\[[^\]]+\]/g) || [];
  }
  if (typeof deger === 'string' && metinAlani(yol)) return undefined;
  if (Array.isArray(deger)) {
    return deger.map((oge, i) => teknikVeri(oge, yol + '.' + i));
  }
  if (deger && typeof deger === 'object') {
    const sonuc = {};
    for (const ad of Object.keys(deger).sort()) {
      const alt = teknikVeri(deger[ad], yol ? yol + '.' + ad : ad);
      if (alt !== undefined) sonuc[ad] = alt;
    }
    return sonuc;
  }
  return deger;
}

/** R1 yalnız tanımlı metin yapraklarını değiştirir; teknik veri korunur. */
export function yalnizMetinMi(once, sonra) {
  return JSON.stringify(teknikVeri(once)) === JSON.stringify(teknikVeri(sonra));
}

function matematikceYolu(yol) {
  return /^(varlik\/|docs\/(biletler(?:\/|_|\.|$)|adt\/|degisiklik\.md$))/.test(yol) ||
    ['butce.csv', 'docs/butce.csv', 'docs/yasakSozcuk.txt'].includes(yol);
}

/** §2.1 ve K-04 Fable eki; check raporları bütün teslim sahiplerine açıktır. */
export function yolYetkisi(ajan, yol) {
  if (yol.startsWith('docs/check/')) return ajan !== null && ajan !== 'main';
  if (['sozlesme.md', 'docs/sozlesme_v1.md'].includes(yol)) return ajan === 'Fable';
  if (ajan === 'Matematikce') return matematikceYolu(yol);
  if (ajan === 'GM-T' || ajan === 'GM-E') {
    return yol === 'test.html' || yol.startsWith('docs/cihaz/');
  }
  if (yol === 'widget/aciolcer.js') return ajan === 'CX-A';
  if (yol === 'test/aciolcer.test.js') return ajan === 'CX-A';
  const duzenek = /^duzenekler\/([^/]+)\//.exec(yol)?.[1];
  if (duzenek) return DUZENEK_SAHIPLERI[ajan]?.includes(duzenek) || false;
  if (ajan !== 'CX-M') return false;
  return /^(motor|geo|widget|defter|stil|araclar|test)\//.test(yol) ||
    yol.startsWith('.github/workflows/') ||
    ['iskelet.js', 'sema.json', 'package.json', 'package-lock.json', 'index.html',
      'main.js', '.gitignore', 'docs/hatalar.md', 'docs/yasakSozcuk.txt',
      'docs/kapsam.json'].includes(yol);
}

function jsonMetinYetkisi(kok, taban, yol) {
  if (!/^duzenekler\/.*\.json$/.test(yol) || yol.endsWith('.kuru.json')) return false;
  try {
    const once = JSON.parse(git(kok, 'show', taban + ':' + yol));
    const sonra = JSON.parse(git(kok, 'show', 'HEAD:' + yol));
    return yalnizMetinMi(once, sonra);
  } catch {
    return false;
  }
}

function dalBul(kok, ortam) {
  if (ortam.GITHUB_HEAD_REF) return ortam.GITHUB_HEAD_REF;
  if (ortam.GITHUB_REF_TYPE === 'branch' && ortam.GITHUB_REF_NAME) {
    return ortam.GITHUB_REF_NAME;
  }
  return git(kok, 'symbolic-ref', '--short', 'HEAD').trim();
}

function imzaNotu(dosyalar, ortam, sonuc) {
  if (!dosyalar.includes('araclar/imzaListesi.json')) return;
  if (!ortam.PR_BODY?.trim()) {
    sonuc.uyarilar.push('PR gövdesi yok; imzaListesi ADT- denetimi CI/PR üzerinde bekleniyor.');
  } else if (!/ADT-/.test(ortam.PR_BODY)) {
    sonuc.hatalar.push('araclar/imzaListesi.json: PR gövdesinde ADT- bulunmalı.');
  }
}

/** main...HEAD karşılaştırması yalnız commit edilmiş teslimi denetler. */
export function sahiplikDogrula(kok = process.cwd(), ortam = process.env) {
  const sonuc = { ajan: null, dal: '', dosyalar: [], hatalar: [], uyarilar: [] };
  try {
    sonuc.dal = dalBul(kok, ortam);
    sonuc.ajan = dalAjani(sonuc.dal);
    const taban = git(kok, 'merge-base', 'main', 'HEAD').trim();
    sonuc.dosyalar = git(kok, 'diff', '--name-only', '--no-renames', '-z', 'main...HEAD')
      .split('\0').filter(Boolean);
    if (!sonuc.ajan) sonuc.hatalar.push('Bilinmeyen dal öneki: ' + sonuc.dal);
    for (const yol of sonuc.dosyalar) {
      const metin = sonuc.ajan === 'Matematikce' && jsonMetinYetkisi(kok, taban, yol);
      if (!metin && !yolYetkisi(sonuc.ajan, yol)) {
        sonuc.hatalar.push(yol + ': ' + (sonuc.ajan || '?') + ' yetkili değil.');
      }
    }
    imzaNotu(sonuc.dosyalar, ortam, sonuc);
  } catch (hata) {
    sonuc.hatalar.push('Git sahiplik denetimi çalışmadı: ' + hata.message.split('\n')[0]);
  }
  return sonuc;
}

if (dogrudan(import.meta.url)) {
  const sonuc = sahiplikDogrula(resolve(process.argv[2] || '.'));
  for (const uyari of sonuc.uyarilar) console.log('⚠ ' + uyari);
  raporla(sonuc.hatalar);
}
