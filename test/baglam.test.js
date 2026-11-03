import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hizmetleriOlustur, girdiDagit } from '../motor/baglam.js';
import { sembolOlustur } from '../motor/sembolPaneli.js';
import { rngOlustur } from '../motor/rng.js';

function kur(kilitli = false) {
  const cagrilar = [];
  const arayuz = Object.fromEntries([
    'soyle', 'ifade', 'kivilcim', 'sembol', 'defterAc', 'defterKapat'
  ].map(ad => [ad, (...degerler) => cagrilar.push({ ad, degerler })]));
  const ctx = {
    veri: {
      bayraklar: { olcuKilidi: kilitli },
      matik: { giris: 'TODO-R1 {ad}' },
      nedenler: { tamam: 'TODO-R1' },
      etiketler: { calistir: 'TODO-R1' }
    },
    mod: { tahta: true }, rng: rngOlustur(42)
  };
  const hizmetler = hizmetleriOlustur(ctx, arayuz, { ses: true });
  return { ctx, arayuz, cagrilar, hizmetler };
}

describe('hizmetleriOlustur', () => {
  it('kilit ihlalini ayar doğrulamasından önce bildirir ve kilitli açıölçer kurar', () => {
    const { ctx } = kur(true);
    for (const ayar of [undefined, {}, { kilitli: false }]) {
      assert.throws(() => ctx.widget.aciolcer(ayar), { message: 'OLCU_KILIDI_IHLALI' });
    }
    assert.equal(ctx.widget.aciolcer({ kilitli: true }).girdi({ tur: 'bas' }), false);
    assert.throws(() => kur().ctx.widget.aciolcer({ kilitli: 'evet' }), {
      message: 'WIDGET_AYAR_GECERSIZ'
    });
  });
});

describe('hizmetleriOlustur', () => {
  it('sonraki biletlere ait bütün fabrikalar tanımlı hata koduyla bekler', () => {
    const { ctx } = kur();
    for (const ad of ['tahminRafi', 'kuralKarti', 'sina', 'kisayolYuvasi']) {
      assert.throws(() => ctx.defter[ad]({}), { message: 'IMZA_EKSIK' });
    }
  });
});

describe('hizmetleriOlustur', () => {
  it('Matik anahtarlarını üç alanda arar ve yalnız tek pim harfi kabul eder', () => {
    const { ctx, cagrilar } = kur();
    ctx.matik.soyle('giris', { ad: 'A' });
    ctx.matik.soyle('tamam');
    ctx.matik.soyle('calistir');
    assert.deepEqual(cagrilar.map(c => c.degerler[0]), ['TODO-R1 A', 'TODO-R1', 'TODO-R1']);
    for (const ad of [17, '17', 'AB', '<A>', '', null]) {
      assert.throws(() => ctx.matik.soyle('giris', { ad }), {
        message: 'WIDGET_AYAR_GECERSIZ'
      });
    }
    assert.throws(() => ctx.matik.soyle('olmayan'), { message: 'MATIK_ANAHTAR_YOK' });
    assert.throws(() => ctx.matik.soyle('toString'), { message: 'MATIK_ANAHTAR_YOK' });
  });
});

describe('hizmetleriOlustur', () => {
  it('ifade ve Defter işlemlerini HTML bağdaştırıcısına iletir', () => {
    const { ctx, cagrilar } = kur();
    ctx.matik.ifade('saskin');
    ctx.matik.kivilcim();
    ctx.defter.ac();
    ctx.defter.kapat();
    assert.deepEqual(cagrilar.map(c => c.ad), ['ifade', 'kivilcim', 'defterAc', 'defterKapat']);
    assert.throws(() => ctx.matik.ifade('olmayan'), { message: 'WIDGET_AYAR_GECERSIZ' });
  });
});

describe('hizmetleriOlustur', () => {
  it('tahta modunda ses altyapısına erişmez', () => {
    const onceki = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true, get() { throw new Error('SES_ERISIMI'); }
    });
    try {
      kur().ctx.ses.cal('tik');
    } finally {
      if (onceki) Object.defineProperty(globalThis, 'AudioContext', onceki);
      else delete globalThis.AudioContext;
    }
  });
});

function dagitim(tuketen) {
  const sira = [];
  const girdi = ad => ({ girdi() { sira.push(ad); return tuketen === ad; } });
  const hizmetler = {
    widgetler: [girdi('widgetAlt'), girdi('widgetUst')],
    defterler: [girdi('defterAlt'), girdi('defterUst')]
  };
  const ctx = {};
  const olay = { tur: 'tik', x: 10, y: 20 };
  const duzenek = { girdi(baglam, verilen) {
    assert.equal(baglam, ctx);
    assert.equal(verilen, olay);
    sira.push('duzenek');
  } };
  const tuketildi = girdiDagit(ctx, duzenek, olay, hizmetler);
  return { sira, tuketildi };
}

describe('girdiDagit', () => {
  it('üst widget tüketince Defter ve düzeneğe iletmez', () => {
    assert.deepEqual(dagitim('widgetUst'), { sira: ['widgetUst'], tuketildi: true });
  });
});

describe('girdiDagit', () => {
  it('Defter tüketince düzeneğe iletmez', () => {
    assert.deepEqual(dagitim('defterUst'), {
      sira: ['widgetUst', 'widgetAlt', 'defterUst'], tuketildi: true
    });
  });
});

describe('girdiDagit', () => {
  it('tüketilmeyen olay widget ve Defter sonrasında düzeneğe ulaşır', () => {
    assert.deepEqual(dagitim(null), {
      sira: ['widgetUst', 'widgetAlt', 'defterUst', 'defterAlt', 'duzenek'],
      tuketildi: false
    });
  });
});

describe('sembolOlustur', () => {
  it('sembolleri ve verilen pim harflerini gösterir, paneli temizler', () => {
    const cagrilar = [];
    const sembol = sembolOlustur(metin => cagrilar.push(metin));
    sembol.goster('[AB]');
    sembol.goster('parca', 'C', 'D');
    sembol.goster('isin', 'E', 'F');
    sembol.goster('dogru', 'G', 'H');
    sembol.temizle();
    assert.deepEqual(cagrilar, ['[AB]', '[CD]', '[EF', 'GH', '']);
  });
});

describe('sembolOlustur', () => {
  it('bilinmeyen ve kalıtılmış nesne anahtarlarını sembol kabul etmez', () => {
    const sembol = sembolOlustur(() => {});
    for (const ad of ['olmayan', 'toString', 'constructor', '__proto__']) {
      assert.throws(() => sembol.goster(ad), { message: 'WIDGET_AYAR_GECERSIZ' });
    }
    assert.throws(() => sembol.goster('parca', '17', 'B'), {
      message: 'WIDGET_AYAR_GECERSIZ'
    });
  });
});

describe('hizmetleriOlustur', () => {
  it('gerçek lazeri giriş sırasına bağlar ve sembolü arayüze iletir', () => {
    const { ctx, hizmetler, cagrilar } = kur();
    const lazer = ctx.widget.lazer({ mod: 'parca' });
    lazer.A = { x: 10, y: 20 };
    lazer.B = { x: 30, y: 20 };
    assert.equal(hizmetler.widgetler[0], lazer);
    const duzenek = { girdi() { assert.fail('olay tuketilmeliydi'); } };
    const bas = { tur: 'bas', hedef: 'lazerA', x: 10, y: 20 };
    assert.equal(girdiDagit(ctx, duzenek, bas, hizmetler), true);
    assert.equal(girdiDagit(ctx, duzenek, { ...bas, tur: 'surukle', x: 15 }, hizmetler), true);
    assert.equal(lazer.A.x, 15);
    lazer.mod = 'isin';
    assert.ok(cagrilar.some(c => c.ad === 'sembol' && c.degerler[0] === '[AB'));
  });
});
