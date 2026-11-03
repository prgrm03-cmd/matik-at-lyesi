import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import * as modul from '../defter/kuralKarti.js';

const { kuralKartiOlustur } = modul;
const ORTAM = { rng: {}, sahne: {}, matik: {}, kalip: '[sayi] [tur]' };
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;

function ayarOlustur() {
  return {
    kalipAnahtari: 'k1',
    disliler: [
      { ad: 'sayi', secenekler: [1, 2, '2'] },
      { ad: 'tur', secenekler: ['dik', 'dar'] }
    ],
    dogru: { sayi: 2, tur: 'dar' }
  };
}

function kartOlustur(ayar = ayarOlustur()) {
  return kuralKartiOlustur(ayar, ORTAM);
}

describe('kuralKartiOlustur', () => {
  it('Tek fabrikayı iki parametreyle dışa aktarır ve ilk seçenekleri alır.', () => {
    dogrula.deepEqual(Object.keys(modul), ['kuralKartiOlustur']);
    dogrula.equal(kuralKartiOlustur.length, 2);
    const kart = kartOlustur();
    dogrula.deepEqual(kart.ayar(), { sayi: 1, tur: 'dik' });
    dogrula.equal(kart.anahtar, 'k1');
    dogrula.equal(kart.kalip, '[sayi] [tur]');
    dogrula.equal(kart.takili, false);
    dogrula.deepEqual(Object.keys(kart).sort(),
      ['anahtar', 'ayar', 'disliCevir', 'dogruMu', 'kalip', 'otomatikDoldur', 'tak', 'takili']);
  });

  it('Kalıbı salt okunur tutar ve kurulum ortamından bağımsız saklar.', () => {
    const ortam = { ...ORTAM };
    const kart = kuralKartiOlustur(ayarOlustur(), ortam);
    ortam.kalip = 'baska';
    dogrula.throws(() => { kart.kalip = 'baska'; }, TypeError);
    dogrula.equal(kart.kalip, '[sayi] [tur]');
  });

  it('Eksik ortam bileşenlerini ve dizgi olmayan kalıbı reddeder.', () => {
    for (const ad of ['rng', 'sahne', 'matik', 'kalip']) {
      dogrula.throws(() => kuralKartiOlustur(ayarOlustur(), {
        ...ORTAM, [ad]: undefined
      }), AYAR_HATASI);
    }
    dogrula.throws(() => kuralKartiOlustur(ayarOlustur()), AYAR_HATASI);
    dogrula.throws(() => kuralKartiOlustur(ayarOlustur(), {
      ...ORTAM, kalip: 1
    }), AYAR_HATASI);
  });

  it('Geçersiz dişlileri ve seçenek dışı doğru değerlerini reddeder.', () => {
    const ayar = ayarOlustur();
    for (const disli of [null, {}, { ad: 1, secenekler: [1] },
      { ad: 'sayi', secenekler: [] }, { ad: 'sayi', secenekler: 'dik' },
      { ad: 'sayi', secenekler: [null] }, { ad: 'sayi', secenekler: [NaN] }]) {
      dogrula.throws(() => kartOlustur({ ...ayar, disliler: [disli] }), AYAR_HATASI);
    }
    for (const dogru of [null, [], 1, { yok: 1 }, { sayi: 3 }]) {
      dogrula.throws(() => kartOlustur({ ...ayar, dogru }), AYAR_HATASI);
    }
    dogrula.throws(() => kartOlustur({
      ...ayar, disliler: [ayar.disliler[0], ayar.disliler[0]]
    }), AYAR_HATASI);
  });

  it('Eksik ayarı ve dişli dizisini ayar hatasıyla reddeder.', () => {
    for (const ayar of [null, {}, [], { kalipAnahtari: 'k1', dogru: {} },
      { ...ayarOlustur(), disliler: {} }]) {
      dogrula.throws(() => kartOlustur(ayar), AYAR_HATASI);
    }
  });

  it('Dişli ve seçenek dizilerindeki boş yuvaları ayar hatasıyla reddeder.', () => {
    dogrula.throws(() => kartOlustur({
      ...ayarOlustur(), disliler: new Array(1), dogru: {}
    }), AYAR_HATASI);
    dogrula.throws(() => kartOlustur({
      ...ayarOlustur(), disliler: [{ ad: 'sayi', secenekler: new Array(1) }], dogru: {}
    }), AYAR_HATASI);
  });

  it('Kurulum ayarının sonradan değiştirilmesinden etkilenmez.', () => {
    const ayar = ayarOlustur();
    const kart = kartOlustur(ayar);
    ayar.disliler[0].secenekler.push(3);
    ayar.dogru.sayi = 1;
    ayar.kalipAnahtari = 'k2';
    dogrula.throws(() => kart.disliCevir('sayi', 3), AYAR_HATASI);
    kart.otomatikDoldur();
    dogrula.deepEqual(kart.ayar(), { sayi: 2, tur: 'dar' });
    dogrula.equal(kart.anahtar, 'k1');
  });
});

describe('disliCevir', () => {
  it('Seçeneği değiştirir ve tanımsız dişli veya seçenek için hata verir.', () => {
    const kart = kartOlustur();
    kart.disliCevir('sayi', 2);
    dogrula.equal(kart.ayar().sayi, 2);
    dogrula.throws(() => kart.disliCevir('sayi', 3), AYAR_HATASI);
    dogrula.throws(() => kart.disliCevir('yok', 1), AYAR_HATASI);
    dogrula.deepEqual(kart.ayar(), { sayi: 2, tur: 'dik' });
  });
});

describe('dogruMu', () => {
  it('Yalnız bütün dişliler doğru değerlerle tam eşleştiğinde doğru döner.', () => {
    const kart = kartOlustur();
    dogrula.equal(kart.dogruMu(), false);
    kart.disliCevir('tur', 'dar');
    kart.disliCevir('sayi', '2');
    dogrula.equal(kart.dogruMu(), false);
    kart.disliCevir('sayi', 2);
    dogrula.equal(kart.dogruMu(), true);
    kart.disliCevir('tur', 'dik');
    dogrula.equal(kart.dogruMu(), false);
  });

  it('Doğru ayarında eksik dişli varsa tam eşleşme saymaz.', () => {
    const kart = kartOlustur({ ...ayarOlustur(), dogru: { sayi: 1 } });
    dogrula.equal(kart.dogruMu(), false);
    kart.otomatikDoldur();
    dogrula.equal(kart.dogruMu(), false);
  });
});

describe('otomatikDoldur', () => {
  it('Bütün dişlileri doğru değerlere getirir ve tam eşleşmeyi sağlar.', () => {
    const kart = kartOlustur();
    kart.otomatikDoldur();
    dogrula.deepEqual(kart.ayar(), { sayi: 2, tur: 'dar' });
    dogrula.equal(kart.dogruMu(), true);
    kart.otomatikDoldur();
    dogrula.equal(kart.dogruMu(), true);
  });
});

describe('ayar', () => {
  it('Dışarıdan değiştirilebilen bağımsız bir ayar kopyası döndürür.', () => {
    const kart = kartOlustur();
    const kopya = kart.ayar();
    kopya.sayi = 2;
    delete kopya.tur;
    kopya.yeni = 1;
    dogrula.deepEqual(kart.ayar(), { sayi: 1, tur: 'dik' });
    dogrula.notEqual(kart.ayar(), kart.ayar());
  });
});

describe('tak', () => {
  it('Kartı takılı duruma geçirir ve tekrarlanan çağrıyı kabul eder.', () => {
    const kart = kartOlustur();
    kart.tak();
    dogrula.equal(kart.takili, true);
    kart.tak();
    dogrula.equal(kart.takili, true);
    dogrula.deepEqual(kart.ayar(), { sayi: 1, tur: 'dik' });
  });
});
