import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sahneOlustur } from '../motor/sahne.js';

function kur(t, kilit = false) {
  const once = globalThis.ResizeObserver;
  const oran = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  Object.defineProperty(globalThis, 'devicePixelRatio', { value: 3, configurable: true });
  t.after(() => {
    globalThis.ResizeObserver = once;
    if (oran) Object.defineProperty(globalThis, 'devicePixelRatio', oran);
    else delete globalThis.devicePixelRatio;
  });
  const cagrilar = [];
  const kalem = new Proxy({}, { get: (nesne, ad) => ad in nesne ? nesne[ad] :
    (...arg) => cagrilar.push([ad, ...arg]) });
  const dugmeler = [];
  const eleman = { width: 0, height: 0, style: {}, getContext: () => kalem,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 360, height: 360 }),
    ownerDocument: { createElement: () => ({ dataset: {}, setAttribute() {},
      classList: { toggle(ad, deger) { this[ad] = deger; } },
      remove() { this.kaldirildi = true; } }) } };
  const tezgah = { getBoundingClientRect: () => ({ width: 360, height: 360 }) };
  const kok = { querySelector: secici => secici === '[data-sahne]' ? eleman :
    secici === '[data-tezgah]' ? tezgah : { append: b => dugmeler.push(b) } };
  const sunum = { ileri: P => P, geri: P => P, renk: ad => ad, kalinlik: () => 2,
    zemin: 'white', metin: 'black' };
  const veri = { bayraklar: { olcuKilidi: kilit }, etiketler: { calistir: 'TODO-R1' } };
  const gorunum = sahneOlustur(kok, veri, { metinOlcek: 1 }, sunum);
  return { ...gorunum, cagrilar, dugmeler };
}

describe('sahneOlustur', () => {
  it('birim ölçeğini ve piksel yoğunluğu üst sınırını korur', t => {
    const g = kur(t);
    assert.equal(g.eleman.width, 720);
    assert.equal(g.eleman.height, 720);
    assert.equal(g.sahne.genislik, 1000);
    assert.equal(g.sahne.yukseklik, 1000);
    assert.equal(g.sahne.pxToBirim(16), 16 * 1000 / 360);
    assert.deepEqual(g.nokta(190, 200), { x: 500, y: 500 });
  });

  it('aynı karede farklı öğelerin aynı kimliği kullanmasını reddeder', t => {
    const g = kur(t);
    g.sahne.pim({ x: 10, y: 20 }, { id: 'pimA' });
    assert.throws(() => g.sahne.parca({ x: 0, y: 0 }, { x: 50, y: 50 },
      { id: 'pimA' }), { message: 'SAHNE_ID_CAKISMA' });
    g.sahne.temizle();
    assert.doesNotThrow(() => g.sahne.pim({ x: 20, y: 30 }, { id: 'pimA' }));
  });

  it('pimi tam on altı piksel uzaklıktan yakalar', t => {
    const g = kur(t);
    const P = { x: 500, y: 500 };
    g.sahne.pim(P, { id: 'pimA' });
    const hedef = g.hedefler.get('pimA');
    const tol = g.sahne.pxToBirim(16);
    assert.equal(hedef.vur({ x: P.x + tol, y: P.y }, tol), true);
    assert.equal(hedef.vur({ x: P.x + tol + 1, y: P.y }, tol), false);
    assert.equal(hedef.tur, 'pim');
  });

  it('hayalet gerçek hedefi değiştirmez ve katmanı geri yükler', t => {
    const g = kur(t);
    g.sahne.pim({ x: 100, y: 100 }, { id: 'pimA' });
    g.sahne.hayalet(s => {
      s.katman('ust');
      s.pim({ x: 100, y: 20 }, { id: 'pimA' });
    });
    g.sahne.pim({ x: 300, y: 300 }, { id: 'pimB' });
    assert.equal(g.hedefler.size, 2);
    assert.deepEqual(g.hedefler.get('pimA').nokta, { x: 100, y: 100 });
    assert.equal(g.hedefler.get('pimB').katman, 'alt');
  });

  it('ölçü kilidinde sayı çizmeden döner', t => {
    const g = kur(t, true);
    g.sahne.sayi({ x: 50, y: 50 }, 180);
    g.bitir();
    assert.equal(g.cagrilar.filter(c => c[0] === 'fillText').length, 0);
  });

  it('ölçü kilidi açıkken sayıyı çizer', t => {
    const g = kur(t);
    g.sahne.sayi({ x: 50, y: 50 }, 90);
    g.bitir();
    assert.deepEqual(g.cagrilar.find(c => c[0] === 'fillText'), ['fillText', '90', 50, 50]);
  });

  it('düğmeyi kareler arasında korur ve kaybolanı kaldırır', t => {
    const g = kur(t);
    const ayar = { id: 'calistir', anahtar: 'calistir', konum: 'alt' };
    g.sahne.dugme(ayar);
    g.bitir();
    const ilk = g.dugmeler[0];
    g.sahne.temizle();
    g.sahne.dugme({ ...ayar, etkin: false });
    g.bitir();
    assert.equal(g.dugmeler.length, 1);
    assert.equal(g.dugmeler[0], ilk);
    assert.equal(ilk.disabled, true);
    g.sahne.temizle();
    g.bitir();
    assert.equal(ilk.kaldirildi, true);
  });

  it('düğmeyi vurgular ve vurgu temizlenince eski görünümü geri getirir', t => {
    const g = kur(t);
    g.sahne.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' });
    assert.equal(g.sahne.vurgula('calistir'), undefined);
    g.bitir();
    assert.equal(g.dugmeler[0].classList.vurgu, true);
    g.sahne.vurguTemizle();
    g.bitir();
    assert.equal(g.dugmeler[0].classList.vurgu, false);
  });

  it('bilinmeyen etiket anahtarını reddeder', t => {
    const g = kur(t);
    assert.throws(() => g.sahne.etiket({ x: 10, y: 10 }, 'eksik'),
      { message: 'MATIK_ANAHTAR_YOK' });
    assert.throws(() => g.sahne.dugme({ id: 'x', anahtar: 'eksik', konum: 'alt' }),
      { message: 'MATIK_ANAHTAR_YOK' });
  });

  it('üst katmanı çizim çağrılarının sırasından bağımsız olarak sonda çizer', t => {
    const g = kur(t);
    g.sahne.katman('ust');
    g.sahne.parca({ x: 200, y: 200 }, { x: 300, y: 200 }, { id: 'ust' });
    g.sahne.katman('alt');
    g.sahne.parca({ x: 20, y: 20 }, { x: 30, y: 20 }, { id: 'alt' });
    g.bitir();
    const hareketler = g.cagrilar.filter(c => c[0] === 'moveTo');
    assert.deepEqual(hareketler[0], ['moveTo', 20, 20]);
    assert.equal(g.hedefler.get('ust').katman, 'ust');
    assert.equal(hareketler.findIndex(c => c[1] === 200 && c[2] === 200) > 0, true);
  });

  it('çember ve çokgen kimliklerine kenardan ve dolgudan ulaşır', t => {
    const g = kur(t);
    g.sahne.cember({ merkez: { x: 500, y: 500 }, r: 100 }, { id: 'c' });
    assert.equal(g.hedefler.get('c').vur({ x: 600, y: 500 }, 1), true);
    assert.equal(g.hedefler.get('c').vur({ x: 500, y: 500 }, 1), false);
    g.sahne.cokgen([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 50, y: 90 }],
      { id: 'k', dolgu: true });
    assert.equal(g.hedefler.get('k').vur({ x: 50, y: 40 }, 1), true);
    assert.equal(g.hedefler.get('k').vur({ x: 200, y: 40 }, 1), false);
  });

  it('parçanın uçlarının ötesini yalnız yakalama uzaklığında kabul eder', t => {
    const g = kur(t);
    g.sahne.parca({ x: 20, y: 20 }, { x: 80, y: 20 }, { id: 'p' });
    assert.equal(g.hedefler.get('p').vur({ x: 82, y: 20 }, 3), true);
    assert.equal(g.hedefler.get('p').vur({ x: 84, y: 20 }, 3), false);
  });

  it('kare başında katmanı ve kimlikleri temizler', t => {
    const g = kur(t);
    g.sahne.katman('ust');
    g.sahne.pim({ x: 10, y: 10 }, { id: 'p' });
    g.sahne.temizle();
    assert.equal(g.hedefler.size, 0);
    g.sahne.pim({ x: 20, y: 20 }, { id: 'p' });
    assert.equal(g.hedefler.get('p').katman, 'alt');
  });

  it('hayalet düğme oluşturmaz', t => {
    const g = kur(t);
    g.sahne.hayalet(s => s.dugme({ id: 'calistir', anahtar: 'calistir', konum: 'alt' }));
    assert.equal(g.dugmeler.length, 0);
  });

  it('varlık klasörü dışından görsel yüklemez', t => {
    const g = kur(t);
    assert.throws(() => g.sahne.gorsel('a', 'https://example.com/a.svg', { x: 0, y: 0 }),
      { message: 'PARAMETRE_ARALIK_DISI' });
    assert.throws(() => g.sahne.gorsel('a', 'varlik/../a.svg', { x: 0, y: 0 }),
      { message: 'PARAMETRE_ARALIK_DISI' });
  });
});
