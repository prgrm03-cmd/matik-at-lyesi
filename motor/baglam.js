import { sembolOlustur } from './sembolPaneli.js';
import { sesOlustur } from './ses.js';
import { lazerOlustur } from '../widget/lazer.js';
import { aciolcerOlustur } from '../widget/aciolcer.js';
import { pergelOlustur } from '../widget/pergel.js';
import { gonyeOlustur } from '../widget/gonye.js';
import { aciTablosuOlustur } from '../widget/aciTablosu.js';
import { defterOlustur } from '../defter/defter.js';

function pergelBagla(ctx, hizmetler, ayar) {
  if (ctx.veri.bayraklar.olcuKilidi === true && ayar?.olcuKilidi === false) {
    throw new Error('OLCU_KILIDI_IHLALI');
  }
  const nesne = pergelOlustur(ayar, {
    pxToBirim: ctx.sahne.pxToBirim, sembol: ctx.sembol
  });
  hizmetler.widgetler.push(nesne);
  return nesne;
}

// ADT-014: tablo sağ sütun payı; bütün değerler tezgâh birimidir.
const ACI_TABLOSU_TELEFON = Object.freeze({ x: 620, y: 40, genislik: 360 });
const ACI_TABLOSU_TAHTA = Object.freeze({ x: 660, y: 40, genislik: 320 });

function widgetOlustur(ctx, hizmetler) {
  const veri = ctx.veri;
  return {
    aciolcer(ayar) {
      if (veri.bayraklar.olcuKilidi && ayar?.kilitli !== true) {
        throw new Error('OLCU_KILIDI_IHLALI');
      }
      const rastgele = (ayar?.hizasiz ?? true) ||
        (ayar?.olcekYonu ?? 'rastgele') === 'rastgele';
      // ADT-011 + Ek A: güncel turun alt akışı ana parametre akışını tüketmez.
      const rng = rastgele ? ctx.rng?.alt('widget:aciolcer') : undefined;
      const nesne = aciolcerOlustur(ayar, rng);
      hizmetler.widgetler.push(nesne);
      return nesne;
    },
    aciTablosu: aciTablosuBagla(ctx, hizmetler),
    pergel(ayar) { return pergelBagla(ctx, hizmetler, ayar); },
    gonye(ayar) {
      const nesne = gonyeOlustur(ayar, {
        pxToBirim: ctx.sahne.pxToBirim, sembol: ctx.sembol
      });
      hizmetler.widgetler.push(nesne);
      return nesne;
    },
    lazer(ayar) {
      const nesne = lazerOlustur(ayar, ctx.sembol);
      hizmetler.widgetler.push(nesne);
      return nesne;
    }
  };
}

function aciTablosuBagla(ctx, hizmetler) {
  return (ayar) => {
    aciTablosuKilidiniDogrula(ctx, ayar);
    const konum = ctx.mod.tahta ? ACI_TABLOSU_TAHTA : ACI_TABLOSU_TELEFON;
    const nesne = aciTablosuOlustur(ayar, konum);
    hizmetler.widgetler.push(nesne);
    return nesne;
  };
}

/** @param {Ctx} ctx @param {Object} ayar @returns {void} */
export function aciTablosuKilidiniDogrula(ctx, ayar) {
  if (ctx.veri.bayraklar.olcuKilidi && Array.isArray(ayar?.sutunlar) &&
      ayar.sutunlar.includes('olcu')) {
    throw new Error('WIDGET_AYAR_GECERSIZ');
  }
}

function matikOlustur(veri, arayuz) {
  return {
    soyle(anahtar, ek) {
      const alan = [veri.matik, veri.nedenler, veri.etiketler]
        .find((nesne) => nesne && Object.prototype.hasOwnProperty.call(nesne, anahtar));
      if (!alan || typeof alan[anahtar] !== 'string') throw new Error('MATIK_ANAHTAR_YOK');
      const ad = ek?.ad;
      if (ad !== undefined && (typeof ad !== 'string' || !/^[A-Z]$/.test(ad))) {
        throw new Error('WIDGET_AYAR_GECERSIZ');
      }
      arayuz.soyle(alan[anahtar].replace(/\{ad\}/g, ad || ''));
    },
    ifade(ad) {
      if (!['mutlu', 'saskin', 'uzgun'].includes(ad)) {
        throw new Error('WIDGET_AYAR_GECERSIZ');
      }
      arayuz.ifade(ad);
    },
    kivilcim() { arayuz.kivilcim(); }
  };
}

/** @param {Ctx} ctx @param {Object} arayuz @param {Object} ayarlar @returns {Object} */
export function hizmetleriOlustur(ctx, arayuz, ayarlar) {
  const hizmetler = { widgetler: [], defterler: [] };
  ctx.widget = widgetOlustur(ctx, hizmetler);
  ctx.matik = matikOlustur(ctx.veri, arayuz);
  ctx.defter = defterOlustur({
    bayraklar: ctx.veri.bayraklar, kartlar: ctx.veri.kartlar ?? {},
    rng: ctx.rng, sahne: ctx.sahne, matik: ctx.matik,
    arayuz: { defterAc: () => arayuz.defterAc(), defterKapat: () => arayuz.defterKapat() },
    kayit: nesne => hizmetler.defterler.push(nesne)
  });
  ctx.sembol = sembolOlustur((metin) => arayuz.sembol(metin));
  ctx.ses = sesOlustur(ctx.mod, ayarlar);
  return hizmetler;
}

/** @param {Ctx} ctx @param {Object} duzenek @param {Olay} olay
 * @param {Object} hizmetler @returns {boolean} */
export function girdiDagit(ctx, duzenek, olay, hizmetler) {
  for (const widget of [...hizmetler.widgetler].reverse()) {
    if (widget.girdi(olay)) return true;
  }
  for (const defter of [...hizmetler.defterler].reverse()) {
    if (defter.girdi?.(olay)) return true;
  }
  duzenek.girdi(ctx, olay);
  return false;
}
