/** @param {Ctx} ctx @param {Object} duzenek @param {1|2|3} seviye @returns {void} */
export function ipucuUygula(ctx, duzenek, seviye) {
  if (ctx.mod.ipucuKapali) return;
  if (![1, 2, 3].includes(seviye)) throw new Error('PARAMETRE_ARALIK_DISI');
  ctx.sahne.vurguTemizle();
  const sonuc = duzenek.ipucu(ctx, seviye);
  if (seviye === 1) {
    for (const hedef of ctx.veri.ipucu[0].vurgu) ctx.sahne.vurgula(hedef);
  }
  if (seviye === 2 && sonuc?.anahtar !== 'i2') {
    if (sonuc?.anahtar) ctx.matik.soyle(sonuc.anahtar);
  }
}
