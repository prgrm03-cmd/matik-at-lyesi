import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { kopruGonder } from '../motor/kopru.js';

const ESKI_PENCERE = globalThis.window;
const ESKI_BELGE = globalThis.document;

afterEach(() => {
  if (ESKI_PENCERE === undefined) delete globalThis.window;
  else globalThis.window = ESKI_PENCERE;
  if (ESKI_BELGE === undefined) delete globalThis.document;
  else globalThis.document = ESKI_BELGE;
});

function ortamKur(referrer) {
  const iletiler = [];
  globalThis.document = { referrer };
  globalThis.window = { parent: { postMessage: (...degerler) => iletiler.push(degerler) } };
  return iletiler;
}

describe('kopruGonder', () => {
  it('yalnız referrer kökenine izinli alanları iletir', () => {
    const iletiler = ortamKur('https://okul.example/sayfa');
    kopruGonder('tamamlandi', {
      id: 'D01', seed: 17, tamam: true, yanParca: false,
      isim: 'saklanmaz', yildiz: 2, sure: 7
    });
    assert.deepEqual(iletiler, [[{
      kaynak: 'matik', tur: 'tamamlandi', id: 'D01', seed: 17, tamam: true, yanParca: false
    }, 'https://okul.example']]);
  });

  it('referrer yoksa mesaj göndermez', () => {
    const iletiler = ortamKur('');
    kopruGonder('hazir');
    assert.deepEqual(iletiler, []);
  });

  it('opak veya geçersiz kökenlere mesaj göndermez', () => {
    for (const referrer of ['data:text/plain,x', 'file:///tmp/x', 'bozuk']) {
      const iletiler = ortamKur(referrer);
      kopruGonder('hazir');
      assert.deepEqual(iletiler, []);
    }
  });

  it('boyut mesajında yalnız sonlu yüksekliği iletir', () => {
    const iletiler = ortamKur('https://okul.example/');
    kopruGonder('boyut', { yukseklikPx: 630.1 });
    assert.equal(iletiler[0][0].yukseklikPx, 631);
    kopruGonder('boyut', { yukseklikPx: Infinity });
    assert.equal(Object.prototype.hasOwnProperty.call(iletiler[1][0], 'yukseklikPx'), false);
  });

  it('üst pencere engeli uygulamayı durdurmaz', () => {
    ortamKur('https://okul.example/');
    globalThis.window.parent.postMessage = () => { throw new Error('SecurityError'); };
    assert.doesNotThrow(() => kopruGonder('hazir'));
  });
});
