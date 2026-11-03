import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { aciTablosuOlustur } from '../widget/aciTablosu.js';
import { ctxSahteOlustur, sahneKaydi } from '../motor/ctxSahte.js';
import { hizmetleriOlustur, girdiDagit } from '../motor/baglam.js';
import { rngOlustur } from '../motor/rng.js';
import { TOLERANS } from '../geo/index.js';

const AYAR_HATASI = { message: 'WIDGET_AYAR_GECERSIZ' };
const ARALIK_HATASI = { message: 'PARAMETRE_ARALIK_DISI' };
const SUTUNLAR = ['ad', 'tur', 'olcu', 'iliski'];
const ILISKILER = ['ters', 'komsuButunler', 'komsuTumler'];
const VARSAYILAN = { x: 620, y: 40, genislik: 360 };

function baglam(olcuKilidi = false, tahta = false) {
  const veri = { id: 'D11', bayraklar: { olcuKilidi }, matik: {}, nedenler: {},
    etiketler: Object.fromEntries(ILISKILER.map(ad => ['iliski:' + ad, ad])) };
  return ctxSahteOlustur('D11', veri, 1, { tahta });
}

function kur(ayar = { satir: 2, sutunlar: SUTUNLAR, iliskiSecenek: ILISKILER }, konum) {
  const ctx = baglam();
  const w = aciTablosuOlustur(ayar, konum);
  return { w, ctx, sahne: ctx.sahne, kayit: sahneKaydi(ctx), ayar };
}

function hucre(ortam, i, sutun = 0) {
  const bas = ortam.kayit.cagrilar.length;
  ortam.w.ciz(ortam.sahne);
  const satir = ortam.w.satirlar[i];
  const id = 'tablo:' + (satir.bolum === undefined ? '' : satir.bolum + ':') + i;
  const cagri = ortam.kayit.cagrilar.slice(bas)
    .find(c => c.ad === 'cokgen' && c.arg[1]?.id === id);
  dogrula.ok(cagri, id);
  const xs = cagri.arg[0].map(P => P.x);
  const ys = cagri.arg[0].map(P => P.y);
  return { x: Math.min(...xs) + (sutun + 0.5) *
    (Math.max(...xs) - Math.min(...xs)) / ortam.ayar.sutunlar.length,
  y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

function birak(w, hedef, P) {
  dogrula.equal(w.girdi({ tur: 'bas', hedef, x: 10, y: 10 }), true);
  dogrula.equal(w.girdi({ tur: 'surukle', ...P }), true);
  dogrula.equal(w.girdi({ tur: 'birak', ...P }), true);
}

function motorKur(kilitli = false, tahta = false) {
  const ctx = baglam(kilitli, tahta);
  const bos = () => {};
  const arayuz = { soyle: bos, ifade: bos, kivilcim: bos, sembol: bos,
    defterAc: bos, defterKapat: bos };
  const hizmetler = hizmetleriOlustur(ctx, arayuz, { ses: false });
  return { ctx, hizmetler };
}

describe('aciTablosuOlustur', () => {
  it('İki parametreyi ve yalnız sözleşmedeki üyeleri sunar.', () => {
    const { w } = kur();
    dogrula.equal(aciTablosuOlustur.length, 2);
    dogrula.deepEqual(Object.keys(w).sort(), ['satirlar', 'doluMu', 'karsilastir',
      'ayniKartaKoy', 'otomatikDoldur', 'ciz', 'girdi', 'durum', 'yukle'].sort());
    for (const [ad, n] of Object.entries({ doluMu: 0, karsilastir: 2, ayniKartaKoy: 2,
      otomatikDoldur: 2, ciz: 1, girdi: 1, durum: 0, yukle: 1 })) {
      dogrula.equal(w[ad].length, n);
    }
    dogrula.deepEqual(w.durum().konum, VARSAYILAN);
  });

  it('Eksik, sınır dışı ve sözleşmede olmayan ayarları reddeder.', () => {
    const temel = { satir: 1, sutunlar: ['ad'] };
    const ayarlar = [undefined, null, [], {}, { ...temel, satir: 0 },
      { ...temel, satir: -1 }, { ...temel, satir: 1.5 }, { ...temel, satir: NaN },
      { ...temel, satir: Infinity }, { ...temel, sutunlar: [] },
      { ...temel, sutunlar: ['toplam'] }, { ...temel, sutunlar: ['iliski'] },
      { ...temel, iliskiSecenek: ['yondes'] }, { ...temel, fazladan: true }];
    for (const ayar of ayarlar) dogrula.throws(() => aciTablosuOlustur(ayar), AYAR_HATASI);
    for (const konum of [null, {}, { x: 0, y: NaN, genislik: 1 },
      { x: 0, y: 0, genislik: 0 }]) {
      dogrula.throws(() => aciTablosuOlustur(temel, konum), AYAR_HATASI);
    }
  });

  it('Satır sayısını korur ve bölümleri özet satırı eklemeden çoğaltır.', () => {
    for (const satir of [1, 3, 8]) {
      const w = kur({ satir, sutunlar: ['ad'] }).w;
      dogrula.equal(w.satirlar.length, satir);
      dogrula.ok(w.satirlar.every(s => !Object.hasOwn(s, 'bolum')));
      const bolumlu = kur({ satir, sutunlar: ['ad'], bolumler: ['A', 'B'] }).w;
      dogrula.equal(bolumlu.satirlar.length, satir * 2);
      dogrula.deepEqual(bolumlu.satirlar.map(s => s.bolum),
        [...Array(satir).fill('A'), ...Array(satir).fill('B')]);
    }
  });

  it('Yalnız etkin hücreleri sayar ve sıfır ölçüsünü dolu kabul eder.', () => {
    const { w } = kur({ satir: 1, sutunlar: ['olcu'] });
    dogrula.equal(w.doluMu(), false);
    w.otomatikDoldur(0, { ad: 'A', tur: 'dar', olcu: 0, iliski: 'ters' });
    dogrula.deepEqual(w.satirlar[0], { ad: null, tur: null, olcu: 0, iliski: null });
    dogrula.equal(w.doluMu(), true);
  });

  it('Adı satıra bırakır ve dolu adı sonraki bırakmayla değiştirir.', () => {
    const ortam = kur();
    const P = hucre(ortam, 1);
    birak(ortam.w, 'aci:A', P);
    birak(ortam.w, 'aci:ABC', P);
    dogrula.equal(ortam.w.satirlar[1].ad, 'ABC');
    dogrula.equal(ortam.w.satirlar[0].ad, null);
    dogrula.equal(ortam.w.girdi({ tur: 'birak', ...P }), false);
  });

  it('Tablonun dışına bırakılan ad hiçbir hücreye yazılmaz.', () => {
    const { w } = kur();
    birak(w, 'aci:A', { x: -100, y: -100 });
    dogrula.ok(w.satirlar.every(s => s.ad === null));
    dogrula.equal(w.girdi({ tur: 'surukle', x: 700, y: 80 }), false);
  });

  it('Okuma bırakılırken yuvarlanır ve sonraki karşılaştırma bu değeri kullanır.', () => {
    const ortam = kur({ satir: 1, sutunlar: ['olcu'] });
    birak(ortam.w, 'okuma:44.6', hucre(ortam, 0));
    dogrula.equal(ortam.w.satirlar[0].olcu, 45);
    dogrula.deepEqual(ortam.w.karsilastir([{ ad: 'A', olcu: 48 }], TOLERANS.aciOkuma),
      { dogru: 1, yanlis: [] });
  });

  it('Etkin olmayan hücrelerin sürükleme hedeflerini ve yabancı olayları tüketmez.', () => {
    const ortam = kur({ satir: 1, sutunlar: ['tur'] });
    const P = hucre(ortam, 0);
    for (const hedef of ['aci:A', 'okuma:45', 'pim:A', 'okuma:NaN', 'aci:']) {
      dogrula.equal(ortam.w.girdi({ tur: 'bas', hedef, ...P }), false);
    }
    for (const tur of ['tus', 'dugme', 'bilinmeyen']) {
      dogrula.equal(ortam.w.girdi({ tur, ...P }), false);
    }
    dogrula.equal(ortam.w.girdi(null), false);
  });

  it('Tür hücresi yalnız dar, dik, geniş ve doğru açı döngüsünü izler.', () => {
    const ortam = kur();
    const P = hucre(ortam, 0, 1);
    for (const tur of ['dar', 'dik', 'genis', 'dogru', null, 'dar']) {
      dogrula.equal(ortam.w.girdi({ tur: 'tik', ...P }), true);
      dogrula.equal(ortam.w.satirlar[0].tur, tur);
    }
    dogrula.equal(ortam.w.girdi({ tur: 'tik', ...hucre(ortam, 0, 0) }), false);
    dogrula.equal(ortam.w.girdi({ tur: 'tik', x: -1, y: -1 }), false);
  });

  it('İlişki hücresi verilen seçenek sırasını izler ve yeniden boşalır.', () => {
    const iliskiSecenek = ['komsuTumler', 'ters'];
    const ortam = kur({ satir: 1, sutunlar: ['iliski'], iliskiSecenek });
    const P = hucre(ortam, 0);
    for (const iliski of [...iliskiSecenek, null]) {
      dogrula.equal(ortam.w.girdi({ tur: 'tik', ...P }), true);
      dogrula.equal(ortam.w.satirlar[0].iliski, iliski);
    }
  });

  it('Sürüklenen adı ölçeğe göre yirmi dört piksel yukarı hayalet olarak çizer.', () => {
    const { w, sahne, kayit } = kur();
    sahne.olcek = 2;
    w.girdi({ tur: 'bas', hedef: 'aci:ABC', x: 10, y: 20 });
    const once = w.durum();
    w.girdi({ tur: 'surukle', x: 400, y: 300 });
    dogrula.deepEqual(w.durum(), once);
    w.ciz(sahne);
    dogrula.equal(kayit.sayac.hayalet, 1);
    const ad = kayit.cagrilar.find(c => c.ad === 'sayi' && c.arg[1] === 'ABC');
    dogrula.deepEqual(ad.arg, [{ x: 400, y: 252 }, 'ABC']);
    dogrula.ok(kayit.cagrilar.some(c => c.ad === 'pxToBirim' && c.arg[0] === 24));
  });

  it('Tolerans sınırını kabul eder ve sınırın bir derece dışını reddeder.', () => {
    const { w } = kur({ satir: 2, sutunlar: ['ad', 'olcu'] });
    w.otomatikDoldur(0, { ad: 'A', olcu: 60 + TOLERANS.aciOkuma });
    w.otomatikDoldur(1, { ad: 'B', olcu: 60 + TOLERANS.aciOkuma + 1 });
    const once = JSON.stringify(w.durum());
    dogrula.deepEqual(w.karsilastir([{ ad: 'B', olcu: 60 }, { ad: 'A', olcu: 60 }],
      TOLERANS.aciOkuma), { dogru: 1, yanlis: [1] });
    dogrula.equal(JSON.stringify(w.durum()), once);
  });

  it('Ham ölçüleri karşılaştırırken yuvarlamaz ve açı farkını dairesel hesaplar.', () => {
    const { w } = kur({ satir: 2, sutunlar: ['ad', 'olcu'] });
    w.otomatikDoldur(0, { ad: 'A', olcu: 44.6 });
    w.otomatikDoldur(1, { ad: 'B', olcu: 359 });
    dogrula.deepEqual(w.karsilastir([{ ad: 'A', olcu: 48 }, { ad: 'B', olcu: 1 }],
      TOLERANS.aciOkuma), { dogru: 1, yanlis: [0] });
  });

  it('Türü toleransla sınıflandırır, ilişkiyi eşler ve eksik satırı yanlış sayar.', () => {
    const { w } = kur({ satir: 3, sutunlar: SUTUNLAR, iliskiSecenek: ILISKILER });
    w.otomatikDoldur(0, { ad: 'A', tur: 'dik', olcu: 92, iliski: 'ters' });
    w.otomatikDoldur(1, { ad: 'B', tur: 'dar', olcu: 40, iliski: 'ters' });
    dogrula.deepEqual(w.karsilastir([{ ad: 'A', olcu: 92, iliski: 'ters' },
      { ad: 'B', olcu: 40, iliski: 'komsuTumler' }], TOLERANS.aciOkuma),
    { dogru: 1, yanlis: [1, 2] });
  });

  it('Aynı adı ikinci kez eşleştirmez ve her gerçek öğeyi bir kez kullanır.', () => {
    const { w } = kur({ satir: 3, sutunlar: ['ad'] });
    w.otomatikDoldur(0, { ad: 'A' });
    w.otomatikDoldur(1, { ad: 'A' });
    w.otomatikDoldur(2, { ad: 'B' });
    dogrula.deepEqual(w.karsilastir([{ ad: 'A', olcu: 45 }], TOLERANS.aciOkuma),
      { dogru: 1, yanlis: [1, 2] });
    const adsiz = kur({ satir: 2, sutunlar: ['olcu'] }).w;
    adsiz.otomatikDoldur(0, { olcu: 45 });
    adsiz.otomatikDoldur(1, { olcu: 45 });
    dogrula.deepEqual(adsiz.karsilastir([{ ad: 'A', olcu: 45 }], TOLERANS.aciOkuma),
      { dogru: 1, yanlis: [1] });
  });

  it('Bin seed boyunca bölüm çiftlerini aynı karta koymaz ve satırları değiştirmez.', () => {
    const { w } = kur({ satir: 3, sutunlar: ['ad'], bolumler: ['A', 'B'] });
    w.otomatikDoldur(0, { ad: 'ABC' });
    const once = JSON.stringify(w.durum());
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = rngOlustur(seed);
      dogrula.equal(w.ayniKartaKoy(rng.tam(0, 1), rng.tam(0, 1)), false);
      dogrula.equal(JSON.stringify(w.durum()), once);
    }
  });

  it('Otomatik doldurma yalnız seçilen satırın boş hücrelerini doldurur.', () => {
    const { w } = kur();
    w.otomatikDoldur(0, { ad: 'A', olcu: 0 });
    w.otomatikDoldur(0, { ad: 'B', tur: 'dar', olcu: 45 });
    dogrula.deepEqual(w.satirlar[0], { ad: 'A', tur: 'dar', olcu: 0, iliski: null });
    dogrula.deepEqual(w.satirlar[1], { ad: null, tur: null, olcu: null, iliski: null });
    for (const i of [-1, 2, 0.5, NaN]) {
      dogrula.throws(() => w.otomatikDoldur(i, { ad: 'C' }), ARALIK_HATASI);
    }
  });

  it('Durum kopyalarını bağımsız tutar ve kaydı başka örneğe eksiksiz yükler.', () => {
    const ortam = kur(undefined, { x: 200, y: 100, genislik: 480 });
    ortam.w.otomatikDoldur(0, { ad: 'A', olcu: 45 });
    const kayit = JSON.parse(JSON.stringify(ortam.w.durum()));
    const ikinci = kur().w;
    ikinci.yukle(kayit);
    dogrula.deepEqual(ikinci.durum(), ortam.w.durum());
    kayit.konum.x = 999;
    kayit.satirlar[0].ad = 'B';
    const kopya = ikinci.durum();
    kopya.satirlar[0].olcu = 180;
    dogrula.deepEqual(ikinci.durum(), ortam.w.durum());
  });

  it('Bozuk kaydı kısmen yüklemez ve devre dışı hücreye değer kabul etmez.', () => {
    const { w } = kur({ satir: 1, sutunlar: ['ad'], bolumler: ['A', 'B'] });
    w.otomatikDoldur(0, { ad: 'ABC' });
    const once = w.durum();
    const bozuklar = [null, {}, { ...once, satirlar: [] },
      { ...once, konum: { x: 0, y: 0, genislik: -1 } }];
    for (const alan of ['bolum', 'olcu']) {
      const kayit = JSON.parse(JSON.stringify(once));
      kayit.satirlar[1][alan] = alan === 'bolum' ? 'C' : 45;
      bozuklar.push(kayit);
    }
    for (const kayit of bozuklar) {
      dogrula.throws(() => w.yukle(kayit), AYAR_HATASI);
      dogrula.deepEqual(w.durum(), once);
    }
  });

  it('Yükleme sürükleme ara durumunu temizler.', () => {
    const ortam = kur();
    const kayit = ortam.w.durum();
    ortam.w.girdi({ tur: 'bas', hedef: 'aci:A', x: 0, y: 0 });
    ortam.w.yukle(kayit);
    dogrula.equal(ortam.w.girdi({ tur: 'birak', ...hucre(ortam, 0) }), false);
    dogrula.deepEqual(ortam.w.durum(), kayit);
  });

  it('Çizim durumu değiştirmez ve yalnız dolu ad ile ölçüleri sayı çağrısına verir.', () => {
    const { w, sahne, kayit } = kur();
    w.otomatikDoldur(0, { ad: 'ABC', tur: 'dar', olcu: 45, iliski: 'ters' });
    w.otomatikDoldur(1, { ad: 'B', tur: 'dik', olcu: 0 });
    const once = JSON.stringify(w.durum());
    w.ciz(sahne);
    dogrula.equal(JSON.stringify(w.durum()), once);
    dogrula.equal(kayit.sayac.sayi, 4);
    dogrula.deepEqual(kayit.cagrilar[0], { ad: 'katman', arg: ['ust'] });
    dogrula.deepEqual(kayit.cagrilar.filter(c => c.ad === 'etiket').map(c => c.arg[1]),
      ['iliski:ters']);
    const satirlar = kayit.cagrilar.filter(c => c.ad === 'cokgen' &&
      /^tablo:\d+$/.test(c.arg[1]?.id));
    dogrula.deepEqual(satirlar.map(c => c.arg[1].renk), ['mavi', 'gri']);
  });

  it('Bölümlü satırların kimlikleri tekildir ve bir karede yinelenmez.', () => {
    const { w, sahne, kayit } = kur({ satir: 2, sutunlar: ['ad'], bolumler: ['A', 'B'] });
    w.ciz(sahne);
    const ids = kayit.cagrilar.flatMap(c => c.arg.filter(a => a?.id).map(a => a.id));
    dogrula.ok(ids.every(id => id.startsWith('tablo:')));
    dogrula.equal(new Set(ids).size, ids.length);
    for (const id of ['tablo:A:0', 'tablo:A:1', 'tablo:B:2', 'tablo:B:3']) {
      dogrula.ok(ids.includes(id));
    }
  });

  it('Türleri farklı desenlerle gösterir ve dolu çizim kimliklerini yinelemez.', () => {
    const { w, sahne, kayit } = kur({ satir: 4, sutunlar: ['tur'] });
    ['dar', 'dik', 'genis', 'dogru'].forEach((tur, i) => w.otomatikDoldur(i, { tur }));
    w.ciz(sahne);
    const yaylar = kayit.cagrilar.filter(c => c.ad === 'aciYayi');
    dogrula.equal(yaylar.length, 2);
    dogrula.ok(yaylar[0].arg[2] - yaylar[0].arg[1] < 90);
    dogrula.ok(yaylar[1].arg[2] - yaylar[1].arg[1] > 90);
    const cizgiler = kayit.cagrilar.filter(c => c.ad === 'cokgen' && c.arg[0].length === 2);
    dogrula.ok(cizgiler.some(c => c.arg[0][0].x === c.arg[0][1].x));
    dogrula.ok(cizgiler.some(c => c.arg[0][0].y === c.arg[0][1].y));
    const ids = kayit.cagrilar.flatMap(c => c.arg.filter(a => a?.id).map(a => a.id));
    dogrula.ok(ids.every(id => id.startsWith('tablo:')));
    dogrula.equal(new Set(ids).size, ids.length);
    dogrula.equal(kayit.sayac.sayi, 0);
  });

  it('Sahte bağlam gerçek tablo kurar ve tahta modunda da iç varsayılan konumu kullanır.', () => {
    for (const tahta of [false, true]) {
      const ctx = baglam(false, tahta);
      const w = ctx.widget.aciTablosu({ satir: 1, sutunlar: ['ad', 'olcu'] });
      dogrula.deepEqual(w.durum().konum, VARSAYILAN);
      w.otomatikDoldur(0, { ad: 'A', olcu: 45 });
      w.ciz(ctx.sahne);
      dogrula.equal(sahneKaydi(ctx).sayac.sayi, 2);
    }
  });

  it('Motor ve sahte bağlam ölçü kilidinde ölçü sütununu reddeder.', () => {
    for (const ctx of [baglam(true), motorKur(true).ctx]) {
      dogrula.throws(() => ctx.widget.aciTablosu({ satir: 1, sutunlar: ['olcu'] }),
        AYAR_HATASI);
      dogrula.equal(ctx.widget.aciTablosu({ satir: 1, sutunlar: ['tur'] }).doluMu(), false);
    }
  });

  it('Motor tabloyu kaydeder ve tüketilen olayı düzeneğe göndermez.', () => {
    const { ctx, hizmetler } = motorKur();
    const w = ctx.widget.aciTablosu({ satir: 1, sutunlar: ['ad'] });
    dogrula.ok(hizmetler.widgetler.includes(w));
    dogrula.equal(girdiDagit(ctx, { girdi: dogrula.fail },
      { tur: 'bas', hedef: 'aci:A', x: 10, y: 10 }, hizmetler), true);
    dogrula.ok(w.durum().konum.x > ctx.sahne.genislik / 2);
    dogrula.ok(w.durum().konum.x + w.durum().konum.genislik <= ctx.sahne.genislik);
  });

  it('Motor telefon ve tahta için sağ tarafta ayrı konumlar verir.', () => {
    const ayar = { satir: 1, sutunlar: ['ad'] };
    const telefon = motorKur(false, false).ctx.widget.aciTablosu(ayar).durum().konum;
    const tahta = motorKur(false, true).ctx.widget.aciTablosu(ayar).durum().konum;
    dogrula.deepEqual(telefon, VARSAYILAN);
    dogrula.notDeepEqual(tahta, telefon);
    dogrula.ok(tahta.x > 500 && tahta.x + tahta.genislik <= 1000 && tahta.y >= 0);
  });

  it('Sekiz bölümlü satır tezgâha sığar ve son satır doldurulabilir.', () => {
    const ortam = kur({ satir: 4, sutunlar: ['ad', 'tur'], bolumler: ['A', 'B'] });
    const P = hucre(ortam, 7);
    const satirlar = ortam.kayit.cagrilar.filter(c => c.ad === 'cokgen' &&
      /^tablo:[AB]:\d+$/.test(c.arg[1]?.id));
    dogrula.equal(satirlar.length, 8);
    dogrula.ok(satirlar.every(c => c.arg[0].every(Q => Q.y >= 0 && Q.y <= 1000)));
    birak(ortam.w, 'aci:ABC', P);
    dogrula.equal(ortam.w.girdi({ tur: 'tik', ...hucre(ortam, 7, 1) }), true);
    dogrula.equal(ortam.w.satirlar[7].ad, 'ABC');
    dogrula.equal(ortam.w.satirlar[7].tur, 'dar');
    dogrula.ok(ortam.w.satirlar.slice(0, 7).every(s => s.ad === null && s.tur === null));
  });

  it('Boş yuvalı ayar dizilerini ve eksik satırlı kayıtları reddeder.', () => {
    const temel = { satir: 2, sutunlar: ['ad'] };
    for (const alan of ['sutunlar', 'bolumler', 'iliskiSecenek']) {
      dogrula.throws(() => aciTablosuOlustur({ ...temel, [alan]: Array(1) }), AYAR_HATASI);
    }
    const { w } = kur(temel);
    const once = w.durum();
    dogrula.throws(() => w.yukle({ ...once, satirlar: Array(2) }), AYAR_HATASI);
    dogrula.deepEqual(w.durum(), once);
  });

  it('Bölüm adındaki iki nokta hücre ayrımı kimliğiyle çakışmaz.', () => {
    const { w, sahne, kayit } = kur({ satir: 1, sutunlar: ['ad', 'tur'],
      bolumler: ['A', 'A:0:ayrim'] });
    w.ciz(sahne);
    const ids = kayit.cagrilar.flatMap(c => c.arg.filter(a => a?.id).map(a => a.id));
    dogrula.equal(new Set(ids).size, ids.length);
    dogrula.ok(ids.includes('tablo:A:0:ayrim:1'));
  });
});
