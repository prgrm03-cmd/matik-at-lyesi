import { ilerle, uzaklik, yonAci } from './nokta.js';
import { aciNormalize } from './aci.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{merkez:Nokta, r:number}} Cember */
/** @typedef {{merkez:Nokta, r:number, bas:number, bit:number, yon:'saat'|'ters'}} Yay */
const EPS = 1e-6;

function cemberDogrula(c) {
  if (!c || !c.merkez || !Number.isFinite(c.merkez.x) ||
      !Number.isFinite(c.merkez.y) || !Number.isFinite(c.r) || c.r <= 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

/** @param {Nokta} P @param {Cember} c @param {number} tolOran @returns {boolean} */
export function cemberUzerindeMi(P, c, tolOran) {
  cemberDogrula(c);
  noktaDogrula(P);
  if (!Number.isFinite(tolOran) || tolOran < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return Math.abs(uzaklik(P, c.merkez) - c.r) <= c.r * tolOran;
}

/** @param {Nokta} P @param {Cember} c @returns {boolean} */
export function cemberIcindeMi(P, c) {
  cemberDogrula(c);
  noktaDogrula(P);
  return uzaklik(P, c.merkez) < c.r;
}

/** @param {Nokta} P @param {Yay} y @param {number} tolOran @returns {boolean} */
export function yayUzerindeMi(P, y, tolOran) {
  cemberDogrula(y);
  if (!Number.isFinite(y.bas) || !Number.isFinite(y.bit) ||
      !['saat', 'ters'].includes(y.yon)) throw new Error('PARAMETRE_ARALIK_DISI');
  if (!cemberUzerindeMi(P, y, tolOran)) return false;
  const baslangic = ilerle(y.merkez, y.bas, y.r);
  const bitis = ilerle(y.merkez, y.bit, y.r);
  const noktaYonu = yonAci(y.merkez, P);
  const izdusen = ilerle(y.merkez, noktaYonu, y.r);
  if (uzaklik(izdusen, baslangic) <= EPS || uzaklik(izdusen, bitis) <= EPS) return true;
  const isaret = y.yon === 'saat' ? 1 : -1;
  const aciklik = aciNormalize(isaret * (y.bit - y.bas));
  const konum = aciNormalize(isaret * (noktaYonu - y.bas));
  return konum <= aciklik;
}
