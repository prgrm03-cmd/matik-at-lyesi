import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { gonyeOlustur } from '../widget/gonye.js';
import { rngOlustur } from '../motor/rng.js';
import * as geo from '../geo/index.js';

const DOGRU = Object.freeze({ A: Object.freeze({ x: 200, y: 200 }), yon: 0 });
const ORTAM = Object.freeze({ pxToBirim: px => px });
const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;

function sahneHazirla() {
  const cagrilar = [];
  const sahne = {};
  for (const ad of ['katman', 'cokgen', 'parca', 'pim']) {
    sahne[ad] = (...arg) => cagrilar.push({ ad, arg });
  }
  return { sahne, cagrilar };
}

function durumuKur(gonye, merkez, donus, t = 0) {
  gonye.yukle({ merkez, donus, t, oturdu: false });
}

describe('gonyeOlustur', () => {
  it('İki parametre alır ve oturma bilgisini düz alan olarak sunar.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    dogrula.equal(gonyeOlustur.length, 2);
    dogrula.deepEqual(gonye.durum(), {
      merkez: { x: 500, y: 500 }, donus: 0, oturdu: false, t: 0
    });
    dogrula.equal(Object.getOwnPropertyDescriptor(gonye, 'oturdu').get, undefined);
    dogrula.equal(typeof gonye.oturdu, 'boolean');
  });

  it('Eksik doğruyu ve piksel dönüşümünü kurulumda reddeder.', () => {
    for (const ayar of [undefined, null, [], {}, { dogru: {} },
      { dogru: { A: DOGRU.A, yon: NaN } }, { dogru: DOGRU, kilitli: 'evet' },
      { dogru: DOGRU, merkez: DOGRU.A }]) {
      dogrula.throws(() => gonyeOlustur(ayar, ORTAM), AYAR_HATASI);
    }
    for (const ortam of [undefined, null, {}, { pxToBirim: 1 },
      { pxToBirim: () => NaN }, { pxToBirim: () => -1 }]) {
      dogrula.throws(() => gonyeOlustur({ dogru: DOGRU }, ortam), AYAR_HATASI);
    }
  });
});

describe('otur', () => {
  it('Bin tohumda en yakın ayağa oturur ve doğruya dik parça bırakır.', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = rngOlustur(seed);
      const dogru = { A: { x: rng.tam(50, 950), y: rng.tam(50, 950) },
        yon: geo.rastgeleYon(rng) };
      const gonye = gonyeOlustur({ dogru }, ORTAM);
      const ayak = geo.dikme(dogru, gonye.durum().merkez).ayak;
      gonye.otur();
      dogrula.equal(gonye.oturdu, true);
      dogrula.deepEqual(gonye.durum().merkez, ayak);
      dogrula.equal(gonye.durum().donus, dogru.yon);
      const P = geo.ilerle(dogru.A, dogru.yon + 90, rng.tam(50, 300));
      const parca = gonye.dikmeBirak(P);
      dogrula.ok(geo.dogruUzerindeMi(parca.B, dogru, 1e-6));
      dogrula.ok(geo.dikMi(geo.yonAci(parca.A, parca.B), dogru.yon, geo.TOLERANS.dikme));
      dogrula.deepEqual(parca.A, P);
    }
  });

  it('İmzalı konumu yön boyunca hesaplar ve oturmayınca son konumu korur.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    for (const [x, t] of [[350, 150], [100, -100]]) {
      durumuKur(gonye, { x, y: 500 }, 70);
      gonye.otur();
      dogrula.equal(gonye.t, t);
      dogrula.deepEqual(gonye.durum().merkez, { x, y: DOGRU.A.y });
    }
    gonye.girdi({ tur: 'surukle', hedef: 'gonye', dx: 120, dy: 100 });
    dogrula.equal(gonye.oturdu, false);
    dogrula.equal(gonye.t, -100);
  });
});

describe('dikmeBirak', () => {
  it('Oturmamışken boş döner ve oturunca bağımsız parça üretir.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    const P = { x: 125, y: 420 };
    dogrula.equal(gonye.dikmeBirak(P), null);
    gonye.otur();
    const once = gonye.durum();
    const parca = gonye.dikmeBirak(P);
    dogrula.deepEqual(parca, { A: P, B: { x: P.x, y: DOGRU.A.y } });
    parca.A.x = 0;
    parca.B.y = 0;
    dogrula.equal(P.x, 125);
    dogrula.deepEqual(gonye.durum(), once);
    dogrula.equal(gonye.dikmeBirak(P).B.y, DOGRU.A.y);
  });
});

describe('girdi', () => {
  it('Gövdeyi fark kadar sürükler ve bırakınca oturma bilgisini günceller.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    dogrula.equal(gonye.girdi({ tur: 'bas', hedef: 'gonye', x: 500, y: 500 }), true);
    dogrula.equal(gonye.girdi({ tur: 'surukle', dx: -150, dy: -300 }), true);
    dogrula.equal(gonye.oturdu, true);
    dogrula.equal(gonye.t, 150);
    dogrula.equal(gonye.girdi({ tur: 'birak' }), true);
    dogrula.deepEqual(gonye.durum().merkez, { x: 350, y: 200 });
    dogrula.equal(gonye.girdi({ tur: 'surukle', dx: 1, dy: 2 }), false);
    dogrula.equal(gonye.girdi({ tur: 'bas', x: 350, y: 200 }), false);
    dogrula.equal(gonye.girdi({ tur: 'bas', hedef: 'baska' }), false);
    dogrula.equal(gonye.girdi({ tur: 'tik', hedef: 'gonye' }), false);
  });

  it('Köşeyi başlangıç farkını koruyarak döndürür ve kesirleri yuvarlamaz.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    gonye.otur();
    const merkez = gonye.durum().merkez;
    const bas = geo.ilerle(merkez, 15, 20);
    const bit = geo.ilerle(merkez, 35.25, 20);
    dogrula.equal(gonye.girdi({ tur: 'bas', hedef: 'gonyeKose', ...bas }), true);
    dogrula.equal(gonye.girdi({ tur: 'surukle', ...bit }), true);
    dogrula.ok(Math.abs(gonye.durum().donus - 20.25) < 1e-10);
    dogrula.equal(gonye.oturdu, false);
    dogrula.equal(gonye.girdi({ tur: 'birak', ...bit }), true);
    dogrula.equal(gonye.girdi({ tur: 'surukle', ...bas }), false);
  });

  it('Tam köşeden başlayan dönüşte sıfır uzunluklu yön hesaplamaz.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    const merkez = gonye.durum().merkez;
    dogrula.equal(gonye.girdi({ tur: 'bas', hedef: 'gonyeKose', ...merkez }), true);
    dogrula.equal(gonye.girdi({ tur: 'surukle', ...merkez }), true);
    dogrula.equal(gonye.durum().donus, 0);
    const P = geo.ilerle(merkez, 90, 20);
    gonye.girdi({ tur: 'surukle', ...P });
    dogrula.equal(gonye.durum().donus, 90);
  });

  it('Açı ve güncel piksel ölçeği sınırlarını birlikte uygular.', () => {
    let olcek = 2;
    const gonye = gonyeOlustur({ dogru: DOGRU }, { pxToBirim: px => px * olcek });
    const uzaklik = geo.TOLERANS.pimYakalamaPx * olcek;
    durumuKur(gonye, { x: 400, y: DOGRU.A.y + uzaklik }, geo.TOLERANS.dikme);
    dogrula.equal(gonye.oturdu, true);
    durumuKur(gonye, { x: 400, y: DOGRU.A.y }, geo.TOLERANS.dikme + 1);
    dogrula.equal(gonye.oturdu, false);
    durumuKur(gonye, { x: 400, y: DOGRU.A.y + uzaklik }, 180);
    dogrula.equal(gonye.oturdu, true);
    olcek = 1;
    gonye.girdi({ tur: 'birak', hedef: 'gonye' });
    dogrula.equal(gonye.oturdu, false);
    dogrula.equal(gonye.t, 200);
  });
});

describe('ciz', () => {
  it('Üçgeni ve kareyi çizer, oturmayı tek veya çift çentikle ayırır.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    for (const oturdu of [false, true]) {
      if (oturdu) gonye.otur();
      const once = gonye.durum();
      const { sahne, cagrilar } = sahneHazirla();
      gonye.ciz(sahne);
      dogrula.deepEqual(cagrilar[0], { ad: 'katman', arg: ['ust'] });
      const govde = cagrilar.find(cagri => cagri.ad === 'cokgen');
      const [O, A, B] = govde.arg[0];
      dogrula.equal(govde.arg[0].length, 3);
      dogrula.deepEqual(govde.arg[1], { id: 'gonye', renk: 'gri' });
      dogrula.equal(geo.uzaklik(O, A), 220);
      dogrula.ok(geo.dikMi(geo.yonAci(O, A), geo.yonAci(O, B), geo.TOLERANS.dikme));
      const parcalar = cagrilar.filter(cagri => cagri.ad === 'parca');
      dogrula.equal(parcalar.length, oturdu ? 5 : 4);
      dogrula.equal(parcalar[0].arg[2].renk, oturdu ? 'yesil' : 'turuncu');
      dogrula.deepEqual(cagrilar.find(cagri => cagri.ad === 'pim').arg[1],
        { id: 'gonyeKose', boyut: 'kucuk' });
      dogrula.deepEqual(gonye.durum(), once);
    }
  });

  it('Kilitli gönye çizmez ve hiçbir giriş olayını tüketmez.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU, kilitli: true }, ORTAM);
    const { sahne, cagrilar } = sahneHazirla();
    const once = gonye.durum();
    gonye.ciz(sahne);
    for (const tur of ['bas', 'surukle', 'birak', 'tik']) {
      dogrula.equal(gonye.girdi({ tur, hedef: 'gonye', dx: 10, dy: 20 }), false);
    }
    dogrula.deepEqual(cagrilar, []);
    dogrula.deepEqual(gonye.durum(), once);
  });
});

describe('durum', () => {
  it('Durumu bağımsız nesnelerle geri yükler ve oturmayı yeniden hesaplar.', () => {
    const ilk = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    const ikinci = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    for (const oturdu of [false, true]) {
      if (oturdu) ilk.otur();
      const kayit = JSON.parse(JSON.stringify(ilk.durum()));
      ikinci.yukle(kayit);
      dogrula.deepEqual(ikinci.durum(), ilk.durum());
      kayit.merkez.x = 0;
      dogrula.notEqual(ikinci.durum().merkez.x, 0);
    }
    ikinci.yukle({ ...ilk.durum(), donus: geo.TOLERANS.dikme + 1, oturdu: true });
    dogrula.equal(ikinci.oturdu, false);
    const kopya = ikinci.durum();
    kopya.merkez.x = 0;
    dogrula.notEqual(ikinci.durum().merkez.x, 0);
  });

  it('Bozuk durum yüklemesini mevcut durumu değiştirmeden reddeder.', () => {
    const gonye = gonyeOlustur({ dogru: DOGRU }, ORTAM);
    const once = gonye.durum();
    for (const kayit of [null, {}, { ...once, donus: Infinity },
      { ...once, merkez: { x: 1, y: NaN } }, { ...once, t: NaN },
      { ...once, oturdu: 'evet' }]) {
      dogrula.throws(() => gonye.yukle(kayit), AYAR_HATASI);
      dogrula.deepEqual(gonye.durum(), once);
    }
  });
});
