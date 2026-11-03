import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cizimHazirla } from '../motor/sahneCizim.js';
import { ilerle, uzaklik } from '../geo/index.js';

const MERKEZ = Object.freeze({ x: 500, y: 500 });

function yakin(gercek, beklenen) {
  assert.ok(uzaklik(gercek, beklenen) < 1e-9, JSON.stringify({ gercek, beklenen }));
}

function yay(bas, bit, yon) {
  return cizimHazirla('yay', [{ merkez: MERKEZ, r: 240, bas, bit, yon }, {}], px => px);
}

describe('cizimHazirla yay (#11)', () => {
  it('sayısal 0–180 açılarıyla her iki yönde yarım daire hazırlar', () => {
    for (const yon of ['saat', 'ters']) {
      const c = yay(0, 180, yon);
      assert.equal(c.noktalar.length, 37);
      yakin(c.noktalar[0], { x: 740, y: 500 });
      yakin(c.noktalar[18], { x: 500, y: yon === 'saat' ? 740 : 260 });
      yakin(c.noktalar.at(-1), { x: 260, y: 500 });
      for (const P of c.noktalar) assert.ok(Math.abs(uzaklik(P, MERKEZ) - 240) < 1e-9);
      assert.equal(c.kapali, false);
      assert.equal(c.dolgu, false);
    }
  });

  it('dar ve geniş yayları yönüne göre seçer ve sıfır sınırını aşar', () => {
    const ornekler = [
      [30, 150, 'saat', 120], [30, 150, 'ters', 240],
      [350, 10, 'saat', 20], [350, 10, 'ters', 340],
      [-10, 370, 'saat', 20], [10, 350, 'ters', 20]
    ];
    for (const [bas, bit, yon, aci] of ornekler) {
      const c = yay(bas, bit, yon);
      assert.equal(c.noktalar.length, aci / 5 + 1);
      yakin(c.noktalar[0], ilerle(MERKEZ, bas, 240));
      yakin(c.noktalar.at(-1), ilerle(MERKEZ, bit, 240));
      const orta = bas + (yon === 'saat' ? 1 : -1) * aci / 2;
      yakin(c.noktalar[(c.noktalar.length - 1) / 2], ilerle(MERKEZ, orta, 240));
    }
  });

  it('aynı doğrultudaki uçları tam çembere dönüştürmez', () => {
    for (const yon of ['saat', 'ters']) {
      const c = yay(10, 370, yon);
      assert.equal(c.noktalar.length, 2);
      yakin(c.noktalar[0], c.noktalar[1]);
    }
  });

  it('geçersiz açı ve yönleri reddeder', () => {
    for (const [bas, bit, yon] of [
      [NaN, 180, 'saat'], [0, Infinity, 'ters'], ['0', 180, 'saat'], [0, 180, 'yan']
    ]) {
      assert.throws(() => yay(bas, bit, yon), { message: 'PARAMETRE_ARALIK_DISI' });
    }
  });
});

describe('cizimHazirla aciYayi (#11)', () => {
  it('sayısal kollar arasında her iki yöndeki küçük yayı hazırlar', () => {
    for (const [bas, bit, yon] of [[350, 10, 'saat'], [10, 350, 'ters']]) {
      const c = cizimHazirla('aciYayi', [MERKEZ, bas, bit, { r: 100 }], px => px);
      assert.equal(c.yay.yon, yon);
      assert.equal(c.noktalar.length, 5);
      yakin(c.noktalar[0], ilerle(MERKEZ, bas, 100));
      yakin(c.noktalar[2], { x: 600, y: 500 });
      yakin(c.noktalar.at(-1), ilerle(MERKEZ, bit, 100));
    }
  });

  it('dik açıyı köşeli işaretle ve ölçeğe bağlı yarıçapla hazırlar', () => {
    for (const [bas, bit] of [[0, 90], [90, 0]]) {
      const c = cizimHazirla('aciYayi', [MERKEZ, bas, bit], px => px * 2);
      assert.equal(c.tur, 'aciYayi');
      assert.equal(c.noktalar.length, 3);
      yakin(c.noktalar[0], ilerle(MERKEZ, bas, 36));
      yakin(c.noktalar[1], { x: 536, y: 536 });
      yakin(c.noktalar[2], ilerle(MERKEZ, bit, 36));
    }
  });
});
