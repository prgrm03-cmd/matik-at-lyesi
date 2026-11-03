import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { sinaOlustur } from '../defter/sinama.js';
import { defterOlustur } from '../defter/defter.js';
import { rngOlustur } from '../motor/rng.js';

const AYAR_HATASI = /^Error: WIDGET_AYAR_GECERSIZ$/;
const KART = { ayar: () => ({ a: 2, b: 'dik' }) };

function ortamKur(seed = 1) {
  const sozler = [];
  const cizimler = [];
  const ortam = {
    rng: rngOlustur(seed), sahne: { ekle: ornek => cizimler.push(ornek) },
    matik: { soyle: anahtar => sozler.push(anahtar) },
    arayuz: { defterAc() {}, defterKapat() {} }, kayit() {}, bayraklar: {}, kartlar: {}
  };
  return { ortam, sozler, cizimler };
}

function uret(rng, beklenen = KART.ayar()) {
  const ornek = { seed: rng.seed };
  return { ornek, beklenen, ciz: sahne => sahne.ekle(ornek) };
}

function izliRng(yollar, yol = '') {
  return new Proxy({
    seed: 1,
    alt(etiket) {
      const yeni = yol ? yol + '/' + etiket : etiket;
      yollar.push(yeni);
      return izliRng(yollar, yeni);
    }
  }, {
    get(hedef, ad) {
      dogrula.ok(['alt', 'seed'].includes(ad));
      return hedef[ad];
    }
  });
}

describe('sinaOlustur', () => {
  it('Tek parametre alır ve gerekli ortam alanları olmadan kurulmaz.', () => {
    dogrula.equal(sinaOlustur.length, 1);
    dogrula.throws(() => sinaOlustur(), AYAR_HATASI);
    for (const ad of ['rng', 'sahne', 'matik']) {
      const { ortam } = ortamKur();
      delete ortam[ad];
      dogrula.throws(() => sinaOlustur(ortam), AYAR_HATASI);
    }
  });
});

describe('sina', () => {
  it('Tüm örnekler tutunca çizmeden başarılı sonucu ve iki Matik sözünü verir.', async () => {
    const { ortam, sozler, cizimler } = ortamKur();
    const sonuc = sinaOlustur(ortam)(KART, uret);
    dogrula.ok(sonuc instanceof Promise);
    dogrula.deepEqual(sozler, ['sinamaBasladi', 'sinamaTamam']);
    const sinama = await sonuc;
    dogrula.equal(sinama.basarili, true);
    dogrula.equal(sinama.karsiOrnek, null);
    dogrula.equal(sinama.sonuclar.length, 3);
    dogrula.ok(sinama.sonuclar.every(s => s.tuttu));
    dogrula.deepEqual(cizimler, []);
  });

  it('İlk tutmayan örneği bir kez çizer ve kalan örnekleri de hesaplar.', async () => {
    const { ortam, sozler, cizimler } = ortamKur();
    const ornekler = [];
    const sira = [];
    const sinama = await sinaOlustur(ortam)(KART, rng => {
      sira.push('uret:' + ornekler.length);
      const sonuc = uret(rng, ornekler.length === 0 ? KART.ayar() : { a: 3, b: 'dik' });
      ornekler.push(sonuc.ornek);
      return { ...sonuc, ciz(sahne) {
        dogrula.equal(sahne, ortam.sahne);
        sira.push('ciz');
        sonuc.ciz(sahne);
      } };
    }, 4);
    dogrula.equal(sinama.basarili, false);
    dogrula.equal(sinama.karsiOrnek, ornekler[1]);
    dogrula.deepEqual(sinama.sonuclar.map(s => s.tuttu), [true, false, false, false]);
    dogrula.deepEqual(cizimler, [ornekler[1]]);
    dogrula.deepEqual(sira, ['uret:0', 'uret:1', 'ciz', 'uret:2', 'uret:3']);
    dogrula.deepEqual(sozler, ['sinamaBasladi', 'karsiOrnek']);
  });

  it('Anahtar kümesi ve değer türleri yalnız tam eşleşince örneği doğru sayar.', async () => {
    const beklenenler = [{ a: 2 }, { a: 2, b: 'dik', c: 1 }, { a: '2', b: 'dik' },
      { b: 'dik', a: 2 }, Object.assign(Object.create({ a: 2 }), { b: 'dik' })];
    const { ortam } = ortamKur();
    const sina = sinaOlustur(ortam);
    for (let i = 0; i < beklenenler.length; i++) {
      const sonuc = await sina(KART, rng => uret(rng, beklenenler[i]), 1);
      dogrula.equal(sonuc.basarili, i === 3);
    }
  });

  it('Geçersiz çağrıları Promise üretmeden ve tohumu tüketmeden reddeder.', async () => {
    const { ortam, sozler } = ortamKur();
    const yollar = [];
    ortam.rng = izliRng(yollar);
    const sina = sinaOlustur(ortam);
    for (const n of [0, -1, NaN, Infinity, 1.5, '3']) {
      dogrula.throws(() => sina(KART, uret, n), AYAR_HATASI);
    }
    for (const uretici of [undefined, null, {}, 3]) {
      dogrula.throws(() => sina(KART, uretici), AYAR_HATASI);
    }
    for (const kart of [undefined, null, {}, { ayar: 3 }]) {
      dogrula.throws(() => sina(kart, uret), AYAR_HATASI);
    }
    dogrula.deepEqual(yollar, []);
    dogrula.deepEqual(sozler, []);
    await sina(KART, uret, 1);
    dogrula.deepEqual(yollar, ['sina:1', 'sina:1/ornek:0']);
  });

  it('Bin çağrıda artan ve tekrarsız alt akış yolları kullanır.', async () => {
    const { ortam } = ortamKur();
    const yollar = [];
    ortam.rng = izliRng(yollar);
    const sina = sinaOlustur(ortam);
    for (let c = 1; c <= 1000; c++) {
      await sina(KART, uret);
      dogrula.deepEqual(yollar.slice((c - 1) * 4, c * 4), [
        'sina:' + c, 'sina:' + c + '/ornek:0', 'sina:' + c + '/ornek:1',
        'sina:' + c + '/ornek:2'
      ]);
    }
    dogrula.equal(yollar.length, 4000);
    dogrula.equal(new Set(yollar).size, 4000);
  });

  it('Aynı tohumlu iki defter aynı sınama tohumlarını bağımsız üretir.', async () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const a = defterOlustur(ortamKur(seed).ortam);
      const b = defterOlustur(ortamKur(seed).ortam);
      const ilk = await a.sina(KART, uret);
      dogrula.deepEqual(ilk.sonuclar, (await b.sina(KART, uret)).sonuclar);
      const ikinci = await a.sina(KART, uret);
      dogrula.deepEqual(ikinci.sonuclar, (await b.sina(KART, uret)).sonuclar);
      dogrula.notDeepEqual(ilk.sonuclar, ikinci.sonuclar);
    }
  });

  it('Ana rastgelelik akışını tüketmez ve durum alanına erişmez.', async () => {
    const { ortam } = ortamKur(42);
    Object.defineProperty(ortam, 'durum', {
      get() { dogrula.fail('Durum okunmamalıdır.'); },
      set() { dogrula.fail('Durum yazılmamalıdır.'); }
    });
    const once = rngOlustur(42);
    await sinaOlustur(ortam)(KART, uret);
    dogrula.equal(ortam.rng.sayi(), once.sayi());
  });
});
