import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import * as geo from '../geo/index.js';
import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { rngOlustur } from '../motor/rng.js';
import { bekleyenMi } from '../motor/sahteKayit.js';

function veriOlustur() {
  return JSON.parse(readFileSync(new URL('../duzenekler/D01/D01.json', import.meta.url)));
}

function kur(kilitli = false) {
  const veri = veriOlustur();
  veri.bayraklar.olcuKilidi = kilitli;
  return ctxSahteOlustur('D01', veri, 42);
}

describe('ctxSahteOlustur', () => {
  it('gerçek geometriyi ve aynı seed ile aynı RNG akışını verir', () => {
    const ctx = kur();
    const rng = rngOlustur(42);
    assert.equal(ctx.geo, geo);
    assert.deepEqual(ctx.durum, {});
    for (let i = 0; i < 20; i++) assert.equal(ctx.rng.sayi(), rng.sayi());
    assert.equal(ctx.mod.tahta, false);
    assert.equal(ctx.tur, 0);
    assert.equal(ctx.sahne.genislik, 1000);
    assert.equal(ctx.sahne.yukseklik, 1000);
    assert.equal(ctx.sahne.pxToBirim(16), 16);
  });
});

describe('ctxSahteOlustur', () => {
  it('verinin kopyasını derin dondurur ve bağlamları birbirinden ayırır', () => {
    const veri = veriOlustur();
    const ctx = ctxSahteOlustur('D01', veri, 42, { tahta: true });
    assert.equal(ctx.mod.metinOlcek, 1.5);
    assert.equal(ctx.mod.tahta, true);
    assert.ok(Object.isFrozen(ctx.veri.parametreler.konum));
    assert.throws(() => { ctx.veri.parametreler.konum.min = 0; }, TypeError);
    assert.equal(Object.isFrozen(veri), false);
    ctx.durum.ornek = 7;
    ctx.sahne.sayi({ x: 0, y: 0 }, 7);
    const ikinci = kur();
    assert.deepEqual(ikinci.durum, {});
    assert.equal(sahneKaydi(ikinci).sayac.sayi, 0);
    assert.throws(() => ctxSahteOlustur('D02', veri, 42), { message: 'SEMA_HATASI' });
    assert.throws(() => ctxSahteOlustur('D01', veri, NaN), {
      message: 'RNG_SEED_GECERSIZ'
    });
  });
});

describe('sahneKaydi', () => {
  it('her çağrıyı, hayalet içini ve kilitteki sayıları silmeden kaydeder', () => {
    const ctx = kur(true);
    const P = { x: 10, y: 20 };
    ctx.sahne.pim(P, { id: 'pimA' });
    ctx.sahne.hayalet(s => s.sayi(P, 17));
    ctx.sahne.temizle();
    P.x = 900;
    const kayit = sahneKaydi(ctx);
    assert.deepEqual(kayit.cagrilar.map(c => c.ad), ['pim', 'hayalet', 'sayi', 'temizle']);
    assert.equal(kayit.cagrilar[0].arg[0].x, 10);
    assert.equal(kayit.sayac.sayi, 1);
    assert.equal(kayit.sayac.temizle, 1);
    assert.throws(() => sahneKaydi({}), { message: 'WIDGET_AYAR_GECERSIZ' });
  });
});

describe('ctxSahteOlustur', () => {
  it('Matik ve açık çizim anahtarlarını doğrular, isteğe bağlı etiket istemez', () => {
    const veri = veriOlustur();
    delete veri.etiketler;
    const ctx = ctxSahteOlustur('D01', veri, 42);
    ctx.matik.soyle('giris');
    ctx.matik.soyle('tamam');
    ctx.ses.cal('tik');
    for (const ad of ['olmayan', 'toString']) {
      assert.throws(() => ctx.matik.soyle(ad), { message: 'MATIK_ANAHTAR_YOK' });
    }
    assert.throws(() => ctx.sahne.etiket({ x: 0, y: 0 }, 'olmayan'), {
      message: 'MATIK_ANAHTAR_YOK'
    });
    assert.throws(() => ctx.sahne.dugme({ anahtar: 'olmayan' }), {
      message: 'MATIK_ANAHTAR_YOK'
    });
  });
});

describe('ctxSahteOlustur', () => {
  it('lazeri gerçek nesne olarak üretir ve henüz gelmeyen fabrikaları ayırır', () => {
    const ctx = kur();
    const lazer = ctx.widget.lazer({ mod: 'parca' });
    lazer.A = { x: 10, y: 20 };
    lazer.B = { x: 30, y: 20 };
    assert.deepEqual(lazer.gecerMi([{ x: 20, y: 20 }, { x: 40, y: 20 }], 1), [true, false]);
    lazer.ciz(ctx.sahne);
    assert.equal(sahneKaydi(ctx).sayac.parca, 1);
    for (const ad of ['aciTablosu']) {
      assert.throws(() => ctx.widget[ad]({}), hata => {
        assert.equal(hata.message, 'IMZA_EKSIK');
        return bekleyenMi(hata);
      });
    }
    for (const ad of ['tahminRafi', 'kuralKarti', 'sina', 'kisayolYuvasi']) {
      assert.throws(() => ctx.defter[ad]({}), bekleyenMi);
    }
    assert.equal(bekleyenMi(new Error('IMZA_EKSIK')), false);
  });
});

describe('ctxSahteOlustur', () => {
  it('ölçü kilidi ihlalini bekleyen fabrika olarak atlamaz', () => {
    const ctx = kur(true);
    assert.deepEqual(ctx.araclar.kilitli, ['aciolcer', 'cetvel']);
    assert.throws(() => ctx.widget.aciolcer({ kilitli: false }), hata => {
      assert.equal(hata.message, 'OLCU_KILIDI_IHLALI');
      return !bekleyenMi(hata);
    });
    const aciolcer = ctx.widget.aciolcer({ kilitli: true });
    aciolcer.ciz(ctx.sahne);
    assert.deepEqual(sahneKaydi(ctx).cagrilar, []);
    assert.equal(aciolcer.girdi({ tur: 'bas', ...aciolcer.merkez }), false);
  });
});

describe('ctxSahteOlustur', () => {
  it('gerçek açıölçeri sahte sahnede çizer ve aynı seed ile yeniden kurar', () => {
    const ctx = kur();
    const aciolcer = ctx.widget.aciolcer({});
    assert.deepEqual(aciolcer.durum(), kur().widget.aciolcer({}).durum());
    aciolcer.ciz(ctx.sahne);
    assert.ok(sahneKaydi(ctx).sayac.parca > 0);
    assert.equal(sahneKaydi(ctx).sayac.pim, 1);
  });
});
