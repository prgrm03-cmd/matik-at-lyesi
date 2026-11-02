import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIMLIKLER = Object.freeze([
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08',
  'D09a', 'D09b', 'D09c', 'D09d', 'D09e', 'D09f', 'D10a', 'D10b',
  'D11', 'D12', 'D12b', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18'
]);

function kodBul(id) {
  if (/^D09[a-f]$/.test(id)) return 'D09';
  if (/^D10[ab]$/.test(id)) return 'D10';
  return id;
}

/** @param {string} id @returns {Veri} Yalnız üretim betiğinin boş veri şablonu. */
export function iskeletVerisi(id) {
  if (!KIMLIKLER.includes(id)) throw new Error('DUZENEK_YOK');
  const robot = id.startsWith('D09');
  return {
    semaSurumu: '1.0', id, kod: kodBul(id), surum: '1.0.0',
    arac: robot ? 'C' : 'A', baslik: 'TODO-R1', zorluk: 1, sureDk: 0.5,
    kapsam: [robot ? '5.3.2' : '5.3.1'], turSayisi: 1,
    bayraklar: {
      olcuKilidi: false, kartSayisi: 0, tahminRafi: false, sinama: false,
      sensorSokme: false, aciolcerGorunur: robot, yanParca: false
    },
    matik: { giris: 'TODO-R1', basari: 'TODO-R1', tekrar: 'TODO-R1' },
    ipucu: [{ vurgu: [] }, { metin: 'TODO-R1' }, { ne: 'TODO-R1' }],
    nedenler: { tamam: 'TODO-R1' },
    parametreler: {},
    notlar: 'TODO-R1'
  };
}

async function dosyaOlustur(kok, veri) {
  const yol = resolve(kok, 'duzenekler', veri.kod, veri.id + '.json');
  await mkdir(dirname(yol), { recursive: true });
  try {
    await writeFile(yol, JSON.stringify(veri, null, 2) + '\n', { flag: 'wx' });
    return { id: veri.id, olustu: true };
  } catch (hata) {
    if (hata.code !== 'EEXIST') throw hata;
    return { id: veri.id, olustu: false };
  }
}

/** @param {string} kok @returns {Promise<{id:string,olustu:boolean}[]>} */
export async function iskeletOlustur(kok) {
  const sonuclar = [];
  // Açık kimlik listesi 25 dosyadır; sayı çelişkisi ve yer tutucular için ADT-006.
  for (const id of KIMLIKLER) sonuclar.push(await dosyaOlustur(kok, iskeletVerisi(id)));
  return sonuclar;
}

async function ana() {
  const kok = resolve(process.argv[2] || fileURLToPath(new URL('.', import.meta.url)));
  const sonuc = await iskeletOlustur(kok);
  console.log(JSON.stringify({
    toplam: sonuc.length,
    olustu: sonuc.filter(kayit => kayit.olustu).length,
    korundu: sonuc.filter(kayit => !kayit.olustu).length
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ana().catch(hata => {
    console.error(hata.message);
    process.exitCode = 1;
  });
}
