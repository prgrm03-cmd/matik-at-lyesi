const DUZENEK = /^D(0[1-9]|1[0-8])[a-f]?$/;
const KOD = /^D(0[1-9]|1[0-8])b?$/;
const ZORUNLU = Object.freeze([
  'semaSurumu', 'id', 'kod', 'surum', 'arac', 'baslik', 'zorluk', 'sureDk',
  'kapsam', 'bayraklar', 'matik', 'ipucu', 'nedenler', 'parametreler', 'turSayisi'
]);
const IMZALAR = Object.freeze({
  kur: 2, ciz: 1, girdi: 2, calistir: 1, basari: 1, ipucu: 2, tahta: 2
});

function nesneMi(deger) {
  return deger !== null && typeof deger === 'object' && !Array.isArray(deger);
}

function zorunluDogrula(nesne, anahtarlar) {
  if (!nesneMi(nesne) || anahtarlar.some(ad => !Object.prototype.hasOwnProperty.call(nesne, ad))) {
    throw new Error('SEMA_HATASI');
  }
}

function veriDogrula(veri, id) {
  zorunluDogrula(veri, ZORUNLU);
  if (veri.semaSurumu !== '1.0' || veri.id !== id || !KOD.test(veri.kod)) {
    throw new Error('SEMA_HATASI');
  }
  if (!/^\d+\.\d+\.\d+$/.test(veri.surum)) throw new Error('SEMA_HATASI');
  if (!Number.isInteger(veri.turSayisi) || veri.turSayisi < 1 || veri.turSayisi > 6) {
    throw new Error('SEMA_HATASI');
  }
  zorunluDogrula(veri.bayraklar, [
    'olcuKilidi', 'kartSayisi', 'tahminRafi', 'sinama', 'sensorSokme', 'aciolcerGorunur'
  ]);
  zorunluDogrula(veri.matik, ['giris', 'basari', 'tekrar']);
  zorunluDogrula(veri.nedenler, ['tamam']);
  if (!Array.isArray(veri.ipucu) || veri.ipucu.length !== 3) {
    throw new Error('SEMA_HATASI');
  }
  veri.ipucu.forEach((ipucu, i) => zorunluDogrula(ipucu, [['vurgu'], ['metin'], ['ne']][i]));
}

function dondur(nesne) {
  if (nesne && typeof nesne === 'object' && !Object.isFrozen(nesne)) {
    Object.values(nesne).forEach(dondur);
    Object.freeze(nesne);
  }
  return nesne;
}

function imzaDogrula(duzenek, veri) {
  const adlar = Object.keys(duzenek);
  const beklenen = ['id', 'surum', ...Object.keys(IMZALAR)];
  const eksik = beklenen.some(ad => !adlar.includes(ad));
  const bozuk = Object.entries(IMZALAR).some(([ad, sayi]) => {
    return typeof duzenek[ad] !== 'function' || duzenek[ad].length !== sayi;
  });
  if (adlar.length !== 9 || eksik || bozuk || duzenek.id !== veri.kod) {
    throw new Error('IMZA_EKSIK');
  }
  if (duzenek.surum !== veri.surum) throw new Error('SEMA_HATASI');
}

async function jsonOku(yol) {
  let yanit;
  try {
    yanit = await fetch(new URL(yol, import.meta.url));
  } catch {
    throw new Error('DUZENEK_YOK');
  }
  if (!yanit.ok) throw new Error('DUZENEK_YOK');
  try {
    return await yanit.json();
  } catch {
    throw new Error('SEMA_HATASI');
  }
}

/** @returns {Promise<string[]>} */
export async function kapsamOku() {
  const kapsam = await jsonOku('../docs/kapsam.json');
  if (!Array.isArray(kapsam) || kapsam.some(id => typeof id !== 'string' || !DUZENEK.test(id))) {
    throw new Error('SEMA_HATASI');
  }
  return [...new Set(kapsam)];
}

function klasorBul(id) {
  if (/^D09[a-f]$/.test(id)) return 'D09';
  if (/^D10[ab]$/.test(id)) return 'D10';
  return id;
}

/** @param {string} id @returns {Promise<Veri>} */
export async function veriOku(id) {
  if (typeof id !== 'string' || !DUZENEK.test(id)) throw new Error('DUZENEK_YOK');
  const kapsam = await kapsamOku();
  if (!kapsam.includes(id)) throw new Error('DUZENEK_YOK');
  const klasor = klasorBul(id);
  const veri = await jsonOku('../duzenekler/' + klasor + '/' + id + '.json');
  veriDogrula(veri, id);
  if (veri.kod !== klasor) throw new Error('SEMA_HATASI');
  return dondur(veri);
}

/** @param {string} id @returns {Promise<{duzenek:Object, veri:Veri}>} */
export async function yukle(id) {
  const veri = await veriOku(id);
  let duzenek;
  try {
    duzenek = await import('../duzenekler/' + veri.kod + '/' + veri.kod + '.js');
  } catch {
    throw new Error('DUZENEK_YOK');
  }
  imzaDogrula(duzenek, veri);
  return { duzenek, veri: dondur(veri) };
}
