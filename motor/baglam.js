import { sembolOlustur } from './sembolPaneli.js';
import { sesOlustur } from './ses.js';

// Fabrikalar sonraki biletlerde bu noktada bağlanır; düzeneğe yeni alan eklenmez.
function bekleyen(ayar) {
  void ayar;
  throw new Error('IMZA_EKSIK');
}

function widgetOlustur(veri) {
  return {
    aciolcer(ayar) {
      if (veri.bayraklar.olcuKilidi && ayar?.kilitli !== true) {
        throw new Error('OLCU_KILIDI_IHLALI');
      }
      return bekleyen();
    },
    aciTablosu: bekleyen,
    pergel: bekleyen,
    gonye: bekleyen,
    lazer: bekleyen
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
  ctx.widget = widgetOlustur(ctx.veri);
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
  return { widgetler: [], defterler: [] };
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
