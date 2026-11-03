// D05 · Halka Bandı · sahip GM-D · sözleşme v1.0

export const id = 'D05';
export const surum = '1.0.1';

export function kur(ctx, seed) {
  void seed;
  const p = ctx.veri.parametreler;
  const TOL = ctx.geo.TOLERANS;
  const { aciNormalize, ilerle } = ctx.geo;
  const gecmis = ctx.durum.gecmis ?? [];
  const oncekiKart = ctx.durum.kart ?? null;
  const r = ctx.rng.tamHaric(p.yaricap.min, p.yaricap.max, gecmis, TOL.tekrarKomsulugu);
  const M0 = {
    x: ctx.rng.tam(p.konum.min, p.konum.max),
    y: ctx.rng.tam(p.konum.min, p.konum.max)
  };
  const a0 = aciNormalize(ctx.rng.tam(p.aci.min, p.aci.max));
  const a1 = aciNormalize(ctx.rng.tam(p.aci.min, p.aci.max));
  const isaret0 = ilerle(M0, a0, r);
  const isaret1 = ilerle(isaret0, a1, r);
  const hedefler = [{ merkez: M0, r }, { merkez: isaret0, r }, { merkez: isaret1, r }];
  const cubukA = {
    x: ctx.rng.tam(p.konum.min, p.konum.max),
    y: ctx.rng.tam(p.konum.min, p.konum.max)
  };
  const cubukYon = ctx.rng.tam(p.aci.min, p.aci.max);
  const cubukB = ilerle(cubukA, cubukYon, r);
  const pergel = ctx.widget.pergel({ merkez: M0, olcuKilidi: true });
  const kart = oncekiKart ?? ctx.defter.kuralKarti({
    kalipAnahtari: 'esParca',
    disliler: [{ ad: 'parcalar', secenekler: ['es', 'farkli'] }],
    dogru: { parcalar: 'es' }
  });
  ctx.durum = {
    tur: ctx.tur, r, M0, isaretler: [isaret0, isaret1], hedefler, pergel,
    halkalar: [], cubuk: { A: cubukA, B: cubukB }, kart, sinama: null,
    calisti: false, kesmeOrani: 0, surukle: null, hayalet: false, gorulen: [r], gecmis
  };
}

function uzeriMi(ctx, P, c) {
  return ctx.geo.cemberUzerindeMi(P, c, ctx.geo.TOLERANS.uzunlukOran);
}

function yakinMi(ctx, P, Q, r) {
  return ctx.geo.uzaklik(P, Q) <= ctx.geo.TOLERANS.uzunlukOran * r;
}

function halkaNedeni(ctx, d) {
  const h = d.halkalar;
  const oran = ctx.geo.TOLERANS.uzunlukOran;
  if (h.length < 3) return 'halkaEksik';
  if (!yakinMi(ctx, h[0].merkez, d.M0, d.r) || Math.abs(h[0].r - d.r) > oran * d.r) {
    return 'ilkHalkaKacti';
  }
  for (let i = 1; i <= 2; i += 1) {
    if (Math.abs(h[i].r - h[0].r) > oran * h[0].r) return 'aciklikDegisti';
  }
  for (let i = 1; i <= 2; i += 1) {
    if (!h[i].kilitli) return 'kilitAcik';
  }
  for (let i = 1; i <= 2; i += 1) {
    if (!uzeriMi(ctx, h[i].merkez, h[i - 1])) return 'merkezKacti';
  }
  return null;
}

function rafTamamMi(ctx, d) {
  return d.halkalar.some(c =>
    (yakinMi(ctx, d.cubuk.A, c.merkez, c.r) && uzeriMi(ctx, d.cubuk.B, c)) ||
    (yakinMi(ctx, d.cubuk.B, c.merkez, c.r) && uzeriMi(ctx, d.cubuk.A, c))
  );
}

function kartNedeni(d) {
  if (!d.kart.takili) return 'kartYok';
  if (!d.kart.dogruMu()) return 'kartTers';
  if (!d.sinama || !d.sinama.basarili) return 'sinaYok';
  if (d.sinama.kartAyar.parcalar !== d.kart.ayar().parcalar) return 'sinaYok';
  return null;
}

function cubukTasi(ctx, d, id, olay) {
  const uz = d.halkalar[0].r;
  const x = Math.max(0, Math.min(ctx.sahne.genislik, olay.x));
  const y = Math.max(0, Math.min(ctx.sahne.yukseklik, olay.y));
  const { ilerle, yonAci, uzaklik } = ctx.geo;
  if (id === 'cubukA') {
    const yon = yonAci(d.cubuk.A, d.cubuk.B);
    d.cubuk.A = { x, y };
    d.cubuk.B = ilerle(d.cubuk.A, yon, uz);
  } else if (id === 'cubukB') {
    const hedef = { x, y };
    if (uzaklik(d.cubuk.A, hedef) === 0) return;
    d.cubuk.B = ilerle(d.cubuk.A, yonAci(d.cubuk.A, hedef), uz);
  }
}

function ureticiYap(ctx) {
  const p = ctx.veri.parametreler;
  const TOL = ctx.geo.TOLERANS;
  const { ilerle } = ctx.geo;
  return rng => {
    if (!ctx.durum.gorulen) ctx.durum.gorulen = [];
    const rr = rng.tamHaric(
      p.yaricap.min, p.yaricap.max, ctx.durum.gorulen, TOL.tekrarKomsulugu
    );
    ctx.durum.gorulen.push(rr);
    const c = {
      merkez: { x: rng.tam(p.konum.min, p.konum.max), y: rng.tam(p.konum.min, p.konum.max) },
      r: rr
    };
    const a = rng.tam(p.aci.min, p.aci.max);
    const b = a + rng.tam(p.ayrim.min, p.ayrim.max);
    const A = ilerle(c.merkez, a, rr);
    const B = ilerle(c.merkez, b, rr);
    return {
      ornek: { c, A, B },
      beklenen: { parcalar: 'es' },
      ciz: s => {
        s.cember(c, { renk: 'gri' });
        s.parca(c.merkez, A, { renk: 'turuncu' });
        s.parca(c.merkez, B, { renk: 'turuncu' });
      }
    };
  };
}

function hedefMerkez(d) {
  return d.halkalar.length === 0 ? d.M0 : d.isaretler[d.halkalar.length - 1];
}

function dugmeGirdi(ctx, d, dugmeId) {
  if (dugmeId === 'halka' && d.halkalar.length < 3) {
    const c = d.pergel.cemberCiz();
    d.halkalar.push({ merkez: c.merkez, r: c.r, kilitli: d.pergel.kilit });
    if (d.halkalar.length === 3) ctx.matik.soyle('rafGiris');
  } else if (dugmeId === 'calistir') {
    d.calisti = true;
    d.kesmeOrani = 0;
  } else if (dugmeId === 'sina' && d.halkalar.length === 3 && d.kart.takili) {
    const kartAyar = d.kart.ayar();
    ctx.defter.sina(d.kart, ureticiYap(ctx)).then(s => {
      d.sinama = { basarili: s.basarili, karsiOrnek: s.karsiOrnek, kartAyar };
    });
  }
}

export function ciz(ctx) {
  const d = ctx.durum;
  const sahne = ctx.sahne;
  const kayma = ctx.geo.TOLERANS.hatBirim;
  sahne.katman('alt');
  if (d.hayalet) {
    sahne.hayalet(s => d.hedefler.forEach(h => s.cember(h, { kesik: true, renk: 'gri' })));
  }
  sahne.pim(d.M0, { id: 'merkez0', boyut: 'kucuk', renk: 'gri' });
  sahne.pim(d.isaretler[0], { id: 'isaret0', boyut: 'kucuk', renk: 'turuncu' });
  sahne.pim(d.isaretler[1], { id: 'isaret1', boyut: 'kucuk', renk: 'turuncu' });
  d.halkalar.forEach((h, i) => {
    const saf = { merkez: h.merkez, r: h.r };
    if (d.calisti && d.kesmeOrani < 1) {
      const yay = { ...saf, bas: 0, bit: 360 * d.kesmeOrani, yon: 'saat' };
      sahne.yay(yay, { renk: 'turuncu', kalinlik: 'kalin' });
    } else {
      sahne.cember(saf, { id: 'halka' + i, renk: 'mavi', kalinlik: 'kalin' });
    }
  });
  if (d.halkalar.length === 3) {
    sahne.parca(d.cubuk.A, d.cubuk.B, { id: 'cubuk', renk: 'gri', kalinlik: 'kalin' });
    sahne.pim(d.cubuk.A, { id: 'cubukA', renk: 'gri' });
    sahne.pim(d.cubuk.B, { id: 'cubukB', renk: 'gri' });
    sahne.etiket({ x: d.cubuk.A.x, y: d.cubuk.A.y + kayma }, 'raf');
    sahne.dugme({ id: 'sina', anahtar: 'sina', konum: 'sag', etkin: d.kart.takili });
  }
  if (d.sinama?.karsiOrnek) {
    sahne.hayalet(s => {
      const o = d.sinama.karsiOrnek;
      s.cember(o.c, { renk: 'gri' });
      s.parca(o.c.merkez, o.A, { renk: 'kirmizi' });
      s.parca(o.c.merkez, o.B, { renk: 'kirmizi' });
    });
  }
  sahne.dugme({ id: 'halka', anahtar: 'halka', konum: 'sag', etkin: d.halkalar.length < 3 });
  d.pergel.ciz(sahne);
  sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

export function girdi(ctx, olay) {
  const d = ctx.durum;
  if (d.pergel.girdi(olay)) return;
  switch (olay.tur) {
    case 'dugme':
      dugmeGirdi(ctx, d, olay.dugmeId);
      break;
    case 'bas':
      if (d.halkalar.length === 3 && (olay.hedef === 'cubukA' || olay.hedef === 'cubukB')) {
        d.surukle = olay.hedef;
      }
      break;
    case 'surukle':
      if (d.surukle) cubukTasi(ctx, d, d.surukle, olay);
      break;
    case 'birak':
      d.surukle = null;
      break;
    default:
      break;
  }
}

export function calistir(ctx) {
  const d = ctx.durum;
  return {
    sure: ctx.veri.parametreler.sure.min,
    kare: t => { d.kesmeOrani = t; },
    bitti: () => {
      d.kesmeOrani = 1;
      if (halkaNedeni(ctx, d) === null) ctx.ses.cal('tik');
    }
  };
}

export function basari(ctx) {
  const d = ctx.durum;
  if (!d.calisti) return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
  const hNeden = halkaNedeni(ctx, d);
  if (hNeden !== null) return { tamam: false, yanParca: false, neden: hNeden };
  if (!rafTamamMi(ctx, d)) return { tamam: false, yanParca: false, neden: 'rafBos' };
  const kNeden = kartNedeni(d);
  if (kNeden !== null) return { tamam: false, yanParca: false, neden: kNeden };
  return { tamam: true, yanParca: false, neden: 'tamam' };
}

export function ipucu(ctx, seviye) {
  const d = ctx.durum;
  const n = d.halkalar.length;
  if (seviye === 1) {
    if (n === 0) ctx.sahne.vurgula('isaret0');
    else if (n === 1) ctx.sahne.vurgula(d.pergel.kilit ? 'isaret0' : 'pergelKilit');
    else if (n === 2) ctx.sahne.vurgula('isaret1');
    else if (n === 3) {
      ctx.sahne.vurgula('cubukA');
      ctx.sahne.vurgula('halka0');
    }
    d.hayalet = true;
    return {};
  }
  if (seviye === 2) return { anahtar: 'i2' };
  if (seviye === 3) {
    if (n < 3) {
      d.pergel.merkez = hedefMerkez(d);
      d.pergel.aciklik = n === 0 ? d.r : d.halkalar[0].r;
      d.pergel.kilitle();
      const c = d.pergel.cemberCiz();
      d.halkalar.push({ merkez: c.merkez, r: c.r, kilitli: true });
      if (d.halkalar.length === 3) ctx.matik.soyle('rafGiris');
    } else if (n === 3) {
      const yon = ctx.geo.yonAci(d.cubuk.A, d.cubuk.B);
      d.cubuk.A = d.halkalar[0].merkez;
      d.cubuk.B = ctx.geo.ilerle(d.cubuk.A, yon, d.halkalar[0].r);
    }
  }
  return {};
}

export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
