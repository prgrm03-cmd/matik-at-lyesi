import { aciFark, aciNormalize, aciOku, dikme, ilerle, TOLERANS, uzaklik, yonAci }
  from '../geo/index.js';

/** @typedef {{x:number,y:number}} Nokta */
/** @typedef {{soket?:Nokta,hizasiz?:boolean,olcekYonu?:'ic'|'dis'|'rastgele',
 * kilitli?:boolean,toleransGoster?:boolean}} AciolcerAyar */
/** @typedef {Object} Aciolcer
 * @property {Nokta} merkez
 * @property {number} donus
 * @property {'ic'|'dis'} olcekYonu
 * @property {(soket:Nokta,baslangicYon:number)=>
 * {merkezTamam:boolean,sifirTamam:boolean}} hizaliMi
 * @property {(kolYon:number)=>{ic:number,dis:number,dogru:'ic'|'dis'}} okuma
 * @property {()=>void} hizala
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 * @property {()=>Object} durum
 * @property {(durum:Object)=>void} yukle
 */

const YARICAP = 240;
const KAYMA = 240;
const TELEFON_OLCEGI = 1000 / 360;
const VARSAYILAN_SOKET = Object.freeze({ x: 500, y: 500 });
const IC_CENTIK_BAS_ORANI = 0.60;
const IC_YARICAP_ORANI = 0.68;
const DIS_CENTIK_BAS_ORANI = 0.94;
const DIS_ETIKET_ORANI = 0.84;
const IC_ETIKET_ORANI = 0.5;
const KENAR_ORANI = 0.7;
const CENTIK_ADIMI = 10;
const DENEME_SINIRI = 32;
const RAKAM_ADIMI = 30;
const RAKAM_BOYUTU = 12;
const UC_ETIKET_KAYMASI = 22;
const AYARLAR = ['soket', 'hizasiz', 'olcekYonu', 'kilitli', 'toleransGoster'];
const SEGMENTLER = [
  [0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 1, 2], [0, 2, 1, 2],
  [0, 1, 0, 2], [0, 0, 0, 1], [0, 1, 1, 1]
];
const RAKAMLAR = ['012345', '12', '01643', '01236', '5612', '05623',
  '054326', '012', '0123456', '012356'];

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function noktaKopyala(P) {
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) gecersiz();
  return { x: P.x, y: P.y };
}

function yonDogrula(yon) {
  if (!Number.isFinite(yon)) gecersiz();
  return aciNormalize(Math.round(yon));
}

function olcekDogrula(yon) {
  if (yon !== 'ic' && yon !== 'dis') gecersiz();
  return yon;
}

function mesafeIcinde(P, Q, tol) {
  const hata = Number.EPSILON *
    (Math.abs(P.x) + Math.abs(P.y) + Math.abs(Q.x) + Math.abs(Q.y) + tol);
  return uzaklik(P, Q) <= tol + hata;
}

function ayarDogrula(ayar, rng) {
  const a = ayar === undefined ? {} : ayar;
  if (!a || typeof a !== 'object' || Array.isArray(a)) gecersiz();
  if (Object.keys(a).some(ad => !AYARLAR.includes(ad))) gecersiz();
  const { hizasiz = true, olcekYonu = 'rastgele', kilitli = false,
    toleransGoster = false } = a;
  if ([hizasiz, kilitli, toleransGoster].some(v => typeof v !== 'boolean')) gecersiz();
  if (!['ic', 'dis', 'rastgele'].includes(olcekYonu)) gecersiz();
  if ((hizasiz || olcekYonu === 'rastgele') &&
      (!rng || typeof rng.tam !== 'function' || typeof rng.bool !== 'function')) gecersiz();
  return { soket: noktaKopyala(a.soket === undefined ? VARSAYILAN_SOKET : a.soket),
    hizasiz, olcekYonu, kilitli, toleransGoster };
}

function merkezUret(soket, rng, tol) {
  for (let i = 0; i < DENEME_SINIRI; i++) {
    const P = { x: soket.x + rng.tam(-KAYMA, KAYMA), y: soket.y + rng.tam(-KAYMA, KAYMA) };
    if (!mesafeIcinde(P, soket, tol)) return P;
  }
  return { x: soket.x + KAYMA, y: soket.y + KAYMA };
}

function durumuOlustur(ayar, rng) {
  const donus = ayar.hizasiz ? rng.tam(0, 359) : 0;
  const tol = TOLERANS.pimYakalamaPx * TELEFON_OLCEGI;
  const merkez = ayar.hizasiz ? merkezUret(ayar.soket, rng, tol) : noktaKopyala(ayar.soket);
  const olcekYonu = ayar.olcekYonu === 'rastgele' ? (rng.bool() ? 'ic' : 'dis') : ayar.olcekYonu;
  return { merkez, donus, olcekYonu,
    hedef: { soket: noktaKopyala(ayar.soket), yon: 0 }, secim: null };
}

function hizayiDene(durum, soket, baslangicYon, tol) {
  const hedef = noktaKopyala(soket);
  if (!Number.isFinite(baslangicYon)) gecersiz();
  durum.hedef = { soket: hedef, yon: baslangicYon };
  return {
    merkezTamam: mesafeIcinde(durum.merkez, hedef, tol),
    sifirTamam: aciFark(durum.donus, baslangicYon) <= TOLERANS.aciOkuma
  };
}

function hedefeHizala(durum) {
  durum.merkez = noktaKopyala(durum.hedef.soket);
  durum.donus = yonDogrula(durum.hedef.yon);
  durum.secim = null;
}

function yerelNokta(P, donus, x, y) {
  let Q = P;
  if (x !== 0) Q = ilerle(Q, donus + (x < 0 ? 180 : 0), Math.abs(x));
  if (y !== 0) Q = ilerle(Q, donus + (y < 0 ? 270 : 90), Math.abs(y));
  return Q;
}

function rakamCiz(sahne, P, donus, rakam, kayma, renk) {
  for (const parca of RAKAMLAR[rakam]) {
    const [x1, y1, x2, y2] = SEGMENTLER[Number(parca)];
    const A = yerelNokta(P, donus, (x1 + kayma) * RAKAM_BOYUTU, (y1 - 1) * RAKAM_BOYUTU);
    const B = yerelNokta(P, donus, (x2 + kayma) * RAKAM_BOYUTU, (y2 - 1) * RAKAM_BOYUTU);
    sahne.cokgen([A, B], { renk, kalinlik: 'ince' });
  }
}

function rakamlariCiz(sahne, P, donus, deger, renk) {
  const rakamlar = String(deger);
  for (let i = 0; i < rakamlar.length; i++) {
    rakamCiz(sahne, P, donus, Number(rakamlar[i]), i * 2 - rakamlar.length + 0.5, renk);
  }
}

function olcekCiz(sahne, durum, aci, tur, deger) {
  const ic = tur === 'ic';
  const renk = ic ? 'mavi' : 'turuncu';
  const yon = durum.donus + aci;
  const basOrani = ic ? IC_CENTIK_BAS_ORANI : DIS_CENTIK_BAS_ORANI;
  const A = ilerle(durum.merkez, yon, YARICAP * basOrani);
  const B = ilerle(durum.merkez, yon, YARICAP * (ic ? IC_YARICAP_ORANI : 1));
  const kalinlik = aci % 90 === 0 ? 'kalin' : 'normal';
  sahne.parca(A, B, { renk, kalinlik, kesik: ic, id: 'aciolcer' + (ic ? 'Ic' : 'Dis') + aci });
  if (aci % RAKAM_ADIMI === 0) {
    let P = ilerle(durum.merkez, yon, YARICAP * (ic ? IC_ETIKET_ORANI : DIS_ETIKET_ORANI));
    if (aci === 0 || aci === 180) P = ilerle(P, durum.donus + 90, UC_ETIKET_KAYMASI);
    rakamlariCiz(sahne, P, durum.donus, deger, renk);
  }
}

function yayNoktalari(durum, r) {
  const noktalar = [];
  for (let aci = 0; aci <= 180; aci += CENTIK_ADIMI) {
    noktalar.push(ilerle(durum.merkez, durum.donus + aci, r));
  }
  return noktalar;
}

function yayCiz(sahne, noktalar, secenek) {
  for (let i = 1; i < noktalar.length; i++) {
    if (secenek.kesik && i % 2 === 0) continue;
    sahne.cokgen([noktalar[i - 1], noktalar[i]], secenek);
  }
}

function govdeCiz(sahne, durum) {
  const disYay = yayNoktalari(durum, YARICAP);
  sahne.cokgen([noktaKopyala(durum.merkez), ...disYay], { renk: 'gri', dolgu: true });
  yayCiz(sahne, disYay, { renk: 'turuncu' });
  yayCiz(sahne, yayNoktalari(durum, YARICAP * IC_YARICAP_ORANI), { renk: 'mavi', kesik: true });
  const A = ilerle(durum.merkez, durum.donus, YARICAP);
  const B = ilerle(durum.merkez, durum.donus + 180, YARICAP);
  sahne.parca(A, B, { renk: 'gri', kalinlik: 'kalin' });
}

function aciolcerCiz(sahne, durum, ayar) {
  if (ayar.kilitli) return;
  sahne.katman('ust');
  govdeCiz(sahne, durum);
  for (let aci = 0; aci <= 180; aci += CENTIK_ADIMI) {
    const okunan = aciOku(durum.merkez, durum.donus, durum.donus + aci, durum.olcekYonu);
    olcekCiz(sahne, durum, aci, 'ic', okunan.ic);
    olcekCiz(sahne, durum, aci, 'dis', okunan.dis);
  }
  sahne.pim(durum.merkez, { id: 'aciolcerMerkez', renk: 'gri', boyut: 'buyuk' });
}

function yarimDairede(durum, P, yon, tol) {
  const aci = aciNormalize(yon - durum.donus);
  if (aci <= 180) return true;
  const { ayak } = dikme({ A: durum.merkez, yon: durum.donus }, P);
  return mesafeIcinde(ayak, P, tol);
}

function secimiBaslat(durum, olay, tol) {
  if (!Number.isFinite(olay.x) || !Number.isFinite(olay.y)) return false;
  durum.secim = null;
  if (mesafeIcinde(durum.merkez, olay, tol)) durum.secim = { tur: 'merkez' };
  else if (!mesafeIcinde(durum.merkez, olay, YARICAP * KENAR_ORANI) &&
      mesafeIcinde(durum.merkez, olay, YARICAP + tol)) {
    const yon = yonAci(durum.merkez, olay);
    if (!yarimDairede(durum, olay, yon, tol)) return false;
    durum.secim = { tur: 'kenar', yon, hamDonus: durum.donus };
  }
  if (!durum.secim) return false;
  return true;
}

function surukle(durum, olay) {
  if (durum.secim.tur === 'merkez') {
    if (!Number.isFinite(olay.dx) || !Number.isFinite(olay.dy)) return false;
    durum.merkez = noktaKopyala({ x: durum.merkez.x + olay.dx, y: durum.merkez.y + olay.dy });
  } else {
    const P = noktaKopyala(olay);
    if (uzaklik(durum.merkez, P) === 0) return true;
    const yon = yonAci(durum.merkez, P);
    const fark = aciNormalize(yon - durum.secim.yon + 180) - 180;
    durum.secim.hamDonus += fark;
    durum.donus = yonDogrula(durum.secim.hamDonus);
    durum.secim.yon = yon;
  }
  return true;
}

function girdiyiIsle(durum, olay, tol) {
  if (!olay) return false;
  if (olay.tur === 'bas') return secimiBaslat(durum, olay, tol);
  if (!durum.secim) return false;
  if (olay.tur === 'surukle') {
    return surukle(durum, olay);
  }
  if (olay.tur !== 'birak') return false;
  durum.secim = null;
  return true;
}

function durumuKopyala(durum) {
  return { merkez: noktaKopyala(durum.merkez), donus: durum.donus, olcekYonu: durum.olcekYonu };
}

function durumuYukle(durum, kayit) {
  if (!kayit || typeof kayit !== 'object' || Array.isArray(kayit)) gecersiz();
  const yeni = { merkez: noktaKopyala(kayit.merkez), donus: yonDogrula(kayit.donus),
    olcekYonu: olcekDogrula(kayit.olcekYonu) };
  Object.assign(durum, yeni);
  durum.secim = null;
}

function yakalamaBirim(gorunum) {
  return gorunum.sahne ? gorunum.sahne.pxToBirim(TOLERANS.pimYakalamaPx) :
    TOLERANS.pimYakalamaPx * TELEFON_OLCEGI;
}

function nesneOlustur(durum, ayar) {
  const gorunum = { sahne: null };
  return {
    get merkez() { return noktaKopyala(durum.merkez); },
    set merkez(P) { durum.merkez = noktaKopyala(P); },
    get donus() { return durum.donus; },
    set donus(yon) { durum.donus = yonDogrula(yon); },
    get olcekYonu() { return durum.olcekYonu; },
    set olcekYonu(yon) { durum.olcekYonu = olcekDogrula(yon); },
    hizaliMi(soket, baslangicYon) {
      return hizayiDene(durum, soket, baslangicYon, yakalamaBirim(gorunum));
    },
    okuma(kolYon) { return aciOku(durum.merkez, durum.donus, kolYon, durum.olcekYonu); },
    hizala() { hedefeHizala(durum); },
    ciz(sahne) {
      if (!ayar.kilitli) gorunum.sahne = sahne;
      aciolcerCiz(sahne, durum, ayar);
    },
    girdi(olay) {
      if (ayar.kilitli) return false;
      return girdiyiIsle(durum, olay, yakalamaBirim(gorunum));
    },
    durum() { return durumuKopyala(durum); },
    yukle(kayit) { durumuYukle(durum, kayit); }
  };
}

/** @param {AciolcerAyar} ayar @param {Rng} rng @returns {Aciolcer} */
export function aciolcerOlustur(ayar, rng) {
  const secenek = ayarDogrula(ayar, rng);
  return nesneOlustur(durumuOlustur(secenek, rng), secenek);
}
