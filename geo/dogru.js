import { ilerle, uzaklik } from './nokta.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Dogru */
const EPS = 1e-6;
const PARALEL_ESIK = 1e-9;
const TEZGAH = 1000;

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

function dogruYonu(d) {
  if (!d || !Number.isFinite(d.yon)) throw new Error('PARAMETRE_ARALIK_DISI');
  noktaDogrula(d.A);
  return ilerle({ x: 0, y: 0 }, d.yon, 1);
}

/** @param {Nokta} P @param {Dogru} d @param {number} tolBirim @returns {boolean} */
export function dogruUzerindeMi(P, d, tolBirim) {
  if (!Number.isFinite(tolBirim) || tolBirim < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return noktaDogruUzakligi(P, d) <= tolBirim;
}

/** @param {Dogru} d @param {Nokta} P @returns {{ayak:Nokta, parca:Parca}} */
export function dikme(d, P) {
  noktaDogrula(P);
  const yon = dogruYonu(d);
  const t = (P.x - d.A.x) * yon.x + (P.y - d.A.y) * yon.y;
  const ayak = { x: d.A.x + t * yon.x, y: d.A.y + t * yon.y };
  return { ayak, parca: { A: { x: P.x, y: P.y }, B: ayak } };
}

/** @param {Nokta} P @param {Dogru} d @returns {number} */
export function noktaDogruUzakligi(P, d) {
  noktaDogrula(P);
  const yon = dogruYonu(d);
  return Math.abs((P.x - d.A.x) * yon.y - (P.y - d.A.y) * yon.x);
}

function kenarEkle(noktalar, d, yon, t) {
  const P = { x: d.A.x + t * yon.x, y: d.A.y + t * yon.y };
  if (P.x < -EPS || P.x > TEZGAH + EPS || P.y < -EPS || P.y > TEZGAH + EPS) return;
  P.x = Math.min(TEZGAH, Math.max(0, P.x));
  P.y = Math.min(TEZGAH, Math.max(0, P.y));
  if (!noktalar.some((kayit) => uzaklik(kayit.P, P) <= EPS)) {
    noktalar.push({ t, P });
  }
}

/** @param {Dogru} d @returns {Nokta[]} */
export function dogruKenarKesisimi(d) {
  const yon = dogruYonu(d);
  const noktalar = [];
  for (const kenar of [0, TEZGAH]) {
    if (Math.abs(yon.x) > PARALEL_ESIK) kenarEkle(noktalar, d, yon, (kenar - d.A.x) / yon.x);
    if (Math.abs(yon.y) > PARALEL_ESIK) kenarEkle(noktalar, d, yon, (kenar - d.A.y) / yon.y);
  }
  return noktalar.sort((a, b) => a.t - b.t).map((kayit) => kayit.P);
}

/** @param {Nokta} P @param {Dogru} d @returns {-1|0|1} */
export function hangiTarafta(P, d) {
  noktaDogrula(P);
  const yon = dogruYonu(d);
  const carpim = yon.x * (P.y - d.A.y) - yon.y * (P.x - d.A.x);
  return Math.abs(carpim) <= EPS ? 0 : Math.sign(carpim);
}
