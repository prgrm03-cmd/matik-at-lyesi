import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hizmetleriOlustur, girdiDagit } from '../motor/baglam.js';
import { rngOlustur } from '../motor/rng.js';
import { sahteSahneOlustur } from '../motor/sahteSahne.js';
import { TOLERANS } from '../geo/index.js';

const SOKET = Object.freeze({ x: 500, y: 450 });
const SABIT_AYAR = Object.freeze({ soket: SOKET, hizasiz: false, olcekYonu: 'ic' });
const RASTGELE_AYARLAR = [undefined, {}, { hizasiz: false }, { olcekYonu: 'ic' },
  { hizasiz: true, olcekYonu: 'ic' }, { hizasiz: true, olcekYonu: 'dis' },
  { hizasiz: true, olcekYonu: 'rastgele' }, { hizasiz: false, olcekYonu: 'rastgele' }];

function kur(seed = 17, kilitli = false) {
  const veri = { bayraklar: { olcuKilidi: kilitli }, matik: {}, nedenler: {}, etiketler: {} };
  const { sahne, kayit } = sahteSahneOlustur(veri);
  const ctx = { veri, rng: rngOlustur(seed), mod: { tahta: true }, sahne };
  const arayuz = Object.fromEntries([
    'soyle', 'ifade', 'kivilcim', 'sembol', 'defterAc', 'defterKapat'
  ].map(ad => [ad, () => {}]));
  const hizmetler = hizmetleriOlustur(ctx, arayuz, { ses: false });
  const olaylar = [];
  const duzenek = { girdi(baglam, olay) {
    assert.equal(baglam, ctx);
    olaylar.push(olay);
  } };
  const gonder = olay => girdiDagit(ctx, duzenek, olay, hizmetler);
  return { ctx, hizmetler, olaylar, gonder, kayit };
}

function sayilar(rng) {
  return [rng.sayi(), rng.tam(-100, 100), rng.bool(), rng.sec(['a', 'b', 'c'])];
}

describe('hizmetleriOlustur', () => {
  it('aynı seed aynı açıölçeri üretir, sonraki düzenek parametreleri kaymaz', () => {
    const durumlar = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      for (const ayar of RASTGELE_AYARLAR) {
        const { ctx, hizmetler } = kur(seed);
        const kontrol = rngOlustur(seed);
        assert.deepEqual(sayilar(ctx.rng), sayilar(kontrol));
        const aciolcer = ctx.widget.aciolcer(ayar);
        assert.deepEqual(aciolcer.durum(), kur(seed).ctx.widget.aciolcer(ayar).durum());
        assert.deepEqual(sayilar(ctx.rng), sayilar(kontrol));
        assert.deepEqual(hizmetler.widgetler, [aciolcer]);
        durumlar.add(JSON.stringify(aciolcer.durum()));
      }
    }
    assert.ok(durumlar.size > 100);
  });

  it('tekrar kurulumları önceki widget veya ana akış tüketiminden etkilenmez', () => {
    const { ctx, hizmetler } = kur();
    const ilk = ctx.widget.aciolcer({ soket: SOKET });
    const durum = ilk.durum();
    ilk.merkez = { x: 1, y: 2 };
    sayilar(ctx.rng);
    ctx.widget.aciolcer({ hizasiz: false, olcekYonu: 'rastgele' });
    const tekrar = ctx.widget.aciolcer({ soket: SOKET });
    assert.notEqual(tekrar, ilk);
    assert.deepEqual(tekrar.durum(), durum);
    assert.equal(hizmetler.widgetler.length, 3);
  });

  it('tur değişiminde yenilenen ctx.rng kaynağını kullanır', () => {
    const { ctx, hizmetler } = kur(17);
    const once = ctx.widget.aciolcer().durum();
    const sonrakiSeed = rngOlustur(17).alt('tur1').seed;
    ctx.rng = rngOlustur(sonrakiSeed);
    hizmetler.widgetler.length = 0;
    const yeni = ctx.widget.aciolcer().durum();
    assert.deepEqual(yeni, kur(sonrakiSeed).ctx.widget.aciolcer().durum());
    assert.notDeepEqual(yeni, once);
    assert.deepEqual(sayilar(ctx.rng), sayilar(rngOlustur(sonrakiSeed)));
    assert.equal(hizmetler.widgetler.length, 1);
  });

  it('sabit ayarda rng gerekmez ve var olan rng kaynağına erişilmez', () => {
    const { ctx } = kur();
    delete ctx.rng;
    for (const olcekYonu of ['ic', 'dis']) {
      const ayar = { ...SABIT_AYAR, olcekYonu };
      assert.deepEqual(ctx.widget.aciolcer(ayar).durum(), { merkez: SOKET, donus: 0, olcekYonu });
    }
    Object.defineProperty(ctx, 'rng', { get() { assert.fail('Sabit ayar rng okumamalı'); } });
    assert.deepEqual(ctx.widget.aciolcer(SABIT_AYAR).durum(), {
      merkez: SOKET, donus: 0, olcekYonu: 'ic'
    });
  });

  it('rastgele ayarda eksik rng açık hatadır ve başarısız widget listeye eklenmez', () => {
    const { ctx, hizmetler } = kur();
    delete ctx.rng;
    for (const ayar of RASTGELE_AYARLAR) {
      assert.throws(() => ctx.widget.aciolcer(ayar), {
        message: 'aciolcer: rng gerekli (hizasiz veya olcekYonu:rastgele)'
      });
    }
    assert.deepEqual(hizmetler.widgetler, []);
  });
});

describe('girdiDagit', () => {
  it('kilitli açıölçer girdiyi tüketmez, durumunu korur ve olayı düzeneğe iletir', () => {
    const { ctx, hizmetler, olaylar, gonder, kayit } = kur(17, true);
    const aciolcer = ctx.widget.aciolcer({ ...SABIT_AYAR, kilitli: true });
    const once = aciolcer.durum();
    assert.deepEqual(hizmetler.widgetler, [aciolcer]);
    aciolcer.ciz(ctx.sahne);
    for (const tur of ['bas', 'surukle', 'birak', 'tik', 'dugme', 'tus']) {
      const olay = { tur, ...SOKET, dx: 15, dy: -10 };
      assert.equal(gonder(olay), false);
      assert.equal(olaylar.at(-1), olay);
      assert.deepEqual(aciolcer.durum(), once);
    }
    assert.equal(olaylar.length, 6);
    assert.deepEqual(kayit.cagrilar, []);
  });

  it('açık açıölçerin sürükleme girdisini düzeneğe ulaşmadan işler', () => {
    const { ctx, gonder, olaylar } = kur();
    const aciolcer = ctx.widget.aciolcer(SABIT_AYAR);
    aciolcer.ciz(ctx.sahne);
    assert.equal(gonder({ tur: 'bas', ...SOKET }), true);
    assert.equal(gonder({ tur: 'surukle', ...SOKET, dx: 15, dy: -10 }), true);
    assert.equal(gonder({ tur: 'birak', ...SOKET }), true);
    assert.deepEqual(aciolcer.merkez, { x: 515, y: 440 });
    assert.deepEqual(olaylar, []);
    assert.equal(gonder({ tur: 'surukle', ...SOKET, dx: 15, dy: -10 }), false);
    assert.equal(olaylar.length, 1);
  });
});

describe('hizala', () => {
  it('sorgu yapılmadan başlangıç soketine hizalanır ve seçimi temizler', () => {
    const { ctx, gonder } = kur();
    const aciolcer = ctx.widget.aciolcer({ soket: SOKET });
    aciolcer.ciz(ctx.sahne);
    assert.equal(gonder({ tur: 'bas', ...aciolcer.merkez }), true);
    assert.equal(aciolcer.hizala.length, 0);
    aciolcer.hizala();
    assert.deepEqual(aciolcer.merkez, SOKET);
    assert.equal(aciolcer.donus, 0);
    assert.equal(gonder({ tur: 'surukle', ...SOKET, dx: 12, dy: 3 }), false);
    assert.deepEqual(aciolcer.merkez, SOKET);
  });

  it('ADT-012 son sorgu hedefini kullanır ve sorgular görünür durumu değiştirmez', () => {
    const { ctx, gonder } = kur();
    const aciolcer = ctx.widget.aciolcer(SABIT_AYAR);
    aciolcer.ciz(ctx.sahne);
    assert.equal(gonder({ tur: 'bas', ...SOKET }), true);
    const once = aciolcer.durum();
    const hedef = { x: 250, y: 350 };
    const sonuc = aciolcer.hizaliMi(hedef, 247);
    assert.deepEqual(aciolcer.hizaliMi(hedef, 247), sonuc);
    aciolcer.hizaliMi(SOKET, 0);
    assert.deepEqual(aciolcer.hizaliMi(hedef, 247), sonuc);
    assert.deepEqual(aciolcer.durum(), once);
    assert.deepEqual(Object.keys(aciolcer.durum()).sort(), ['donus', 'merkez', 'olcekYonu']);
    aciolcer.hizala();
    assert.deepEqual(aciolcer.durum(), { merkez: hedef, donus: 247, olcekYonu: 'ic' });
    assert.equal(gonder({ tur: 'surukle', ...hedef, dx: 12, dy: 3 }), false);
    assert.deepEqual(aciolcer.merkez, hedef);
  });
});

describe('ciz', () => {
  it('her çizimde güncel ctx.sahne ile hizalama ve girdi toleransını yeniler', () => {
    const { ctx, gonder } = kur();
    const aciolcer = ctx.widget.aciolcer(SABIT_AYAR);
    const nokta = { x: SOKET.x + TOLERANS.pimYakalamaPx * 1.5, y: SOKET.y };
    const once = aciolcer.durum();
    aciolcer.ciz(ctx.sahne);
    assert.equal(aciolcer.hizaliMi(nokta, 0).merkezTamam, false);
    assert.equal(gonder({ tur: 'bas', ...nokta }), false);
    const eski = ctx.sahne;
    ctx.sahne = sahteSahneOlustur(ctx.veri).sahne;
    ctx.sahne.olcek = 2;
    aciolcer.ciz(ctx.sahne);
    eski.pxToBirim = () => assert.fail('Önceki sahne kullanılmamalı');
    assert.equal(aciolcer.hizaliMi(nokta, 0).merkezTamam, true);
    assert.equal(gonder({ tur: 'bas', ...nokta }), true);
    assert.equal(gonder({ tur: 'birak', ...nokta }), true);
    assert.deepEqual(aciolcer.durum(), once);
    ctx.sahne.olcek = 0.5;
    assert.equal(aciolcer.hizaliMi(nokta, 0).merkezTamam, false);
    assert.equal(gonder({ tur: 'bas', ...nokta }), false);
  });
});
