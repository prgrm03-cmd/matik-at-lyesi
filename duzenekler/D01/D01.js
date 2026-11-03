// D01 · Dolap Düzeni · sahip CX-M · sözleşme v1.0
// Bu iskelet bölüm sırası ve ctx kullanımı için örnektir; tam tasarım sonraki bilettedir.

/** @type {string} */
export const id = 'D01';
/** @type {string} */
export const surum = '1.0.1';

/** @param {Ctx} ctx @param {number} seed @returns {void} */
export function kur(ctx, seed) {
  const aralik = ctx.veri.parametreler.konum;
  // Rastgelelik yalnız motorun önceden seed'lediği ctx.rng üzerinden gelir.
  ctx.durum = {
    seed,
    pimler: [
      { id: 'pimA', ad: 'A', x: ctx.rng.tam(aralik.min, aralik.max), y: aralik.min },
      { id: 'pimB', ad: 'B', x: ctx.rng.tam(aralik.min, aralik.max), y: aralik.max }
    ],
    gecmis: [],
    tur: ctx.tur,
    asama: 0
  };
}

function pimiTasi(ctx, olay) {
  const pim = ctx.durum.pimler.find((oge) => oge.id === olay.hedef);
  if (!pim) return;
  pim.x = Math.max(0, Math.min(ctx.sahne.genislik, olay.x));
  pim.y = Math.max(0, Math.min(ctx.sahne.yukseklik, olay.y));
}

/** @param {Ctx} ctx @returns {void} */
export function ciz(ctx) {
  const [A, B] = ctx.durum.pimler;
  // Önce bağlantı, sonra pimler; burada durum değişmez.
  ctx.sahne.katman('alt');
  ctx.sahne.parca(A, B, { renk: 'gri', id: 'baglanti' });
  for (const pim of ctx.durum.pimler) {
    ctx.sahne.pim(pim, { id: pim.id, ad: pim.ad, renk: 'mavi' });
  }
  ctx.sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

/** @param {Ctx} ctx @param {Olay} olay @returns {void} */
export function girdi(ctx, olay) {
  switch (olay.tur) {
    case 'surukle':
      pimiTasi(ctx, olay);
      break;
    case 'dugme':
      // Çalıştır düğmesini motor işler; düzenek kendi düğmelerini burada ayırır.
      break;
    default:
      break;
  }
}

/** @param {Ctx} ctx @returns {Calistirma} */
export function calistir(ctx) {
  return {
    sure: 0,
    kare(t) { ctx.durum.asama = t; },
    bitti() { ctx.durum.asama = 1; }
  };
}

/** @param {Ctx} ctx @returns {{tamam:boolean, yanParca:boolean, neden:string}} */
export function basari(ctx) {
  // Tam tasarım ve R1 gelene kadar iskelet yıldız veya tamamlanma kaydı üretmez.
  void ctx;
  return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
}

/** @param {Ctx} ctx @param {1|2|3} seviye @returns {{anahtar?:string}} */
export function ipucu(ctx, seviye) {
  if (seviye === 1) ctx.sahne.vurgula('pimA');
  if (seviye === 2) return { anahtar: 'i2' };
  // İlk adım yalnız A pimini başlangıç çizgisine getirir; B pimine dokunmaz.
  if (seviye === 3) ctx.durum.pimler[0].y = ctx.veri.parametreler.konum.min;
  return {};
}

/** @param {Ctx} ctx @param {TahtaAyar} ayarlar @returns {void} */
export function tahta(ctx, ayarlar) {
  // Tahta ölçeği, ipucu ve kilitler motor tarafından yönetilir.
  void ctx;
  void ayarlar;
}
