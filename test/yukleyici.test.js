import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { kapsamOku, veriOku, yukle } from '../motor/yukleyici.js';

const ESKI_FETCH = globalThis.fetch;
afterEach(() => { globalThis.fetch = ESKI_FETCH; });

async function ornekOku() {
  const adres = new URL('../duzenekler/D01/D01.json', import.meta.url);
  return JSON.parse(await readFile(adres, 'utf8'));
}

function sunucuKur(veri, kapsam = ['D01']) {
  const istekler = [];
  globalThis.fetch = async adres => {
    istekler.push(adres.pathname);
    const govde = adres.pathname.endsWith('/kapsam.json') ? kapsam : veri;
    return { ok: true, json: async () => JSON.parse(JSON.stringify(govde)) };
  };
  return istekler;
}

describe('kapsamOku', () => {
  it('geçersiz düzenek kimliğini reddeder', async () => {
    sunucuKur({}, ['../D01']);
    await assert.rejects(kapsamOku(), /SEMA_HATASI/);
  });
});

describe('veriOku', () => {
  it('kapsam dışı düzenekte dosya yüklemeyi başlatmaz', async () => {
    const istekler = sunucuKur({}, ['D01']);
    await assert.rejects(veriOku('D02'), /DUZENEK_YOK/);
    assert.equal(istekler.length, 1);
  });

  it('yol geçişini ağ isteğinden önce reddeder', async () => {
    const istekler = sunucuKur({});
    await assert.rejects(veriOku('../D01'), /DUZENEK_YOK/);
    assert.deepEqual(istekler, []);
  });

  it('zorunlu iç alanlar eksikse reddeder', async () => {
    const veri = await ornekOku();
    delete veri.matik.giris;
    sunucuKur(veri);
    await assert.rejects(veriOku('D01'), /SEMA_HATASI/);
  });

});

describe('veriOku', () => {
  it('alt nesneleri ve dizileri de dondurur', async () => {
    sunucuKur(await ornekOku());
    const veri = await veriOku('D01');
    assert.ok(Object.isFrozen(veri));
    assert.ok(Object.isFrozen(veri.bayraklar));
    assert.ok(Object.isFrozen(veri.ipucu));
    assert.ok(Object.isFrozen(veri.ipucu[0]));
    assert.throws(() => { veri.bayraklar.olcuKilidi = true; }, TypeError);
  });

  it('D10b ile D12b dosya yollarını ayırt eder', async () => {
    const veri = await ornekOku();
    veri.id = 'D10b';
    veri.kod = 'D10';
    const istekler = sunucuKur(veri, ['D10b']);
    await veriOku('D10b');
    assert.ok(istekler[1].endsWith('/D10/D10b.json'));
    veri.id = 'D12b';
    veri.kod = 'D12b';
    const ikinci = sunucuKur(veri, ['D12b']);
    await veriOku('D12b');
    assert.ok(ikinci[1].endsWith('/D12b/D12b.json'));
  });
});

describe('yukle', () => {
  it('gerçek kapsamdan D02 JSON ve modülünü yükleyip aynı seed ile kurar', async t => {
    const oncekiFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = oncekiFetch; });
    globalThis.fetch = async adres => ({
      ok: true, json: async () => JSON.parse(await readFile(adres, 'utf8'))
    });
    assert.deepEqual(await kapsamOku(), ['D01', 'D02', 'D09a', 'D03']);
    const { duzenek, veri } = await yukle('D02');
    assert.equal(duzenek.id, 'D02');
    assert.equal(veri.id, 'D02');
    assert.equal(duzenek.surum, veri.surum);
    assert.ok(Object.isFrozen(veri.parametreler.konum));
    const { ctxSahteOlustur } = await import('../motor/ctxSahte.js');
    for (const seed of [17, 42, 101]) {
      const ilk = ctxSahteOlustur('D02', veri, seed);
      const tekrar = ctxSahteOlustur('D02', veri, seed);
      duzenek.kur(ilk, seed);
      duzenek.kur(tekrar, seed);
      assert.equal(ilk.durum.seed, seed);
      assert.ok(ilk.durum.sensorler.length > 0);
      assert.ok(ilk.durum.alarmlar.length > 0);
      assert.deepEqual(ilk.durum.sensorler, tekrar.durum.sensorler);
      assert.deepEqual(ilk.durum.alarmlar, tekrar.durum.alarmlar);
    }
  });

  it('gerçek kapsamdan D09a varyantını D09 modülüyle yükler', async t => {
    const oncekiFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = oncekiFetch; });
    globalThis.fetch = async adres => ({
      ok: true, json: async () => JSON.parse(await readFile(adres, 'utf8'))
    });
    const { duzenek, veri } = await yukle('D09a');
    assert.equal(duzenek.id, 'D09');
    assert.equal(veri.id, 'D09a');
    assert.equal(duzenek.surum, veri.surum);
    assert.ok(Object.isFrozen(veri.parametreler.aci));
    const { ctxSahteOlustur } = await import('../motor/ctxSahte.js');
    for (const seed of [17, 42, 101]) {
      const ilk = ctxSahteOlustur('D09a', veri, seed);
      const tekrar = ctxSahteOlustur('D09a', veri, seed);
      duzenek.kur(ilk, seed);
      duzenek.kur(tekrar, seed);
      assert.equal(ilk.durum.seed, seed);
      assert.equal(ilk.durum.hedef, tekrar.durum.hedef);
      assert.equal(ilk.durum.kol1Yon, tekrar.durum.kol1Yon);
      assert.equal(ilk.durum.kolUzunlugu, tekrar.durum.kolUzunlugu);
      assert.deepEqual(ilk.durum.aciolcer.okuma(ilk.durum.kol2Yon),
        tekrar.durum.aciolcer.okuma(tekrar.durum.kol2Yon));
    }
  });

  it('D01 modülünü dokuz imza ve aynı sürümle yükler', async () => {
    sunucuKur(await ornekOku());
    const { duzenek, veri } = await yukle('D01');
    assert.equal(Object.keys(duzenek).length, 9);
    assert.equal(duzenek.id, veri.kod);
    assert.equal(duzenek.surum, veri.surum);
  });

  it('modül ile JSON sürümleri ayrışınca reddeder', async () => {
    const veri = await ornekOku();
    veri.surum = '99.0.0';
    sunucuKur(veri);
    await assert.rejects(yukle('D01'), /SEMA_HATASI/);
  });
});
