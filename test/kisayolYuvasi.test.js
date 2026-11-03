import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { kisayolYuvasiOlustur } from '../defter/kisayolYuvasi.js';
import { rngOlustur } from '../motor/rng.js';

const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;

function ayarKur(ek = {}) {
  return {
    kabulEdilen: ['k1'], sensorler: ['a', 'b', 'c'],
    cozucu: () => ({ tamam: true, doldurulan: ['a'], eksik: [] }), ...ek
  };
}

function ortamKur() {
  const sozler = [];
  return { sozler, ortam: {
    rng: rngOlustur(1), sahne: {}, matik: { soyle: anahtar => sozler.push(anahtar) }
  } };
}

describe('kisayolYuvasiOlustur', () => {
  it('İki parametre alır ve kart takılmadan boş yuva kurar.', () => {
    dogrula.equal(kisayolYuvasiOlustur.length, 2);
    const yuva = kisayolYuvasiOlustur(ayarKur(), ortamKur().ortam);
    dogrula.equal(yuva.kart, null);
    dogrula.deepEqual(yuva.sokulen, []);
    dogrula.deepEqual(yuva.degerlendir(), { lamba: false, kurtarilan: 0, eksik: [] });
  });

  it('Geçersiz ayarları ve eksik ortam alanlarını reddeder.', () => {
    const { ortam } = ortamKur();
    for (const ayar of [undefined, null, {}, ayarKur({ kabulEdilen: 'k1' }),
      ayarKur({ kabulEdilen: [1] }), ayarKur({ sensorler: ['a', null] }),
      ayarKur({ sensorler: {} }), ayarKur({ cozucu: null })]) {
      dogrula.throws(() => kisayolYuvasiOlustur(ayar, ortam), AYAR_HATASI);
    }
    dogrula.throws(() => kisayolYuvasiOlustur(ayarKur()), AYAR_HATASI);
    for (const ad of ['rng', 'sahne', 'matik']) {
      dogrula.throws(() => kisayolYuvasiOlustur(ayarKur(), {
        ...ortam, [ad]: undefined
      }), AYAR_HATASI);
    }
  });

  it('Başlangıç ayarındaki dizilerin sonradan değişmesinden etkilenmez.', () => {
    const ayar = ayarKur();
    const yuva = kisayolYuvasiOlustur(ayar, ortamKur().ortam);
    ayar.kabulEdilen.push('k2');
    ayar.sensorler.push('d');
    dogrula.equal(yuva.tak({ anahtar: 'k2' }), false);
    dogrula.throws(() => yuva.sok('d'), AYAR_HATASI);
  });

  it('Kabul edilen kart ve sensör dizilerindeki boş yuvaları reddeder.', () => {
    const { ortam } = ortamKur();
    for (const ad of ['kabulEdilen', 'sensorler']) {
      for (const dizi of [new Array(1), ['a', , 'c']]) {
        dogrula.throws(() => kisayolYuvasiOlustur(ayarKur({ [ad]: dizi }), ortam),
          AYAR_HATASI);
      }
    }
  });
});

describe('tak', () => {
  it('Kabul dışı kart için yanlış kart sözünü söyler ve takılı kartı korur.', () => {
    const { ortam, sozler } = ortamKur();
    const yuva = kisayolYuvasiOlustur(ayarKur(), ortam);
    const kart = { anahtar: 'k1' };
    dogrula.equal(yuva.tak(kart), true);
    dogrula.equal(yuva.kart, kart);
    dogrula.equal(yuva.tak({ anahtar: 'k2' }), false);
    dogrula.equal(yuva.kart, kart);
    dogrula.deepEqual(sozler, ['kartUymaz']);
  });
});

describe('sok', () => {
  it('Bilinmeyen sensörü reddeder ve aynı sensörü yalnız bir kez söker.', () => {
    const yuva = kisayolYuvasiOlustur(ayarKur(), ortamKur().ortam);
    dogrula.throws(() => yuva.sok('d'), AYAR_HATASI);
    yuva.sok('b');
    yuva.sok('b');
    dogrula.deepEqual(yuva.sokulen, ['b']);
    const kopya = yuva.sokulen;
    kopya.push('a');
    dogrula.deepEqual(yuva.sokulen, ['b']);
  });
});

describe('tak_sensor', () => {
  it('Sökülen sensörü geri takar ve yeniden çağrılınca durumu korur.', () => {
    const yuva = kisayolYuvasiOlustur(ayarKur(), ortamKur().ortam);
    yuva.sok('a');
    yuva.sok('b');
    yuva.tak_sensor('a');
    yuva.tak_sensor('a');
    dogrula.deepEqual(yuva.sokulen, ['b']);
    yuva.tak_sensor('b');
    dogrula.deepEqual(yuva.sokulen, []);
  });
});

describe('degerlendir', () => {
  it('Kart yokken sökülenleri eksik döndürür ve çözücüyü çağırmaz.', () => {
    const ayar = ayarKur({ cozucu() { dogrula.fail('Çözücü çağrılmamalıdır.'); } });
    const yuva = kisayolYuvasiOlustur(ayar, ortamKur().ortam);
    yuva.sok('b');
    const sonuc = yuva.degerlendir();
    dogrula.deepEqual(sonuc, { lamba: false, kurtarilan: 0, eksik: ['b'] });
    sonuc.eksik.push('a');
    dogrula.deepEqual(yuva.sokulen, ['b']);
  });

  it('Çözücüye kalan sensörleri bir değeriyle ve takılı kartla gönderir.', () => {
    const cagrilar = [];
    const eksik = ['c'];
    const ayar = ayarKur({ cozucu(kalan, kart) {
      cagrilar.push({ kalan, kart });
      return { tamam: false, doldurulan: ['a', 'b'], eksik };
    } });
    const yuva = kisayolYuvasiOlustur(ayar, ortamKur().ortam);
    const kart = { anahtar: 'k1' };
    yuva.tak(kart);
    yuva.sok('b');
    const sonuc = yuva.degerlendir();
    dogrula.deepEqual(cagrilar, [{ kalan: { a: 1, c: 1 }, kart }]);
    dogrula.deepEqual(sonuc, { lamba: false, kurtarilan: 2, eksik: ['c'] });
    sonuc.eksik.push('a');
    dogrula.deepEqual(eksik, ['c']);
    yuva.tak_sensor('b');
    yuva.degerlendir();
    dogrula.deepEqual(cagrilar[1], { kalan: { a: 1, b: 1, c: 1 }, kart });
  });

  it('Bütün sensörler sökülmüşse çözücüye boş kayıt gönderir.', () => {
    const ayar = ayarKur({ cozucu(kalan) {
      dogrula.deepEqual(kalan, {});
      return { tamam: true, doldurulan: ['a', 'b', 'c'], eksik: [] };
    } });
    const yuva = kisayolYuvasiOlustur(ayar, ortamKur().ortam);
    yuva.tak({ anahtar: 'k1' });
    for (const ad of ayar.sensorler) yuva.sok(ad);
    dogrula.deepEqual(yuva.degerlendir(), { lamba: true, kurtarilan: 3, eksik: [] });
  });
});
