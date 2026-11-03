/** @typedef {{ad:string, secenekler:(string|number)[]}} Disli */
/** @typedef {{kalipAnahtari:string, disliler:Disli[],
 * dogru:Record<string, string|number>}} KuralKartiAyar */
/** @typedef {Object} KuralKarti
 * @property {string} anahtar
 * @property {string} kalip
 * @property {()=>Record<string, string|number>} ayar
 * @property {(ad:string, deger:string|number)=>void} disliCevir
 * @property {()=>boolean} dogruMu
 * @property {boolean} takili
 * @property {()=>void} tak
 * @property {()=>void} otomatikDoldur
 */
/** @typedef {import('./defter.js').DefterOrtam & {kalip:string}} DefterOrtam */

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function disliDogrula(disli) {
  if (!disli || typeof disli.ad !== 'string' || !Array.isArray(disli.secenekler) ||
      disli.secenekler.length === 0 || ![...disli.secenekler].every(deger =>
        typeof deger === 'string' || Number.isFinite(deger))) gecersiz();
  return { ad: disli.ad, secenekler: [...disli.secenekler] };
}

function ayarDogrula(ayar, ortam) {
  if (!ortam?.rng || !ortam.sahne || !ortam.matik ||
      typeof ortam.kalip !== 'string') gecersiz();
  if (!ayar || typeof ayar.kalipAnahtari !== 'string' || !Array.isArray(ayar.disliler) ||
      !ayar.dogru || typeof ayar.dogru !== 'object' || Array.isArray(ayar.dogru)) gecersiz();
  const disliler = [...ayar.disliler].map(disliDogrula);
  const adlar = new Map(disliler.map(disli => [disli.ad, disli]));
  if (adlar.size !== disliler.length) gecersiz();
  for (const [ad, deger] of Object.entries(ayar.dogru)) {
    if (!adlar.get(ad)?.secenekler.includes(deger)) gecersiz();
  }
  return { disliler: adlar, dogru: { ...ayar.dogru } };
}

function tamEslesme(degerler, dogru) {
  if (Object.keys(dogru).length !== degerler.size) return false;
  return [...degerler].every(([ad, deger]) =>
    Object.prototype.hasOwnProperty.call(dogru, ad) && dogru[ad] === deger);
}

/** @param {KuralKartiAyar} ayar @param {DefterOrtam} ortam @returns {KuralKarti} */
export function kuralKartiOlustur(ayar, ortam) {
  const { disliler, dogru } = ayarDogrula(ayar, ortam);
  const degerler = new Map([...disliler].map(([ad, disli]) => [ad, disli.secenekler[0]]));
  const anahtar = ayar.kalipAnahtari;
  const kalip = ortam.kalip;
  let takili = false;
  return {
    get anahtar() { return anahtar; },
    get kalip() { return kalip; },
    get takili() { return takili; },
    ayar() { return Object.fromEntries(degerler); },
    disliCevir(ad, deger) {
      if (!disliler.get(ad)?.secenekler.includes(deger)) gecersiz();
      degerler.set(ad, deger);
    },
    dogruMu() { return tamEslesme(degerler, dogru); },
    tak() { takili = true; },
    otomatikDoldur() {
      for (const ad of degerler.keys()) degerler.set(ad, dogru[ad]);
    }
  };
}
