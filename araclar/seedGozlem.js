import {
  parametreleriDogrula, d02Parametreleri, d03Parametreleri, d04Parametreleri,
  d09aParametreleri
} from './seedKurallari.js';

const URETICILER = new Set([
  'rastgeleDisBukeyCokgen', 'rastgeleUcgen', 'kesisimGarantiliParametre', 'kesisimCemberCember'
]);
const GOZLEMLER = new WeakMap();
// Yollar düzeneğin mevcut kodundan gelir; yeni bir ctx.durum sözleşmesi değildir (ADT-006).
const PARAMETRE_UYARLAYICILARI = {
  D01: ctx => ({ konum: ctx.durum.pimler.flatMap(pim => [pim.x, pim.y]) }),
  D02: d02Parametreleri,
  D03: d03Parametreleri,
  D04: d04Parametreleri,
  D09a: d09aParametreleri
};

/** @param {unknown} deger @returns {unknown} Kayıt anındaki değerleri korur. */
export function kopya(deger) {
  if (Array.isArray(deger)) return deger.map(kopya);
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).map(([ad, d]) => [ad, kopya(d)]));
  }
  return deger;
}

function rngIzle(rng, gozlem, anaAkis = true) {
  return {
    ...rng,
    alt(etiket) { return rngIzle(rng.alt(etiket), gozlem, false); },
    tam(min, max, adim) {
      const deger = rng.tam(min, max, adim);
      if (anaAkis && gozlem.asama === 'kur') gozlem.tam.push({ min, max, deger });
      return deger;
    },
    tamHaric(min, max, haric, komsuluk) {
      const once = [...haric];
      const deger = rng.tamHaric(min, max, haric, komsuluk);
      gozlem.haric.push({ min, max, haric: once, komsuluk, deger });
      return deger;
    }
  };
}

function fabrikalariIzle(ctx, gozlem) {
  const lazer = ctx.widget.lazer;
  ctx.widget.lazer = ayar => {
    const nesne = lazer(ayar);
    if (gozlem.asama === 'kur') gozlem.lazerler.push(kopya(ayar));
    return nesne;
  };
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
    asama: 'kur', geo: [], haric: [], tam: [], lazerler: [],
    tablolar: [], raflar: [], parametreDenetimsiz: []
  };
  GOZLEMLER.set(ctx, gozlem);
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
  const araliklar = { ...ctx.veri.parametreler };
  // D03/D04 süresi kurulumda yoktur; gerçek animasyon döndüğünde kuruKos denetler.
  if (['D03', 'D04'].includes(ctx.id)) delete araliklar.sure;
  parametreleriDogrula(araliklar, uyarlayici(ctx, GOZLEMLER.get(ctx)));
  return [];
}
