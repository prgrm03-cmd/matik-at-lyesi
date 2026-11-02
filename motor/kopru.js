const TURLER = Object.freeze(['hazir', 'duzenekAcildi', 'tamamlandi', 'boyut']);
const DUZENEK = /^D(0[1-9]|1[0-8])[a-f]?$/;

function iletiOlustur(tur, alanlar) {
  const ileti = { kaynak: 'matik', tur };
  if (typeof alanlar.id === 'string' && DUZENEK.test(alanlar.id)) ileti.id = alanlar.id;
  if (Number.isInteger(alanlar.seed) && alanlar.seed >= 0 && alanlar.seed <= 4294967295) {
    ileti.seed = alanlar.seed;
  }
  if (typeof alanlar.tamam === 'boolean') ileti.tamam = alanlar.tamam;
  if (typeof alanlar.yanParca === 'boolean') ileti.yanParca = alanlar.yanParca;
  if (Number.isFinite(alanlar.yukseklikPx) && alanlar.yukseklikPx >= 0) {
    ileti.yukseklikPx = Math.ceil(alanlar.yukseklikPx);
  }
  return ileti;
}

/** @param {'hazir'|'duzenekAcildi'|'tamamlandi'|'boyut'} tur
 * @param {Object} [alanlar] @returns {void}
 */
export function kopruGonder(tur, alanlar = {}) {
  if (!TURLER.includes(tur) || typeof document === 'undefined') return;
  if (!document.referrer || typeof window === 'undefined') return;
  try {
    const hedef = new URL(document.referrer);
    if (!['http:', 'https:'].includes(hedef.protocol)) return;
    window.parent.postMessage(iletiOlustur(tur, alanlar), hedef.origin);
  } catch {
    // Gömme kısıtı uygulamanın çalışmasını durdurmaz.
  }
}
