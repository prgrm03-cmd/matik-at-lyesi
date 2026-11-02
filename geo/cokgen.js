import { uzaklik, ilerle, yonAci } from './nokta.js';
import { aciOlc, aciFark } from './aci.js';
import { kesisimParcaParca, kesisimDogruDogru } from './kesisim.js';
import { TOLERANS } from './tolerans.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{koseler:Nokta[]}} Cokgen */

const EPS = 1e-6;
const PARALEL_EPS = 1e-9;

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function cokgenDogrula(c) {
  if (!c || !Array.isArray(c.koseler) || c.koseler.length < 3) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  c.koseler.forEach(noktaDogrula);
  for (let i = 0; i < c.koseler.length; i++) {
    if (uzaklik(c.koseler[i], c.koseler[(i + 1) % c.koseler.length]) === 0) {
      throw new Error('PARAMETRE_ARALIK_DISI');
    }
  }
}

function koseDogrula(c, i) {
  if (!Number.isInteger(i) || i < 0 || i >= c.koseler.length) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function kenar(c, i) {
  return { A: c.koseler[i], B: c.koseler[(i + 1) % c.koseler.length] };
}

function donusIsareti(A, B, C) {
  const carpan = uzaklik(A, B) * uzaklik(B, C);
  return ((B.x - A.x) * (C.y - B.y) - (B.y - A.y) * (C.x - B.x)) / carpan;
}

// En soldaki üst köşe, basit çokgenin dolanım yönünü belirler.
function dolanimYonu(c) {
  let i = 0;
  c.koseler.forEach((P, j) => {
    const Q = c.koseler[i];
    if (P.x < Q.x || (P.x === Q.x && P.y < Q.y)) i = j;
  });
  const n = c.koseler.length;
  const deger = donusIsareti(c.koseler[(i + n - 1) % n], c.koseler[i],
    c.koseler[(i + 1) % n]);
  if (Math.abs(deger) <= PARALEL_EPS) throw new Error('PARAMETRE_ARALIK_DISI');
  return deger > 0 ? 'saat' : 'ters';
}

/** @param {Cokgen} c @returns {boolean} */
export function disBukeyMi(c) {
  cokgenDogrula(c);
  if (kendiniKeserMi(c)) return false;
  let isaret = 0;
  const n = c.koseler.length;
  for (let i = 0; i < n; i++) {
    const donus = donusIsareti(c.koseler[i], c.koseler[(i + 1) % n],
      c.koseler[(i + 2) % n]);
    if (Math.abs(donus) <= PARALEL_EPS) return false;
    if (isaret !== 0 && Math.sign(donus) !== isaret) return false;
    isaret = Math.sign(donus);
  }
  return true;
}

/** @param {Cokgen} c @returns {boolean} */
export function kendiniKeserMi(c) {
  cokgenDogrula(c);
  const n = c.koseler.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const kesisim = kesisimParcaParca(kenar(c, i), kenar(c, j));
      const komsu = j === i + 1 || (i === 0 && j === n - 1);
      if (komsu ? kesisim === 'cakisik' : kesisim !== null) return true;
    }
  }
  return false;
}

function icAcilarHam(c) {
  cokgenDogrula(c);
  if (kendiniKeserMi(c)) throw new Error('PARAMETRE_ARALIK_DISI');
  const yon = dolanimYonu(c);
  const n = c.koseler.length;
  return c.koseler.map((P, i) => aciOlc(P, c.koseler[(i + 1) % n],
    c.koseler[(i + n - 1) % n], yon));
}

/** @param {Cokgen} c @returns {number[]} */
export function icAcilar(c) {
  return icAcilarHam(c).map((aci) => Math.round(aci));
}

/** @param {Cokgen} c @param {number} i @returns {number} */
export function disAci(c, i) {
  cokgenDogrula(c);
  koseDogrula(c, i);
  return Math.round(180 - icAcilarHam(c)[i]);
}

/** @param {Cokgen} c @param {number} i @param {number} j @returns {boolean} */
export function komsuMu(c, i, j) {
  cokgenDogrula(c);
  koseDogrula(c, i);
  koseDogrula(c, j);
  const fark = Math.abs(i - j);
  return fark === 1 || fark === c.koseler.length - 1;
}

/** @param {Cokgen} c @param {number} tolAci @param {number} tolOran @returns {boolean} */
export function duzgunMu(c, tolAci, tolOran) {
  if (!Number.isFinite(tolAci) || tolAci < 0 ||
      !Number.isFinite(tolOran) || tolOran < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  if (!disBukeyMi(c)) return false;
  const kenarlar = c.koseler.map((P, i) => uzaklik(P, kenar(c, i).B));
  const acilar = icAcilarHam(c);
  const enUzun = Math.max(...kenarlar);
  return enUzun - Math.min(...kenarlar) <= enUzun * tolOran + EPS &&
    Math.max(...acilar) - Math.min(...acilar) <= tolAci + EPS;
}

/** @param {number} aci1 @param {number} aci2 @returns {boolean} */
export function ucgenKapanir(aci1, aci2) {
  if (!Number.isFinite(aci1) || !Number.isFinite(aci2)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return aci1 + aci2 < 180;
}

function ucgenKenarlariniDogrula(kenarlar) {
  if (!Array.isArray(kenarlar) || kenarlar.length !== 3 ||
      !kenarlar.every((kenar) => Number.isFinite(kenar) && kenar > 0)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const sirali = kenarlar.slice().sort((a, b) => a - b);
  if (sirali[0] <= sirali[2] - sirali[1]) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return sirali;
}

function ucgenKenarTuru(kenarlar) {
  const tol = TOLERANS.uzunlukOran * kenarlar[2];
  const birinci = kenarlar[1] - kenarlar[0] <= tol;
  const ikinci = kenarlar[2] - kenarlar[1] <= tol;
  if (kenarlar[2] - kenarlar[0] <= tol) return 'eskenar';
  return birinci || ikinci ? 'ikizkenar' : 'cesitkenar';
}

// İki ışının kesişimi üçüncü köşeyi verir; açı bu köşede ölçülür.
function ucgenBuyukAcisi(kenarlar) {
  const [kisa, orta, taban] = kenarlar;
  const xOran = (1 + (orta / taban) ** 2 - (kisa / taban) ** 2) / 2;
  const hOran = Math.sqrt(Math.max(0, (orta / taban) ** 2 - xOran ** 2));
  if (hOran === 0) throw new Error('PARAMETRE_ARALIK_DISI');
  const B = { x: 0, y: 0 };
  const C = ilerle(B, 0, taban);
  const tahmin = { x: xOran * taban, y: -hOran * taban };
  const A = kesisimDogruDogru(
    { A: B, yon: yonAci(B, tahmin) },
    { A: C, yon: yonAci(C, tahmin) }
  );
  if (!A || A === 'cakisik') throw new Error('PARAMETRE_ARALIK_DISI');
  return aciFark(yonAci(A, B), yonAci(A, C));
}

/**
 * @param {number[]} kenarlar
 * @returns {{kenar:'cesitkenar'|'ikizkenar'|'eskenar', aci:'dar'|'dik'|'genis'}}
 */
export function ucgenTuru(kenarlar) {
  const sirali = ucgenKenarlariniDogrula(kenarlar);
  const aci = ucgenBuyukAcisi(sirali);
  const tur = Math.abs(aci - 90) <= TOLERANS.dikme + EPS ? 'dik' :
    aci > 90 + TOLERANS.dikme ? 'genis' : 'dar';
  return { kenar: ucgenKenarTuru(sirali), aci: tur };
}

/**
 * @param {Nokta[]} noktalar
 * @param {Nokta} merkez
 * @param {number} derece
 * @param {boolean} ayna
 * @returns {Nokta[]}
 */
export function sekliDondur(noktalar, merkez, derece, ayna) {
  if (!Array.isArray(noktalar) || !Number.isFinite(derece) || typeof ayna !== 'boolean') {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  noktaDogrula(merkez);
  return noktalar.map((P) => {
    noktaDogrula(P);
    const Q = { x: ayna ? 2 * merkez.x - P.x : P.x, y: P.y };
    const uzunluk = uzaklik(merkez, Q);
    if (uzunluk === 0) return { x: merkez.x, y: merkez.y };
    return ilerle(merkez, yonAci(merkez, Q) + derece, uzunluk);
  });
}
