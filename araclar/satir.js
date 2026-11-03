import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dosyalar, dogrudan, raporla } from './checkOrtak.js';
import { boyutDogrula } from './boyut.js';

/** Sondaki satır sonlandırıcısı hayali bir satır oluşturmaz. */
export function satirSayisi(metin) {
  if (!metin) return 0;
  const satirlar = metin.split(/\r\n|\r|\n/);
  return satirlar.length - (satirlar.at(-1) === '' ? 1 : 0);
}

/** §1 kaynak dosyaları: boş ve yorum satırları da 400 sınırına dahildir. */
export async function satirDogrula(kok = process.cwd()) {
  const hatalar = [];
  for (const yol of await dosyalar(kok)) {
    if (!/^(duzenekler|motor|geo|widget|defter)\/.*\.js$/.test(yol)) continue;
    const sayi = satirSayisi(await readFile(resolve(kok, yol), 'utf8'));
    if (sayi > 400) hatalar.push(yol + ': ' + sayi + ' > 400 satır');
  }
  hatalar.push(...(await boyutDogrula(kok)).hatalar);
  return hatalar;
}

if (dogrudan(import.meta.url)) {
  raporla(await satirDogrula(resolve(process.argv[2] || '.')));
}
