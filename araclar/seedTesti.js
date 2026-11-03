import { resolve, join, basename, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { kuruKos, ipucuTekrariniDene } from './kuruKos.js';
import { kuruDosyasiOku, kapsamOku, kodBul } from './kuruDosya.js';
import { dogrula } from './seedKurallari.js';
import { bekleyenMi } from '../motor/sahteKayit.js';

function hataEkle(ozet, id, seed, hata) {
  ozet.hata++;
  if (ozet.ilkHatalar.length < 10) {
    ozet.ilkHatalar.push({ id, seed, kod: hata.message, denetim: hata.denetim });
  }
}

function tohumuDene(birim, seed, ozet) {
  const { duzenek, veri, olaylar } = birim;
  try {
    const kosu = kuruKos(duzenek, veri, seed, { olaylar });
    ozet.sayi += kosu.kayit.sayac.sayi || 0;
    for (const id of kosu.gozlem.parametreDenetimsiz) {
      if (!ozet.parametreDenetimsiz.includes(id)) ozet.parametreDenetimsiz.push(id);
    }
    if (kosu.atlandi) { ozet.atlandi++; return; }
    ipucuTekrariniDene(duzenek, veri, seed);
    ozet.gecti++;
  } catch (hata) {
    if (bekleyenMi(hata)) ozet.atlandi++;
    else hataEkle(ozet, veri.id, seed, hata);
  }
}

/** @param {string} kok @param {string} [secilenId] @returns {Promise<Object>} */
export async function seedTesti(kok, secilenId) {
  const bas = performance.now();
  const ozet = {
    gecti: 0, atlandi: 0, hata: 0, sayi: 0, ilkHatalar: [], sureMs: 0,
    parametreDenetimsiz: []
  };
  if (secilenId !== undefined) {
    // Kimlik listesi dosyalardan gelir; yalnız kök dışına çıkan yolları engelle.
    dogrula(typeof secilenId === 'string' && secilenId.length > 0 &&
      !['.', '..'].includes(secilenId) && !secilenId.includes('\0') &&
      basename(secilenId) === secilenId && win32.basename(secilenId) === secilenId,
    'duzenekSecimi', 'DUZENEK_YOK');
  }
  const kapsam = secilenId === undefined ?
    await kapsamOku(join(kok, 'docs', 'kapsam.json')) : [secilenId];
  for (const id of kapsam) {
    const kod = kodBul(id);
    let birim;
    try {
      birim = await kuruDosyasiOku(join(kok, 'duzenekler', kod, kod + '.js'),
        join(kok, 'duzenekler', kod, id + '.json'));
      dogrula(birim.veri.id === id, 'varyantKimligi', 'SEMA_HATASI');
    } catch (hata) {
      hataEkle(ozet, id, null, hata);
      continue;
    }
    for (let seed = 1; seed <= 1000; seed++) tohumuDene(birim, seed, ozet);
  }
  ozet.sureMs = Math.round(performance.now() - bas);
  return ozet;
}

async function ana() {
  dogrula(process.argv.length <= 3, 'duzenekSecimi', 'CLI_ARGUMAN_GECERSIZ');
  const kok = fileURLToPath(new URL('../', import.meta.url));
  const ozet = await seedTesti(kok, process.argv[2]);
  for (const id of ozet.parametreDenetimsiz) {
    console.warn(JSON.stringify({ uyari: 'denetimsiz', id, denetim: 'parametreler' }));
  }
  console.log(JSON.stringify(ozet));
  if (ozet.hata > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  ana().catch(hata => {
    console.error(JSON.stringify({ hata: hata.message, denetim: hata.denetim }));
    process.exitCode = 1;
  });
}
