import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as D09 from '../duzenekler/D09/D09.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D09/D09a.json', import.meta.url), 'utf8'));
const KOK = fileURLToPath(new URL('../', import.meta.url));

function baglam(hedef = 60) {
  return { id: 'D09a', veri: structuredClone(VERI), durum: { hedef } };
}

describe('D09a parametre denetimi', () => {
  it('sipariş açısının iki sınırını kabul eder ve durumu korur', () => {
    for (const hedef of [VERI.parametreler.aci.min, VERI.parametreler.aci.max]) {
      const ctx = baglam(hedef);
      const once = structuredClone(ctx);
      assert.deepEqual(duzenekParametreleriniDogrula(ctx), []);
      assert.deepEqual(ctx, once);
    }
  });

  it('aralık dışı ve sayısal olmayan hedefleri reddeder', () => {
    for (const hedef of [24, 156, NaN, Infinity, -Infinity, '60', null]) {
      assert.throws(() => duzenekParametreleriniDogrula(baglam(hedef)),
        { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAraligi:aci' });
    }
  });

  it('tam derece adımının dışındaki hedefi reddeder', () => {
    assert.throws(() => duzenekParametreleriniDogrula(baglam(60.5)),
      { message: 'PARAMETRE_ARALIK_DISI', denetim: 'parametreAdimi:aci' });
  });

  it('eksik sipariş hedefini sessizce geçirmez', () => {
    for (const durum of [undefined, null, {}]) {
      const ctx = baglam();
      ctx.durum = durum;
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'IMZA_EKSIK', denetim: 'D09aHedefEksik' });
    }
  });

  it('aralık, adım ve dışlamayı JSON parametrelerinden alır', () => {
    const ornekler = [
      [{ min: 61 }, 'parametreAraligi:aci'],
      [{ max: 59 }, 'parametreAraligi:aci'],
      [{ adim: 2 }, 'parametreAdimi:aci'],
      [{ haric: [60] }, 'parametreHaric:aci']
    ];
    for (const [ek, denetim] of ornekler) {
      const ctx = baglam();
      Object.assign(ctx.veri.parametreler.aci, ek);
      assert.throws(() => duzenekParametreleriniDogrula(ctx),
        { message: 'PARAMETRE_ARALIK_DISI', denetim });
    }
  });

  it('JSON içindeki eşlemesiz yeni parametreyi sessizce geçirmez', () => {
    const ctx = baglam();
    ctx.veri.parametreler.konum = { min: 0, max: 1000 };
    assert.throws(() => duzenekParametreleriniDogrula(ctx),
      { message: 'IMZA_EKSIK', denetim: 'parametreEksik:konum' });
  });

  it('gerçek D09a kuru zincirini denetimsiz parametre bırakmadan tamamlar', () => {
    for (const seed of [17, 42, 101]) {
      const kosu = kuruKos(D09, VERI, seed);
      assert.equal(kosu.atlandi, false);
      assert.deepEqual(kosu.gozlem.parametreDenetimsiz, []);
    }
  });

  it('kuru.js D09a için denetimsiz uyarısı üretmez', () => {
    const kosu = spawnSync(process.execPath, [
      'araclar/kuru.js', 'duzenekler/D09/D09.js', 'duzenekler/D09/D09a.json', '42'
    ], { cwd: KOK, encoding: 'utf8' });
    assert.equal(kosu.error, undefined);
    assert.equal(kosu.status, 0, kosu.stderr);
    assert.equal(kosu.stderr, '');
    const ozet = JSON.parse(kosu.stdout.trim());
    assert.equal(ozet.id, 'D09a');
    assert.equal(ozet.atlandi, false);
    assert.deepEqual(ozet.parametreDenetimsiz, []);
  });

  it('npm run seed -- D09a yalnız D09a için bin tohumu denetler', () => {
    const kosu = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', '--silent', 'seed', '--', 'D09a'], { cwd: KOK, encoding: 'utf8' });
    assert.equal(kosu.error, undefined);
    assert.equal(kosu.status, 0, kosu.stderr);
    assert.equal(kosu.stderr, '');
    const ozet = JSON.parse(kosu.stdout.trim());
    assert.equal(ozet.gecti, 1000);
    assert.equal(ozet.hata, 0, JSON.stringify(ozet.ilkHatalar));
    assert.equal(ozet.atlandi, 0);
    assert.equal(ozet.sayi, 12000);
    assert.deepEqual(ozet.parametreDenetimsiz, []);
  });
});
