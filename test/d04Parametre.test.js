import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import * as D04 from '../duzenekler/D04/D04.js';
import { ctxSahteOlustur } from '../motor/ctxSahte.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { gozlemBagla, duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D04/D04.json', import.meta.url), 'utf8'));
const ADLAR = ['konum', 'konum', 'aci', 'ayrim', 'ayrim', 'aci', 'kayma',
  ...Array(10).fill('konum')];

function baglam(seed = 42) {
  const ctx = ctxSahteOlustur('D04', structuredClone(VERI), seed);
  const gozlem = gozlemBagla(ctx);
  D04.kur(ctx, seed);
  return { ctx, gozlem };
}

function noktalar(durum) {
  return [durum.M, ...durum.ledler.map(led => led.P), durum.cubuk.A, durum.cubuk.B,
    ...durum.ekPimler.map(pim => pim.P)];
}

describe('D04 parametre denetimi', () => {
  it('gerçek kurulumları doğrular, durumu ve sonraki RNG değerini korur', () => {
    for (const seed of [17, 42, 101]) {
      const { ctx, gozlem } = baglam(seed);
      const yalin = ctxSahteOlustur('D04', VERI, seed);
      D04.kur(yalin, seed);
      const once = JSON.stringify(ctx.durum);
      assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      assert.equal(JSON.stringify(ctx.durum), once);
      assert.equal(once, JSON.stringify(yalin.durum));
      assert.equal(gozlem.tam.length, 17);
      assert.equal(ctx.rng.tam(0, 1000), yalin.rng.tam(0, 1000));
    }
  });

  it('alt akış ve kurulum sonrası çekilişleri D04 parametrelerine katmaz', () => {
    const ctx = ctxSahteOlustur('D04', VERI, 42);
    const gozlem = gozlemBagla(ctx);
    ctx.rng.alt('widget:aciolcer').tam(0, 359);
    D04.kur(ctx, 42);
    gozlem.asama = 'ipucu';
    ctx.rng.tam(0, 359);
    assert.equal(gozlem.tam.length, 17);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
  });

  it('17 çağrının her birinde JSON aralığının iki ucunu doğrular', () => {
    for (const [i, ad] of ADLAR.entries()) {
      for (const uc of ['min', 'max']) {
        const { ctx, gozlem } = baglam();
        assert.equal(gozlem.tam[i][uc], VERI.parametreler[ad][uc]);
        gozlem.tam[i][uc]++;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D04RngAraligi:' + ad });
      }
    }
  });

  it('ham RNG değerlerinin sınırlarını kabul eder, aralık ihlallerini reddeder', () => {
    for (const [i, ad] of ADLAR.entries()) {
      const { min, max } = VERI.parametreler[ad];
      for (const deger of [min, max, min - 1, max + 1, NaN, Infinity, '500']) {
        const { ctx, gozlem } = baglam();
        gozlem.tam[i].deger = deger;
        if (deger === min || deger === max) {
          assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
        } else {
          assert.throws(() => duzenekParametreleriniDogrula(ctx),
            { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:' + ad });
        }
      }
    }
  });

  it('yarıçapı durumdan okuyup JSON aralığına göre denetler', () => {
    for (const r of [120, 220, 119, 221, NaN, Infinity, '150', undefined]) {
      const { ctx } = baglam();
      ctx.durum.r = r;
      if (r === 120 || r === 220) {
        assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      } else {
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:yaricap' });
      }
    }
  });

  it('M, üç LED, çubuk uçları ve üç ek pimin bütün eksenlerini denetler', () => {
    for (let i = 0; i < 9; i++) {
      for (const eksen of ['x', 'y']) {
        for (const deger of [0, 1000, -1, 1001, NaN, Infinity, '500', undefined]) {
          const { ctx } = baglam();
          noktalar(ctx.durum)[i][eksen] = deger;
          if (deger === 0 || deger === 1000) {
            assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
          } else {
            assert.throws(() => duzenekParametreleriniDogrula(ctx),
              { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D04TezgahSiniri' });
          }
        }
      }
    }
  });

  it('eksik veya fazla LED ve ek pimi reddeder', () => {
    for (const ad of ['ledler', 'ekPimler']) {
      for (const liste of [undefined, null, [], [{}, {}], [{}, {}, {}, {}]]) {
        const { ctx } = baglam();
        ctx.durum[ad] = liste;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'IMZA_EKSIK', denetim: 'D04NoktalarEksik:' + ad });
      }
    }
  });

  it('ek pim hedeflerinin yalnız üzeri, iç, dış permütasyonlarını kabul eder', () => {
    const gecerli = [
      ['uzeri', 'ic', 'dis'], ['uzeri', 'dis', 'ic'], ['ic', 'uzeri', 'dis'],
      ['ic', 'dis', 'uzeri'], ['dis', 'uzeri', 'ic'], ['dis', 'ic', 'uzeri']
    ];
    const bozuk = [['uzeri', 'uzeri', 'dis'], ['ic', 'ic', 'ic'],
      ['uzeri', 'ic', 'baska'], ['uzeri', 'ic', undefined]];
    for (const hedefler of [...gecerli, ...bozuk]) {
      const { ctx } = baglam();
      ctx.durum.ekPimler.forEach((pim, i) => { pim.hedef = hedefler[i]; });
      if (gecerli.includes(hedefler)) {
        assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      } else {
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D04Hedefler' });
      }
    }
  });

  it('kurulum gözlemi olmadan başarılı veya denetimsiz saymaz', () => {
    const ctx = ctxSahteOlustur('D04', VERI, 42);
    D04.kur(ctx, 42);
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'D04GozlemEksik' });
  });

  it('eksik, fazla ve boş RNG gözlemini reddeder', () => {
    for (const adet of [0, 16, 18]) {
      const { ctx, gozlem } = baglam();
      gozlem.tam.length = adet;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D04GozlemEksik' });
    }
    for (const i of ADLAR.keys()) {
      const { ctx, gozlem } = baglam();
      delete gozlem.tam[i];
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D04GozlemEksik' });
    }
  });

  it('süreyi kurulum yerine gerçek animasyonda denetler', () => {
    const { ctx } = baglam();
    assert.equal(ctx.durum.sure, undefined);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
    assert.deepEqual(kuruKos(D04, VERI, 42).gozlem.parametreDenetimsiz, []);
    for (const sure of [899, 901]) {
      const bozuk = { ...D04, calistir(ctx) {
        return { ...D04.calistir(ctx), sure };
      } };
      assert.throws(() => kuruKos(bozuk, VERI, 42),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:sure' });
    }
  });

  it('JSON dışlamasını ve eşlemesiz yeni parametreyi sessizce geçirmez', () => {
    const { ctx } = baglam();
    ctx.veri = structuredClone(ctx.veri);
    ctx.veri.parametreler.yaricap.haric = [ctx.durum.r];
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreHaric:yaricap' });
    const diger = baglam().ctx;
    diger.veri = structuredClone(diger.veri);
    diger.veri.parametreler.yeni = { min: 0, max: 1 };
    assert.throws(() => duzenekParametreleriniDogrula(diger),
      { message: 'IMZA_EKSIK', denetim: 'parametreEksik:yeni' });
  });
});
