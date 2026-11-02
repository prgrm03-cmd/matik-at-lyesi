const SEMBOLLER = Object.freeze(['[AB]', '[AB', 'AB', '|AB|', '⊥', '//', 'm(ABC)', 'r', '°']);

/** @param {(metin:string)=>void} goster @returns {Sembol} */
export function sembolOlustur(goster) {
  return {
    goster(sembol, A, B) {
      const adlar = [A, B];
      if (adlar.some((ad) => ad !== undefined && !/^[A-Z]$/.test(ad))) {
        throw new Error('WIDGET_AYAR_GECERSIZ');
      }
      const cift = (A || 'A') + (B || 'B');
      const kaliplar = { parca: '[' + cift + ']', isin: '[' + cift, dogru: cift };
      const kalip = Object.prototype.hasOwnProperty.call(kaliplar, sembol);
      const metin = kalip ? kaliplar[sembol] : (SEMBOLLER.includes(sembol) ? sembol : null);
      if (metin === null) throw new Error('WIDGET_AYAR_GECERSIZ');
      goster(metin);
    },
    temizle() { goster(''); }
  };
}
