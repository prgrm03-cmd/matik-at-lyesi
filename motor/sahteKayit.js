// Yalnız henüz teslim edilmemiş fabrikalar seed koşusunda atlanabilir.
const bekleyenHatalar = new WeakSet();

/** @param {Object} ayar @returns {never} Motor içi yer tutucu. */
export function bekleyenFabrika(ayar) {
  void ayar;
  const hata = new Error('IMZA_EKSIK');
  bekleyenHatalar.add(hata);
  throw hata;
}

/** @param {unknown} hata @returns {boolean} Motor içi hata kökeni denetimi. */
export function bekleyenMi(hata) {
  return hata !== null && typeof hata === 'object' && bekleyenHatalar.has(hata);
}
