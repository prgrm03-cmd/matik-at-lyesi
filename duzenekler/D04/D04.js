// D04 · Kapak Kesme · sahip GM-D · sözleşme v1.0

export const id = 'D04';
export const surum = '1.0.0';

export function kur(ctx, seed) {
  const gecmis = ctx.durum.gecmis ?? [];
  const p = ctx.veri.parametreler;
  const TOL = ctx.geo.TOLERANS;
  const rng = ctx.rng;
  const r = rng.tamHaric(p.yaricap.min, p.yaricap.max, gecmis, TOL.tekrarKomsulugu);
  const M = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const a0 = ctx.geo.aciNormalize(rng.tam(p.aci.min, p.aci.max));
  const a1 = ctx.geo.aciNormalize(a0 + rng.tam(p.ayrim.min, p.ayrim.max));
  const a2 = ctx.geo.aciNormalize(a1 + rng.tam(p.ayrim.min, p.ayrim.max));
  const ledler = [a0, a1, a2].map((a, i) => ({ id: 'led' + i, P: ctx.geo.ilerle(M, a, r) }));
  const kaymaYon = rng.tam(p.aci.min, p.aci.max);
  const kaymaUz = rng.tam(p.kayma.min, p.kayma.max);
  const pergelBas = ctx.geo.ilerle(M, kaymaYon, kaymaUz);
  const pergel = ctx.widget.pergel({ merkez: pergelBas, olcuKilidi: true });
  const cubukA = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const cubukB = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const p0 = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const p1 = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const p2 = { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) };
  const hedefler = rng.karistir(['uzeri', 'ic', 'dis']);
  const adlar = ['A', 'B', 'C'];
  const ekPimler = [p0, p1, p2].map((P, i) => ({
    id: 'ekPim' + i, ad: adlar[i], hedef: hedefler[i], P
  }));
  ctx.durum = {
    seed, tur: ctx.tur, bolum: 'kapak', r, M, ledler, pergel, cember: null, kesmeOrani: 0,
    calisti: false, cubuk: { A: cubukA, B: cubukB }, dolgu: false, ekPimler,
    ekCalisti: false, surukle: null, hayalet: false, gecmis
  };
}

function cemberUstundeMi(ctx, P, c) {
  return ctx.geo.cemberUzerindeMi(P, c, ctx.geo.TOLERANS.uzunlukOran);
}

function bolgeBul(ctx, P, c) {
  if (cemberUstundeMi(ctx, P, c)) return 'uzeri';
  if (ctx.geo.cemberIcindeMi(P, c)) return 'ic';
  return 'dis';
}

function cubukTamamMi(ctx, durum) {
  const c = durum.cember;
  const { A, B } = durum.cubuk;
  if (!c || (A.x === B.x && A.y === B.y)) return { uc: false, merkez: false };
  if (!cemberUstundeMi(ctx, A, c) || !cemberUstundeMi(ctx, B, c)) {
    return { uc: false, merkez: false };
  }
  const tolBirim = ctx.geo.TOLERANS.hatBirim;
  const yon = ctx.geo.yonAci(A, B);
  const uz = ctx.geo.noktaDogruUzakligi(c.merkez, { A, yon });
  return { uc: true, merkez: uz <= tolBirim };
}

function ledKacanlar(ctx, durum) {
  if (!durum.cember) return durum.ledler;
  return durum.ledler.filter(L => !cemberUstundeMi(ctx, L.P, durum.cember));
}

function kapakTamamMi(ctx, durum) {
  if (!durum.cember || ledKacanlar(ctx, durum).length > 0) return false;
  return cubukTamamMi(ctx, durum).merkez === true;
}

function yanParcaMi(ctx, durum) {
  if (!durum.cember) return false;
  const s = durum.pergel.cemberCiz();
  const c = durum.cember;
  const tol = ctx.geo.TOLERANS.uzunlukOran * c.r;
  const mFark = ctx.geo.uzaklik(s.merkez, c.merkez);
  return mFark <= tol && s.r <= c.r - 2 * tol;
}

function pimTasi(ctx, durum, id, olay) {
  const x = Math.max(0, Math.min(ctx.sahne.genislik, olay.x));
  const y = Math.max(0, Math.min(ctx.sahne.yukseklik, olay.y));
  if (id === 'cubukA') durum.cubuk.A = { x, y };
  else if (id === 'cubukB') durum.cubuk.B = { x, y };
  else {
    const pim = durum.ekPimler.find(p => p.id === id);
    if (pim) pim.P = { x, y };
  }
}

function hedefAnahtari(hedef) {
  if (hedef === 'uzeri') return 'hedefUzeri';
  if (hedef === 'ic') return 'hedefIc';
  return 'hedefDis';
}

function cizEkBolumu(ctx, sahne, d, kayma) {
  const c = d.cember;
  if (c) {
    sahne.etiket({ x: c.merkez.x, y: c.merkez.y - c.r - kayma }, 'kutuHalka');
    if (d.dolgu) sahne.etiket(c.merkez, 'kutuKapak');
  }
  d.ekPimler.forEach(p => {
    sahne.pim(p.P, { id: p.id, ad: p.ad, renk: 'mavi' });
    sahne.etiket({ x: p.P.x, y: p.P.y + kayma }, hedefAnahtari(p.hedef));
  });
  sahne.dugme({ id: 'dolgu', anahtar: 'dolgu', konum: 'sag', etkin: !d.dolgu });
}

export function ciz(ctx) {
  const sahne = ctx.sahne;
  const d = ctx.durum;
  const c = d.cember;
  const kayma = ctx.geo.TOLERANS.hatBirim;
  sahne.katman('alt');
  if (d.hayalet) {
    sahne.hayalet(s => {
      if (d.bolum === 'kapak') {
        d.ledler.forEach(L => s.parca(d.M, L.P, { kesik: true, renk: 'gri' }));
        s.pim(d.M, { renk: 'gri', boyut: 'kucuk' });
      } else if (c) s.cember(c, { dolgu: true, renk: 'sari' });
    });
  }
  d.ledler.forEach(L => {
    const renk = !c ? 'sari' : (cemberUstundeMi(ctx, L.P, c) ? 'yesil' : 'kirmizi');
    sahne.pim(L.P, { id: L.id, boyut: 'kucuk', renk });
  });
  if (c) {
    if (d.kesmeOrani < 1) {
      const yay = { ...c, bas: 0, bit: 360 * d.kesmeOrani, yon: 'saat' };
      sahne.yay(yay, { renk: 'turuncu', kalinlik: 'kalin' });
    } else {
      sahne.cember(c, { id: 'kapak', renk: 'turuncu', kalinlik: 'kalin', dolgu: d.dolgu });
    }
    sahne.parca(d.cubuk.A, d.cubuk.B, { id: 'cubuk', renk: 'gri', kalinlik: 'kalin' });
    sahne.pim(d.cubuk.A, { id: 'cubukA', renk: 'gri' });
    sahne.pim(d.cubuk.B, { id: 'cubukB', renk: 'gri' });
  }
  if (d.bolum === 'ek') cizEkBolumu(ctx, sahne, d, kayma);
  d.pergel.ciz(sahne);
  sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

export function girdi(ctx, olay) {
  const d = ctx.durum;
  if (d.pergel.girdi(olay)) return;
  switch (olay.tur) {
    case 'dugme':
      if (olay.dugmeId === 'calistir') {
        d.calisti = true;
        if (d.bolum === 'kapak') {
          d.cember = null;
          d.kesmeOrani = 0;
        }
      } else if (olay.dugmeId === 'dolgu' && d.bolum === 'ek') {
        d.dolgu = true;
      }
      break;
    case 'bas':
      if ((olay.hedef === 'cubukA' || olay.hedef === 'cubukB') && d.cember) {
        d.surukle = olay.hedef;
      } else if (d.bolum === 'ek' && ['ekPim0', 'ekPim1', 'ekPim2'].includes(olay.hedef)) {
        d.surukle = olay.hedef;
      }
      break;
    case 'surukle':
      if (d.surukle) pimTasi(ctx, d, d.surukle, olay);
      break;
    case 'birak':
      d.surukle = null;
      break;
  }
}

export function calistir(ctx) {
  const d = ctx.durum;
  const sure = ctx.veri.parametreler.sure.min;
  if (d.bolum === 'kapak') {
    return {
      sure,
      kare: t => {
        d.cember = d.cember ?? d.pergel.cemberCiz();
        d.kesmeOrani = t;
      },
      bitti: () => {
        d.cember = d.cember ?? d.pergel.cemberCiz();
        d.kesmeOrani = 1;
        if (kapakTamamMi(ctx, d)) {
          d.bolum = 'ek';
          ctx.matik.soyle('ekGiris');
        }
      }
    };
  }
  return {
    sure,
    kare: () => {
      d.kesmeOrani = 1;
    },
    bitti: () => {
      d.ekCalisti = true;
      d.ekPimler.forEach(pim => {
        const b = bolgeBul(ctx, pim.P, d.cember);
        if (b === 'uzeri') ctx.ses.cal('tik');
        else if (b === 'ic') ctx.ses.cal('pat');
      });
    }
  };
}

export function basari(ctx) {
  const d = ctx.durum;
  if (d.bolum === 'kapak') {
    if (!d.calisti || !d.cember) return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
    if (ledKacanlar(ctx, d).length > 0) return { tamam: false, yanParca: false, neden: 'ledKacti' };
    const cubuk = cubukTamamMi(ctx, d);
    if (!cubuk.uc) return { tamam: false, yanParca: false, neden: 'cubukKenarda' };
    if (!cubuk.merkez) return { tamam: false, yanParca: false, neden: 'cubukKaydi' };
    return { tamam: false, yanParca: false, neden: 'kapakTamam' };
  }
  if (!d.ekCalisti) return { tamam: false, yanParca: false, neden: 'kapakTamam' };
  if (!d.dolgu) return { tamam: false, yanParca: false, neden: 'dolguYok' };
  for (let i = 0; i < d.ekPimler.length; i++) {
    const pim = d.ekPimler[i];
    const b = bolgeBul(ctx, pim.P, d.cember);
    if (pim.hedef === 'uzeri' && b !== 'uzeri') {
      return { tamam: false, yanParca: false, neden: 'halkaKacti' };
    }
    if (pim.hedef === 'ic' && b !== 'ic') {
      return { tamam: false, yanParca: false, neden: 'kapakKacti' };
    }
    if (pim.hedef === 'dis' && b !== 'dis') {
      return { tamam: false, yanParca: false, neden: 'disKacti' };
    }
  }
  return { tamam: true, yanParca: yanParcaMi(ctx, d), neden: 'tamam' };
}

export function ipucu(ctx, seviye) {
  const d = ctx.durum;
  if (seviye === 1) {
    if (d.bolum === 'kapak') {
      const kacanlar = ledKacanlar(ctx, d);
      const id = !d.cember ? 'led0' : (kacanlar.length > 0 ? kacanlar[0].id : 'cubukA');
      ctx.sahne.vurgula(id);
      d.hayalet = true;
    } else {
      ctx.sahne.vurgula('kapak');
      d.hayalet = true;
      if (!d.dolgu) ctx.sahne.vurgula('dolgu');
    }
    return {};
  }
  if (seviye === 2) return { anahtar: 'i2' };
  if (seviye === 3) {
    if (d.bolum === 'kapak') {
      d.pergel.merkez = d.M;
    } else if (d.cember) {
      const yanlis = d.ekPimler.find(p => bolgeBul(ctx, p.P, d.cember) !== p.hedef);
      if (yanlis) {
        const yon = ctx.geo.yonAci(d.M, yanlis.P);
        const pay = 2 * ctx.geo.TOLERANS.hatBirim;
        const uz = yanlis.hedef === 'uzeri' ? d.r : (yanlis.hedef === 'ic' ? d.r / 2 : d.r + pay);
        yanlis.P = ctx.geo.ilerle(d.M, yon, uz);
      }
    }
  }
  return {};
}

export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
