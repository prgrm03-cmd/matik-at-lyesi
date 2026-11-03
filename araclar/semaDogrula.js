import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsAgaci } from './checkOrtak.js';

const sema = JSON.parse(readFileSync(new URL('../sema.json', import.meta.url), 'utf8'));
// §4.3 aynen korunur; Ajv'nin varsayılan sınıfı draft-07 doğrular.
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

function literal(dugum) {
  if (dugum?.type === 'Literal' && typeof dugum.value === 'string') return dugum.value;
  if (dugum?.type === 'TemplateLiteral' && dugum.expressions.length === 0) {
    return dugum.quasis[0].value.cooked;
  }
  return undefined;
}

function ad(dugum) {
  if (dugum?.type === 'Identifier') return dugum.name;
  return literal(dugum);
}

function uyeAdi(dugum) {
  if (dugum?.type === 'MemberExpression') {
    return dugum.computed ? literal(dugum.property) : ad(dugum.property);
  }
  return ad(dugum);
}

function ozellikAdi(dugum) {
  return dugum.computed ? literal(dugum.key) : ad(dugum.key);
}

function agaciGez(dugum, ziyaret) {
  if (!dugum || typeof dugum !== 'object') return;
  if (dugum.type) ziyaret(dugum);
  for (const [anahtar, deger] of Object.entries(dugum)) {
    if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(anahtar)) continue;
    if (Array.isArray(deger)) deger.forEach(oge => agaciGez(oge, ziyaret));
    else if (deger && typeof deger === 'object') agaciGez(deger, ziyaret);
  }
}

function anahtarBul(dugum) {
  if (dugum.type === 'Property' && ozellikAdi(dugum) === 'neden') {
    return { anahtar: literal(dugum.value), bolumler: ['nedenler'] };
  }
  if (dugum.type !== 'CallExpression' || dugum.callee.type !== 'MemberExpression') return;
  const nesne = uyeAdi(dugum.callee.object);
  const metot = uyeAdi(dugum.callee);
  if (nesne === 'matik' && metot === 'soyle') {
    return { anahtar: literal(dugum.arguments[0]), bolumler: ['matik', 'nedenler'] };
  }
  if (nesne === 'sahne' && metot === 'etiket') {
    return { anahtar: literal(dugum.arguments[1]), bolumler: ['etiketler'] };
  }
  if (nesne === 'sahne' && metot === 'dugme') {
    const ozellik = dugum.arguments[0]?.properties?.find(oge =>
      oge.type === 'Property' && ozellikAdi(oge) === 'anahtar');
    return { anahtar: literal(ozellik?.value), bolumler: ['etiketler'] };
  }
}

function surumBul(agac) {
  const sabitler = new Map();
  for (const dugum of agac.body) {
    const bildirim = dugum.type === 'ExportNamedDeclaration' ? dugum.declaration : dugum;
    if (bildirim?.type !== 'VariableDeclaration' || bildirim.kind !== 'const') continue;
    for (const oge of bildirim.declarations) sabitler.set(ad(oge.id), literal(oge.init));
  }
  for (const dugum of agac.body.filter(oge => oge.type === 'ExportNamedDeclaration')) {
    if (dugum.declaration?.declarations?.some(oge => ad(oge.id) === 'surum')) {
      return sabitler.get('surum');
    }
    const takmaAd = dugum.specifiers.find(oge => ad(oge.exported) === 'surum');
    if (takmaAd) return sabitler.get(ad(takmaAd.local));
  }
  return undefined;
}

/** @param {string} kaynak @param {Veri} veri @returns {string[]} */
export function kodVeriBulgular(kaynak, veri) {
  const agac = jsAgaci(kaynak);
  const bulgular = [];
  if (surumBul(agac) !== veri.surum) bulgular.push('surum: JS ve JSON ayni olmali');
  agaciGez(agac, dugum => {
    const bulunan = anahtarBul(dugum);
    if (!bulunan || bulunan.anahtar === undefined) return;
    const { anahtar, bolumler } = bulunan;
    if (!bolumler.some(bolum => Object.hasOwn(veri[bolum] || {}, anahtar))) {
      bulgular.push('satir ' + dugum.loc.start.line + ': ' +
        bolumler.join('/') + '.' + anahtar + ' anahtari yok');
    }
  });
  return bulgular;
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

async function eslesenKod(yol, veri) {
  const kodYolu = resolve(dirname(yol), veri.kod + '.js');
  let kaynak;
  try {
    kaynak = await readFile(kodYolu, 'utf8');
  } catch (hata) {
    // ADT-006: iskeletOlustur yalnız JSON üretir; olmayan kod henüz beklenir.
    if (hata.code === 'ENOENT') return [];
    throw hata;
  }
  return kodVeriBulgular(kaynak, veri);
}

/** @param {string} kok @returns {Promise<{dosyaSayisi:number,hatalar:Object[]}>} */
export async function semaDogrula(kok) {
  const yollar = await jsonYollari(resolve(kok, 'duzenekler'));
  const hatalar = [];
  for (const yol of yollar) {
    try {
      const veri = JSON.parse(await readFile(yol, 'utf8'));
      veriDogrula(veri);
      const bulgular = await eslesenKod(yol, veri);
      if (bulgular.length) {
        hatalar.push({ dosya: yol, kod: 'SEMA_HATASI', bulgular });
      }
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
