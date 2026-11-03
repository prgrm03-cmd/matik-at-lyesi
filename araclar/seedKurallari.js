import * as geo from '../geo/index.js';

// ADT-008: üretici uzayından tezgâha uygulanan ötelemenin merkezi.
const TEZGAH_MERKEZ = { x: 500, y: 500 };

/** @param {boolean} kosul @param {string} denetim @param {string} [kod] */
export function dogrula(kosul, denetim, kod = 'PARAMETRE_ARALIK_DISI') {
  if (kosul) return;
  const hata = new Error(kod);
  hata.denetim = denetim;
  throw hata;
}

/** @param {Object} araliklar @param {Object} degerler @returns {void} */
export function parametreleriDogrula(araliklar, degerler) {
  for (const [ad, aralik] of Object.entries(araliklar)) {
    const dizi = degerler[ad];
    dogrula(Array.isArray(dizi) && dizi.length > 0, 'parametreEksik:' + ad, 'IMZA_EKSIK');
    for (const deger of dizi) {
      dogrula(Number.isFinite(deger) && deger >= aralik.min && deger <= aralik.max,
        'parametreAraligi:' + ad);
      if (aralik.adim !== undefined) {
        const bolum = (deger - aralik.min) / aralik.adim;
        dogrula(aralik.adim > 0 && Math.abs(bolum - Math.round(bolum)) < 1e-6,
          'parametreAdimi:' + ad);
      }
      dogrula(!aralik.haric?.includes(deger), 'parametreHaric:' + ad);
    }
  }
}

/** @param {Ctx} ctx @returns {Object} D02.json konumları üretici uzayındadır. */
export function d02Parametreleri(ctx) {
  const konum = [];
  for (const ad of ['sensorler', 'alarmlar']) {
    const noktalar = ctx.durum?.[ad];
    dogrula(Array.isArray(noktalar) && noktalar.length > 0,
      'D02NoktalarEksik:' + ad, 'IMZA_EKSIK');
    for (const nokta of noktalar) {
      dogrula(Number.isFinite(nokta?.x) && Number.isFinite(nokta?.y),
        'parametreAraligi:konum');
      // ADT-008: kur içindeki ötelemeyi yalnız gözlemde geri al.
      konum.push(nokta.x - TEZGAH_MERKEZ.x, nokta.y - TEZGAH_MERKEZ.y);
    }
  }
  return { konum };
}

function d03NoktalariDogrula(durum) {
  dogrula(durum?.A, 'D03AEksik', 'IMZA_EKSIK');
  const noktalar = [durum.A];
  for (const ad of ['sensorler', 'alarmlar']) {
    dogrula(Array.isArray(durum[ad]) && durum[ad].length === 2,
      'D03NoktalarEksik:' + ad, 'IMZA_EKSIK');
    noktalar.push(...durum[ad]);
  }
  for (const nokta of noktalar) {
    dogrula([nokta?.x, nokta?.y].every(deger =>
      Number.isFinite(deger) && deger >= 0 && deger <= 1000), 'D03TezgahSiniri');
  }
  dogrula(durum.isaret === 1 || durum.isaret === -1, 'D03Isaret');
  dogrula(Object.prototype.hasOwnProperty.call(durum, 'hedefYon'),
    'D03HedefEksik', 'IMZA_EKSIK');
}

/** @param {Ctx} ctx @param {Object} gozlem @returns {Object} D03 kurulum parametreleri. */
export function d03Parametreleri(ctx, gozlem) {
  d03NoktalariDogrula(ctx.durum);
  // D03.kur sırası; ham mesafeler yerleşimde kısalabildiği için RNG çıktısını kullan.
  const adlar = ['konum', 'konum', 'sapma', 'uzaklik', 'ara', 'baslangic'];
  dogrula(gozlem?.tam?.length === adlar.length && gozlem?.lazerler?.length === 1,
    'D03GozlemEksik', 'IMZA_EKSIK');
  const degerler = { yon: [ctx.durum.hedefYon], cark: [gozlem.lazerler[0]?.carkAdim] };
  for (const [i, ad] of adlar.entries()) {
    const cagri = gozlem.tam[i];
    const aralik = ctx.veri.parametreler[ad];
    dogrula(cagri.min === aralik.min && cagri.max === aralik.max,
      'D03RngAraligi:' + ad);
    (degerler[ad] ||= []).push(cagri.deger);
  }
  return degerler;
}

function d04NoktalariDogrula(durum) {
  const noktalar = [durum?.M, durum?.cubuk?.A, durum?.cubuk?.B];
  for (const ad of ['ledler', 'ekPimler']) {
    dogrula(Array.isArray(durum?.[ad]) && durum[ad].length === 3,
      'D04NoktalarEksik:' + ad, 'IMZA_EKSIK');
    noktalar.push(...durum[ad].map(nokta => nokta?.P));
  }
  for (const nokta of noktalar) {
    dogrula([nokta?.x, nokta?.y].every(deger =>
      Number.isFinite(deger) && deger >= 0 && deger <= 1000), 'D04TezgahSiniri');
  }
  dogrula(['uzeri', 'ic', 'dis'].every(hedef =>
    durum.ekPimler.some(pim => pim.hedef === hedef)), 'D04Hedefler');
}

/** @param {Ctx} ctx @param {Object} gozlem @returns {Object} D04 kurulum parametreleri. */
export function d04Parametreleri(ctx, gozlem) {
  d04NoktalariDogrula(ctx.durum);
  // D04.kur ana akışı; tamHaric ve karistir iç çekilişleri gözleme katılmaz.
  const adlar = ['konum', 'konum', 'aci', 'ayrim', 'ayrim', 'aci', 'kayma',
    ...Array(10).fill('konum')];
  dogrula(Array.isArray(gozlem?.tam) && gozlem.tam.length === adlar.length,
    'D04GozlemEksik', 'IMZA_EKSIK');
  const degerler = { yaricap: [ctx.durum.r] };
  for (const [i, ad] of adlar.entries()) {
    const cagri = gozlem.tam[i];
    dogrula(cagri && typeof cagri === 'object', 'D04GozlemEksik', 'IMZA_EKSIK');
    const aralik = ctx.veri.parametreler[ad];
    dogrula(cagri.min === aralik.min && cagri.max === aralik.max,
      'D04RngAraligi:' + ad);
    (degerler[ad] ||= []).push(cagri.deger);
  }
  return degerler;
}

function d05NoktalariDogrula(durum) {
  dogrula(Array.isArray(durum?.isaretler) && durum.isaretler.length === 2,
    'D05NoktalarEksik:isaretler', 'IMZA_EKSIK');
  dogrula(Array.isArray(durum.hedefler) && durum.hedefler.length === 3, 'D05Hedefler');
  const noktalar = [durum.M0, ...durum.isaretler,
    ...durum.hedefler.map(hedef => hedef?.merkez), durum.cubuk?.A, durum.cubuk?.B];
  for (const nokta of noktalar) {
    dogrula([nokta?.x, nokta?.y].every(deger =>
      Number.isFinite(deger) && deger >= 0 && deger <= 1000), 'D05TezgahSiniri');
  }
  dogrula(durum.hedefler.every(hedef => hedef.r === durum.r) &&
    durum.hedefler[0].merkez.x === durum.M0.x &&
    durum.hedefler[0].merkez.y === durum.M0.y, 'D05Hedefler');
  dogrula(geo.toleransIcinde(geo.uzaklik(durum.cubuk.A, durum.cubuk.B),
    durum.r, geo.TOLERANS.uzunlukOran * durum.r), 'D05Cubuk');
}

/** @param {Ctx} ctx @param {Object} gozlem @returns {Object} D05 kurulum parametreleri. */
export function d05Parametreleri(ctx, gozlem) {
  d05NoktalariDogrula(ctx.durum);
  // D05.kur ana akışı; yarıçapı seçen tamHaric iç çekilişleri gözleme katılmaz.
  const adlar = ['konum', 'konum', 'aci', 'aci', 'konum', 'konum', 'aci'];
  dogrula(Array.isArray(gozlem?.tam) && gozlem.tam.length === adlar.length,
    'D05GozlemEksik', 'IMZA_EKSIK');
  const degerler = { yaricap: [ctx.durum.r] };
  for (const [i, ad] of adlar.entries()) {
    const cagri = gozlem.tam[i];
    dogrula(cagri && typeof cagri === 'object', 'D05GozlemEksik', 'IMZA_EKSIK');
    const aralik = ctx.veri.parametreler[ad];
    dogrula(cagri.min === aralik.min && cagri.max === aralik.max,
      'D05RngAraligi:' + ad);
    (degerler[ad] ||= []).push(cagri.deger);
  }
  return degerler;
}

/** @param {Ctx} ctx @returns {Object} D09a.json aci aralığı sipariş hedefini tanımlar. */
export function d09aParametreleri(ctx) {
  dogrula(ctx.durum && Object.prototype.hasOwnProperty.call(ctx.durum, 'hedef'),
    'D09aHedefEksik', 'IMZA_EKSIK');
  return { aci: [ctx.durum.hedef] };
}

/** @param {Object} cagri @returns {void} Gerçek tamHaric girdisi ve çıktısı. */
export function gecmisiDogrula(cagri) {
  const { min, max, haric, komsuluk, deger } = cagri;
  dogrula(Number.isInteger(deger) && deger >= min && deger <= max, 'halkaAraligi');
  dogrula(Array.isArray(haric) && Number.isFinite(komsuluk) && komsuluk >= 0,
    'halkaGirdisi');
  dogrula(haric.every(onceki => Number.isFinite(onceki) &&
    Math.abs(deger - onceki) > komsuluk), 'halkaKomsulugu');
}

/** @param {Cokgen} cokgen @param {boolean} ucgen @returns {void} ADT-005 duruşları. */
export function prototipiDogrula(cokgen, ucgen) {
  const P = cokgen.koseler;
  const kenarlar = P.map((A, i) => {
    const B = P[(i + 1) % P.length];
    return { yon: geo.yonAci(A, B), uzunluk: geo.uzaklik(A, B) };
  });
  dogrula(geo.disBukeyMi(cokgen), 'ureticiDisBukeylik');
  const secilen = ucgen ? kenarlar :
    [kenarlar.reduce((en, kenar) => kenar.uzunluk > en.uzunluk ? kenar : en)];
  const eksenler = ucgen ? [0, 90, 180, 270] : [0, 180];
  for (const kenar of secilen) {
    dogrula(eksenler.every(eksen => geo.aciFark(kenar.yon, eksen) > geo.TOLERANS.aciOkuma),
      'prototipikDurus');
  }
}

/** @param {Object} sonuc @param {Veri} veri @returns {void} */
export function sonucuDogrula(sonuc, veri) {
  dogrula(sonuc && typeof sonuc.tamam === 'boolean' &&
    typeof sonuc.yanParca === 'boolean' && typeof sonuc.neden === 'string',
  'basariSekli', 'IMZA_EKSIK');
  dogrula(Object.prototype.hasOwnProperty.call(veri.nedenler, sonuc.neden),
    'basariNedeni', 'MATIK_ANAHTAR_YOK');
  dogrula(!sonuc.tamam || sonuc.neden === 'tamam', 'basariTamam', 'IMZA_EKSIK');
}

/** @param {Veri} veri @param {Object} kayit @returns {void} */
export function sahneyiDogrula(veri, kayit) {
  dogrula(!veri.bayraklar.olcuKilidi || !(kayit.sayac.sayi > 0),
    'olcuKilidi', 'OLCU_KILIDI_IHLALI');
  for (const cagri of kayit.cagrilar) {
    if (cagri.ad === 'etiket') {
      dogrula(typeof cagri.arg[1] === 'string' && !/^[xy](\d|[A-Z]|$)/.test(cagri.arg[1]),
        'koordinatEtiketi');
    }
    if (veri.kod === 'D15' && cagri.ad === 'sayi') {
      dogrula(Number(cagri.arg[1]) !== 180, 'ucgenToplami');
    }
  }
}

function sonCokgenler(cagrilar) {
  const cokgenler = cagrilar.filter(c => c.ad === 'cokgen').map(c => ({ koseler: c.arg[0] }));
  dogrula(cokgenler.length > 0, 'cokgenGozlemiEksik', 'IMZA_EKSIK');
  return cokgenler;
}

/** @param {Object[]} cagrilar @param {Object} sonuc @returns {void} */
export function d13Dogrula(cagrilar, sonuc) {
  for (const cokgen of sonCokgenler(cagrilar)) {
    dogrula(!sonuc.tamam || geo.disBukeyMi(cokgen), 'D13DisBukeylik');
  }
}

/** @param {Object[]} tablolar @returns {void} */
export function d12bDogrula(tablolar) {
  dogrula(tablolar.length > 0, 'D12bTabloEksik', 'IMZA_EKSIK');
  for (const tablo of tablolar) {
    dogrula(typeof tablo.ayniKartaKoy === 'function', 'D12bImzaEksik', 'IMZA_EKSIK');
    dogrula(tablo.ayniKartaKoy(0, 1) === false &&
      tablo.ayniKartaKoy(1, 0) === false, 'D12bBolumAyri');
  }
}

/** @param {Object[]} cagrilar @param {Object[]} tablolar @param {Object[]} raflar */
export function d14Dogrula(cagrilar, tablolar, raflar) {
  const cokgenler = sonCokgenler(cagrilar);
  dogrula(cokgenler.length === 1, 'D14CokgenBelirsiz', 'IMZA_EKSIK');
  dogrula(tablolar.length > 0, 'D14TabloEksik', 'IMZA_EKSIK');
  for (const tablo of tablolar) {
    dogrula(Array.isArray(tablo.satirlar) &&
      tablo.satirlar.length === cokgenler[0].koseler.length, 'D14ToplamSatiri');
  }
  for (const raf of raflar) {
    dogrula(!raf.ayar.hucreler.some(hucre => hucre.ad === 'koseGenSayisi'),
      'D14KosegenSayisi');
  }
}

/** @param {Object[]} cagrilar @returns {void} */
export function cemberKesisiminiDogrula(cagrilar) {
  const adaylar = cagrilar.filter(c => c.asama === 'kur' &&
    ['kesisimGarantiliParametre', 'kesisimCemberCember'].includes(c.ad));
  dogrula(adaylar.length > 0, 'kesisimGozlemiEksik', 'IMZA_EKSIK');
  for (const cagri of adaylar) {
    let noktalar = cagri.sonuc;
    if (cagri.ad === 'kesisimGarantiliParametre') {
      const { r1, r2, AB } = cagri.sonuc;
      noktalar = geo.kesisimCemberCember(
        { merkez: { x: 0, y: 0 }, r: r1 }, { merkez: { x: AB, y: 0 }, r: r2 });
    }
    dogrula(Array.isArray(noktalar) && noktalar.length === 2, 'ikiKesisim');
  }
}

/** @param {string} id @param {Object} gozlem @param {Object[]} sonCizim @param {Object} sonuc */
export function ozelKurallariDogrula(id, gozlem, sonCizim, sonuc) {
  if (id === 'D13') d13Dogrula(sonCizim, sonuc);
  if (id === 'D12b') d12bDogrula(gozlem.tablolar);
  if (id === 'D14') d14Dogrula(sonCizim, gozlem.tablolar, gozlem.raflar);
  if (id === 'D17' || id === 'D18') cemberKesisiminiDogrula(gozlem.geo);
}
