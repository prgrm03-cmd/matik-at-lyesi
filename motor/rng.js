// K-01 · Seed'li rastgelelik · sahip CX-M · sözleşme v1.0-taslak

const UINT32_UST = 0x100000000;
const FNV_BASLANGIC = 0x811c9dc5;
const FNV_CARPAN = 0x01000193;

/**
 * @typedef {Object} Rng
 * @property {number} seed
 * @property {()=>number} sayi
 * @property {(min:number, max:number, adim?:number)=>number} tam
 * @property {(p?:number)=>boolean} bool
 * @property {<T>(dizi:T[])=>T} sec
 * @property {<T>(dizi:T[])=>T[]} karistir
 * @property {(etiket:string)=>Rng} alt
 * @property {(min:number, max:number, haric:number[], komsuluk:number)=>number} tamHaric
 */

/** @param {number} seed @returns {Rng} */
export function rngOlustur(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_UST) {
    throw new Error('RNG_SEED_GECERSIZ');
  }
  const sayi = mulberry32(seed);
  return {
    seed,
    sayi,
    tam(min, max, adim) {
      return tamSec(sayi, min, max, adim);
    },
    bool(p) {
      return olasilikSec(sayi, p);
    },
    sec(dizi) {
      diziDogrula(dizi, true);
      return dizi[tamSec(sayi, 0, dizi.length - 1)];
    },
    karistir(dizi) {
      return diziKaristir(sayi, dizi);
    },
    alt(etiket) {
      if (typeof etiket !== 'string') throw new Error('PARAMETRE_ARALIK_DISI');
      return rngOlustur(hash32(seed + ':' + etiket));
    },
    tamHaric(min, max, haric, komsuluk) {
      return haricSec(sayi, min, max, haric, komsuluk);
    }
  };
}

/** @param {string} metin @returns {number} */
export function hash32(metin) {
  if (typeof metin !== 'string') throw new Error('PARAMETRE_ARALIK_DISI');
  let deger = FNV_BASLANGIC;
  for (const bayt of new TextEncoder().encode(metin)) {
    deger = Math.imul(deger ^ bayt, FNV_CARPAN);
  }
  return deger >>> 0;
}

/**
 * @param {string} duzenekId
 * @param {number} tekrarSayaci
 * @param {number} zaman
 * @returns {number}
 */
export function seedUret(duzenekId, tekrarSayaci, zaman) {
  const an = zaman === undefined ? Date.now() : zaman;
  if (typeof duzenekId !== 'string' || !Number.isSafeInteger(tekrarSayaci) ||
      tekrarSayaci < 0 || !Number.isSafeInteger(an) || an < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return hash32(duzenekId + ':' + tekrarSayaci + ':' + an);
}

// Her üreticinin durumu kendi kapanışında tutulur.
function mulberry32(seed) {
  let durum = seed;
  return function sayi() {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let deger = Math.imul(durum ^ (durum >>> 15), durum | 1);
    deger ^= deger + Math.imul(deger ^ (deger >>> 7), deger | 61);
    return ((deger ^ (deger >>> 14)) >>> 0) / UINT32_UST;
  };
}

function aralikAdedi(min, max, adim) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) ||
      !Number.isSafeInteger(adim) || adim <= 0 || min > max ||
      !Number.isSafeInteger(max - min + 1)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return Math.floor((max - min) / adim) + 1;
}

function tamSec(sayi, min, max, adim) {
  const artis = adim === undefined ? 1 : adim;
  const adet = aralikAdedi(min, max, artis);
  return min + Math.floor(sayi() * adet) * artis;
}

function olasilikSec(sayi, p) {
  const olasilik = p === undefined ? 0.5 : p;
  if (!Number.isFinite(olasilik) || olasilik < 0 || olasilik > 1) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return sayi() < olasilik;
}

function diziDogrula(dizi, dolu) {
  if (!Array.isArray(dizi) || (dolu && dizi.length === 0)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function diziKaristir(sayi, dizi) {
  diziDogrula(dizi, false);
  const sonuc = dizi.slice();
  for (let i = sonuc.length - 1; i > 0; i--) {
    const j = tamSec(sayi, 0, i);
    [sonuc[i], sonuc[j]] = [sonuc[j], sonuc[i]];
  }
  return sonuc;
}

// Yasak komşuluklar birleştirilir; geniş aralık için değer dizisi oluşturulmaz.
function uygunAraliklar(min, max, haric, komsuluk) {
  const yasaklar = haric
    .map((deger) => [Math.ceil(deger - komsuluk), Math.floor(deger + komsuluk)])
    .filter(([bas, son]) => bas <= son && son >= min && bas <= max)
    .sort((a, b) => a[0] - b[0]);
  const uygun = [];
  let baslangic = min;
  for (const [bas, son] of yasaklar) {
    if (bas > baslangic) uygun.push([baslangic, Math.min(max, bas - 1)]);
    baslangic = Math.max(baslangic, son + 1);
    if (baslangic > max) break;
  }
  if (baslangic <= max) uygun.push([baslangic, max]);
  return uygun;
}

function haricSec(sayi, min, max, haric, komsuluk) {
  aralikAdedi(min, max, 1);
  diziDogrula(haric, false);
  if (!Number.isFinite(komsuluk) || komsuluk < 0 ||
      !haric.every((deger) => Number.isFinite(deger))) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const araliklar = uygunAraliklar(min, max, haric, komsuluk);
  const adet = araliklar.reduce((birikim, [bas, son]) => birikim + son - bas + 1, 0);
  if (adet === 0) throw new Error('PARAMETRE_ARALIK_DISI');
  let sira = Math.floor(sayi() * adet);
  for (const [bas, son] of araliklar) {
    const uzunluk = son - bas + 1;
    if (sira < uzunluk) return bas + sira;
    sira -= uzunluk;
  }
}
