/** @typedef {{x:number, y:number}} Nokta */

// Dereceden radyana dönüşüm katsayısı; yalnız iç hesaplamada kullanılır.
const DERECE_RADYAN = 0.017453292519943295;

function noktaDogrula(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
}

/** @param {Nokta} P @param {Nokta} Q @returns {number} */
export function uzaklik(P, Q) {
  noktaDogrula(P);
  noktaDogrula(Q);
  return Math.hypot(Q.x - P.x, Q.y - P.y);
}

/** @param {Nokta} P @param {Nokta} Q @returns {Nokta} */
export function ortaNokta(P, Q) {
  noktaDogrula(P);
  noktaDogrula(Q);
  return { x: P.x / 2 + Q.x / 2, y: P.y / 2 + Q.y / 2 };
}

/** @param {Nokta} P @param {Nokta} Q @returns {number} */
export function yonAci(P, Q) {
  if (uzaklik(P, Q) === 0) throw new Error('PARAMETRE_ARALIK_DISI');
  const derece = Math.atan2(Q.y - P.y, Q.x - P.x) / DERECE_RADYAN;
  return ((derece % 360) + 360) % 360;
}

/** @param {Nokta} P @param {number} yon @param {number} uzunluk @returns {Nokta} */
export function ilerle(P, yon, uzunluk) {
  noktaDogrula(P);
  if (!Number.isFinite(yon) || !Number.isFinite(uzunluk) || uzunluk <= 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const radyan = (((yon % 360) + 360) % 360) * DERECE_RADYAN;
  return {
    x: P.x + Math.cos(radyan) * uzunluk,
    y: P.y + Math.sin(radyan) * uzunluk
  };
}

/** @param {Nokta} P @param {Nokta} Q @param {number} tolBirim @returns {boolean} */
export function esitMi(P, Q, tolBirim) {
  if (!Number.isFinite(tolBirim) || tolBirim < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return uzaklik(P, Q) <= tolBirim;
}
