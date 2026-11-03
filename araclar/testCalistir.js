import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 20 glob açmaz; Node 22+ dizin yerine açık test dosyaları alır.
function testDosyalari(dizin) {
  return readdirSync(dizin, { withFileTypes: true }).flatMap(girdi => {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) return testDosyalari(yol);
    return girdi.isFile() && girdi.name.endsWith('.js') ? [yol] : [];
  }).sort();
}

const kok = fileURLToPath(new URL('../', import.meta.url));
const dosyalar = testDosyalari(join(kok, 'test'));
if (dosyalar.length === 0) throw new Error('Test dizininde JavaScript dosyası bulunamadı.');

const sonuc = spawnSync(process.execPath, ['--test', ...dosyalar], {
  cwd: kok, stdio: 'inherit'
});
if (sonuc.error) console.error(sonuc.error.message);
if (sonuc.signal) console.error('Test süreci sinyalle sonlandı: ' + sonuc.signal);
process.exit(sonuc.status ?? 1);
