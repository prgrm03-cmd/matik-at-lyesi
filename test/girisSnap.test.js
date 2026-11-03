import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { girisBagla } from '../motor/giris.js';
import { cizimHazirla, hedefHazirla } from '../motor/sahneCizim.js';
import { lazerOlustur } from '../widget/lazer.js';

const GENISLIKLER = [320, 360, 1080, 1920];
const SENSOR = Object.freeze({ x: 500, y: 500 });

function elemanOlustur() {
  const dinleyiciler = new Map();
  const yakalananlar = new Set();
  return {
    dinleyiciler, yakalananlar,
    addEventListener: (ad, islev) => dinleyiciler.set(ad, islev),
    removeEventListener: ad => dinleyiciler.delete(ad),
    closest() { return this; },
    focus() { dinleyiciler.get('focus')?.(); },
    setPointerCapture: id => yakalananlar.add(id),
    hasPointerCapture: id => yakalananlar.has(id),
    releasePointerCapture(id) {
      yakalananlar.delete(id);
      dinleyiciler.get('lostpointercapture')?.({ pointerId: id });
    }
  };
}

function pimEkle(k, id, nokta, katman = 'alt') {
  const cizim = cizimHazirla('pim', [nokta, { id }], k.gorunum.sahne.pxToBirim);
  k.gorunum.hedefler.set(id, hedefHazirla(cizim, katman));
}

function kur(t, genislik = 360) {
  const eleman = elemanOlustur();
  const lazer = lazerOlustur({ mod: 'dogru' });
  lazer.A = { x: 100, y: 100 };
  lazer.B = { x: 800, y: 800 };
  const gorunum = {
    eleman, hedefler: new Map(),
    sahne: { pxToBirim: px => px * 1000 / genislik, vurgula: () => {} },
    nokta: (x, y) => ({ x: x * 1000 / genislik, y: y * 1000 / genislik })
  };
  const k = { genislik, gorunum, lazer, olaylar: [] };
  pimEkle(k, 'sensor0', SENSOR);
  pimEkle(k, 'lazerA', lazer.A, 'ust');
  pimEkle(k, 'lazerB', lazer.B, 'ust');
  const giris = girisBagla(gorunum, olay => {
    k.olaylar.push(olay);
    lazer.girdi(olay);
    pimEkle(k, 'lazerA', lazer.A, 'ust');
    pimEkle(k, 'lazerB', lazer.B, 'ust');
  }, () => {});
  t.after(() => giris.kaldir());
  return k;
}

function isaretci(k, ad, nokta, ek = {}) {
  k.gorunum.eleman.dinleyiciler.get(ad)({
    pointerId: 1, button: 0, isPrimary: true,
    clientX: nokta.x * k.genislik / 1000,
    clientY: nokta.y * k.genislik / 1000,
    preventDefault() {}, ...ek
  });
}

function surukle(k, nokta) {
  isaretci(k, 'pointerdown', k.lazer.A);
  isaretci(k, 'pointermove', nokta);
}

function noktaAl(olay) {
  return { x: olay.x, y: olay.y };
}

describe('ADT-010 pim oturma', () => {
  for (const genislik of GENISLIKLER) {
    for (const px of [15, 16, 17]) {
      it(genislik + ' px genişlikte ' + px + ' px bırakmayı işler', t => {
        const k = kur(t, genislik);
        const birim = k.gorunum.sahne.pxToBirim(px);
        const birakilan = { x: SENSOR.x + birim, y: SENSOR.y };
        surukle(k, birakilan);
        const once = k.lazer.A;
        isaretci(k, 'pointerup', birakilan);
        const beklenen = px <= 16 ? SENSOR : once;
        assert.deepEqual(k.lazer.A, beklenen);
        assert.deepEqual(noktaAl(k.olaylar.at(-1)), beklenen);
        assert.equal(k.olaylar.at(-1).tur, 'birak');
        assert.ok(k.olaylar.every(olay => olay.hedef === 'lazerA'));
        assert.equal(k.gorunum.eleman.yakalananlar.size, 0);
        if (px <= 16) {
          assert.notEqual(k.lazer.A, SENSOR);
          assert.deepEqual(k.olaylar.map(olay => olay.tur),
            ['bas', 'surukle', 'surukle', 'birak']);
          const son = k.olaylar.at(-2);
          assert.equal(son.dx, SENSOR.x - once.x);
          assert.equal(son.dy, SENSOR.y - once.y);
        } else assert.equal(k.olaylar.length, 3);
      });
    }
  }

  it('son pointermove yerine pointerup konumuna göre hedefi yakalar', t => {
    const k = kur(t);
    surukle(k, { x: 300, y: 300 });
    isaretci(k, 'pointerup', { x: SENSOR.x + 15 * 1000 / k.genislik, y: SENSOR.y });
    assert.deepEqual(k.lazer.A, SENSOR);
    assert.equal(k.olaylar.at(-2).dx, 200);
    assert.equal(k.olaylar.at(-2).dy, 200);
  });

  it('kendi merkezini hedef saymaz', t => {
    const k = kur(t);
    k.gorunum.hedefler.delete('sensor0');
    surukle(k, SENSOR);
    isaretci(k, 'pointerup', SENSOR);
    assert.deepEqual(k.olaylar.map(olay => olay.tur), ['bas', 'surukle', 'birak']);
    assert.deepEqual(k.lazer.A, SENSOR);
  });

  it('çizgi veya çemberin temsili merkezine yapışmaz', t => {
    const k = kur(t);
    k.gorunum.hedefler.delete('sensor0');
    for (const tur of ['dogru', 'cember']) {
      k.gorunum.hedefler.set(tur, {
        id: tur, tur, nokta: SENSOR, katman: 'alt', vur: () => true
      });
    }
    const P = { x: 510, y: 500 };
    surukle(k, P);
    isaretci(k, 'pointerup', P);
    assert.deepEqual(k.lazer.A, P);
    assert.equal(k.olaylar.length, 3);
  });

  it('yakalama alanında en yakın pimi seçer', t => {
    const k = kur(t);
    pimEkle(k, 'sensor1', { x: 530, y: 500 });
    surukle(k, { x: 505, y: 500 });
    isaretci(k, 'pointerup', { x: 505, y: 500 });
    assert.deepEqual(k.lazer.A, SENSOR);
  });

  it('eşit uzaklıkta son çizilen hedefi kararlı olarak seçer', t => {
    const k = kur(t);
    const son = { x: 520, y: 500 };
    pimEkle(k, 'sensor1', son);
    surukle(k, { x: 510, y: 500 });
    isaretci(k, 'pointerup', { x: 510, y: 500 });
    assert.deepEqual(k.lazer.A, son);
  });

  for (const ad of ['pointercancel', 'lostpointercapture']) {
    it(ad + ' geldiğinde yakın pime oturmaz ve tıklama üretmez', t => {
      const k = kur(t);
      const P = { x: 510, y: 500 };
      surukle(k, P);
      isaretci(k, ad, SENSOR);
      assert.deepEqual(k.lazer.A, P);
      assert.deepEqual(k.olaylar.map(olay => olay.tur), ['bas', 'surukle', 'birak']);
      assert.equal(k.gorunum.eleman.yakalananlar.size, 0);
    });
  }

  it('başka işaretçinin bırakmasını yok sayar', t => {
    const k = kur(t);
    const P = { x: 510, y: 500 };
    surukle(k, P);
    isaretci(k, 'pointerup', SENSOR, { pointerId: 2 });
    assert.deepEqual(k.lazer.A, P);
    assert.equal(k.olaylar.length, 2);
    isaretci(k, 'pointerup', SENSOR);
    assert.deepEqual(k.lazer.A, SENSOR);
  });

  it('tutulan öğe pim değilse konumunu değiştirmez', t => {
    const k = kur(t);
    k.gorunum.hedefler.get('lazerA').tur = 'cember';
    isaretci(k, 'pointerdown', k.lazer.A);
    k.gorunum.hedefler.get('lazerA').tur = 'cember';
    isaretci(k, 'pointerup', SENSOR);
    assert.deepEqual(k.lazer.A, { x: 100, y: 100 });
    assert.ok(!k.olaylar.some(olay => olay.tur === 'surukle'));
  });
});
