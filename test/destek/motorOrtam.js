import { readFileSync } from 'node:fs';

function uyuyor(eleman, secici) {
  const eslesme = /^(button)?(?:\[data-([a-z-]+)\])?$/.exec(secici);
  if (!eslesme) return false;
  if (eslesme[1] && eleman.tagName !== 'BUTTON') return false;
  if (!eslesme[2]) return true;
  const ad = eslesme[2].replace(/-([a-z])/g, (_, harf) => harf.toUpperCase());
  return Object.prototype.hasOwnProperty.call(eleman.dataset, ad);
}

function sinifListesi() {
  const adlar = new Set();
  return {
    add: ad => adlar.add(ad),
    remove: ad => adlar.delete(ad),
    toggle(ad, etkin) {
      if (etkin) adlar.add(ad);
      else adlar.delete(ad);
    },
    contains: ad => adlar.has(ad)
  };
}

class SahteEleman {
  constructor(ad, belge) {
    this.tagName = ad.toUpperCase();
    this.ownerDocument = belge;
    this.parentElement = null;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty(ad, deger) { this[ad] = deger; } };
    this.classList = sinifListesi();
    this.attributes = {};
    this.dinleyiciler = new Map();
    this.yakalananlar = new Set();
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.scrollHeight = 640;
  }

  append(eleman) {
    eleman.parentElement = this;
    this.children.push(eleman);
  }

  replaceChildren() {
    this.children.forEach(eleman => { eleman.parentElement = null; });
    this.children = [];
  }

  remove() {
    const ust = this.parentElement;
    if (ust) ust.children = ust.children.filter(eleman => eleman !== this);
    this.parentElement = null;
  }

  querySelectorAll(secici) {
    return this.children.flatMap(eleman => [
      ...(uyuyor(eleman, secici) ? [eleman] : []),
      ...eleman.querySelectorAll(secici)
    ]);
  }

  querySelector(secici) { return this.querySelectorAll(secici)[0] || null; }
  closest(secici) {
    if (uyuyor(this, secici)) return this;
    return this.parentElement?.closest(secici) || null;
  }

  contains(eleman) {
    return eleman === this || this.children.some(alt => alt.contains(eleman));
  }

  setAttribute(ad, deger) { this.attributes[ad] = deger; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 360, height: 360 }; }
  addEventListener(ad, islev) {
    if (!this.dinleyiciler.has(ad)) this.dinleyiciler.set(ad, new Set());
    this.dinleyiciler.get(ad).add(islev);
  }

  removeEventListener(ad, islev) { this.dinleyiciler.get(ad)?.delete(islev); }
  focus() { this.yay('focus', {}); }
  setPointerCapture(id) { this.yakalananlar.add(id); }
  hasPointerCapture(id) { return this.yakalananlar.has(id); }
  releasePointerCapture(id) { this.yakalananlar.delete(id); }

  yay(ad, alanlar) {
    const olay = { target: this, preventDefault() {}, ...alanlar };
    let eleman = this;
    while (eleman) {
      for (const islev of eleman.dinleyiciler.get(ad) || []) islev(olay);
      eleman = ad === 'click' ? eleman.parentElement : null;
    }
  }
}

function agacKur(belge) {
  const kok = new SahteEleman('main', belge);
  const ogeler = {};
  function ekle(ad, ust = kok, tur = 'div') {
    const eleman = new SahteEleman(tur, belge);
    const anahtar = ad.replace(/-([a-z])/g, (_, harf) => harf.toUpperCase());
    eleman.dataset[anahtar] = '';
    ogeler[ad] = eleman;
    ust.append(eleman);
    return eleman;
  }
  for (const ad of ['fallback', 'hata', 'dolap']) ekle(ad);
  const uygulama = ekle('uygulama');
  for (const ad of ['baslik', 'matik', 'durum']) ekle(ad, uygulama);
  const tezgah = ekle('tezgah', uygulama);
  ekle('sahne', tezgah, 'canvas');
  for (const ad of ['kemer', 'defter', 'sembol', 'dugmeler']) ekle(ad, uygulama);
  for (const ad of ['ipucu', 'defterAc', 'defterKapat', 'dolap']) {
    const eleman = ekle(ad === 'dolap' ? 'dolaba-don' : ad, uygulama, 'button');
    eleman.dataset.komut = ad;
    eleman.dataset.etiket = ad;
  }
  const baslik = ekle('defter-baslik', ogeler.defter, 'h2');
  baslik.dataset.etiket = 'defter';
  return { kok, ogeler };
}

function belgeOlustur() {
  const belge = { referrer: '' };
  belge.createElement = ad => new SahteEleman(ad, belge);
  belge.defaultView = {
    location: { href: 'https://example.test/?seed=42' },
    history: { replaceState(ilk, ikinci, adres) {
      void ilk;
      void ikinci;
      belge.defaultView.location.href = String(adres);
    } }
  };
  return belge;
}

function globalleriKur(t, degerler) {
  const onceki = new Map();
  for (const [ad, deger] of Object.entries(degerler)) {
    onceki.set(ad, Object.getOwnPropertyDescriptor(globalThis, ad));
    Object.defineProperty(globalThis, ad, { value: deger, writable: true, configurable: true });
  }
  t.after(() => {
    for (const [ad, once] of onceki) {
      if (once) Object.defineProperty(globalThis, ad, once);
      else delete globalThis[ad];
    }
  });
}

function veriOku() {
  return JSON.parse(readFileSync(new URL('../../duzenekler/D01/D01.json', import.meta.url)));
}

function istekKarsila(ortam, adres) {
  const yol = new URL(adres).pathname;
  ortam.istekler.push(yol);
  const veri = yol.endsWith('/docs/kapsam.json') ? ['D01'] : ortam.veri;
  const bulundu = yol.endsWith('/docs/kapsam.json') || yol.endsWith('/D01/D01.json');
  return Promise.resolve({ ok: bulundu, json: async () => JSON.parse(JSON.stringify(veri)) });
}

/** @param {Object} t @returns {Object} Motoru gerçek bağlarıyla çalıştıran tarayıcı sınırları. */
export function motorOrtami(t) {
  const belge = belgeOlustur();
  const { kok, ogeler } = agacKur(belge);
  const ortam = { kok, ogeler, veri: veriOku(), cizimler: [], istekler: [],
    okumalar: 0, yazmalar: [], kareler: new Map(), sira: 0 };
  const kalem = new Proxy({}, {
    get: (nesne, ad) => ad in nesne ? nesne[ad] :
      (...arg) => ortam.cizimler.push([ad, ...arg])
  });
  ogeler.sahne.getContext = () => kalem;
  globalleriKur(t, {
    document: belge,
    ResizeObserver: class { observe() {} disconnect() {} },
    devicePixelRatio: 1,
    requestAnimationFrame: islev => {
      ortam.kareler.set(++ortam.sira, islev);
      return ortam.sira;
    },
    cancelAnimationFrame: id => ortam.kareler.delete(id),
    matchMedia: () => ({ matches: false }),
    fetch: adres => istekKarsila(ortam, adres),
    localStorage: {
      getItem() { ortam.okumalar++; return null; },
      setItem(ad, deger) { ortam.yazmalar.push([ad, deger]); }
    }
  });
  return ortam;
}

/** @param {Object} ortam @param {string} ad @param {Nokta} nokta @returns {void} */
export function isaretci(ortam, ad, nokta) {
  ortam.ogeler.sahne.yay(ad, {
    pointerId: 1, button: 0, isPrimary: true,
    clientX: nokta.x * 360 / 1000, clientY: nokta.y * 360 / 1000
  });
}
