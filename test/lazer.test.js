import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { lazerOlustur } from '../widget/lazer.js';
import { rngOlustur } from '../motor/rng.js';
import * as geo from '../geo/index.js';

const A = Object.freeze({ x: 100, y: 100 });
const B = Object.freeze({ x: 200, y: 100 });
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;

function lazerKur(mod) {
  const lazer = lazerOlustur({ mod });
  lazer.A = A;
  lazer.B = B;
  return lazer;
}

function sahneHazirla() {
  const cagrilar = [];
  const sahne = {};
  for (const ad of ['katman', 'parca', 'isin', 'dogru', 'pim', 'cember']) {
    sahne[ad] = (...arg) => cagrilar.push({ ad, arg });
  }
  return { sahne, cagrilar };
}

describe('lazerOlustur', () => {
  it('Başlangıçta iki pimi de boş bırakır ve henüz bir hat kurmaz.', () => {
    const lazer = lazerOlustur();
    dogrula.deepEqual(lazer.durum(), { mod: 'parca', A: null, B: null, yon: 0 });
    dogrula.equal(lazer.hat(), null);
    dogrula.deepEqual(lazer.gecerMi([A, B], 16), [false, false]);
    lazer.A = A;
    dogrula.equal(lazer.hat(), null);
    lazer.B = A;
    dogrula.equal(lazer.hat(), null);
  });

});

describe('lazerOlustur', () => {
  it('Üç modun hat biçimini ve değiştiğinde bildirilen sembolü korur.', () => {
    const semboller = [];
    const lazer = lazerOlustur({}, { goster: deger => semboller.push(deger) });
    lazer.A = A;
    lazer.B = B;
    dogrula.deepEqual(lazer.hat(), { A, B });
    lazer.mod = 'isin';
    dogrula.deepEqual(lazer.hat(), { A, yon: 0 });
    lazer.mod = 'dogru';
    dogrula.deepEqual(lazer.hat(), { A, yon: 0 });
    lazer.mod = 'dogru';
    dogrula.deepEqual(semboller, ['[AB]', '[AB', 'AB']);
    const hat = lazer.hat();
    hat.A.x = -100;
    dogrula.equal(lazer.A.x, A.x);
  });

});

describe('lazerOlustur', () => {
  it('Geçersiz ayarları reddeder ve yönü tam dereceye normalleştirir.', () => {
    for (const ayar of [null, [], { mod: 'yay' }, { carkAdim: 0 }, { carkAdim: 0.5 },
      { donenIsin: 'evet' }, { donenIsin: true, mod: 'parca' }]) {
      dogrula.throws(() => lazerOlustur(ayar), AYAR_HATASI);
    }
    dogrula.throws(() => lazerOlustur({}, {}), AYAR_HATASI);
    const lazer = lazerOlustur();
    lazer.yon = -1.2;
    dogrula.equal(lazer.yon, 359);
    dogrula.throws(() => { lazer.mod = 'yay'; }, AYAR_HATASI);
    dogrula.throws(() => { lazer.A = { x: NaN, y: 0 }; }, AYAR_HATASI);
    dogrula.throws(() => { lazer.yon = Infinity; }, AYAR_HATASI);
  });
});

describe('gecerMi', () => {
  it('Parça ve ışın uçlarını dik uzaklık toleransı ile uzatmaz.', () => {
    const noktalar = [
      { x: 99, y: 100 }, A, { x: 150, y: 100 }, B, { x: 201, y: 100 },
      { x: 150, y: 116 }, { x: 150, y: 116.01 }
    ];
    const beklenenler = {
      parca: [false, true, true, true, false, true, false],
      isin: [false, true, true, true, true, true, false],
      dogru: [true, true, true, true, true, true, false]
    };
    for (const mod of ['parca', 'isin', 'dogru']) {
      dogrula.deepEqual(lazerKur(mod).gecerMi(noktalar, 16), beklenenler[mod]);
    }
  });

});

describe('gecerMi', () => {
  it('Ters ve eğik yönde aynı parça ve ışın sınırlarını uygular.', () => {
    const lazer = lazerOlustur({ mod: 'parca' });
    lazer.A = { x: 200, y: 200 };
    lazer.B = { x: 100, y: 100 };
    const noktalar = [
      { x: 210, y: 210 }, { x: 200, y: 200 }, { x: 150, y: 150 },
      { x: 100, y: 100 }, { x: 90, y: 90 }
    ];
    dogrula.deepEqual(lazer.gecerMi(noktalar, 1), [false, true, true, true, false]);
    lazer.mod = 'isin';
    dogrula.deepEqual(lazer.gecerMi(noktalar, 1), [false, true, true, true, true]);
    dogrula.throws(() => lazer.gecerMi(noktalar, -1), /PARAMETRE_ARALIK_DISI/);
  });

});

describe('gecerMi', () => {
  it('Bin senaryoda sensörleri kabul eder ve bütün alarmları reddeder.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const { sensor, alarm } = geo.lazerSenaryosu(rngOlustur(seed));
      const dogru = { A: sensor[0], yon: geo.yonAci(sensor[0], sensor[1]) };
      dogrula.ok(sensor.every(P => geo.dogruUzerindeMi(P, dogru, 1e-6)));
      dogrula.ok(alarm.every(P => geo.noktaDogruUzakligi(P, dogru) >= 40 - 1e-6));
      for (const mod of ['parca', 'isin', 'dogru']) {
        const lazer = lazerOlustur({ mod });
        lazer.A = sensor[0];
        lazer.B = sensor[sensor.length - 1];
        dogrula.ok(lazer.gecerMi(sensor, geo.TOLERANS.pimYakalamaPx).every(Boolean));
        dogrula.ok(lazer.gecerMi(alarm, geo.TOLERANS.pimYakalamaPx).every(x => !x));
      }
    }
  });
});

describe('girdi', () => {
  it('A ve B sürüklemesini tüketir ve ilgisiz olayları düzeneğe bırakır.', () => {
    const lazer = lazerKur('parca');
    dogrula.equal(lazer.girdi({ tur: 'tik', x: 0, y: 0 }), false);
    dogrula.equal(lazer.girdi({ tur: 'bas', hedef: 'baska', x: 0, y: 0 }), false);
    dogrula.equal(lazer.girdi({ tur: 'bas', hedef: 'lazerA', x: 100, y: 100 }), true);
    dogrula.equal(lazer.girdi({ tur: 'surukle', x: 120, y: 130 }), true);
    dogrula.equal(lazer.girdi({ tur: 'birak', x: 120, y: 130 }), true);
    dogrula.deepEqual(lazer.A, { x: 120, y: 130 });
    dogrula.equal(lazer.girdi({ tur: 'surukle', x: 1, y: 2 }), false);
    dogrula.equal(lazer.girdi({ tur: 'surukle', hedef: 'lazerB', x: 250, y: 300 }), true);
    dogrula.deepEqual(lazer.B, { x: 250, y: 300 });
  });

});

describe('girdi', () => {
  it('Dönen ışın çarkı adımlı döner ve B pimi olmadan hat kurar.', () => {
    const lazer = lazerOlustur({ mod: 'isin', donenIsin: true, carkAdim: 5 });
    lazer.A = A;
    dogrula.deepEqual(lazer.hat(), { A, yon: 0 });
    dogrula.equal(lazer.girdi({ tur: 'bas', hedef: 'lazerCark', x: 0, y: 0 }), true);
    dogrula.equal(lazer.girdi({ tur: 'surukle', x: 0, y: 0, dx: -2 }), true);
    dogrula.equal(lazer.yon, 350);
    dogrula.equal(lazer.girdi({ tur: 'birak', x: 0, y: 0 }), true);
    lazer.yon = 90;
    dogrula.deepEqual(lazer.gecerMi([{ x: 100, y: 200 }, { x: 100, y: 99 }], 1),
      [true, false]);
    dogrula.equal(lazer.girdi({ tur: 'bas', hedef: 'lazerB', x: 0, y: 0 }), false);
    dogrula.throws(() => { lazer.mod = 'dogru'; }, AYAR_HATASI);
    dogrula.throws(() => lazer.girdi({ tur: 'surukle', hedef: 'lazerCark' }), AYAR_HATASI);
  });
});

describe('ciz', () => {
  it('Her modu üst katmanda doğru çizim çağrısıyla çizer ve durumunu değiştirmez.', () => {
    for (const mod of ['parca', 'isin', 'dogru']) {
      const lazer = lazerKur(mod);
      const once = lazer.durum();
      const { sahne, cagrilar } = sahneHazirla();
      lazer.ciz(sahne);
      dogrula.deepEqual(cagrilar.map(cagri => cagri.ad), ['katman', mod, 'pim', 'pim']);
      dogrula.deepEqual(cagrilar[0].arg, ['ust']);
      dogrula.equal(cagrilar[2].arg[1].id, 'lazerA');
      dogrula.equal(cagrilar[3].arg[1].id, 'lazerB');
      dogrula.deepEqual(lazer.durum(), once);
    }
  });

});

describe('ciz', () => {
  it('Dönen ışının çarkını hedef kimliğiyle çizer ve ölçü sayısı göstermez.', () => {
    const lazer = lazerOlustur({ mod: 'isin', donenIsin: true });
    lazer.A = A;
    const { sahne, cagrilar } = sahneHazirla();
    lazer.ciz(sahne);
    dogrula.deepEqual(cagrilar.map(cagri => cagri.ad), ['katman', 'isin', 'pim', 'cember', 'pim']);
    dogrula.equal(cagrilar[4].arg[1].id, 'lazerCark');
    const bos = sahneHazirla();
    lazerOlustur().ciz(bos.sahne);
    dogrula.deepEqual(bos.cagrilar, [{ ad: 'katman', arg: ['ust'] }]);
  });
});

describe('durum', () => {
  it('Durumu bağımsız nesnelerle kaydeder ve geri yükler.', () => {
    const ilk = lazerKur('isin');
    ilk.yon = 45;
    const kayit = JSON.parse(JSON.stringify(ilk.durum()));
    const semboller = [];
    const ikinci = lazerOlustur({}, { goster: deger => semboller.push(deger) });
    ikinci.yukle(kayit);
    dogrula.deepEqual(ikinci.durum(), ilk.durum());
    kayit.A.x = 0;
    dogrula.equal(ikinci.A.x, A.x);
    const kopya = ikinci.durum();
    kopya.B.x = 0;
    dogrula.equal(ikinci.B.x, B.x);
    dogrula.deepEqual(semboller, ['[AB]', '[AB']);
  });

});

describe('durum', () => {
  it('Bozuk kayıt yüklenirken mevcut durumu kısmen değiştirmez.', () => {
    const lazer = lazerKur('dogru');
    const once = lazer.durum();
    dogrula.throws(() => lazer.yukle({ mod: 'isin', A, B, yon: NaN }), AYAR_HATASI);
    dogrula.throws(() => lazer.yukle({ mod: 'isin', A }), AYAR_HATASI);
    dogrula.deepEqual(lazer.durum(), once);
  });
});
