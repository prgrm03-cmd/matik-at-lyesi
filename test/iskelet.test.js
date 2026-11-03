import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { iskeletOlustur, iskeletVerisi } from '../iskelet.js';
import { semaDogrula } from '../araclar/semaDogrula.js';

const BEKLENEN = [
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08',
  'D09a', 'D09b', 'D09c', 'D09d', 'D09e', 'D09f', 'D10a', 'D10b',
  'D11', 'D12', 'D12b', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18'
];

async function geciciDizinde(calis) {
  const kok = await mkdtemp(join(tmpdir(), 'matik-iskelet-'));
  try { await calis(kok); } finally { await rm(kok, { recursive: true, force: true }); }
}

describe('iskeletOlustur', () => {
  it('açık listedeki yirmi beş JSON geçerlidir ve varyantlar doğru dosyaya gider', async () => {
    await geciciDizinde(async kok => {
      const sonuc = await iskeletOlustur(kok);
      assert.deepEqual(sonuc.map(kayit => kayit.id), BEKLENEN);
      assert.ok(sonuc.every(kayit => kayit.olustu));
      assert.deepEqual(await semaDogrula(kok), { dosyaSayisi: 25, hatalar: [] });
      for (const id of BEKLENEN) {
        const veri = iskeletVerisi(id);
        const yol = join(kok, 'duzenekler', veri.kod, id + '.json');
        assert.deepEqual(JSON.parse(await readFile(yol, 'utf8')), veri);
        assert.equal(veri.bayraklar.kartSayisi, 0);
        assert.equal(veri.turSayisi, 1);
        assert.equal(veri.matik.giris, 'TODO-R1');
      }
      assert.equal(iskeletVerisi('D09f').kod, 'D09');
      assert.equal(iskeletVerisi('D10b').kod, 'D10');
      assert.equal(iskeletVerisi('D12b').kod, 'D12b');
    });
  });

});

describe('iskeletOlustur', () => {
  it('mevcut dosyayı ikinci çalıştırmada tek bayt değiştirmez', async () => {
    await geciciDizinde(async kok => {
      await iskeletOlustur(kok);
      const yol = join(kok, 'duzenekler', 'D01', 'D01.json');
      const mevcut = '{ "koru": "R1" }\n';
      await writeFile(yol, mevcut);
      const sonuc = await iskeletOlustur(kok);
      assert.ok(sonuc.every(kayit => !kayit.olustu));
      assert.equal(await readFile(yol, 'utf8'), mevcut);
    });
  });

  it('komut satırı hedef dizine yazar ve tekrarında dosyaları korur', async () => {
    await geciciDizinde(async kok => {
      const betik = fileURLToPath(new URL('../iskelet.js', import.meta.url));
      const ilk = spawnSync(process.execPath, [betik, kok], { encoding: 'utf8' });
      assert.equal(ilk.status, 0, ilk.stderr);
      assert.deepEqual(JSON.parse(ilk.stdout), { toplam: 25, olustu: 25, korundu: 0 });
      const ikinci = spawnSync(process.execPath, [betik, kok], { encoding: 'utf8' });
      assert.equal(ikinci.status, 0, ikinci.stderr);
      assert.deepEqual(JSON.parse(ikinci.stdout), { toplam: 25, olustu: 0, korundu: 25 });
    });
  });
});

describe('iskeletVerisi', () => {
  it('tanımlı Robot Kolu görünürlüğünü korur ve diğerleri yer tutucu kalır', () => {
    const robot = iskeletVerisi('D09a');
    assert.equal(robot.arac, 'C');
    assert.equal(robot.bayraklar.aciolcerGorunur, true);
    for (const id of ['D01', 'D08', 'D17', 'D18']) {
      const veri = iskeletVerisi(id);
      assert.equal(veri.arac, 'A');
      for (const [ad, deger] of Object.entries(veri.bayraklar)) {
        assert.equal(deger, ad === 'kartSayisi' ? 0 : false);
      }
    }
    assert.throws(() => iskeletVerisi('D19'), /DUZENEK_YOK/);
  });
});
