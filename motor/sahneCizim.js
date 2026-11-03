import * as geo from '../geo/index.js';

// Çizim hazırlığı mantıksal koordinatta kalır; yüzeye erişmez.
function nokta(P) {
  return { x: P.x, y: P.y };
}

function parcaYakin(P, A, B, tol) {
  if (geo.uzaklik(A, B) === 0) return geo.uzaklik(P, A) <= tol;
  const d = { A, yon: geo.yonAci(A, B) };
  const { ayak } = geo.dikme(d, P);
  const konum = (ayak.x - A.x) * (B.x - A.x) + (ayak.y - A.y) * (B.y - A.y);
  const uzunluk = geo.uzaklik(A, B);
  if (konum < 0) return geo.uzaklik(P, A) <= tol;
  if (konum > uzunluk * uzunluk) return geo.uzaklik(P, B) <= tol;
  return geo.uzaklik(P, ayak) <= tol;
}

function kenarlaraYakin(P, noktalar, kapali, tol) {
  const adet = kapali ? noktalar.length : noktalar.length - 1;
  for (let i = 0; i < adet; i += 1) {
    if (parcaYakin(P, noktalar[i], noktalar[(i + 1) % noktalar.length], tol)) return true;
  }
  return false;
}

function icinde(P, noktalar) {
  let ic = false;
  for (let i = 0, j = noktalar.length - 1; i < noktalar.length; j = i, i += 1) {
    const A = noktalar[i];
    const B = noktalar[j];
    if ((A.y > P.y) !== (B.y > P.y) &&
        P.x < (B.x - A.x) * (P.y - A.y) / (B.y - A.y) + A.x) ic = !ic;
  }
  return ic;
}

function yonluAci(bas, bit, yon) {
  // Yay ve aciYayi açıları sayıdır; geo.aciOlc ise kol noktaları bekler (#11).
  if (!Number.isFinite(bas) || !Number.isFinite(bit) || !['saat', 'ters'].includes(yon)) {
    throw new Error('PARAMETRE_ARALIK_DISI');
  }
  return geo.aciNormalize(yon === 'ters' ? bas - bit : bit - bas);
}

function yayNoktalari(y) {
  const aci = yonluAci(y.bas, y.bit, y.yon);
  const adet = Math.max(1, Math.ceil(aci / 5));
  const yon = y.yon === 'ters' ? -1 : 1;
  return Array.from({ length: adet + 1 }, (_, i) =>
    geo.ilerle(y.merkez, y.bas + yon * aci * i / adet, y.r));
}

function tamCember(c) {
  return Array.from({ length: 72 }, (_, i) => geo.ilerle(c.merkez, i * 5, c.r));
}

function hatUclari(A, yon, tur) {
  const uclar = geo.dogruKenarKesisimi({ A, yon });
  if (tur === 'dogru') return uclar;
  const birim = geo.ilerle(A, yon, 1);
  const ileri = uclar.filter(P => (P.x - A.x) * (birim.x - A.x) +
    (P.y - A.y) * (birim.y - A.y) >= 0);
  ileri.sort((P, Q) => geo.uzaklik(A, Q) - geo.uzaklik(A, P));
  return ileri.length ? [nokta(A), ileri[0]] : [];
}

function ucCizgileri(A, B, tur, boyut) {
  const yon = geo.yonAci(A, B);
  const kapak = P => [geo.ilerle(P, yon - 90, boyut), geo.ilerle(P, yon + 90, boyut)];
  const ok = (P, aci) => [geo.ilerle(P, aci - 150, boyut * 2), P,
    geo.ilerle(P, aci + 150, boyut * 2)];
  return [tur === 'dogru' ? ok(A, yon + 180) : kapak(A),
    tur === 'parca' ? kapak(B) : ok(B, yon)];
}

function hat(tur, A, B, yon, secenek, birim) {
  const noktalar = tur === 'parca' ? [nokta(A), nokta(B)] : hatUclari(A, yon, tur);
  const ek = noktalar.length === 2
    ? ucCizgileri(noktalar[0], noktalar[1], tur, birim(4)) : [];
  return { tur, noktalar, ek, secenek, kapali: false, dolgu: false };
}

/** @param {string} tur @param {unknown[]} arg @param {Function} birim @returns {Object} */
export function cizimHazirla(tur, arg, birim) {
  if (tur === 'parca') return hat(tur, arg[0], arg[1], 0, arg[2] || {}, birim);
  if (tur === 'isin' || tur === 'dogru') {
    return hat(tur, arg[0], null, arg[1], arg[2] || {}, birim);
  }
  if (tur === 'pim') return pimHazirla(arg[0], arg[1] || {}, birim);
  if (tur === 'cember') return cemberHazirla(arg[0], arg[1] || {});
  if (tur === 'yay') return yayHazirla(arg[0], arg[1] || {});
  if (tur === 'aciYayi') return aciHazirla(arg, birim);
  const secenek = arg[1] || {};
  return { tur, noktalar: arg[0].map(nokta), secenek, kapali: true,
    dolgu: !!secenek.dolgu, ek: [] };
}

function pimHazirla(P, secenek, birim) {
  const r = birim({ kucuk: 4, normal: 6, buyuk: 9 }[secenek.boyut] || 6);
  return { tur: 'pim', merkez: nokta(P), r, noktalar: tamCember({ merkez: P, r }),
    secenek, kapali: true, dolgu: true, ek: [] };
}

function cemberHazirla(c, secenek) {
  return { tur: 'cember', merkez: nokta(c.merkez), r: c.r, noktalar: tamCember(c),
    secenek, kapali: true, dolgu: !!secenek.dolgu, ek: [] };
}

function yayHazirla(y, secenek) {
  return { tur: 'yay', merkez: nokta(y.merkez), yay: { ...y }, noktalar: yayNoktalari(y),
    secenek, kapali: false, dolgu: false, ek: [] };
}

function aciHazirla(arg, birim) {
  const [merkez, kol1, kol2] = arg;
  const secenek = arg[3] || {};
  const r = secenek.r || birim(18);
  const aci = geo.aciFark(kol1, kol2);
  const yon = yonluAci(kol1, kol2, 'saat') <= 180 ? 'saat' : 'ters';
  if (aci === 90) {
    const A = geo.ilerle(merkez, kol1, r);
    const B = geo.ilerle(A, kol2, r);
    const C = geo.ilerle(merkez, kol2, r);
    return { tur: 'aciYayi', noktalar: [A, B, C], secenek, ek: [], kapali: false };
  }
  return yayHazirla({ merkez, r, bas: kol1, bit: kol2, yon }, secenek);
}

/** @param {Object} cizim @param {'alt'|'ust'} katman @returns {Object} */
export function hedefHazirla(cizim, katman) {
  const P = cizim.merkez || cizim.noktalar[0] || { x: 0, y: 0 };
  return { id: cizim.secenek.id, tur: cizim.tur, nokta: nokta(P), katman,
    vur: (Q, tol) => hedefVur(cizim, Q, tol) };
}

function hedefVur(c, P, tol) {
  // CSS sınırının kayan nokta yuvarlaması yakalama alanını daraltmasın.
  tol += Number.EPSILON * 1000;
  if (c.tur === 'pim') return geo.uzaklik(P, c.merkez) <= tol;
  if (c.tur === 'cember') {
    const uzaklik = geo.uzaklik(P, c.merkez);
    return c.dolgu ? uzaklik <= c.r + tol : Math.abs(uzaklik - c.r) <= tol;
  }
  if (c.tur === 'yay' && c.yay.r > 0) {
    return geo.yayUzerindeMi(P, c.yay, tol / c.yay.r);
  }
  return kenarlaraYakin(P, c.noktalar, c.kapali, tol) ||
    (!!c.dolgu && icinde(P, c.noktalar));
}
