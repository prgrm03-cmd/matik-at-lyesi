import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dosyalar, dogrudan, jsAgaci, raporla } from './checkOrtak.js';

const UYGULAMA = /^(?:main\.js$|(?:duzenekler|motor|geo|widget|defter)\/.*\.js$)/;
const DIZGI_KURALLARI = [
  ['depolama dizgisi', /\b(?:localStorage|sessionStorage|indexedDB)\b/],
  ['iç modül yolu', /(?:^|\/)(?:geo|motor|defter|widget)\//],
  ['Türkçe literal', /[çğıöşüÇĞİÖŞÜ]/],
  ['üç veya daha çok sözcük', /\S+(?:\s+\S+){2,}/],
  ['hex renk', /#[a-f\d]{6}\b/i],
  ['rgb renk', /\brgb\s*\(/i]
];
const DOM_UYE = new RegExp('^(?:document|window|navigator|canvas|getContext|' +
  'CanvasRenderingContext2D|Path2D|querySelector|getElementById|addEventListener|' +
  'requestAnimationFrame|performance)$');
const SOZCUKLER = /^(?:console|querySelector|sekliDondur)$/;

function gez(dugum, islem) {
  if (!dugum || typeof dugum !== 'object') return;
  if (dugum.type) islem(dugum);
  for (const [ad, deger] of Object.entries(dugum)) {
    if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(ad)) continue;
    if (Array.isArray(deger)) deger.forEach(cocuk => gez(cocuk, islem));
    else if (deger && typeof deger === 'object') gez(deger, islem);
  }
}

function dizgi(dugum) {
  if (dugum.type === 'Literal' && typeof dugum.value === 'string') return dugum.value;
  if (dugum.type === 'TemplateElement') return dugum.value.cooked ?? dugum.value.raw;
  return null;
}

function uyeAdi(dugum) {
  if (dugum.type !== 'MemberExpression') return null;
  if (!dugum.computed) return dugum.property.name;
  if (dugum.property.type === 'Literal') return dugum.property.value;
  const p = dugum.property;
  if (p.type === 'TemplateLiteral' && p.expressions.length === 0) {
    return p.quasis[0].value.cooked;
  }
  return null;
}

function dugumDogrula(dugum, yol, ekle) {
  const metin = dizgi(dugum);
  const duzenek = yol.startsWith('duzenekler/');
  if (metin !== null && yol !== 'motor/kayit.js' && /\blocalStorage\b/.test(metin)) {
    ekle(dugum, 'localStorage yalnız motor/kayit.js içinde olabilir');
  }
  const ad = uyeAdi(dugum);
  const domYasak = duzenek || yol.startsWith('geo/');
  if (domYasak && typeof ad === 'string' && DOM_UYE.test(ad)) {
    ekle(dugum, 'DOM erişimi: ' + ad);
  }
  if (!duzenek) return;
  if (typeof ad === 'string' && SOZCUKLER.test(ad)) ekle(dugum, ad);
  if (metin !== null) {
    for (const [ad, desen] of DIZGI_KURALLARI) {
      if (desen.test(metin)) ekle(dugum, ad);
    }
  }
  if (dugum.type === 'Identifier' && SOZCUKLER.test(dugum.name)) {
    ekle(dugum, dugum.name);
  }
  if (metin !== null && SOZCUKLER.test(metin)) ekle(dugum, metin);
}

/** @param {string} kok @returns {Promise<string[]>} Yorumlar dışında regex kanıt taraması. */
export async function yasakDogrula(kok) {
  const bulgular = new Set();
  for (const yol of await dosyalar(kok)) {
    if (!UYGULAMA.test(yol)) continue;
    const kaynak = readFileSync(resolve(kok, yol), 'utf8');
    const ekle = (node, ad) => bulgular.add(yol + ':' + node.loc.start.line + ': ' + ad);
    try {
      gez(jsAgaci(kaynak), dugum => dugumDogrula(dugum, yol, ekle));
    } catch (hata) {
      bulgular.add(yol + ': ayrıştırma hatası: ' + hata.message);
    }
  }
  return [...bulgular];
}

if (dogrudan(import.meta.url)) {
  const kok = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
  yasakDogrula(kok).then(raporla).catch(hata => raporla([hata.message]));
}