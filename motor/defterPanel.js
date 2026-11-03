function eleman(bag, tur, sinif, metin) {
  const oge = bag.kok.ownerDocument.createElement(tur);
  if (sinif) oge.className = sinif;
  if (metin !== undefined) oge.textContent = metin;
  return oge;
}

function etiket(bag, anahtar) {
  return bag.bul(anahtar) ?? anahtar;
}

function satirOlustur(bag, ad) {
  const satir = eleman(bag, 'div', 'defter-satir');
  satir.append(eleman(bag, 'span', '', etiket(bag, ad)));
  return satir;
}

function dugmeOlustur(bag, ad, isaret, tik) {
  const dugme = eleman(bag, 'button', '', isaret);
  dugme.type = 'button';
  dugme.setAttribute('aria-label', etiket(bag, ad) + ' ' + isaret);
  dugme.addEventListener('click', tik);
  return dugme;
}

function sayacOlustur(bag, nesne, hucre, yenile) {
  const satir = satirOlustur(bag, hucre.ad);
  const denetim = eleman(bag, 'div', 'defter-sayac');
  const cikti = eleman(bag, 'output');
  cikti.setAttribute('aria-label', etiket(bag, hucre.ad));
  cikti.setAttribute('aria-live', 'polite');
  const degistir = fark => {
    nesne.hucreKoy(hucre.ad, nesne.deger()[hucre.ad] + fark);
    yenile();
  };
  const eksi = dugmeOlustur(bag, hucre.ad, '−', () => degistir(-1));
  const arti = dugmeOlustur(bag, hucre.ad, '+', () => degistir(1));
  denetim.append(eksi);
  denetim.append(cikti);
  denetim.append(arti);
  satir.append(denetim);
  return {
    satir,
    yenile(degerler) {
      const deger = degerler[hucre.ad];
      cikti.textContent = String(deger);
      eksi.disabled = bag.kilit || deger <= hucre.min;
      arti.disabled = bag.kilit || deger >= hucre.max;
    }
  };
}

function secimOlustur(bag, tanim, yaz, yenile, raf) {
  const satir = satirOlustur(bag, tanim.ad);
  const secim = eleman(bag, 'select');
  secim.setAttribute('aria-label', etiket(bag, tanim.ad));
  for (const deger of tanim.secenekler) {
    const secenek = eleman(bag, 'option', '', etiket(bag, String(deger)));
    secenek.value = String(deger);
    secim.append(secenek);
  }
  secim.addEventListener('change', () => {
    yaz(tanim.ad, tanim.secenekler[secim.selectedIndex]);
    yenile();
  });
  satir.append(secim);
  return {
    satir,
    yenile(degerler) {
      secim.selectedIndex = tanim.secenekler.indexOf(degerler[tanim.ad]);
      secim.disabled = raf && bag.kilit;
    }
  };
}

function rafOlustur(bag, nesne, tanim) {
  const bolum = eleman(bag, 'section', 'defter-bolum');
  bolum.dataset.defterTur = tanim.tur;
  bolum.append(eleman(bag, 'h3', 'defter-baslik', etiket(bag, tanim.etiketAnahtari)));
  const satirlar = [];
  const yenile = () => {
    const degerler = nesne.deger();
    satirlar.forEach(satir => satir.yenile(degerler));
  };
  for (const hucre of tanim.hucreler) {
    const satir = hucre.tur === 'sayac' ? sayacOlustur(bag, nesne, hucre, yenile) :
      secimOlustur(bag, hucre, (ad, deger) => nesne.hucreKoy(ad, deger), yenile, true);
    satirlar.push(satir);
    bolum.append(satir.satir);
  }
  yenile();
  bag.raflar.push(yenile);
  return bolum;
}

function kartOlustur(bag, nesne, tanim) {
  const bolum = eleman(bag, 'section', 'defter-bolum');
  bolum.dataset.defterTur = tanim.tur;
  bolum.append(eleman(bag, 'p', 'defter-kalip', tanim.kalip));
  const satirlar = [];
  const yenile = () => {
    const degerler = nesne.ayar();
    satirlar.forEach(satir => satir.yenile(degerler));
  };
  for (const disli of tanim.disliler) {
    const satir = secimOlustur(bag, disli,
      (ad, deger) => nesne.disliCevir(ad, deger), yenile, false);
    satirlar.push(satir);
    bolum.append(satir.satir);
  }
  yenile();
  return bolum;
}

/**
 * @param {HTMLElement} kok
 * @param {(anahtar:string)=>string|undefined} bul Güncel etiket çözümleyici.
 * @returns {{kayit:(nesne:Object,tanim:Object)=>void,temizle:()=>void,kilitle:()=>void}}
 */
export function defterPaneliOlustur(kok, bul) {
  const icerik = kok.querySelector('[data-defter-icerik]');
  const bag = { kok, bul, raflar: [], kilit: false };
  return {
    kayit(nesne, tanim) {
      if (tanim.tur === 'tahminRafi') icerik.append(rafOlustur(bag, nesne, tanim));
      if (tanim.tur === 'kuralKarti') icerik.append(kartOlustur(bag, nesne, tanim));
    },
    temizle() {
      icerik?.replaceChildren();
      bag.raflar = [];
      bag.kilit = false;
    },
    kilitle() {
      bag.kilit = true;
      bag.raflar.forEach(yenile => yenile());
    }
  };
}
