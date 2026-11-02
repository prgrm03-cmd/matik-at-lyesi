function animasyonuDogrula(animasyon) {
  if (!animasyon || typeof animasyon.kare !== 'function' ||
      typeof animasyon.bitti !== 'function' || !Number.isFinite(animasyon.sure) ||
      animasyon.sure < 0) {
    throw new Error('IMZA_EKSIK');
  }
}

function karePlanla(oturum, animasyon, bitir, reddet) {
  let baslangic;
  function kare(zaman) {
    if (!oturum.canli) return reddet(new Error('DUZENEK_YOK'));
    if (baslangic === undefined) baslangic = zaman;
    const t = Math.min(1, (zaman - baslangic) / animasyon.sure);
    try {
      animasyon.kare(t);
    } catch (hata) {
      reddet(hata);
      return;
    }
    if (t === 1) bitir();
    else oturum.animasyonKaresi = requestAnimationFrame(kare);
  }
  oturum.animasyonKaresi = requestAnimationFrame(kare);
}

/** @param {Object} oturum @param {Calistirma} animasyon @returns {Promise<void>} */
export function canlandir(oturum, animasyon) {
  animasyonuDogrula(animasyon);
  return new Promise((bitir, reddet) => {
    oturum.animasyonIptal = () => reddet(new Error('DUZENEK_YOK'));
    const azalt = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (azalt || animasyon.sure === 0) {
      animasyon.kare(1);
      bitir();
      return;
    }
    karePlanla(oturum, animasyon, bitir, reddet);
  }).finally(() => { oturum.animasyonIptal = null; });
}

/** @param {Object} oturum @returns {void} */
export function canlandirmayiDurdur(oturum) {
  cancelAnimationFrame(oturum.animasyonKaresi);
  oturum.animasyonIptal?.();
}
