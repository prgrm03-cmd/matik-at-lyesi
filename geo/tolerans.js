/** @param {number} gercek @param {number} hedef @param {number} tol @returns {boolean} */
export function toleransIcinde(gercek, hedef, tol) {
  return Math.abs(gercek - hedef) <= tol;
}

/** @param {number} rafGenisligi @returns {number} */
export function tAci(rafGenisligi) {
  return Math.min(8, Math.max(3, rafGenisligi / 2));
}

/**
 * Sözleşme §3.2.1; oranlar kesir, piksel ölçüleri piksel cinsindedir.
 * tekrarKomsulugu açıda derece, uzunlukta yüzde puanıdır (%5).
 * kesisimEps, küçük yarıçapla çarpılan katsayıdır.
 * @type {Readonly<{aciRaf: typeof tAci, aciOkuma: number, dikme: number,
 * uzunlukOran: number, teraziToplam: number, pimYakalamaPx: number,
 * capCubuguPx: number, tekrarKomsulugu: number, kesisimEps: number}>}
 */
export const TOLERANS = Object.freeze({
  aciRaf: tAci,
  aciOkuma: 3,
  dikme: 2,
  uzunlukOran: 0.02,
  teraziToplam: 6,
  pimYakalamaPx: 16,
  capCubuguPx: 4,
  tekrarKomsulugu: 5,
  kesisimEps: 0.08
});
