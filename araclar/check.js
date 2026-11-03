import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dogrudan } from './checkOrtak.js';

/** §6.2 sırası; metin denetimi sema komutunun parçasıdır. */
export const KOMUTLAR = Object.freeze([
  'lint', 'yasak', 'sahiplik', 'satir', 'sema', 'imza', 'test', 'seed', 'boyut'
]);

function dalAdi(kok, ortam) {
  if (ortam.GITHUB_HEAD_REF) return ortam.GITHUB_HEAD_REF;
  if (ortam.GITHUB_REF_TYPE === 'branch' && ortam.GITHUB_REF_NAME) return ortam.GITHUB_REF_NAME;
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: kok, encoding: 'utf8' }).trim();
  } catch {
    return 'dal-yok';
  }
}

function ilkBulgular(sonuc) {
  const stdout = (sonuc.stdout || '').split(/\r?\n/);
  const stderr = (sonuc.stderr || '').split(/\r?\n/);
  const hatalar = stdout.filter(satir => /^\s*(not ok|error:|location:|failureType:)/.test(satir));
  const satirlar = sonuc.status === 0 ? stdout.concat(stderr) : stderr.concat(hatalar, stdout);
  const dolu = [...new Set(satirlar.map(satir => satir.trim()).filter(Boolean))];
  const ozet = dolu.filter(satir => /^# (tests|pass|fail|duration_ms) /.test(satir));
  const secilen = sonuc.status === 0 && ozet.length ? ozet : dolu;
  const bulgular = secilen.filter(satir => !satir.startsWith('>') && satir !== 'TAP version 13');
  if (sonuc.error) bulgular.unshift(sonuc.error.message);
  if (sonuc.signal) bulgular.unshift('Sinyal: ' + sonuc.signal);
  return bulgular.slice(0, 10);
}

function komutKos(komut, kok) {
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', '--silent', komut], {
      cwd: kok, encoding: 'utf8', timeout: 55000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
    });
}

/** @param {string} kok @param {Object} secenek @returns {Object} */
export function check(kok, secenek = {}) {
  const kos = secenek.kos || komutKos;
  const satirlar = [];
  const bas = Date.now();
  let kirmizi = 0;
  for (const komut of KOMUTLAR) {
    let sonuc;
    try { sonuc = kos(komut, kok); } catch (error) { sonuc = { status: 1, error }; }
    const gecti = sonuc.status === 0 && !sonuc.error && !sonuc.signal;
    if (!gecti) kirmizi++;
    const bulgular = ilkBulgular(sonuc).map(satir => satir.replace(/\x1b\[[0-9;]*m/g, ''));
    const ek = bulgular.length ? ' | ' + bulgular.join(' | ') : '';
    satirlar.push((gecti ? '✓' : '✗') + ' npm run ' + komut + ek);
  }
  const ad = secenek.dal || dalAdi(kok, secenek.ortam || process.env) || 'HEAD';
  const dal = ad.replace(/[^A-Za-z0-9._-]/g, '-');
  const tarih = secenek.tarih || new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const yol = join(kok, 'docs', 'check', dal + '-' + tarih + '.txt');
  mkdirSync(join(kok, 'docs', 'check'), { recursive: true });
  writeFileSync(yol, satirlar.join('\n') + '\n');
  return { satirlar, kirmizi, yol, sureMs: Date.now() - bas };
}

if (dogrudan(import.meta.url)) {
  const kok = resolve(process.argv[2] || fileURLToPath(new URL('../', import.meta.url)));
  const sonuc = check(kok);
  console.log(sonuc.satirlar.join('\n'));
  process.exitCode = sonuc.kirmizi;
}
