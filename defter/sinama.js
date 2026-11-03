/** @typedef {{basarili:boolean, sonuclar:{seed:number, tuttu:boolean}[],
 * karsiOrnek:Object|null}} Sinama */
/** @typedef {(rng:Rng)=>{ornek:Object, beklenen:Record<string,string|number>,
 * ciz:(sahne:Sahne)=>void}} Uretici */

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function ortamDogrula(ortam) {
  if (!ortam?.rng || typeof ortam.rng.alt !== 'function' || !ortam.sahne ||
      typeof ortam.matik?.soyle !== 'function') gecersiz();
}

function tamEslesir(ayar, beklenen) {
  const adlar = Object.keys(ayar);
  return adlar.length === Object.keys(beklenen).length &&
    adlar.every(ad => Object.prototype.hasOwnProperty.call(beklenen, ad) &&
      ayar[ad] === beklenen[ad]);
}

function ornekleriSina(kart, uretici, n, kok, ortam) {
  const sinama = { basarili: true, sonuclar: [], karsiOrnek: null };
  for (let i = 0; i < n; i++) {
    const alt = kok.alt('ornek:' + i);
    const sonuc = uretici(alt);
    const tuttu = tamEslesir(kart.ayar(), sonuc.beklenen);
    sinama.sonuclar.push({ seed: alt.seed, tuttu });
    if (!tuttu && sinama.basarili) {
      sinama.basarili = false;
      sinama.karsiOrnek = sonuc.ornek;
      sonuc.ciz(ortam.sahne);
      ortam.matik.soyle('karsiOrnek');
    }
  }
  if (sinama.basarili) ortam.matik.soyle('sinamaTamam');
  return sinama;
}

/** @param {DefterOrtam} ortam
 * @returns {(kart:KuralKarti, uretici:Uretici, n?:number)=>Promise<Sinama>} */
export function sinaOlustur(ortam) {
  ortamDogrula(ortam);
  let c = 0;
  return function sina(kart, uretici, n = 3) {
    if (typeof uretici !== 'function' || !Number.isInteger(n) || n < 1 ||
        typeof kart?.ayar !== 'function') gecersiz();
    c += 1;
    const kok = ortam.rng.alt('sina:' + c);
    ortam.matik.soyle('sinamaBasladi');
    return Promise.resolve(ornekleriSina(kart, uretici, n, kok, ortam));
  };
}
