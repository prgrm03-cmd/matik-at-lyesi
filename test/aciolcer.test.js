import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { aciolcerOlustur } from '../widget/aciolcer.js';
import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { rngOlustur } from '../motor/rng.js';
import { sahneOlustur } from '../motor/sahne.js';
import { sunumOlustur } from '../motor/sunum.js';
import { motorOrtami } from './destek/motorOrtam.js';
import * as geo from '../geo/index.js';

const SOKET = Object.freeze({ x: 500, y: 450 });
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;
const RNG_HATASI = 'aciolcer: rng gerekli (hizasiz veya olcekYonu:rastgele)';

function kur(ayar = {}, olcek = 1) {
  const veri = { id: 'D09a', bayraklar: {}, matik: {}, nedenler: {}, etiketler: {} };
  const ctx = ctxSahteOlustur('D09a', veri, 17);
  ctx.sahne.olcek = olcek;
  const w = aciolcerOlustur(
    { soket: SOKET, hizasiz: false, olcekYonu: 'ic', ...ayar }, rngOlustur(17));
  return { w, ctx, sahne: ctx.sahne, kayit: sahneKaydi(ctx) };
}
function cizilmis(ayar, olcek) {
  const ortam = kur(ayar, olcek);
  ortam.w.ciz(ortam.sahne);
  const koseler = ortam.kayit.cagrilar.find(c => c.ad === 'cokgen').arg[0];
  ortam.r = Math.max(...koseler.map(P => geo.uzaklik(ortam.w.merkez, P)));
  return ortam;
}
function olay(tur, P, ek = {}) {
  return { tur, x: P.x, y: P.y, ...ek };
}
function yakin(a, b) {
  dogrula.ok(Math.abs(a - b) < 1e-7, a + ' / ' + b);
}

describe('aciolcerOlustur', () => {
  it('Sözleşmedeki üyeleri ve ortak kalıbı sağlar, ayar noktasını kopyalar.', () => {
    const soket = { ...SOKET };
    const { w } = kur({ soket });
    dogrula.deepEqual(Object.keys(w).sort(), ['merkez', 'donus', 'olcekYonu', 'hizaliMi',
      'okuma', 'hizala', 'ciz', 'girdi', 'durum', 'yukle'].sort());
    for (const [ad, adet] of Object.entries({ hizaliMi: 2, okuma: 1, hizala: 0,
      ciz: 1, girdi: 1, durum: 0, yukle: 1 })) dogrula.equal(w[ad].length, adet);
    dogrula.equal(aciolcerOlustur.length, 2);
    soket.x = 0;
    dogrula.deepEqual(w.merkez, SOKET);
    dogrula.equal(w.donus, 0);
    dogrula.equal(w.olcekYonu, 'ic');
  });
  it('Bin seed aynı sonucu üretir; dönüş, kayma ve merkez dışlaması korunur.', () => {
    const kovalar = Array(12).fill(0);
    const yonler = new Set();
    let xToplam = 0;
    let yToplam = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const ayar = { soket: SOKET };
      const w = aciolcerOlustur(ayar, rngOlustur(seed));
      dogrula.deepEqual(w.durum(), aciolcerOlustur(ayar, rngOlustur(seed)).durum());
      dogrula.ok(Number.isInteger(w.donus) && w.donus >= 0 && w.donus < 360);
      dogrula.ok(Math.abs(w.merkez.x - SOKET.x) <= 240);
      dogrula.ok(Math.abs(w.merkez.y - SOKET.y) <= 240);
      dogrula.ok(geo.uzaklik(w.merkez, SOKET) > geo.TOLERANS.pimYakalamaPx * 1000 / 360);
      kovalar[Math.floor(w.donus / 30)]++;
      yonler.add(w.donus);
      xToplam += w.merkez.x - SOKET.x;
      yToplam += w.merkez.y - SOKET.y;
    }
    dogrula.ok(kovalar.every(n => n >= 55 && n <= 115), String(kovalar));
    dogrula.ok(yonler.size > 320);
    dogrula.ok(Math.abs(xToplam / 1000) < 20 && Math.abs(yToplam / 1000) < 20);
  });
  it('Rastgele ölçek bin seed içinde yaklaşık yarı yarıya seçilir.', () => {
    let ic = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const w = aciolcerOlustur({ olcekYonu: 'rastgele' }, rngOlustur(seed));
      dogrula.ok(['ic', 'dis'].includes(w.olcekYonu));
      if (w.olcekYonu === 'ic') ic++;
    }
    dogrula.ok(ic >= 450 && ic <= 550, String(ic));
    for (const olcekYonu of ['ic', 'dis']) {
      dogrula.equal(aciolcerOlustur({ olcekYonu }, rngOlustur(1)).olcekYonu, olcekYonu);
    }
  });
  it('RNG ve ayar doğrulaması rastgeleliği sessiz bir varsayılanla değiştirmez.', () => {
    dogrula.throws(() => aciolcerOlustur(), { message: RNG_HATASI });
    dogrula.throws(() => aciolcerOlustur({ hizasiz: false }), { message: RNG_HATASI });
    dogrula.throws(() => aciolcerOlustur({ olcekYonu: 'ic' }), { message: RNG_HATASI });
    for (const ayar of [null, [], { hizasiz: 'yes' }, { kilitli: 1 }, { r: 240 },
      { olcekYonu: 'saat' }, { soket: { x: NaN, y: 5 } }, { toleransGoster: 'yes' }]) {
      dogrula.throws(() => aciolcerOlustur(ayar, rngOlustur(1)), AYAR_HATASI);
    }
    dogrula.throws(() => aciolcerOlustur({}, {}), { message: RNG_HATASI });
    dogrula.throws(() => aciolcerOlustur({ soket: { x: NaN, y: 5 } }), AYAR_HATASI);
    const { w } = kur();
    w.donus = -1.2;
    dogrula.equal(w.donus, 359);
    w.donus = 359.6;
    dogrula.equal(w.donus, 0);
    dogrula.throws(() => { w.donus = Infinity; }, AYAR_HATASI);
    dogrula.throws(() => { w.olcekYonu = 'rastgele'; }, AYAR_HATASI);
  });
  it('Hizalı ve sabit ölçekli widget RNG olmadan kurulur, verilen RNG tüketilmez.', () => {
    const rng = { tam: dogrula.fail, bool: dogrula.fail };
    for (const olcekYonu of ['ic', 'dis']) {
      const ayar = { soket: SOKET, hizasiz: false, olcekYonu };
      const w = aciolcerOlustur(ayar);
      dogrula.deepEqual(w.durum(), { merkez: SOKET, donus: 0, olcekYonu });
      dogrula.deepEqual(aciolcerOlustur(ayar, rng).durum(), w.durum());
    }
  });
  it('Hizalı ve rastgele ölçekli widget eksik RNG hatasında araç adını ve gereği belirtir.', () => {
    const ayar = { hizasiz: false, olcekYonu: 'rastgele' };
    for (const rng of [undefined, null, {}, { tam() {} }, { bool() {} },
      { tam: 1, bool() {} }, { tam() {}, bool: false }]) {
      dogrula.throws(() => aciolcerOlustur(ayar, rng), { message: RNG_HATASI });
    }
  });
});

describe('hizaliMi ve hizala', () => {
  it('Merkez ile sıfır çizgisini ayrı raporlar; eşik sınırını yuvarlamaz.', () => {
    const { w, sahne } = kur({}, 2);
    w.ciz(sahne);
    const esik = geo.TOLERANS.pimYakalamaPx * sahne.olcek;
    w.merkez = { x: SOKET.x + esik, y: SOKET.y };
    dogrula.deepEqual(w.hizaliMi(SOKET, geo.TOLERANS.aciOkuma), {
      merkezTamam: true, sifirTamam: true
    });
    dogrula.deepEqual(w.hizaliMi(SOKET, geo.TOLERANS.aciOkuma + 0.01), {
      merkezTamam: true, sifirTamam: false
    });
    w.merkez = { x: SOKET.x + esik + 0.01, y: SOKET.y };
    dogrula.deepEqual(w.hizaliMi(SOKET, 0), { merkezTamam: false, sifirTamam: true });
    dogrula.deepEqual(w.hizaliMi(SOKET, 90), { merkezTamam: false, sifirTamam: false });
    w.donus = 359;
    dogrula.equal(w.hizaliMi(SOKET, 1).sifirTamam, true);
  });

  it('Son hedefe hizalanır, hedef verilmemişse soket ve sıfır yönünü kullanır.', () => {
    const { w } = kur();
    w.merkez = { x: 0, y: 0 };
    w.donus = 220;
    w.hizala();
    dogrula.deepEqual(w.merkez, SOKET);
    dogrula.equal(w.donus, 0);
    const hedef = { x: 250, y: 350 };
    w.hizaliMi(hedef, 247.2);
    w.hizala();
    dogrula.deepEqual(w.hizaliMi(hedef, 247.2), { merkezTamam: true, sifirTamam: true });
    dogrula.deepEqual(w.merkez, hedef);
    dogrula.equal(w.donus, 247);
    hedef.x = 999;
    w.hizala();
    dogrula.equal(w.merkez.x, 250);
  });
});

describe('okuma', () => {
  it('Bin seed ve her iki ölçekte geo ile aynı tam dereceyi verir.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      for (const olcekYonu of ['ic', 'dis']) {
        const rng = rngOlustur(seed);
        const w = aciolcerOlustur({ soket: SOKET, olcekYonu }, rng);
        const kolYon = rng.tam(-720, 720) + 0.4;
        const okuma = w.okuma(kolYon);
        dogrula.deepEqual(okuma, geo.aciOku(w.merkez, w.donus, kolYon, olcekYonu));
        dogrula.equal(okuma.dogru, olcekYonu);
        dogrula.equal(okuma.ic + okuma.dis, 180);
        dogrula.ok(Number.isInteger(okuma.ic) && Number.isInteger(okuma.dis));
      }
    }
  });

  it('Sıfır, dik, doğru ve tam dönüş ile ters yöndeki okumaları korur.', () => {
    for (const olcekYonu of ['ic', 'dis']) {
      const { w } = kur({ olcekYonu });
      w.donus = 337;
      for (const aci of [0, 90, 180, 360, -90, -180, 32.4, -32.6]) {
        const okuma = w.okuma(w.donus + aci);
        dogrula.equal(okuma[olcekYonu], Math.round(geo.aciFark(0, aci)));
        dogrula.equal(okuma.ic + okuma.dis, 180);
      }
    }
  });
});

describe('durum ve yukle', () => {
  it('JSON kaydı örnekler arasında taşınır ve kayda verilen nesneler kopyalanır.', () => {
    const { w } = kur();
    w.merkez = { x: 71, y: 93 };
    w.donus = 123;
    w.olcekYonu = 'dis';
    const kayit = JSON.parse(JSON.stringify(w.durum()));
    const ikinci = kur().w;
    ikinci.yukle(kayit);
    dogrula.deepEqual(ikinci.durum(), w.durum());
    kayit.merkez.x = 900;
    const disari = ikinci.durum();
    disari.merkez.y = 901;
    dogrula.deepEqual(ikinci.merkez, { x: 71, y: 93 });
    dogrula.deepEqual(kur().w.merkez, SOKET);
  });

  it('Geçersiz kayıt atomik reddedilir ve yükleme etkin sürüklemeyi bırakır.', () => {
    const { w, sahne } = kur();
    w.ciz(sahne);
    const once = w.durum();
    for (const kayit of [null, [], {}, { ...once, donus: NaN },
      { ...once, merkez: { x: 0, y: Infinity } }, { ...once, olcekYonu: 'rastgele' }]) {
      dogrula.throws(() => w.yukle(kayit), AYAR_HATASI);
      dogrula.deepEqual(w.durum(), once);
    }
    dogrula.equal(w.girdi(olay('bas', w.merkez)), true);
    w.yukle(once);
    dogrula.equal(w.girdi(olay('surukle', w.merkez, { dx: 5, dy: 5 })), false);
    dogrula.deepEqual(w.durum(), once);
  });
});

describe('ciz', () => {
  it('Çizim farklı ölçeklerde başlangıcı, hizalamayı, sürüklemeyi ve yüklenen kaydı korur.', () => {
    const { sahne } = kur();
    const w = aciolcerOlustur({ soket: SOKET }, rngOlustur(2));
    const islemler = [() => {}, () => { w.hizaliMi(SOKET, 85); w.hizala(); }, () => {
      w.girdi(olay('bas', w.merkez));
      w.girdi(olay('surukle', w.merkez, { dx: 12, dy: -7 }));
      w.girdi(olay('birak', w.merkez));
    }, () => w.yukle({ merkez: { x: 71, y: 93 }, donus: 123, olcekYonu: 'dis' })];
    for (const islem of islemler) {
      islem();
      const once = w.durum();
      for (const olcek of [10, 0.5, 1000 / 360]) {
        sahne.olcek = olcek;
        w.ciz(sahne);
        w.ciz(sahne);
        dogrula.deepEqual(w.durum(), once);
      }
    }
  });

  it('Kilitliyken piksel dönüşümü dahil hiçbir sahne çağrısı ve girdi tüketimi yapmaz.', () => {
    const { w, sahne, kayit } = kur({ kilitli: true });
    w.ciz(sahne);
    dogrula.deepEqual(kayit.cagrilar, []);
    for (const tur of ['bas', 'surukle', 'birak', 'tik', 'tus']) {
      dogrula.equal(w.girdi(olay(tur, w.merkez, { dx: 1, dy: 1 })), false);
    }
    dogrula.equal(kayit.sayac.sayi, 0);
  });

  it('Üst katmanda yarım daire ve merkez pimi çizer; ölçek ölçü sayacını artırmaz.', () => {
    const { w, r, kayit } = cizilmis();
    const katmanlar = kayit.cagrilar.filter(c => c.ad === 'katman');
    dogrula.deepEqual(katmanlar.map(c => c.arg[0]), ['ust']);
    const govde = kayit.cagrilar.find(c => c.ad === 'cokgen');
    dogrula.equal(govde.arg[1].dolgu, true);
    dogrula.deepEqual(govde.arg[0][0], w.merkez);
    const yay = govde.arg[0].slice(1);
    for (const P of yay) yakin(geo.uzaklik(P, w.merkez), r);
    const bas = geo.yonAci(w.merkez, yay[0]);
    const son = geo.yonAci(w.merkez, yay[yay.length - 1]);
    yakin(geo.aciFark(bas, son), 180);
    dogrula.ok(yay.every(P => geo.aciNormalize(geo.yonAci(w.merkez, P) - bas) <= 180));
    dogrula.ok(kayit.cagrilar.some(c => c.ad === 'pim' && c.arg[1].id));
    dogrula.equal(kayit.sayac.sayi, 0);
    dogrula.ok(kayit.sayac.parca >= 38);
    dogrula.ok(kayit.cagrilar.some(c => c.ad === 'cokgen' && c.arg[0].length === 2));
  });

  it('Gerçek motor sahnesinde iki kareyi sayı veya etiket bağımlılığı olmadan çizer.', t => {
    const ortam = motorOrtami(t);
    const mod = { tahta: false, metinOlcek: 1 };
    const veri = { bayraklar: { olcuKilidi: false }, etiketler: {} };
    const gorunum = sahneOlustur(ortam.kok, veri, mod, sunumOlustur(mod));
    t.after(() => gorunum.kaldir());
    const { w } = kur();
    w.donus = 243;
    for (let kare = 0; kare < 2; kare++) {
      gorunum.sahne.temizle();
      w.ciz(gorunum.sahne);
      gorunum.bitir();
    }
    dogrula.ok(ortam.cizimler.some(c => c[0] === 'stroke'));
    dogrula.ok(ortam.cizimler.some(c => c[0] === 'fill'));
    dogrula.ok(ortam.cizimler.every(c => c[0] !== 'fillText'));
    const merkez = gorunum.hedefler.get('aciolcerMerkez');
    dogrula.deepEqual(merkez.nokta, w.merkez);
    dogrula.equal(merkez.katman, 'ust');
    dogrula.equal(merkez.vur(w.merkez, gorunum.sahne.pxToBirim(16)), true);
  });

  it('Her on derecede iki desen kullanır; sıfır, doksan ve yüz seksen kalındır.', () => {
    const { w, r, kayit } = cizilmis();
    const centikler = kayit.cagrilar.filter(c => c.ad === 'parca' &&
      /^aciolcer(Ic|Dis)\d+$/.test(c.arg[2]?.id || ''));
    dogrula.equal(centikler.length, 38);
    for (let aci = 0; aci <= 180; aci += 10) {
      const cift = centikler.filter(c => geo.aciFark(geo.yonAci(w.merkez, c.arg[1]),
        w.donus + aci) < 1e-7);
      dogrula.equal(cift.length, 2);
      dogrula.notEqual(cift[0].arg[2].kesik, cift[1].arg[2].kesik);
      dogrula.notEqual(cift[0].arg[2].renk, cift[1].arg[2].renk);
      for (const { arg: [A, B, secenek] } of cift) {
        yakin(geo.aciFark(geo.yonAci(w.merkez, A), geo.yonAci(w.merkez, B)), 0);
        dogrula.ok(geo.uzaklik(w.merkez, B) <= r + 1e-7);
        dogrula.equal(secenek.kalinlik === 'kalin', aci % 90 === 0);
      }
    }
  });
});

describe('girdi', () => {
  it('Merkez yakalaması farklı ölçeklerde tam on altı pikseli kapsar.', () => {
    for (const olcek of [0.5, 1, 2.5, 1000 / 360]) {
      const { w, sahne } = kur({}, olcek);
      w.ciz(sahne);
      const x = w.merkez.x + geo.TOLERANS.pimYakalamaPx * olcek;
      dogrula.equal(w.girdi(olay('bas', { x, y: w.merkez.y })), true);
      dogrula.equal(w.girdi(olay('birak', w.merkez)), true);
      dogrula.equal(w.girdi(olay('bas', { x: x + 0.01, y: w.merkez.y })), false);
    }
  });

  it('Telefon ölçeğini ve yeniden çizmeden güncellenen piksel dönüşümünü izler.', () => {
    const { w, sahne } = kur({}, 1000 / 360);
    w.ciz(sahne);
    const esik = geo.TOLERANS.pimYakalamaPx * sahne.olcek;
    dogrula.equal(w.girdi(olay('bas', { x: SOKET.x + esik - 0.001, y: SOKET.y })), true);
    w.girdi(olay('birak', w.merkez));
    dogrula.equal(w.girdi(olay('bas', { x: SOKET.x + esik + 0.001, y: SOKET.y })), false);
    sahne.olcek = 0.5;
    dogrula.equal(w.hizaliMi({ x: SOKET.x + 9, y: SOKET.y }, 0).merkezTamam, false);
    dogrula.equal(w.girdi(olay('bas', { x: SOKET.x + 9, y: SOKET.y })), false);
    dogrula.equal(w.girdi(olay('bas', { x: SOKET.x + 8, y: SOKET.y })), true);
  });

  it('Merkez sürüklemesi dx ve dy kullanır; geçersiz farklarda durumunu korur.', () => {
    const { w, sahne } = kur();
    w.ciz(sahne);
    dogrula.equal(w.girdi(olay('bas', { x: SOKET.x + 8, y: SOKET.y })), true);
    const once = w.durum();
    for (const fark of [{}, { dx: NaN, dy: 1 }, { dx: 1, dy: Infinity }, { dx: 1 }]) {
      dogrula.equal(w.girdi(olay('surukle', w.merkez, fark)), false);
      dogrula.deepEqual(w.durum(), once);
    }
    dogrula.equal(w.girdi(olay('surukle', { x: 999, y: 999 }, { dx: 12, dy: -7 })), true);
    dogrula.deepEqual(w.merkez, { x: SOKET.x + 12, y: SOKET.y - 7 });
    dogrula.equal(w.donus, 0);
    dogrula.equal(w.girdi(olay('birak', w.merkez)), true);
    dogrula.equal(w.girdi(olay('surukle', w.merkez, { dx: 10, dy: 10 })), false);
    dogrula.equal(w.girdi(olay('birak', w.merkez)), false);
  });

  it('Kenar tutma yön farkını kullanır; sıfır geçişinde dönüş tam derecedir.', () => {
    const { w, r } = cizilmis();
    w.donus = 300;
    const merkez = w.merkez;
    const bas = geo.ilerle(merkez, 359, r * 0.8);
    const son = geo.ilerle(merkez, 1.4, r * 0.8);
    dogrula.equal(w.girdi(olay('bas', bas)), true);
    dogrula.equal(w.girdi(olay('surukle', son, { dx: 100, dy: -100 })), true);
    dogrula.equal(w.donus, 302);
    dogrula.deepEqual(w.merkez, merkez);
    dogrula.equal(w.girdi(olay('surukle', bas, { dx: 0, dy: 0 })), true);
    dogrula.equal(w.donus, 300);
    dogrula.equal(w.girdi(olay('birak', bas)), true);
  });

  it('Yarım dairenin iki sınırındaki kenar tutuşunu bütün dönüşlerde kabul eder.', () => {
    const { w, r, sahne } = cizilmis();
    const tol = sahne.pxToBirim(geo.TOLERANS.pimYakalamaPx);
    for (let donus = 0; donus < 360; donus++) {
      w.donus = donus;
      for (const kol of [0, 180]) {
        const P = geo.ilerle(w.merkez, donus + kol, r * 0.9);
        dogrula.equal(w.girdi(olay('bas', P)), true, donus + '/' + kol);
        dogrula.equal(w.girdi(olay('birak', P)), true);
        const dis = geo.ilerle(P, donus - 90, tol);
        dogrula.equal(w.girdi(olay('bas', dis)), true, donus + '/' + kol + '/tol');
        dogrula.equal(w.girdi(olay('birak', dis)), true);
        const uzak = geo.ilerle(P, donus - 90, tol + 0.01);
        dogrula.equal(w.girdi(olay('bas', uzak)), false);
      }
    }
  });

  it('Boş gövdeyi, yarım daire dışını ve tutulmamış olayları tüketmez.', () => {
    const { w, r } = cizilmis();
    const once = w.durum();
    for (const [yon, carpan] of [[90, 0.5], [90, 1.2], [270, 0.9]]) {
      dogrula.equal(w.girdi(olay('bas', geo.ilerle(w.merkez, yon, r * carpan))), false);
    }
    for (const tur of ['surukle', 'birak', 'tik', 'dugme', 'tus']) {
      dogrula.equal(w.girdi(olay(tur, w.merkez, { dx: 9, dy: 7 })), false);
    }
    dogrula.equal(w.girdi(null), false);
    dogrula.deepEqual(w.durum(), once);
  });
});
