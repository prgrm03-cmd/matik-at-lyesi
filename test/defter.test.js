import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defterOlustur } from '../defter/defter.js';
import { rngOlustur } from '../motor/rng.js';

const HATA = { message: 'WIDGET_AYAR_GECERSIZ' };

function ortamOlustur(bayraklar) {
  const kayitlar = [];
  const panel = [];
  const ortam = {
    bayraklar, kartlar: { k1: { kalip: 'x' } }, rng: rngOlustur(1), sahne: {},
    matik: { soyle() {} }, kayit: nesne => kayitlar.push(nesne),
    arayuz: { defterAc() { panel.push('ac'); }, defterKapat() { panel.push('kapat'); } }
  };
  return { ortam, kayitlar, panel };
}

function rafAyari() {
  return { hucreler: [{ ad: 'a', tur: 'sayac', min: 1, max: 3 }], etiketAnahtari: 'raf' };
}

function kartAyari() {
  return { kalipAnahtari: 'k1', disliler: [{ ad: 'a', secenekler: [1, 2] }], dogru: { a: 2 } };
}

function yuvaAyari() {
  return { kabulEdilen: ['k1'], sensorler: ['a'],
    cozucu() { return { tamam: true, doldurulan: ['a'], eksik: [] }; } };
}

function tanimliOrtam() {
  const bag = ortamOlustur();
  const tanimlar = [];
  bag.ortam.kayit = (nesne, tanim) => {
    bag.kayitlar.push(nesne);
    tanimlar.push(tanim);
  };
  return { ...bag, tanimlar, defter: defterOlustur(bag.ortam) };
}

describe('defterOlustur', () => {
  it('yalnız sözleşmedeki altı üyeyi sunar', () => {
    const { ortam } = ortamOlustur();
    assert.deepEqual(Object.keys(defterOlustur(ortam)),
      ['tahminRafi', 'kuralKarti', 'sina', 'kisayolYuvasi', 'ac', 'kapat']);
    assert.equal(defterOlustur.length, 1);
  });

  it('zorunlu ortam alanı yoksa kurulumda hata verir', () => {
    for (const ad of ['rng', 'sahne', 'matik']) {
      const { ortam } = ortamOlustur();
      delete ortam[ad];
      assert.throws(() => defterOlustur(ortam), HATA);
    }
    assert.throws(() => defterOlustur(undefined), HATA);
  });

  it('kapalı tahmin rafını kurmaz ve kayıt eklemez', () => {
    const { ortam, kayitlar } = ortamOlustur({ tahminRafi: false });
    const defter = defterOlustur(ortam);
    assert.throws(() => defter.tahminRafi(rafAyari()), HATA);
    assert.deepEqual(kayitlar, []);
  });

  it('kapalı sınamayı Promise oluşturmadan reddeder', () => {
    const { ortam } = ortamOlustur({ sinama: false });
    const defter = defterOlustur(ortam);
    const kart = defter.kuralKarti(kartAyari());
    assert.throws(() => defter.sina(kart, () => assert.fail()), HATA);
  });

  it('sensör sökme kapalıyken yuvayı kurar fakat sökmeyi reddeder', () => {
    const { ortam, kayitlar } = ortamOlustur({ sensorSokme: false });
    const yuva = defterOlustur(ortam).kisayolYuvasi(yuvaAyari());
    assert.deepEqual(kayitlar, [yuva]);
    assert.throws(() => yuva.sok('a'), HATA);
    assert.deepEqual(yuva.sokulen, []);
  });

  it('sıfır kart sınırında kart kurmayı reddeder', () => {
    const { ortam, kayitlar } = ortamOlustur({ kartSayisi: 0 });
    assert.throws(() => defterOlustur(ortam).kuralKarti(kartAyari()), HATA);
    assert.deepEqual(kayitlar, []);
  });

  it('kart sınırını yalnız başarıyla kurulan kartlarla sayar', () => {
    const { ortam, kayitlar } = ortamOlustur({ kartSayisi: 1 });
    const defter = defterOlustur(ortam);
    assert.throws(() => defter.kuralKarti({}), HATA);
    const kart = defter.kuralKarti(kartAyari());
    assert.throws(() => defter.kuralKarti(kartAyari()), HATA);
    assert.deepEqual(kayitlar, [kart]);
  });

  it('kart sayısını her defterde yeniden başlatır', () => {
    const { ortam, kayitlar } = ortamOlustur({ kartSayisi: 1 });
    defterOlustur(ortam).kuralKarti(kartAyari());
    defterOlustur(ortam).kuralKarti(kartAyari());
    assert.equal(kayitlar.length, 2);
  });

  it('eksik kart anahtarını ve metin olmayan kalıbı reddeder', () => {
    for (const kartlar of [{}, { k1: {} }, { k1: { kalip: 1 } }]) {
      const { ortam, kayitlar } = ortamOlustur();
      ortam.kartlar = kartlar;
      assert.throws(() => defterOlustur(ortam).kuralKarti(kartAyari()), HATA);
      assert.deepEqual(kayitlar, []);
    }
  });

  it('kalıbı kart verisinden alır ve ortamı değiştirmez', () => {
    const { ortam } = ortamOlustur();
    const kart = defterOlustur(Object.freeze(ortam)).kuralKarti(kartAyari());
    assert.equal(kart.anahtar, 'k1');
    assert.equal(kart.kalip, 'x');
    assert.equal(Object.hasOwn(ortam, 'kalip'), false);
  });

  it('tanımlanmamış bayrakları serbest bırakır ve her nesneyi bir kez kaydeder', async () => {
    const { ortam, kayitlar } = ortamOlustur();
    const defter = defterOlustur(ortam);
    const raf = defter.tahminRafi(rafAyari());
    const kart = defter.kuralKarti(kartAyari());
    const ikinci = defter.kuralKarti(kartAyari());
    const yuva = defter.kisayolYuvasi(yuvaAyari());
    yuva.sok('a');
    assert.deepEqual(yuva.sokulen, ['a']);
    const sonuc = await defter.sina(kart, () => ({ beklenen: { a: 1 } }));
    assert.equal(sonuc.basarili, true);
    assert.equal(sonuc.sonuclar.length, 3);
    assert.deepEqual(kayitlar, [raf, kart, ikinci, yuva]);
  });

  it('açma ve kapamayı yalnız arayüz hizmetine iletir', () => {
    const { ortam, panel, kayitlar } = ortamOlustur();
    ortam.sahne = new Proxy({}, { get() { assert.fail(); } });
    const defter = defterOlustur(ortam);
    defter.ac();
    defter.kapat();
    defter.ac();
    assert.deepEqual(panel, ['ac', 'kapat', 'ac']);
    assert.deepEqual(kayitlar, []);
  });

  it('kayıt ikinci parametrede yalnız tanımı verir ve gizli alanları taşımaz', () => {
    const { defter, tanimlar, kayitlar } = tanimliOrtam();
    const rafAyar = rafAyari();
    const kartAyar = kartAyari();
    const yuvaAyar = yuvaAyari();
    for (const oge of [rafAyar, ...rafAyar.hucreler, ...kartAyar.disliler, yuvaAyar]) {
      oge.dogru = { gizli: 'cevap' };
    }
    for (const oge of [rafAyar, ...rafAyar.hucreler, kartAyar, ...kartAyar.disliler]) {
      oge.cozucu = yuvaAyar.cozucu;
    }
    const raf = defter.tahminRafi(rafAyar);
    const kart = defter.kuralKarti(kartAyar);
    const yuva = defter.kisayolYuvasi(yuvaAyar);
    assert.deepEqual(kayitlar, [raf, kart, yuva]);
    assert.deepEqual(tanimlar, [
      { tur: 'tahminRafi', etiketAnahtari: 'raf',
        hucreler: [{ ad: 'a', tur: 'sayac', min: 1, max: 3 }] },
      { tur: 'kuralKarti', kalip: 'x', anahtar: 'k1',
        disliler: [{ ad: 'a', secenekler: [1, 2] }] },
      { tur: 'kisayolYuvasi', kabulEdilen: ['k1'], sensorler: ['a'] }
    ]);
  });

  it('hücre dizisini öğeleri ve seçenekleriyle iki yönde bağımsız kopyalar', () => {
    const { defter, tanimlar } = tanimliOrtam();
    const ayar = rafAyari();
    ayar.hucreler.push({ ad: 'b', tur: 'secim', secenekler: ['x', 'y'] });
    const raf = defter.tahminRafi(ayar);
    const tanim = tanimlar[0];
    assert.notEqual(tanim.hucreler, ayar.hucreler);
    for (let i = 0; i < ayar.hucreler.length; i++) {
      assert.notEqual(tanim.hucreler[i], ayar.hucreler[i]);
    }
    assert.notEqual(tanim.hucreler[1].secenekler, ayar.hucreler[1].secenekler);
    ayar.hucreler[0].min = -5;
    ayar.hucreler[1].ad = 'c';
    ayar.hucreler[1].secenekler[0] = 'z';
    ayar.hucreler.push({ ad: 'd', tur: 'sayac', min: 0, max: 1 });
    assert.deepEqual(tanim.hucreler, [
      { ad: 'a', tur: 'sayac', min: 1, max: 3 },
      { ad: 'b', tur: 'secim', secenekler: ['x', 'y'] }
    ]);
    tanim.hucreler[0].max = 8;
    tanim.hucreler[1].ad = 'e';
    tanim.hucreler[1].secenekler.push('w');
    tanim.hucreler.pop();
    assert.equal(ayar.hucreler[0].max, 3);
    assert.equal(ayar.hucreler[1].ad, 'c');
    assert.deepEqual(ayar.hucreler[1].secenekler, ['z', 'y']);
    assert.equal(ayar.hucreler.length, 3);
    raf.hucreKoy('a', 3);
    raf.hucreKoy('b', 'y');
    assert.deepEqual(raf.deger(), { a: 3, b: 'y' });
    assert.throws(() => raf.hucreKoy('a', 8), HATA);
    assert.throws(() => raf.hucreKoy('b', 'w'), HATA);
  });

  it('dişli dizisini öğeleri ve seçenekleriyle iki yönde bağımsız kopyalar', () => {
    const { defter, tanimlar } = tanimliOrtam();
    const ayar = kartAyari();
    const kart = defter.kuralKarti(ayar);
    const tanim = tanimlar[0];
    assert.notEqual(tanim.disliler, ayar.disliler);
    assert.notEqual(tanim.disliler[0], ayar.disliler[0]);
    assert.notEqual(tanim.disliler[0].secenekler, ayar.disliler[0].secenekler);
    ayar.disliler[0].ad = 'b';
    ayar.disliler[0].secenekler[0] = 9;
    ayar.disliler.push({ ad: 'c', secenekler: ['x'] });
    assert.deepEqual(tanim.disliler, [{ ad: 'a', secenekler: [1, 2] }]);
    tanim.disliler[0].ad = 'd';
    tanim.disliler[0].secenekler.push(8);
    tanim.disliler.push({ ad: 'e', secenekler: ['y'] });
    assert.deepEqual(ayar.disliler, [
      { ad: 'b', secenekler: [9, 2] }, { ad: 'c', secenekler: ['x'] }
    ]);
    kart.disliCevir('a', 2);
    assert.deepEqual(kart.ayar(), { a: 2 });
    assert.equal(kart.dogruMu(), true);
    assert.throws(() => kart.disliCevir('a', 8), HATA);
  });

  it('kısayol kabul ve sensör dizilerini iki yönde bağımsız kopyalar', () => {
    const { defter, tanimlar } = tanimliOrtam();
    const ayar = yuvaAyari();
    const yuva = defter.kisayolYuvasi(ayar);
    const tanim = tanimlar[0];
    assert.notEqual(tanim.kabulEdilen, ayar.kabulEdilen);
    assert.notEqual(tanim.sensorler, ayar.sensorler);
    ayar.kabulEdilen[0] = 'k2';
    ayar.sensorler[0] = 'b';
    assert.deepEqual(tanim.kabulEdilen, ['k1']);
    assert.deepEqual(tanim.sensorler, ['a']);
    tanim.kabulEdilen.push('k3');
    tanim.sensorler.push('c');
    assert.deepEqual(ayar.kabulEdilen, ['k2']);
    assert.deepEqual(ayar.sensorler, ['b']);
    assert.equal(yuva.tak(defter.kuralKarti(kartAyari())), true);
    yuva.sok('a');
    assert.throws(() => yuva.sok('c'), HATA);
  });

  it('geçersiz alt fabrika ayarını nesne ve tanım kaydetmeden reddeder', () => {
    const { defter, tanimlar, kayitlar } = tanimliOrtam();
    const raf = rafAyari();
    raf.hucreler[0].max = 0;
    const kart = kartAyari();
    kart.disliler[0].secenekler = [];
    const yuva = yuvaAyari();
    yuva.sensorler = [1];
    assert.throws(() => defter.tahminRafi(raf), HATA);
    assert.throws(() => defter.kuralKarti(kart), HATA);
    assert.throws(() => defter.kisayolYuvasi(yuva), HATA);
    assert.deepEqual(tanimlar, []);
    assert.deepEqual(kayitlar, []);
  });
});
