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
});
