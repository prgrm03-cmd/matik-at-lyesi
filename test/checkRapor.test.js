import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, KOMUTLAR } from '../araclar/check.js';

test('ilk kırmızıdan sonra dokuz komut sürer, rapor dokuz satırdır', () => {
  const kok = mkdtempSync(join(tmpdir(), 'matik-rapor-'));
  const cagrilar = [];
  try {
    const sonuc = check(kok, {
      dal: 'cx-m/K-04-check', tarih: '2026-11-03',
      kos(komut) {
        cagrilar.push(komut);
        const status = ['lint', 'sema'].includes(komut) ? 1 : 0;
        return { status, stdout: Array.from({ length: 12 }, (_, i) => 'bulgu' + i).join('\n') };
      }
    });
    assert.deepEqual(cagrilar, KOMUTLAR);
    assert.equal(sonuc.kirmizi, 2);
    const rapor = readFileSync(sonuc.yol, 'utf8').trim().split('\n');
    assert.equal(rapor.length, 9);
    assert.ok(rapor[0].startsWith('✗ npm run lint'));
    assert.ok(rapor[8].startsWith('✓ npm run boyut'));
    assert.ok(rapor.every(satir => satir.includes('bulgu9') && !satir.includes('bulgu10')));
    assert.equal(sonuc.yol, join(kok, 'docs/check/cx-m-K-04-check-2026-11-03.txt'));
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test('başlatılamayan ve zaman aşımına uğrayan komutlar kırmızıdır', () => {
  const kok = mkdtempSync(join(tmpdir(), 'matik-rapor-'));
  try {
    const sonuc = check(kok, {
      dal: 'main',
      kos(komut) {
        if (komut === 'lint') throw new Error('baslatilamadi');
        if (komut === 'yasak') return { status: null, signal: 'SIGTERM' };
        return { status: 0 };
      }
    });
    assert.equal(sonuc.kirmizi, 2);
    assert.equal(sonuc.satirlar.length, 9);
    assert.match(sonuc.satirlar[0], /baslatilamadi/);
    assert.match(sonuc.satirlar[1], /SIGTERM/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test('başarısız komutun stderr bulgusu uzun stdout içinde kaybolmaz', () => {
  const kok = mkdtempSync(join(tmpdir(), 'matik-rapor-'));
  try {
    const sonuc = check(kok, {
      dal: 'main',
      kos() {
        return {
          status: 1,
          stdout: Array.from({ length: 20 }, (_, i) => 'ok ' + i).join('\n'),
          stderr: 'ASIL_HATA'
        };
      }
    });
    assert.ok(sonuc.satirlar.every(satir => satir.includes('ASIL_HATA')));
  } finally { rmSync(kok, { recursive: true, force: true }); }
});
