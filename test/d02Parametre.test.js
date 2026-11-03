import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as D02 from '../duzenekler/D02/D02.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D02/D02.json', import.meta.url), 'utf8'));
const KOK = fileURLToPath(new URL('../', import.meta.url));

function baglam() {
  return {
    id: 'D02', veri: structuredClone(VERI),
    durum: {
      sensorler: [{ x: 200, y: 800 }, { x: 800, y: 200 }],
      alarmlar: [{ x: 500, y: 501 }, { x: 499, y: 500 }]
    }
  };
}

describe('D02 parametre denetimi', () => {
  it('tezgâhtaki sınır değerlerini üretici uzayında doğrular ve durumu korur', () => {
    const ctx = baglam();
    const once = structuredClone(ctx);
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
    assert.deepEqual(ctx, once);
  });

  for (const ad of ['sensorler', 'alarmlar']) {
    for (const eksen of ['x', 'y']) {
      it(ad + ' içindeki her ' + eksen + ' değerinin aralık ve adımını denetler', () => {
        for (const deger of [199, 801, 500.5, NaN, Infinity, '500']) {
          const ctx = baglam();
          ctx.durum[ad][1][eksen] = deger;
          assert.throws(() => duzenekParametreleriniDogrula(ctx),
            { message: 'PARAMETRE_ARALIK_DISI' });
        }
      });
    }

    it(ad + ' eksik veya boşsa denetimi atlamaz', () => {
      for (const noktalar of [undefined, null, [], {}]) {
        const ctx = baglam();
        ctx.durum[ad] = noktalar;
        assert.throws(() => duzenekParametreleriniDogrula(ctx),
          { message: 'IMZA_EKSIK', denetim: 'D02NoktalarEksik:' + ad });
      }
      const ctx = baglam();
      ctx.durum[ad][0] = null;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI' });
    });
  }

  it('aralık adım ve dışlamayı JSON parametrelerinden alır', () => {
    const ornekler = [
      [{ min: -299 }, 'parametreAraligi:konum'],
      [{ max: 299 }, 'parametreAraligi:konum'],
      [{ adim: 2 }, 'parametreAdimi:konum'],
      [{ haric: [0] }, 'parametreHaric:konum']
    ];
    for (const [ek, denetim] of ornekler) {
      const ctx = baglam();
      Object.assign(ctx.veri.parametreler.konum, ek);
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim });
    }
  });

  it('JSON içindeki eşlemesiz yeni parametreyi sessizce geçirmez', () => {
    const ctx = baglam();
    ctx.veri.parametreler.aci = { min: 0, max: 180 };
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'parametreEksik:aci' });
  });

  it('gerçek D02 kuru zincirini denetimsiz parametre bırakmadan tamamlar', () => {
    for (const seed of [17, 42, 101]) {
      const kosu = kuruKos(D02, VERI, seed);
      assert.equal(kosu.atlandi, false);
      assert.deepEqual(kosu.gozlem.parametreDenetimsiz, []);
    }
  });

  it('kuru.js D02 için denetimsiz uyarısı üretmez', () => {
    const kosu = spawnSync(process.execPath, [
      'araclar/kuru.js', 'duzenekler/D02/D02.js', 'duzenekler/D02/D02.json', '42'
    ], { cwd: KOK, encoding: 'utf8' });
    assert.equal(kosu.error, undefined);
    assert.equal(kosu.status, 0, kosu.stderr);
    assert.equal(kosu.stderr, '');
    const ozet = JSON.parse(kosu.stdout.trim());
    assert.equal(ozet.id, 'D02');
    assert.equal(ozet.atlandi, false);
    assert.deepEqual(ozet.parametreDenetimsiz, []);
  });
});
