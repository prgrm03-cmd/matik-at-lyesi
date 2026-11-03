import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dosyalar, dogrudan, raporla } from './checkOrtak.js';

/** §1/6.4 ve PNG üst sınırları, ondalık kB/MB. */
export const SINIRLAR = Object.freeze({
  json: 12000,
  kuru: 2000,
  varlik: 1200000,
  ilkYukleme: 2000000,
  png: 100000
});

/** §1: düzenekler tembel yüklenir; main giriş kümesine dahildir. */
export function ilkYuklemeMi(yol) {
  return ['index.html', 'main.js'].includes(yol) ||
    /^(motor|geo|widget|defter|stil)\//.test(yol) ||
    yol.startsWith('varlik/matik/');
}

/** SI birimleriyle ham dosya boyutlarını ve bütün üst sınırları denetler. */
export async function boyutDogrula(kok = process.cwd()) {
  const sonuc = { hatalar: [], ilkYukleme: 0, varlik: 0, duzenekJson: 0 };
  for (const yol of await dosyalar(kok)) {
    const boyut = (await stat(resolve(kok, yol))).size;
    if (ilkYuklemeMi(yol)) sonuc.ilkYukleme += boyut;
    if (yol.startsWith('varlik/')) sonuc.varlik += boyut;
    if (/^duzenekler\/.*\.json$/.test(yol)) {
      const sinir = yol.endsWith('.kuru.json') ? SINIRLAR.kuru : SINIRLAR.json;
      sonuc.duzenekJson += boyut;
      if (boyut > sinir) sonuc.hatalar.push(yol + ': ' + boyut + ' > ' + sinir + ' bayt');
    }
    if (/^varlik\/.*\.png$/i.test(yol) && boyut > SINIRLAR.png) {
      sonuc.hatalar.push(yol + ': PNG ' + boyut + ' > ' + SINIRLAR.png + ' bayt');
    }
  }
  for (const ad of ['ilkYukleme', 'varlik']) {
    if (sonuc[ad] > SINIRLAR[ad]) {
      sonuc.hatalar.push(ad + ': ' + sonuc[ad] + ' > ' + SINIRLAR[ad] + ' bayt');
    }
  }
  return sonuc;
}

if (dogrudan(import.meta.url)) {
  const sonuc = await boyutDogrula(resolve(process.argv[2] || '.'));
  console.log('ilkYukleme=' + sonuc.ilkYukleme + '; varlik=' + sonuc.varlik + ' bayt');
  raporla(sonuc.hatalar);
}
