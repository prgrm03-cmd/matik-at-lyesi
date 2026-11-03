import { aciNormalize, TOLERANS, uzaklik } from '../geo/index.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{merkez:Nokta, r:number}} Cember */
/** @typedef {{merkez:Nokta, r:number, bas:number, bit:number, yon:'saat'|'ters'}} Yay */
/** @typedef {{merkez?:Nokta, aciklik?:number, kilitli?:boolean,
 * renk?:'mavi'|'turuncu', olcuKilidi:boolean}} PergelAyar */
/** @typedef {Object} Pergel
 * @property {Nokta} merkez
 * @property {number} aciklik
 * @property {boolean} kilit
 * @property {()=>void} kilitle
 * @property {(kaynak:Pergel)=>void} kopyala
 * @property {(A:Nokta, B:Nokta)=>void} acikligiAl
 * @property {()=>Cember} cemberCiz
 * @property {(bas:number, bit:number, yon?:'saat'|'ters')=>Yay} yayCiz
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 * @property {()=>Object} durum
 * @property {(durum:Object)=>void} yukle
 */

const TEZGAH = 1000;
const EKLEM_ORANI = 0.6;
const ETIKET_KAYMASI = 24;
const HALKA_PX = 10;
const AYARLAR = ['merkez', 'aciklik', 'kilitli', 'renk', 'olcuKilidi'];
const KILIT_KAYNAKLARI = [null, 'ayar', 'elle', 'kopya', 'parca'];

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function noktaKopyala(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) gecersiz();
  return { x: P.x, y: P.y };
}

function merkezDogrula(P) {
  const { x, y } = noktaKopyala(P);
  return { x: Math.max(0, Math.min(TEZGAH, x)), y: Math.max(0, Math.min(TEZGAH, y)) };
}

function birimeCevir(ortam, px) {
  const birim = ortam.pxToBirim(px);
  if (!Number.isFinite(birim) || birim <= 0) gecersiz();
  return birim;
}

function aciklikDogrula(deger, ortam) {
  if (!Number.isFinite(deger)) gecersiz();
  return Math.max(birimeCevir(ortam, TOLERANS.pimYakalamaPx), deger);
}

function ayarDogrula(ayar, ortam) {
  if (!ayar || typeof ayar !== 'object' || Array.isArray(ayar)) gecersiz();
  if (Object.keys(ayar).some(ad => !AYARLAR.includes(ad))) gecersiz();
  if (!ortam || typeof ortam.pxToBirim !== 'function') gecersiz();
  if (ortam.sembol !== undefined && typeof ortam.sembol?.goster !== 'function') gecersiz();
  const kilit = ayar.kilitli ?? false;
  const renk = ayar.renk ?? 'mavi';
  if (typeof kilit !== 'boolean' || typeof ayar.olcuKilidi !== 'boolean') gecersiz();
  if (!['mavi', 'turuncu'].includes(renk)) gecersiz();
  return {
    merkez: merkezDogrula(ayar.merkez ?? { x: 500, y: 500 }),
    aciklik: aciklikDogrula(ayar.aciklik ?? 160, ortam),
    kilit, kilitKaynagi: kilit ? 'ayar' : null, renk, olcuKilidi: ayar.olcuKilidi
  };
}

function sabitKilit(durum) {
  return durum.kilitKaynagi === 'kopya' || durum.kilitKaynagi === 'parca';
}

function kilidiAyarla(durum, kilit) {
  if (typeof kilit !== 'boolean') gecersiz();
  if (sabitKilit(durum)) return;
  durum.kilit = kilit;
  durum.kilitKaynagi = kilit ? 'elle' : null;
}

function acikligiKilitle(durum, aciklik, kaynak, ortam) {
  durum.aciklik = aciklikDogrula(aciklik, ortam);
  durum.kilit = true;
  durum.kilitKaynagi = kaynak;
}

function cemberOlustur(durum) {
  return { merkez: noktaKopyala(durum.merkez), r: durum.aciklik };
}

function yayOlustur(durum, bas, bit, yon) {
  if (!['saat', 'ters'].includes(yon)) gecersiz();
  return { ...cemberOlustur(durum), bas: aciNormalize(bas), bit: aciNormalize(bit), yon };
}

function pergelCiz(durum, ortam, sahne) {
  const merkez = noktaKopyala(durum.merkez);
  const uc = { x: merkez.x + durum.aciklik, y: merkez.y };
  const eklem = { x: merkez.x, y: merkez.y - EKLEM_ORANI * durum.aciklik };
  const renk = durum.renk;
  sahne.katman('ust');
  sahne.parca(merkez, eklem, { renk });
  sahne.parca(eklem, uc, { renk });
  sahne.pim(merkez, { id: 'pergelMerkez', renk });
  sahne.pim(uc, { id: 'pergelUc', boyut: 'kucuk', renk });
  sahne.pim(eklem, { id: 'pergelKilit', renk: durum.kilit ? 'turuncu' : 'gri' });
  if (durum.kilit) {
    sahne.cember({ merkez: uc, r: birimeCevir(ortam, HALKA_PX) }, { renk });
  }
  if (durum.olcuKilidi === false) {
    sahne.sayi({ x: uc.x, y: uc.y + ETIKET_KAYMASI }, Math.round(durum.aciklik));
  }
}

function merkeziTasi(durum, olay) {
  const dx = olay.dx ?? 0;
  const dy = olay.dy ?? 0;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) gecersiz();
  durum.merkez = merkezDogrula({ x: durum.merkez.x + dx, y: durum.merkez.y + dy });
}

function girdiyiIsle(durum, ortam, olay, secim) {
  if (!olay) return false;
  if (olay.hedef === 'pergelKilit' && olay.tur === 'tik') {
    kilidiAyarla(durum, !durum.kilit);
    return true;
  }
  if (!['bas', 'surukle', 'birak'].includes(olay.tur)) return false;
  const hedef = olay.hedef || secim.hedef;
  if (!['pergelMerkez', 'pergelUc'].includes(hedef)) return false;
  if (olay.tur === 'bas') secim.hedef = hedef;
  if (olay.tur === 'surukle') {
    if (hedef === 'pergelMerkez') merkeziTasi(durum, olay);
    else if (!durum.kilit) {
      durum.aciklik = aciklikDogrula(uzaklik(durum.merkez, noktaKopyala(olay)), ortam);
    }
  }
  if (olay.tur === 'birak') secim.hedef = null;
  return true;
}

function durumuKopyala(durum) {
  return { ...durum, merkez: noktaKopyala(durum.merkez) };
}

function durumuYukle(durum, kayit, ortam, secim) {
  if (!kayit || typeof kayit !== 'object' || Array.isArray(kayit)) gecersiz();
  const yeni = ayarDogrula({
    merkez: kayit.merkez, aciklik: kayit.aciklik, kilitli: kayit.kilit,
    renk: kayit.renk, olcuKilidi: kayit.olcuKilidi
  }, ortam);
  if (!KILIT_KAYNAKLARI.includes(kayit.kilitKaynagi) ||
      yeni.kilit !== (kayit.kilitKaynagi !== null)) gecersiz();
  yeni.kilitKaynagi = kayit.kilitKaynagi;
  Object.assign(durum, yeni);
  secim.hedef = null;
}

function nesneOlustur(durum, ortam) {
  const secim = { hedef: null };
  return {
    get merkez() { return noktaKopyala(durum.merkez); },
    set merkez(P) { durum.merkez = merkezDogrula(P); },
    get aciklik() { return durum.aciklik; },
    set aciklik(deger) { durum.aciklik = aciklikDogrula(deger, ortam); },
    get kilit() { return durum.kilit; },
    set kilit(deger) { kilidiAyarla(durum, deger); },
    kilitle() { kilidiAyarla(durum, true); },
    kopyala(kaynak) { acikligiKilitle(durum, kaynak?.aciklik, 'kopya', ortam); },
    acikligiAl(A, B) {
      acikligiKilitle(durum, uzaklik(noktaKopyala(A), noktaKopyala(B)), 'parca', ortam);
    },
    cemberCiz() { return cemberOlustur(durum); },
    yayCiz(bas, bit, yon) {
      return yayOlustur(durum, bas, bit, yon === undefined ? 'saat' : yon);
    },
    ciz(sahne) { pergelCiz(durum, ortam, sahne); },
    girdi(olay) { return girdiyiIsle(durum, ortam, olay, secim); },
    durum() { return durumuKopyala(durum); },
    yukle(kayit) { durumuYukle(durum, kayit, ortam, secim); }
  };
}

/** @param {PergelAyar} ayar
 * @param {{pxToBirim:(px:number)=>number, sembol?:Sembol}} ortam @returns {Pergel} */
export function pergelOlustur(ayar, ortam) {
  return nesneOlustur(ayarDogrula(ayar, ortam), ortam);
}
