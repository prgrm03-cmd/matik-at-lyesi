import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { boyutDogrula, ilkYuklemeMi } from '../araclar/boyut.js';
import { satirDogrula, satirSayisi } from '../araclar/satir.js';
import {
  dalAjani, sahiplikDogrula, yalnizMetinMi, yolYetkisi
} from '../araclar/sahiplik.js';

async function gecici(is) {
  const kok = await mkdtemp(join(tmpdir(), 'matik-check-sinir-'));
  try {
    await is(kok);
  } finally {
    await rm(kok, { recursive: true, force: true });
  }
}

async function yaz(kok, yol, icerik) {
  const tam = join(kok, yol);
  await mkdir(dirname(tam), { recursive: true });
  await writeFile(tam, icerik);
}

function git(kok, ...arg) {
  return execFileSync('git', arg, { cwd: kok, encoding: 'utf8', stdio: 'pipe' });
}

async function depo(kok) {
  git(kok, 'init', '-b', 'main');
  git(kok, 'config', 'user.name', 'Check Test');
  git(kok, 'config', 'user.email', 'check@example.invalid');
  await yaz(kok, 'duzenekler/D01/D01.json', JSON.stringify(veri()));
  git(kok, 'add', '.');
  git(kok, 'commit', '-m', 'taban');
}

function veri() {
  return {
    id: 'D01', bayraklar: { olcuKilidi: false }, matik: { giris: 'Pimi tut.' },
    ipucu: [{ vurgu: ['pimA'], ne: 'Pimi izle.' }, { metin: 'Pime bak.' }, { ne: 'Pim tut.' }],
    parametreler: { konum: { min: 250, max: 750 } }
  };
}

test('satır sınırı boş ve yorum satırlarını sayar, sonlandırıcıyı iki kez saymaz', async () => {
  assert.equal(satirSayisi(''), 0);
  assert.equal(satirSayisi('a\r\nb\r\n'), 2);
  assert.equal(satirSayisi('a\nb'), 2);
  await gecici(async kok => {
    await yaz(kok, 'duzenekler/D01/D01.js', '//\n'.repeat(400));
    assert.deepEqual(await satirDogrula(kok), []);
    await yaz(kok, 'duzenekler/D01/D01.js', '//\n'.repeat(401));
    assert.match((await satirDogrula(kok)).join('\n'), /401 > 400/);
  });
});

test('JSON ve kuru olay bayt sınırlarında eşitlik geçer, bir bayt aşımı kalır', async () => {
  await gecici(async kok => {
    await yaz(kok, 'duzenekler/D01/D01.json', ' '.repeat(12000));
    await yaz(kok, 'duzenekler/D01/D01.kuru.json', ' '.repeat(2000));
    assert.deepEqual((await boyutDogrula(kok)).hatalar, []);
    await yaz(kok, 'duzenekler/D01/D01.json', ' '.repeat(12001));
    await yaz(kok, 'duzenekler/D01/D01.kuru.json', ' '.repeat(2001));
    assert.equal((await boyutDogrula(kok)).hatalar.length, 2);
    assert.equal((await satirDogrula(kok)).length, 2);
  });
});

test('varlık toplamı Matik dışındaki görselleri de sayar ve PNG sınırını uygular', async () => {
  await gecici(async kok => {
    await yaz(kok, 'varlik/ikon/a.svg', ' '.repeat(1200000));
    assert.deepEqual((await boyutDogrula(kok)).hatalar, []);
    await yaz(kok, 'varlik/ikon/a.svg', ' '.repeat(1200001));
    assert.match((await boyutDogrula(kok)).hatalar.join('\n'), /varlik/);
    await yaz(kok, 'varlik/ikon/b.png', ' '.repeat(100001));
    assert.match((await boyutDogrula(kok)).hatalar.join('\n'), /PNG/);
  });
});

test('ilk yükleme main ve Matik dahil tam kümeyi sayar, düzenekleri saymaz', async () => {
  const dahil = ['index.html', 'main.js', 'motor/a.js', 'geo/a.js', 'widget/a.js',
    'defter/a.js', 'stil/a.css', 'varlik/matik/a.svg'];
  const haric = ['duzenekler/D01/D01.js', 'varlik/ikon/a.svg', 'test/a.js', 'araclar/a.js'];
  for (const yol of dahil) assert.equal(ilkYuklemeMi(yol), true, yol);
  for (const yol of haric) assert.equal(ilkYuklemeMi(yol), false, yol);
  await gecici(async kok => {
    await yaz(kok, 'main.js', ' '.repeat(2000000));
    assert.deepEqual((await boyutDogrula(kok)).hatalar, []);
    await yaz(kok, 'duzenekler/D01/D01.js', ' '.repeat(15000));
    assert.equal((await boyutDogrula(kok)).ilkYukleme, 2000000);
    await yaz(kok, 'index.html', 'x');
    assert.match((await boyutDogrula(kok)).hatalar.join('\n'), /ilkYukleme/);
  });
});

test('dal önekleri ve sahiplik tablosu başka ajanın alanını açmaz', () => {
  assert.equal(dalAjani('cx-m/K-04-check'), 'CX-M');
  assert.equal(dalAjani('gm/G-01-D02'), 'GM-D');
  assert.equal(dalAjani('gm/G-T2-ihlal'), 'GM-T');
  assert.equal(dalAjani('gm/G-E1-erisim'), 'GM-E');
  assert.equal(dalAjani('m/R1-metin'), 'Matematikce');
  assert.equal(dalAjani('sozlesme/v1'), 'Fable');
  assert.equal(dalAjani('feature/check'), null);
  assert.equal(yolYetkisi('CX-M', 'araclar/check.js'), true);
  assert.equal(yolYetkisi('CX-M', 'test/check.test.js'), true);
  assert.equal(yolYetkisi('CX-M', 'widget/aciolcer.js'), false);
  assert.equal(yolYetkisi('CX-A', 'widget/aciolcer.js'), true);
  assert.equal(yolYetkisi('GM-D', 'duzenekler/D10/D10b.json'), true);
  assert.equal(yolYetkisi('CX-Z', 'duzenekler/D12b/D12b.js'), true);
  assert.equal(yolYetkisi('CX-M', 'duzenekler/D02/D02.js'), false);
  assert.equal(yolYetkisi('Fable', 'sozlesme.md'), true);
  assert.equal(yolYetkisi('Fable', 'docs/sozlesme_v1.md'), true);
  assert.equal(yolYetkisi('Matematikce', 'sozlesme.md'), false);
});

test('motorun kapsam listesi yalnız CX-M sahipliğindedir', () => {
  assert.equal(yolYetkisi('CX-M', 'docs/kapsam.json'), true);
  const digerleri = ['CX-A', 'CX-Z', 'GM-D', 'GM-T', 'GM-E', 'Matematikce', 'Fable', 'main', null];
  for (const ajan of digerleri) {
    assert.equal(yolYetkisi(ajan, 'docs/kapsam.json'), false, String(ajan));
  }
  for (const yol of ['docs/kapsam.json.bak', 'docs/adt/ADT-010.md', 'docs/sozlesme_v1.md']) {
    assert.equal(yolYetkisi('CX-M', yol), false, yol);
  }
});

test('R1 metni değişebilir ama bayrak, parametre ve vurgu hedefi değişemez', () => {
  const once = veri();
  const sonra = structuredClone(once);
  sonra.matik.giris = 'Pimi buraya tut.';
  sonra.ipucu[2].ne = 'İlk pimi tut.';
  assert.equal(yalnizMetinMi(once, sonra), true);
  sonra.bayraklar.olcuKilidi = true;
  assert.equal(yalnizMetinMi(once, sonra), false);
  sonra.bayraklar.olcuKilidi = false;
  sonra.ipucu[0].vurgu = ['pimB'];
  assert.equal(yalnizMetinMi(once, sonra), false);
  sonra.ipucu[0].vurgu = ['pimA'];
  sonra.parametreler.konum.max = 999;
  assert.equal(yalnizMetinMi(once, sonra), false);
  const kart = { kartlar: { a: { kalip: '[x] olan', dogru: { x: 'dik' } } } };
  const metin = structuredClone(kart);
  metin.kartlar.a.kalip = '[x] olan kenar';
  assert.equal(yalnizMetinMi(kart, metin), true);
  metin.kartlar.a.kalip = '[y] olan kenar';
  assert.equal(yalnizMetinMi(kart, metin), false);
});

test('sahiplik gerçek main...HEAD farkını ve PR ADT metnini okur', async () => {
  await gecici(async kok => {
    await depo(kok);
    assert.deepEqual(sahiplikDogrula(kok, {}).hatalar, []);
    git(kok, 'switch', '-c', 'cx-m/K-04-check');
    await yaz(kok, 'araclar/imzaListesi.json', '{}');
    git(kok, 'add', '.');
    git(kok, 'commit', '-m', 'imza');
    const yok = sahiplikDogrula(kok, {});
    assert.deepEqual(yok.hatalar, []);
    assert.equal(yok.uyarilar.length, 1);
    assert.equal(sahiplikDogrula(kok, { PR_BODY: '' }).uyarilar.length, 1);
    assert.equal(sahiplikDogrula(kok, { PR_BODY: 'K-04' }).hatalar.length, 1);
    assert.deepEqual(sahiplikDogrula(kok, { PR_BODY: 'ADT-006' }).hatalar, []);
    await yaz(kok, 'duzenekler/D02/D02.js', 'export const id = "D02";');
    git(kok, 'add', '.');
    git(kok, 'commit', '-m', 'yetkisiz');
    const sonuc = sahiplikDogrula(kok, { PR_BODY: 'ADT-006' });
    assert.match(sonuc.hatalar.join('\n'), /D02/);
  });
});

test('m dalında commit edilmiş JSON metni geçer, teknik değişiklik kalır', async () => {
  await gecici(async kok => {
    await depo(kok);
    git(kok, 'switch', '-c', 'm/R1-D01');
    const yeni = veri();
    yeni.matik.giris = 'Pimi getir.';
    await yaz(kok, 'duzenekler/D01/D01.json', JSON.stringify(yeni));
    git(kok, 'add', '.');
    git(kok, 'commit', '-m', 'metin');
    assert.deepEqual(sahiplikDogrula(kok, {}).hatalar, []);
    yeni.bayraklar.olcuKilidi = true;
    await yaz(kok, 'duzenekler/D01/D01.json', JSON.stringify(yeni));
    git(kok, 'add', '.');
    git(kok, 'commit', '-m', 'teknik');
    assert.match(sahiplikDogrula(kok, {}).hatalar.join('\n'), /yetkili değil/);
  });
});

test('sahiplik başka sahibin dosyasını taşıyarak gizlemeyi reddeder', async () => {
  await gecici(async kok => {
    await depo(kok);
    await yaz(kok, 'duzenekler/D02/D02.js', 'export const id = "D02";');
    git(kok, 'add', '.');
    git(kok, 'commit', '-m', 'D02');
    git(kok, 'switch', '-c', 'cx-m/K-04-check');
    await mkdir(join(kok, 'araclar'));
    git(kok, 'mv', 'duzenekler/D02/D02.js', 'araclar/tasindi.js');
    git(kok, 'commit', '-m', 'tasi');
    assert.match(sahiplikDogrula(kok, {}).hatalar.join('\n'), /duzenekler\/D02/);
  });
});
