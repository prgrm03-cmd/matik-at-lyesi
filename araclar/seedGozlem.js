import { parametreleriDogrula } from './seedKurallari.js';

const URETICILER = new Set([
  'rastgeleDisBukeyCokgen', 'rastgeleUcgen', 'kesisimGarantiliParametre', 'kesisimCemberCember'
]);
// Yollar düzeneğin mevcut kodundan gelir; yeni bir ctx.durum sözleşmesi değildir (ADT-006).
const PARAMETRE_UYARLAYICILARI = {
  D01: ctx => ({ konum: ctx.durum.pimler.flatMap(pim => [pim.x, pim.y]) })
};

/** @param {unknown} deger @returns {unknown} Kayıt anındaki değerleri korur. */
export function kopya(deger) {
  if (Array.isArray(deger)) return deger.map(kopya);
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).map(([ad, d]) => [ad, kopya(d)]));
  }
  return deger;
}

function rngIzle(rng, gozlem) {
  return {
    ...rng,
    alt(etiket) { return rngIzle(rng.alt(etiket), gozlem); },
    tamHaric(min, max, haric, komsuluk) {
      const once = [...haric];
      const deger = rng.tamHaric(min, max, haric, komsuluk);
      gozlem.haric.push({ min, max, haric: once, komsuluk, deger });
      return deger;
    }
  };
}

function fabrikalariIzle(ctx, gozlem) {
  const tablo = ctx.widget.aciTablosu;
  ctx.widget.aciTablosu = ayar => {
    const nesne = tablo(ayar);
    gozlem.tablolar.push(nesne);
    return nesne;
  };
  const raf = ctx.defter.tahminRafi;
  ctx.defter.tahminRafi = ayar => {
    const nesne = raf(ayar);
    gozlem.raflar.push({ ayar: kopya(ayar), nesne });
    return nesne;
  };
}

/** @param {Ctx} ctx @returns {Object} Yalnız araç içi gözlem kaydı; Ctx'e alan eklemez. */
export function gozlemBagla(ctx) {
  const gozlem = {
    asama: 'kur', geo: [], haric: [], tablolar: [], raflar: [], parametreDenetimsiz: []
  };
  ctx.rng = rngIzle(ctx.rng, gozlem);
  ctx.geo = { ...ctx.geo };
  for (const ad of URETICILER) {
    const islev = ctx.geo[ad];
    ctx.geo[ad] = (...arg) => {
      const sonuc = islev(...arg);
      gozlem.geo.push({ ad, arg: kopya(arg), sonuc: kopya(sonuc), asama: gozlem.asama });
      return sonuc;
    };
  }
  fabrikalariIzle(ctx, gozlem);
  return gozlem;
}

/** @param {Ctx} ctx @returns {string[]} Adaptörü olmayan düzenek kimlikleri. */
export function duzenekParametreleriniDogrula(ctx) {
  if (Object.keys(ctx.veri.parametreler).length === 0) return [];
  const uyarlayici = PARAMETRE_UYARLAYICILARI[ctx.id];
  if (typeof uyarlayici !== 'function') return [ctx.id];
  parametreleriDogrula(ctx.veri.parametreler, uyarlayici(ctx));
  return [];
}
