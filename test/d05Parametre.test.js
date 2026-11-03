import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import * as D05 from '../duzenekler/D05/D05.js';
import { ctxSahteOlustur } from '../motor/ctxSahte.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { gozlemBagla, duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D05/D05.json', import.meta.url), 'utf8'));
const ADLAR = ['konum', 'konum', 'aci', 'aci', 'konum', 'konum', 'aci'];

function baglam(seed = 42) {
  const ctx = ctxSahteOlustur('D05', structuredClone(VERI), seed);
  const gozlem = gozlemBagla(ctx);
  D05.kur(ctx, seed);
  return { ctx, gozlem };
}

function noktalar(durum) {
  return [durum.M0, ...durum.isaretler, ...durum.hedefler.map(hedef => hedef.merkez),
    durum.cubuk.A, durum.cubuk.B];
}

function siniraTasi(durum, i, eksen, deger) {
  // Merkezler kurulumda aynı nesne olabilir; her yolun denetimini ayrı sınayalım.
  durum.hedefler = durum.hedefler.map(hedef => ({ ...hedef, merkez: { ...hedef.merkez } }));
  const nokta = noktalar(durum)[i];
  nokta[eksen] = deger;
  if (deger !== 0 && deger !== 1000) return;
  if (i === 0) durum.hedefler[0].merkez = { ...durum.M0 };
  if (i === 3) durum.M0 = { ...durum.hedefler[0].merkez };
  if (i === 6 || i === 7) {
    const diger = durum.cubuk[i === 6 ? 'B' : 'A'];
    const dikEksen = eksen === 'x' ? 'y' : 'x';
    diger[eksen] = deger;
    diger[dikEksen] = nokta[dikEksen] + durum.r;
  }
}

describe('D05 parametre denetimi', () => {
  it('gerçek kurulumları doğrular, durumu ve sonraki RNG değerini korur', () => {
    for (const seed of [17, 42, 101]) {
      const { ctx, gozlem } = baglam(seed);
      const yalin = ctxSahteOlustur('D05', VERI, seed);
      D05.kur(yalin, seed);
      const once = JSON.stringify(ctx.durum);
      const onceGozlem = JSON.stringify(gozlem);
      assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      assert.equal(JSON.stringify(ctx.durum), once);
      assert.equal(JSON.stringify(gozlem), onceGozlem);
      assert.equal(once, JSON.stringify(yalin.durum));
      assert.equal(gozlem.tam.length, 7);
      assert.equal(gozlem.haric.length, 1);
      assert.equal(gozlem.haric[0].deger, ctx.durum.r);
      assert.equal(ctx.rng.tam(0, 1000), yalin.rng.tam(0, 1000));
    }
  });

  it('alt akış ve kurulum sonrası çekilişleri D05 parametrelerine katmaz', () => {
    const ctx = ctxSahteOlustur('D05', VERI, 42);
    const gozlem = gozlemBagla(ctx);
    ctx.rng.alt('widget:pergel').tam(0, 359);
    D05.kur(ctx, 42);
    gozlem.asama = 'ipucu';
    ctx.rng.tam(0, 359);
    assert.equal(gozlem.tam.length, 7);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
  });

  it('yedi çağrının her birinde JSON aralığının iki ucunu doğrular', () => {
    for (const [i, ad] of ADLAR.entries()) {
      for (const uc of ['min', 'max']) {
        const { ctx, gozlem } = baglam();
        assert.equal(gozlem.tam[i][uc], VERI.parametreler[ad][uc]);
        gozlem.tam[i][uc]++;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05RngAraligi:' + ad });
      }
    }
  });

  it('ham RNG değerlerinin sınırlarını kabul eder, aralık ihlallerini reddeder', () => {
    for (const [i, ad] of ADLAR.entries()) {
      const { min, max } = VERI.parametreler[ad];
      for (const deger of [min, max, min - 1, max + 1, NaN, Infinity, '500', undefined]) {
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
    for (const r of [80, 130, 79, 131]) {
      const { ctx } = baglam();
      ctx.durum.r = r;
      ctx.durum.hedefler.forEach(hedef => { hedef.r = r; });
      ctx.durum.cubuk.B = ctx.geo.ilerle(ctx.durum.cubuk.A, 0, r);
      if (r === 80 || r === 130) {
        assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      } else {
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:yaricap' });
      }
    }
    for (const r of [NaN, Infinity, '100', undefined]) {
      const { ctx } = baglam();
      ctx.durum.r = r;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI' });
    }
  });

  it('M0, iki işaret, üç hedef merkezi ve çubuk uçlarının bütün eksenlerini denetler', () => {
    for (let i = 0; i < 8; i++) {
      for (const eksen of ['x', 'y']) {
        for (const deger of [0, 1000, -1, 1001, NaN, Infinity, '500', undefined]) {
          const { ctx } = baglam();
          siniraTasi(ctx.durum, i, eksen, deger);
          if (deger === 0 || deger === 1000) {
            assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
          } else {
            assert.throws(() => duzenekParametreleriniDogrula(ctx),
              { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05TezgahSiniri' });
          }
        }
      }
    }
  });

  it('eksik, fazla ve delikli işaret listesini reddeder', () => {
    for (const liste of [undefined, null, [], [{}], [{}, {}, {}]]) {
      const { ctx } = baglam();
      ctx.durum.isaretler = liste;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D05NoktalarEksik:isaretler' });
    }
    for (const i of [0, 1]) {
      const { ctx } = baglam();
      delete ctx.durum.isaretler[i];
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05TezgahSiniri' });
    }
  });

  it('hedef sayısını ve her hedefin yarıçapını denetler', () => {
    for (const adet of [0, 2, 4]) {
      const { ctx } = baglam();
      ctx.durum.hedefler.length = adet;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Hedefler' });
    }
    for (const hedefler of [undefined, null, {}]) {
      const { ctx } = baglam();
      ctx.durum.hedefler = hedefler;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Hedefler' });
    }
    for (const i of [0, 1, 2]) {
      for (const r of [0, 131, NaN, Infinity, '100', undefined]) {
        const { ctx } = baglam();
        ctx.durum.hedefler[i].r = r;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Hedefler' });
      }
    }
  });

  it('eksik hedef merkezlerini ve çubuk uçlarını reddeder', () => {
    for (const i of [0, 1, 2]) {
      for (const hedef of [undefined, null, { r: 100 }]) {
        const { ctx } = baglam();
        ctx.durum.hedefler[i] = hedef;
        if (hedef === undefined) delete ctx.durum.hedefler[i];
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05TezgahSiniri' });
      }
    }
    for (const ad of ['A', 'B']) {
      const { ctx } = baglam();
      delete ctx.durum.cubuk[ad];
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05TezgahSiniri' });
    }
  });

  it('ilk hedef merkezini M0 koordinatlarıyla karşılaştırır', () => {
    const { ctx } = baglam();
    ctx.durum.hedefler[0].merkez = { ...ctx.durum.M0 };
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
    for (const eksen of ['x', 'y']) {
      const { ctx: bozuk } = baglam();
      bozuk.durum.hedefler[0].merkez = { ...bozuk.durum.M0 };
      bozuk.durum.hedefler[0].merkez[eksen]++;
      assert.throws(() => duzenekParametreleriniDogrula(bozuk),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Hedefler' });
    }
  });

  it('çubuk uzunluğunu yarıçapa göre geo toleransıyla denetler', () => {
    for (const katsayi of [-2, -0.5, 0, 0.5, 2]) {
      const { ctx } = baglam();
      const uzunluk = ctx.durum.r * (1 + katsayi * ctx.geo.TOLERANS.uzunlukOran);
      ctx.durum.cubuk.B = ctx.geo.ilerle(ctx.durum.cubuk.A, 0, uzunluk);
      if (Math.abs(katsayi) <= 1) {
        assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      } else {
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Cubuk' });
      }
    }
    const { ctx } = baglam();
    ctx.durum.cubuk.B = { ...ctx.durum.cubuk.A };
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D05Cubuk' });
  });

  it('kurulum gözlemi olmadan başarılı veya denetimsiz saymaz', () => {
    const ctx = ctxSahteOlustur('D05', VERI, 42);
    D05.kur(ctx, 42);
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'D05GozlemEksik' });
  });

  it('eksik, fazla, delikli ve bozuk RNG gözlemini reddeder', () => {
    for (const adet of [0, 6, 8]) {
      const { ctx, gozlem } = baglam();
      gozlem.tam.length = adet;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D05GozlemEksik' });
    }
    for (const tam of [undefined, null, { length: 7 }]) {
      const { ctx, gozlem } = baglam();
      gozlem.tam = tam;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D05GozlemEksik' });
    }
    for (const i of ADLAR.keys()) {
      for (const cagri of [undefined, null, 42, 'gozlem']) {
        const { ctx, gozlem } = baglam();
        gozlem.tam[i] = cagri;
        if (cagri === undefined) delete gozlem.tam[i];
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'IMZA_EKSIK', denetim: 'D05GozlemEksik' });
      }
    }
  });

  it('ayrım varyant üreticisine ait olduğundan kurulum gözleminde aranmaz', () => {
    const { ctx, gozlem } = baglam();
    assert.equal(ctx.durum.ayrim, undefined);
    assert.equal(gozlem.tam.length, 7);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
    ctx.veri = structuredClone(ctx.veri);
    ctx.veri.parametreler.ayrim = { min: 1, max: 1 };
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
  });

  it('süreyi kurulum yerine gerçek animasyonda denetler', () => {
    const { ctx } = baglam();
    assert.equal(ctx.durum.sure, undefined);
    assert.equal(D05.calistir(ctx).sure, 900);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
    assert.deepEqual(kuruKos(D05, VERI, 42).gozlem.parametreDenetimsiz, []);
    for (const sure of [899, 901]) {
      const bozuk = { ...D05, calistir(ctx) {
        return { ...D05.calistir(ctx), sure };
      } };
      assert.throws(() => kuruKos(bozuk, VERI, 42),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:sure' });
    }
    ctx.veri = structuredClone(ctx.veri);
    ctx.veri.parametreler.sure = { min: 100, max: 200 };
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
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
