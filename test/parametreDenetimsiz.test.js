import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D01 from '../duzenekler/D01/D01.js';
import { kuruKos } from '../araclar/kuruKos.js';
import { seedTesti } from '../araclar/seedTesti.js';

const VERI = {
  ...JSON.parse(readFileSync(new URL('../duzenekler/D01/D01.json', import.meta.url), 'utf8')),
  id: 'D02', kod: 'D02'
};
const DUZENEK = { ...D01, id: 'D02' };
const KURU = fileURLToPath(new URL('../araclar/kuru.js', import.meta.url));

// Gerçek D01 zincirini adaptörsüz kimlikle çalıştırır; üretim D02'si oluşturulmaz.
async function ornekHazirla() {
  const kok = await mkdtemp(join(tmpdir(), 'matikDenetimsiz'));
  const dizin = join(kok, 'duzenekler', 'D02');
  const js = join(dizin, 'D02.js');
  const json = join(dizin, 'D02.json');
  await mkdir(dizin, { recursive: true });
  await mkdir(join(kok, 'docs'));
  await writeFile(join(kok, 'package.json'), '{"type":"module"}');
  await writeFile(join(kok, 'docs', 'kapsam.json'), '["D02"]');
  const kaynak = readFileSync(new URL('../duzenekler/D01/D01.js', import.meta.url), 'utf8');
  await writeFile(js, kaynak.replace('export const id = \'D01\'', 'export const id = \'D02\''));
  await writeFile(json, JSON.stringify(VERI));
  return { kok, js, json };
}

describe('kuruKos', () => {
  it('parametre denetimsiz olsa da animasyon ve başarı zincirini tamamlar', () => {
    const kosu = kuruKos(DUZENEK, VERI, 42);
    assert.equal(kosu.atlandi, false);
    assert.deepEqual(kosu.gozlem.parametreDenetimsiz, ['D02']);
    assert.equal(kosu.ctx.durum.asama, 1);
    assert.deepEqual(kosu.sonuc, { tamam: false, yanParca: false, neden: 'yarimKaldi' });
  });

  it('adaptör eksikliği başka bir sözleşme ihlalini gizlemez', () => {
    const bozuk = { ...DUZENEK, ciz(ctx) { ctx.durum.asama++; } };
    assert.throws(() => kuruKos(bozuk, VERI, 42),
      hata => hata.denetim === 'cizDurumuDegistirdi');
  });
});

describe('kuruCalistir', () => {
  it('denetimsiz uyarısını basar ve exit 0 ile biter', async t => {
    const ornek = await ornekHazirla();
    t.after(() => rm(ornek.kok, { recursive: true, force: true }));
    const kosu = spawnSync(process.execPath, [KURU, ornek.js, ornek.json, '42'],
      { encoding: 'utf8' });
    assert.equal(kosu.error, undefined);
    assert.equal(kosu.status, 0, kosu.stderr);
    assert.deepEqual(JSON.parse(kosu.stderr.trim()),
      { uyari: 'denetimsiz', id: 'D02', denetim: 'parametreler' });
    const ozet = JSON.parse(kosu.stdout.trim());
    assert.equal(ozet.atlandi, false);
    assert.deepEqual(ozet.parametreDenetimsiz, ['D02']);
  });
});

describe('seedTesti', () => {
  it('1000 koşuyu geçirir ve denetimsiz kimliği yalnız bir kez listeler', async t => {
    const ornek = await ornekHazirla();
    t.after(() => rm(ornek.kok, { recursive: true, force: true }));
    const ozet = await seedTesti(ornek.kok);
    assert.equal(ozet.hata, 0, JSON.stringify(ozet.ilkHatalar));
    assert.equal(ozet.atlandi, 0);
    assert.equal(ozet.gecti, 1000);
    assert.deepEqual(ozet.parametreDenetimsiz, ['D02']);
  });
});
