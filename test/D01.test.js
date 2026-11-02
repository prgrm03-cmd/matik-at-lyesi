import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import * as D01 from '../duzenekler/D01/D01.js';
import { rngOlustur } from '../motor/rng.js';

// K-01 kaynak kanıtı: eac88a2295245643cfa421ae4bc6df01bf1a0634.
// D01 geometri çağırmaz; bu test gerçek RNG ve kayıt tutan sahne kullanır.
const veri = JSON.parse(readFileSync(
  new URL('../duzenekler/D01/D01.json', import.meta.url), 'utf8'
));

function kopya(deger) {
  return JSON.parse(JSON.stringify(deger));
}

function dondur(deger) {
  if (deger && typeof deger === 'object') {
    Object.values(deger).forEach(dondur);
    Object.freeze(deger);
  }
  return deger;
}

function baglam(seed, tahta = false) {
  const cagrilar = [];
  const sahne = { genislik: 1000, yukseklik: 1000 };
  for (const ad of ['katman', 'parca', 'pim', 'dugme', 'vurgula', 'sayi']) {
    sahne[ad] = (...arg) => { cagrilar.push({ ad, arg: kopya(arg) }); };
  }
  const ctx = {
    id: veri.id, veri: dondur(kopya(veri)), durum: {}, rng: rngOlustur(seed),
    sahne, tur: 0, mod: { tahta }
  };
  return { ctx, cagrilar };
}

describe('D01.imzalar', () => {
  it('dokuz dışa aktarımı ve sözleşmedeki parametre sayılarını korur', () => {
    const imzalar = { kur: 2, ciz: 1, girdi: 2, calistir: 1, basari: 1, ipucu: 2, tahta: 2 };
    assert.deepEqual(Object.keys(D01).sort(), ['id', 'surum', ...Object.keys(imzalar)].sort());
    assert.equal(D01.id, veri.kod);
    assert.equal(D01.surum, veri.surum);
    for (const [ad, adet] of Object.entries(imzalar)) {
      assert.equal(typeof D01[ad], 'function');
      assert.equal(D01[ad].length, adet);
    }
  });
});

describe('D01.kur', () => {
  it('bin seed boyunca aynı sahneyi üretir ve parametre aralığında kalır', () => {
    const gorulen = new Set();
    const aralik = veri.parametreler.konum;
    for (let seed = 1; seed <= 1000; seed++) {
      const a = baglam(seed);
      const b = baglam(seed, true);
      D01.kur(a.ctx, seed);
      D01.kur(b.ctx, seed);
      assert.deepEqual(a.ctx.durum, b.ctx.durum);
      assert.equal(a.cagrilar.length + b.cagrilar.length, 0);
      assert.equal(a.ctx.durum.pimler.length, 2);
      assert.equal(new Set(a.ctx.durum.pimler.map(pim => pim.id)).size, 2);
      for (const pim of a.ctx.durum.pimler) {
        assert.ok(pim.x >= aralik.min && pim.x <= aralik.max);
        assert.ok(pim.y >= aralik.min && pim.y <= aralik.max);
      }
      gorulen.add(JSON.stringify(a.ctx.durum.pimler));
    }
    assert.ok(gorulen.size > 1);
  });
});

describe('D01.ciz', () => {
  it('bin seed boyunca durumu değiştirmeden iki pim ve bağlantıyı çizer', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const { ctx, cagrilar } = baglam(seed);
      D01.kur(ctx, seed);
      const once = kopya(ctx.durum);
      dondur(ctx.durum);
      D01.ciz(ctx);
      const ilk = kopya(cagrilar);
      D01.ciz(ctx);
      assert.deepEqual(ctx.durum, once);
      assert.deepEqual(cagrilar.slice(ilk.length), ilk);
      assert.equal(ilk.filter(c => c.ad === 'pim').length, 2);
      assert.equal(ilk.filter(c => c.ad === 'parca').length, 1);
      assert.equal(ilk.filter(c => c.ad === 'sayi').length, 0);
      assert.equal(ilk.findIndex(c => c.ad === 'parca') < ilk.findIndex(c => c.ad === 'pim'),
        true);
    }
  });
});

describe('D01.girdi', () => {
  it('yalnız hedef pimi taşır ve tezgâh sınırını aşmaz', () => {
    const { ctx } = baglam(42);
    D01.kur(ctx, 42);
    const diger = kopya(ctx.durum.pimler[1]);
    const hedef = ctx.durum.pimler[0].id;
    D01.girdi(ctx, { tur: 'surukle', x: -20, y: 1100, hedef });
    assert.equal(ctx.durum.pimler[0].x, 0);
    assert.equal(ctx.durum.pimler[0].y, 1000);
    assert.deepEqual(ctx.durum.pimler[1], diger);
    const once = kopya(ctx.durum);
    D01.girdi(ctx, { tur: 'surukle', x: 500, y: 500, hedef: 'yok' });
    assert.deepEqual(ctx.durum, once);
  });
});

describe('D01.ipucu', () => {
  it('vurgu ve metin anahtarı verirken ilk adımda diğer pimi korur', () => {
    const { ctx, cagrilar } = baglam(17);
    D01.kur(ctx, 17);
    const ilk = ctx.durum.pimler[0];
    D01.girdi(ctx, { tur: 'surukle', x: 100, y: 500, hedef: ilk.id });
    const diger = kopya(ctx.durum.pimler[1]);
    D01.ipucu(ctx, 1);
    assert.equal(cagrilar[cagrilar.length - 1].ad, 'vurgula');
    assert.deepEqual(D01.ipucu(ctx, 2), { anahtar: 'i2' });
    D01.ipucu(ctx, 3);
    assert.equal(ctx.durum.pimler[0].y, veri.parametreler.konum.min);
    assert.deepEqual(ctx.durum.pimler[1], diger);
  });
});

describe('D01.calistir', () => {
  it('bin seed boyunca animasyon bitse de iskeleti tamamlanmış saymaz', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const { ctx } = baglam(seed);
      D01.kur(ctx, seed);
      const animasyon = D01.calistir(ctx);
      assert.ok(Number.isFinite(animasyon.sure) && animasyon.sure >= 0);
      for (const t of [0, 0.5, 1]) animasyon.kare(t);
      animasyon.bitti();
      const once = kopya(ctx.durum);
      dondur(ctx.durum);
      const sonuc = D01.basari(ctx);
      assert.deepEqual(sonuc, { tamam: false, yanParca: false, neden: 'yarimKaldi' });
      assert.deepEqual(D01.basari(ctx), sonuc);
      assert.deepEqual(ctx.durum, once);
    }
  });
});

describe('D01.yenidenKur', () => {
  it('kurulumu başka bağlamdan ve önceki denemenin durumundan ayırır', () => {
    const a = baglam(42);
    const b = baglam(42);
    D01.kur(a.ctx, 42);
    D01.kur(b.ctx, 42);
    const once = kopya(b.ctx.durum);
    const eski = a.ctx.durum;
    D01.girdi(a.ctx, { tur: 'surukle', x: 0, y: 0, hedef: eski.pimler[0].id });
    assert.deepEqual(b.ctx.durum, once);
    a.ctx.rng = rngOlustur(42);
    D01.kur(a.ctx, 42);
    assert.notEqual(a.ctx.durum, eski);
    assert.deepEqual(a.ctx.durum, once);
    D01.tahta(a.ctx, { metinOlcek: 1.5, ipucuKapali: false, seed: 42,
      toleransGoster: false, dondur: false });
    assert.deepEqual(a.ctx.durum, once);
  });
});
