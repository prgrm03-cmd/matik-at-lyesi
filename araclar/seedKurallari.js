import * as geo from '../geo/index.js';

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
      dogrula(typeof cagri.arg[1] === 'string' && !/^[xy]/i.test(cagri.arg[1]),
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
