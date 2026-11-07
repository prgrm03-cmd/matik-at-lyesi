// D07 · Tren Rayı · sahip GM-D · sözleşme v1.0
export const id = 'D07';
export const surum = '1.0.2';

const RAY_ORTA = { x: 400, y: 260 };
const RAY_YARI = 200;
const UC_EN_KISA = 24;
const VARSAYILAN_BOY = 80;
const TREN_EN = 36;
const BAG = new WeakMap();

export function kur(ctx, seed) {
  void seed;
  const { rastgeleEgim } = ctx.geo;
  const rng = ctx.rng;
  const yon = rastgeleEgim(rng);
  const t1 = rng.tam(-150, -70);
  const t2 = rng.tam(-30, 30);
  const t3 = rng.tam(70, 150);
  const ray = { A: { x: RAY_ORTA.x, y: RAY_ORTA.y }, yon };
  const pimler = [
    imzaliIlerle(ctx, RAY_ORTA, yon, t1),
    imzaliIlerle(ctx, RAY_ORTA, yon, t2),
    imzaliIlerle(ctx, RAY_ORTA, yon, t3)
  ];
  const w = {
    gonye: ctx.widget.gonye({ dogru: ray }),
    pergel: ctx.widget.pergel({ olcuKilidi: true }),
    lazer: ctx.widget.lazer({ mod: 'dogru' })
  };
  BAG.set(ctx, w);
  const kart = ctx.durum?.kart ?? ctx.defter.kuralKarti({
    kalipAnahtari: 'paralel',
    disliler: [{ ad: 'kesisme', secenekler: ['kesismez', 'kesisir'] }],
    dogru: { kesisme: 'kesismez' }
  });
  const sinama = ctx.durum?.sinama ?? null;
  ctx.durum = {
    ray, pimler, dikmeler: [null, null, null], surukle: null, secili: null,
    calisti: false, ilerleme: 0, sapma: 0, ipucu: 0, kart, sinama
  };
}

function imzaliIlerle(ctx, P, yon, t) {
  if (t === 0) return { x: P.x, y: P.y };
  const { aciNormalize, ilerle } = ctx.geo;
  return t > 0 ? ilerle(P, aciNormalize(yon), t) : ilerle(P, aciNormalize(yon + 180), -t);
}

function tarafYonu(ctx, ray, taraf) {
  const { aciNormalize, ilerle, hangiTarafta } = ctx.geo;
  const artiYon = aciNormalize(ray.yon + 90);
  const eksiYon = aciNormalize(ray.yon - 90);
  const s = hangiTarafta(ilerle(ray.A, artiYon, 1), ray);
  return s === taraf ? artiYon : eksiYon;
}

function dikmeYap(ctx, d, i, Q, w) {
  const { noktaDogruUzakligi, hangiTarafta, ilerle, esitMi, TOLERANS } = ctx.geo;
  const u = noktaDogruUzakligi(Q, d.ray);
  const taraf = hangiTarafta(Q, d.ray);
  d.secili = i;
  d.calisti = false;
  d.ilerleme = 0;
  d.sapma = 0;
  if (u < UC_EN_KISA || taraf === 0) return null;
  const P = d.pimler[i];
  let B = { x: Q.x, y: Q.y };
  let dik = false;
  if (w.gonye.oturdu) {
    const boy = w.pergel.kilit ? w.pergel.aciklik : u;
    if (boy < UC_EN_KISA) return null;
    B = ilerle(P, tarafYonu(ctx, d.ray, taraf), boy);
    dik = true;
  }
  if (esitMi(P, B, TOLERANS.kesisimEps)) return null;
  return { A: { x: P.x, y: P.y }, B, dik, taraf };
}

function uclar(d) {
  return [d.dikmeler[0].B, d.dikmeler[1].B, d.dikmeler[2].B];
}

function hepsiVar(ctx, d) {
  const { esitMi, TOLERANS } = ctx.geo;
  const m = d.dikmeler;
  if (!m[0] || !m[1] || !m[2]) return false;
  const eps = TOLERANS.kesisimEps;
  for (let i = 0; i < 3; i++) {
    if (esitMi(m[i].A, m[i].B, eps)) return false;
  }
  return !esitMi(m[0].B, m[1].B, eps) &&
    !esitMi(m[1].B, m[2].B, eps) &&
    !esitMi(m[0].B, m[2].B, eps);
}

function hepsiDik(ctx, d, ray) {
  const { dikMi, yonAci, esitMi, TOLERANS } = ctx.geo;
  for (let i = 0; i < 3; i++) {
    const m = d.dikmeler[i];
    if (!m || esitMi(m.A, m.B, TOLERANS.kesisimEps)) return false;
    if (!dikMi(yonAci(m.A, m.B), ray.yon, TOLERANS.dikme)) return false;
  }
  return true;
}

function esBoyMu(ctx, d) {
  const { uzaklik, TOLERANS } = ctx.geo;
  const r = uzaklik(d.dikmeler[0].A, d.dikmeler[0].B);
  const limit = TOLERANS.uzunlukOran * r;
  for (let i = 1; i < 3; i++) {
    if (Math.abs(uzaklik(d.dikmeler[i].A, d.dikmeler[i].B) - r) > limit) return false;
  }
  return true;
}

function ayniTarafMi(d) {
  const t0 = d.dikmeler[0].taraf;
  return d.dikmeler[1].taraf === t0 && d.dikmeler[2].taraf === t0;
}

function kBul(w) {
  return w.lazer.hat() ?? null;
}

function kParalelMi(ctx, k, ray) {
  const { paralelMi, hangiTarafta, TOLERANS } = ctx.geo;
  if (!paralelMi(k.yon, ray.yon, TOLERANS.dikme)) return false;
  const u1 = imzaliIlerle(ctx, ray.A, ray.yon, RAY_YARI);
  const u2 = imzaliIlerle(ctx, ray.A, ray.yon, -RAY_YARI);
  const s1 = hangiTarafta(u1, k);
  const s2 = hangiTarafta(u2, k);
  return s1 !== 0 && s1 === s2;
}

function geometriNedeni(ctx, d, w) {
  if (!hepsiVar(ctx, d)) return 'eksik';
  if (!hepsiDik(ctx, d, d.ray)) return 'dikDegil';
  if (!w.pergel.kilit) return 'pergelAcik';
  if (!esBoyMu(ctx, d)) return 'esDegil';
  if (!ayniTarafMi(d)) return 'tarafFarkli';
  const k = kBul(w);
  const gecti = w.lazer.gecerMi(uclar(d), ctx.geo.TOLERANS.hatBirim);
  if (!k || gecti.some(g => !g)) return 'kYok';
  if (!kParalelMi(ctx, k, d.ray)) return 'kesisir';
  return null;
}

function kartNedeni(d) {
  if (!d.kart.takili) return 'kartYok';
  if (!d.kart.dogruMu()) return 'kartTers';
  if (!d.sinama || !d.sinama.basarili) return 'sinaYok';
  if (d.sinama.kartAyar.kesisme !== d.kart.ayar().kesisme) return 'sinaYok';
  return null;
}

function trenKonum(ctx, d, t) {
  const { uzaklik, yonAci, ilerle, ortaNokta, aciNormalize, TOLERANS } = ctx.geo;
  const P1 = d.pimler[0];
  const P3 = d.pimler[2];
  const B1 = d.dikmeler[0].B;
  const B3 = d.dikmeler[2].B;
  const uOn = uzaklik(P1, P3);
  const uArka = uzaklik(B1, B3);
  const on = (t <= 0 || uOn <= TOLERANS.kesisimEps)
    ? { x: P1.x, y: P1.y }
    : ilerle(P1, yonAci(P1, P3), t * uOn);
  const arka = (t <= 0 || uArka <= TOLERANS.kesisimEps)
    ? { x: B1.x, y: B1.y }
    : ilerle(B1, yonAci(B1, B3), t * uArka);
  const orta = ortaNokta(on, arka);
  const yon = uzaklik(on, arka) > TOLERANS.kesisimEps ? yonAci(on, arka) : d.ray.yon;
  const sapma = aciNormalize(yon - tarafYonu(ctx, d.ray, d.dikmeler[0].taraf));
  return { on, arka, orta, sapma };
}

function ornekCiz(ctx, sahne, dDogru, kDogru, noktalar, uclarN) {
  sahne.dogru(dDogru.A, dDogru.yon, { renk: 'gri', kalinlik: 'kalin' });
  for (let i = 0; i < 3; i++) {
    sahne.parca(noktalar[i], uclarN[i], { renk: 'mavi', kalinlik: 'ince' });
  }
  const k1 = imzaliIlerle(ctx, kDogru.A, kDogru.yon, RAY_YARI);
  const k2 = imzaliIlerle(ctx, kDogru.A, kDogru.yon, -RAY_YARI);
  sahne.parca(k2, k1, { renk: 'turuncu' });
}

function ureticiYap(ctx) {
  const { rastgeleEgim, ilerle } = ctx.geo;
  return function uretici(rng) {
    const ax = rng.tam(-60, 60) + RAY_ORTA.x;
    const dDogru = { A: { x: ax, y: RAY_ORTA.y }, yon: rastgeleEgim(rng) };
    const r = rng.tam(40, 110);
    const tList = [rng.tam(-150, -70), rng.tam(-30, 30), rng.tam(70, 150)];
    const dikYon = tarafYonu(ctx, dDogru, 1);
    const noktalar = tList.map(ti => imzaliIlerle(ctx, dDogru.A, dDogru.yon, ti));
    const uclarN = noktalar.map(P => ilerle(P, dikYon, r));
    const kDogru = { A: uclarN[0], yon: dDogru.yon };
    const durumStr = kParalelMi(ctx, kDogru, dDogru) ? 'kesismez' : 'kesisir';
    if (ctx.durum) ctx.durum.gorulen = durumStr;
    return {
      ornek: { d: dDogru, k: kDogru, uclar: uclarN },
      beklenen: { kesisme: 'kesismez' },
      ciz(s) { ornekCiz(ctx, s, dDogru, kDogru, noktalar, uclarN); }
    };
  };
}

function ipucuHayalet(ctx, d, ray) {
  const { uzaklik, ilerle } = ctx.geo;
  const ilkDik = d.dikmeler.find(m => m && m.dik);
  const taraf = ilkDik ? ilkDik.taraf : 1;
  const boy = ilkDik ? uzaklik(ilkDik.A, ilkDik.B) : VARSAYILAN_BOY;
  const j = d.dikmeler.findIndex(m => !m);
  const idx = j >= 0 ? j : 1;
  return ilerle(d.pimler[idx], tarafYonu(ctx, ray, taraf), boy);
}

function cizRay(ctx, d, sahne) {
  sahne.dogru(d.ray.A, d.ray.yon, { renk: 'gri', kalinlik: 'kalin' });
  sahne.etiket(d.ray.A, 'ray');
  for (let i = 0; i < 3; i++) {
    sahne.pim(d.pimler[i], { id: 'P' + (i + 1), renk: 'gri' });
  }
  if (d.ipucu === 1) {
    const h = ipucuHayalet(ctx, d, d.ray);
    sahne.hayalet(s => s.cember({ merkez: h, r: 10 }, { renk: 'mavi' }));
  }
}

function cizDikmeler(d, sahne) {
  for (let i = 0; i < 3; i++) {
    const m = d.dikmeler[i];
    if (m) {
      sahne.parca(m.A, m.B, {
        renk: m.dik ? 'mavi' : 'turuncu',
        kesik: !m.dik,
        kalinlik: d.secili === i ? 'kalin' : 'normal'
      });
    }
    const ucKonum = (d.surukle && d.surukle.i === i)
      ? d.surukle.nokta
      : (m ? m.B : d.pimler[i]);
    sahne.pim(ucKonum, { id: 'uc' + (i + 1), renk: 'turuncu' });
  }
}

function cizTren(ctx, d, sahne) {
  if ((!d.calisti && d.ilerleme <= 0) || !hepsiVar(ctx, d)) return;
  const { ilerle } = ctx.geo;
  const tk = trenKonum(ctx, d, d.ilerleme);
  const a = d.ray.yon + d.sapma;
  const onOrta = ilerle(tk.orta, a, TREN_EN);
  const arkaOrta = ilerle(tk.orta, a + 180, TREN_EN);
  const k1 = ilerle(onOrta, a + 90, TREN_EN / 2);
  const k2 = ilerle(onOrta, a - 90, TREN_EN / 2);
  const k3 = ilerle(arkaOrta, a - 90, TREN_EN / 2);
  const k4 = ilerle(arkaOrta, a + 90, TREN_EN / 2);
  sahne.parca(k1, k2, { renk: 'yesil', kalinlik: 'kalin' });
  sahne.parca(k2, k3, { renk: 'yesil', kalinlik: 'kalin' });
  sahne.parca(k3, k4, { renk: 'yesil', kalinlik: 'kalin' });
  sahne.parca(k4, k1, { renk: 'yesil', kalinlik: 'kalin' });
}

export function ciz(ctx) {
  const d = ctx.durum;
  const sahne = ctx.sahne;
  const w = BAG.get(ctx);
  cizRay(ctx, d, sahne);
  cizDikmeler(d, sahne);
  cizTren(ctx, d, sahne);
  const pergelEtkin = d.secili !== null && Boolean(d.dikmeler[d.secili]);
  sahne.dugme({ id: 'pergelAc', anahtar: 'pergelAc', konum: 'sag', etkin: pergelEtkin });
  sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'sag', etkin: hepsiVar(ctx, d) });
  sahne.dugme({ id: 'sina', anahtar: 'sina', konum: 'sag', etkin: Boolean(d.kart.takili) });
  w.gonye.ciz(sahne);
  w.pergel.ciz(sahne);
  w.lazer.ciz(sahne);
}

function ucGirdi(ctx, d, w, olay) {
  const h = olay.hedef || (d.surukle ? 'uc' + (d.surukle.i + 1) : '');
  const idx = ['uc1', 'uc2', 'uc3'].indexOf(h);
  if (idx < 0) return;
  const nokta = { x: olay.x, y: olay.y };
  if (olay.tur === 'bas') d.surukle = { i: idx, nokta };
  else if (olay.tur === 'surukle' && d.surukle) d.surukle.nokta = nokta;
  else if (olay.tur === 'birak' && d.surukle) {
    d.dikmeler[d.surukle.i] = dikmeYap(ctx, d, d.surukle.i, nokta, w);
    d.surukle = null;
  }
}

function dugmeGirdi(ctx, d, w, dugmeId) {
  if (dugmeId === 'pergelAc' && d.secili !== null && d.dikmeler[d.secili]) {
    const m = d.dikmeler[d.secili];
    w.pergel.acikligiAl(m.A, m.B);
    w.pergel.kilitle();
  } else if (dugmeId === 'calistir' && hepsiVar(ctx, d)) {
    calistir(ctx).bitti();
  } else if (dugmeId === 'sina' && d.kart.takili) {
    const kartAyar = d.kart.ayar();
    ctx.defter.sina(d.kart, ureticiYap(ctx)).then(s => {
      const dd = ctx.durum;
      dd.sinama = { basarili: s.basarili, karsiOrnek: s.karsiOrnek, kartAyar };
    });
  }
}

export function girdi(ctx, olay) {
  if (!olay) return;
  const d = ctx.durum;
  const w = BAG.get(ctx);
  if (w.gonye.girdi(olay) || w.pergel.girdi(olay)) return;
  if (w.lazer.girdi(olay)) {
    d.calisti = false;
    d.ilerleme = 0;
    return;
  }
  if (olay.tur === 'dugme') dugmeGirdi(ctx, d, w, olay.dugmeId || olay.ad);
  else if (['bas', 'surukle', 'birak'].includes(olay.tur)) ucGirdi(ctx, d, w, olay);
}

export function calistir(ctx) {
  const d = ctx.durum;
  const { uzaklik, TOLERANS } = ctx.geo;
  const sure = ctx.veri?.parametreler?.sure?.min ?? 1200;
  const gecerli = hepsiVar(ctx, d) &&
    uzaklik(d.dikmeler[0].B, d.dikmeler[2].B) > TOLERANS.kesisimEps;
  return {
    sure,
    kare(t) {
      if (!gecerli) return;
      d.ilerleme = t;
      d.sapma = trenKonum(ctx, d, t).sapma;
    },
    bitti() {
      if (!gecerli) return;
      d.calisti = true;
      d.ilerleme = 1;
      d.sapma = trenKonum(ctx, d, 1).sapma;
    }
  };
}

export function basari(ctx) {
  const d = ctx.durum;
  const w = BAG.get(ctx);
  const geoNeden = geometriNedeni(ctx, d, w);
  if (geoNeden) return { tamam: false, yanParca: false, neden: geoNeden };
  if (!d.calisti) return { tamam: false, yanParca: false, neden: 'calistirilmadi' };
  const kNeden = kartNedeni(d);
  if (kNeden) return { tamam: false, yanParca: false, neden: kNeden };
  return { tamam: true, yanParca: false, neden: 'tamam' };
}

export function ipucu(ctx, seviye) {
  const d = ctx.durum;
  const w = BAG.get(ctx);
  const { uzaklik, ilerle } = ctx.geo;
  d.ipucu = seviye;
  d.calisti = false;
  d.ilerleme = 0;
  if (seviye === 1) {
    ctx.sahne.vurgula('uc2');
    return { nokta: ipucuHayalet(ctx, d, d.ray) };
  }
  if (seviye === 2) return { anahtar: 'i2' };
  const m0 = d.dikmeler[0];
  const P1 = d.pimler[0];
  const P2 = d.pimler[1];
  const taraf0 = m0 ? m0.taraf : 1;
  const boy0 = m0 ? uzaklik(m0.A, m0.B) : VARSAYILAN_BOY;
  if (!m0 || !m0.dik) {
    const B0 = ilerle(P1, tarafYonu(ctx, d.ray, taraf0), boy0);
    d.dikmeler[0] = { A: { x: P1.x, y: P1.y }, B: B0, dik: true, taraf: taraf0 };
  }
  w.pergel.acikligiAl(d.dikmeler[0].A, d.dikmeler[0].B);
  w.pergel.kilitle();
  w.gonye.otur();
  const B1 = ilerle(P2, tarafYonu(ctx, d.ray, d.dikmeler[0].taraf), w.pergel.aciklik);
  d.dikmeler[1] = { A: { x: P2.x, y: P2.y }, B: B1, dik: true, taraf: d.dikmeler[0].taraf };
  d.secili = 0;
  return { dikmeler: [0, 1] };
}

export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
