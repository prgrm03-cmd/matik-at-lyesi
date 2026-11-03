// D03 · Dönen Işın · sahip GM-D · sözleşme v1.0

export const id = 'D03';
export const surum = '1.0.1';

/**
 * Düzenek durumunu sıfırdan kurar, widget nesnesini oluşturur; sahneye çizmez.
 *
 * RNG tüketim sırası (seed başına deterministik):
 *   1. rng.tam(p.konum.min, p.konum.max) -> A.x
 *   2. rng.tam(p.konum.min, p.konum.max) -> A.y
 *   3. rng.tamHaric(p.yon.min, p.yon.max, haric, komsuluk) -> hedefYon
 *   4. rng.bool() -> isaret (+1 / -1)
 *   5. rng.tam(p.sapma.min, p.sapma.max) -> sapma
 *   6. rng.tam(p.uzaklik.min, p.uzaklik.max) -> uz1
 *   7. rng.tam(p.ara.min, p.ara.max) -> ara (uz2 = uz1 + ara)
 *   8. rng.tam(p.baslangic.min, p.baslangic.max) -> basSapma
 *
 * @param {Ctx} ctx
 * @param {number} seed
 */
export function kur(ctx, seed) {
  const p = ctx.veri.parametreler;
  const rng = ctx.rng;
  const gecmis = Array.isArray(ctx.durum.gecmis) ? ctx.durum.gecmis : [];
  const haric = [...gecmis, ...(p.yon.haric || [])];
  const komsuluk = aciKomsuluguOku(ctx.geo.TOLERANS);

  const ax = rng.tam(p.konum.min, p.konum.max);
  const ay = rng.tam(p.konum.min, p.konum.max);
  const hamA = { x: ax, y: ay };
  const hedefYon = rng.tamHaric(p.yon.min, p.yon.max, haric, komsuluk);
  const isaret = rng.bool() ? 1 : -1;
  const sapma = rng.tam(p.sapma.min, p.sapma.max);
  const uz1 = rng.tam(p.uzaklik.min, p.uzaklik.max);
  const uz2 = uz1 + rng.tam(p.ara.min, p.ara.max);
  const basSapma = rng.tam(p.baslangic.min, p.baslangic.max);
  const baslangicYon = ctx.geo.aciNormalize(hedefYon - isaret * basSapma);

  const yerlesim = noktalariYerlestir(ctx, hamA, hedefYon, isaret, sapma, uz1, uz2);
  const carkAdim = typeof p.cark.adim === 'number' ? p.cark.adim : p.cark.min;
  const lazer = ctx.widget.lazer({ mod: 'isin', donenIsin: true, carkAdim });
  lazerDurumAta(lazer, yerlesim.A, baslangicYon);

  Object.assign(ctx.durum, {
    seed,
    gecmis,
    A: yerlesim.A,
    hedefYon,
    isaret,
    uz2: yerlesim.uz2,
    sensorler: yerlesim.sensorler,
    alarmlar: yerlesim.alarmlar,
    lazer,
    isikOrani: 0,
    calisti: false,
    tur: ctx.tur
  });
}

function aciKomsuluguOku(tol) {
  const tk = tol && tol.tekrarKomsulugu;
  if (typeof tk === 'number') return tk;
  if (tk && typeof tk.aci === 'number') return tk.aci;
  throw new Error('PARAMETRE_ARALIK_DISI');
}

function lazerDurumAta(lazer, A, yon) {
  let atandi = false;
  try {
    lazer.A = A;
    lazer.yon = yon;
    atandi = Boolean(lazer.A) && lazer.yon === yon;
  } catch (err) {
    void err;
  }
  if (!atandi && typeof lazer.yukle === 'function' && typeof lazer.durum === 'function') {
    lazer.yukle({ ...lazer.durum(), A, yon });
  }
}

function icerideMi(P, g, y) {
  return P.x >= 0 && P.x <= g && P.y >= 0 && P.y <= y;
}

function noktaUret(geo, A, yon, uz, minUz, g, y) {
  const P1 = geo.ilerle(A, yon, uz);
  if (icerideMi(P1, g, y)) return { P: P1, tasti: false };
  const P2 = geo.ilerle(A, yon, minUz);
  return { P: P2, tasti: !icerideMi(P2, g, y) };
}

function grupHesapla(ctx, A, hedefYon, isaret, sapma, uz1, uz2) {
  const g = ctx.sahne.genislik;
  const y = ctx.sahne.yukseklik;
  const minUz = ctx.veri.parametreler.uzaklik.min;
  const minAra = ctx.veri.parametreler.ara.min;
  const yanYon = ctx.geo.aciNormalize(hedefYon + isaret * sapma);
  const arkaYon = ctx.geo.aciNormalize(hedefYon + 180);

  const aIceride = icerideMi(A, g, y);
  const s0 = noktaUret(ctx.geo, A, hedefYon, uz1, minUz, g, y);
  const s1 = noktaUret(ctx.geo, A, hedefYon, uz2, minUz + minAra, g, y);
  const a0 = noktaUret(ctx.geo, A, yanYon, uz1, minUz, g, y);
  const a1 = noktaUret(ctx.geo, A, arkaYon, uz1, minUz, g, y);

  return {
    A,
    uz2,
    sensorler: [s0.P, s1.P],
    alarmlar: [a0.P, a1.P],
    tasti: !aIceride || s0.tasti || s1.tasti || a0.tasti || a1.tasti
  };
}

function noktalariYerlestir(ctx, A, hedefYon, isaret, sapma, uz1, uz2) {
  const ilk = grupHesapla(ctx, A, hedefYon, isaret, sapma, uz1, uz2);
  if (!ilk.tasti) return ilk;
  const simA = {
    x: ctx.sahne.genislik - A.x,
    y: ctx.sahne.yukseklik - A.y
  };
  const ikinci = grupHesapla(ctx, simA, hedefYon, isaret, sapma, uz1, uz2);
  if (!ikinci.tasti) return ikinci;
  throw new Error('PARAMETRE_ARALIK_DISI');
}

function isikUzunluguBul(ctx, A, yon, yedekUz) {
  const kesisimler = ctx.geo.dogruKenarKesisimi({ A, yon });
  if (!Array.isArray(kesisimler) || kesisimler.length === 0) return yedekUz;
  let enUzak = 0;
  for (let i = 0; i < kesisimler.length; i += 1) {
    const mesafe = ctx.geo.uzaklik(A, kesisimler[i]);
    if (mesafe > enUzak) enUzak = mesafe;
  }
  return enUzak > 0 ? enUzak : yedekUz;
}

/**
 * Her karede sahneyi çizer; durumu değiştirmez.
 * @param {Ctx} ctx
 */
export function ciz(ctx) {
  const d = ctx.durum;
  const sahne = ctx.sahne;

  for (let i = 0; i < d.sensorler.length; i += 1) {
    sahne.pim(d.sensorler[i], {
      id: 'sensor' + i,
      renk: 'yesil',
      boyut: 'kucuk'
    });
  }

  for (let i = 0; i < d.alarmlar.length; i += 1) {
    sahne.pim(d.alarmlar[i], {
      id: 'alarm' + i,
      renk: 'kirmizi',
      boyut: 'kucuk'
    });
  }

  if (d.calisti && d.isikOrani > 0 && d.lazer && d.lazer.A) {
    const tamUz = isikUzunluguBul(ctx, d.lazer.A, d.lazer.yon, d.uz2);
    const uc = ctx.geo.ilerle(d.lazer.A, d.lazer.yon, d.isikOrani * tamUz);
    sahne.parca(d.lazer.A, uc, {
      id: 'isikHatti',
      renk: 'sari',
      kalinlik: 'kalin'
    });
  }

  if (d.lazer) {
    d.lazer.ciz(sahne);
  }

  sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

/**
 * Kullanıcı ve kuru koşu olaylarını işler.
 * @param {Ctx} ctx
 * @param {Olay} olay
 */
export function girdi(ctx, olay) {
  const d = ctx.durum;
  if (!olay || !d || !d.lazer) return;

  if (d.lazer.girdi(olay)) {
    lazerDurumAta(d.lazer, d.A, d.lazer.yon);
    return;
  }

  switch (olay.tur) {
    case 'dugme':
      if (olay.dugmeId === 'calistir') {
        d.calisti = true;
      }
      break;
    default:
      break;
  }
}

/**
 * Çalıştır animasyon tanımını döndürür.
 * @param {Ctx} ctx
 * @returns {{sure:number, kare:(t:number)=>void, bitti:()=>void}}
 */
export function calistir(ctx) {
  const d = ctx.durum;
  const sure = ctx.veri.parametreler.sure.min;
  return {
    sure,
    kare: (t) => {
      d.isikOrani = t;
    },
    bitti: () => {
      d.isikOrani = 1;
    }
  };
}

/**
 * Yan etkisiz başarı denetimi yapar.
 * @param {Ctx} ctx
 * @returns {{tamam:boolean, yanParca:boolean, neden:string}}
 */
export function basari(ctx) {
  const d = ctx.durum;
  if (!d || !d.lazer || !d.lazer.A) {
    return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
  }

  const tol = ctx.geo.TOLERANS.hatBirim;
  const sensorSonuc = d.lazer.gecerMi(d.sensorler, tol);
  const hicbiriGecmedi = Array.isArray(sensorSonuc) && sensorSonuc.every((v) => !v);
  const hat = { A: d.lazer.A, yon: d.lazer.yon };
  const dogruUzerinde = d.sensorler.every((s) => ctx.geo.dogruUzerindeMi(s, hat, tol));
  if (hicbiriGecmedi && dogruUzerinde) {
    return { tamam: false, yanParca: false, neden: 'tersYon' };
  }

  const alarmSonuc = d.lazer.gecerMi(d.alarmlar, tol);
  if (Array.isArray(alarmSonuc) && alarmSonuc.some(Boolean)) {
    return { tamam: false, yanParca: false, neden: 'alarmYandi' };
  }

  if (Array.isArray(sensorSonuc) && sensorSonuc.length > 0 && sensorSonuc.every(Boolean)) {
    return { tamam: true, yanParca: false, neden: 'tamam' };
  }

  return { tamam: false, yanParca: false, neden: 'sensorKacti' };
}

/**
 * 1, 2 veya 3. seviye ipucu uygular.
 * @param {Ctx} ctx
 * @param {1|2|3} seviye
 * @returns {{anahtar?:string}}
 */
export function ipucu(ctx, seviye) {
  const d = ctx.durum;
  const tol = ctx.geo.TOLERANS.hatBirim;

  if (seviye === 1) {
    const sonuc = basari(ctx);
    let hedefId = 'sensor0';
    if (sonuc.neden === 'alarmYandi' || sonuc.neden === 'tersYon') {
      const aSonuc = d.lazer.gecerMi(d.alarmlar, tol);
      const idx = Array.isArray(aSonuc) ? aSonuc.findIndex(Boolean) : 0;
      hedefId = 'alarm' + (idx >= 0 ? idx : 0);
    } else {
      const sSonuc = d.lazer.gecerMi(d.sensorler, tol);
      const idx = Array.isArray(sSonuc) ? sSonuc.findIndex((v) => !v) : 0;
      hedefId = 'sensor' + (idx >= 0 ? idx : 0);
    }
    ctx.sahne.vurgula(hedefId);
    return {};
  }

  if (seviye === 2) {
    return { anahtar: 'i2' };
  }

  if (seviye === 3) {
    const maxSapma = ctx.veri.parametreler.sapma.max;
    const fark = ctx.geo.aciFark(d.lazer.yon, d.hedefYon);
    if (fark > maxSapma) {
      const yeniYon = ctx.geo.aciNormalize(d.hedefYon - d.isaret * maxSapma);
      lazerDurumAta(d.lazer, d.A, yeniYon);
    }
    return {};
  }

  return {};
}

/**
 * Öğretmen tahta modu kancası.
 * @param {Ctx} ctx
 * @param {object} ayarlar
 */
export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
