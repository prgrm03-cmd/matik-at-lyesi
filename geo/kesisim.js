import { ilerle, uzaklik } from './nokta.js';
import { noktaDogruUzakligi } from './dogru.js';
import { yayUzerindeMi } from './cember.js';

const EPS = 1e-6;
const PARALEL_EPS = 1e-9;
const PARAMETRE_EPS = 1e-9;

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Dogru */
/** @typedef {{A:Nokta, yon:number}} Isin */
/** @typedef {{merkez:Nokta, r:number}} Cember */
/** @typedef {{merkez:Nokta, r:number, bas:number, bit:number, yon:'saat'|'ters'}} Yay */

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function yonVektoru(d) {
  if (!d || !Number.isFinite(d.yon)) throw new Error('PARAMETRE_ARALIK_DISI');
  noktaDogrula(d.A);
  return ilerle({ x: 0, y: 0 }, d.yon, 1);
}

function parcaVerisi(p) {
  if (!p) throw new Error('PARAMETRE_ARALIK_DISI');
  noktaDogrula(p.A);
  noktaDogrula(p.B);
  const uzunluk = uzaklik(p.A, p.B);
  if (uzunluk === 0) throw new Error('PARAMETRE_ARALIK_DISI');
  return {
    A: p.A,
    uzunluk,
    v: { x: (p.B.x - p.A.x) / uzunluk, y: (p.B.y - p.A.y) / uzunluk }
  };
}

function cemberDogrula(c) {
  if (!c || !Number.isFinite(c.r) || c.r <= 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  noktaDogrula(c.merkez);
}

function carpraz(u, v) {
  return u.x * v.y - u.y * v.x;
}

function fark(P, Q) {
  return { x: P.x - Q.x, y: P.y - Q.y };
}

function noktaEkle(P, v, t) {
  return { x: P.x + v.x * t, y: P.y + v.y * t };
}

function noktaMi(P) {
  return P !== null && typeof P === 'object';
}

function sinirdaMi(t) {
  return t >= -PARAMETRE_EPS && t <= 1 + PARAMETRE_EPS;
}

/** @param {Dogru} d1 @param {Dogru} d2 @returns {Nokta|null|'cakisik'} */
export function kesisimDogruDogru(d1, d2) {
  const u = yonVektoru(d1);
  const v = yonVektoru(d2);
  const payda = carpraz(u, v);
  if (Math.abs(payda) <= PARALEL_EPS) {
    return noktaDogruUzakligi(d2.A, d1) <= EPS ? 'cakisik' : null;
  }
  return noktaEkle(d1.A, u, carpraz(fark(d2.A, d1.A), v) / payda);
}

/** @param {Dogru} d @param {Parca} p @returns {Nokta|null} */
export function kesisimDogruParca(d, p) {
  const u = yonVektoru(d);
  const parca = parcaVerisi(p);
  const payda = carpraz(u, parca.v);
  if (Math.abs(payda) <= PARALEL_EPS) {
    const uzerinde = noktaDogruUzakligi(p.A, d) <= EPS &&
      noktaDogruUzakligi(p.B, d) <= EPS;
    return uzerinde ? p.A : null;
  }
  const t = carpraz(fark(p.A, d.A), u) / payda / parca.uzunluk;
  return sinirdaMi(t) ? noktaEkle(p.A, parca.v, t * parca.uzunluk) : null;
}

function kolineerKesisim(bir, iki) {
  const farkA = fark(iki.A, bir.A);
  if (Math.abs(carpraz(farkA, bir.v)) > EPS) return null;
  const bas = farkA.x * bir.v.x + farkA.y * bir.v.y;
  const yon = bir.v.x * iki.v.x + bir.v.y * iki.v.y;
  const bit = bas + yon * iki.uzunluk;
  const alt = Math.max(0, Math.min(bas, bit));
  const ust = Math.min(bir.uzunluk, Math.max(bas, bit));
  if (ust < alt - EPS) return null;
  if (ust - alt > EPS) return 'cakisik';
  return noktaEkle(bir.A, bir.v, Math.max(0, Math.min(bir.uzunluk, (alt + ust) / 2)));
}

/** @param {Parca} p1 @param {Parca} p2 @returns {Nokta|null|'cakisik'} */
export function kesisimParcaParca(p1, p2) {
  const bir = parcaVerisi(p1);
  const iki = parcaVerisi(p2);
  const payda = carpraz(bir.v, iki.v);
  if (Math.abs(payda) <= PARALEL_EPS) return kolineerKesisim(bir, iki);
  const arasi = fark(iki.A, bir.A);
  const t = carpraz(arasi, iki.v) / payda / bir.uzunluk;
  const s = carpraz(arasi, bir.v) / payda / iki.uzunluk;
  return sinirdaMi(t) && sinirdaMi(s) ? noktaEkle(bir.A, bir.v, t * bir.uzunluk) : null;
}

/** @param {Cember} c1 @param {Cember} c2 @returns {Nokta[]} */
export function kesisimCemberCember(c1, c2) {
  cemberDogrula(c1);
  cemberDogrula(c2);
  const d = uzaklik(c1.merkez, c2.merkez);
  if (d <= EPS || d > c1.r + c2.r + EPS || d < Math.abs(c1.r - c2.r) - EPS) {
    return [];
  }
  const v = { x: (c2.merkez.x - c1.merkez.x) / d, y: (c2.merkez.y - c1.merkez.y) / d };
  const t = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const ayak = noktaEkle(c1.merkez, v, t);
  if (Math.abs(d - c1.r - c2.r) <= EPS || Math.abs(d - Math.abs(c1.r - c2.r)) <= EPS) {
    return [ayak];
  }
  const yukseklikKare = c1.r * c1.r - t * t;
  if (yukseklikKare < 0) return [];
  const h = Math.sqrt(yukseklikKare);
  const dik = { x: -v.y, y: v.x };
  return [noktaEkle(ayak, dik, h), noktaEkle(ayak, dik, -h)];
}

/** @param {Cember} c @param {Dogru} d @returns {Nokta[]} */
export function kesisimCemberDogru(c, d) {
  cemberDogrula(c);
  const v = yonVektoru(d);
  const arasi = fark(c.merkez, d.A);
  const t = arasi.x * v.x + arasi.y * v.y;
  const ayak = noktaEkle(d.A, v, t);
  const uzak = Math.abs(carpraz(arasi, v));
  if (uzak > c.r + EPS) return [];
  if (Math.abs(uzak - c.r) <= EPS) return [ayak];
  const h = Math.sqrt(Math.max(0, c.r * c.r - uzak * uzak));
  return [noktaEkle(ayak, v, -h), noktaEkle(ayak, v, h)];
}

/** @param {Yay} y @param {Isin} i @returns {Nokta[]} */
export function kesisimYayIsin(y, i) {
  cemberDogrula(y);
  if (!Number.isFinite(y.bas) || !Number.isFinite(y.bit) ||
      !['saat', 'ters'].includes(y.yon)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const v = yonVektoru(i);
  return kesisimCemberDogru(y, i).filter((P) => {
    const arasi = fark(P, i.A);
    return arasi.x * v.x + arasi.y * v.y >= -EPS && yayUzerindeMi(P, y, EPS / y.r);
  });
}

/**
 * @param {Dogru[]} dogrular
 * @returns {{kapali:boolean, koseler:Nokta[], kopuk:number[]}}
 */
export function ardisikKesisim(dogrular) {
  if (!Array.isArray(dogrular) || dogrular.length < 3) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const koseler = [];
  const kopuk = [];
  for (let i = 0; i < dogrular.length; i++) {
    const P = kesisimDogruDogru(dogrular[i], dogrular[(i + 1) % dogrular.length]);
    if (noktaMi(P)) koseler.push(P);
    else kopuk.push(i);
  }
  return { kapali: kopuk.length === 0, koseler, kopuk };
}

/**
 * @param {Dogru} m @param {Dogru} d @param {Dogru} k
 * @returns {{kesen:boolean, A:Nokta|null, B:Nokta|null, ayniNokta:boolean}}
 */
export function kesenMi(m, d, k) {
  const bir = kesisimDogruDogru(m, d);
  const iki = kesisimDogruDogru(m, k);
  const A = noktaMi(bir) ? bir : null;
  const B = noktaMi(iki) ? iki : null;
  const ayniNokta = A !== null && B !== null && uzaklik(A, B) <= EPS;
  return { kesen: A !== null && B !== null && !ayniNokta, A, B, ayniNokta };
}
