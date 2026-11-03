import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dosyalar, dogrudan, raporla } from './checkOrtak.js';
import { rngOlustur } from '../motor/rng.js';
import { sahteSahneOlustur } from '../motor/sahteSahne.js';

export const IMZA_LISTESI = JSON.parse(
  readFileSync(new URL('./imzaListesi.json', import.meta.url), 'utf8')
);

function bolum(kaynak, bas, son) {
  return kaynak.slice(kaynak.indexOf(bas), kaynak.indexOf(son));
}

/** §3.2 ve §4.1'in açık export satırlarından ad ve parametre sayısını üretir. */
export function disarimlariAyikla(kaynak) {
  const sonuc = {};
  for (const eslesme of kaynak.matchAll(/export function (\w+)\(([^)]*)\)/g)) {
    const [, ad, parametreler] = eslesme;
    sonuc[ad] = parametreler.trim() ? parametreler.split(',').length : 0;
  }
  for (const [, ad] of kaynak.matchAll(/export const (\w+)/g)) {
    sonuc[ad] = ad === 'TOLERANS' ? 'object' : 'string';
  }
  return sonuc;
}

function parametreSayisi(metin) {
  if (!metin.trim()) return 0;
  let derinlik = 0;
  let sayi = 1;
  for (const harf of metin) {
    if ('([{<'.includes(harf)) derinlik++;
    if (')]}>' .includes(harf)) derinlik--;
    if (harf === ',' && derinlik === 0) sayi++;
  }
  return sayi;
}

/** JSDoc'taki iç içe nesne türleri virgülle bölünmez. */
export function arayuzleriAyikla(kaynak) {
  const sonuc = {};
  let arayuz;
  for (const satir of bolum(kaynak, '### 3.3', '### 3.5').split('\n')) {
    const tip = satir.match(/@typedef \{Object\} (\w+)/);
    if (tip) {
      arayuz = tip[1];
      sonuc[arayuz] = {};
    }
    const islev = satir.match(/@property \{\((.*)\)=>.*\}\s+(\w+)/);
    if (arayuz && islev) sonuc[arayuz][islev[2]] = parametreSayisi(islev[1]);
    if (satir.includes('*/')) arayuz = undefined;
  }
  for (const ad of ['Aciolcer', 'AciTablosu', 'Pergel', 'Gonye', 'Lazer']) {
    Object.assign(sonuc[ad], { ciz: 1, girdi: 1, durum: 0, yukle: 1 });
  }
  return sonuc;
}

function ayniListe(a, b) {
  const sirala = nesne => Object.entries(nesne).sort(([x], [y]) => x.localeCompare(y));
  return JSON.stringify(sirala(a)) === JSON.stringify(sirala(b));
}

/** İmza kaynağı değiştirilirse eski JSON sessizce doğru kabul edilmez. */
export function kaynakDogrula(kaynak, liste = IMZA_LISTESI) {
  const hatalar = [];
  if (liste.sozlesmeSurumu !== '1.0-taslak') hatalar.push('İmza sözleşme sürümü farklı.');
  const geo = disarimlariAyikla(bolum(kaynak, '### 3.2', '### 3.3'));
  const duzenek = disarimlariAyikla(bolum(kaynak, '### 4.1', '### 4.2'));
  if (!ayniListe(geo, liste.geo)) hatalar.push('İmza listesi §3.2 ile eşleşmiyor.');
  if (!ayniListe(duzenek, liste.duzenek)) hatalar.push('İmza listesi §4.1 ile eşleşmiyor.');
  for (const [ad, islevler] of Object.entries(arayuzleriAyikla(kaynak))) {
    const kayit = Object.fromEntries(Object.entries(liste.arayuzler[ad] || {})
      .filter(([, deger]) => typeof deger === 'number'));
    if (!ayniListe(islevler, kayit)) hatalar.push('İmza arayüzü kaynaktan farklı: ' + ad);
  }
  return hatalar;
}

function turUygun(deger, tur) {
  if (typeof tur === 'number') return typeof deger === 'function' && deger.length === tur;
  if (tur === 'array') return Array.isArray(deger);
  if (tur === 'object|null') return deger === null || turUygun(deger, 'object');
  if (tur === 'object') return deger !== null && typeof deger === 'object';
  return typeof deger === tur;
}

export function nesneDogrula(nesne, liste, yol) {
  const hatalar = [];
  for (const ad of Object.keys(nesne)) {
    if (!Object.hasOwn(liste, ad)) hatalar.push(yol + ': fazla dışa aktarım/üye ' + ad);
  }
  for (const [ad, beklenen] of Object.entries(liste)) {
    if (!Object.hasOwn(nesne, ad)) hatalar.push(yol + ': eksik dışa aktarım/üye ' + ad);
    else if (!turUygun(nesne[ad], beklenen)) {
      const detay = typeof beklenen === 'number' ? 'length=' + beklenen : beklenen;
      hatalar.push(yol + ': ' + ad + ' imzası ' + detay + ' olmalı');
    }
  }
  return hatalar;
}

async function modulOku(kok, yol, liste, hatalar) {
  try {
    const url = pathToFileURL(resolve(kok, yol));
    url.searchParams.set('imza', String(Date.now()));
    const modul = await import(url.href);
    hatalar.push(...nesneDogrula(modul, liste, yol));
    return modul;
  } catch (hata) {
    hatalar.push(yol + ': import başarısız: ' + hata.message);
    return null;
  }
}

const ORTAM_ISARETLERI = {
  birim: () => px => px,
  rng: () => rngOlustur(1),
  sahne: () => sahteSahneOlustur({}).sahne,
  matik: () => ({ soyle() {} }),
  arayuz: () => ({ defterAc() {}, defterKapat() {} }),
  kayit: () => () => {},
  kalip: () => 'kalip'
};

function argumanlariHazirla(tanim) {
  return (tanim.argumanlar || []).map(arg => {
    if (!arg || typeof arg !== 'object' || Array.isArray(arg)) return arg;
    const sonuc = { ...arg };
    for (const [ad, deger] of Object.entries(sonuc)) {
      if (typeof deger === 'string' && Object.hasOwn(ORTAM_ISARETLERI, deger)) {
        sonuc[ad] = ORTAM_ISARETLERI[deger]();
      }
    }
    return sonuc;
  });
}

function arayuzDogrula(nesne, tanim, liste) {
  const yol = tanim.yol + ':' + tanim.arayuz;
  const arayuz = liste.arayuzler[tanim.arayuz];
  if (typeof arayuz === 'number') {
    return turUygun(nesne, arayuz) ? [] : [yol + ': length=' + arayuz];
  }
  return nesneDogrula(nesne, { ...arayuz, ...tanim.ekUyeler }, yol);
}

async function aracDogrula(kok, tanim, liste, sonuc) {
  const { yol, disarim, fabrika } = tanim;
  if (!existsSync(resolve(kok, yol))) {
    sonuc.uyarilar.push(yol + ': bekleniyor');
    return;
  }
  if (!disarim) {
    sonuc.hatalar.push(yol + ': modül export eşlemesi için ADT gerekli');
    return;
  }
  const modul = await modulOku(kok, yol, disarim, sonuc.hatalar);
  if (!modul || typeof modul[fabrika] !== 'function') return;
  try {
    const nesne = modul[fabrika](...argumanlariHazirla(tanim));
    sonuc.hatalar.push(...arayuzDogrula(nesne, tanim, liste));
  } catch (hata) {
    sonuc.hatalar.push(yol + ': fabrika arayüzü okunamadı: ' + hata.message);
  }
}

function sozlesmeOku(kok) {
  const yollar = ['sozlesme.md', 'docs/sozlesme_v1.md'];
  const yol = yollar.find(ad => existsSync(resolve(kok, ad)));
  if (!yol) throw new Error('Sözleşme dosyası bulunamadı.');
  return readFileSync(resolve(kok, yol), 'utf8');
}

export async function imzaDogrula(kok = process.cwd(), liste = IMZA_LISTESI) {
  const sonuc = { hatalar: [], uyarilar: [] };
  try {
    sonuc.hatalar.push(...kaynakDogrula(sozlesmeOku(kok), liste));
    const yollar = await dosyalar(kok);
    await modulOku(kok, 'geo/index.js', liste.geo, sonuc.hatalar);
    for (const yol of yollar.filter(ad => /^duzenekler\/.*\.js$/.test(ad))) {
      await modulOku(kok, yol, liste.duzenek, sonuc.hatalar);
    }
    for (const tanim of liste.moduller) await aracDogrula(kok, tanim, liste, sonuc);
    const bilinen = new Set(liste.moduller.map(tanim => tanim.yol));
    for (const yol of yollar.filter(ad => /^(widget|defter)\/.*\.js$/.test(ad))) {
      if (!bilinen.has(yol)) sonuc.hatalar.push(yol + ': imza listesinde olmayan modül');
    }
  } catch (hata) {
    sonuc.hatalar.push('İmza denetimi: ' + hata.message);
  }
  return sonuc;
}

if (dogrudan(import.meta.url)) {
  const sonuc = await imzaDogrula(process.argv[2] || process.cwd());
  for (const uyari of sonuc.uyarilar) console.warn('⚠ ' + uyari);
  if (!sonuc.hatalar.length) console.log('İmza: tüm mevcut dışa aktarımlar geçerli.');
  raporla(sonuc.hatalar);
}
