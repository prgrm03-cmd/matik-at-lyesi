import * as geo from '../geo/index.js';
import { rngOlustur } from './rng.js';
import { hizmetleriOlustur, aciTablosuKilidiniDogrula } from './baglam.js';
import { araclariHazirla } from './ilerleme.js';
import { sahteSahneOlustur } from './sahteSahne.js';
import { aciTablosuOlustur } from '../widget/aciTablosu.js';

const kayitlar = new WeakMap();

function dondur(nesne) {
  if (nesne && typeof nesne === 'object') {
    Object.values(nesne).forEach(dondur);
    Object.freeze(nesne);
  }
  return nesne;
}

function arayuzOlustur(kayit) {
  const bos = () => {};
  return {
    soyle() {
      kayit.sayac.soyle = (kayit.sayac.soyle || 0) + 1;
    },
    ifade: bos, kivilcim: bos, sembol: bos, defterAc: bos, defterKapat: bos
  };
}

/** @param {string} id @param {Veri} veri @param {number} seed
 * @param {{tahta?:boolean}} [secenek] @returns {Ctx} */
export function ctxSahteOlustur(id, veri, seed, secenek) {
  const rng = rngOlustur(seed);
  if (!veri || veri.id !== id || !veri.bayraklar || !veri.matik || !veri.nedenler) {
    throw new Error('SEMA_HATASI');
  }
  const donmus = dondur(JSON.parse(JSON.stringify(veri)));
  const mod = {
    tahta: secenek?.tahta === true, pilot: false, ipucuKapali: false,
    metinOlcek: secenek?.tahta === true ? 1.5 : 1
  };
  const { sahne, kayit } = sahteSahneOlustur(donmus);
  const ctx = {
    id, veri: donmus, durum: {}, rng, sahne, geo, mod, tur: 0,
    araclar: araclariHazirla(donmus, rng.alt('araclar'), { ilerleme: {} }, mod)
  };
  hizmetleriOlustur(ctx, arayuzOlustur(kayit), { ses: false });
  ctx.widget.aciTablosu = (ayar) => {
    aciTablosuKilidiniDogrula(ctx, ayar);
    return aciTablosuOlustur(ayar, undefined);
  };
  kayitlar.set(ctx, kayit);
  return ctx;
}

/** @param {Ctx} ctx
 * @returns {{cagrilar:{ad:string,arg:unknown[]}[],sayac:Record<string,number>}} */
export function sahneKaydi(ctx) {
  const kayit = kayitlar.get(ctx);
  if (!kayit) throw new Error('WIDGET_AYAR_GECERSIZ');
  return kayit;
}
