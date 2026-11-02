import { describe, it } from 'node:test';
import dogrula from 'node:assert/strict';
import { rngOlustur, hash32, seedUret } from '../motor/rng.js';

const ILK_BES = [
  0.6011037519201636,
  0.44829055899754167,
  0.8524657934904099,
  0.6697340414393693,
  0.17481389874592423
];

describe('rngOlustur', () => {
  it('Aynı başlangıç değeri sabit ilk beş sayıyı üretir.', () => {
    dogrula.deepEqual(Array.from({ length: 5 }, rngOlustur(42).sayi), ILK_BES);
    dogrula.deepEqual(Array.from({ length: 5 }, rngOlustur(42).sayi), ILK_BES);
  });

  it('Bin başlangıç değerinde sayılar sıfır dahil bir hariç aralıkta kalır.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = rngOlustur(seed);
      dogrula.equal(rng.seed, seed);
      for (let i = 0; i < 20; i++) {
        const sayi = rng.sayi();
        dogrula.ok(sayi >= 0 && sayi < 1);
      }
    }
  });

  it('İşaretsiz otuz iki bit sınırlarını kabul eder.', () => {
    dogrula.equal(rngOlustur(0).seed, 0);
    dogrula.equal(rngOlustur(0xffffffff).seed, 0xffffffff);
  });

  it('Geçersiz başlangıç değerlerini sözleşmedeki kodla reddeder.', () => {
    for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity, '42', undefined]) {
      dogrula.throws(() => rngOlustur(seed), /^Error: RNG_SEED_GECERSIZ$/);
    }
  });
});

describe('hash32', () => {
  it('Bilinen FNV bir a vektörlerini işaretsiz sayı olarak döndürür.', () => {
    const vektorler = [
      ['', 2166136261],
      ['a', 3826002220],
      ['foobar', 3214735720],
      ['hello', 1335831723]
    ];
    for (const [metin, beklenen] of vektorler) dogrula.equal(hash32(metin), beklenen);
  });

  it('Metin olmayan girdiyi mevcut hata koduyla reddeder.', () => {
    dogrula.throws(() => hash32(42), /^Error: PARAMETRE_ARALIK_DISI$/);
  });
});

describe('seedUret', () => {
  it('Verilen zamanı ve tekrar sayacını kimlikle birlikte özetler.', () => {
    dogrula.equal(seedUret('D09a', 2, 1700000000000), hash32('D09a:2:1700000000000'));
    dogrula.notEqual(seedUret('D09a', 2, 1700000000000), seedUret('D09a', 3, 1700000000000));
  });

  it('Zaman verilmediğinde yalnız bu çağrıda sistem saatini okur.', (baglam) => {
    const saat = baglam.mock.method(Date, 'now', () => 1700000000000);
    dogrula.equal(seedUret('D01', 0), hash32('D01:0:1700000000000'));
    dogrula.equal(saat.mock.callCount(), 1);
    seedUret('D01', 0, 10);
    dogrula.equal(saat.mock.callCount(), 1);
  });

  it('Geçersiz sayaç ve zamanı reddeder.', () => {
    dogrula.throws(() => seedUret('D01', -1, 0), /^Error: PARAMETRE_ARALIK_DISI$/);
    dogrula.throws(() => seedUret('D01', 0, NaN), /^Error: PARAMETRE_ARALIK_DISI$/);
  });

  it('Dışa aktarım parametre sayılarını korur.', () => {
    dogrula.equal(rngOlustur.length, 1);
    dogrula.equal(hash32.length, 1);
    dogrula.equal(seedUret.length, 3);
  });
});

describe('tam', () => {
  it('Adımlı kapalı aralıkta iki ucu da üretebilir.', () => {
    const gorulen = new Set();
    for (let seed = 1; seed <= 1000; seed++) {
      const deger = rngOlustur(seed).tam(-4, 8, 3);
      dogrula.ok([-4, -1, 2, 5, 8].includes(deger));
      gorulen.add(deger);
    }
    dogrula.deepEqual([...gorulen].sort((a, b) => a - b), [-4, -1, 2, 5, 8]);
  });

  it('Adım son sınırı aşmaz ve tek değerli aralıkta tek değeri döndürür.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      dogrula.ok([1, 4, 7].includes(rngOlustur(seed).tam(1, 8, 3)));
      dogrula.equal(rngOlustur(seed).tam(7, 7), 7);
    }
  });

  it('Bozuk aralığı ve geçersiz adımı reddeder.', () => {
    for (const arg of [[2, 1], [0, 9, 0], [0, 9, -1], [0, 9, 1.5], [NaN, 9]]) {
      dogrula.throws(() => rngOlustur(1).tam(...arg), /^Error: PARAMETRE_ARALIK_DISI$/);
    }
  });
});

describe('bool', () => {
  it('Varsayılan olasılık yarımdır ve sınır olasılıkları kesindir.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      dogrula.equal(rngOlustur(seed).bool(), rngOlustur(seed).sayi() < 0.5);
      dogrula.equal(rngOlustur(seed).bool(0), false);
      dogrula.equal(rngOlustur(seed).bool(1), true);
    }
  });

  it('Olasılık aralığı dışındaki girdileri reddeder.', () => {
    for (const olasilik of [-0.1, 1.1, NaN, '0.5']) {
      dogrula.throws(() => rngOlustur(1).bool(olasilik), /^Error: PARAMETRE_ARALIK_DISI$/);
    }
  });
});

describe('sec', () => {
  it('Diziden bir öğe seçer ve diziyi değiştirmez.', () => {
    const dizi = Object.freeze([{ id: 1 }, { id: 2 }, { id: 3 }]);
    for (let seed = 1; seed <= 1000; seed++) {
      dogrula.ok(dizi.includes(rngOlustur(seed).sec(dizi)));
    }
  });

  it('Boş veya dizi olmayan girdiyi reddeder.', () => {
    for (const dizi of [[], null, 'abc']) {
      dogrula.throws(() => rngOlustur(1).sec(dizi), /^Error: PARAMETRE_ARALIK_DISI$/);
    }
  });
});

describe('karistir', () => {
  it('Yeni bir dizi döndürür ve yinelenen öğeleri korur.', () => {
    const dizi = Object.freeze([1, 1, 2, 3, 4]);
    const sonuc = rngOlustur(42).karistir(dizi);
    dogrula.notEqual(sonuc, dizi);
    dogrula.deepEqual(sonuc.slice().sort(), [...dizi]);
    dogrula.deepEqual(sonuc, rngOlustur(42).karistir(dizi));
  });

  it('Boş ve tek öğeli diziyi yeni dizi olarak korur.', () => {
    for (const dizi of [[], [7]]) {
      const sonuc = rngOlustur(1).karistir(dizi);
      dogrula.notEqual(sonuc, dizi);
      dogrula.deepEqual(sonuc, dizi);
    }
  });
});

describe('alt', () => {
  it('Alt başlangıç değerini asıl başlangıç ve etiket ile üretir.', () => {
    const ana = rngOlustur(42);
    const alt = ana.alt('sina:1');
    dogrula.equal(alt.seed, hash32('42:sina:1'));
    dogrula.deepEqual(
      Array.from({ length: 5 }, alt.sayi),
      Array.from({ length: 5 }, rngOlustur(hash32('42:sina:1')).sayi)
    );
  });

  it('Alt akış ana akışı tüketmez ve tüketimden bağımsız tekrar kurulur.', () => {
    const ana = rngOlustur(42);
    const ilk = Array.from({ length: 5 }, ana.alt('tur:1').sayi);
    dogrula.deepEqual(Array.from({ length: 5 }, ana.sayi), ILK_BES);
    dogrula.deepEqual(Array.from({ length: 5 }, ana.alt('tur:1').sayi), ilk);
    dogrula.notEqual(ana.alt('tur:1').seed, ana.alt('tur:2').seed);
  });
});

describe('tamHaric', () => {
  it('Bin başlangıç değerinin beş çağrısında komşuluk ihlal edilmez.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = rngOlustur(seed);
      const gecmis = [];
      for (let i = 0; i < 5; i++) {
        const deger = rng.tamHaric(0, 180, Object.freeze(gecmis.slice()), 5);
        dogrula.ok(gecmis.every((onceki) => Math.abs(deger - onceki) > 5));
        dogrula.ok(Number.isInteger(deger) && deger >= 0 && deger <= 180);
        gecmis.push(deger);
      }
    }
  });

  it('Boş dışlama listesinde bin çağrı bütün değerleri kapsar.', () => {
    const rng = rngOlustur(1);
    const karsilik = rngOlustur(1);
    const gorulen = new Set();
    for (let i = 0; i < 1000; i++) {
      const deger = rng.tamHaric(0, 9, [], 5);
      dogrula.equal(deger, karsilik.tam(0, 9));
      gorulen.add(deger);
    }
    dogrula.equal(gorulen.size, 10);
  });
});

describe('tamHaric', () => {
  it('Örtüşen komşulukların sınırlarını ve kesirli dışlamayı doğru işler.', () => {
    const haric = Object.freeze([-4, 0, 1, 4.5, 10, 100]);
    for (let seed = 1; seed <= 1000; seed++) {
      const deger = rngOlustur(seed).tamHaric(0, 10, haric, 1);
      dogrula.ok([3, 6, 7, 8].includes(deger));
    }
    dogrula.equal(rngOlustur(1).tamHaric(0, 10, [0, 10], 4), 5);
  });

  it('Hiç uygun tam sayı kalmadığında mevcut hata kodunu döndürür.', () => {
    dogrula.throws(() => rngOlustur(1).tamHaric(0, 10, [5], 5),
      /^Error: PARAMETRE_ARALIK_DISI$/);
    dogrula.throws(() => rngOlustur(1).tamHaric(0, 10, [], -1),
      /^Error: PARAMETRE_ARALIK_DISI$/);
    dogrula.throws(() => rngOlustur(1).tamHaric(0, 10, [NaN], 1),
      /^Error: PARAMETRE_ARALIK_DISI$/);
  });

  it('Geniş aralık için bütün tam sayıları bellekte üretmeden seçim yapar.', () => {
    const deger = rngOlustur(42).tamHaric(-1000000000, 1000000000, [0], 100);
    dogrula.ok(deger >= -1000000000 && deger <= 1000000000);
    dogrula.ok(Math.abs(deger) > 100);
  });
});
