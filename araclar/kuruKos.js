import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { bekleyenMi } from '../motor/sahteKayit.js';
import { gozlemBagla, duzenekParametreleriniDogrula } from './seedGozlem.js';
import {
  dogrula, sonucuDogrula, sahneyiDogrula, gecmisiDogrula,
  prototipiDogrula, ozelKurallariDogrula, parametreleriDogrula
} from './seedKurallari.js';

const IMZALAR = { kur: 2, ciz: 1, girdi: 2, calistir: 1, basari: 1, ipucu: 2, tahta: 2 };

/** @param {Object} duzenek @param {Veri} veri @returns {void} */
export function imzayiDogrula(duzenek, veri) {
  const adlar = ['id', 'surum', ...Object.keys(IMZALAR)];
  dogrula(Object.keys(duzenek).length === 9 && adlar.every(ad =>
    Object.prototype.hasOwnProperty.call(duzenek, ad)), 'duzenekImzasi', 'IMZA_EKSIK');
  for (const [ad, adet] of Object.entries(IMZALAR)) {
    dogrula(typeof duzenek[ad] === 'function' && duzenek[ad].length === adet,
      'duzenekImzasi:' + ad, 'IMZA_EKSIK');
  }
  dogrula(duzenek.id === veri.kod && duzenek.surum === veri.surum,
    'duzenekSurumu', 'SEMA_HATASI');
}

function durumMetni(ctx) {
  return JSON.stringify(ctx.durum);
}

function safCiz(duzenek, ctx, gozlem) {
  gozlem.asama = 'ciz';
  const once = durumMetni(ctx);
  ctx.sahne.temizle();
  const bas = sahneKaydi(ctx).cagrilar.length;
  duzenek.ciz(ctx);
  dogrula(durumMetni(ctx) === once, 'cizDurumuDegistirdi');
  return sahneKaydi(ctx).cagrilar.slice(bas);
}

function basariOku(duzenek, ctx, gozlem) {
  gozlem.asama = 'basari';
  const once = durumMetni(ctx);
  const sonuc = duzenek.basari(ctx);
  sonucuDogrula(sonuc, ctx.veri);
  dogrula(JSON.stringify(duzenek.basari(ctx)) === JSON.stringify(sonuc) &&
    durumMetni(ctx) === once, 'basariSafligi');
  return sonuc;
}

function canlandir(duzenek, ctx, gozlem) {
  gozlem.asama = 'calistir';
  const animasyon = duzenek.calistir(ctx);
  dogrula(animasyon && Number.isFinite(animasyon.sure) && animasyon.sure >= 0 &&
    typeof animasyon.kare === 'function' && typeof animasyon.bitti === 'function',
  'animasyonImzasi', 'IMZA_EKSIK');
  if (['D03', 'D04', 'D05'].includes(ctx.id)) {
    parametreleriDogrula({ sure: ctx.veri.parametreler.sure }, { sure: [animasyon.sure] });
  }
  for (const t of [0, 0.5, 1]) animasyon.kare(t);
  animasyon.bitti();
}

function genelGozlemleriDogrula(ctx, gozlem) {
  for (const cagri of gozlem.haric) gecmisiDogrula(cagri);
  for (const cagri of gozlem.geo) {
    if (cagri.ad === 'rastgeleDisBukeyCokgen' || cagri.ad === 'rastgeleUcgen') {
      prototipiDogrula(cagri.sonuc, cagri.ad === 'rastgeleUcgen');
    }
  }
  sahneyiDogrula(ctx.veri, sahneKaydi(ctx));
}

function gozlemleriDogrula(ctx, gozlem, sonCizim, sonuc) {
  genelGozlemleriDogrula(ctx, gozlem);
  ozelKurallariDogrula(ctx.id, gozlem, sonCizim, sonuc);
}

function ilkKurulum(duzenek, ctx, seed, gozlem) {
  duzenek.kur(ctx, seed);
  dogrula(sahneKaydi(ctx).cagrilar.every(c => c.ad === 'pxToBirim'), 'kurCizimYapti');
  gozlem.parametreDenetimsiz = duzenekParametreleriniDogrula(ctx);
  if (ctx.mod.tahta) {
    duzenek.tahta(ctx, { metinOlcek: 1.5, ipucuKapali: false, seed,
      toleransGoster: false, dondur: false });
  }
  safCiz(duzenek, ctx, gozlem);
}

function zincir(duzenek, ctx, seed, olaylar, gozlem) {
  ilkKurulum(duzenek, ctx, seed, gozlem);
  gozlem.asama = 'girdi';
  for (const olay of olaylar) duzenek.girdi(ctx, olay);
  for (const seviye of [1, 3]) {
    gozlem.asama = 'ipucu';
    duzenek.ipucu(ctx, seviye);
    safCiz(duzenek, ctx, gozlem);
  }
  canlandir(duzenek, ctx, gozlem);
  const sonCizim = safCiz(duzenek, ctx, gozlem);
  const sonuc = basariOku(duzenek, ctx, gozlem);
  gozlemleriDogrula(ctx, gozlem, sonCizim, sonuc);
  return sonuc;
}

/** @param {Object} duzenek @param {Veri} veri @param {number} seed
 * @param {{tahta?:boolean,olaylar?:Object[]}} [secenek] @returns {Object} */
export function kuruKos(duzenek, veri, seed, secenek = {}) {
  imzayiDogrula(duzenek, veri);
  const ctx = ctxSahteOlustur(veri.id, veri, seed, { tahta: secenek.tahta === true });
  const gozlem = gozlemBagla(ctx);
  try {
    const sonuc = zincir(duzenek, ctx, seed, secenek.olaylar || [], gozlem);
    return { ctx, gozlem, sonuc, kayit: sahneKaydi(ctx), atlandi: false };
  } catch (hata) {
    // Yalnız bilinen yer tutucunun attığı aynı Error nesnesi ertelenebilir.
    if (!bekleyenMi(hata)) throw hata;
    genelGozlemleriDogrula(ctx, gozlem);
    return { ctx, gozlem, sonuc: null, kayit: sahneKaydi(ctx), atlandi: true };
  }
}

/** @param {Object} duzenek @param {Veri} veri @param {number} seed @returns {void} */
export function ipucuTekrariniDene(duzenek, veri, seed) {
  const ctx = ctxSahteOlustur(veri.id, veri, seed, {});
  const gozlem = gozlemBagla(ctx);
  try {
    ilkKurulum(duzenek, ctx, seed, gozlem);
    for (let tekrar = 0; tekrar < 3; tekrar++) {
      gozlem.asama = 'ipucu';
      duzenek.ipucu(ctx, 3);
      const sonCizim = safCiz(duzenek, ctx, gozlem);
      const sonuc = basariOku(duzenek, ctx, gozlem);
      gozlemleriDogrula(ctx, gozlem, sonCizim, sonuc);
    }
  } catch (hata) {
    if (bekleyenMi(hata)) genelGozlemleriDogrula(ctx, gozlem);
    throw hata;
  }
}
