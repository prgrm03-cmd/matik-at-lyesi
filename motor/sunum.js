const RENKLER = Object.freeze({
  mavi: '#125c9c', turuncu: '#a84700', yesil: '#17633f',
  kirmizi: '#b32e39', gri: '#45515f', sari: '#806100'
});
const TAHTA_RENKLER = Object.freeze({
  mavi: '#8bcaff', turuncu: '#ffba7b', yesil: '#8ce6b0',
  kirmizi: '#ff9ca5', gri: '#dce5f0', sari: '#ffe28a'
});
const KALINLIKLAR = Object.freeze({ ince: 1.5, normal: 2.5, kalin: 4 });

/** @param {Mod} mod @param {boolean} [kontrast] @returns {Object} Sunum bağdaştırıcısı. */
export function sunumOlustur(mod, kontrast = true) {
  const koyu = mod.tahta && kontrast;
  const palet = koyu ? TAHTA_RENKLER : RENKLER;
  return Object.freeze({
    // K-02: dönüş ve ayna uygulanmaz; iki yön aynı koordinat sözleşmesini korur.
    ileri: noktaKopyala,
    geri: noktaKopyala,
    renk: (ad = 'mavi') => palet[ad] || palet.mavi,
    kalinlik: (ad = 'normal') => {
      const deger = KALINLIKLAR[ad] || KALINLIKLAR.normal;
      return mod.tahta ? deger * 1.5 : deger;
    },
    zemin: koyu ? '#132337' : '#fffdf5',
    metin: koyu ? '#f5f8fc' : '#182d43'
  });
}

function noktaKopyala(nokta) {
  return { x: nokta.x, y: nokta.y };
}
