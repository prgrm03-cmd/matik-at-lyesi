import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import * as D03 from '../duzenekler/D03/D03.js';
import { ctxSahteOlustur } from '../motor/ctxSahte.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { gozlemBagla, duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D03/D03.json', import.meta.url), 'utf8'));

function baglam(seed = 42) {
  const ctx = ctxSahteOlustur('D03', structuredClone(VERI), seed);
  const gozlem = gozlemBagla(ctx);
  D03.kur(ctx, seed);
  return { ctx, gozlem };
}

describe('D03 parametre denetimi', () => {
  it('gerçek kurulumları doğrular, durumu ve sonraki RNG değerlerini korur', () => {
    for (const seed of [17, 42, 101]) {
      const { ctx } = baglam(seed);
      const yalın = ctxSahteOlustur('D03', VERI, seed);
      D03.kur(yalın, seed);
      const once = JSON.stringify(ctx.durum);
      assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      assert.equal(JSON.stringify(ctx.durum), once);
      assert.equal(once, JSON.stringify(yalın.durum));
      assert.equal(ctx.rng.tam(0, 1000), yalın.rng.tam(0, 1000));
    }
  });

  it('alt akış ve kurulum sonrası çekilişleri D03 parametrelerine katmaz', () => {
    const ctx = ctxSahteOlustur('D03', VERI, 42);
    const gozlem = gozlemBagla(ctx);
    ctx.rng.alt('widget:aciolcer').tam(0, 359);
    D03.kur(ctx, 42);
    gozlem.asama = 'ipucu';
    ctx.rng.tam(0, 359);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
  });

  it('A ve iki sensör ile iki alarmın bütün eksenlerinde tezgâh sınırını denetler', () => {
    for (const i of [0, 1, 2, 3, 4]) {
      for (const eksen of ['x', 'y']) {
        for (const deger of [0, 1000, -1, 1001, NaN, Infinity, '500']) {
          const { ctx } = baglam();
          const d = ctx.durum;
          [d.A, ...d.sensorler, ...d.alarmlar][i][eksen] = deger;
          if (deger === 0 || deger === 1000) {
            assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
          } else {
            assert.throws(() => duzenekParametreleriniDogrula(ctx),
              { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D03TezgahSiniri' });
          }
        }
      }
    }
  });

  it('eksik A ile eksik veya fazla sensör ve alarmı reddeder', () => {
    const { ctx } = baglam();
    delete ctx.durum.A;
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'D03AEksik' });
    for (const ad of ['sensorler', 'alarmlar']) {
      for (const noktalar of [undefined, null, [], [{}], [{}, {}, {}]]) {
        const { ctx } = baglam();
        ctx.durum[ad] = noktalar;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'IMZA_EKSIK', denetim: 'D03NoktalarEksik:' + ad });
      }
    }
  });

  it('hedef yönün aralık, adım ve yasak açılarını JSON üzerinden denetler', () => {
    for (const hedefYon of [-1, 360, 10.5, 0, 90, 180, 270, NaN, Infinity, '45']) {
      const { ctx } = baglam();
      ctx.durum.hedefYon = hedefYon;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI' });
    }
    const { ctx } = baglam();
    delete ctx.durum.hedefYon;
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'D03HedefEksik' });
  });

  it('işaret için yalnız +1 ve -1 kabul eder', () => {
    for (const isaret of [1, -1, 0, 2, NaN, Infinity, '1', undefined]) {
      const { ctx } = baglam();
      ctx.durum.isaret = isaret;
      if (isaret === 1 || isaret === -1) {
        assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      } else {
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'PARAMETRE_ARALIK_DISI', denetim: 'D03Isaret' });
      }
    }
  });

  it('ham RNG çıktısındaki aralık ihlalini yerleşim düzeltse bile reddeder', () => {
    for (const ad of ['konum', 'sapma', 'uzaklik', 'ara', 'baslangic']) {
      const ctx = ctxSahteOlustur('D03', VERI, 1);
      const tam = ctx.rng.tam;
      const p = VERI.parametreler[ad];
      ctx.rng.tam = (min, max, adim) => {
        const deger = tam(min, max, adim);
        return min === p.min && max === p.max ? max + 1 : deger;
      };
      gozlemBagla(ctx);
      D03.kur(ctx, 1);
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:' + ad });
    }
  });

  it('çarkın gerçek fabrika ayarını ve animasyonun gerçek süresini denetler', () => {
    const carkBozuk = { ...D03, kur(ctx, seed) {
      const lazer = ctx.widget.lazer;
      ctx.widget.lazer = ayar => lazer({ ...ayar, carkAdim: 2 });
      D03.kur(ctx, seed);
    } };
    assert.throws(() => kuruKos(carkBozuk, VERI, 42),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:cark' });
    const sureBozuk = { ...D03, calistir(ctx) {
      return { ...D03.calistir(ctx), sure: 901 };
    } };
    assert.throws(() => kuruKos(sureBozuk, VERI, 42),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:sure' });
  });

  it('JSON dışlamasını ve eşlemesiz yeni parametreyi sessizce geçirmez', () => {
    const { ctx } = baglam();
    ctx.veri = structuredClone(ctx.veri);
    ctx.veri.parametreler.yon.haric.push(ctx.durum.hedefYon);
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreHaric:yon' });
    const diger = baglam().ctx;
    diger.veri = structuredClone(diger.veri);
    diger.veri.parametreler.yeni = { min: 0, max: 1 };
    assert.throws(() => duzenekParametreleriniDogrula(diger),
      { message: 'IMZA_EKSIK', denetim: 'parametreEksik:yeni' });
  });

  it('kurulum gözlemi eksikse denetimsiz veya başarılı saymaz', () => {
    const ctx = ctxSahteOlustur('D03', VERI, 42);
    D03.kur(ctx, 42);
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'D03GozlemEksik' });
  });
});
