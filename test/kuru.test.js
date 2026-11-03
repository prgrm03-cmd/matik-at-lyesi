import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { kuruKos, ipucuTekrariniDene } from '../araclar/kuruKos.js';
import { olaylariOku, seedOku, kuruDosyasiOku } from '../araclar/kuruDosya.js';
import * as D01 from '../duzenekler/D01/D01.js';

const D01_VERI = JSON.parse(readFileSync(
  new URL('../duzenekler/D01/D01.json', import.meta.url), 'utf8'));

function ornek() {
  const sira = [];
  const veri = { ...D01_VERI, id: 'D02', kod: 'D02', parametreler: {} };
  const duzenek = {
    id: veri.kod, surum: veri.surum,
    kur(ctx, seed) { sira.push('kur'); ctx.durum = { seed, asama: 0 }; },
    ciz(ctx) { sira.push('ciz'); ctx.sahne.pim({ x: 100, y: 200 }, { id: 'A' }); },
    girdi(ctx, olay) { sira.push('girdi'); ctx.durum.asama = olay.x; },
    ipucu(ctx, seviye) { sira.push('ipucu' + seviye); return {}; },
    calistir(ctx) {
      sira.push('calistir');
      return { sure: 10, kare(t) { sira.push('kare' + t); ctx.durum.asama = t; },
        bitti() { sira.push('bitti'); } };
    },
    basari(ctx) { void ctx; sira.push('basari');
      return { tamam: true, yanParca: false, neden: 'tamam' }; },
    tahta(ctx, ayar) { void ctx; void ayar; sira.push('tahta'); }
  };
  return { duzenek, veri, sira };
}

describe('kuruKos', () => {
  it('olayları ipuçlarından önce ve animasyon karelerini sırayla işler', () => {
    const { duzenek, veri, sira } = ornek();
    const sonuc = kuruKos(duzenek, veri, 42, {
      olaylar: [{ tur: 'surukle', x: 10, y: 20, hedef: 'A' }], tahta: true
    });
    assert.equal(sonuc.atlandi, false);
    assert.equal(sonuc.ctx.mod.tahta, true);
    assert.deepEqual(sira, ['kur', 'tahta', 'ciz', 'girdi', 'ipucu1', 'ciz',
      'ipucu3', 'ciz', 'calistir', 'kare0', 'kare0.5', 'kare1', 'bitti', 'ciz',
      'basari', 'basari']);
    assert.equal(sonuc.kayit.sayac.pim, 4);
  });
});

describe('kuruKos', () => {
  it('yer tutucuyu atlar ancak aynı kodlu sıradan hatayı kırmızı sayar', () => {
    const { duzenek, veri } = ornek();
    duzenek.kur = function(ctx, seed) { void seed; ctx.defter.kuralKarti({}); };
    assert.equal(kuruKos(duzenek, veri, 42).atlandi, true);
    duzenek.kur = function(ctx, seed) {
      void ctx; void seed; throw new Error('IMZA_EKSIK');
    };
    assert.throws(() => kuruKos(duzenek, veri, 42), { message: 'IMZA_EKSIK' });
  });
});

describe('kuruKos', () => {
  it('yer tutucu öncesindeki ölçü kilidi ihlalini gizlemez', () => {
    const { duzenek, veri } = ornek();
    veri.bayraklar = { ...veri.bayraklar, olcuKilidi: true };
    duzenek.kur = function(ctx, seed) {
      void seed;
      ctx.sahne.sayi({ x: 0, y: 0 }, 90);
      ctx.defter.kuralKarti({});
    };
    assert.throws(() => kuruKos(duzenek, veri, 42), { message: 'OLCU_KILIDI_IHLALI' });
  });
});

describe('kuruKos', () => {
  it('çizimde durum değişmesini ve bozuk başarı sonucunu reddeder', () => {
    const a = ornek();
    a.duzenek.ciz = function(ctx) { ctx.durum.asama++; };
    assert.throws(() => kuruKos(a.duzenek, a.veri, 42),
      hata => hata.denetim === 'cizDurumuDegistirdi');
    const b = ornek();
    b.duzenek.basari = function(ctx) { void ctx; return { tamam: 'evet' }; };
    assert.throws(() => kuruKos(b.duzenek, b.veri, 42), { message: 'IMZA_EKSIK' });
  });
});

describe('kuruKos', () => {
  it('tekrarlanan üçüncü ipucunda yan etkili başarı sorgusunu yakalar', () => {
    const { duzenek, veri } = ornek();
    duzenek.basari = function(ctx) {
      ctx.durum.asama++;
      return { tamam: false, yanParca: false, neden: 'tamam' };
    };
    assert.throws(() => ipucuTekrariniDene(duzenek, veri, 42),
      hata => hata.denetim === 'basariSafligi');
  });
});

describe('kuruKos', () => {
  it('gerçek D01 iskeletinde tamamlanma ve sayı çağrısı üretmez', () => {
    const kosu = kuruKos(D01, D01_VERI, 42);
    assert.equal(kosu.atlandi, false);
    assert.equal(kosu.sonuc.tamam, false);
    assert.equal(kosu.kayit.sayac.sayi || 0, 0);
  });
});

describe('olaylariOku', () => {
  it('eksik dosyayı boş sayar ve bozuk ya da büyük betiği reddeder', async () => {
    const dizin = await mkdtemp(join(tmpdir(), 'matikKuru'));
    const yol = join(dizin, 'D02.kuru.json');
    try {
      assert.deepEqual(await olaylariOku(yol), []);
      const olaylar = [{ tur: 'surukle', x: 10, y: 20, hedef: 'lazerA' }];
      await writeFile(yol, JSON.stringify(olaylar));
      assert.deepEqual(await olaylariOku(yol), olaylar);
      await writeFile(yol, JSON.stringify([{ tur: 'bilinmeyen', x: 0, y: 0 }]));
      await assert.rejects(olaylariOku(yol), { message: 'SEMA_HATASI' });
      await writeFile(yol, ' '.repeat(2049));
      await assert.rejects(olaylariOku(yol), { message: 'SEMA_HATASI' });
    } finally {
      await rm(dizin, { recursive: true, force: true });
    }
  });
});

describe('kuruCalistir', () => {
  it('Node komutunda döküm üretir ve geçersiz seed için başarısız çıkar', () => {
    const kok = fileURLToPath(new URL('../', import.meta.url));
    const arg = ['araclar/kuru.js', 'duzenekler/D01/D01.js', 'duzenekler/D01/D01.json'];
    const kosu = spawnSync(process.execPath, [...arg, '42', '--dokum'], {
      cwd: kok, encoding: 'utf8'
    });
    assert.equal(kosu.status, 0, kosu.stderr);
    const satirlar = kosu.stdout.trim().split('\n').map(s => JSON.parse(s));
    assert.ok(satirlar.some(s => s.ad === 'pim'));
    assert.equal(satirlar[satirlar.length - 1].sonuc.tamam, false);
    const hata = spawnSync(process.execPath, [...arg, 'abc'], { cwd: kok, encoding: 'utf8' });
    assert.equal(hata.status, 1);
    assert.match(hata.stderr, /RNG_SEED_GECERSIZ/);
  });
});

describe('seedOku', () => {
  it('uint32 sınırlarını kabul eder ve örtük sayıya dönüşümü reddeder', () => {
    assert.equal(seedOku('0'), 0);
    assert.equal(seedOku('4294967295'), 4294967295);
    for (const seed of ['abc', '', '-1', '1.5', '4294967296', '1e2', ' 1']) {
      assert.throws(() => seedOku(seed), { message: 'RNG_SEED_GECERSIZ' });
    }
  });
});

describe('ipucuTekrariniDene', () => {
  it('ipucu içindeki yer tutucudan önceki sayı ihlalini atlamaz', () => {
    const { duzenek, veri } = ornek();
    veri.bayraklar = { ...veri.bayraklar, olcuKilidi: true };
    duzenek.ipucu = function(ctx, seviye) {
      void seviye;
      ctx.sahne.sayi({ x: 0, y: 0 }, 90);
      ctx.defter.kuralKarti({});
    };
    assert.throws(() => ipucuTekrariniDene(duzenek, veri, 42),
      { message: 'OLCU_KILIDI_IHLALI' });
  });
});

describe('kuruDosyasiOku', () => {
  it('yüklenemeyen modül için tanımlı hata kodunu verir', async () => {
    const dizin = await mkdtemp(join(tmpdir(), 'matikKuru'));
    try {
      const yol = join(dizin, 'D01.json');
      await writeFile(yol, JSON.stringify(D01_VERI));
      await assert.rejects(kuruDosyasiOku(join(dizin, 'eksik.js'), yol),
        { message: 'DUZENEK_YOK' });
    } finally {
      await rm(dizin, { recursive: true, force: true });
    }
  });
});
