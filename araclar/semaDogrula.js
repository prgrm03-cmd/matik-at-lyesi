import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sema = JSON.parse(readFileSync(new URL('../sema.json', import.meta.url), 'utf8'));
// §4.3 aynen korunur; boş properties ve tuple biçimi Ajv strict uyarısı üretmemeli.
const dogrula = new Ajv({ allErrors: true, strict: false }).compile(sema);

function caprazBulgular(veri) {
  const bulgular = [];
  const bayrak = veri.bayraklar;
  if (bayrak.kartSayisi !== Object.keys(veri.kartlar || {}).length) {
    bulgular.push('bayraklar.kartSayisi: kartlar');
  }
  if (bayrak.sinama && bayrak.kartSayisi < 1) {
    bulgular.push('bayraklar.sinama: kartSayisi');
  }
  if (bayrak.olcuKilidi && bayrak.aciolcerGorunur) {
    bulgular.push('bayraklar.olcuKilidi: aciolcerGorunur');
  }
  return bulgular;
}

/** @param {Veri} veri @returns {boolean} Ajv ve §4.3 çapraz kuralları. */
export function veriDogrula(veri) {
  const uygun = dogrula(veri);
  const bulgular = uygun ? caprazBulgular(veri) : dogrula.errors.map(hata => ({
    yol: hata.instancePath, kural: hata.keyword, ayrinti: hata.params
  }));
  if (bulgular.length) {
    const hata = new Error('SEMA_HATASI');
    hata.bulgular = bulgular;
    throw hata;
  }
  return true;
}

async function jsonYollari(klasor) {
  const yollar = [];
  for (const girdi of await readdir(klasor, { withFileTypes: true })) {
    const yol = resolve(klasor, girdi.name);
    if (girdi.isDirectory()) yollar.push(...await jsonYollari(yol));
    else if (girdi.isFile() && girdi.name.endsWith('.json') &&
      !girdi.name.endsWith('.kuru.json')) yollar.push(yol);
  }
  return yollar.sort();
}

/** @param {string} kok @returns {Promise<{dosyaSayisi:number,hatalar:Object[]}>} */
export async function semaDogrula(kok) {
  const yollar = await jsonYollari(resolve(kok, 'duzenekler'));
  const hatalar = [];
  for (const yol of yollar) {
    try {
      veriDogrula(JSON.parse(await readFile(yol, 'utf8')));
    } catch (hata) {
      hatalar.push({
        dosya: yol, kod: 'SEMA_HATASI', bulgular: hata.bulgular || [hata.message]
      });
    }
  }
  return { dosyaSayisi: yollar.length, hatalar };
}

async function ana() {
  const kok = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
  const sonuc = await semaDogrula(kok);
  console.log(JSON.stringify(sonuc, null, 2));
  if (sonuc.hatalar.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ana().catch(hata => {
    console.error(hata.message);
    process.exitCode = 1;
  });
}
