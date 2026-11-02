const ANAHTAR = 'matik.atolye.tema1';
const AZAMI_BAYT = 8192;
const DUZENEK = /^D(0[1-9]|1[0-8])[a-f]?$/;

/**
 * @typedef {Object} DuzenekKaydi
 * @property {boolean} tamam
 * @property {boolean} yanParca
 * @property {number} tekrar
 * @property {number[]} son5
 * @property {number} sonSeed
 */
/**
 * @typedef {Object} Kayit
 * @property {1} semaSurumu
 * @property {'TYMM-2026'} curriculumVersion
 * @property {string} uygulamaSurumu
 * @property {number} olusturma
 * @property {boolean} pilotMode
 * @property {{ses:boolean, metinOlcek:1|1.25}} ayarlar
 * @property {Record<string, DuzenekKaydi>} duzenekler
 * @property {{aciklar:string[]}} ilerleme
 */

/** @param {Mod} mod @param {number} [zaman] @returns {Kayit} */
export function kayitOlustur(mod, zaman = 0) {
  return {
    semaSurumu: 1,
    curriculumVersion: 'TYMM-2026',
    uygulamaSurumu: '1.0.0',
    olusturma: Number.isFinite(zaman) ? zaman : 0,
    pilotMode: mod.pilot === true,
    ayarlar: { ses: true, metinOlcek: 1.25 },
    duzenekler: {},
    ilerleme: { aciklar: [] }
  };
}

function nesneMi(deger) {
  return deger !== null && typeof deger === 'object' && !Array.isArray(deger);
}

function tamSayi(deger) {
  return Number.isSafeInteger(deger) && deger >= 0 ? deger : 0;
}

function duzenekTemizle(eski, yildizlarYalniz) {
  const kayit = nesneMi(eski) ? eski : {};
  return {
    tamam: kayit.tamam === true,
    yanParca: kayit.yanParca === true,
    tekrar: yildizlarYalniz ? 0 : tamSayi(kayit.tekrar),
    son5: !yildizlarYalniz && Array.isArray(kayit.son5)
      ? kayit.son5.filter(Number.isFinite).slice(-5) : [],
    sonSeed: !yildizlarYalniz && Number.isInteger(kayit.sonSeed)
      && kayit.sonSeed >= 0 && kayit.sonSeed <= 4294967295 ? kayit.sonSeed : 0
  };
}

function duzenekleriTasi(hedef, kaynak, yildizlarYalniz) {
  if (!nesneMi(kaynak)) return;
  for (const [id, deger] of Object.entries(kaynak)) {
    if (DUZENEK.test(id)) hedef[id] = duzenekTemizle(deger, yildizlarYalniz);
  }
}

function kayitTemizle(eski, mod) {
  const yeni = kayitOlustur(mod, Date.now());
  if (!nesneMi(eski)) return yeni;
  const surumAyni = eski.semaSurumu === 1;
  duzenekleriTasi(yeni.duzenekler, eski.duzenekler, !surumAyni);
  if (!surumAyni) return yeni;
  yeni.olusturma = tamSayi(eski.olusturma);
  yeni.pilotMode = eski.pilotMode === true;
  if (nesneMi(eski.ayarlar)) {
    yeni.ayarlar.ses = eski.ayarlar.ses !== false;
    yeni.ayarlar.metinOlcek = eski.ayarlar.metinOlcek === 1 ? 1 : 1.25;
  }
  const aciklar = eski.ilerleme?.aciklar;
  if (Array.isArray(aciklar)) {
    yeni.ilerleme.aciklar = [...new Set(aciklar.filter(ad => /^[A-H]$/.test(ad)))];
  }
  return yeni;
}

/** @param {Mod} mod @returns {Kayit} */
export function kayitOku(mod) {
  if (mod.tahta) return kayitOlustur(mod);
  try {
    const metin = globalThis.localStorage.getItem(ANAHTAR);
    return kayitTemizle(metin ? JSON.parse(metin) : null, mod);
  } catch {
    return kayitOlustur(mod, Date.now());
  }
}

function yildizlariKoru(yeni, eski) {
  for (const [id, deger] of Object.entries(eski.duzenekler)) {
    const hedef = yeni.duzenekler[id] || duzenekTemizle({}, false);
    hedef.tamam = hedef.tamam || deger.tamam;
    hedef.yanParca = hedef.yanParca || deger.yanParca;
    hedef.tekrar = Math.max(hedef.tekrar, deger.tekrar);
    yeni.duzenekler[id] = hedef;
  }
}

/** Yalnız tamamlanma veya ayar değişiminden sonra motor çağırır.
 * @param {Mod} mod @param {Kayit} kayit @returns {boolean}
 */
export function kayitYaz(mod, kayit) {
  if (mod.tahta) return false;
  try {
    const yeni = kayitTemizle(kayit, mod);
    yildizlariKoru(yeni, kayitOku(mod));
    const metin = JSON.stringify(yeni);
    if (new TextEncoder().encode(metin).byteLength > AZAMI_BAYT) return false;
    globalThis.localStorage.setItem(ANAHTAR, metin);
    return true;
  } catch {
    return false;
  }
}

/** @param {Kayit} kayit @param {Ctx} ctx @param {Sonuc} sonuc @returns {void} */
export function tamamlandiKaydet(kayit, ctx, sonuc) {
  if (ctx.mod.tahta || sonuc.tamam !== true) return;
  if (!DUZENEK.test(ctx.id)) throw new Error('SEMA_HATASI');
  const onceki = duzenekTemizle(kayit.duzenekler[ctx.id], false);
  kayit.duzenekler[ctx.id] = {
    tamam: true,
    yanParca: onceki.yanParca || sonuc.yanParca === true,
    tekrar: Math.min(Number.MAX_SAFE_INTEGER, onceki.tekrar + 1),
    son5: onceki.son5,
    sonSeed: ctx.rng.seed
  };
}
