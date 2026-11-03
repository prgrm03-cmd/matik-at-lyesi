// D06 · Yağ Damlası · sahip GM-D · sözleşme v1.0
export const id = 'D06';
export const surum = '1.0.2';

export function kur(ctx, seed) {
  void seed;
  const p = ctx.veri.parametreler;
  const TOL = ctx.geo.TOLERANS;
  let gecmis = ctx.durum.gecmis ?? [];
  if (ctx.durum.tur !== undefined && ctx.durum.tur !== ctx.tur) {
    gecmis = [...gecmis, ctx.durum.mesafe];
  }
  const yon = ctx.geo.rastgeleEgim(ctx.rng);
  const M = {
    x: ctx.rng.tam(p.konum.min, p.konum.max),
    y: ctx.rng.tam(p.konum.min, p.konum.max)
  };
  const ray = { A: M, yon };
  const mesafe = ctx.rng.tamHaric(p.mesafe.min, p.mesafe.max, gecmis, TOL.tekrarKomsulugu);
  const taraf = ctx.rng.tam(p.taraf.min, p.taraf.max);
  const P = ctx.geo.ilerle(M, yon + 90 + taraf * 180, mesafe);
  const gonye = ctx.widget.gonye({ dogru: ray });
  ctx.durum = {
    tur: ctx.tur, ray, M, mesafe, P, gonye,
    parcalar: [], secili: null,
    damlaUc: { x: P.x, y: P.y },
    surukle: false, calisti: false, ilerleme: 0, hayalet: false, gecmis
  };
}

function kirp(ctx, olay) {
  return {
    x: Math.min(Math.max(olay.x, 0), ctx.sahne.genislik),
    y: Math.min(Math.max(olay.y, 0), ctx.sahne.yukseklik)
  };
}

function uclar(ctx, d, pc) {
  const { uzaklik, TOLERANS } = ctx.geo;
  if (uzaklik(pc.A, d.P) <= TOLERANS.hatBirim) return { ucP: pc.A, ucR: pc.B };
  if (uzaklik(pc.B, d.P) <= TOLERANS.hatBirim) return { ucP: pc.B, ucR: pc.A };
  return null;
}

function nedeni(ctx, d) {
  if (d.parcalar.length === 0) return 'parcaYok';
  const pc = d.parcalar[d.secili];
  const u = uclar(ctx, d, pc);
  const { uzaklik, dogruUzerindeMi, dikMi, yonAci, TOLERANS } = ctx.geo;
  if (u === null || uzaklik(u.ucP, u.ucR) <= 0) return 'rayaInmedi';
  if (!dogruUzerindeMi(u.ucR, d.ray, TOLERANS.hatBirim)) return 'rayaInmedi';
  if (!dikMi(yonAci(u.ucP, u.ucR), d.ray.yon, TOLERANS.dikme)) return 'dolasti';
  return null;
}

function gercekDikme(ctx, d) {
  return ctx.geo.dikme(d.ray, d.P).parca;
}

function parcaEkle(d, pc) {
  d.parcalar.push({ A: { x: pc.A.x, y: pc.A.y }, B: { x: pc.B.x, y: pc.B.y } });
  d.secili = d.parcalar.length - 1;
  d.calisti = false;
  d.ilerleme = 0;
}

function damlaKonumu(ctx, d) {
  if (d.parcalar.length === 0) return d.P;
  const pc = d.parcalar[d.secili];
  const u = uclar(ctx, d, pc);
  if (u === null) return pc.A;
  const { ilerle, yonAci, uzaklik } = ctx.geo;
  const boy = uzaklik(u.ucP, u.ucR);
  const yol = d.ilerleme * boy;
  if (boy <= 0 || yol <= 0) return { x: u.ucP.x, y: u.ucP.y };
  return ilerle(u.ucP, yonAci(u.ucP, u.ucR), yol);
}

function damlaBirak(ctx, d) {
  d.surukle = false;
  let B = d.damlaUc;
  const { uzaklik, dogruUzerindeMi, dikme, TOLERANS } = ctx.geo;
  if (uzaklik(B, d.P) <= TOLERANS.hatBirim) {
    d.damlaUc = { x: d.P.x, y: d.P.y };
    return;
  }
  if (dogruUzerindeMi(B, d.ray, TOLERANS.hatBirim)) {
    B = dikme(d.ray, B).ayak;
  }
  parcaEkle(d, { A: d.P, B });
  d.damlaUc = { x: d.P.x, y: d.P.y };
}

function cizSahne(ctx, d, kayma) {
  const { sahne, geo } = ctx;
  sahne.katman('alt');
  const L = sahne.genislik + sahne.yukseklik;
  const R1 = geo.ilerle(d.M, d.ray.yon + 180, L);
  const R2 = geo.ilerle(d.M, d.ray.yon, L);
  sahne.parca(R1, R2, { id: 'ray', renk: 'gri', kalinlik: 'kalin' });
  sahne.etiket({ x: d.M.x, y: d.M.y + kayma }, 'ray');
  if (d.hayalet) {
    sahne.hayalet(s => {
      const h = gercekDikme(ctx, d);
      s.parca(h.A, h.B, { kesik: true, renk: 'gri' });
    });
  }
  d.parcalar.forEach((pc, i) => {
    const sec = i === d.secili
      ? { id: 'parca' + i, renk: 'mavi', kalinlik: 'kalin' }
      : { id: 'parca' + i, renk: 'gri' };
    sahne.parca(pc.A, pc.B, sec);
  });
  if (d.surukle) sahne.parca(d.P, d.damlaUc, { renk: 'turuncu', kesik: true });
  sahne.pim(d.P, { id: 'P', boyut: 'kucuk', renk: 'gri' });
  sahne.pim(d.damlaUc, { id: 'damlaUc', renk: 'mavi' });
  d.gonye.ciz(sahne);
}

function cizDamla(ctx, d) {
  const { sahne } = ctx;
  if (d.calisti) {
    sahne.pim(damlaKonumu(ctx, d), { id: 'damla', boyut: 'kucuk', renk: 'turuncu' });
  }
  sahne.dugme({ id: 'dikme', anahtar: 'dikme', konum: 'sag', etkin: d.gonye.oturdu });
  sahne.dugme({
    id: 'calistir', anahtar: 'calistir', konum: 'alt', etkin: d.parcalar.length > 0
  });
}

function cizTerazi(ctx, d, kayma) {
  if (!d.calisti || d.ilerleme !== 1) return;
  const { sahne, geo, veri } = ctx;
  const p = veri.parametreler;
  const taban = sahne.yukseklik - kayma;
  const x0 = p.terazi.min;
  const ara = p.teraziAralik.min;
  const tavan = taban - kayma;
  const gd = gercekDikme(ctx, d);
  const boylar = [geo.uzaklik(gd.A, gd.B)];
  d.parcalar.forEach(pc => { boylar.push(geo.uzaklik(pc.A, pc.B)); });
  boylar.forEach((boy, i) => {
    const uz = Math.min(boy, tavan);
    const x = x0 + i * ara;
    const sec = i === 0
      ? { renk: 'mavi', kalinlik: 'kalin' }
      : (i - 1 === d.secili ? { renk: 'turuncu', kalinlik: 'kalin' } : { renk: 'turuncu' });
    sahne.parca({ x, y: taban }, { x, y: taban - uz }, sec);
  });
  sahne.etiket({ x: x0, y: taban + kayma }, 'terazi');
}

export function ciz(ctx) {
  const d = ctx.durum;
  const kayma = ctx.geo.TOLERANS.hatBirim;
  cizSahne(ctx, d, kayma);
  cizDamla(ctx, d);
  cizTerazi(ctx, d, kayma);
}

export function girdi(ctx, olay) {
  const d = ctx.durum;
  if (d.gonye.girdi(olay)) return;
  switch (olay.tur) {
    case 'dugme':
      if (olay.dugmeId === 'dikme') {
        const pc = d.gonye.dikmeBirak(d.P);
        if (pc === null) ctx.matik.soyle('gonyeHavada');
        else parcaEkle(d, pc);
      } else if (olay.dugmeId === 'calistir') {
        d.calisti = true;
        d.ilerleme = 0;
      }
      break;
    case 'bas':
      if (olay.hedef === 'damlaUc') d.surukle = true;
      break;
    case 'surukle':
      if (d.surukle) d.damlaUc = kirp(ctx, olay);
      break;
    case 'birak':
      if (d.surukle) damlaBirak(ctx, d);
      break;
    default:
      break;
  }
}

export function calistir(ctx) {
  const d = ctx.durum;
  return {
    sure: ctx.veri.parametreler.sure.min,
    kare: t => { d.ilerleme = t; },
    bitti: () => {
      d.ilerleme = 1;
      if (nedeni(ctx, d) === null) ctx.ses.cal('tik');
    }
  };
}

export function basari(ctx) {
  const d = ctx.durum;
  if (!d.calisti) return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
  const n = nedeni(ctx, d);
  if (n !== null) return { tamam: false, yanParca: false, neden: n };
  return { tamam: true, yanParca: false, neden: 'tamam' };
}

export function ipucu(ctx, seviye) {
  const d = ctx.durum;
  if (seviye === 1) {
    ctx.sahne.vurgula(d.gonye.oturdu ? 'gonye' : 'gonyeKose');
    return {};
  }
  if (seviye === 2) return { anahtar: 'i2' };
  if (seviye === 3) {
    d.gonye.otur();
    d.hayalet = true;
  }
  return {};
}

export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
