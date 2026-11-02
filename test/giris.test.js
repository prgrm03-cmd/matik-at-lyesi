import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { girisBagla } from '../motor/giris.js';
import { tahtaAyarlari } from '../motor/tahta.js';
import { sunumOlustur } from '../motor/sunum.js';

function elemanOlustur() {
  const dinleyiciler = new Map();
  const yakalananlar = new Set();
  return {
    dinleyiciler, yakalananlar,
    addEventListener: (ad, islev) => dinleyiciler.set(ad, islev),
    removeEventListener: ad => dinleyiciler.delete(ad),
    closest() { return this; },
    focus() { dinleyiciler.get('focus')?.(); },
    setPointerCapture: kimlik => yakalananlar.add(kimlik),
    hasPointerCapture: kimlik => yakalananlar.has(kimlik),
    releasePointerCapture: kimlik => yakalananlar.delete(kimlik)
  };
}

function kur() {
  const eleman = elemanOlustur();
  const olaylar = [], komutlar = [], hayaletler = [];
  const hedefler = new Map();
  const sahne = {
    pxToBirim: px => px * 2,
    vurgula: () => {},
    hayalet: ciz => ciz({ pim: (nokta, secenek) => hayaletler.push({ nokta, secenek }) })
  };
  const gorunum = { eleman, hedefler, sahne, nokta: (x, y) => ({ x: x * 2, y: y * 2 }) };
  const denetim = girisBagla(gorunum, olay => olaylar.push(olay), ad => komutlar.push(ad));
  return { gorunum, denetim, olaylar, komutlar, hayaletler };
}

function pim(kurulum, id, x, y, katman = 'alt') {
  const nokta = { x, y };
  kurulum.gorunum.hedefler.set(id, {
    id, tur: 'pim', nokta, katman,
    vur: (P, tol) => Math.hypot(P.x - nokta.x, P.y - nokta.y) <= tol
  });
}

function olay(kurulum, ad, alanlar = {}) {
  const veri = {
    pointerId: 1, button: 0, isPrimary: true, clientX: 50, clientY: 50,
    ...alanlar, onlendi: false,
    preventDefault() { this.onlendi = true; }
  };
  kurulum.gorunum.eleman.dinleyiciler.get(ad)(veri);
  return veri;
}

describe('girisBagla', () => {
  it('pimi on altı piksel içinde yakalar ve sürükleme farkını birimle verir', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    olay(k, 'pointerdown', { clientX: 65 });
    olay(k, 'pointermove', { clientX: 70, clientY: 60 });
    olay(k, 'pointerup', { clientX: 70, clientY: 60 });
    assert.deepEqual(k.olaylar.map(o => o.tur), ['bas', 'surukle', 'birak']);
    assert.equal(k.olaylar[0].hedef, 'A');
    assert.equal(k.olaylar[1].dx, 10);
    assert.equal(k.olaylar[1].dy, 20);
    assert.equal(k.gorunum.eleman.yakalananlar.size, 0);
    k.denetim.kaldir();
    assert.equal(k.gorunum.eleman.dinleyiciler.size, 0);
  });
});

describe('girisBagla', () => {
  it('yakalama dışında hedef atamaz ve üst katmana öncelik verir', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    olay(k, 'pointerdown', { clientX: 67 });
    assert.equal(k.olaylar[0].hedef, undefined);
    olay(k, 'pointercancel');
    pim(k, 'B', 100, 100, 'ust');
    olay(k, 'pointerdown');
    assert.equal(k.olaylar[k.olaylar.length - 1].hedef, 'B');
    k.denetim.kaldir();
  });
});

describe('girisBagla', () => {
  it('iptalde tıklama üretmez ve başka parmağı karıştırmaz', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    olay(k, 'pointerdown');
    olay(k, 'pointermove', { pointerId: 2, clientX: 80 });
    olay(k, 'pointercancel');
    olay(k, 'lostpointercapture');
    assert.deepEqual(k.olaylar.map(o => o.tur), ['bas', 'birak']);
    olay(k, 'pointerdown');
    olay(k, 'pointerup');
    assert.deepEqual(k.olaylar.slice(-3).map(o => o.tur), ['bas', 'birak', 'tik']);
    k.denetim.kaldir();
  });
});

describe('girisBagla', () => {
  it('tutulan pimin hayaletini yirmi dört piksel yukarı çizer', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    olay(k, 'pointerdown');
    k.denetim.hayalet();
    assert.deepEqual(k.hayaletler[0].nokta, { x: 100, y: 52 });
    assert.equal(k.hayaletler[0].secenek.id, undefined);
    olay(k, 'pointercancel');
    k.denetim.hayalet();
    assert.equal(k.hayaletler.length, 1);
    k.denetim.kaldir();
  });
});

describe('girisBagla', () => {
  it('ok tuşları beş birim ve Shift ile bir birim hareket ettirir', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    olay(k, 'focus');
    olay(k, 'keydown', { key: 'ArrowRight' });
    assert.equal(k.olaylar[1].dx, 5);
    olay(k, 'keydown', { key: 'ArrowUp', shiftKey: true });
    assert.equal(k.olaylar[4].dy, -1);
    olay(k, 'keydown', { key: 'Enter' });
    olay(k, 'keydown', { key: '?' });
    assert.deepEqual(k.komutlar, ['calistir', 'ipucu']);
    k.denetim.kaldir();
  });
});

describe('girisBagla', () => {
  it('Tab son öğeden doğal düğme sırasına geçebilir', () => {
    const k = kur();
    pim(k, 'A', 100, 100);
    pim(k, 'B', 200, 100);
    olay(k, 'focus');
    assert.equal(olay(k, 'keydown', { key: 'Tab' }).onlendi, true);
    assert.equal(olay(k, 'keydown', { key: 'Tab' }).onlendi, false);
    k.denetim.kaldir();
  });
});

describe('tahtaAyarlari', () => {
  it('tahta varsayılanlarını ve v1 alanlarını korur', () => {
    const ayar = tahtaAyarlari(new URLSearchParams('mod=tahta&tolerans=1&dondur=1'));
    assert.equal(ayar.mod.metinOlcek, 1.5);
    assert.equal(ayar.ayarlar.seed, 1);
    assert.equal(ayar.ayarlar.toleransGoster, false);
    assert.equal(ayar.ayarlar.dondur, false);
    assert.equal(ayar.kontrast, true);
    assert.equal(ayar.duzenek, null);
  });
});

describe('tahtaAyarlari', () => {
  it('açık değerleri okur ve geçersiz seed değerlerini reddeder', () => {
    const ayar = tahtaAyarlari(new URLSearchParams(
      'mod=tahta&seed=17&duzenek=D01&ipucu=0&metin=100&kontrast=0'
    ));
    assert.equal(ayar.mod.metinOlcek, 1);
    assert.equal(ayar.mod.ipucuKapali, true);
    assert.equal(ayar.ayarlar.seed, 17);
    assert.equal(ayar.duzenek, 'D01');
    assert.equal(ayar.kontrast, false);
    for (const seed of ['', '-1', '4294967296', '1.5', '1e2']) {
      assert.throws(() => tahtaAyarlari(new URLSearchParams({ seed })), {
        message: 'RNG_SEED_GECERSIZ'
      });
    }
  });
});

describe('sunumOlustur', () => {
  it('tahtada paleti ve kalınlığı değiştirir, v1 koordinatını korur', () => {
    const ogrenci = sunumOlustur({ tahta: false });
    const tahta = sunumOlustur({ tahta: true });
    const nokta = { x: 200, y: 300 };
    assert.deepEqual(tahta.geri(tahta.ileri(nokta)), nokta);
    assert.notEqual(tahta.ileri(nokta), nokta);
    assert.notEqual(tahta.renk('mavi'), ogrenci.renk('mavi'));
    assert.ok(tahta.kalinlik('normal') > ogrenci.kalinlik('normal'));
    assert.equal(sunumOlustur({ tahta: true }, false).renk('mavi'), ogrenci.renk('mavi'));
  });
});
