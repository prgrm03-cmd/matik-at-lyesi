import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as geo from '../geo/index.js';
import { rngOlustur } from '../motor/rng.js';
import { ctxSahteOlustur } from '../motor/ctxSahte.js';
import { gozlemBagla, duzenekParametreleriniDogrula } from '../araclar/seedGozlem.js';
import { seedTesti } from '../araclar/seedTesti.js';
import {
  parametreleriDogrula, gecmisiDogrula, prototipiDogrula, sahneyiDogrula,
  d13Dogrula, d12bDogrula, d14Dogrula, cemberKesisiminiDogrula, ozelKurallariDogrula
} from '../araclar/seedKurallari.js';

const VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D01/D01.json', import.meta.url), 'utf8'));
const KARE = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
const CIZIM = [{ ad: 'cokgen', arg: [KARE] }];

describe('parametreleriDogrula', () => {
  it('açık değer eşlemesinde aralık adım dışlama ve eksikliği denetler', () => {
    const araliklar = { aci: { min: 10, max: 20, adim: 2, haric: [16] } };
    parametreleriDogrula(araliklar, { aci: [10, 12, 20] });
    for (const aci of [[9], [21], [11], [16], [NaN]]) {
      assert.throws(() => parametreleriDogrula(araliklar, { aci }),
        { message: 'PARAMETRE_ARALIK_DISI' });
    }
    assert.throws(() => parametreleriDogrula(araliklar, {}), { message: 'IMZA_EKSIK' });
  });

  it('eksik adaptörü denetimsiz sayar ve mevcut adaptörün ihlalini reddeder', () => {
    const ctx = { id: 'D05', veri: { parametreler: { aci: { min: 1, max: 90 } } } };
    assert.deepEqual(duzenekParametreleriniDogrula(ctx), ['D05']);
    assert.deepEqual(duzenekParametreleriniDogrula({
      id: 'D05', veri: { parametreler: {} }
    }), []);
    const d01 = { id: 'D01', veri: VERI,
      durum: { pimler: [{ x: 249, y: 250 }, { x: 500, y: 750 }] } };
    assert.throws(() => duzenekParametreleriniDogrula(d01),
      { message: 'PARAMETRE_ARALIK_DISI' });
  });
});

describe('gecmisiDogrula', () => {
  it('çağrının gerçek geçmişine göre kapalı komşuluk sınırını reddeder', () => {
    const cagri = { min: 0, max: 100, haric: [30], komsuluk: 5, deger: 36 };
    gecmisiDogrula(cagri);
    for (const deger of [25, 30, 35, 101]) {
      assert.throws(() => gecmisiDogrula({ ...cagri, deger }),
        { message: 'PARAMETRE_ARALIK_DISI' });
    }
  });
});

describe('gozlemBagla', () => {
  it('gerçek RNG akışını değiştirmeden alt akışları ve üreticileri gözler', () => {
    const ctx = ctxSahteOlustur('D01', VERI, 42);
    const gozlem = gozlemBagla(ctx);
    const rng = rngOlustur(42);
    assert.equal(ctx.rng.tamHaric(0, 100, [50], 5), rng.tamHaric(0, 100, [50], 5));
    assert.equal(ctx.rng.alt('sina').tamHaric(0, 100, [50], 5),
      rng.alt('sina').tamHaric(0, 100, [50], 5));
    const c = ctx.geo.rastgeleDisBukeyCokgen(ctx.rng, 5, {});
    assert.deepEqual(c, geo.rastgeleDisBukeyCokgen(rng, 5, {}));
    assert.equal(gozlem.geo[0].ad, 'rastgeleDisBukeyCokgen');
    assert.equal(gozlem.haric.length, 2);
    gozlem.haric.forEach(gecmisiDogrula);
  });
});

describe('prototipiDogrula', () => {
  it('ADT kararındaki çokgen ve üçgen duruşlarını ayırır', () => {
    assert.throws(() => prototipiDogrula({ koseler: KARE }, false),
      hata => hata.denetim === 'prototipikDurus');
    for (let seed = 1; seed <= 1000; seed++) {
      prototipiDogrula(geo.rastgeleDisBukeyCokgen(rngOlustur(seed), 5, {}), false);
      prototipiDogrula(geo.rastgeleUcgen(rngOlustur(seed), { kenar: 'eskenar' }), true);
    }
    assert.throws(() => prototipiDogrula({ koseler: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 60 }
    ] }, true), hata => hata.denetim === 'prototipikDurus');
  });
});

describe('d13Dogrula', () => {
  it('içe çöken çit tamamlanmasını reddeder ve eksik gözlemi bildirir', () => {
    const icBukey = [...KARE.slice(0, 2), { x: 40, y: 40 }, ...KARE.slice(2)];
    const cagrilar = [{ ad: 'cokgen', arg: [icBukey] }];
    d13Dogrula(CIZIM, { tamam: true });
    d13Dogrula(cagrilar, { tamam: false });
    assert.throws(() => d13Dogrula(cagrilar, { tamam: true }),
      hata => hata.denetim === 'D13DisBukeylik');
    assert.throws(() => d13Dogrula([], { tamam: false }), { message: 'IMZA_EKSIK' });
  });
});

describe('d12bDogrula', () => {
  it('iki ayrı bölümün aynı karta konmasına izin vermez', () => {
    d12bDogrula([{ ayniKartaKoy: () => false }]);
    assert.throws(() => d12bDogrula([{ ayniKartaKoy: () => true }]),
      hata => hata.denetim === 'D12bBolumAyri');
    assert.throws(() => d12bDogrula([]), { message: 'IMZA_EKSIK' });
  });
});

describe('d14Dogrula', () => {
  it('köşe sayısından farklı tabloyu ve köşegen sayacı hücresini reddeder', () => {
    const tablolar = [{ satirlar: Array(4).fill({}) }];
    d14Dogrula(CIZIM, tablolar, []);
    assert.throws(() => d14Dogrula(CIZIM, [{ satirlar: Array(5).fill({}) }], []),
      hata => hata.denetim === 'D14ToplamSatiri');
    const raflar = [{ ayar: { hucreler: [{ ad: 'koseGenSayisi' }] } }];
    assert.throws(() => d14Dogrula(CIZIM, tablolar, raflar),
      hata => hata.denetim === 'D14KosegenSayisi');
    assert.throws(() => d14Dogrula(CIZIM, [], []), { message: 'IMZA_EKSIK' });
  });
});

describe('cemberKesisiminiDogrula', () => {
  it('üretim gözleminde tam iki kesişim ister ve eksik veriyi reddeder', () => {
    const cagri = { ad: 'kesisimGarantiliParametre', asama: 'kur',
      sonuc: { r1: 100, r2: 100, AB: 100 } };
    cemberKesisiminiDogrula([cagri]);
    assert.throws(() => cemberKesisiminiDogrula([
      { ...cagri, sonuc: { r1: 100, r2: 100, AB: 200 } }
    ]), hata => hata.denetim === 'ikiKesisim');
    assert.throws(() => cemberKesisiminiDogrula([]), { message: 'IMZA_EKSIK' });
    assert.throws(() => cemberKesisiminiDogrula([
      { ad: 'kesisimCemberCember', asama: 'kur', sonuc: [{ x: 0, y: 0 }] }
    ]), hata => hata.denetim === 'ikiKesisim');
  });
});

describe('ozelKurallariDogrula', () => {
  it('gelecek düzenek kimliklerini ilgili kurallara yönlendirir', () => {
    const gozlem = { geo: [], tablolar: [], raflar: [] };
    for (const id of ['D12b', 'D13', 'D14', 'D17', 'D18']) {
      assert.throws(() => ozelKurallariDogrula(id, gozlem, [], { tamam: true }),
        { message: 'IMZA_EKSIK' });
    }
    ozelKurallariDogrula('D01', gozlem, [], { tamam: false });
  });
});

describe('sahneyiDogrula', () => {
  it('ölçü kilidini koordinat etiketini ve üçgen toplamını yakalar', () => {
    const kilitli = { ...VERI, bayraklar: { ...VERI.bayraklar, olcuKilidi: true } };
    assert.throws(() => sahneyiDogrula(kilitli, { cagrilar: [], sayac: { sayi: 1 } }),
      { message: 'OLCU_KILIDI_IHLALI' });
    const etiket = { ad: 'etiket', arg: [{ x: 0, y: 0 }, 'xKonum'] };
    assert.throws(() => sahneyiDogrula(VERI, { cagrilar: [etiket], sayac: {} }),
      hata => hata.denetim === 'koordinatEtiketi');
    const sayi = { ad: 'sayi', arg: [{ x: 0, y: 0 }, '180'] };
    assert.throws(() => sahneyiDogrula({ ...VERI, kod: 'D15' },
      { cagrilar: [sayi], sayac: { sayi: 1 } }), hata => hata.denetim === 'ucgenToplami');
  });
});

describe('seedTesti', () => {
  it('D01, D02, D09a, D03 ve D04 için biner gerçek seed koşar ve atlama yapmaz', async () => {
    const ozet = await seedTesti(fileURLToPath(new URL('../', import.meta.url)));
    assert.equal(ozet.hata, 0, JSON.stringify(ozet.ilkHatalar));
    assert.equal(ozet.atlandi, 0);
    assert.equal(ozet.gecti, 5000);
    assert.equal(ozet.sayi, 12000);
    assert.deepEqual(ozet.parametreDenetimsiz, []);
  });

  for (const id of ['D03', 'D04']) {
    it('npm run seed -- ' + id + ' bin tohumu denetimsiz uyarısı olmadan koşar', () => {
      const kosu = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['run', '--silent', 'seed', '--', id], {
          cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8'
        });
      assert.equal(kosu.error, undefined);
      assert.equal(kosu.status, 0, kosu.stderr);
      assert.equal(kosu.stderr, '');
      const ozet = JSON.parse(kosu.stdout.trim());
      assert.equal(ozet.gecti, 1000);
      assert.equal(ozet.hata, 0, JSON.stringify(ozet.ilkHatalar));
      assert.equal(ozet.atlandi, 0);
      assert.deepEqual(ozet.parametreDenetimsiz, []);
    });
  }
});

describe('seedTesti', () => {
  it('kapsamdaki varyantın yerine aynı kodlu başka varyant yüklenmesini reddeder', async () => {
    const dizin = await mkdtemp(join(tmpdir(), 'matikSeed'));
    try {
      await mkdir(join(dizin, 'docs'));
      await mkdir(join(dizin, 'duzenekler', 'D09'), { recursive: true });
      await writeFile(join(dizin, 'package.json'), '{"type":"module"}');
      await writeFile(join(dizin, 'docs', 'kapsam.json'), '["D09a"]');
      await writeFile(join(dizin, 'duzenekler', 'D09', 'D09a.json'),
        JSON.stringify({ ...VERI, id: 'D09b', kod: 'D09' }));
      const kaynak = readFileSync(new URL('../duzenekler/D01/D01.js', import.meta.url), 'utf8');
      await writeFile(join(dizin, 'duzenekler', 'D09', 'D09.js'),
        kaynak.replace('export const id = \'D01\'', 'export const id = \'D09\''));
      const ozet = await seedTesti(dizin);
      assert.equal(ozet.hata, 1);
      assert.equal(ozet.gecti, 0);
      assert.equal(ozet.ilkHatalar[0].denetim, 'varyantKimligi');
    } finally {
      await rm(dizin, { recursive: true, force: true });
    }
  });
});

describe('sahneyiDogrula', () => {
  it('yön etiketlerini kabul ederken koordinat adlarını reddeder', () => {
    const kayit = anahtar => ({
      cagrilar: [{ ad: 'etiket', arg: [{ x: 0, y: 0 }, anahtar] }], sayac: {}
    });
    for (const anahtar of ['yon', 'yukari', 'yatay', 'xenon']) {
      assert.doesNotThrow(() => sahneyiDogrula(VERI, kayit(anahtar)));
    }
    for (const anahtar of ['x', 'y', 'x1', 'y2', 'xKonum', 'yKonum']) {
      assert.throws(() => sahneyiDogrula(VERI, kayit(anahtar)),
        hata => hata.denetim === 'koordinatEtiketi');
    }
  });
});
