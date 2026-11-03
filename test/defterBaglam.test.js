import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { hizmetleriOlustur, girdiDagit } from '../motor/baglam.js';
import { baslat, duzenekAc, calistir } from '../motor/motor.js';
import { rngOlustur } from '../motor/rng.js';
import { sahteSahneOlustur } from '../motor/sahteSahne.js';
import { motorOrtami } from './destek/motorOrtam.js';
import { IMZA_LISTESI, imzaDogrula } from '../araclar/imza.js';
import { kuruKos } from '../araclar/kuruKos.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const RAF = { hucreler: [{ ad: 'n', tur: 'sayac', min: 1, max: 3 }],
  etiketAnahtari: 'raf' };
const KART = { kalipAnahtari: 'k1', disliler: [{ ad: 'n', secenekler: [1, 2] }],
  dogru: { n: 2 } };

function veriOlustur() {
  return { id: 'D01', bayraklar: {}, kartlar: { k1: { kalip: '[n]' } }, nedenler: {},
    matik: { sinamaBasladi: 'start', sinamaTamam: 'done', karsiOrnek: 'example',
      kartUymaz: 'card' } };
}

function baglamKur(kancalar = {}) {
  const veri = veriOlustur();
  const { sahne } = sahteSahneOlustur(veri);
  const ctx = { veri, sahne, rng: rngOlustur(1), mod: { tahta: false } };
  const arayuz = Object.fromEntries([
    'soyle', 'ifade', 'kivilcim', 'sembol', 'defterAc', 'defterKapat'
  ].map(ad => [ad, () => {}]));
  Object.assign(arayuz, kancalar);
  const hizmetler = hizmetleriOlustur(ctx, arayuz, { ses: false });
  return { ctx, hizmetler };
}

describe('ctxSahteOlustur', () => {
  it('Defter fabrikalarından gerçek nesneler kurar ve Matik çağrılarını sayar', async () => {
    const ctx = ctxSahteOlustur('D01', veriOlustur(), 7);
    const raf = ctx.defter.tahminRafi(RAF);
    const kart = ctx.defter.kuralKarti(KART);
    const yuva = ctx.defter.kisayolYuvasi({ kabulEdilen: ['k1'], sensorler: ['a'],
      cozucu: () => ({ tamam: true, doldurulan: ['a'], eksik: [] }) });
    raf.hucreKoy('n', 2);
    kart.otomatikDoldur();
    yuva.sok('a');
    assert.equal(yuva.tak(kart), true);
    assert.deepEqual(raf.deger(), { n: 2 });
    assert.equal(kart.dogruMu(), true);
    assert.deepEqual(yuva.degerlendir(), { lamba: true, kurtarilan: 1, eksik: [] });
    const sonuc = await ctx.defter.sina(kart, () => ({ beklenen: { n: 2 }, ornek: {},
      ciz() { assert.fail('unexpected draw'); } }));
    assert.equal(sonuc.basarili, true);
    assert.equal(sahneKaydi(ctx).sayac.soyle, 2);
    assert.deepEqual(sahneKaydi(ctx).cagrilar, []);
  });

  it('ilk karşı örneği sahte sahnenin çağrılarına bir kez çizer', async () => {
    const ctx = ctxSahteOlustur('D01', veriOlustur(), 7);
    const kart = ctx.defter.kuralKarti(KART);
    const ornek = { x: 3, y: 4 };
    const sonuc = await ctx.defter.sina(kart, () => ({ beklenen: { n: 2 }, ornek,
      ciz(sahne) { assert.equal(sahne, ctx.sahne); sahne.pim(ornek); } }));
    assert.equal(sonuc.karsiOrnek, ornek);
    assert.deepEqual(sahneKaydi(ctx).cagrilar, [{ ad: 'pim', arg: [ornek] }]);
    assert.equal(sahneKaydi(ctx).sayac.soyle, 2);
  });

  it('sınama sırasında düzenek durumuna erişmez ve bilinmeyen Matik anahtarını reddeder', () => {
    const ctx = ctxSahteOlustur('D01', veriOlustur(), 7);
    const kart = ctx.defter.kuralKarti(KART);
    Object.defineProperty(ctx, 'durum', { get() { assert.fail('unexpected state read'); } });
    assert.doesNotThrow(() => ctx.defter.sina(kart, () => ({ beklenen: { n: 1 } })));
    assert.throws(() => ctx.matik.soyle('missing'), { message: 'MATIK_ANAHTAR_YOK' });
    assert.equal(sahneKaydi(ctx).sayac.soyle, 2);
  });
});

describe('hizmetleriOlustur', () => {
  it('kaydı listeye ve panel kancasına iletir ve önce eski paneli temizler', () => {
    const cagrilar = [];
    const { ctx, hizmetler } = baglamKur({
      defterTemizle: () => cagrilar.push('temizle'),
      defterKayit: (nesne, tanim) => cagrilar.push({ nesne, tanim })
    });
    assert.deepEqual(cagrilar, ['temizle']);
    const raf = ctx.defter.tahminRafi(RAF);
    const kart = ctx.defter.kuralKarti(KART);
    assert.deepEqual(hizmetler.defterler, [raf, kart]);
    assert.deepEqual(cagrilar.slice(1).map(kayit => kayit.nesne), [raf, kart]);
    assert.deepEqual(cagrilar[1].tanim, { tur: 'tahminRafi', ...RAF });
    assert.deepEqual(cagrilar[2].tanim, {
      tur: 'kuralKarti', anahtar: 'k1', kalip: '[n]', disliler: KART.disliler
    });
    assert.notEqual(cagrilar[1].tanim.hucreler[0], RAF.hucreler[0]);
    assert.notEqual(cagrilar[2].tanim.disliler[0], KART.disliler[0]);
  });

  it('panel kancaları olmayan sahte arayüzle kayıt yapar', () => {
    const { ctx, hizmetler } = baglamKur();
    const raf = ctx.defter.tahminRafi(RAF);
    assert.deepEqual(hizmetler.defterler, [raf]);
    assert.doesNotThrow(() => ctx.defter.ac());
    assert.doesNotThrow(() => ctx.defter.kapat());
  });

  it('Defter nesnelerini bir kez kaydeder ve girdiyi düzeneğe geçirir', async () => {
    const { ctx, hizmetler } = baglamKur();
    const raf = ctx.defter.tahminRafi(RAF);
    const kart = ctx.defter.kuralKarti(KART);
    const yuva = ctx.defter.kisayolYuvasi({ kabulEdilen: ['k1'], sensorler: [],
      cozucu: () => ({ tamam: true, doldurulan: [], eksik: [] }) });
    await ctx.defter.sina(kart, () => ({ beklenen: { n: 1 } }));
    assert.deepEqual(hizmetler.defterler, [raf, kart, yuva]);
    const olay = { tur: 'tik', hedef: 'other' };
    const olaylar = [];
    const duzenek = { girdi(baglam, girdi) {
      assert.equal(baglam, ctx);
      olaylar.push(girdi);
    } };
    assert.equal(girdiDagit(ctx, duzenek, olay, hizmetler), false);
    assert.deepEqual(olaylar, [olay]);
  });
});

describe('calistir', () => {
  it('Çalıştır ile kayıtlı tahmin rafını kilitler ve diğer nesneleri korur', async t => {
    const ortam = motorOrtami(t);
    const icerik = ortam.kok.ownerDocument.createElement('div');
    icerik.dataset.defterIcerik = '';
    ortam.ogeler.defter.append(icerik);
    ortam.veri.bayraklar.tahminRafi = true;
    await baslat({ kok: ortam.kok, url: new URLSearchParams('seed=42') });
    const ctx = await duzenekAc('D01', 42);
    const raf = ctx.defter.tahminRafi(RAF);
    const yuva = ctx.defter.kisayolYuvasi({ kabulEdilen: [], sensorler: [],
      cozucu: () => ({ tamam: false, doldurulan: [], eksik: [] }) });
    raf.hucreKoy('n', 2);
    await calistir(ctx);
    assert.throws(() => raf.hucreKoy('n', 3), { message: 'WIDGET_AYAR_GECERSIZ' });
    assert.deepEqual(raf.deger(), { n: 2 });
    assert.equal(yuva.kart, null);
    const dugmeler = icerik.querySelectorAll('button');
    assert.equal(dugmeler.length, 2);
    assert.ok(dugmeler.every(dugme => dugme.disabled));
  });
});

describe('kuruKos', () => {
  it('Defter kullanan düzeneği bekleyen fabrika saymadan tamamlar', () => {
    const veri = { ...veriOlustur(), kod: 'D01', surum: '1', parametreler: {},
      nedenler: { tamam: 'done' } };
    const duzenek = {
      id: veri.kod, surum: veri.surum,
      kur(ctx, seed) {
        void seed;
        ctx.durum.raf = ctx.defter.tahminRafi(RAF);
        ctx.durum.kart = ctx.defter.kuralKarti(KART);
      },
      ciz(ctx) { void ctx; },
      girdi(ctx, olay) { void ctx; void olay; },
      ipucu(ctx, seviye) { if (seviye === 3) ctx.durum.kart.otomatikDoldur(); return {}; },
      calistir(ctx) { void ctx; return { sure: 0, kare() {}, bitti() {} }; },
      basari(ctx) { void ctx; return { tamam: false, yanParca: false, neden: 'tamam' }; },
      tahta(ctx, ayar) { void ctx; void ayar; }
    };
    const sonuc = kuruKos(duzenek, veri, 42);
    assert.equal(sonuc.atlandi, false);
    assert.equal(sonuc.ctx.durum.kart.dogruMu(), true);
    assert.deepEqual(sonuc.ctx.durum.raf.deger(), { n: 1 });
  });
});

function isaretDeposu(t) {
  const kok = mkdtempSync(join(tmpdir(), 'matik-defter-imza-'));
  t.after(() => rmSync(kok, { recursive: true, force: true }));
  writeFileSync(join(kok, 'package.json'), '{"type":"module"}\n');
  cpSync(join(KOK, 'geo'), join(kok, 'geo'), { recursive: true });
  cpSync(join(KOK, 'docs/sozlesme_v1.md'), join(kok, 'sozlesme.md'));
  writeFileSync(join(kok, 'ortam.js'), [
    "import assert from 'node:assert/strict';",
    'export function dene(ilk, ikinci) {',
    '  for (const ortam of [ilk, ikinci]) {',
    '    assert.equal(ortam.pxToBirim(5), 5);',
    '    assert.equal(ortam.rng.seed, 1);',
    "    assert.equal(typeof ortam.rng.alt('probe').seed, 'number');",
    "    assert.equal(typeof ortam.sahne.pim, 'function');",
    '    ortam.matik.soyle();',
    '    ortam.arayuz.defterAc();',
    '    ortam.arayuz.defterKapat();',
    '    ortam.kayit({});',
    "    assert.equal(ortam.kalip, 'kalip');",
    "    assert.equal(ortam.korunan, 'untouched');",
    '  }',
    '  return {};',
    '}'
  ].join('\n'));
  return kok;
}

describe('imzaDogrula', () => {
  it('tüm ortam işaretlerini yol ve kaynaktan bağımsız her nesne argümanında çözer', async t => {
    const kok = isaretDeposu(t);
    const ortam = { pxToBirim: 'birim', rng: 'rng', sahne: 'sahne', matik: 'matik',
      arayuz: 'arayuz', kayit: 'kayit', kalip: 'kalip', korunan: 'untouched' };
    const liste = JSON.parse(JSON.stringify(IMZA_LISTESI));
    liste.moduller = [{ yol: 'ortam.js', kaynak: 'other', disarim: { dene: 2 },
      fabrika: 'dene', arayuz: 'Isaret', argumanlar: [ortam, { ...ortam }] }];
    liste.arayuzler.Isaret = {};
    const once = JSON.stringify(liste);
    assert.deepEqual(await imzaDogrula(kok, liste), { hatalar: [], uyarilar: [] });
    assert.equal(JSON.stringify(liste), once);
  });

  it('beş Defter imzasını bekleyen kaydı olmadan doğrular', async () => {
    const sonuc = await imzaDogrula(KOK);
    assert.deepEqual(sonuc.hatalar, []);
    const satirlar = IMZA_LISTESI.moduller.filter(tanim => tanim.yol.startsWith('defter/'));
    assert.equal(satirlar.length, 5);
    for (const tanim of satirlar) {
      assert.equal(tanim.kaynak, 'ADT-015');
      assert.equal(sonuc.uyarilar.includes(tanim.yol + ': bekleniyor'), false);
    }
  });
});
