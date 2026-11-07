import * as geo from '../geo/index.js';
import { rngOlustur, seedUret } from './rng.js';
import { sahneOlustur } from './sahne.js';
import { girisBagla, arayuzBagla } from './giris.js';
import { yukle, kapsamOku, veriOku } from './yukleyici.js';
import { kayitOku, kayitYaz, tamamlandiKaydet } from './kayit.js';
import { araclariHazirla, yildizlar, acikMi } from './ilerleme.js';
import { tahtaAyarlari } from './tahta.js';
import { sunumOlustur } from './sunum.js';
import { kopruGonder } from './kopru.js';
import { hizmetleriOlustur, girdiDagit } from './baglam.js';
import { ipucuUygula } from './ipucu.js';
import { canlandir, canlandirmayiDurdur } from './zaman.js';

/**
 * @typedef {Object} Ctx
 * @property {string} id
 * @property {Veri} veri
 * @property {Object} durum
 * @property {Rng} rng
 * @property {Sahne} sahne
 * @property {Geo} geo
 * @property {Widget} widget
 * @property {Defter} defter
 * @property {Sembol} sembol
 * @property {Ses} ses
 * @property {Matik} matik
 * @property {Mod} mod
 * @property {number} tur
 * @property {Araclar} araclar
 */
/** @typedef {{tamam:boolean,yanParca:boolean,neden:string,tur:number}} Sonuc */

const uygulama = { deger: null };
const baglamlar = new WeakMap();

function hatayiGoster(ana, hata) {
  ana.arayuz.hata(hata instanceof Error ? hata.message : 'IMZA_EKSIK');
}

function oturumuKapat(oturum) {
  if (!oturum) return;
  oturum.canli = false;
  cancelAnimationFrame(oturum.kare);
  canlandirmayiDurdur(oturum);
  oturum.giris?.kaldir();
  oturum.gorunum.kaldir();
  baglamlar.delete(oturum.ctx);
}

async function dolabiGoster(ana) {
  const acilis = ana.acilis;
  const kimlikler = await kapsamOku();
  const veriler = await Promise.all(kimlikler.map((id) => veriOku(id)));
  if (ana !== uygulama.deger || acilis !== ana.acilis) return;
  const liste = veriler.map((veri) => ({
    id: veri.id, baslik: veri.baslik,
    ...yildizlar(ana.kayit, veri.id),
    kilitli: !acikMi(ana.kayit, veri, ana.mod)
  }));
  ana.arayuz.listele(liste, (id) => {
    const tekrar = ana.kayit.duzenekler[id]?.tekrar || 0;
    const seed = ana.mod.tahta || ana.url.has('seed')
      ? ana.ayarlar.seed : seedUret(id, tekrar);
    duzenekAc(id, seed).catch((hata) => hatayiGoster(ana, hata));
  });
  ana.arayuz.dolap();
}

function komutIsle(ana, komut) {
  const oturum = ana.oturum;
  if (komut === 'dolap') {
    ana.acilis++;
    oturumuKapat(oturum);
    ana.oturum = null;
    dolabiGoster(ana).catch((hata) => hatayiGoster(ana, hata));
    return;
  }
  if (!oturum?.canli) return;
  if (komut === 'defterAc') return oturum.ctx.defter.ac();
  if (komut === 'defterKapat') return oturum.ctx.defter.kapat();
  if (komut === 'ipucu' && !oturum.islem) {
    oturum.ipucu = Math.min(3, oturum.ipucu + 1);
    ipucuVer(oturum.ctx, oturum.ipucu);
  }
  if (komut === 'calistir') {
    calistir(oturum.ctx).catch((hata) => {
      if (oturum.canli) hatayiGoster(ana, hata);
    });
  }
}

/** @param {{kok:HTMLElement,url:URLSearchParams}} ayar @returns {Promise<void>} */
export async function baslat(ayar) {
  const eski = uygulama.deger;
  if (eski) { oturumuKapat(eski.oturum); eski.arayuz.kaldir(); }
  const ana = { kok: ayar.kok, url: ayar.url, acilis: 0, oturum: null };
  ana.arayuz = arayuzBagla(ayar.kok, (komut) => komutIsle(ana, komut));
  uygulama.deger = ana;
  try {
    const secim = tahtaAyarlari(ayar.url);
    Object.assign(ana, secim);
    ana.kayit = kayitOku(ana.mod);
    if (!ana.mod.tahta) {
      ana.mod.pilot = ana.kayit.pilotMode;
      ana.mod.metinOlcek = ana.kayit.ayarlar.metinOlcek;
    }
    ana.arayuz.ayarla(ana.mod, ana.kontrast);
    await dolabiGoster(ana);
    if (ana !== uygulama.deger) return;
    kopruGonder('hazir');
    if (secim.duzenek) {
      const tekrar = ana.kayit.duzenekler[secim.duzenek]?.tekrar || 0;
      const seed = ana.mod.tahta || ayar.url.has('seed')
        ? ana.ayarlar.seed : seedUret(secim.duzenek, tekrar);
      await duzenekAc(secim.duzenek, seed);
    }
  } catch (hata) {
    if (ana === uygulama.deger) hatayiGoster(ana, hata);
  }
}

function baglamOlustur(ana, veri, seed, gorunum) {
  const rng = rngOlustur(seed);
  const ctx = {
    id: veri.id, veri, durum: {}, rng, sahne: gorunum.sahne, geo,
    mod: { ...ana.mod }, tur: 0,
    araclar: araclariHazirla(veri, rng.alt('araclar'), ana.kayit, ana.mod)
  };
  const hizmetler = hizmetleriOlustur(ctx, ana.arayuz, ana.kayit.ayarlar);
  return { ctx, hizmetler };
}

function turuKur(oturum, seed) {
  const { ctx, duzenek, ana } = oturum;
  ctx.rng = rngOlustur(seed);
  ctx.durum = {};
  oturum.hizmetler.widgetler.length = 0;
  oturum.hizmetler.defterler.length = 0;
  ana.arayuz.defterTemizle?.();
  duzenek.kur(ctx, seed);
  if (ctx.mod.tahta) duzenek.tahta(ctx, ana.ayarlar);
  oturum.ipucu = 0;
  ctx.sahne.vurguTemizle();
}

function olayIsle(oturum, olay) {
  if (!oturum.canli || oturum.islem) return;
  const { ctx, duzenek, hizmetler, ana } = oturum;
  const tuketildi = girdiDagit(ctx, duzenek, olay, hizmetler);
  if (!tuketildi && olay.tur === 'dugme' && olay.dugmeId === 'calistir') {
    komutIsle(ana, 'calistir');
  }
}

function sahneyiCiz(oturum) {
  if (!oturum.canli) return;
  try {
    oturum.gorunum.boyutlandir();
    oturum.ctx.sahne.temizle();
    oturum.duzenek.ciz(oturum.ctx);
    oturum.giris.hayalet();
    oturum.gorunum.bitir();
    const boyut = Math.ceil(oturum.ana.arayuz.boyut());
    if (oturum.boyut !== boyut) {
      oturum.boyut = boyut;
      kopruGonder('boyut', { yukseklikPx: boyut });
    }
    oturum.kare = requestAnimationFrame(() => sahneyiCiz(oturum));
  } catch (hata) {
    oturumuKapat(oturum);
    hatayiGoster(oturum.ana, hata);
  }
}

/** @param {string} id @param {number} seed @returns {Promise<Ctx>} */
export async function duzenekAc(id, seed) {
  const ana = uygulama.deger;
  if (!ana) throw new Error('DUZENEK_YOK');
  rngOlustur(seed);
  const acilis = ++ana.acilis;
  const { duzenek, veri } = await yukle(id);
  if (ana !== uygulama.deger || acilis !== ana.acilis) throw new Error('DUZENEK_YOK');
  if (!acikMi(ana.kayit, veri, ana.mod)) throw new Error('DUZENEK_YOK');
  oturumuKapat(ana.oturum);
  ana.arayuz.ac(veri);
  const sunum = sunumOlustur(ana.mod, ana.kontrast);
  const gorunum = sahneOlustur(ana.kok, veri, ana.mod, sunum);
  const { ctx, hizmetler } = baglamOlustur(ana, veri, seed, gorunum);
  const oturum = { ana, ctx, duzenek, gorunum, hizmetler, seed, canli: true, ipucu: 0 };
  ana.oturum = oturum;
  baglamlar.set(ctx, oturum);
  try {
    turuKur(oturum, seed);
    oturum.giris = girisBagla(gorunum,
      (olay) => olayIsle(oturum, olay), (komut) => komutIsle(ana, komut));
    ana.arayuz.kemer(ctx.araclar, veri.etiketler);
    ana.arayuz.tohum(id, seed);
    ctx.sembol.temizle();
    ctx.matik.soyle('giris');
    sahneyiCiz(oturum);
    kopruGonder('duzenekAcildi', { id, seed });
    return ctx;
  } catch (hata) {
    oturumuKapat(oturum);
    throw hata;
  }
}

function sonucuDogrula(ctx, sonuc) {
  if (!sonuc || typeof sonuc.tamam !== 'boolean' || typeof sonuc.yanParca !== 'boolean') {
    throw new Error('IMZA_EKSIK');
  }
  if (!Object.prototype.hasOwnProperty.call(ctx.veri.nedenler, sonuc.neden)) {
    throw new Error('MATIK_ANAHTAR_YOK');
  }
  if (sonuc.tamam && sonuc.neden !== 'tamam') throw new Error('IMZA_EKSIK');
}

async function calistirmayiYurut(oturum) {
  const { ctx, duzenek, ana } = oturum;
  oturum.hizmetler.defterler.forEach(d => typeof d.kilitle === 'function' && d.kilitle());
  ana.arayuz.defterKilitle?.();
  const animasyon = duzenek.calistir(ctx);
  await canlandir(oturum, animasyon);
  if (!oturum.canli) throw new Error('DUZENEK_YOK');
  animasyon.bitti();
  const sonuc = { ...duzenek.basari(ctx), tur: ctx.tur };
  sonucuDogrula(ctx, sonuc);
  if (sonuc.tamam && ctx.tur + 1 < ctx.veri.turSayisi) {
    ctx.tur++;
    // K-02 §3.1.4'ü esas alır; iki farklı etiket için ADT-002'e bakınız.
    turuKur(oturum, rngOlustur(oturum.seed).alt('tur' + ctx.tur).seed);
    ctx.matik.soyle('tekrar');
    return sonuc;
  }
  if (sonuc.tamam) {
    tamamlandiKaydet(ana.kayit, ctx, sonuc);
    kayitYaz(ctx.mod, ana.kayit);
    oturum.sonuc = sonuc;
    ctx.matik.ifade('mutlu');
    ctx.matik.soyle('basari');
    ctx.matik.kivilcim();
    kopruGonder('tamamlandi', { id: ctx.id, seed: oturum.seed, ...sonuc });
  } else {
    ctx.matik.ifade('saskin');
    ctx.matik.soyle(sonuc.neden);
  }
  ana.arayuz.sonuc(sonuc, ctx.mod.tahta);
  return sonuc;
}

/** @param {Ctx} ctx @returns {Promise<Sonuc>} */
export async function calistir(ctx) {
  const oturum = baglamlar.get(ctx);
  if (!oturum?.canli) throw new Error('DUZENEK_YOK');
  if (oturum.sonuc) return oturum.sonuc;
  if (oturum.islem) return oturum.islem;
  oturum.islem = calistirmayiYurut(oturum);
  try {
    return await oturum.islem;
  } finally {
    oturum.islem = null;
  }
}

/** @param {Ctx} ctx @param {1|2|3} seviye @returns {void} */
export function ipucuVer(ctx, seviye) {
  const oturum = baglamlar.get(ctx);
  if (!oturum?.canli) throw new Error('DUZENEK_YOK');
  if (ctx.mod.ipucuKapali || oturum.islem) return;
  ipucuUygula(ctx, oturum.duzenek, seviye);
  if (seviye === 2) oturum.ana.arayuz.soyle(ctx.veri.ipucu[1].metin);
}
