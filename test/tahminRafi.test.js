import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import * as modul from '../defter/tahminRafi.js';

const { tahminRafiOlustur } = modul;
const ORTAM = { rng: {}, sahne: {}, matik: {} };
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;

function ayarOlustur() {
  return {
    hucreler: [
      { ad: 'sayi', tur: 'sayac', min: -2, max: 4 },
      { ad: 'tur', tur: 'secim', secenekler: ['dik', 'dar'] },
      { ad: 'diger', tur: 'sayac', min: 1, max: 1 }
    ],
    etiketAnahtari: 'tahmin'
  };
}

function rafOlustur(ayar = ayarOlustur()) {
  return tahminRafiOlustur(ayar, ORTAM);
}

describe('tahminRafiOlustur', () => {
  it('Tek fabrikayı iki parametreyle dışa aktarır ve ilk değerleri seçer.', () => {
    dogrula.deepEqual(Object.keys(modul), ['tahminRafiOlustur']);
    dogrula.equal(tahminRafiOlustur.length, 2);
    const raf = rafOlustur();
    dogrula.deepEqual(raf.deger(), { sayi: -2, tur: 'dik', diger: 1 });
    dogrula.deepEqual(Object.keys(raf).sort(),
      ['deger', 'hucreKoy', 'karsilastir', 'kilitle', 'sonucKoy']);
  });

  it('Eksik ortam bileşenlerini ayar hatasıyla reddeder.', () => {
    for (const ad of ['rng', 'sahne', 'matik']) {
      dogrula.throws(() => tahminRafiOlustur(ayarOlustur(), {
        ...ORTAM, [ad]: undefined
      }), AYAR_HATASI);
    }
    dogrula.throws(() => tahminRafiOlustur(ayarOlustur()), AYAR_HATASI);
  });

  it('Geçersiz hücre türlerini ve sayaç sınırlarını reddeder.', () => {
    const bozuklar = [
      null, {}, { ad: 'a', tur: 'baska' }, { ad: 1, tur: 'sayac', min: 0, max: 1 },
      { ad: 'a', tur: 'sayac', min: 2, max: 1 },
      { ad: 'a', tur: 'sayac', min: '0', max: 1 },
      { ad: 'a', tur: 'sayac', min: NaN, max: 1 },
      { ad: 'a', tur: 'sayac', min: 0, max: Infinity },
      { ad: 'a', tur: 'secim', secenekler: [] },
      { ad: 'a', tur: 'secim', secenekler: ['dik', 1] },
      { ad: 'a', tur: 'secim', secenekler: 'dik' }
    ];
    for (const hucre of bozuklar) {
      dogrula.throws(() => rafOlustur({
        hucreler: [hucre], etiketAnahtari: 'tahmin'
      }), AYAR_HATASI);
    }
  });

  it('Eksik ayarı, etiketi ve yinelenen hücre adlarını reddeder.', () => {
    for (const ayar of [null, {}, [], { hucreler: {} },
      { hucreler: [], etiketAnahtari: 1 }]) {
      dogrula.throws(() => rafOlustur(ayar), AYAR_HATASI);
    }
    const ayar = ayarOlustur();
    ayar.hucreler.push({ ...ayar.hucreler[0] });
    dogrula.throws(() => rafOlustur(ayar), AYAR_HATASI);
  });

  it('Hücre ve seçenek dizilerindeki boş yuvaları ayar hatasıyla reddeder.', () => {
    dogrula.throws(() => rafOlustur({
      ...ayarOlustur(), hucreler: new Array(1)
    }), AYAR_HATASI);
    dogrula.throws(() => rafOlustur({
      etiketAnahtari: 'tahmin',
      hucreler: [{ ad: 'tur', tur: 'secim', secenekler: new Array(1) }]
    }), AYAR_HATASI);
  });

  it('Kurulum ayarındaki sonraki değişikliklerden etkilenmez.', () => {
    const ayar = ayarOlustur();
    const raf = rafOlustur(ayar);
    ayar.hucreler[0].max = 100;
    ayar.hucreler[1].secenekler.push('genis');
    ayar.hucreler[0].ad = 'baska';
    dogrula.throws(() => raf.hucreKoy('sayi', 5), AYAR_HATASI);
    dogrula.throws(() => raf.hucreKoy('tur', 'genis'), AYAR_HATASI);
    dogrula.deepEqual(raf.deger(), { sayi: -2, tur: 'dik', diger: 1 });
  });
});

describe('hucreKoy', () => {
  it('Sayaç sınırlarını kabul eder ve seçenek değerini değiştirir.', () => {
    const raf = rafOlustur();
    raf.hucreKoy('sayi', 4);
    raf.hucreKoy('tur', 'dar');
    raf.hucreKoy('diger', 1);
    dogrula.deepEqual(raf.deger(), { sayi: 4, tur: 'dar', diger: 1 });
    raf.hucreKoy('sayi', -2);
    dogrula.equal(raf.deger().sayi, -2);
  });

  it('Bilinmeyen hücreyi, kesri ve aralık dışı değerleri reddeder.', () => {
    const raf = rafOlustur();
    for (const deger of [-3, 5, 1.5, '1', NaN, Infinity]) {
      dogrula.throws(() => raf.hucreKoy('sayi', deger), AYAR_HATASI);
    }
    dogrula.throws(() => raf.hucreKoy('tur', 'genis'), AYAR_HATASI);
    dogrula.throws(() => raf.hucreKoy('yok', 0), AYAR_HATASI);
    dogrula.deepEqual(raf.deger(), { sayi: -2, tur: 'dik', diger: 1 });
  });
});

describe('kilitle', () => {
  it('Tekrarlanan kilitlemeden sonra bütün hücre değişikliklerini reddeder.', () => {
    const raf = rafOlustur();
    raf.hucreKoy('sayi', 2);
    raf.kilitle();
    raf.kilitle();
    dogrula.throws(() => raf.hucreKoy('sayi', 2), AYAR_HATASI);
    dogrula.throws(() => raf.hucreKoy('tur', 'dar'), AYAR_HATASI);
    dogrula.deepEqual(raf.deger(), { sayi: 2, tur: 'dik', diger: 1 });
  });
});

describe('deger', () => {
  it('Dışarıdan değiştirilebilen bağımsız bir değer kopyası döndürür.', () => {
    const raf = rafOlustur();
    const kopya = raf.deger();
    kopya.sayi = 4;
    delete kopya.tur;
    kopya.yeni = 5;
    dogrula.deepEqual(raf.deger(), { sayi: -2, tur: 'dik', diger: 1 });
    dogrula.notEqual(raf.deger(), raf.deger());
  });
});

describe('karsilastir', () => {
  it('Sonuç konmadan bütün hücreleri ayar sırasıyla farklı sayar.', () => {
    dogrula.deepEqual(rafOlustur().karsilastir(), {
      eslesen: [], farkli: ['sayi', 'tur', 'diger']
    });
  });

  it('Tam değer eşitliğini kullanır ve sonuç kopyasını saklar.', () => {
    const raf = rafOlustur();
    const sonuc = { sayi: '-2', tur: 'dik', diger: 1 };
    raf.sonucKoy(sonuc);
    sonuc.tur = 'dar';
    dogrula.deepEqual(raf.karsilastir(), {
      eslesen: ['tur', 'diger'], farkli: ['sayi']
    });
    raf.sonucKoy({ sayi: -2 });
    dogrula.deepEqual(raf.karsilastir(), {
      eslesen: ['sayi'], farkli: ['tur', 'diger']
    });
  });

  it('Kilitlemeden sonra sonucu alır ve tam eşleşmeyi bildirir.', () => {
    const raf = rafOlustur();
    raf.kilitle();
    raf.sonucKoy(raf.deger());
    const sonuc = raf.karsilastir();
    dogrula.deepEqual(sonuc, { eslesen: ['sayi', 'tur', 'diger'], farkli: [] });
    sonuc.eslesen.length = 0;
    dogrula.equal(raf.karsilastir().eslesen.length, 3);
  });

  it('Sayısal hücre adlarında da ayar sırasını korur.', () => {
    const raf = rafOlustur({ hucreler: [
      { ad: '2', tur: 'sayac', min: 0, max: 1 },
      { ad: '1', tur: 'sayac', min: 0, max: 1 }
    ], etiketAnahtari: 'tahmin' });
    raf.sonucKoy({ 1: 0, 2: 0 });
    dogrula.deepEqual(raf.karsilastir(), { eslesen: ['2', '1'], farkli: [] });
  });
});
