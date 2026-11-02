/** @typedef {{x:number, y:number}} Nokta */

// Dereceden radyana dönüşüm katsayısı; yalnız iç hesaplamada kullanılır.
const DERECE_RADYAN = 0.017453292519943295;

/** @param {Nokta} P @param {Nokta} Q @returns {number} */
export function uzaklik(P, Q) {
  return Math.hypot(Q.x - P.x, Q.y - P.y);
}

/** @param {Nokta} P @param {Nokta} Q @returns {Nokta} */
export function ortaNokta(P, Q) {
  return { x: P.x / 2 + Q.x / 2, y: P.y / 2 + Q.y / 2 };
}

/** @param {Nokta} P @param {Nokta} Q @returns {number} */
export function yonAci(P, Q) {
  const derece = Math.atan2(Q.y - P.y, Q.x - P.x) / DERECE_RADYAN;
  return ((derece % 360) + 360) % 360;
}

/** @param {Nokta} P @param {number} yon @param {number} uzunluk @returns {Nokta} */
export function ilerle(P, yon, uzunluk) {
  const radyan = (((yon % 360) + 360) % 360) * DERECE_RADYAN;
  return {
    x: P.x + Math.cos(radyan) * uzunluk,
    y: P.y + Math.sin(radyan) * uzunluk
  };
}

/** @param {Nokta} P @param {Nokta} Q @param {number} tolBirim @returns {boolean} */
export function esitMi(P, Q, tolBirim) {
  return uzaklik(P, Q) <= tolBirim;
}
