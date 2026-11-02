import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  kayitOlustur, kayitOku, kayitYaz, tamamlandiKaydet
} from '../motor/kayit.js';

const ANAHTAR = 'matik.atolye.tema1';
const MOD = Object.freeze({ tahta: false, pilot: false });
const TAHTA = Object.freeze({ tahta: true, pilot: false });
const ESKI_DEPO = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

afterEach(() => {
  if (ESKI_DEPO) Object.defineProperty(globalThis, 'localStorage', ESKI_DEPO);
  else delete globalThis.localStorage;
});

function depoKur(ilki) {
  const veriler = new Map(ilki ? [[ANAHTAR, JSON.stringify(ilki)]] : []);
  const depo = {
    getItem: ad => veriler.get(ad) || null,
    setItem: (ad, metin) => veriler.set(ad, metin)
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: depo });
  return veriler;
}

function ctxKur(mod = MOD) {
  return { id: 'D01', rng: { seed: 17 }, mod };
}

describe('kayitOku', () => {
  it('tahta modunda depolama nesnesine erişmez', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { assert.fail('tahta depolamaya erişti'); }
    });
    const kayit = kayitOku(TAHTA);
    assert.equal(kayit.semaSurumu, 1);
    assert.equal(kayitYaz(TAHTA, kayit), false);
  });

  it('erişim engellenince kayıtsız çalışmayı sürdürür', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError'); }
    });
    const kayit = kayitOku(MOD);
    assert.equal(kayit.semaSurumu, 1);
    assert.equal(kayitYaz(MOD, kayit), false);
  });

});

describe('kayitOku', () => {
  it('bilinmeyen şemadan yalnız yıldızları taşır', () => {
    depoKur({
      semaSurumu: 0,
      isim: 'saklanmaz',
      duzenekler: {
        D01: { tamam: true, yanParca: true, tekrar: 23, son5: [2, 3], sonSeed: 21 }
      }
    });
    const kayit = kayitOku(MOD);
    assert.deepEqual(kayit.duzenekler.D01, {
      tamam: true, yanParca: true, tekrar: 0, son5: [], sonSeed: 0
    });
    assert.equal(Object.prototype.hasOwnProperty.call(kayit, 'isim'), false);
    assert.ok(kayit.olusturma > 0);
  });

});

describe('kayitOku', () => {
  it('halka tamponu son beş sayısal değerle sınırlar', () => {
    depoKur({ semaSurumu: 1, duzenekler: { D01: { son5: [1, 2, 3, 4, 5, 6, 'x'] } } });
    assert.deepEqual(kayitOku(MOD).duzenekler.D01.son5, [2, 3, 4, 5, 6]);
  });

  it('okuma sırasında eski kayıt üzerine yazmaz', () => {
    const veriler = depoKur({ semaSurumu: 99, duzenekler: { D01: { tamam: true } } });
    const onceki = veriler.get(ANAHTAR);
    kayitOku(MOD);
    assert.equal(veriler.get(ANAHTAR), onceki);
  });
});

describe('kayitYaz', () => {
  it('şema dışında kimlik verisi saklamaz', () => {
    const veriler = depoKur();
    const kayit = kayitOlustur(MOD, 123);
    kayit.isim = 'saklanmaz';
    assert.equal(kayitYaz(MOD, kayit), true);
    const yazilan = JSON.parse(veriler.get(ANAHTAR));
    assert.equal(yazilan.curriculumVersion, 'TYMM-2026');
    assert.equal(yazilan.olusturma, 123);
    assert.equal(Object.prototype.hasOwnProperty.call(yazilan, 'isim'), false);
    assert.ok(new TextEncoder().encode(veriler.get(ANAHTAR)).byteLength <= 8192);
  });

  it('sonraki yazmada önceki yıldızları geri almaz', () => {
    depoKur();
    const kayit = kayitOlustur(MOD);
    tamamlandiKaydet(kayit, ctxKur(), { tamam: true, yanParca: true });
    assert.equal(kayitYaz(MOD, kayit), true);
    assert.equal(kayitYaz(MOD, kayitOlustur(MOD)), true);
    assert.equal(kayitOku(MOD).duzenekler.D01.tamam, true);
    assert.equal(kayitOku(MOD).duzenekler.D01.yanParca, true);
  });

});

describe('kayitYaz', () => {
  it('boyut sınırı aşılınca eski kaydı korur', () => {
    const veriler = depoKur();
    const kayit = kayitOlustur(MOD);
    kayitYaz(MOD, kayit);
    const onceki = veriler.get(ANAHTAR);
    for (let no = 1; no <= 18; no++) {
      for (const ek of ['', 'a', 'b', 'c', 'd', 'e', 'f']) {
        kayit.duzenekler['D' + String(no).padStart(2, '0') + ek] = {
          tamam: true, yanParca: true, tekrar: 1, son5: [123, 234, 345, 456, 567], sonSeed: 1
        };
      }
    }
    assert.equal(kayitYaz(MOD, kayit), false);
    assert.equal(veriler.get(ANAHTAR), onceki);
  });
});

describe('tamamlandiKaydet', () => {
  it('tamamlanmayan ve tahta sonucunda kayda dokunmaz', () => {
    const kayit = kayitOlustur(MOD);
    tamamlandiKaydet(kayit, ctxKur(), { tamam: false, yanParca: true });
    tamamlandiKaydet(kayit, ctxKur(TAHTA), { tamam: true, yanParca: true });
    assert.deepEqual(kayit.duzenekler, {});
  });

  it('tamamlanmayı artırır ve seed değerini saklar', () => {
    const kayit = kayitOlustur(MOD);
    tamamlandiKaydet(kayit, ctxKur(), { tamam: true, yanParca: true });
    tamamlandiKaydet(kayit, ctxKur(), { tamam: true, yanParca: false });
    assert.deepEqual(kayit.duzenekler.D01, {
      tamam: true, yanParca: true, tekrar: 2, son5: [], sonSeed: 17
    });
  });
});
