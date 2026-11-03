import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { hizmetleriOlustur, girdiDagit } from '../motor/baglam.js';
import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { sahteSahneOlustur } from '../motor/sahteSahne.js';
import { bekleyenMi } from '../motor/sahteKayit.js';
import { TOLERANS, ilerle } from '../geo/index.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { IMZA_LISTESI, imzaDogrula } from '../araclar/imza.js';
import { fileURLToPath } from 'node:url';

const DOGRU = { A: { x: 200, y: 200 }, yon: 0 };
const KOK = fileURLToPath(new URL('../', import.meta.url));

function veriOlustur(olcuKilidi) {
  const veri = JSON.parse(readFileSync(new URL('../duzenekler/D01/D01.json', import.meta.url)));
  veri.bayraklar.olcuKilidi = olcuKilidi;
  return veri;
}

function motorKur(olcuKilidi = false) {
  const veri = veriOlustur(olcuKilidi);
  const { sahne, kayit } = sahteSahneOlustur(veri);
  const ctx = { veri, sahne, mod: { tahta: true } };
  const arayuz = Object.fromEntries([
    'soyle', 'ifade', 'kivilcim', 'sembol', 'defterAc', 'defterKapat'
  ].map(ad => [ad, () => {}]));
  const hizmetler = hizmetleriOlustur(ctx, arayuz, { ses: false });
  return { ctx, hizmetler, kayit };
}

function sahteKur(olcuKilidi = false) {
  return ctxSahteOlustur('D01', veriOlustur(olcuKilidi), 42);
}

function hataDogrula(kod) {
  return hata => {
    assert.equal(hata.message, kod);
    assert.equal(bekleyenMi(hata), false);
    return true;
  };
}

describe('imzaDogrula', () => {
  it('ADT-013 ortam işaretini fonksiyona çevirir ve JSON kaydını değiştirmez', async () => {
    const once = JSON.stringify(IMZA_LISTESI);
    const sonuc = await imzaDogrula(KOK);
    assert.deepEqual(sonuc.hatalar, []);
    for (const ad of ['pergel', 'gonye']) {
      assert.equal(sonuc.uyarilar.includes('widget/' + ad + '.js: bekleniyor'), false);
    }
    assert.equal(JSON.stringify(IMZA_LISTESI), once);
  });

  it('eksik veya tanımsız ortamı ve farklı ADT kaynağını sessizce tamamlamaz', async () => {
    for (const tur of ['eksik', 'yanlis', 'kaynak']) {
      const liste = JSON.parse(JSON.stringify(IMZA_LISTESI));
      for (const tanim of liste.moduller.filter(kayit => kayit.kaynak === 'ADT-013')) {
        if (tur === 'eksik') tanim.argumanlar.pop();
        if (tur === 'yanlis') tanim.argumanlar[1].pxToBirim = 'baska';
        if (tur === 'kaynak') tanim.kaynak = 'ADT-006';
      }
      const sonuc = await imzaDogrula(KOK, liste);
      assert.equal(sonuc.hatalar.length, 2);
      for (const ad of ['pergel', 'gonye']) {
        assert.ok(sonuc.hatalar.some(hata => hata.startsWith('widget/' + ad + '.js:') &&
          hata.endsWith('WIDGET_AYAR_GECERSIZ')));
      }
    }
  });
});

describe('hizmetleriOlustur', () => {
  it('ölçü kilidini fabrikadan önce uygular ve başarısız nesneyi kaydetmez', () => {
    const { ctx, hizmetler } = motorKur(true);
    assert.throws(() => ctx.widget.pergel({ olcuKilidi: false }),
      hataDogrula('OLCU_KILIDI_IHLALI'));
    assert.deepEqual(hizmetler.widgetler, []);
    assert.throws(() => ctx.widget.pergel({}), hataDogrula('WIDGET_AYAR_GECERSIZ'));
    const pergel = ctx.widget.pergel({ olcuKilidi: true });
    const gonye = ctx.widget.gonye({ dogru: DOGRU });
    assert.deepEqual(hizmetler.widgetler, [pergel, gonye]);
    assert.equal(typeof pergel.cemberCiz, 'function');
    assert.equal(typeof gonye.dikmeBirak, 'function');
  });

  it('fabrikalara sahnenin güncel piksel dönüşümünü iletir', () => {
    const { ctx } = motorKur();
    ctx.sahne.olcek = 3;
    const pergel = ctx.widget.pergel({ aciklik: 0, olcuKilidi: false });
    assert.equal(pergel.aciklik, TOLERANS.pimYakalamaPx * 3);
    const gonye = ctx.widget.gonye({ dogru: DOGRU });
    const merkez = ilerle(DOGRU.A, DOGRU.yon + 90, TOLERANS.pimYakalamaPx * 2);
    gonye.yukle({ merkez, donus: DOGRU.yon, oturdu: false, t: 0 });
    assert.equal(gonye.oturdu, true);
    ctx.sahne.olcek = 1;
    gonye.girdi({ tur: 'birak', hedef: 'gonye' });
    assert.equal(gonye.oturdu, false);
    pergel.aciklik = 0;
    assert.equal(pergel.aciklik, TOLERANS.pimYakalamaPx);
  });
});

describe('kuruKos', () => {
  it('pergel ve gönye kullanan zinciri atlamadan tamamlar', () => {
    const veri = { ...veriOlustur(true), parametreler: {} };
    const duzenek = {
      id: veri.kod, surum: veri.surum,
      kur(ctx, seed) {
        void seed;
        ctx.durum = { pergel: ctx.widget.pergel({ olcuKilidi: true }),
          gonye: ctx.widget.gonye({ dogru: DOGRU }) };
      },
      ciz(ctx) {
        ctx.durum.pergel.ciz(ctx.sahne);
        ctx.durum.gonye.ciz(ctx.sahne);
      },
      girdi(ctx, olay) { void ctx; void olay; },
      ipucu(ctx, seviye) { if (seviye === 3) ctx.durum.gonye.otur(); return {}; },
      calistir(ctx) { void ctx; return { sure: 0, kare() {}, bitti() {} }; },
      basari(ctx) { void ctx; return { tamam: false, yanParca: false, neden: 'tamam' }; },
      tahta(ctx, ayar) { void ctx; void ayar; }
    };
    const sonuc = kuruKos(duzenek, veri, 42);
    assert.equal(sonuc.atlandi, false);
    assert.equal(sonuc.kayit.sayac.sayi, 0);
    assert.ok(sonuc.kayit.sayac.cokgen > 0);
    assert.equal(sonuc.ctx.durum.gonye.oturdu, true);
  });
});

describe('girdiDagit', () => {
  it('pergel ve gönye hedeflerini kayıtlı gerçek nesnelere dağıtır', () => {
    const { ctx, hizmetler } = motorKur();
    const pergel = ctx.widget.pergel({ olcuKilidi: false });
    const gonye = ctx.widget.gonye({ dogru: DOGRU });
    const olaylar = [];
    const duzenek = { girdi(baglam, olay) { olaylar.push(olay); } };
    const gonder = olay => girdiDagit(ctx, duzenek, olay, hizmetler);
    assert.equal(gonder({ tur: 'bas', hedef: 'pergelMerkez', x: 500, y: 500 }), true);
    assert.equal(gonder({ tur: 'surukle', hedef: 'pergelMerkez', dx: 12, dy: -8 }), true);
    assert.equal(gonder({ tur: 'birak', hedef: 'pergelMerkez' }), true);
    assert.deepEqual(pergel.merkez, { x: 512, y: 492 });
    assert.equal(gonder({ tur: 'bas', hedef: 'gonye', x: 600, y: 500 }), true);
    assert.equal(gonder({ tur: 'surukle', hedef: 'gonye', dx: 25, dy: -300 }), true);
    assert.equal(gonder({ tur: 'birak', hedef: 'gonye' }), true);
    assert.equal(gonye.oturdu, true);
    assert.equal(gonye.t, 325);
    assert.deepEqual(olaylar, []);
    const baska = { tur: 'tik', hedef: 'baska', x: 0, y: 0 };
    assert.equal(gonder(baska), false);
    assert.deepEqual(olaylar, [baska]);
  });
});

describe('ctxSahteOlustur', () => {
  it('ölçü kilidini gerçek motorla aynı sarmalayıcı üzerinden uygular', () => {
    const ctx = sahteKur(true);
    assert.throws(() => ctx.widget.pergel({ olcuKilidi: false }),
      hataDogrula('OLCU_KILIDI_IHLALI'));
    assert.throws(() => ctx.widget.pergel({}), hataDogrula('WIDGET_AYAR_GECERSIZ'));
    assert.throws(() => ctx.widget.gonye({}), hataDogrula('WIDGET_AYAR_GECERSIZ'));
    const pergel = ctx.widget.pergel({ olcuKilidi: true });
    const gonye = ctx.widget.gonye({ dogru: DOGRU });
    assert.equal(typeof pergel.cemberCiz, 'function');
    gonye.otur();
    assert.equal(gonye.oturdu, true);
    for (let i = 0; i < 1000; i++) pergel.ciz(ctx.sahne);
    gonye.ciz(ctx.sahne);
    assert.equal(sahneKaydi(ctx).sayac.sayi, 0);
  });

  it('aynı ayarlarla motorla eş durum üretir ve sahte sahnenin ölçeğini kullanır', () => {
    const ctx = sahteKur();
    const motor = motorKur().ctx;
    for (const baglam of [ctx, motor]) baglam.sahne.olcek = 2;
    const ayar = { aciklik: 0, olcuKilidi: false };
    const pergel = ctx.widget.pergel(ayar);
    assert.deepEqual(pergel.durum(), motor.widget.pergel(ayar).durum());
    assert.equal(pergel.aciklik, TOLERANS.pimYakalamaPx * 2);
    assert.deepEqual(ctx.widget.gonye({ dogru: DOGRU }).durum(),
      motor.widget.gonye({ dogru: DOGRU }).durum());
    pergel.ciz(ctx.sahne);
    assert.equal(sahneKaydi(ctx).sayac.sayi, 1);
  });

  it('açı tablosunu ve Defter fabrikalarını bekleyen imza olarak korur', () => {
    const ctx = sahteKur();
    // K-08 aciTablosu fabrikasini bagladiginda bu bekleme beklentisini guncelleyecek.
    assert.throws(() => ctx.widget.aciTablosu({}), hata => {
      assert.equal(hata.message, 'IMZA_EKSIK');
      return bekleyenMi(hata);
    });
    for (const ad of ['tahminRafi', 'kuralKarti', 'sina', 'kisayolYuvasi']) {
      assert.throws(() => ctx.defter[ad]({}), bekleyenMi);
    }
  });
});
