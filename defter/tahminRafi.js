/** @typedef {{ad:string, tur:'sayac', min:number, max:number}|
 * {ad:string, tur:'secim', secenekler:string[]}} Hucre */
/** @typedef {{hucreler:Hucre[], etiketAnahtari:string}} TahminRafiAyar */
/** @typedef {Object} TahminRafi
 * @property {()=>Record<string, number|string>} deger
 * @property {(ad:string, deger:number|string)=>void} hucreKoy
 * @property {()=>void} kilitle
 * @property {(sonuc:Record<string, number|string>)=>void} sonucKoy
 * @property {()=>{eslesen:string[], farkli:string[]}} karsilastir
 */
/** @typedef {import('./defter.js').DefterOrtam} DefterOrtam */

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function hucreDogrula(hucre) {
  if (!hucre || typeof hucre.ad !== 'string') gecersiz();
  if (hucre.tur === 'sayac') {
    if (!Number.isFinite(hucre.min) || !Number.isFinite(hucre.max) ||
        hucre.min > hucre.max) gecersiz();
    return { ad: hucre.ad, tur: hucre.tur, min: hucre.min, max: hucre.max };
  }
  if (hucre.tur !== 'secim' || !Array.isArray(hucre.secenekler) ||
      hucre.secenekler.length === 0 ||
      ![...hucre.secenekler].every(deger => typeof deger === 'string')) gecersiz();
  return { ad: hucre.ad, tur: hucre.tur, secenekler: [...hucre.secenekler] };
}

function ayarDogrula(ayar, ortam) {
  if (!ortam?.rng || !ortam.sahne || !ortam.matik) gecersiz();
  if (!ayar || !Array.isArray(ayar.hucreler) ||
      typeof ayar.etiketAnahtari !== 'string') gecersiz();
  const hucreler = [...ayar.hucreler].map(hucreDogrula);
  if (new Set(hucreler.map(hucre => hucre.ad)).size !== hucreler.length) gecersiz();
  return hucreler;
}

function degerDogrula(hucre, deger) {
  if (!hucre) gecersiz();
  if (hucre.tur === 'sayac') {
    if (!Number.isInteger(deger) || deger < hucre.min || deger > hucre.max) gecersiz();
  } else if (!hucre.secenekler.includes(deger)) gecersiz();
}

function karsilastir(hucreler, degerler, sonuc) {
  const eslesen = [];
  const farkli = [];
  for (const { ad } of hucreler) {
    const hedef = sonuc !== null && degerler.get(ad) === sonuc[ad] ? eslesen : farkli;
    hedef.push(ad);
  }
  return { eslesen, farkli };
}

/** @param {TahminRafiAyar} ayar @param {DefterOrtam} ortam @returns {TahminRafi} */
export function tahminRafiOlustur(ayar, ortam) {
  const hucreler = ayarDogrula(ayar, ortam);
  const adlar = new Map(hucreler.map(hucre => [hucre.ad, hucre]));
  const degerler = new Map(hucreler.map(hucre =>
    [hucre.ad, hucre.tur === 'sayac' ? hucre.min : hucre.secenekler[0]]));
  let kilit = false;
  let sonuc = null;
  return {
    deger() { return Object.fromEntries(degerler); },
    hucreKoy(ad, deger) {
      if (kilit) gecersiz();
      degerDogrula(adlar.get(ad), deger);
      degerler.set(ad, deger);
    },
    kilitle() { kilit = true; },
    sonucKoy(yeni) { sonuc = { ...yeni }; },
    karsilastir() { return karsilastir(hucreler, degerler, sonuc); }
  };
}
