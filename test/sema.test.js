import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { iskeletOlustur, iskeletVerisi } from '../iskelet.js';
import { veriDogrula, semaDogrula } from '../araclar/semaDogrula.js';

function kartEkle(veri) {
  veri.kartlar = {
    deneme: { kalip: 'TODO-R1 [ad]', disliler: [], dogru: {} }
  };
  veri.bayraklar.kartSayisi = 1;
}

async function geciciDizinde(calis) {
  const kok = await mkdtemp(join(tmpdir(), 'matik-sema-'));
  try { await calis(kok); } finally { await rm(kok, { recursive: true, force: true }); }
}

describe('veriDogrula', () => {
  it('şema sözleşmenin JSON bloğuyla birebir aynıdır', async () => {
    const belge = await readFile(new URL('../docs/sozlesme_v1.md', import.meta.url), 'utf8');
    const bolum = belge.slice(belge.indexOf('### 4.3'), belge.indexOf('### 4.4'));
    const alinti = bolum.match(/```json\n([\s\S]*?)\n```/)[1];
    const sema = await readFile(new URL('../sema.json', import.meta.url), 'utf8');
    assert.equal(sema.trim(), alinti.trim());
  });

  it('etiketler isteğe bağlıdır ve tanımlanırsa metin kuralları uygulanır', () => {
    const veri = iskeletVerisi('D01');
    assert.equal(veriDogrula(veri), true);
    veri.etiketler = { calistir: 'TODO-R1' };
    assert.equal(veriDogrula(veri), true);
    veri.etiketler.calistir = '<button>';
    assert.throws(() => veriDogrula(veri), /SEMA_HATASI/);
  });

  it('zorunlu alan eksikliğini ve bilinmeyen üst alanı reddeder', () => {
    const eksik = iskeletVerisi('D01');
    delete eksik.parametreler;
    assert.throws(() => veriDogrula(eksik), /SEMA_HATASI/);
    const fazla = iskeletVerisi('D01');
    fazla.kayit = {};
    assert.throws(() => veriDogrula(fazla), /SEMA_HATASI/);
    const bozuk = iskeletVerisi('D01');
    bozuk.turSayisi = 7;
    assert.throws(() => veriDogrula(bozuk), /SEMA_HATASI/);
  });

});

describe('veriDogrula', () => {
  it('kart sayısını ve sınama gereksinimini çapraz doğrular', () => {
    const veri = iskeletVerisi('D01');
    veri.bayraklar.sinama = true;
    assert.throws(() => veriDogrula(veri), /SEMA_HATASI/);
    kartEkle(veri);
    assert.equal(veriDogrula(veri), true);
    veri.bayraklar.kartSayisi = 2;
    assert.throws(() => veriDogrula(veri), /SEMA_HATASI/);
  });

  it('ölçü kilidinde açıölçer görünürlüğünü reddeder', () => {
    const veri = iskeletVerisi('D17');
    veri.bayraklar.olcuKilidi = true;
    assert.equal(veriDogrula(veri), true);
    veri.bayraklar.aciolcerGorunur = true;
    assert.throws(() => veriDogrula(veri), /SEMA_HATASI/);
  });
});

describe('semaDogrula', () => {
  it('kuru olay dosyasını atlar ve hataları dosya bilgisiyle toplar', async () => {
    await geciciDizinde(async kok => {
      await iskeletOlustur(kok);
      const klasor = join(kok, 'duzenekler', 'D01');
      await writeFile(join(klasor, 'D01.kuru.json'), '[{"tur":"tik"}]');
      assert.deepEqual(await semaDogrula(kok), { dosyaSayisi: 25, hatalar: [] });
      await writeFile(join(klasor, 'D01.json'), '{"id":"D01"}');
      const sonuc = await semaDogrula(kok);
      assert.equal(sonuc.dosyaSayisi, 25);
      assert.equal(sonuc.hatalar.length, 1);
      assert.equal(sonuc.hatalar[0].dosya, join(klasor, 'D01.json'));
      assert.equal(sonuc.hatalar[0].kod, 'SEMA_HATASI');
      assert.ok(sonuc.hatalar[0].bulgular.length > 0);
    });
  });

  it('komut satırı bozuk JSON için sıfırdan farklı çıkış verir', async () => {
    await geciciDizinde(async kok => {
      await iskeletOlustur(kok);
      await writeFile(join(kok, 'duzenekler', 'D01', 'D01.json'), '{');
      const betik = fileURLToPath(new URL('../araclar/semaDogrula.js', import.meta.url));
      const sonuc = spawnSync(process.execPath, [betik, kok], { encoding: 'utf8' });
      assert.equal(sonuc.status, 1, sonuc.stderr);
      assert.equal(JSON.parse(sonuc.stdout).hatalar[0].kod, 'SEMA_HATASI');
    });
  });
});
