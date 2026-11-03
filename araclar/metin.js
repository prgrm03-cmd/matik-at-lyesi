import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dosyalar } from './checkOrtak.js';

const YASAK = readFileSync(new URL('../docs/yasakSozcuk.txt', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).filter(Boolean);
// §9/6 ve §9/14 ayrıca denetlenir; §8.4 dosyasına sözcük eklenmez.
const DISLAMA = ['iç bükey', 'dış bükey', 'yamuk', 'paralelkenar', 'deltoid'];

function nesneMetinleri(nesne, yol) {
  return Object.entries(nesne || {}).map(([ad, deger]) => [yol + '.' + ad, deger]);
}

function secenekMetinleri(secenekler, yol) {
  if (!Array.isArray(secenekler)) return [];
  return secenekler.flatMap((deger, i) => {
    if (typeof deger === 'string') return [[yol + '.' + i, deger]];
    if (deger && typeof deger === 'object') {
      return nesneMetinleri(deger, yol + '.' + i).filter(([, oge]) => typeof oge === 'string');
    }
    return [];
  });
}

function kartMetinleri(kartlar) {
  return Object.entries(kartlar || {}).flatMap(([ad, kart]) => {
    const yol = 'kartlar.' + ad;
    const alanlar = [[yol + '.kalip', kart.kalip]];
    for (const [i, disli] of (kart.disliler || []).entries()) {
      alanlar.push(...secenekMetinleri(disli.secenekler, yol + '.disliler.' + i + '.secenekler'));
    }
    return alanlar;
  });
}

/** Öğrenci metinleri ve İ3 açıklaması; kimlikler, parametreler, notlar metin değildir. */
export function metinAlanlari(veri) {
  const alanlar = [['baslik', veri.baslik]];
  for (const ad of ['matik', 'nedenler', 'etiketler', 'yanParca']) {
    alanlar.push(...nesneMetinleri(veri[ad], ad));
  }
  for (const [i, ipucu] of (veri.ipucu || []).entries()) {
    for (const ad of ['metin', 'ne']) {
      if (Object.hasOwn(ipucu, ad)) alanlar.push(['ipucu.' + i + '.' + ad, ipucu[ad]]);
    }
  }
  for (const [i, siparis] of (veri.siparisler || []).entries()) {
    alanlar.push(['siparisler.' + i + '.metin', siparis.metin]);
  }
  for (const [i, raf] of (veri.tahminRafi || []).entries()) {
    if (Object.hasOwn(raf, 'etiket')) alanlar.push(['tahminRafi.' + i + '.etiket', raf.etiket]);
    alanlar.push(...secenekMetinleri(raf.secenekler, 'tahminRafi.' + i + '.secenekler'));
  }
  return alanlar.concat(kartMetinleri(veri.kartlar));
}

function sozcukVar(metin, sozcuk) {
  const kacisli = sozcuk.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&').replace(/ /g, '\\s+');
  const ifade = new RegExp('(^|[^\\p{L}\\p{N}_])' + kacisli + '(?=$|[^\\p{L}\\p{N}_])', 'u');
  return ifade.test(metin.toLocaleLowerCase('tr-TR'));
}

function alanBulgular(yol, metin, kilitli) {
  if (typeof metin !== 'string') return [yol + ': metin bir dizgi olmali'];
  const bulgular = [];
  const ekle = mesaj => bulgular.push(yol + ': ' + mesaj);
  if ([...metin].length > 140) ekle('140 karakter siniri');
  if (/[<>]/.test(metin)) ekle('HTML yasak');
  if (/[{}]/.test(metin.replace(/\{ad\}/g, ''))) ekle('yalniz {ad} yer tutucusu');
  if (kilitli && /\p{N}/u.test(metin)) ekle('olcu kilidinde rakam yasak');
  for (const sozcuk of YASAK.concat(DISLAMA)) {
    if (sozcukVar(metin, sozcuk)) ekle('yasak sozcuk: ' + sozcuk);
  }
  return bulgular;
}

/** @param {Veri} veri @returns {string[]} §8 ve §9 makine kuralları. */
export function metinBulgular(veri) {
  const bulgular = metinAlanlari(veri).flatMap(([yol, metin]) =>
    alanBulgular(yol, metin, veri.bayraklar?.olcuKilidi === true));
  if ((veri.id === 'D15' || veri.kod === 'D15') && JSON.stringify(veri).includes('180')) {
    bulgular.push('D15: JSON icinde 180 yasak');
  }
  return bulgular;
}

/** @param {string} kok @returns {Promise<string[]>} */
export async function metinDogrula(kok) {
  const bulgular = [];
  const yollar = dosyalar(kok, 'duzenekler').filter(yol =>
    yol.endsWith('.json') && !yol.endsWith('.kuru.json'));
  for (const yol of yollar) {
    try {
      const veri = JSON.parse(await readFile(resolve(kok, yol), 'utf8'));
      bulgular.push(...metinBulgular(veri).map(bulgu => yol + ': ' + bulgu));
    } catch (hata) {
      bulgular.push(yol + ': ' + hata.message);
    }
  }
  return bulgular;
}

async function ana() {
  const kok = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
  const bulgular = await metinDogrula(kok);
  console.log(bulgular.length ? bulgular.join('\n') : 'metin: uygun');
  if (bulgular.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ana().catch(hata => {
    console.error(hata.message);
    process.exitCode = 1;
  });
}
