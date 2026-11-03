/** @typedef {{kabulEdilen:string[], sensorler:string[],
 * cozucu:(kalan:Record<string,number>, kart:KuralKarti)=>
 * {tamam:boolean, doldurulan:string[], eksik:string[]}}} KisayolAyar */
/** @typedef {Object} KisayolYuvasi
 * @property {KuralKarti|null} kart
 * @property {(kart:KuralKarti)=>boolean} tak
 * @property {string[]} sokulen
 * @property {(sensor:string)=>void} sok
 * @property {(sensor:string)=>void} tak_sensor
 * @property {()=>{lamba:boolean, kurtarilan:number, eksik:string[]}} degerlendir
 */

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function dizgiDizisi(deger) {
  return Array.isArray(deger) && [...deger].every(ad => typeof ad === 'string');
}

function ayarDogrula(ayar, ortam) {
  if (!ortam?.rng || !ortam.sahne || typeof ortam.matik?.soyle !== 'function') gecersiz();
  if (!dizgiDizisi(ayar?.kabulEdilen) || !dizgiDizisi(ayar?.sensorler) ||
      typeof ayar?.cozucu !== 'function') gecersiz();
  return {
    kabulEdilen: [...ayar.kabulEdilen], sensorler: [...ayar.sensorler], cozucu: ayar.cozucu
  };
}

function degerlendir(ayar, kart, sokulen) {
  if (kart === null) return { lamba: false, kurtarilan: 0, eksik: [...sokulen] };
  const kalan = Object.fromEntries(ayar.sensorler.filter(ad => !sokulen.has(ad))
    .map(ad => [ad, 1]));
  const c = ayar.cozucu(kalan, kart);
  return { lamba: c.tamam, kurtarilan: c.doldurulan.length, eksik: [...c.eksik] };
}

/** @param {KisayolAyar} ayar @param {DefterOrtam} ortam @returns {KisayolYuvasi} */
export function kisayolYuvasiOlustur(ayar, ortam) {
  const ayarlar = ayarDogrula(ayar, ortam);
  const sokulen = new Set();
  let kart = null;
  return {
    get kart() { return kart; },
    tak(k) {
      if (!ayarlar.kabulEdilen.includes(k?.anahtar)) {
        ortam.matik.soyle('kartUymaz');
        return false;
      }
      kart = k;
      return true;
    },
    get sokulen() { return [...sokulen]; },
    sok(sensor) {
      if (!ayarlar.sensorler.includes(sensor)) gecersiz();
      sokulen.add(sensor);
    },
    tak_sensor(sensor) { sokulen.delete(sensor); },
    degerlendir() { return degerlendir(ayarlar, kart, sokulen); }
  };
}
