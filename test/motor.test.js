import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { baslat, duzenekAc, calistir, ipucuVer } from '../motor/motor.js';
import { arayuzBagla } from '../motor/giris.js';
import { motorOrtami, isaretci } from './destek/motorOrtam.js';

describe('baslat', () => {
  it('geçersiz seed kodunu gösterir ve eski tarayıcı mesajını gizler', async t => {
    const ortam = motorOrtami(t);
    for (const seed of ['abc', '', '-1', '4294967296', '1.5']) {
      await baslat({ kok: ortam.kok, url: new URLSearchParams({ seed }) });
      assert.equal(ortam.ogeler.hata.textContent, 'RNG_SEED_GECERSIZ');
      assert.equal(ortam.ogeler.hata.hidden, false);
      assert.equal(ortam.ogeler.fallback.hidden, true);
    }
    assert.equal(ortam.istekler.length, 0);
    assert.equal(ortam.okumalar, 0);
    assert.equal(ortam.yazmalar.length, 0);
  });
});

describe('calistir', () => {
  it('gerçek giriş ve sahne üzerinden D01 çalıştırır, iskelete yıldız yazmaz', async t => {
    const ortam = motorOrtami(t);
    await baslat({ kok: ortam.kok, url: new URLSearchParams('seed=42') });
    const ctx = await duzenekAc('D01', 42);
    assert.equal(Object.isFrozen(ctx.veri), true);
    assert.equal(ortam.ogeler.uygulama.hidden, false);
    assert.ok(ortam.cizimler.some(cagri => cagri[0] === 'stroke'));
    const A = { ...ctx.durum.pimler[0] };
    isaretci(ortam, 'pointerdown', A);
    isaretci(ortam, 'pointermove', { x: A.x + 40, y: A.y + 20 });
    isaretci(ortam, 'pointerup', { x: A.x + 40, y: A.y + 20 });
    assert.ok(Math.abs(ctx.durum.pimler[0].x - A.x - 40) < 1e-6);
    assert.ok(Math.abs(ctx.durum.pimler[0].y - A.y - 20) < 1e-6);
    const dugme = ortam.ogeler.dugmeler.children.find(b => b.dataset.dugmeId === 'calistir');
    assert.ok(dugme);
    dugme.yay('click', {});
    const sonuc = await calistir(ctx);
    assert.deepEqual(sonuc, { tamam: false, yanParca: false, neden: 'yarimKaldi', tur: 0 });
    assert.equal(ctx.durum.asama, 1);
    assert.equal(ortam.ogeler.durum.textContent, '');
    assert.equal(ortam.ogeler.matik.textContent, ctx.veri.nedenler.yarimKaldi);
    assert.equal(ortam.yazmalar.length, 0);
    assert.equal(ortam.ogeler.hata.hidden, true);
  });
});

describe('duzenekAc', () => {
  it('aynı seed ile yeniden kurar ve önceki oturum bağını kapatır', async t => {
    const ortam = motorOrtami(t);
    await baslat({ kok: ortam.kok, url: new URLSearchParams('mod=tahta&seed=17') });
    const ilk = await duzenekAc('D01', 17);
    const pimler = JSON.parse(JSON.stringify(ilk.durum.pimler));
    ilk.durum.pimler[0].x = 0;
    const ikinci = await duzenekAc('D01', 17);
    assert.deepEqual(ikinci.durum.pimler, pimler);
    assert.notEqual(ikinci.durum, ilk.durum);
    assert.equal(ortam.ogeler.dugmeler.children.length, 1);
    await assert.rejects(calistir(ilk), { message: 'DUZENEK_YOK' });
    assert.equal(ortam.kareler.size, 1);
    assert.equal(ortam.ogeler.hata.hidden, true);
  });
});

describe('duzenekAc', () => {
  it('açıölçer saklanan gerçek sahnenin yeni boyutunu sonraki karede kullanır', async t => {
    const ortam = motorOrtami(t);
    await baslat({ kok: ortam.kok, url: new URLSearchParams('seed=42') });
    const ctx = await duzenekAc('D01', 42);
    const aciolcer = ctx.widget.aciolcer({ hizasiz: false, olcekYonu: 'ic' });
    aciolcer.ciz(ctx.sahne);
    const sahne = ctx.sahne;
    const hedef = { x: aciolcer.merkez.x + 30, y: aciolcer.merkez.y };
    assert.equal(aciolcer.hizaliMi(hedef, 0).merkezTamam, true);
    ortam.ogeler.tezgah.getBoundingClientRect = () => ({ width: 720, height: 720 });
    const kare = [...ortam.kareler.values()].at(-1);
    ortam.kareler.clear();
    kare();
    assert.equal(ctx.sahne, sahne);
    assert.equal(sahne.olcek, 1000 / 720);
    assert.equal(aciolcer.hizaliMi(hedef, 0).merkezTamam, false);
    assert.equal(ortam.ogeler.hata.hidden, true);
  });
});

describe('baslat', () => {
  it('tahta bağlantısını açar, ipucu kapalıyken durumu ve kaydı korur', async t => {
    const ortam = motorOrtami(t);
    const url = new URLSearchParams('mod=tahta&duzenek=D01&seed=17&ipucu=0');
    await baslat({ kok: ortam.kok, url });
    assert.equal(ortam.kok.dataset.tahta, 'true');
    assert.equal(ortam.kok.style['--metin-olcek'], '1.5');
    assert.equal(ortam.ogeler.uygulama.hidden, false);
    assert.equal(ortam.ogeler.defter.hidden, false);
    assert.equal(ortam.ogeler.ipucu.hidden, true);
    const ctx = await duzenekAc('D01', 17);
    ctx.durum.pimler[0].y = 400;
    ipucuVer(ctx, 3);
    assert.equal(ctx.durum.pimler[0].y, 400);
    assert.equal((await calistir(ctx)).tamam, false);
    assert.equal(ortam.okumalar, 0);
    assert.equal(ortam.yazmalar.length, 0);
    assert.equal(ortam.ogeler.durum.textContent, '');
  });
});

describe('duzenekAc', () => {
  it('yalnız kullanılan etiketle açılır ve etiketsiz ortak kontrolleri gizler', async t => {
    const ortam = motorOrtami(t);
    ortam.veri.etiketler = { calistir: 'TODO-R1' };
    await baslat({ kok: ortam.kok, url: new URLSearchParams('seed=42') });
    const ctx = await duzenekAc('D01', 42);
    assert.equal(ortam.ogeler.hata.hidden, true);
    assert.equal(ortam.ogeler.uygulama.hidden, false);
    assert.equal(ortam.ogeler.kemer.children.length, 0);
    for (const eleman of ortam.kok.querySelectorAll('[data-etiket]')) {
      assert.equal(eleman.hidden, true);
    }
    assert.throws(() => ctx.sahne.etiket({ x: 0, y: 0 }, 'eksik'),
      { message: 'MATIK_ANAHTAR_YOK' });
    assert.throws(() => ctx.sahne.dugme({ id: 'eksik', anahtar: 'eksik', konum: 'alt' }),
      { message: 'MATIK_ANAHTAR_YOK' });
  });
});

describe('arayuzBagla', () => {
  it('etiketler alanı olmadan çalışır ve sonraki düzeneğin etiketlerini geri gösterir', t => {
    const ortam = motorOrtami(t);
    const arayuz = arayuzBagla(ortam.kok, () => {});
    t.after(() => arayuz.kaldir());
    arayuz.ayarla({ tahta: false, ipucuKapali: false, metinOlcek: 1 });
    const veri = { ...ortam.veri };
    delete veri.etiketler;
    assert.doesNotThrow(() => arayuz.ac(veri));
    assert.doesNotThrow(() => arayuz.kemer({ kemer: ['lazer'], kilitli: [] }));
    assert.equal(ortam.ogeler.kemer.children.length, 0);
    assert.equal(ortam.ogeler.ipucu.hidden, true);
    arayuz.ac(ortam.veri);
    arayuz.kemer({ kemer: ['lazer'], kilitli: [] }, ortam.veri.etiketler);
    assert.equal(ortam.ogeler.ipucu.hidden, false);
    assert.equal(ortam.ogeler.kemer.children.length, 1);
  });
});
