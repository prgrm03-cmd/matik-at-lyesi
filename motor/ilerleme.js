const ARACLAR = Object.freeze(['lazer', 'pergel', 'gonye', 'aciolcer', 'cetvel']);

/** @param {Kayit} kayit @param {Veri} veri @param {Mod} mod @returns {boolean} */
export function acikMi(kayit, veri, mod) {
  return mod.tahta || veri.id === 'D01' || kayit.ilerleme.aciklar.includes(veri.arac);
}

/** @param {Veri} veri @param {Rng} rng @param {Kayit} kayit @param {Mod} mod
 * @returns {Araclar}
 */
export function araclariHazirla(veri, rng, kayit, mod) {
  if (!kayit?.ilerleme) throw new Error('SEMA_HATASI');
  const kilitli = veri.bayraklar.olcuKilidi ? ['aciolcer', 'cetvel'] : [];
  const kemer = rng.karistir(ARACLAR);
  return { kemer, kilitli: mod.tahta && !veri.bayraklar.olcuKilidi ? [] : kilitli };
}

/** @param {Kayit} kayit @param {string} id
 * @returns {{tamam:boolean, yanParca:boolean}}
 */
export function yildizlar(kayit, id) {
  const onceki = kayit.duzenekler[id];
  return { tamam: onceki?.tamam === true, yanParca: onceki?.yanParca === true };
}
