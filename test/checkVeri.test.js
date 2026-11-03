import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { iskeletVerisi } from '../iskelet.js';
import { kodVeriBulgular, semaDogrula, veriDogrula } from '../araclar/semaDogrula.js';
import { metinBulgular, metinDogrula } from '../araclar/metin.js';

function veriOlustur(id = 'D01') {
  return JSON.parse(JSON.stringify(iskeletVerisi(id)).replace(/TODO-R1/g, 'Pimi tut.'));
}

function kod(govde, surum = '1.0.0') {
  return "export const surum = '" + surum + "';\n" + govde;
}

async function gecici(calis) {
  const kok = await mkdtemp(join(tmpdir(), 'matik-check-veri-'));
  try {
    await mkdir(join(kok, 'duzenekler', 'D01'), { recursive: true });
    await calis(kok);
  } finally {
    await rm(kok, { recursive: true, force: true });
  }
}

describe('K-04 sema kanitlari', () => {
  const cagrilar = [
    "ctx.matik.soyle('eksik');",
    "ctx.sahne.etiket({x: 1, y: 2}, 'eksik');",
    "ctx.sahne.dugme({id: 'baslat', anahtar: 'eksik'});",
    "const sonuc = {neden: 'eksik'};"
  ];

  for (const cagri of cagrilar) {
    it('JSON anahtari arar: ' + cagri, () => {
      const veri = veriOlustur();
      const bulgular = kodVeriBulgular(kod(cagri), veri);
      assert.equal(bulgular.length, 1, JSON.stringify(bulgular));
      assert.match(bulgular[0], /eksik anahtari yok/);
    });
  }

  it('surum, yorum, kacis, sabit sablon ve JSON bolumlerini ayirt eder', () => {
    const veri = veriOlustur();
    veri.etiketler = { pim: 'Pim', calistir: 'Çalıştır' };
    const kaynak = [
      "// ctx.matik.soyle('yok');",
      "ctx.matik.soyle('\\u0067iris');",
      "ctx.matik.soyle('tamam');",
      "ctx.sahne.etiket({x: 1}, 'pim');",
      "ctx.sahne.dugme({anahtar: 'calistir'});",
      "const sonuc = {neden: 'tamam'};",
      'ctx.matik.soyle(' + String.fromCharCode(96) + 'giris' + String.fromCharCode(96) + ');'
    ].join('\n');
    assert.deepEqual(kodVeriBulgular(kod(kaynak), veri), []);
    assert.match(kodVeriBulgular(kod('', '9.9.9'), veri)[0], /surum/);
    assert.match(kodVeriBulgular(kod("const x = {neden: 'giris'};"), veri)[0], /nedenler/);
    assert.match(kodVeriBulgular(kod("ctx.sahne.etiket({}, 'giris');"), veri)[0], /etiketler/);
  });

  it('surumun yerel sabit dis aktarimini denetler; degisken anahtari uydurmaz', () => {
    const kaynak = "const v = '1.0.0'; export {v as surum}; ctx.matik.soyle(anahtar);";
    assert.deepEqual(kodVeriBulgular(kaynak, veriOlustur()), []);
    const dinamik = "sahne[etiket]({}, 'eksik'); const x = {[neden]: 'eksik'};";
    assert.deepEqual(kodVeriBulgular(kod(dinamik), veriOlustur()), []);
    const sabit = "ctx['matik']['soyle']('giris');";
    assert.deepEqual(kodVeriBulgular(kod(sabit), veriOlustur()), []);
    assert.match(kodVeriBulgular('export const id = "D01";', veriOlustur())[0], /surum/);
  });

  it('kart, sinama ve olcu kilidi capraz kurallari kirmizidir', () => {
    for (const degistir of [
      veri => { veri.bayraklar.kartSayisi = 1; },
      veri => { veri.bayraklar.sinama = true; },
      veri => {
        veri.bayraklar.olcuKilidi = true;
        veri.bayraklar.aciolcerGorunur = true;
      }
    ]) {
      const veri = veriOlustur();
      degistir(veri);
      assert.throws(() => veriDogrula(veri), /SEMA_HATASI/);
    }
  });
});

describe('K-04 sema dosya ve komut kanitlari', () => {
  it('ayni JS her JSON varyantiyla eslenir', async () => {
    await gecici(async kok => {
      const klasor = join(kok, 'duzenekler', 'D09');
      await mkdir(klasor);
      const a = veriOlustur('D09a');
      const b = veriOlustur('D09b');
      a.etiketler = { pim: 'Pim' };
      await writeFile(join(klasor, 'D09a.json'), JSON.stringify(a));
      await writeFile(join(klasor, 'D09b.json'), JSON.stringify(b));
      await writeFile(join(klasor, 'D09.js'), kod("ctx.sahne.etiket({}, 'pim');"));
      const sonuc = await semaDogrula(kok);
      assert.equal(sonuc.dosyaSayisi, 2);
      assert.equal(sonuc.hatalar.length, 1);
      assert.match(sonuc.hatalar[0].dosya, /D09b.json$/);
    });
  });

  it('JS surum farki CLI cikisini kirmizi yapar; kuru JSON atlanir', async () => {
    await gecici(async kok => {
      const klasor = join(kok, 'duzenekler', 'D01');
      await writeFile(join(klasor, 'D01.json'), JSON.stringify(veriOlustur()));
      await writeFile(join(klasor, 'D01.kuru.json'), '[]');
      await writeFile(join(klasor, 'D01.js'), kod('', '2.0.0'));
      const betik = fileURLToPath(new URL('../araclar/semaDogrula.js', import.meta.url));
      const sonuc = spawnSync(process.execPath, [betik, kok], { encoding: 'utf8' });
      assert.equal(sonuc.status, 1, sonuc.stderr);
      assert.match(sonuc.stdout, /surum/);
      await writeFile(join(klasor, 'D01.js'), kod(''));
      assert.deepEqual(await semaDogrula(kok), { dosyaSayisi: 1, hatalar: [] });
    });
  });
});

describe('K-04 metin kanitlari', () => {
  it('yasak dosyasi sozlesme 8.4 listesiyle birebirdir', async () => {
    const belge = await readFile(new URL('../docs/sozlesme_v1.md', import.meta.url), 'utf8');
    const bolum = belge.slice(belge.indexOf('### 8.4'), belge.indexOf('### 8.5'));
    const beklenen = bolum.match(/\x60(soru, [^\x60]+)\x60/)[1].split(', ');
    const dosya = await readFile(new URL('../docs/yasakSozcuk.txt', import.meta.url), 'utf8');
    assert.deepEqual(dosya.trim().split(/\r?\n/), beklenen);
    for (const sozcuk of beklenen) {
      const veri = veriOlustur();
      veri.matik.giris = sozcuk.toLocaleUpperCase('tr-TR') + '!';
      assert.ok(metinBulgular(veri).length > 0, sozcuk);
    }
  });

  it('140 karakter siniri, HTML ve yalniz ad yer tutucusu denetlenir', () => {
    const veri = veriOlustur();
    veri.matik.giris = 'a'.repeat(140);
    assert.deepEqual(metinBulgular(veri), []);
    for (const metin of ['a'.repeat(141), '<b>Pim</b>', '{sayi}', '{ad', '{{ad}}']) {
      veri.matik.giris = metin;
      assert.ok(metinBulgular(veri).length > 0, metin);
    }
    veri.matik.giris = '{ad} pimi raya geldi.';
    assert.deepEqual(metinBulgular(veri), []);
  });

  it('kilitli metinde rakam yok; teknik kimlik ve parametre sayilari korunur', () => {
    const veri = veriOlustur('D17');
    veri.bayraklar.olcuKilidi = true;
    veri.parametreler.konum = { min: 10, max: 20 };
    veri.notlar = 'R1 teknik not: 180';
    assert.deepEqual(metinBulgular(veri), []);
    veri.etiketler = { bilgi: '2 pim' };
    assert.match(metinBulgular(veri).join('\n'), /olcu kilidinde rakam/);
    veri.bayraklar.olcuKilidi = false;
    assert.deepEqual(metinBulgular(veri), []);
  });

  it('D15 JSON icindeki teknik 180 de reddedilir; pi pimin parcasi degildir', () => {
    const veri = veriOlustur('D15');
    veri.matik.giris = 'Pimi raya getir.';
    assert.deepEqual(metinBulgular(veri), []);
    veri.parametreler.konum = { min: 1, max: 180 };
    assert.match(metinBulgular(veri).join('\n'), /D15.*180/);
    for (const metin of ['yamuk', 'paralelkenar', 'deltoid', 'iç bükey', 'dış bükey']) {
      const yeni = veriOlustur();
      yeni.matik.giris = metin;
      assert.ok(metinBulgular(yeni).length > 0, metin);
    }
  });

  it('kartlar, siparisler, raf, ipucu ve yan parca da metin taramasina girer', () => {
    const veri = veriOlustur();
    veri.kartlar = { k: { kalip: 'puan [ad]', disliler: [{ secenekler: ['soru'] }] } };
    veri.siparisler = [{ id: 's1', metin: 'cevap' }];
    veri.tahminRafi = [{ etiket: 'hata', secenekler: ['sınav'] }];
    veri.ipucu[2].ne = 'test';
    veri.yanParca = { basari: 'bravo' };
    const sonuc = metinBulgular(veri).join('\n');
    for (const yol of ['kartlar', 'siparisler', 'tahminRafi', 'ipucu', 'yanParca']) {
      assert.ok(sonuc.includes(yol), yol);
    }
  });
});

describe('K-04 metin dosya ve komut kaniti', () => {
  it('bozuk metin CLI cikisini kirmizi yapar', async () => {
    await gecici(async kok => {
      const veri = veriOlustur();
      veri.matik.giris = 'Yanlış!';
      await writeFile(join(kok, 'duzenekler', 'D01', 'D01.json'), JSON.stringify(veri));
      assert.ok((await metinDogrula(kok)).length > 0);
      const betik = fileURLToPath(new URL('../araclar/metin.js', import.meta.url));
      const sonuc = spawnSync(process.execPath, [betik, kok], { encoding: 'utf8' });
      assert.equal(sonuc.status, 1, sonuc.stderr);
      assert.match(sonuc.stdout, /yasak sozcuk/);
    });
  });
});
