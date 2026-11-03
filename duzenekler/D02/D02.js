// D02 · Lazer Hattı · sahip GM-D · sözleşme v1.0

/** @type {string} */
export const id = 'D02';
/** @type {string} */
export const surum = '1.0.0';

const TEZGAH_MERKEZ = { x: 500, y: 500 };
const MOD_SIRASI = ['parca', 'isin', 'dogru'];

/** @param {Ctx} ctx @param {number} seed @returns {void} */
export function kur(ctx, seed) {
  const senaryo = ctx.geo.lazerSenaryosu(ctx.rng);
  const sensorler = senaryo.sensor.map((P) => ({
    x: P.x + TEZGAH_MERKEZ.x,
    y: P.y + TEZGAH_MERKEZ.y
  }));
  const alarmlar = senaryo.alarm.map((P) => ({
    x: P.x + TEZGAH_MERKEZ.x,
    y: P.y + TEZGAH_MERKEZ.y
  }));

  ctx.durum = {
    seed,
    mod: MOD_SIRASI[(ctx.tur || 0) % MOD_SIRASI.length],
    sensorler,
    alarmlar,
    lazer: null,
    isikOrani: 0,
    tur: ctx.tur,
    gecmis: []
  };
  ctx.durum.lazer = ctx.widget.lazer({ mod: ctx.durum.mod });
  ctx.matik.soyle(ctx.tur === 0 ? 'giris' : 'tekrar');
}

function toleransBirim(ctx) {
  return ctx.sahne.pxToBirim(ctx.geo.TOLERANS.pimYakalamaPx);
}

function isikCiz(ctx) {
  const { lazer, isikOrani, mod } = ctx.durum;
  if (isikOrani <= 0 || !lazer.A || !lazer.B) return;
  if (ctx.geo.esitMi(lazer.A, lazer.B, 1)) return;
  const yon = ctx.geo.yonAci(lazer.A, lazer.B);
  if (mod === 'parca') {
    const mesafe = ctx.geo.uzaklik(lazer.A, lazer.B) * isikOrani;
    const uc = ctx.geo.ilerle(lazer.A, yon, mesafe);
    ctx.sahne.parca(lazer.A, uc, { renk: 'sari', kalinlik: 'kalin', id: 'isik' });
    return;
  }
  const boy = (ctx.sahne.genislik + ctx.sahne.yukseklik) * isikOrani;
  const ileriUc = ctx.geo.ilerle(lazer.A, yon, boy);
  if (mod === 'isin') {
    ctx.sahne.parca(lazer.A, ileriUc, { renk: 'sari', kalinlik: 'kalin', id: 'isik' });
    return;
  }
  const tersYon = ctx.geo.aciNormalize(yon + 180);
  const geriUc = ctx.geo.ilerle(lazer.A, tersYon, boy);
  ctx.sahne.parca(geriUc, ileriUc, { renk: 'sari', kalinlik: 'kalin', id: 'isik' });
}

function ilkHataHedefi(ctx) {
  const { lazer, sensorler, alarmlar } = ctx.durum;
  if (!lazer.A || !lazer.B) return 'sensor0';
  const tol = toleransBirim(ctx);
  const sensorSonuc = lazer.gecerMi(sensorler, tol);
  const eksikIndis = sensorSonuc.findIndex((gecer) => !gecer);
  if (eksikIndis !== -1) return 'sensor' + eksikIndis;
  const alarmSonuc = lazer.gecerMi(alarmlar, tol);
  const yananIndis = alarmSonuc.findIndex((gecer) => gecer);
  if (yananIndis !== -1) return 'alarm' + yananIndis;
  return 'sensor0';
}

/** @param {Ctx} ctx @returns {void} */
export function ciz(ctx) {
  const { sensorler, alarmlar, lazer } = ctx.durum;
  ctx.sahne.katman('alt');
  isikCiz(ctx);
  for (let i = 0; i < sensorler.length; i += 1) {
    ctx.sahne.pim(sensorler[i], {
      id: 'sensor' + i,
      renk: 'yesil',
      boyut: 'normal'
    });
  }
  for (let i = 0; i < alarmlar.length; i += 1) {
    ctx.sahne.pim(alarmlar[i], {
      id: 'alarm' + i,
      renk: 'kirmizi',
      boyut: 'normal'
    });
  }
  ctx.sahne.katman('ust');
  lazer.ciz(ctx.sahne);
  ctx.sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
}

/** @param {Ctx} ctx @param {Olay} olay @returns {void} */
export function girdi(ctx, olay) {
  if (ctx.durum.lazer && ctx.durum.lazer.girdi(olay)) return;
  switch (olay.tur) {
    case 'dugme':
      break;
    default:
      break;
  }
}

/** @param {Ctx} ctx @returns {Calistirma} */
export function calistir(ctx) {
  return {
    sure: 600,
    kare(t) {
      ctx.durum.isikOrani = t;
    },
    bitti() {
      ctx.durum.isikOrani = 1;
    }
  };
}

/** @param {Ctx} ctx @returns {{tamam:boolean, yanParca:boolean, neden:string}} */
export function basari(ctx) {
  const { lazer, sensorler, alarmlar } = ctx.durum;
  if (!lazer || !lazer.A || !lazer.B) {
    return { tamam: false, yanParca: false, neden: 'yarimKaldi' };
  }
  const tol = toleransBirim(ctx);
  const alarmGecti = lazer.gecerMi(alarmlar, tol);
  if (alarmGecti.some((deger) => deger)) {
    return { tamam: false, yanParca: false, neden: 'alarmYandi' };
  }
  const sensorGecti = lazer.gecerMi(sensorler, tol);
  if (!sensorGecti.every((deger) => deger)) {
    return { tamam: false, yanParca: false, neden: 'sensorKacti' };
  }
  return { tamam: true, yanParca: false, neden: 'tamam' };
}

/** @param {Ctx} ctx @param {1|2|3} seviye @returns {{anahtar?:string}} */
export function ipucu(ctx, seviye) {
  if (seviye === 1) {
    ctx.sahne.vurgula(ilkHataHedefi(ctx));
    return {};
  }
  if (seviye === 2) return { anahtar: 'i2' };
  if (seviye === 3 && ctx.durum.sensorler.length > 0) {
    const ilk = ctx.durum.sensorler[0];
    ctx.durum.lazer.A = { x: ilk.x, y: ilk.y };
  }
  return {};
}

/** @param {Ctx} ctx @param {TahtaAyar} ayarlar @returns {void} */
export function tahta(ctx, ayarlar) {
  void ctx;
  void ayarlar;
}
