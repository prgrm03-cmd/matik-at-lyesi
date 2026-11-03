import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { pergelOlustur } from '../widget/pergel.js';
import { rngOlustur } from '../motor/rng.js';
import { sahteSahneOlustur } from '../motor/sahteSahne.js';
import { TOLERANS, uzaklik } from '../geo/index.js';

const ORTAM = { pxToBirim: px => px };
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;
const A = Object.freeze({ x: 110.5, y: 220.25 });
const B = Object.freeze({ x: 430.75, y: 511.5 });

function pergelKur(ayar = {}) {
  return pergelOlustur({ olcuKilidi: false, ...ayar }, ORTAM);
}

function kilideTikla(pergel) {
  return pergel.girdi({ tur: 'tik', hedef: 'pergelKilit', x: 500, y: 404 });
}

describe('pergelOlustur', () => {
  it('İki parametre alır ve sözleşmedeki başlangıç değerlerini kullanır.', () => {
    dogrula.equal(pergelOlustur.length, 2);
    const pergel = pergelKur();
    dogrula.deepEqual(pergel.durum(), {
      merkez: { x: 500, y: 500 }, aciklik: 160, kilit: false,
      kilitKaynagi: null, renk: 'mavi', olcuKilidi: false
    });
    const ayar = { merkez: A, aciklik: 182.75, kilitli: true, renk: 'turuncu' };
    dogrula.deepEqual(pergelKur(ayar).durum(), {
      merkez: A, aciklik: 182.75, kilit: true,
      kilitKaynagi: 'ayar', renk: 'turuncu', olcuKilidi: false
    });
  });

  it('Ölçü kilidi veya piksel dönüşümü eksikse ayar hatası verir.', () => {
    for (const ayar of [undefined, null, [], {}, { olcuKilidi: 1 },
      { olcuKilidi: false, dogru: {} }]) {
      dogrula.throws(() => pergelOlustur(ayar, ORTAM), AYAR_HATASI);
    }
    for (const ortam of [undefined, null, {}, { pxToBirim: 1 },
      { pxToBirim: () => 0 }, { pxToBirim: () => NaN }]) {
      dogrula.throws(() => pergelOlustur({ olcuKilidi: false }, ortam), AYAR_HATASI);
    }
    for (const ayar of [{ aciklik: Infinity }, { merkez: { x: 0, y: NaN } },
      { kilitli: 'evet' }, { renk: 'yesil' }]) {
      dogrula.throws(() => pergelKur(ayar), AYAR_HATASI);
    }
  });

  it('Açıklığı güncel piksel dönüşümüyle ve merkezi tezgâhla sınırlar.', () => {
    const olcek = { deger: 2 };
    const ortam = { pxToBirim: px => px * olcek.deger };
    const pergel = pergelOlustur({
      merkez: { x: -15, y: 1001 }, aciklik: -1, olcuKilidi: true
    }, ortam);
    dogrula.equal(pergel.aciklik, TOLERANS.pimYakalamaPx * 2);
    dogrula.deepEqual(pergel.merkez, { x: 0, y: 1000 });
    olcek.deger = 3;
    pergel.aciklik = 0;
    dogrula.equal(pergel.aciklik, TOLERANS.pimYakalamaPx * 3);
    pergel.acikligiAl(A, A);
    dogrula.equal(pergel.aciklik, TOLERANS.pimYakalamaPx * 3);
  });
});

describe('acikligiAl', () => {
  it('Bin tohumda parça uzunluğunu çemberin yarıçapına taşır ve kilitler.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = rngOlustur(seed);
      const P = { x: rng.tam(100, 400), y: rng.tam(100, 400) };
      const Q = { x: rng.tam(600, 900), y: rng.tam(600, 900) };
      const pergel = pergelKur();
      pergel.acikligiAl(P, Q);
      const r = pergel.cemberCiz().r;
      dogrula.ok(Math.abs(r - uzaklik(P, Q)) <= TOLERANS.uzunlukOran * r);
      dogrula.equal(pergel.kilit, true);
      dogrula.equal(pergel.durum().kilitKaynagi, 'parca');
    }
  });

  it('Parçadan alınan kilidi tıklama veya yeniden kilitleme açamaz.', () => {
    const pergel = pergelKur();
    pergel.acikligiAl(A, B);
    const once = pergel.durum();
    dogrula.equal(kilideTikla(pergel), true);
    pergel.kilitle();
    dogrula.equal(kilideTikla(pergel), true);
    dogrula.deepEqual(pergel.durum(), once);
  });
});

describe('kopyala', () => {
  it('Kaynak açıklığını bağımsız kopyalar ve öğrenci tıkına karşı kilitler.', () => {
    const kaynak = pergelKur({ aciklik: 251.375 });
    const hedef = pergelKur();
    hedef.kopyala(kaynak);
    dogrula.equal(hedef.cemberCiz().r, kaynak.cemberCiz().r);
    dogrula.equal(hedef.kilit, true);
    dogrula.equal(hedef.durum().kilitKaynagi, 'kopya');
    kaynak.aciklik = 321;
    dogrula.equal(hedef.aciklik, 251.375);
    dogrula.equal(kilideTikla(hedef), true);
    dogrula.equal(hedef.kilit, true);
  });
});

describe('kilitle', () => {
  it('Elle ve ayarla konan kilitleri öğrenci tıklamasıyla açar.', () => {
    const pergel = pergelKur({ kilitli: true });
    dogrula.equal(kilideTikla(pergel), true);
    dogrula.equal(pergel.kilit, false);
    pergel.kilitle();
    dogrula.equal(pergel.kilit, true);
    dogrula.equal(kilideTikla(pergel), true);
    dogrula.equal(pergel.kilit, false);
    dogrula.equal(kilideTikla(pergel), true);
    dogrula.equal(pergel.kilit, true);
  });
});

describe('girdi', () => {
  it('Merkezi fark vektörüyle taşır ve açıklığı değiştirmeden tezgâhta tutar.', () => {
    const pergel = pergelKur({ merkez: A, aciklik: 182.75 });
    dogrula.equal(pergel.girdi({ tur: 'bas', hedef: 'pergelMerkez', ...A }), true);
    dogrula.equal(pergel.girdi({ tur: 'surukle', dx: 20.25, dy: -10.5 }), true);
    dogrula.deepEqual(pergel.merkez, { x: 130.75, y: 209.75 });
    dogrula.equal(pergel.girdi({ tur: 'surukle', dx: -1000, dy: 1000 }), true);
    dogrula.deepEqual(pergel.merkez, { x: 0, y: 1000 });
    dogrula.equal(pergel.girdi({ tur: 'birak' }), true);
    dogrula.equal(pergel.girdi({ tur: 'surukle', dx: 1, dy: 1 }), false);
    dogrula.equal(pergel.aciklik, 182.75);
  });

  it('Uç sürüklemesini yalnız açık kilitte uygular ve alt sınırı korur.', () => {
    const pergel = pergelKur({ merkez: A });
    dogrula.equal(pergel.girdi({ tur: 'surukle', hedef: 'pergelUc', ...B }), true);
    dogrula.equal(pergel.aciklik, uzaklik(A, B));
    pergel.kilitle();
    const once = pergel.aciklik;
    dogrula.equal(pergel.girdi({ tur: 'bas', hedef: 'pergelUc', ...B }), true);
    dogrula.equal(pergel.girdi({ tur: 'surukle', x: 900, y: 900 }), true);
    dogrula.equal(pergel.girdi({ tur: 'birak', x: 900, y: 900 }), true);
    dogrula.equal(pergel.aciklik, once);
    kilideTikla(pergel);
    dogrula.equal(pergel.girdi({ tur: 'surukle', hedef: 'pergelUc', ...A }), true);
    dogrula.equal(pergel.aciklik, TOLERANS.pimYakalamaPx);
  });

  it('Yakalama hesabı yapmaz ve ilgisiz olayları tüketmez.', () => {
    const pergel = pergelKur();
    for (const olay of [null, { tur: 'bas', x: 500, y: 500 },
      { tur: 'surukle', hedef: 'baska', dx: 1, dy: 1 },
      { tur: 'tik', hedef: 'pergelMerkez' }, { tur: 'tus', hedef: 'pergelUc' }]) {
      dogrula.equal(pergel.girdi(olay), false);
    }
  });
});

describe('cemberCiz', () => {
  it('Yeni geometri döndürür ve merkez kopyasını iç durumdan ayırır.', () => {
    const pergel = pergelKur({ merkez: A, aciklik: 221.875 });
    const cember = pergel.cemberCiz();
    dogrula.deepEqual(cember, { merkez: A, r: 221.875 });
    dogrula.notEqual(cember, pergel.cemberCiz());
    cember.merkez.x = 0;
    dogrula.deepEqual(pergel.merkez, A);
  });
});

describe('yayCiz', () => {
  it('Açıları yuvarlamadan normalleştirir ve varsayılan saat yönünü korur.', () => {
    const pergel = pergelKur({ merkez: A, aciklik: 221.875 });
    dogrula.equal(pergel.yayCiz.length, 3);
    dogrula.deepEqual(pergel.yayCiz(-30.25, 420.5), {
      merkez: A, r: 221.875, bas: 329.75, bit: 60.5, yon: 'saat'
    });
    const yay = pergel.yayCiz(360, -720, 'ters');
    dogrula.deepEqual(yay, { merkez: A, r: 221.875, bas: 0, bit: 0, yon: 'ters' });
    yay.merkez.y = 0;
    dogrula.deepEqual(pergel.merkez, A);
    dogrula.throws(() => pergel.yayCiz(0, 90, 'sag'), AYAR_HATASI);
  });
});

describe('ciz', () => {
  it('Ölçü kilidinde bin çizimde sayı çağrısı yapmaz ve durumu değiştirmez.', () => {
    for (const olcuKilidi of [true, false]) {
      const pergel = pergelKur({ olcuKilidi, aciklik: 175.625 });
      const once = pergel.durum();
      const { sahne, kayit } = sahteSahneOlustur({});
      for (let i = 0; i < 1000; i++) pergel.ciz(sahne);
      dogrula.equal(kayit.sayac.sayi, olcuKilidi ? 0 : 1000);
      if (!olcuKilidi) {
        dogrula.ok(kayit.cagrilar.filter(c => c.ad === 'sayi').every(c => c.arg[1] === 176));
      }
      dogrula.deepEqual(pergel.durum(), once);
    }
  });

  it('Üst katmanda iki bacağı ve sabit kimlikleri çizerken kilide halka ekler.', () => {
    const pergel = pergelKur({ renk: 'turuncu', olcuKilidi: true });
    const acik = sahteSahneOlustur({});
    pergel.ciz(acik.sahne);
    dogrula.deepEqual(acik.kayit.cagrilar[0], { ad: 'katman', arg: ['ust'] });
    dogrula.equal(acik.kayit.sayac.parca, 2);
    const pimler = acik.kayit.cagrilar.filter(c => c.ad === 'pim');
    dogrula.deepEqual(pimler.map(c => c.arg[1].id),
      ['pergelMerkez', 'pergelUc', 'pergelKilit']);
    dogrula.equal(pimler[0].arg[1].renk, 'turuncu');
    dogrula.equal(pimler[1].arg[1].boyut, 'kucuk');
    dogrula.equal(pimler[2].arg[1].renk, 'gri');
    dogrula.equal(acik.kayit.sayac.cember || 0, 0);
    pergel.kilitle();
    const kapali = sahteSahneOlustur({});
    pergel.ciz(kapali.sahne);
    dogrula.equal(kapali.kayit.sayac.cember, 1);
    const halka = kapali.kayit.cagrilar.find(c => c.ad === 'cember');
    dogrula.deepEqual(halka.arg[0].merkez, pimler[1].arg[0]);
    const kilit = kapali.kayit.cagrilar.find(c => c.arg[1]?.id === 'pergelKilit');
    dogrula.equal(kilit.arg[1].renk, 'turuncu');
  });
});

describe('durum', () => {
  it('Ham değerleri ve kalıcı kilit kaynağını bağımsız kayıtla geri yükler.', () => {
    const pergel = pergelKur({ merkez: A, renk: 'turuncu', olcuKilidi: true });
    pergel.acikligiAl(A, B);
    const kayit = JSON.parse(JSON.stringify(pergel.durum()));
    const ikinci = pergelKur();
    ikinci.yukle(kayit);
    dogrula.deepEqual(ikinci.durum(), pergel.durum());
    dogrula.equal(ikinci.aciklik, uzaklik(A, B));
    dogrula.notEqual(ikinci.aciklik, Math.round(ikinci.aciklik));
    kayit.merkez.x = 0;
    const kopya = ikinci.durum();
    kopya.merkez.y = 0;
    dogrula.deepEqual(ikinci.merkez, A);
    dogrula.equal(kilideTikla(ikinci), true);
    dogrula.equal(ikinci.kilit, true);
  });

  it('Bozuk kayıt mevcut durumu kısmen değiştirmez.', () => {
    const pergel = pergelKur({ merkez: A });
    const once = pergel.durum();
    dogrula.throws(() => pergel.yukle({ ...once, aciklik: NaN }), AYAR_HATASI);
    dogrula.throws(() => pergel.yukle({ ...once, kilitKaynagi: 'parca' }), AYAR_HATASI);
    dogrula.deepEqual(pergel.durum(), once);
  });
});
