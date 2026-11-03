import { tahminRafiOlustur } from './tahminRafi.js';
import { kuralKartiOlustur } from './kuralKarti.js';
import { sinaOlustur } from './sinama.js';
import { kisayolYuvasiOlustur } from './kisayolYuvasi.js';

/** @typedef {Object} DefterOrtam
 * @property {Object} [bayraklar]
 * @property {Record<string, {kalip:string}>} kartlar
 * @property {Rng} rng
 * @property {Sahne} sahne
 * @property {Matik} matik
 * @property {{defterAc:()=>void, defterKapat:()=>void}} arayuz
 * @property {(nesne:Object, tanim:DefterTanim)=>void} kayit
 */
/** @typedef {{tur:'tahminRafi', hucreler:Hucre[], etiketAnahtari:string}|
 * {tur:'kuralKarti', disliler:Disli[], kalip:string, anahtar:string}|
 * {tur:'kisayolYuvasi', kabulEdilen:string[], sensorler:string[]}} DefterTanim */
/** @typedef {Object} Defter
 * @property {(ayar:TahminRafiAyar)=>TahminRafi} tahminRafi
 * @property {(ayar:KuralKartiAyar)=>KuralKarti} kuralKarti
 * @property {(kart:KuralKarti, uretici:Uretici, n?:number)=>Promise<Sinama>} sina
 * @property {(ayar:KisayolAyar)=>KisayolYuvasi} kisayolYuvasi
 * @property {()=>void} ac
 * @property {()=>void} kapat
 */

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function izinDogrula(ortam, ad) {
  if (ortam.bayraklar?.[ad] === false) gecersiz();
}

function kaydet(ortam, nesne, tanim) {
  ortam.kayit(nesne, tanim);
  return nesne;
}

function hucreKopyala(hucre) {
  const { ad, tur } = hucre;
  if (tur === 'sayac') return { ad, tur, min: hucre.min, max: hucre.max };
  return { ad, tur, secenekler: [...hucre.secenekler] };
}

function rafiKur(ortam, ayar) {
  const raf = tahminRafiOlustur(ayar, ortam);
  return kaydet(ortam, raf, {
    tur: 'tahminRafi', hucreler: ayar.hucreler.map(hucreKopyala),
    etiketAnahtari: ayar.etiketAnahtari
  });
}

function kartFabrikasi(ortam) {
  let sayi = 0;
  return ayar => {
    const sinir = ortam.bayraklar?.kartSayisi;
    if (sinir !== undefined && sayi >= sinir) gecersiz();
    const anahtar = ayar?.kalipAnahtari;
    if (!Object.prototype.hasOwnProperty.call(ortam.kartlar ?? {}, anahtar)) gecersiz();
    const kalip = ortam.kartlar[anahtar]?.kalip;
    if (typeof kalip !== 'string') gecersiz();
    const kart = kuralKartiOlustur(ayar, { ...ortam, kalip });
    kaydet(ortam, kart, {
      tur: 'kuralKarti', kalip, anahtar,
      disliler: ayar.disliler.map(disli => ({ ad: disli.ad, secenekler: [...disli.secenekler] }))
    });
    sayi += 1;
    return kart;
  };
}

function yuvayiKur(ortam, ayar) {
  const yuva = kisayolYuvasiOlustur(ayar, ortam);
  const sok = yuva.sok;
  yuva.sok = sensor => {
    izinDogrula(ortam, 'sensorSokme');
    sok(sensor);
  };
  return kaydet(ortam, yuva, {
    tur: 'kisayolYuvasi', kabulEdilen: [...ayar.kabulEdilen], sensorler: [...ayar.sensorler]
  });
}

/** @param {DefterOrtam} ortam @returns {Defter} */
export function defterOlustur(ortam) {
  if (!ortam?.rng || !ortam.sahne || !ortam.matik) gecersiz();
  const sina = sinaOlustur(ortam);
  return {
    tahminRafi(ayar) {
      izinDogrula(ortam, 'tahminRafi');
      return rafiKur(ortam, ayar);
    },
    kuralKarti: kartFabrikasi(ortam),
    sina(kart, uretici, n) {
      izinDogrula(ortam, 'sinama');
      return sina(kart, uretici, n);
    },
    kisayolYuvasi(ayar) { return yuvayiKur(ortam, ayar); },
    ac() { ortam.arayuz.defterAc(); },
    kapat() { ortam.arayuz.defterKapat(); }
  };
}
