import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { kuruKos } from './kuruKos.js';
import { kuruDosyasiOku, seedOku } from './kuruDosya.js';
import { dogrula } from './seedKurallari.js';

/** @param {string[]} arg @returns {Promise<Object>} */
export async function kuruCalistir(arg) {
  dogrula(arg.length >= 3 && arg.slice(3).every(ad =>
    ['--tahta', '--dokum'].includes(ad)), 'kuruArguman', 'PARAMETRE_ARALIK_DISI');
  const seed = seedOku(arg[2]);
  const { duzenek, veri, olaylar } = await kuruDosyasiOku(arg[0], arg[1]);
  const sonuc = kuruKos(duzenek, veri, seed, { olaylar, tahta: arg.includes('--tahta') });
  if (arg.includes('--dokum')) {
    for (const cagri of sonuc.kayit.cagrilar) {
      console.log(JSON.stringify(cagri));
    }
  }
  console.log(JSON.stringify({ id: veri.id, seed, atlandi: sonuc.atlandi,
    sonuc: sonuc.sonuc, sayi: sonuc.kayit.sayac.sayi || 0 }));
  return sonuc;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  kuruCalistir(process.argv.slice(2)).catch(hata => {
    console.error(JSON.stringify({ hata: hata.message, denetim: hata.denetim }));
    process.exitCode = 1;
  });
}
