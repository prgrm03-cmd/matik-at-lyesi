const SESLER = Object.freeze({
  tik: [660, 0.04], pat: [220, 0.09], carpma: [110, 0.12],
  alarm: [880, 0.2], dusme: [165, 0.15], lamba: [990, 0.12]
});

function tonuCal(baglam, ad) {
  const [frekans, sure] = SESLER[ad];
  const osilator = baglam.createOscillator();
  const kazanc = baglam.createGain();
  const zaman = baglam.currentTime;
  osilator.frequency.value = frekans;
  kazanc.gain.setValueAtTime(0.08, zaman);
  kazanc.gain.exponentialRampToValueAtTime(0.001, zaman + sure);
  osilator.connect(kazanc);
  kazanc.connect(baglam.destination);
  osilator.start(zaman);
  osilator.stop(zaman + sure);
  osilator.onended = () => { osilator.disconnect(); kazanc.disconnect(); };
}

/** @param {Mod} mod @param {{ses:boolean}} ayarlar @returns {Ses} */
export function sesOlustur(mod, ayarlar) {
  let baglam;
  return {
    cal(ad) {
      if (mod.tahta || !ayarlar.ses) return;
      if (!Object.prototype.hasOwnProperty.call(SESLER, ad)) {
        throw new Error('WIDGET_AYAR_GECERSIZ');
      }
      const SesBaglami = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!SesBaglami) return;
      try {
        baglam = baglam || new SesBaglami();
        const hazir = baglam.state === 'suspended' ? baglam.resume() : Promise.resolve();
        hazir.then(() => tonuCal(baglam, ad)).catch(() => {});
      } catch {
        // Ses izni yoksa etkileşim ve kayıt sürer.
      }
    }
  };
}
