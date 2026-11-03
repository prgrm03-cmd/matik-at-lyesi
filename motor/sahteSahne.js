const CIZIMLER = Object.freeze([
  'pim', 'parca', 'isin', 'dogru', 'cember', 'yay', 'cokgen', 'aciYayi',
  'sayi', 'gorsel', 'vurgula', 'vurguTemizle', 'katman', 'temizle'
]);

function kopyala(deger) {
  if (Array.isArray(deger)) return deger.map(kopyala);
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).map(([ad, alt]) => [ad, kopyala(alt)]));
  }
  return deger;
}

function anahtariDogrula(veri, anahtar) {
  if (!Object.prototype.hasOwnProperty.call(veri.etiketler || {}, anahtar) ||
      typeof veri.etiketler[anahtar] !== 'string') {
    throw new Error('MATIK_ANAHTAR_YOK');
  }
}

/** @param {Veri} veri @returns {Object} Motor içi çizimsiz Sahne ve kayıt defteri. */
export function sahteSahneOlustur(veri) {
  const kayit = { cagrilar: [], sayac: { sayi: 0 } };
  const yaz = (ad, arg) => {
    kayit.cagrilar.push({ ad, arg: arg.map(kopyala) });
    kayit.sayac[ad] = (kayit.sayac[ad] || 0) + 1;
  };
  const sahne = { genislik: 1000, yukseklik: 1000, olcek: 1 };
  for (const ad of CIZIMLER) sahne[ad] = (...arg) => yaz(ad, arg);
  sahne.pxToBirim = (px) => { yaz('pxToBirim', [px]); return px * sahne.olcek; };
  sahne.etiket = (P, anahtar, secenek) => {
    yaz('etiket', [P, anahtar, secenek]);
    anahtariDogrula(veri, anahtar);
  };
  sahne.dugme = (dugme) => {
    yaz('dugme', [dugme]);
    anahtariDogrula(veri, dugme.anahtar);
  };
  sahne.hayalet = (cizici) => {
    yaz('hayalet', [cizici]);
    cizici(sahne);
  };
  return { sahne, kayit };
}
