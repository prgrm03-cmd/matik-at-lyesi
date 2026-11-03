import { aciFark, aciTuruTol } from '../geo/index.js';

/** @typedef {{satir:number,sutunlar:('ad'|'tur'|'olcu'|'iliski')[],
 * bolumler?:string[],iliskiSecenek?:('ters'|'komsuButunler'|'komsuTumler')[]}} AciTablosuAyar */
/** @typedef {Object} AciTablosu
 * @property {Object[]} satirlar
 * @property {()=>boolean} doluMu
 * @property {(gercek:Object[],tolAci:number)=>{dogru:number,yanlis:number[]}} karsilastir
 * @property {(bolumA:number,bolumB:number)=>false} ayniKartaKoy
 * @property {(i:number,veri:Object)=>void} otomatikDoldur
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 * @property {()=>Object} durum
 * @property {(durum:Object)=>void} yukle
 */

// Ölçüler tezgâh birimidir; tolerans değildir.
const VARSAYILAN_KONUM = Object.freeze({ x: 620, y: 40, genislik: 360 });
const SATIR_YUKSEKLIK = 128;
// Sözleşme §0: mantıksal tezgâh yüksekliği; uzun tablolar kalan alana sığar.
const TEZGAH_YUKSEKLIK = 1000;
const SIMGE_YARICAP = 16;
const BOS_YARI_GENISLIK = 8;
const DAR_SIMGE_ACISI = 45;
const GENIS_SIMGE_ACISI = 135;
// Parmağın üstündeki hayalet uzaklığı yalnız sahne üzerinden birime çevrilir.
const HAYALET_OFSET_PX = 24;
const SUTUNLAR = Object.freeze(['ad', 'tur', 'olcu', 'iliski']);
const TURLER = Object.freeze(['dar', 'dik', 'genis', 'dogru']);
const ILISKILER = Object.freeze(['ters', 'komsuButunler', 'komsuTumler']);
const AYARLAR = Object.freeze(['satir', 'sutunlar', 'bolumler', 'iliskiSecenek']);

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function nesneMi(deger) {
  return deger !== null && typeof deger === 'object' && !Array.isArray(deger);
}

function listeDogrula(liste, kabul) {
  if (!Array.isArray(liste) || liste.length === 0 ||
      new Set(liste).size !== liste.length || ![...liste].every(kabul)) gecersiz();
  return [...liste];
}

function ayarDogrula(ayar) {
  if (!nesneMi(ayar) || Object.keys(ayar).some(ad => !AYARLAR.includes(ad)) ||
      !Number.isSafeInteger(ayar.satir) || ayar.satir < 1) gecersiz();
  const sutunlar = listeDogrula(ayar.sutunlar, ad => SUTUNLAR.includes(ad));
  const bolumler = ayar.bolumler === undefined ? undefined :
    listeDogrula(ayar.bolumler, ad => typeof ad === 'string' && ad.length > 0);
  const iliskiSecenek = ayar.iliskiSecenek === undefined ? undefined :
    listeDogrula(ayar.iliskiSecenek, ad => ILISKILER.includes(ad));
  if (sutunlar.includes('iliski') && !iliskiSecenek) gecersiz();
  return { satir: ayar.satir, sutunlar, bolumler, iliskiSecenek };
}

function konumKopyala(konum) {
  if (!nesneMi(konum) || Object.keys(konum).some(ad =>
    !['x', 'y', 'genislik'].includes(ad)) ||
      ![konum.x, konum.y, konum.genislik].every(Number.isFinite) ||
      konum.genislik <= 0) gecersiz();
  return { x: konum.x, y: konum.y, genislik: konum.genislik };
}

function satirlariOlustur(ayar) {
  return (ayar.bolumler || [undefined]).flatMap(bolum =>
    Array.from({ length: ayar.satir }, () => ({
      ...(bolum === undefined ? {} : { bolum }), ad: null, tur: null, olcu: null, iliski: null
    })));
}

function hucreGecerli(ad, deger, ayar) {
  if (deger === null) return true;
  if (ad === 'ad') return typeof deger === 'string' && /^[A-Z]+$/.test(deger);
  if (ad === 'olcu') return Number.isFinite(deger);
  if (ad === 'tur') return TURLER.includes(deger);
  return ayar.iliskiSecenek?.includes(deger) === true;
}

function satirDolu(satir, ayar) {
  return ayar.sutunlar.every(ad => satir[ad] !== null);
}

function satirDogrula(satir, sablon, ayar) {
  if (!nesneMi(satir) || Object.keys(satir).length !== Object.keys(sablon).length ||
      Object.keys(satir).some(ad => !Object.prototype.hasOwnProperty.call(sablon, ad)) ||
      satir.bolum !== sablon.bolum) gecersiz();
  for (const ad of SUTUNLAR) {
    if (!hucreGecerli(ad, satir[ad], ayar) ||
        (!ayar.sutunlar.includes(ad) && satir[ad] !== null)) gecersiz();
  }
  return { ...satir };
}

function durumuYukle(durum, kayit, ayar) {
  if (!nesneMi(kayit) || Object.keys(kayit).length !== 2 ||
      !Array.isArray(kayit.satirlar) || kayit.satirlar.length !== durum.satirlar.length) {
    gecersiz();
  }
  const konum = konumKopyala(kayit.konum);
  const sablonlar = satirlariOlustur(ayar);
  const satirlar = [...kayit.satirlar].map((satir, i) =>
    satirDogrula(satir, sablonlar[i], ayar));
  durum.konum = konum;
  durum.satirlar.splice(0, durum.satirlar.length, ...satirlar);
  durum.tutulan = null;
}

function otomatikDoldur(durum, ayar, i, veri) {
  if (!Number.isInteger(i) || i < 0 || i >= durum.satirlar.length) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  if (!nesneMi(veri) || Object.keys(veri).some(ad => !SUTUNLAR.includes(ad))) gecersiz();
  const satir = durum.satirlar[i];
  const adlar = ayar.sutunlar.filter(ad => satir[ad] === null && veri[ad] !== undefined);
  if (adlar.some(ad => !hucreGecerli(ad, veri[ad], ayar))) gecersiz();
  for (const ad of adlar) satir[ad] = veri[ad];
}

function eslesir(satir, gercek, ayar, tolAci) {
  return ayar.sutunlar.every(ad => {
    if (ad === 'olcu') return aciFark(satir.olcu, gercek.olcu) <= tolAci;
    if (ad === 'tur') return satir.tur === aciTuruTol(gercek.olcu, tolAci);
    return satir[ad] === gercek[ad];
  });
}

function karsilastir(durum, ayar, gercek, tolAci) {
  if (!Array.isArray(gercek) || !Number.isFinite(tolAci) || tolAci < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  const kullanilan = new Set();
  const yanlis = [];
  const adVar = ayar.sutunlar.includes('ad');
  durum.satirlar.forEach((satir, i) => {
    const j = gercek.findIndex((hedef, indis) => !kullanilan.has(indis) &&
      (adVar ? satir.ad !== null && satir.ad === hedef.ad :
        satirDolu(satir, ayar) && eslesir(satir, hedef, ayar, tolAci)));
    if (j !== -1) kullanilan.add(j);
    if (j === -1 || !satirDolu(satir, ayar) || !eslesir(satir, gercek[j], ayar, tolAci)) {
      yanlis.push(i);
    }
  });
  return { dogru: durum.satirlar.length - yanlis.length, yanlis };
}

function satirYuksekligi(durum) {
  const kalan = TEZGAH_YUKSEKLIK - durum.konum.y;
  return kalan > 0 ? Math.min(SATIR_YUKSEKLIK, kalan / durum.satirlar.length) : SATIR_YUKSEKLIK;
}

function satirIndisi(durum, P) {
  const { x, y, genislik } = durum.konum;
  const yukseklik = satirYuksekligi(durum);
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y) || P.x < x || P.x >= x + genislik ||
      P.y < y || P.y >= y + durum.satirlar.length * yukseklik) return -1;
  return Math.floor((P.y - y) / yukseklik);
}

function tutmayiBaslat(durum, ayar, olay) {
  if (typeof olay.hedef !== 'string') return false;
  const esleme = /^(aci|okuma):(.+)$/.exec(olay.hedef);
  if (!esleme) return false;
  const ad = esleme[1] === 'aci' ? 'ad' : 'olcu';
  const deger = ad === 'ad' ? esleme[2] : Number(esleme[2]);
  if (!ayar.sutunlar.includes(ad) || !hucreGecerli(ad, deger, ayar) ||
      esleme[2].trim() === '') return false;
  durum.tutulan = { ad, deger, P: null };
  return true;
}

function hucreyiCevir(durum, ayar, olay) {
  const i = satirIndisi(durum, olay);
  if (i === -1) return false;
  const sutun = Math.floor((olay.x - durum.konum.x) * ayar.sutunlar.length /
    durum.konum.genislik);
  const ad = ayar.sutunlar[sutun];
  const secenekler = ad === 'tur' ? TURLER : ad === 'iliski' ? ayar.iliskiSecenek : null;
  if (!secenekler) return false;
  const siradaki = secenekler.indexOf(durum.satirlar[i][ad]) + 1;
  durum.satirlar[i][ad] = secenekler[siradaki] ?? null;
  return true;
}

function girdiyiIsle(durum, ayar, olay) {
  if (!olay) return false;
  if (olay.tur === 'bas') return tutmayiBaslat(durum, ayar, olay);
  if (olay.tur === 'tik') return hucreyiCevir(durum, ayar, olay);
  if (!durum.tutulan) return false;
  if (olay.tur === 'surukle') {
    if (!Number.isFinite(olay.x) || !Number.isFinite(olay.y)) return false;
    durum.tutulan.P = { x: olay.x, y: olay.y };
    return true;
  }
  if (olay.tur !== 'birak') return false;
  const i = satirIndisi(durum, olay);
  const { ad, deger } = durum.tutulan;
  if (i !== -1) durum.satirlar[i][ad] = ad === 'olcu' ? Math.round(deger) : deger;
  durum.tutulan = null;
  return true;
}

function cizgi(sahne, A, B, id) {
  sahne.cokgen([A, B], { renk: 'gri', id });
}

function turCiz(sahne, P, tur, id) {
  const r = SIMGE_YARICAP;
  if (tur === 'dar' || tur === 'genis') {
    const aci = tur === 'dar' ? DAR_SIMGE_ACISI : GENIS_SIMGE_ACISI;
    sahne.aciYayi(P, 0, aci, { r, renk: 'gri' });
  } else if (tur === 'dik') {
    cizgi(sahne, { x: P.x - r, y: P.y }, P, id + ':yatay');
    cizgi(sahne, P, { x: P.x, y: P.y - r }, id + ':dikey');
  } else {
    cizgi(sahne, { x: P.x - r, y: P.y }, { x: P.x + r, y: P.y }, id);
  }
}

function hucreCiz(sahne, P, ad, deger, id) {
  if (deger === null) {
    cizgi(sahne, { x: P.x - BOS_YARI_GENISLIK, y: P.y },
      { x: P.x + BOS_YARI_GENISLIK, y: P.y }, id);
  } else if (ad === 'tur') turCiz(sahne, P, deger, id);
  else if (ad === 'iliski') sahne.etiket(P, 'iliski:' + deger);
  else sahne.sayi(P, deger);
}

function satirCiz(durum, ayar, sahne, satir, i) {
  const { x, genislik } = durum.konum;
  const yukseklik = satirYuksekligi(durum);
  const y = durum.konum.y + i * yukseklik;
  const alt = y + yukseklik;
  const id = 'tablo:' + (satir.bolum === undefined ? '' : satir.bolum + ':') + i;
  const renk = satirDolu(satir, ayar) ? 'mavi' : 'gri';
  sahne.cokgen([{ x, y }, { x: x + genislik, y },
    { x: x + genislik, y: alt }, { x, y: alt }], { renk, id });
  const hucreGenislik = genislik / ayar.sutunlar.length;
  ayar.sutunlar.forEach((ad, j) => {
    const sol = x + j * hucreGenislik;
    if (j > 0) cizgi(sahne, { x: sol, y }, { x: sol, y: alt }, id + ':ayrim:s' + j);
    const P = { x: sol + hucreGenislik / 2, y: y + yukseklik / 2 };
    hucreCiz(sahne, P, ad, satir[ad], id + ':' + ad);
  });
}

function tabloCiz(durum, ayar, sahne) {
  sahne.katman('ust');
  durum.satirlar.forEach((satir, i) => satirCiz(durum, ayar, sahne, satir, i));
  const tutulan = durum.tutulan;
  if (tutulan?.P && tutulan.ad === 'ad') {
    const P = { x: tutulan.P.x, y: tutulan.P.y - sahne.pxToBirim(HAYALET_OFSET_PX) };
    sahne.hayalet(s => s.sayi(P, tutulan.deger));
  }
}

function nesneOlustur(durum, ayar) {
  return {
    get satirlar() { return durum.satirlar; },
    doluMu() { return durum.satirlar.every(satir => satirDolu(satir, ayar)); },
    karsilastir(gercek, tolAci) { return karsilastir(durum, ayar, gercek, tolAci); },
    ayniKartaKoy(bolumA, bolumB) {
      void bolumA;
      void bolumB;
      return false;
    },
    otomatikDoldur(i, veri) { otomatikDoldur(durum, ayar, i, veri); },
    ciz(sahne) { tabloCiz(durum, ayar, sahne); },
    girdi(olay) { return girdiyiIsle(durum, ayar, olay); },
    durum() {
      return { konum: { ...durum.konum }, satirlar: durum.satirlar.map(satir => ({ ...satir })) };
    },
    yukle(kayit) { durumuYukle(durum, kayit, ayar); }
  };
}

/** @param {AciTablosuAyar} ayar @param {{x:number,y:number,genislik:number}} konum
 * @returns {AciTablosu} */
export function aciTablosuOlustur(ayar, konum) {
  const secenek = ayarDogrula(ayar);
  const yer = konumKopyala(konum === undefined ? VARSAYILAN_KONUM : konum);
  return nesneOlustur({ konum: yer, satirlar: satirlariOlustur(secenek), tutulan: null }, secenek);
}
