import { ilerle, yonAci, uzaklik } from './nokta.js';
import { aciFark } from './aci.js';
import { noktaDogruUzakligi } from './dogru.js';
import { kesisimDogruDogru } from './kesisim.js';
import { disBukeyMi, ucgenTuru } from './cokgen.js';
import { TOLERANS } from './tolerans.js';

const EPS = 1e-6;
const DENEME_SINIRI = 100;
const EN_AZ_ARALIK = 40;
const IZGARA_ADIM = 50;
const KENAR_TURLERI = ['cesitkenar', 'ikizkenar', 'eskenar'];
const ACI_TURLERI = ['dar', 'dik', 'genis'];
/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{koseler:Nokta[]}} Cokgen */
/** @typedef {{merkez:Nokta, r:number}} Cember */

function gecersiz() {
  throw new Error('PARAMETRE_ARALIK_DISI');
}

function noktaGecerli(P) {
  return P && Number.isFinite(P.x) && Number.isFinite(P.y);
}

/**
 * @param {Rng} rng @param {number[]} aralik
 * @param {{cirkin?:number, haric?:number[], adim?:number}} secenek @returns {number}
 */
export function rastgeleAci(rng, aralik, secenek) {
  if (secenek !== undefined && (!secenek || typeof secenek !== 'object' ||
      Array.isArray(secenek))) gecersiz();
  const { cirkin = 0.5, haric = [], adim = 1 } = secenek || {};
  if (!Array.isArray(aralik) || aralik.length !== 2 ||
      !aralik.every(Number.isSafeInteger) || aralik[0] > aralik[1] ||
      !Number.isSafeInteger(adim) || adim <= 0 || !Number.isFinite(cirkin) ||
      cirkin < 0 || cirkin > 1 || !Array.isArray(haric) ||
      !haric.every(Number.isFinite)) gecersiz();
  const guzel = [];
  const cirkinler = [];
  for (let d = aralik[0]; d <= aralik[1]; d += adim) {
    if (haric.some((onceki) => Math.abs(d - onceki) <= TOLERANS.tekrarKomsulugu)) continue;
    (d % 5 === 0 ? guzel : cirkinler).push(d);
    if (!Number.isSafeInteger(d + adim)) break;
  }
  const [secilen, diger] = rng.bool(cirkin) ? [cirkinler, guzel] : [guzel, cirkinler];
  if (secilen.length === 0 && diger.length === 0) gecersiz();
  return rng.sec(secilen.length ? secilen : diger);
}

/** @param {Rng} rng @returns {number} */
export function rastgeleYon(rng) {
  return rng.tam(0, 359);
}

/** @param {Rng} rng @returns {number} */
export function rastgeleEgim(rng) {
  return rng.bool() ? rng.tam(10, 80) : rng.tam(100, 170);
}

/** @param {Rng} rng @param {number} aci @returns {number} */
export function rastgeleKolUzunlugu(rng, aci) {
  if (!Number.isFinite(aci) || aci < 0 || aci > 360) gecersiz();
  const tuzak = rng.bool(0.4);
  if (tuzak && aci < 90) return rng.tam(260, 320);
  if (tuzak && aci > 90) return rng.tam(120, 180);
  return rng.tam(120, 320);
}

function kenarYonleri(c) {
  return c.koseler.map((P, i) => yonAci(P, c.koseler[(i + 1) % c.koseler.length]));
}

function kenarUzunluklari(c) {
  return c.koseler.map((P, i) => uzaklik(P, c.koseler[(i + 1) % c.koseler.length]));
}

function yatayTabanYok(c) {
  const kenarlar = kenarUzunluklari(c);
  const yon = kenarYonleri(c)[kenarlar.indexOf(Math.max(...kenarlar))];
  return Math.min(aciFark(yon, 0), aciFark(yon, 180)) > TOLERANS.aciOkuma;
}

function prototipYok(c) {
  return kenarYonleri(c).every((yon) =>
    [0, 90, 180, 270].every((eksen) => aciFark(yon, eksen) > TOLERANS.aciOkuma));
}

function cokgenAdayi(rng, n, merkez, yaricap) {
  const donme = rng.tam(0, 359);
  const sapma = Math.floor(360 / n * 0.2);
  const koseler = Array.from({ length: n }, (_, i) =>
    ilerle(merkez, donme + i * 360 / n + rng.tam(-sapma, sapma),
      yaricap * rng.tam(80, 120) / 100));
  return { koseler };
}

/**
 * @param {Rng} rng @param {number} n
 * @param {{merkez?:Nokta, yaricap?:number}} secenek @returns {Cokgen}
 */
export function rastgeleDisBukeyCokgen(rng, n, secenek) {
  if (secenek !== undefined && (!secenek || typeof secenek !== 'object' ||
      Array.isArray(secenek))) gecersiz();
  const { merkez = { x: 0, y: 0 }, yaricap = 160 } = secenek || {};
  if (!Number.isInteger(n) || n < 3 || n > 8 ||
      !noktaGecerli(merkez) || !Number.isFinite(yaricap) || yaricap <= 0) gecersiz();
  const taban = uzaklik(ilerle(merkez, 0, yaricap), ilerle(merkez, 360 / n, yaricap));
  for (let deneme = 0; deneme < DENEME_SINIRI; deneme++) {
    const c = cokgenAdayi(rng, n, merkez, yaricap);
    if (disBukeyMi(c) && yatayTabanYok(c) &&
        kenarUzunluklari(c).every((kenar) => kenar / taban >= 0.6 && kenar / taban <= 1.6)) {
      return c;
    }
  }
  return gecersiz();
}

function ucgenIstegi(rng, tur) {
  const kenarSecenekleri = tur.aci === 'dik' || tur.aci === 'genis' ?
    ['cesitkenar', 'ikizkenar'] : KENAR_TURLERI;
  const kenar = tur.kenar === undefined ? rng.sec(kenarSecenekleri) : tur.kenar;
  if (!KENAR_TURLERI.includes(kenar) ||
      (tur.aci !== undefined && !ACI_TURLERI.includes(tur.aci))) gecersiz();
  const aci = tur.aci === undefined ?
    (kenar === 'eskenar' ? 'dar' : rng.sec(ACI_TURLERI)) : tur.aci;
  if (kenar === 'eskenar' && aci !== 'dar') gecersiz();
  return { kenar, aci };
}

function ucgenAcilari(rng, tur) {
  if (tur.kenar === 'eskenar') return [60, 60, 60];
  const ikiz = tur.kenar === 'ikizkenar';
  if (tur.aci === 'dik') {
    const B = ikiz ? 45 : rng.tam(20, 70);
    return !ikiz && B === 45 ? null : [90, B, 90 - B];
  }
  if (tur.aci === 'genis') {
    const A = rng.tam(100, 140, ikiz ? 2 : 1);
    const B = ikiz ? (180 - A) / 2 : rng.tam(15, 180 - A - 15);
    const C = 180 - A - B;
    return !ikiz && Math.abs(B - C) < 5 ? null : [A, B, C];
  }
  if (ikiz) {
    const B = rng.tam(50, 80);
    return B === 60 ? null : [180 - 2 * B, B, B];
  }
  const A = rng.tam(20, 85);
  const B = rng.tam(20, 85);
  const C = 180 - A - B;
  const acilar = [A, B, C];
  return C < 20 || C > 89 ||
    acilar.some((aci, i) => acilar.some((diger, j) => i !== j && Math.abs(aci - diger) < 5)) ?
    null : acilar;
}

function ucgenKur(rng, acilar) {
  const B = { x: 0, y: 0 };
  const C = ilerle(B, 0, rng.tam(140, 260));
  const A = kesisimDogruDogru({ A: B, yon: -acilar[1] }, { A: C, yon: 180 + acilar[2] });
  if (!A || A === 'cakisik') gecersiz();
  const merkez = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  // A,C,B sırası y aşağı koordinatında saat yönündedir.
  return { koseler: [A, C, B].map((P) => ({ x: P.x - merkez.x, y: P.y - merkez.y })) };
}

function ucgenDondur(rng, c) {
  const merkez = { x: 0, y: 0 };
  for (let deneme = 0; deneme < DENEME_SINIRI; deneme++) {
    const donme = rng.tam(0, 359);
    const sonuc = { koseler: c.koseler.map((P) =>
      ilerle(merkez, yonAci(merkez, P) + donme, uzaklik(merkez, P))) };
    if (prototipYok(sonuc)) return sonuc;
  }
  return gecersiz();
}

/** @param {Rng} rng @param {{kenar?:string, aci?:string}} tur @returns {Cokgen} */
export function rastgeleUcgen(rng, tur) {
  if (tur !== undefined && (!tur || typeof tur !== 'object' || Array.isArray(tur))) gecersiz();
  const istek = ucgenIstegi(rng, tur || {});
  for (let deneme = 0; deneme < DENEME_SINIRI; deneme++) {
    const acilar = ucgenAcilari(rng, istek);
    if (!acilar) continue;
    const c = ucgenKur(rng, acilar);
    const gercek = ucgenTuru(kenarUzunluklari(c));
    if (gercek.kenar !== istek.kenar || gercek.aci !== istek.aci) continue;
    const sonuc = ucgenDondur(rng, c);
    const sonTur = ucgenTuru(kenarUzunluklari(sonuc));
    if (sonTur.kenar === istek.kenar && sonTur.aci === istek.aci) return sonuc;
  }
  return gecersiz();
}

/**
 * @param {Rng} rng @param {'cesitkenar'|'ikizkenar'|'eskenar'} tur
 * @returns {{r1:number, r2:number, AB:number}}
 */
export function kesisimGarantiliParametre(rng, tur) {
  if (!KENAR_TURLERI.includes(tur)) gecersiz();
  if (tur === 'eskenar') {
    const r = rng.tam(120, 320);
    return { r1: r, r2: r, AB: r };
  }
  for (let deneme = 0; deneme < DENEME_SINIRI; deneme++) {
    const r1 = rng.tam(120, 320);
    const r2 = tur === 'ikizkenar' ? r1 : rng.tam(120, 320);
    const eps = TOLERANS.kesisimEps * Math.min(r1, r2);
    const AB = rng.tam(Math.floor(Math.abs(r1 - r2) + eps) + 1, Math.ceil(r1 + r2 - eps) - 1);
    const esik = TOLERANS.uzunlukOran * Math.max(r1, r2, AB);
    if (Math.abs(AB - r1) <= esik || Math.abs(AB - r2) <= esik) continue;
    if (tur === 'cesitkenar' && Math.abs(r1 - r2) <= esik) continue;
    return { r1, r2, AB };
  }
  return gecersiz();
}

function izgaraCizgileri(min, max) {
  return Array.from({ length: (max - min) / IZGARA_ADIM + 1 }, (_, i) => min + i * IZGARA_ADIM);
}

function izgaraDisiNokta(rng) {
  return {
    x: rng.tamHaric(-300, 300, izgaraCizgileri(-300, 300), 7),
    y: rng.tamHaric(-200, 200, izgaraCizgileri(-200, 200), 7)
  };
}

/** @param {Rng} rng @returns {Cember} */
export function rastgeleCemberParametre(rng) {
  const merkez = izgaraDisiNokta(rng);
  return { merkez, r: rng.tam(120, 320) };
}

function izgaraDisindaMi(P) {
  return [P.x, P.y].every((deger) => {
    const kalan = ((deger % IZGARA_ADIM) + IZGARA_ADIM) % IZGARA_ADIM;
    return kalan > 7 + EPS && kalan < IZGARA_ADIM - 7 - EPS;
  });
}

function uzakNoktalar(noktalar) {
  return noktalar.every((P, i) =>
    noktalar.every((Q, j) => i === j || uzaklik(P, Q) >= EN_AZ_ARALIK));
}

function sensorUret(rng, adet) {
  for (let deneme = 0; deneme < DENEME_SINIRI; deneme++) {
    const A = izgaraDisiNokta(rng);
    const aday = izgaraDisiNokta(rng);
    const dx = Math.trunc((aday.x - A.x) / (adet - 1));
    const dy = Math.trunc((aday.y - A.y) / (adet - 1));
    const sensor = Array.from({ length: adet }, (_, i) => ({
      x: A.x + dx * i,
      y: A.y + dy * i
    }));
    if (sensor.every(izgaraDisindaMi) && uzakNoktalar(sensor)) return sensor;
  }
  return gecersiz();
}

function alarmUret(rng, sensor, adet) {
  const alarm = [];
  const d = { A: sensor[0], yon: yonAci(sensor[0], sensor[1]) };
  for (let deneme = 0; alarm.length < adet && deneme < DENEME_SINIRI; deneme++) {
    const P = izgaraDisiNokta(rng);
    if (noktaDogruUzakligi(P, d) >= EN_AZ_ARALIK &&
        uzakNoktalar([...sensor, ...alarm, P])) alarm.push(P);
  }
  if (alarm.length !== adet) gecersiz();
  return alarm;
}

/**
 * @param {Rng} rng
 * @returns {{mod:'parca'|'isin'|'dogru', sensor:Nokta[], alarm:Nokta[]}}
 */
export function lazerSenaryosu(rng) {
  const mod = rng.sec(['parca', 'isin', 'dogru']);
  const sensor = sensorUret(rng, rng.tam(2, 4));
  const alarm = alarmUret(rng, sensor, rng.tam(1, 2));
  return { mod, sensor, alarm };
}
