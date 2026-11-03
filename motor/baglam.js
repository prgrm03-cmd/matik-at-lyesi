import { sembolOlustur } from './sembolPaneli.js';
import { sesOlustur } from './ses.js';
import { lazerOlustur } from '../widget/lazer.js';
import { aciolcerOlustur } from '../widget/aciolcer.js';
import { pergelOlustur } from '../widget/pergel.js';
import { gonyeOlustur } from '../widget/gonye.js';
import { bekleyenFabrika as bekleyen } from './sahteKayit.js';

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
    aciTablosu: bekleyen,
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
  ctx.defter = {
    tahminRafi: bekleyen,
    kuralKarti: bekleyen,
    sina(kart, uretici, n) {
      void uretici;
      void n;
      return bekleyen(kart);
    },
    kisayolYuvasi: bekleyen,
    ac() { arayuz.defterAc(); },
    kapat() { arayuz.defterKapat(); }
  };
  ctx.matik = matikOlustur(ctx.veri, arayuz);
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
