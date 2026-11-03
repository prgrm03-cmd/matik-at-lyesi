// D09 · Robot Kolu · sahip CX-A · sözleşme v1.0

/** @type {string} */
export const id = 'D09';
/** @type {string} */
export const surum = '1.0.0';

const RAF_GENISLIGI = 16;
const TUTAMAK_UZAKLIGI = 350;
const ANIMASYON_SURESI = 800;

/** @param {Ctx} ctx @param {number} seed @returns {void} */
export function kur(ctx, seed) {
  const gecmis = [...(ctx.durum.gecmis || [])].slice(-5);
  const A = { x: 500, y: 500 };
  const hedef = hedefUret(ctx, gecmis);
  const kol1Yon = sabitYonUret(ctx);
  const kol2Yon = kol1Yon;
  ctx.durum = {
    seed, gecmis, A, hedef, kol1Yon, kol2Yon, kolMevcutYon: kol2Yon,
    kolUzunlugu: ctx.geo.rastgeleKolUzunlugu(ctx.rng, hedef),
    aciolcer: ctx.widget.aciolcer({ soket: A, hizasiz: true, olcekYonu: 'rastgele' }),
    tur: ctx.tur, asama: 0
  };
  // ADT-012: İ3 yalnız hizala() çağırabilsin diye hedef bir kez kaydedilir.
  ctx.durum.aciolcer.hizaliMi(A, kol1Yon);
}

function hedefUret(ctx, gecmis) {
  const { rng, geo } = ctx;
  const { min, max, cirkinOran, adim, haric = [] } = ctx.veri.parametreler.aci;
  const ornek = geo.rastgeleAci(rng, [min, max], {
    cirkin: cirkinOran, adim, haric: [...gecmis, ...haric]
  });
  // Üreticinin güzel/çirkin seçimi korunur; asıl sipariş halka tamponundan gelir.
  let hedef;
  do {
    hedef = rng.tamHaric(min, max, gecmis, geo.TOLERANS.tekrarKomsulugu);
  } while ((hedef % 5 === 0) !== (ornek % 5 === 0) || haric.includes(hedef) ||
    (hedef - min) % adim !== 0);
  return hedef;
}

function sabitYonUret(ctx) {
  const { rng, geo } = ctx;
  let yon;
  do {
    yon = geo.rastgeleYon(rng);
  } while ([0, 90, 180, 270].some(eksen =>
    geo.aciFark(yon, eksen) <= geo.TOLERANS.aciOkuma));
  return yon;
}

function rafCiz(ctx) {
  const { A, kol1Yon, hedef, kolUzunlugu } = ctx.durum;
  const yon = kol1Yon + hedef;
  const tol = ctx.geo.TOLERANS.aciRaf(RAF_GENISLIGI);
  ctx.sahne.yay({ merkez: A, r: kolUzunlugu, bas: yon - tol, bit: yon + tol,
    yon: 'saat' }, { renk: 'yesil', kalinlik: 'kalin', id: 'raf' });
  ctx.sahne.etiket({ x: 70, y: 70 }, 'raf');
  ctx.sahne.sayi({ x: 70, y: 125 }, hedef);
}

function kollarCiz(ctx) {
  const { A, kol1Yon, kol2Yon, kolMevcutYon, kolUzunlugu } = ctx.durum;
  const sabitUc = ctx.geo.ilerle(A, kol1Yon, kolUzunlugu);
  const hareketliUc = ctx.geo.ilerle(A, kolMevcutYon, kolUzunlugu);
  const tutamak = ctx.geo.ilerle(A, kol2Yon, TUTAMAK_UZAKLIGI);
  ctx.sahne.parca(A, sabitUc, { renk: 'gri', kalinlik: 'kalin', id: 'kol1' });
  ctx.sahne.parca(A, hareketliUc, { renk: 'turuncu', kalinlik: 'kalin', id: 'robotKol' });
  // Kesik kol öğrencinin komutudur; dolu kol Çalıştır ile bu yöne hareket eder.
  ctx.sahne.parca(A, tutamak, { renk: 'mavi', kesik: true, id: 'kol2' });
  ctx.sahne.pim(A, { ad: 'A', id: 'pimA', renk: 'gri' });
}

function okumayiCiz(ctx) {
  const { aciolcer, kol2Yon } = ctx.durum;
  const okuma = aciolcer.okuma(kol2Yon);
  ctx.sahne.etiket({ x: 70, y: 875 }, 'okumaIc');
  ctx.sahne.sayi({ x: 70, y: 930 }, okuma.ic);
  ctx.sahne.etiket({ x: 530, y: 875 }, 'okumaDis');
  ctx.sahne.sayi({ x: 530, y: 930 }, okuma.dis);
}

function koluYonlendir(ctx, olay) {
  const { A } = ctx.durum;
  if (olay.hedef !== 'kol2' || !A || !Number.isFinite(olay.x) ||
      !Number.isFinite(olay.y) || ctx.geo.uzaklik(A, olay) === 0) return;
  // Hüküm ham açıyı kullanır; yalnız gösterilen okuma tam dereceye yuvarlanır.
  ctx.durum.kol2Yon = ctx.geo.yonAci(A, olay);
}

function sonuc(neden) {
  return { tamam: neden === 'tamam', yanParca: false, neden };
}

/** @param {Ctx} ctx @returns {void} */
export function ciz(ctx) {
  ctx.sahne.katman('alt');
  rafCiz(ctx);
  kollarCiz(ctx);
  ctx.durum.aciolcer.ciz(ctx.sahne);
  okumayiCiz(ctx);
  ctx.sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

/** @param {Ctx} ctx @param {Olay} olay @returns {void} */
export function girdi(ctx, olay) {
  // Kuru koşu doğrudan düzeneğe verir; motorda tüketilen olay buraya gelmez.
  if (ctx.durum.aciolcer.girdi(olay)) return;
  switch (olay.tur) {
    case 'surukle':
      koluYonlendir(ctx, olay);
      break;
    case 'dugme':
      break;
    default:
      break;
  }
}

/** @param {Ctx} ctx @returns {Calistirma} */
export function calistir(ctx) {
  const { durum, geo } = ctx;
  const bas = durum.kolMevcutYon;
  const son = durum.kol2Yon;
  const hazir = durum.A && Number.isFinite(bas) && Number.isFinite(son);
  const fark = hazir ? geo.aciNormalize(son - bas + 180) - 180 : 0;
  return {
    sure: ANIMASYON_SURESI,
    kare(t) {
      if (hazir) durum.kolMevcutYon = geo.aciNormalize(bas + fark * t);
      durum.asama = t;
    },
    bitti() {
      // Siparişin cevabı değil, öğrencinin seçtiği nihai yön uygulanır.
      if (hazir) durum.kolMevcutYon = durum.kol2Yon = son;
      durum.asama = 1;
    }
  };
}

/** @param {Ctx} ctx @returns {{tamam:boolean, yanParca:boolean, neden:string}} */
export function basari(ctx) {
  const { A, kol1Yon, kol2Yon, hedef, aciolcer } = ctx.durum;
  if (!A || !Number.isFinite(kol2Yon)) return sonuc('yarimKaldi');
  const { merkezTamam, sifirTamam } = aciolcer.hizaliMi(A, kol1Yon);
  if (!merkezTamam && !sifirTamam) return sonuc('aciolcerYerindeDegil');
  const tol = ctx.geo.TOLERANS.aciRaf(RAF_GENISLIGI);
  const gercek = ctx.geo.aciNormalize(kol2Yon - kol1Yon);
  if (ctx.geo.aciFark(gercek, hedef) <= tol) return sonuc('tamam');
  const okuma = aciolcer.okuma(kol2Yon);
  // Karşı sıra geometrik olarak 180−okunan'dır; ayrıca bir sıra seçimi aranmaz.
  if (ctx.geo.aciFark(180 - okuma[okuma.dogru], hedef) <= tol) {
    return sonuc('olcekTers');
  }
  return sonuc('rafDisi');
}

/** @param {Ctx} ctx @param {1|2|3} seviye @returns {{anahtar?:string}} */
export function ipucu(ctx, seviye) {
  const { aciolcer, A, kol1Yon } = ctx.durum;
  if (seviye === 1) {
    const { merkezTamam } = aciolcer.hizaliMi(A, kol1Yon);
    ctx.sahne.vurgula(merkezTamam ? 'raf' : 'pimA');
  }
  if (seviye === 2) return { anahtar: 'i2' };
  if (seviye === 3) aciolcer.hizala();
  return {};
}

/** @param {Ctx} ctx @param {TahtaAyar} ayarlar @returns {void} */
export function tahta(ctx, ayarlar) {
  // Ölçek ve düğme boyutlarını motor yönetir; geometri cihazdan bağımsızdır.
  void ctx;
  void ayarlar;
}
