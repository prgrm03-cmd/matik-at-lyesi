import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedTesti } from '../araclar/seedTesti.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const SEED = join(KOK, 'araclar', 'seedTesti.js');

describe('seed düzenek seçimi', () => {
  for (const id of ['D01', 'D02']) {
    it('npm run seed -- ' + id + ' yalnız bin tohum çalıştırır', () => {
      const kosu = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['run', '--silent', 'seed', '--', id], { cwd: KOK, encoding: 'utf8' });
      assert.equal(kosu.error, undefined);
      assert.equal(kosu.status, 0, kosu.stderr);
      assert.equal(kosu.stderr, '');
      const ozet = JSON.parse(kosu.stdout.trim());
      assert.equal(ozet.gecti, 1000);
      assert.equal(ozet.hata, 0, JSON.stringify(ozet.ilkHatalar));
      assert.equal(ozet.atlandi, 0);
      assert.equal(ozet.sayi, 0);
      assert.deepEqual(ozet.parametreDenetimsiz, []);
    });
  }

  it('açık seçim kapsamı değiştirmeden yalnız seçilen dosyaları yükler', async t => {
    const kok = await mkdtemp(join(tmpdir(), 'matik-seed-secimi-'));
    t.after(() => rm(kok, { recursive: true, force: true }));
    await mkdir(join(kok, 'docs'));
    await mkdir(join(kok, 'duzenekler', 'D01'), { recursive: true });
    await writeFile(join(kok, 'package.json'), '{"type":"module"}');
    const kapsamYolu = join(kok, 'docs', 'kapsam.json');
    await writeFile(kapsamYolu, '["D02"]');
    for (const ad of ['D01.js', 'D01.json']) {
      await copyFile(join(KOK, 'duzenekler', 'D01', ad), join(kok, 'duzenekler', 'D01', ad));
    }
    const secilen = await seedTesti(kok, 'D01');
    assert.equal(secilen.gecti, 1000);
    assert.equal(secilen.hata, 0);
    const toplu = await seedTesti(kok);
    assert.equal(toplu.gecti, 0);
    assert.equal(toplu.hata, 1);
    assert.equal(toplu.ilkHatalar[0].id, 'D02');
    const eksik = await seedTesti(kok, 'D02');
    assert.equal(eksik.gecti, 0);
    assert.equal(eksik.hata, 1);
    assert.equal(eksik.ilkHatalar[0].id, 'D02');
    assert.equal(await readFile(kapsamYolu, 'utf8'), '["D02"]');
  });

  it('geçersiz kimlik türü ve yol geçişini reddeder', async () => {
    for (const id of ['', '.', '..', '../D02', '..\\D02', '/D02', 'C:\\D02',
      'D02/../D01', 'D02\0', 2, null]) {
      await assert.rejects(seedTesti(KOK, id),
        { message: 'DUZENEK_YOK', denetim: 'duzenekSecimi' });
    }
  });

  it('dosyası bulunmayan kimlikleri hata özetinde bildirir', async () => {
    for (const id of ['D00', 'D19', 'D09f']) {
      const ozet = await seedTesti(KOK, id);
      assert.equal(ozet.gecti, 0);
      assert.equal(ozet.hata, 1);
      assert.equal(ozet.ilkHatalar[0].id, id);
      assert.equal(ozet.ilkHatalar[0].kod, 'DUZENEK_YOK');
    }
  });

  it('seçim için hem JSON hem modül dosyası gerekir', async t => {
    const kok = await mkdtemp(join(tmpdir(), 'matik-seed-dosya-'));
    t.after(() => rm(kok, { recursive: true, force: true }));
    const dizin = join(kok, 'duzenekler', 'D01');
    await mkdir(dizin, { recursive: true });
    await writeFile(join(kok, 'package.json'), '{"type":"module"}');
    await copyFile(join(KOK, 'duzenekler', 'D01', 'D01.json'), join(dizin, 'D01.json'));
    const jsEksik = await seedTesti(kok, 'D01');
    assert.equal(jsEksik.gecti, 0);
    assert.equal(jsEksik.hata, 1);
    assert.equal(jsEksik.ilkHatalar[0].kod, 'DUZENEK_YOK');
    await copyFile(join(KOK, 'duzenekler', 'D01', 'D01.js'), join(dizin, 'D01.js'));
    await rm(join(dizin, 'D01.json'));
    const jsonEksik = await seedTesti(kok, 'D01');
    assert.equal(jsonEksik.gecti, 0);
    assert.equal(jsonEksik.hata, 1);
    assert.equal(jsonEksik.ilkHatalar[0].kod, 'DUZENEK_YOK');
  });

  it('geçersiz kimlik ve fazla argümanda sıfırdan farklı çıkar', () => {
    const gecersiz = spawnSync(process.execPath, [SEED, '../D02'],
      { cwd: KOK, encoding: 'utf8' });
    assert.equal(gecersiz.error, undefined);
    assert.equal(gecersiz.status, 1);
    assert.equal(gecersiz.stdout, '');
    assert.deepEqual(JSON.parse(gecersiz.stderr.trim()),
      { hata: 'DUZENEK_YOK', denetim: 'duzenekSecimi' });
    const fazla = spawnSync(process.execPath, [SEED, 'D01', 'D02'],
      { cwd: KOK, encoding: 'utf8' });
    assert.equal(fazla.error, undefined);
    assert.equal(fazla.status, 1);
    assert.equal(fazla.stdout, '');
    assert.deepEqual(JSON.parse(fazla.stderr.trim()),
      { hata: 'CLI_ARGUMAN_GECERSIZ', denetim: 'duzenekSecimi' });
  });
});
