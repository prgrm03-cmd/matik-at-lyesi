import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Linter } from 'eslint';

/** @param {string} kok @param {string} alt @returns {string[]} */
export function dosyalar(kok, alt = '') {
  let girdiler;
  try {
    girdiler = readdirSync(join(kok, alt), { withFileTypes: true });
  } catch (hata) {
    if (hata.code === 'ENOENT') return [];
    throw hata;
  }
  return girdiler.flatMap(girdi => {
    const yol = alt ? alt + '/' + girdi.name : girdi.name;
    if (['.git', 'node_modules'].includes(girdi.name) || yol === 'docs/check') return [];
    if (girdi.isDirectory()) return dosyalar(kok, yol);
    return girdi.isFile() ? [yol] : [];
  }).sort();
}

/** @param {string} url @returns {boolean} */
export function dogrudan(url) {
  return Boolean(process.argv[1] && url === pathToFileURL(resolve(process.argv[1])).href);
}

/** @param {string[]} bulgular @returns {void} */
export function raporla(bulgular) {
  for (const bulgu of bulgular) console.error(bulgu);
  if (bulgular.length) process.exitCode = 1;
}

/** @param {string} kaynak @returns {Object} ESTree, yorumlar ve konumlar. */
export function jsAgaci(kaynak) {
  let agac;
  const linter = new Linter();
  const kural = {
    create(baglam) {
      return { Program(dugum) { agac = baglam.sourceCode.ast || dugum; } };
    }
  };
  const iletiler = linter.verify(kaynak, {
    languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
    plugins: { agac: { rules: { oku: kural } } },
    rules: { 'agac/oku': 'error' }
  });
  if (!agac) throw new Error(iletiler.map(ileti => ileti.message).join('; '));
  return agac;
}
