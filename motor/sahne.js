import { cizimHazirla, hedefHazirla } from './sahneCizim.js';
import { ilerle } from '../geo/index.js';

/**
 * @typedef {Object} Sahne
 * @property {number} genislik
 * @property {number} yukseklik
 * @property {number} olcek
 * @property {(px:number)=>number} pxToBirim
 * @property {(P:Nokta,secenek?:Object)=>void} pim
 * @property {(A:Nokta,B:Nokta,secenek?:CizgiSecenek)=>void} parca
 * @property {(A:Nokta,yon:number,secenek?:CizgiSecenek)=>void} isin
 * @property {(A:Nokta,yon:number,secenek?:CizgiSecenek)=>void} dogru
 * @property {(c:Cember,secenek?:Object)=>void} cember
 * @property {(y:Yay,secenek?:CizgiSecenek)=>void} yay
 * @property {(k:Nokta[],secenek?:Object)=>void} cokgen
 * @property {(merkez:Nokta,kol1:number,kol2:number,secenek?:Object)=>void} aciYayi
 * @property {(P:Nokta,anahtar:string,secenek?:Object)=>void} etiket
 * @property {(P:Nokta,deger:number|string)=>void} sayi
 * @property {(ad:string,kaynak:string,P:Nokta,secenek?:Object)=>void} gorsel
 * @property {(id:string,secenek?:{sure?:number})=>void} vurgula
 * @property {()=>void} vurguTemizle
 * @property {(cizici:(s:Sahne)=>void)=>void} hayalet
 * @property {(sayfa:'ust'|'alt')=>void} katman
 * @property {(dugme:Object)=>void} dugme
 * @property {()=>void} temizle
 */

/** @param {HTMLElement} kok @param {Veri} veri @param {Mod} mod @param {Object} sunum
 * @returns {Object} Motor içi çizim, yakalama ve yaşam döngüsü bağlantıları. */
export function sahneOlustur(kok, veri, mod, sunum) {
  const eleman = kok.querySelector('[data-sahne]');
  const dugmeler = kok.querySelector('[data-dugmeler]');
  const tezgah = kok.querySelector('[data-tezgah]');
  const kalem = eleman.getContext('2d');
  if (!kalem) throw new Error('IMZA_EKSIK');
  const d = { eleman, tezgah, dugmeler, kalem, veri, mod, sunum, olcek: 1, katman: 'alt',
    alfa: 1, hayalet: false, alt: [], ust: [], hedefler: new Map(), kimlikler: new Set(),
    vurgular: new Map(), dugmeHaritasi: new Map(), dugmeId: new Set(), resimler: new Map() };
  const sahne = apiOlustur(d);
  d.sahne = sahne;
  boyutlandir(d);
  const izleyici = new ResizeObserver(() => boyutlandir(d));
  izleyici.observe(tezgah);
  return { sahne, eleman, hedefler: d.hedefler,
    nokta: (x, y) => noktaCevir(d, x, y),
    boyutlandir: () => boyutlandir(d), bitir: () => bitir(d),
    kaldir: () => { izleyici.disconnect(); d.dugmeHaritasi.forEach(b => b.remove()); } };
}

function apiOlustur(d) {
  const s = { genislik: 1000, yukseklik: 1000, get olcek() { return d.olcek; },
    pxToBirim: px => px * d.olcek,
    pim: (P, secenek) => ekle(d, 'pim', [P, secenek]),
    parca: (A, B, secenek) => ekle(d, 'parca', [A, B, secenek]),
    isin: (A, yon, secenek) => ekle(d, 'isin', [A, yon, secenek]),
    dogru: (A, yon, secenek) => ekle(d, 'dogru', [A, yon, secenek]),
    cember: (c, secenek) => ekle(d, 'cember', [c, secenek]),
    yay: (y, secenek) => ekle(d, 'yay', [y, secenek]),
    cokgen: (k, secenek) => ekle(d, 'cokgen', [k, secenek]),
    aciYayi: (merkez, kol1, kol2, secenek) => ekle(d, 'aciYayi', [merkez, kol1, kol2, secenek]),
    etiket: (P, anahtar, secenek) => metinEkle(d, P, metinBul(d, anahtar), secenek),
    sayi: (P, deger) => { if (!d.veri.bayraklar.olcuKilidi) metinEkle(d, P, String(deger)); },
    gorsel: (ad, kaynak, P, secenek) => resimEkle(d, ad, kaynak, P, secenek),
    vurgula: (id, secenek) => {
      d.vurgular.set(id, performance.now() + (secenek?.sure ?? 1800));
    },
    vurguTemizle: () => d.vurgular.clear(),
    hayalet: cizici => hayaletCiz(d, cizici),
    katman: sayfa => { if (sayfa === 'alt' || sayfa === 'ust') d.katman = sayfa; },
    dugme: ayar => dugmeEkle(d, ayar),
    temizle: () => temizle(d) };
  return s;
}

function boyutlandir(d) {
  const sinir = d.tezgah.getBoundingClientRect();
  const genislik = Math.max(1, Math.min(sinir.width, sinir.height || sinir.width));
  d.eleman.style.width = String(genislik) + 'px';
  d.eleman.style.height = String(genislik) + 'px';
  const oran = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const fiziksel = Math.round(genislik * oran);
  if (d.eleman.width !== fiziksel || d.eleman.height !== fiziksel) {
    d.eleman.width = fiziksel;
    d.eleman.height = fiziksel;
  }
  d.olcek = 1000 / genislik;
}

function noktaCevir(d, x, y) {
  const sinir = d.eleman.getBoundingClientRect();
  return d.sunum.geri({ x: (x - sinir.left) * 1000 / Math.max(1, sinir.width),
    y: (y - sinir.top) * 1000 / Math.max(1, sinir.height) });
}

function temizle(d) {
  d.alt.length = 0;
  d.ust.length = 0;
  d.hedefler.clear();
  d.kimlikler.clear();
  d.dugmeId.clear();
  d.katman = 'alt';
  d.alfa = 1;
  d.hayalet = false;
}

function kimlikEkle(d, id) {
  if (!id || d.hayalet) return;
  if (d.kimlikler.has(id)) throw new Error('SAHNE_ID_CAKISMA');
  d.kimlikler.add(id);
}

function ekle(d, tur, arg) {
  const c = cizimHazirla(tur, arg, px => px * d.olcek);
  kimlikEkle(d, c.secenek.id);
  if (c.secenek.id && !d.hayalet) {
    d.hedefler.set(c.secenek.id, hedefHazirla(c, d.katman));
  }
  d[d.katman].push({ ...c, alfa: d.alfa });
}

function metinBul(d, anahtar) {
  const metin = d.veri.etiketler?.[anahtar];
  if (typeof metin !== 'string') throw new Error('MATIK_ANAHTAR_YOK');
  return metin;
}

function metinEkle(d, P, metin, secenek) {
  d[d.katman].push({ tur: 'metin', P: { ...P }, metin,
    secenek: secenek || {}, alfa: d.alfa });
}

function hayaletCiz(d, cizici) {
  const once = { alfa: d.alfa, hayalet: d.hayalet, katman: d.katman };
  d.alfa *= 0.35;
  d.hayalet = true;
  try { cizici(d.sahne); } finally { Object.assign(d, once); }
}

function dugmeEkle(d, ayar) {
  if (d.hayalet) return;
  kimlikEkle(d, ayar.id);
  const metin = metinBul(d, ayar.anahtar);
  let dugme = d.dugmeHaritasi.get(ayar.id);
  if (!dugme) {
    dugme = d.eleman.ownerDocument.createElement('button');
    dugme.type = 'button';
    dugme.dataset.dugmeId = ayar.id;
    d.dugmeler.append(dugme);
    d.dugmeHaritasi.set(ayar.id, dugme);
  }
  if (dugme.textContent !== metin) dugme.textContent = metin;
  dugme.setAttribute('aria-label', metin);
  dugme.dataset.konum = ayar.konum;
  dugme.disabled = ayar.etkin === false;
  d.dugmeId.add(ayar.id);
}

function resimEkle(d, ad, kaynak, P, secenek = {}) {
  if (!/^varlik\/[a-zA-Z0-9_./-]+\.(svg|png|webp)$/.test(kaynak) ||
      kaynak.split('/').includes('..')) throw new Error('PARAMETRE_ARALIK_DISI');
  kimlikEkle(d, ad);
  if (!d.resimler.has(kaynak)) {
    const resim = new Image();
    resim.src = new URL('../' + kaynak, import.meta.url).href;
    d.resimler.set(kaynak, resim);
  }
  const w = secenek.w ?? 64;
  const h = secenek.h ?? 64;
  if (!d.hayalet) {
    const yon = secenek.donus || 0;
    const X = ilerle(P, yon, 1);
    const Y = ilerle(P, yon + 90, 1);
    const vur = (Q, tol) =>
      Math.abs((Q.x - P.x) * (X.x - P.x) + (Q.y - P.y) * (X.y - P.y)) <= w / 2 + tol &&
      Math.abs((Q.x - P.x) * (Y.x - P.x) + (Q.y - P.y) * (Y.y - P.y)) <= h / 2 + tol;
    d.hedefler.set(ad, { id: ad, tur: 'gorsel', nokta: { ...P }, katman: d.katman, vur });
  }
  d[d.katman].push({ tur: 'gorsel', P: { ...P }, ad, resim: d.resimler.get(kaynak),
    secenek, w, h, alfa: d.alfa });
}

function bitir(d) {
  boyutlandir(d);
  const olcek = d.eleman.width / 1000;
  d.kalem.setTransform(olcek, 0, 0, olcek, 0, 0);
  d.kalem.clearRect(0, 0, 1000, 1000);
  d.kalem.fillStyle = d.sunum.zemin;
  d.kalem.fillRect(0, 0, 1000, 1000);
  for (const c of [...d.alt, ...d.ust]) ciz(d, c);
  for (const [id, bitis] of d.vurgular) {
    if (bitis <= performance.now()) d.vurgular.delete(id);
  }
  for (const [id, dugme] of d.dugmeHaritasi) {
    dugme.classList.toggle('vurgu', d.vurgular.has(id));
    if (!d.dugmeId.has(id)) { dugme.remove(); d.dugmeHaritasi.delete(id); }
  }
}

function ciz(d, c) {
  const k = d.kalem;
  k.save();
  k.globalAlpha = c.alfa;
  k.strokeStyle = d.sunum.renk(c.secenek.renk || 'mavi');
  k.fillStyle = k.strokeStyle;
  k.lineWidth = d.sunum.kalinlik(c.secenek.kalinlik || 'normal') * d.olcek;
  const vurgu = d.vurgular.has(c.secenek.id || c.ad);
  if (vurgu) {
    k.lineWidth *= 2;
    k.globalAlpha *= 0.6 + 0.4 * Math.sin(performance.now() / 130);
  }
  k.setLineDash(c.secenek.kesik ? [6 * d.olcek, 4 * d.olcek] : []);
  k.lineJoin = 'round';
  if (c.tur === 'metin') metinCiz(d, c);
  else if (c.tur === 'gorsel') resimCiz(d, c);
  else sekilCiz(d, c);
  k.restore();
}

function yol(d, noktalar, kapali) {
  const k = d.kalem;
  k.beginPath();
  noktalar.forEach((P, i) => {
    const Q = d.sunum.ileri(P);
    if (i === 0) k.moveTo(Q.x, Q.y);
    else k.lineTo(Q.x, Q.y);
  });
  if (kapali) k.closePath();
}

function sekilCiz(d, c) {
  yol(d, c.noktalar, c.kapali);
  if (c.dolgu) {
    d.kalem.save();
    if (c.tur !== 'pim') d.kalem.globalAlpha *= 0.18;
    d.kalem.fill();
    d.kalem.restore();
  }
  d.kalem.stroke();
  c.ek.forEach(noktalar => { yol(d, noktalar, false); d.kalem.stroke(); });
  if (c.secenek.ad && c.noktalar.length) {
    const P = c.merkez || c.noktalar[0];
    metinCiz(d, { P: { x: P.x + 12 * d.olcek, y: P.y - 12 * d.olcek },
      metin: c.secenek.ad, secenek: {} });
  }
}

function metinCiz(d, c) {
  const k = d.kalem;
  const P = d.sunum.ileri(c.P);
  const boyut = { kucuk: 12, normal: 16, buyuk: 22 }[c.secenek.boyut] || 16;
  k.font = String(boyut * d.olcek * d.mod.metinOlcek) + 'px sans-serif';
  k.fillStyle = d.sunum.metin;
  k.textBaseline = 'middle';
  k.fillText(c.metin, P.x, P.y);
}

function resimCiz(d, c) {
  if (!c.resim.complete || !c.resim.naturalWidth) return;
  const P = d.sunum.ileri(c.P);
  const yon = c.secenek.donus || 0;
  const X = d.sunum.ileri(ilerle(c.P, yon, 1));
  const Y = d.sunum.ileri(ilerle(c.P, yon + 90, 1));
  d.kalem.transform(X.x - P.x, X.y - P.y, Y.x - P.x, Y.y - P.y, P.x, P.y);
  d.kalem.drawImage(c.resim, -c.w / 2, -c.h / 2, c.w, c.h);
}
