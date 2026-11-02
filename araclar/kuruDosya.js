import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { veriDogrula } from './semaDogrula.js';
import { imzayiDogrula } from './kuruKos.js';
import { dogrula } from './seedKurallari.js';

const OLAY_TURLERI = ['bas', 'surukle', 'birak', 'tik', 'dugme', 'tus'];

/** @param {string} metin @returns {number} */
export function seedOku(metin) {
  dogrula(typeof metin === 'string' && /^\d+$/.test(metin),
    'seed', 'RNG_SEED_GECERSIZ');
  const seed = Number(metin);
  dogrula(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295,
    'seed', 'RNG_SEED_GECERSIZ');
  return seed;
}

/** @param {Object[]} olaylar @returns {Object[]} */
export function olaylariDogrula(olaylar) {
  dogrula(Array.isArray(olaylar), 'kuruOlayDizisi', 'SEMA_HATASI');
  for (const olay of olaylar) {
    dogrula(olay && OLAY_TURLERI.includes(olay.tur) &&
      Number.isFinite(olay.x) && Number.isFinite(olay.y), 'kuruOlay', 'SEMA_HATASI');
    for (const ad of ['dx', 'dy']) {
      dogrula(olay[ad] === undefined || Number.isFinite(olay[ad]), 'kuruFark', 'SEMA_HATASI');
    }
    for (const ad of ['hedef', 'dugmeId']) {
      dogrula(olay[ad] === undefined || typeof olay[ad] === 'string',
        'kuruKimlik', 'SEMA_HATASI');
    }
  }
  return olaylar;
}

async function jsonOku(yol) {
  let metin;
  try { metin = await readFile(yol, 'utf8'); } catch (hata) {
    throw Object.assign(new Error('DUZENEK_YOK'), { cause: hata });
  }
  try { return JSON.parse(metin); } catch (hata) {
    throw Object.assign(new Error('SEMA_HATASI'), { cause: hata });
  }
}

/** @param {string} yol @returns {Promise<Object[]>} */
export async function olaylariOku(yol) {
  let metin;
  try { metin = await readFile(yol, 'utf8'); } catch (hata) {
    if (hata.code === 'ENOENT') return [];
    throw Object.assign(new Error('DUZENEK_YOK'), { cause: hata });
  }
  dogrula(Buffer.byteLength(metin, 'utf8') <= 2048, 'kuruBoyutu', 'SEMA_HATASI');
  let olaylar;
  try { olaylar = JSON.parse(metin); } catch {
    throw new Error('SEMA_HATASI');
  }
  return olaylariDogrula(olaylar);
}

/** @param {string} jsYolu @param {string} jsonYolu @returns {Promise<Object>} */
export async function kuruDosyasiOku(jsYolu, jsonYolu) {
  const veri = await jsonOku(resolve(jsonYolu));
  veriDogrula(veri);
  let duzenek;
  try { duzenek = await import(pathToFileURL(resolve(jsYolu)).href); } catch (hata) {
    throw Object.assign(new Error('DUZENEK_YOK'), { cause: hata });
  }
  imzayiDogrula(duzenek, veri);
  const olaylar = await olaylariOku(resolve(jsonYolu).replace(/\.json$/, '.kuru.json'));
  return { veri, duzenek, olaylar };
}

/** @param {string} yol @returns {Promise<string[]>} */
export async function kapsamOku(yol) {
  const kapsam = await jsonOku(yol);
  dogrula(Array.isArray(kapsam) && kapsam.every(id =>
    typeof id === 'string' && /^D(0[1-9]|1[0-8])[a-f]?$/.test(id)),
  'kapsam', 'SEMA_HATASI');
  const genislet = id => id === 'D09' ? [...'abcdef'].map(ek => id + ek) :
    id === 'D10' ? ['D10a', 'D10b'] : [id];
  return [...new Set(kapsam.flatMap(genislet))];
}

/** @param {string} id @returns {string} */
export function kodBul(id) {
  if (/^D09[a-f]$/.test(id)) return 'D09';
  if (/^D10[ab]$/.test(id)) return 'D10';
  return id;
}
