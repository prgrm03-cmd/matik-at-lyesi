import { aciNormalize, dogruUzerindeMi, ilerle, uzaklik, yonAci } from '../geo/index.js';

/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Isin */
/** @typedef {{A:Nokta, yon:number}} Dogru */
/** @typedef {{mod?:'parca'|'isin'|'dogru', donenIsin?:boolean,
 * carkAdim?:number, sabitA?:boolean}} LazerAyar */
/** @typedef {Object} Lazer
 * @property {'parca'|'isin'|'dogru'} mod
 * @property {Nokta|null} A
 * @property {Nokta|null} B
 * @property {number} yon
 * @property {()=>Parca|Isin|Dogru|null} hat
 * @property {(noktalar:Nokta[],tolBirim:number)=>boolean[]} gecerMi
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 * @property {()=>Object} durum
 * @property {(durum:Object)=>void} yukle
 */

const MODLAR = Object.freeze(['parca', 'isin', 'dogru']);
const SEMBOLLER = Object.freeze({ parca: '[AB]', isin: '[AB', dogru: 'AB' });
const CARK_YARICAPI = 64;

function gecersiz() {
  throw new Error('WIDGET_AYAR_GECERSIZ');
}

function noktaKopyala(P) {
  if (P === null) return null;
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) gecersiz();
  return { x: P.x, y: P.y };
}

function yonDogrula(yon) {
  if (!Number.isFinite(yon)) gecersiz();
  return aciNormalize(Math.round(yon));
}

function modDogrula(mod, donenIsin) {
  if (!MODLAR.includes(mod) || (donenIsin && mod !== 'isin')) gecersiz();
  return mod;
}

function ayarDogrula(ayar, sembol) {
  if (ayar !== undefined && (!ayar || typeof ayar !== 'object' || Array.isArray(ayar))) {
    gecersiz();
  }
  const { mod = 'parca', donenIsin = false, carkAdim = 1, sabitA = false } = ayar || {};
  if (typeof sabitA !== 'boolean') gecersiz();
  if (typeof donenIsin !== 'boolean' || !Number.isSafeInteger(carkAdim) || carkAdim <= 0) {
    gecersiz();
  }
  if (sembol !== undefined && (!sembol || typeof sembol.goster !== 'function')) gecersiz();
  return { mod: modDogrula(mod, donenIsin), donenIsin, carkAdim, sabitA };
}

function hatOlustur(durum, donenIsin) {
  if (!durum.A) return null;
  const A = noktaKopyala(durum.A);
  if (donenIsin) return { A, yon: durum.yon };
  if (!durum.B || uzaklik(A, durum.B) === 0) return null;
  const B = noktaKopyala(durum.B);
  return durum.mod === 'parca' ? { A, B } : { A, yon: yonAci(A, B) };
}

function sinirIcinde(P, durum, donenIsin) {
  if (durum.mod === 'dogru') return true;
  const B = donenIsin ? ilerle(durum.A, durum.yon, 1) : durum.B;
  const dx = B.x - durum.A.x;
  const dy = B.y - durum.A.y;
  const pay = (P.x - durum.A.x) * dx + (P.y - durum.A.y) * dy;
  // Tolerans yalnız dik uzaklıktadır; ışın ve parça uçları uzatılmaz (ADT-006).
  return pay >= 0 && (durum.mod !== 'parca' || pay <= dx * dx + dy * dy);
}

function noktalariDene(durum, donenIsin, noktalar, tolBirim) {
  if (!Array.isArray(noktalar) || !Number.isFinite(tolBirim) || tolBirim < 0) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  noktalar.forEach(noktaKopyala);
  const hat = hatOlustur(durum, donenIsin);
  if (!hat) return noktalar.map(() => false);
  const dogru = { A: hat.A, yon: hat.B ? yonAci(hat.A, hat.B) : hat.yon };
  return noktalar.map(P =>
    dogruUzerindeMi(P, dogru, tolBirim) && sinirIcinde(P, durum, donenIsin));
}

function lazerCiz(durum, ayar, sahne) {
  const { donenIsin, sabitA } = ayar;
  sahne.katman('ust');
  const hat = hatOlustur(durum, donenIsin);
  if (hat) {
    const secenek = { renk: 'turuncu', id: 'lazerHat' };
    if (durum.mod === 'parca') sahne.parca(hat.A, hat.B, secenek);
    else sahne[durum.mod](hat.A, hat.yon, secenek);
  }
  if (durum.A) {
    const secenek = { ad: 'A', renk: 'mavi' };
    if (!sabitA) secenek.id = 'lazerA';
    sahne.pim(durum.A, secenek);
  }
  if (durum.B && !donenIsin) {
    sahne.pim(durum.B, { id: 'lazerB', ad: 'B', renk: 'mavi' });
  }
  if (durum.A && donenIsin) {
    sahne.cember({ merkez: durum.A, r: CARK_YARICAPI }, { renk: 'gri' });
    const P = ilerle(durum.A, durum.yon, CARK_YARICAPI);
    sahne.pim(P, { id: 'lazerCark', renk: 'turuncu' });
  }
}

function hedefGecerli(hedef, donenIsin, sabitA) {
  if (hedef === 'lazerA' && sabitA) return false;
  return hedef === 'lazerA' || (donenIsin ? hedef === 'lazerCark' : hedef === 'lazerB');
}

function girdiyiIsle(olay, durum, ayar, secim) {
  if (!olay || !['bas', 'surukle', 'birak'].includes(olay.tur)) return false;
  const hedef = olay.hedef || secim.hedef;
  if (!hedefGecerli(hedef, ayar.donenIsin, ayar.sabitA)) return false;
  if (olay.tur === 'bas') {
    secim.hedef = hedef;
    return true;
  }
  if (olay.tur === 'birak') {
    secim.hedef = null;
    return true;
  }
  if (hedef === 'lazerCark') {
    if (!Number.isFinite(olay.dx)) gecersiz();
    durum.yon = yonDogrula(durum.yon + olay.dx * ayar.carkAdim);
  } else {
    durum[hedef === 'lazerA' ? 'A' : 'B'] = noktaKopyala(olay);
  }
  return true;
}

function durumuKopyala(durum) {
  return {
    mod: durum.mod, A: noktaKopyala(durum.A), B: noktaKopyala(durum.B), yon: durum.yon
  };
}

function durumuYukle(durum, kayit, ayar, sembol, secim) {
  if (!kayit || typeof kayit !== 'object' || Array.isArray(kayit)) gecersiz();
  const yeni = {
    mod: modDogrula(kayit.mod, ayar.donenIsin),
    A: noktaKopyala(kayit.A),
    B: noktaKopyala(kayit.B),
    yon: yonDogrula(kayit.yon)
  };
  const degisti = durum.mod !== yeni.mod;
  Object.assign(durum, yeni);
  secim.hedef = null;
  if (degisti) sembol?.goster(SEMBOLLER[durum.mod]);
}

function nesneOlustur(durum, ayar, sembol) {
  const secim = { hedef: null };
  return {
    get mod() { return durum.mod; },
    set mod(deger) {
      modDogrula(deger, ayar.donenIsin);
      if (durum.mod === deger) return;
      durum.mod = deger;
      sembol?.goster(SEMBOLLER[deger]);
    },
    get A() { return durum.A; },
    set A(P) { durum.A = noktaKopyala(P); },
    get B() { return durum.B; },
    set B(P) { durum.B = noktaKopyala(P); },
    get yon() { return durum.yon; },
    set yon(deger) { durum.yon = yonDogrula(deger); },
    hat() { return hatOlustur(durum, ayar.donenIsin); },
    gecerMi(noktalar, tolBirim) {
      return noktalariDene(durum, ayar.donenIsin, noktalar, tolBirim);
    },
    ciz(sahne) { lazerCiz(durum, ayar, sahne); },
    girdi(olay) { return girdiyiIsle(olay, durum, ayar, secim); },
    durum() { return durumuKopyala(durum); },
    yukle(kayit) { durumuYukle(durum, kayit, ayar, sembol, secim); }
  };
}

/** @param {LazerAyar} ayar @param {Sembol} sembol @returns {Lazer} */
export function lazerOlustur(ayar, sembol) {
  const secenek = ayarDogrula(ayar, sembol);
  const durum = { mod: secenek.mod, A: null, B: null, yon: 0 };
  const lazer = nesneOlustur(durum, secenek, sembol);
  sembol?.goster(SEMBOLLER[durum.mod]);
  return lazer;
}
