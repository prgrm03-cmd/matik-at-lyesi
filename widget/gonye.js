import { aciNormalize, dikme, ilerle, noktaDogruUzakligi, paralelMi, TOLERANS,
  uzaklik, yonAci } from '../geo/index.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Dogru */
/** @typedef {{dogru:Dogru, kilitli?:boolean}} GonyeAyar */
/** @typedef {Object} Gonye
 * @property {boolean} oturdu
 * @property {number} t
 * @property {(P:Nokta)=>Parca|null} dikmeBirak
 * @property {()=>void} otur
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 * @property {()=>Object} durum
 * @property {(durum:Object)=>void} yukle
 */

const KENAR = 220;
const KISA_ORAN = 0.6;
const DIK_BOYUT = 18;
const CENTIK_YARISI = 6;
const CENTIK_ARALIK = 8;
const AYARLAR = ['dogru', 'kilitli'];

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function noktaKopyala(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) gecersiz();
  return { x: P.x, y: P.y };
}

function yonDogrula(yon) {
  if (!Number.isFinite(yon)) gecersiz();
  return yon >= 0 && yon < 360 ? yon : aciNormalize(yon);
}

function ayarDogrula(ayar, ortam) {
  if (!ayar || typeof ayar !== 'object' || Array.isArray(ayar)) gecersiz();
  if (Object.keys(ayar).some(ad => !AYARLAR.includes(ad))) gecersiz();
  if (!ortam || typeof ortam.pxToBirim !== 'function') gecersiz();
  if (!ayar.dogru) gecersiz();
  const dogru = { A: noktaKopyala(ayar.dogru.A), yon: yonDogrula(ayar.dogru.yon) };
  const kilitli = ayar.kilitli ?? false;
  if (typeof kilitli !== 'boolean') gecersiz();
  return { dogru, kilitli };
}

function yakalamaBirim(ortam) {
  const tol = ortam.pxToBirim(TOLERANS.pimYakalamaPx);
  if (!Number.isFinite(tol) || tol <= 0) gecersiz();
  return tol;
}

function oturmayiHesapla(gonye, durum, dogru, ortam) {
  gonye.oturdu = paralelMi(durum.donus, dogru.yon, TOLERANS.dikme) &&
    noktaDogruUzakligi(durum.merkez, dogru) <= yakalamaBirim(ortam);
  if (!gonye.oturdu) return;
  const ayak = dikme(dogru, durum.merkez).ayak;
  const yon = ilerle({ x: 0, y: 0 }, dogru.yon, 1);
  gonye.t = (ayak.x - dogru.A.x) * yon.x + (ayak.y - dogru.A.y) * yon.y;
}

function dikIsaretiCiz(sahne, durum) {
  const A = ilerle(durum.merkez, durum.donus, DIK_BOYUT);
  const B = ilerle(A, durum.donus + 90, DIK_BOYUT);
  const C = ilerle(durum.merkez, durum.donus + 90, DIK_BOYUT);
  sahne.parca(A, B, { renk: 'gri' });
  sahne.parca(B, C, { renk: 'gri' });
}

function centikleriCiz(sahne, durum, oturdu, renk) {
  const sayi = oturdu ? 2 : 1;
  for (let i = 0; i < sayi; i++) {
    const kayma = (i - (sayi - 1) / 2) * CENTIK_ARALIK;
    const P = ilerle(durum.merkez, durum.donus, KENAR / 2 + kayma);
    const A = ilerle(P, durum.donus + 90, CENTIK_YARISI);
    const B = ilerle(P, durum.donus - 90, CENTIK_YARISI);
    sahne.parca(A, B, { renk });
  }
}

function gonyeCiz(sahne, durum, oturdu) {
  const merkez = noktaKopyala(durum.merkez);
  const A = ilerle(merkez, durum.donus, KENAR);
  const B = ilerle(merkez, durum.donus + 90, KENAR * KISA_ORAN);
  const renk = oturdu ? 'yesil' : 'turuncu';
  sahne.katman('ust');
  sahne.cokgen([merkez, A, B], { id: 'gonye', renk: 'gri' });
  sahne.parca(merkez, A, { renk });
  dikIsaretiCiz(sahne, durum);
  centikleriCiz(sahne, durum, oturdu, renk);
  sahne.pim(merkez, { id: 'gonyeKose', boyut: 'kucuk' });
}

function secimiBaslat(durum, olay, hedef) {
  let baslangicFarki = 0;
  if (hedef === 'gonyeKose') {
    const P = noktaKopyala(olay);
    if (uzaklik(durum.merkez, P) !== 0) {
      baslangicFarki = yonAci(durum.merkez, P) - durum.donus;
    }
  }
  durum.secim = { hedef, baslangicFarki };
}

function surukle(durum, olay, hedef) {
  if (hedef === 'gonye') {
    if (!Number.isFinite(olay.dx) || !Number.isFinite(olay.dy)) gecersiz();
    durum.merkez = noktaKopyala({ x: durum.merkez.x + olay.dx,
      y: durum.merkez.y + olay.dy });
    return;
  }
  const P = noktaKopyala(olay);
  if (uzaklik(durum.merkez, P) === 0) return;
  const fark = durum.secim?.baslangicFarki ?? 0;
  durum.donus = yonDogrula(yonAci(durum.merkez, P) - fark);
}

function girdiyiIsle(durum, olay) {
  if (!olay || !['bas', 'surukle', 'birak'].includes(olay.tur)) return false;
  const hedef = olay.hedef || durum.secim?.hedef;
  if (!['gonye', 'gonyeKose'].includes(hedef)) return false;
  if (olay.tur === 'bas') secimiBaslat(durum, olay, hedef);
  else if (olay.tur === 'surukle') surukle(durum, olay, hedef);
  else durum.secim = null;
  return true;
}

function durumuKopyala(gonye, durum) {
  return { merkez: noktaKopyala(durum.merkez), donus: durum.donus,
    oturdu: gonye.oturdu, t: gonye.t };
}

function durumuYukle(gonye, durum, kayit) {
  if (!kayit || typeof kayit !== 'object' || Array.isArray(kayit)) gecersiz();
  const merkez = noktaKopyala(kayit.merkez);
  const donus = yonDogrula(kayit.donus);
  if (typeof kayit.oturdu !== 'boolean' || !Number.isFinite(kayit.t)) gecersiz();
  Object.assign(durum, { merkez, donus, secim: null });
  gonye.t = kayit.t;
}

function nesneOlustur(durum, ayar, ortam) {
  const gonye = {
    oturdu: false,
    t: 0,
    dikmeBirak(P) { return gonye.oturdu ? dikme(ayar.dogru, P).parca : null; },
    otur() {
      durum.merkez = dikme(ayar.dogru, durum.merkez).ayak;
      durum.donus = ayar.dogru.yon;
      durum.secim = null;
      oturmayiHesapla(gonye, durum, ayar.dogru, ortam);
    },
    ciz(sahne) {
      if (!ayar.kilitli) gonyeCiz(sahne, durum, gonye.oturdu);
    },
    girdi(olay) {
      if (ayar.kilitli) return false;
      const tuketildi = girdiyiIsle(durum, olay);
      oturmayiHesapla(gonye, durum, ayar.dogru, ortam);
      return tuketildi;
    },
    durum() { return durumuKopyala(gonye, durum); },
    yukle(kayit) {
      durumuYukle(gonye, durum, kayit);
      oturmayiHesapla(gonye, durum, ayar.dogru, ortam);
    }
  };
  oturmayiHesapla(gonye, durum, ayar.dogru, ortam);
  return gonye;
}

/** @param {GonyeAyar} ayar
 * @param {{pxToBirim:(px:number)=>number, sembol?:Sembol}} ortam @returns {Gonye} */
export function gonyeOlustur(ayar, ortam) {
  const secenek = ayarDogrula(ayar, ortam);
  yakalamaBirim(ortam);
  return nesneOlustur({ merkez: { x: 500, y: 500 }, donus: 0, secim: null }, secenek, ortam);
}
