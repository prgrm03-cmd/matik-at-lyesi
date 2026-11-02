import { uzaklik, yonAci } from './nokta.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {'dar'|'dik'|'genis'|'dogru'|'tam'|'sifir'} AciTuru */

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function toleransDogrula(tol) {
  if (!Number.isFinite(tol) || tol < 0) throw new Error('PARAMETRE_ARALIK_DISI');
}

/** @param {number} d @returns {number} */
export function aciNormalize(d) {
  if (!Number.isFinite(d)) throw new Error('PARAMETRE_ARALIK_DISI');
  return ((d % 360) + 360) % 360;
}

/** @param {number} a @param {number} b @returns {number} */
export function aciFark(a, b) {
  const fark = Math.abs(aciNormalize(a) - aciNormalize(b));
  return Math.min(fark, 360 - fark);
}

/**
 * @param {Nokta} merkez @param {Nokta} kol1 @param {Nokta} kol2
 * @param {'saat'|'ters'} yon @returns {number}
 */
export function aciOlc(merkez, kol1, kol2, yon) {
  [merkez, kol1, kol2].forEach(noktaDogrula);
  if (!['saat', 'ters'].includes(yon) ||
      uzaklik(merkez, kol1) === 0 || uzaklik(merkez, kol2) === 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const a1 = yonAci(merkez, kol1);
  const a2 = yonAci(merkez, kol2);
  return aciNormalize(yon === 'saat' ? a2 - a1 : a1 - a2);
}

/**
 * @param {Nokta} merkez @param {number} kol1Yon @param {number} kol2Yon
 * @param {'ic'|'dis'} olcekYonu @returns {{ic:number, dis:number, dogru:'ic'|'dis'}}
 */
export function aciOku(merkez, kol1Yon, kol2Yon, olcekYonu) {
  noktaDogrula(merkez);
  if (!['ic', 'dis'].includes(olcekYonu)) throw new Error('PARAMETRE_ARALIK_DISI');
  const okunan = Math.round(aciFark(kol1Yon, kol2Yon));
  return olcekYonu === 'ic'
    ? { ic: okunan, dis: 180 - okunan, dogru: 'ic' }
    : { ic: 180 - okunan, dis: okunan, dogru: 'dis' };
}

/** @param {number} d @returns {AciTuru} */
export function aciTuru(d) {
  if (!Number.isFinite(d) || d < 0 || d > 360) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  if (d === 0) return 'sifir';
  if (d < 90) return 'dar';
  if (d === 90) return 'dik';
  if (d === 180) return 'dogru';
  if (d === 360) return 'tam';
  return 'genis';
}

/** @param {number} d @param {number} tol @returns {AciTuru} */
export function aciTuruTol(d, tol) {
  const tur = aciTuru(d);
  toleransDogrula(tol);
  if (d <= tol) return 'sifir';
  if (Math.abs(d - 90) <= tol) return 'dik';
  if (Math.abs(d - 180) <= tol) return 'dogru';
  if (Math.abs(d - 360) <= tol) return 'tam';
  return tur;
}

/** @param {number} yon1 @param {number} yon2 @param {number} tol @returns {boolean} */
export function dikMi(yon1, yon2, tol) {
  toleransDogrula(tol);
  return Math.abs(aciFark(yon1, yon2) - 90) <= tol;
}

/** @param {number} yon1 @param {number} yon2 @param {number} tol @returns {boolean} */
export function paralelMi(yon1, yon2, tol) {
  toleransDogrula(tol);
  const fark = aciFark(yon1, yon2);
  return Math.min(fark, 180 - fark) <= tol;
}
