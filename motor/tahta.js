/** @typedef {{tahta:boolean,pilot:boolean,ipucuKapali:boolean,metinOlcek:number}} Mod */
/**
 * @typedef {Object} TahtaAyar
 * @property {number} metinOlcek
 * @property {boolean} ipucuKapali
 * @property {number} seed
 * @property {boolean} toleransGoster
 * @property {boolean} dondur
 */

/** @param {URLSearchParams} url @returns {Object} Motorun URL ayarları. */
export function tahtaAyarlari(url) {
  const tahta = url.get('mod') === 'tahta';
  const metinOlcek = tahta ? (url.get('metin') === '100' ? 1 : 1.5) : 1;
  const ipucuKapali = url.get('ipucu') === '0';
  const seed = seedOku(url.get('seed'));
  return {
    mod: { tahta, pilot: false, ipucuKapali, metinOlcek },
    ayarlar: { metinOlcek, ipucuKapali, seed, toleransGoster: false, dondur: false },
    duzenek: url.get('duzenek') || null,
    kontrast: url.get('kontrast') !== '0'
  };
}

function seedOku(deger) {
  if (deger === null) return 1;
  if (!/^\d+$/.test(deger)) throw new Error('RNG_SEED_GECERSIZ');
  const seed = Number(deger);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new Error('RNG_SEED_GECERSIZ');
  }
  return seed;
}
