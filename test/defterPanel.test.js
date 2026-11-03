import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defterPaneliOlustur } from '../motor/defterPanel.js';
import { tahminRafiOlustur } from '../defter/tahminRafi.js';
import { kuralKartiOlustur } from '../defter/kuralKarti.js';
import { arayuzBagla } from '../motor/giris.js';
import { motorOrtami } from './destek/motorOrtam.js';

class SahteOge {
  constructor(tur) {
    this.tagName = tur.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.ozellikler = {};
    this.dinleyiciler = {};
    this.className = '';
    this.disabled = false;
    this.selectedIndex = -1;
    this.metin = '';
  }
  append(...ogeler) { this.children.push(...ogeler); }
  replaceChildren(...ogeler) { this.children = ogeler; this.metin = ''; }
  setAttribute(ad, deger) { this.ozellikler[ad] = deger; }
  addEventListener(ad, islev) { this.dinleyiciler[ad] = islev; }
  set textContent(metin) { this.metin = String(metin); this.children = []; }
  get textContent() {
    return this.metin + this.children.map(oge => oge.textContent).join('');
  }
  tik() { if (!this.disabled) this.dinleyiciler.click?.(); }
  sec(sira) {
    if (this.disabled) return;
    this.selectedIndex = sira;
    this.dinleyiciler.change?.();
  }
}

function kur() {
  const icerik = new SahteOge('div');
  const etiketler = {
    tahmin: 'Tahmin', adet: 'Adet', yon: 'Yön', saat: 'Saat yönü', ters: 'Ters yön',
    sayi: 'Sayı', '2': 'İki'
  };
  const kok = {
    ownerDocument: { createElement: tur => new SahteOge(tur) },
    querySelector: secici => secici === '[data-defter-icerik]' ? icerik : null
  };
  const panel = defterPaneliOlustur(kok, anahtar => etiketler[anahtar]);
  return { icerik, etiketler, panel };
}

function tumu(kok, tur) {
  return kok.children.flatMap(oge =>
    [...(oge.tagName === tur.toUpperCase() ? [oge] : []), ...tumu(oge, tur)]);
}

function sinif(kok, ad) {
  return kok.children.flatMap(oge =>
    [...(oge.className === ad ? [oge] : []), ...sinif(oge, ad)]);
}

function rafKur(k) {
  const tanim = {
    tur: 'tahminRafi', etiketAnahtari: 'tahmin', hucreler: [
      { ad: 'adet', tur: 'sayac', min: 0, max: 2 },
      { ad: 'yon', tur: 'secim', secenekler: ['saat', 'ters'] }
    ]
  };
  const nesne = tahminRafiOlustur(tanim, { rng: {}, sahne: {}, matik: {} });
  k.panel.kayit(nesne, tanim);
  return nesne;
}

function kartKur(k) {
  const tanim = {
    tur: 'kuralKarti', anahtar: 'kural', kalip: '[sayi] · [yon]', disliler: [
      { ad: 'sayi', secenekler: [1, '1', 2] },
      { ad: 'yon', secenekler: ['saat', 'ters', 'x'] }
    ]
  };
  const nesne = kuralKartiOlustur({
    kalipAnahtari: tanim.anahtar, disliler: tanim.disliler, dogru: { sayi: 2, yon: 'ters' }
  }, { rng: {}, sahne: {}, matik: {}, kalip: 'nesnedeki-kalip' });
  k.panel.kayit(nesne, tanim);
  return nesne;
}

function dom(kok) {
  return JSON.stringify({
    tur: kok.tagName, metin: kok.metin, ozellikler: kok.ozellikler,
    veri: kok.dataset, deger: kok.value, ogeler: kok.children.map(dom)
  });
}

function arayuzKur(t, tahta = false) {
  const ortam = motorOrtami(t);
  const icerik = ortam.kok.ownerDocument.createElement('div');
  icerik.dataset.defterIcerik = '';
  ortam.ogeler.defter.append(icerik);
  const komutlar = [];
  const arayuz = arayuzBagla(ortam.kok, komut => komutlar.push(komut));
  arayuz.ayarla({ tahta, metinOlcek: 1, ipucuKapali: false });
  t.after(() => arayuz.kaldir());
  return { ortam, icerik, arayuz, komutlar };
}

describe('defterPaneliOlustur', () => {
  it('tahmin rafı hücrelerini başlığın altında satır satır çizer', () => {
    const k = kur();
    rafKur(k);
    assert.equal(tumu(k.icerik, 'h3')[0].textContent, 'Tahmin');
    assert.deepEqual(sinif(k.icerik, 'defter-satir').map(s => s.children[0].textContent),
      ['Adet', 'Yön']);
    assert.equal(tumu(k.icerik, 'output')[0].textContent, '0');
    assert.deepEqual(tumu(k.icerik, 'button').map(b => b.textContent), ['−', '+']);
    assert.deepEqual(tumu(k.icerik, 'option').map(o => o.textContent),
      ['Saat yönü', 'Ters yön']);
    assert.deepEqual(tumu(k.icerik, 'button').map(b => b.ozellikler['aria-label']),
      ['Adet −', 'Adet +']);
    assert.equal(tumu(k.icerik, 'select')[0].ozellikler['aria-label'], 'Yön');
    assert.equal(tumu(k.icerik, 'output')[0].ozellikler['aria-live'], 'polite');
  });

  it('sayaç hücresinde artı ve eksi sınırda pasif olur', () => {
    const k = kur();
    const raf = rafKur(k);
    const [eksi, arti] = tumu(k.icerik, 'button');
    const cikti = tumu(k.icerik, 'output')[0];
    assert.equal(eksi.disabled, true);
    assert.equal(arti.disabled, false);
    arti.tik();
    assert.equal(raf.deger().adet, 1);
    assert.equal(cikti.textContent, '1');
    assert.equal(eksi.disabled, false);
    arti.tik();
    assert.equal(raf.deger().adet, 2);
    assert.equal(arti.disabled, true);
    arti.tik();
    assert.equal(raf.deger().adet, 2);
    eksi.tik();
    assert.equal(arti.disabled, false);
    eksi.tik();
    assert.equal(raf.deger().adet, 0);
    assert.equal(eksi.disabled, true);
  });

  it('seçim hücresinin seçilen metnini nesneye yazar', () => {
    const k = kur();
    const raf = rafKur(k);
    const secim = tumu(k.icerik, 'select')[0];
    assert.equal(secim.selectedIndex, 0);
    secim.sec(1);
    assert.equal(raf.deger().yon, 'ters');
    assert.equal(secim.selectedIndex, 1);
  });

  it('dişlileri tanım kalıbıyla çizer ve sayı ile metin seçeneklerini ayırır', () => {
    const k = kur();
    const kart = kartKur(k);
    const [sayi, yon] = tumu(k.icerik, 'select');
    assert.equal(tumu(k.icerik, 'p')[0].textContent, '[sayi] · [yon]');
    assert.equal(sayi.ozellikler['aria-label'], 'Sayı');
    assert.deepEqual(sayi.children.map(o => o.textContent), ['1', '1', 'İki']);
    assert.equal(yon.children[2].textContent, 'x');
    sayi.sec(1);
    assert.equal(kart.ayar().sayi, '1');
    assert.equal(sayi.selectedIndex, 1);
    sayi.sec(2);
    assert.equal(kart.ayar().sayi, 2);
    assert.equal(sayi.selectedIndex, 2);
    yon.sec(1);
    assert.equal(kart.ayar().yon, 'ters');
  });

  it('hücre değişince tüm satırları nesnenin döndürdüğü değerlerle yeniler', () => {
    const k = kur();
    const degerler = { a: 0, b: 0 };
    const nesne = {
      deger: () => ({ ...degerler }),
      hucreKoy(ad, deger) { degerler[ad] = deger; degerler.b = 2; }
    };
    k.panel.kayit(nesne, { tur: 'tahminRafi', etiketAnahtari: 'tahmin', hucreler: [
      { ad: 'a', tur: 'sayac', min: 0, max: 2 },
      { ad: 'b', tur: 'sayac', min: 0, max: 2 }
    ] });
    tumu(k.icerik, 'button')[1].tik();
    assert.deepEqual(tumu(k.icerik, 'output').map(o => o.textContent), ['1', '2']);
    assert.equal(tumu(k.icerik, 'button')[3].disabled, true);
  });

  it('kilit tahmin denetimlerini kapatır ve dişlileri açık bırakır', () => {
    const k = kur();
    const raf = rafKur(k);
    const kart = kartKur(k);
    raf.kilitle();
    k.panel.kilitle();
    assert.ok(tumu(k.icerik, 'button').every(b => b.disabled));
    const [hucre, sayi, yon] = tumu(k.icerik, 'select');
    assert.equal(hucre.disabled, true);
    assert.equal(sayi.disabled, false);
    assert.equal(yon.disabled, false);
    hucre.sec(1);
    assert.equal(raf.deger().yon, 'saat');
    sayi.sec(2);
    assert.equal(kart.ayar().sayi, 2);
  });

  it('temizleme içeriği boşaltır ve yeni rafı önceki kilitten ayırır', () => {
    const k = kur();
    rafKur(k);
    kartKur(k);
    k.panel.kilitle();
    k.panel.temizle();
    assert.equal(k.icerik.children.length, 0);
    assert.equal(k.icerik.textContent, '');
    const raf = rafKur(k);
    const arti = tumu(k.icerik, 'button')[1];
    assert.equal(arti.disabled, false);
    arti.tik();
    assert.equal(raf.deger().adet, 1);
    assert.equal(tumu(k.icerik, 'section').length, 1);
  });

  it('doğru değeri ve çözücü DOM içine sızmaz ve nesneden kalıp okunmaz', () => {
    const k = kur();
    const nesne = {
      ayar: () => ({ sayi: 1 }), disliCevir() {},
      get kalip() { assert.fail('kalip'); },
      get dogru() { assert.fail('dogru'); },
      get cozucu() { assert.fail('cozucu'); }
    };
    k.panel.kayit(nesne, {
      tur: 'kuralKarti', anahtar: 'kural', kalip: '<b>[sayi]</b>',
      disliler: [{ ad: 'sayi', secenekler: [1, 2] }],
      dogru: 'gizli-yanit', cozucu: 'gizli-cozucu'
    });
    assert.equal(tumu(k.icerik, 'p')[0].textContent, '<b>[sayi]</b>');
    assert.equal(tumu(k.icerik, 'b').length, 0);
    assert.doesNotMatch(dom(k.icerik), /dogru|cozucu|gizli-yanit/);
  });

  it('kısayol yuvasını çizmez ve nesnenin alanlarını okumaz', () => {
    const k = kur();
    const nesne = new Proxy({}, { get() { assert.fail('kisayol'); } });
    k.panel.kayit(nesne, {
      tur: 'kisayolYuvasi', kabulEdilen: ['kural'], sensorler: ['aci']
    });
    k.panel.kilitle();
    assert.equal(k.icerik.children.length, 0);
  });

  it('nesnenin geçersiz ayar hatasını yutmaz', () => {
    const k = kur();
    const raf = rafKur(k);
    raf.kilitle();
    assert.throws(() => tumu(k.icerik, 'button')[1].tik(), {
      message: 'WIDGET_AYAR_GECERSIZ'
    });
    kartKur(k);
    assert.throws(() => tumu(k.icerik, 'select')[1].sec(-1), {
      message: 'WIDGET_AYAR_GECERSIZ'
    });
  });
});

describe('arayuzBagla', () => {
  it('panel sonraki düzeneğin etiketlerini kullanır ve dokunmayı komuta göndermez', t => {
    const k = arayuzKur(t);
    k.arayuz.ac({ ...k.ortam.veri, etiketler: { tahmin: 'İlk tahmin', adet: 'Adet' } });
    const raf = rafKur({ panel: { kayit: k.arayuz.defterKayit } });
    assert.equal(tumu(k.icerik, 'h3')[0].textContent, 'İlk tahmin');
    tumu(k.icerik, 'button')[1].yay('click', {});
    assert.equal(raf.deger().adet, 1);
    assert.deepEqual(k.komutlar, []);
    k.arayuz.defterTemizle();
    k.arayuz.ac({ ...k.ortam.veri, etiketler: { tahmin: 'Yeni tahmin', adet: 'Sayı' } });
    rafKur({ panel: { kayit: k.arayuz.defterKayit } });
    assert.equal(tumu(k.icerik, 'h3')[0].textContent, 'Yeni tahmin');
    assert.equal(tumu(k.icerik, 'button')[1].attributes['aria-label'], 'Sayı +');
  });

  it('telefonda defteri açıp kapatır ve dolaba dönüşte içeriği temizler', t => {
    const k = arayuzKur(t);
    k.arayuz.ac(k.ortam.veri);
    rafKur({ panel: { kayit: k.arayuz.defterKayit } });
    k.arayuz.defterAc();
    assert.equal(k.ortam.kok.dataset.defterAcik, 'true');
    assert.equal(k.ortam.ogeler.defter.hidden, false);
    k.arayuz.defterKapat();
    assert.equal(k.ortam.kok.dataset.defterAcik, 'false');
    assert.equal(k.ortam.ogeler.defter.hidden, true);
    k.arayuz.dolap();
    assert.equal(k.icerik.children.length, 0);
    assert.equal(k.ortam.ogeler.uygulama.hidden, true);
  });

  it('tahta sütununu kapatma çağrısında açık tutar', t => {
    const k = arayuzKur(t, true);
    k.arayuz.ac(k.ortam.veri);
    k.arayuz.defterKapat();
    assert.equal(k.ortam.kok.dataset.defterAcik, 'true');
    assert.equal(k.ortam.ogeler.defter.hidden, false);
  });
});
