import { TOLERANS } from '../geo/index.js';
import { defterPaneliOlustur } from './defterPanel.js';

/**
 * @typedef {Object} Olay
 * @property {'bas'|'surukle'|'birak'|'tik'|'dugme'|'tus'} tur
 * @property {number} x
 * @property {number} y
 * @property {string} [hedef]
 * @property {string} [dugmeId]
 * @property {number} [dx]
 * @property {number} [dy]
 */

/**
 * @param {Object} gorunum
 * @param {(olay:Olay)=>void} ilet
 * @param {(ad:string)=>void} komut
 * @returns {{kaldir:()=>void,hayalet:()=>void}} Giriş yaşam döngüsü.
 */
export function girisBagla(gorunum, ilet, komut) {
  const bag = { gorunum, ilet, komut, tutulan: null, secili: null, dinleyiciler: [] };
  const eleman = gorunum.eleman;
  const kok = eleman.closest('[data-uygulama]') || eleman.parentElement;
  dinle(bag, eleman, 'pointerdown', olay => bas(bag, olay));
  dinle(bag, eleman, 'pointermove', olay => surukle(bag, olay));
  dinle(bag, eleman, 'pointerup', olay => birak(bag, olay, false));
  dinle(bag, eleman, 'pointercancel', olay => birak(bag, olay, true));
  dinle(bag, eleman, 'lostpointercapture', olay => birak(bag, olay, true));
  dinle(bag, eleman, 'keydown', olay => tus(bag, olay));
  dinle(bag, eleman, 'focus', () => odak(bag));
  dinle(bag, kok, 'click', olay => dugme(bag, olay, kok));
  return {
    kaldir: () => girisiKaldir(bag),
    hayalet: () => hayaletCiz(bag)
  };
}

function dinle(bag, eleman, ad, islev) {
  eleman.addEventListener(ad, islev);
  bag.dinleyiciler.push(() => eleman.removeEventListener(ad, islev));
}

function girisiKaldir(bag) {
  const tutulan = bag.tutulan;
  bag.tutulan = null;
  if (tutulan) yakalamayiBirak(bag.gorunum.eleman, tutulan.pointerId);
  bag.dinleyiciler.forEach(kaldir => kaldir());
}

function hedefBul(bag, nokta) {
  const tol = bag.gorunum.sahne.pxToBirim(TOLERANS.pimYakalamaPx);
  const hedefler = [...bag.gorunum.hedefler.values()].reverse();
  for (const katman of ['ust', 'alt']) {
    const hedef = hedefler.find(oge => oge.katman === katman && oge.vur(nokta, tol));
    if (hedef) return hedef;
  }
  return null;
}

function bas(bag, olay) {
  if (bag.tutulan || olay.isPrimary === false || olay.button !== 0) return;
  const nokta = bag.gorunum.nokta(olay.clientX, olay.clientY);
  const hedef = hedefBul(bag, nokta);
  bag.tutulan = {
    pointerId: olay.pointerId, nokta, hedef: hedef?.id, hareket: false
  };
  bag.secili = hedef?.id || null;
  bag.gorunum.eleman.focus({ preventScroll: true });
  bag.gorunum.eleman.setPointerCapture(olay.pointerId);
  bag.ilet({ tur: 'bas', ...nokta, hedef: hedef?.id });
  olay.preventDefault();
}

function surukle(bag, olay) {
  const tutulan = bag.tutulan;
  if (!tutulan || tutulan.pointerId !== olay.pointerId) return;
  const nokta = bag.gorunum.nokta(olay.clientX, olay.clientY);
  const dx = nokta.x - tutulan.nokta.x;
  const dy = nokta.y - tutulan.nokta.y;
  tutulan.hareket = tutulan.hareket || dx !== 0 || dy !== 0;
  tutulan.nokta = nokta;
  bag.ilet({ tur: 'surukle', ...nokta, dx, dy, hedef: tutulan.hedef });
  olay.preventDefault();
}

function birak(bag, olay, iptal) {
  const tutulan = bag.tutulan;
  if (!tutulan || tutulan.pointerId !== olay.pointerId) return;
  const ham = iptal ? tutulan.nokta : bag.gorunum.nokta(olay.clientX, olay.clientY);
  const nokta = iptal ? ham : pimiOturt(bag, tutulan, ham);
  bag.tutulan = null;
  yakalamayiBirak(bag.gorunum.eleman, olay.pointerId);
  bag.ilet({ tur: 'birak', ...nokta, hedef: tutulan.hedef });
  if (!iptal && !tutulan.hareket) {
    bag.ilet({ tur: 'tik', ...nokta, hedef: tutulan.hedef });
  }
}

function oturmaHedefi(bag, tutulan, nokta) {
  if (bag.gorunum.hedefler.get(tutulan.hedef)?.tur !== 'pim') return null;
  const tol = bag.gorunum.sahne.pxToBirim(TOLERANS.pimYakalamaPx);
  let enYakin = null;
  let mesafe = Infinity;
  // Eşit uzaklıkta son çizilen pim seçilir; tutulan pim kendini yakalayamaz.
  for (const hedef of [...bag.gorunum.hedefler.values()].reverse()) {
    if (hedef.id === tutulan.hedef || hedef.tur !== 'pim') continue;
    const uzaklik = Math.hypot(hedef.nokta.x - nokta.x, hedef.nokta.y - nokta.y);
    if (uzaklik <= tol + Number.EPSILON * 1000 && uzaklik < mesafe) {
      enYakin = hedef.nokta;
      mesafe = uzaklik;
    }
  }
  return enYakin;
}

function pimiOturt(bag, tutulan, nokta) {
  const hedef = oturmaHedefi(bag, tutulan, nokta);
  if (!hedef) return nokta;
  const son = { x: hedef.x, y: hedef.y };
  const dx = son.x - tutulan.nokta.x;
  const dy = son.y - tutulan.nokta.y;
  tutulan.hareket = tutulan.hareket || dx !== 0 || dy !== 0;
  // ADT-010: birak yalnız seçimi bitirir; son surukle pimi tam hedefe taşır.
  bag.ilet({ tur: 'surukle', ...son, dx, dy, hedef: tutulan.hedef });
  return son;
}

function yakalamayiBirak(eleman, kimlik) {
  if (eleman.hasPointerCapture(kimlik)) eleman.releasePointerCapture(kimlik);
}

function hayaletCiz(bag) {
  const hedef = bag.gorunum.hedefler.get(bag.tutulan?.hedef);
  if (!hedef || hedef.tur !== 'pim') return;
  const sahne = bag.gorunum.sahne;
  const nokta = { x: hedef.nokta.x, y: hedef.nokta.y - sahne.pxToBirim(24) };
  sahne.hayalet(kat => kat.pim(nokta, { renk: 'gri' }));
}

function ogeSirasi(bag) {
  return [...bag.gorunum.hedefler.values()]
    .sort((a, b) => a.nokta.x - b.nokta.x || a.nokta.y - b.nokta.y);
}

function odak(bag) {
  if (!bag.secili) bag.secili = ogeSirasi(bag)[0]?.id || null;
  if (bag.secili) bag.gorunum.sahne.vurgula(bag.secili, { sure: 600 });
}

function sekme(bag, olay) {
  const ogeler = ogeSirasi(bag);
  const sira = ogeler.findIndex(oge => oge.id === bag.secili);
  const yeni = sira + (olay.shiftKey ? -1 : 1);
  if (yeni < 0 || yeni >= ogeler.length) {
    bag.secili = null;
    return;
  }
  bag.secili = ogeler[yeni].id;
  odak(bag);
  olay.preventDefault();
}

function tus(bag, olay) {
  if (olay.ctrlKey || olay.metaKey || olay.altKey) return;
  if (olay.key === 'Tab') return sekme(bag, olay);
  if (olay.key === 'Enter' || olay.key === '?') {
    bag.komut(olay.key === 'Enter' ? 'calistir' : 'ipucu');
    olay.preventDefault();
    return;
  }
  const yonler = { ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const yon = yonler[olay.key];
  const hedef = bag.gorunum.hedefler.get(bag.secili);
  if (!yon || !hedef || hedef.tur !== 'pim') return;
  tasi(bag, hedef, yon, olay.shiftKey ? 1 : 5);
  olay.preventDefault();
}

function tasi(bag, hedef, yon, adim) {
  const ilk = hedef.nokta;
  const x = Math.max(0, Math.min(1000, ilk.x + yon[0] * adim));
  const y = Math.max(0, Math.min(1000, ilk.y + yon[1] * adim));
  bag.ilet({ tur: 'bas', ...ilk, hedef: hedef.id });
  bag.ilet({ tur: 'surukle', x, y, dx: x - ilk.x, dy: y - ilk.y, hedef: hedef.id });
  bag.ilet({ tur: 'birak', x, y, hedef: hedef.id });
  odak(bag);
}

function dugme(bag, olay, kok) {
  const hedef = olay.target.closest('button');
  if (!hedef || !kok.contains(hedef) || hedef.disabled) return;
  if (hedef.dataset.komut) return;
  const dugmeId = hedef.dataset.dugmeId;
  if (dugmeId) bag.ilet({ tur: 'dugme', x: 0, y: 0, dugmeId });
}

/**
 * @param {HTMLElement} kok @param {(ad:string)=>void} komut
 * @returns {Object} HTML katmanı için motor içi bağdaştırıcı.
 */
export function arayuzBagla(kok, komut) {
  const bul = ad => kok.querySelector('[data-' + ad + ']');
  const bag = { kok, bul, mod: null, etiketler: {} };
  bag.panel = defterPaneliOlustur(kok, anahtar => bag.etiketler[anahtar]);
  const tik = olay => arayuzTik(bag, olay, komut);
  kok.addEventListener('click', tik);
  return {
    ayarla: (mod, kontrast = true) => arayuzAyarla(bag, mod, kontrast),
    listele: (liste, sec) => dolapListele(bag, liste, sec),
    ac: veri => duzenekGoster(bag, veri),
    dolap: () => dolapGoster(bag),
    soyle: metin => { bul('matik').textContent = metin; },
    hata: kod => {
      bul('hata').textContent = kod;
      bul('hata').hidden = false;
      bul('fallback').hidden = true;
    },
    ifade: ad => { bul('matik').dataset.ifade = ad; },
    kivilcim: () => kivilcimGoster(bag),
    sembol: metin => { bul('sembol').textContent = metin; },
    kemer: (araclar, etiketler) => kemerGoster(bag, araclar, etiketler),
    sonuc: (sonuc, tahta) => sonucGoster(bag, sonuc, tahta),
    defterAc: () => defterGoster(bag, true),
    defterKapat: () => defterGoster(bag, false),
    defterKayit: (nesne, tanim) => bag.panel.kayit(nesne, tanim),
    defterTemizle: () => bag.panel.temizle(),
    defterKilitle: () => bag.panel.kilitle(),
    boyut: () => Math.ceil(Math.max(kok.scrollHeight, kok.getBoundingClientRect().height)),
    tohum: (id, seed) => adresGuncelle(bag, id, seed),
    kaldir: () => kok.removeEventListener('click', tik)
  };
}

function arayuzAyarla(bag, mod, kontrast) {
  bag.mod = mod;
  bag.kok.dataset.tahta = String(mod.tahta);
  bag.kok.dataset.kontrast = String(kontrast);
  bag.kok.style.setProperty('--metin-olcek', String(mod.metinOlcek));
  bag.bul('ipucu').hidden = mod.ipucuKapali;
  bag.bul('fallback').hidden = true;
  defterGoster(bag, mod.tahta);
}

function dolapListele(bag, liste, sec) {
  const dolap = bag.bul('dolap');
  dolap.replaceChildren();
  for (const veri of liste) {
    const dugme = bag.kok.ownerDocument.createElement('button');
    dugme.type = 'button';
    dugme.textContent = veri.baslik;
    dugme.setAttribute('aria-label', veri.baslik);
    dugme.disabled = veri.kilitli && !bag.mod.tahta;
    if (!bag.mod.tahta && veri.tamam) dugme.textContent += veri.yanParca ? ' ★★' : ' ★';
    dugme.addEventListener('click', () => sec(veri.id));
    dolap.append(dugme);
  }
}

function duzenekGoster(bag, veri) {
  bag.etiketler = veri.etiketler ?? {};
  for (const eleman of bag.kok.querySelectorAll('[data-etiket]')) {
    const metin = veri.etiketler?.[eleman.dataset.etiket];
    eleman.hidden = typeof metin !== 'string';
    eleman.textContent = typeof metin === 'string' ? metin : '';
    eleman.setAttribute('aria-label', eleman.textContent);
  }
  bag.bul('hata').hidden = true;
  bag.bul('baslik').textContent = veri.baslik;
  bag.bul('durum').textContent = '';
  bag.bul('dolap').hidden = true;
  bag.bul('uygulama').hidden = false;
  bag.bul('ipucu').hidden = bag.bul('ipucu').hidden || bag.mod.ipucuKapali;
  defterGoster(bag, bag.mod.tahta);
}

function dolapGoster(bag) {
  bag.panel.temizle();
  bag.bul('dolap').hidden = false;
  bag.bul('uygulama').hidden = true;
}

function kemerGoster(bag, araclar, etiketler) {
  const kemer = bag.bul('kemer');
  kemer.replaceChildren();
  for (const ad of araclar.kemer) {
    const metin = etiketler?.[ad];
    if (typeof metin !== 'string') continue;
    const dugme = bag.kok.ownerDocument.createElement('button');
    dugme.type = 'button';
    dugme.textContent = metin;
    dugme.setAttribute('aria-label', metin);
    dugme.dataset.dugmeId = ad;
    dugme.disabled = araclar.kilitli.includes(ad);
    kemer.append(dugme);
  }
}

function sonucGoster(bag, sonuc, tahta) {
  bag.bul('durum').textContent = !tahta && sonuc.tamam ? (sonuc.yanParca ? '★★' : '★') : '';
}

function defterGoster(bag, acik) {
  const gorunur = bag.mod?.tahta || acik;
  bag.bul('defter').hidden = !gorunur;
  bag.kok.dataset.defterAcik = String(gorunur);
}

function kivilcimGoster(bag) {
  const eleman = bag.bul('matik');
  eleman.classList.remove('kivilcim');
  void eleman.offsetWidth;
  eleman.classList.add('kivilcim');
}

function arayuzTik(bag, olay, komut) {
  const dugme = olay.target.closest('button[data-komut]');
  if (!dugme || !bag.kok.contains(dugme) || dugme.disabled) return;
  komut(dugme.dataset.komut);
}

function adresGuncelle(bag, id, seed) {
  const pencere = bag.kok.ownerDocument.defaultView;
  const adres = new URL(pencere.location.href);
  adres.searchParams.set('duzenek', id);
  adres.searchParams.set('seed', String(seed));
  try {
    pencere.history.replaceState(null, '', adres);
  } catch {
    // Opak kökenli iframe, geçmiş API'sini engelleyebilir.
  }
}
