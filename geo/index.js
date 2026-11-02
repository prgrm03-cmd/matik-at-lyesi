/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Isin */
/** @typedef {{A:Nokta, yon:number}} Dogru */
/** @typedef {{merkez:Nokta, r:number}} Cember */
/** @typedef {{merkez:Nokta, r:number, bas:number, bit:number, yon:'saat'|'ters'}} Yay */
/** @typedef {{koseler:Nokta[]}} Cokgen */
/** @typedef {'dar'|'dik'|'genis'|'dogru'|'tam'|'sifir'} AciTuru */
/** @typedef {typeof import('./index.js')} Geo */

/** Sözleşme §3.2: nokta işlevleri. */
export {
  uzaklik, ortaNokta, yonAci, ilerle, esitMi
} from './nokta.js';

/** Sözleşme §3.2: aci işlevleri. */
export {
  aciNormalize, aciFark, aciOlc, aciOku, aciTuru, aciTuruTol, dikMi, paralelMi
} from './aci.js';

/** Sözleşme §3.2: dogru işlevleri. */
export {
  dogruUzerindeMi, dikme, noktaDogruUzakligi, dogruKenarKesisimi, hangiTarafta
} from './dogru.js';

/** Sözleşme §3.2: cember işlevleri. */
export {
  cemberUzerindeMi, cemberIcindeMi, yayUzerindeMi
} from './cember.js';

/** Sözleşme §3.2: kesisim işlevleri. */
export {
  kesisimDogruDogru, kesisimDogruParca, kesisimParcaParca, kesisimCemberCember,
  kesisimCemberDogru, kesisimYayIsin, ardisikKesisim, kesenMi
} from './kesisim.js';

/** Sözleşme §3.2: cokgen işlevleri. */
export {
  disBukeyMi, kendiniKeserMi, icAcilar, disAci, komsuMu, duzgunMu, ucgenKapanir, ucgenTuru,
  sekliDondur
} from './cokgen.js';

/** Sözleşme §3.2: tolerans işlevleri. */
export {
  TOLERANS, toleransIcinde, tAci
} from './tolerans.js';

/** Sözleşme §3.2: uretici işlevleri. */
export {
  rastgeleAci, rastgeleYon, rastgeleEgim, rastgeleKolUzunlugu, rastgeleDisBukeyCokgen,
  rastgeleUcgen, kesisimGarantiliParametre, rastgeleCemberParametre, lazerSenaryosu
} from './uretici.js';

