import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import * as geo from '../geo/index.js';
import { rngOlustur } from '../motor/rng.js';

const O = Object.freeze({ x: 0, y: 0 });
const HATA = /^Error: PARAMETRE_ARALIK_DISI$/;

function kenarlar(c) {
  return c.koseler.map((P, i) => geo.uzaklik(P, c.koseler[(i + 1) % c.koseler.length]));
}

function yonler(c) {
  return c.koseler.map((P, i) => geo.yonAci(P, c.koseler[(i + 1) % c.koseler.length]));
}

function saatYonu(c) {
  const [A, B, C] = c.koseler;
  return (B.x - A.x) * (C.y - B.y) - (B.y - A.y) * (C.x - B.x) > 0;
}

function izgaraDisi(P) {
  dogrula.ok(P.x >= -300 && P.x <= 300 && P.y >= -200 && P.y <= 200);
  for (const deger of [P.x, P.y]) {
    const kalan = Math.abs(deger % 50);
    dogrula.ok(kalan >= 8 - 1e-6 && kalan <= 42 + 1e-6);
  }
}

describe('kesisimGarantiliParametre', () => {
  it('Üç türün bin başlangıç değerinde tam iki ayrı kesişim üretir.', () => {
    for (const tur of ['cesitkenar', 'ikizkenar', 'eskenar']) {
      for (let seed = 1; seed <= 1000; seed += 1) {
        const { r1, r2, AB } = geo.kesisimGarantiliParametre(rngOlustur(seed), tur);
        dogrula.ok([r1, r2, AB].every(Number.isInteger));
        const eps = geo.TOLERANS.kesisimEps * Math.min(r1, r2);
        dogrula.ok(AB > Math.abs(r1 - r2) + eps && AB < r1 + r2 - eps);
        const c1 = { merkez: O, r: r1 };
        const c2 = { merkez: { x: AB, y: 0 }, r: r2 };
        const noktalar = geo.kesisimCemberCember(c1, c2);
        dogrula.equal(noktalar.length, 2);
        dogrula.ok(geo.uzaklik(noktalar[0], noktalar[1]) > 1e-6);
        for (const P of noktalar) {
          dogrula.ok(Math.abs(geo.uzaklik(P, c1.merkez) - r1) < 1e-6);
          dogrula.ok(Math.abs(geo.uzaklik(P, c2.merkez) - r2) < 1e-6);
        }
        dogrula.equal(geo.ucgenTuru([r1, r2, AB]).kenar, tur);
      }
    }
    dogrula.throws(() => geo.kesisimGarantiliParametre(rngOlustur(1), 'yamuk'), HATA);
  });
});

describe('rastgeleDisBukeyCokgen', () => {
  it('Üçten sekize her köşe sayısında bin dış bükey ve eğik tabanlı şekil üretir.', () => {
    const merkez = { x: 37, y: -29 };
    const yaricap = 160;
    for (let n = 3; n <= 8; n += 1) {
      const L0 = geo.uzaklik(geo.ilerle(merkez, 0, yaricap),
        geo.ilerle(merkez, 360 / n, yaricap));
      for (let seed = 1; seed <= 1000; seed += 1) {
        const c = geo.rastgeleDisBukeyCokgen(rngOlustur(seed), n, { merkez, yaricap });
        dogrula.equal(c.koseler.length, n);
        dogrula.equal(geo.disBukeyMi(c), true);
        dogrula.equal(geo.kendiniKeserMi(c), false);
        dogrula.equal(saatYonu(c), true);
        const boylar = kenarlar(c);
        dogrula.ok(boylar.every((boy) => boy / L0 >= 0.6 && boy / L0 <= 1.6));
        const yon = yonler(c)[boylar.indexOf(Math.max(...boylar))];
        dogrula.ok(Math.min(geo.aciFark(yon, 0), geo.aciFark(yon, 180)) > 3);
      }
    }
  });

  it('Geçersiz köşe sayısını ve yarıçapı reddeder.', () => {
    for (const n of [2, 9, 3.5]) {
      dogrula.throws(() => geo.rastgeleDisBukeyCokgen(rngOlustur(1), n), HATA);
    }
    dogrula.throws(() => geo.rastgeleDisBukeyCokgen(rngOlustur(1), 4, { yaricap: 0 }), HATA);
  });
});

describe('rastgeleUcgen', () => {
  it('Her geçerli türün bin örneğinde merkezi, türü ve eğik duruşu korur.', () => {
    const turler = [
      ['cesitkenar', 'dar'], ['cesitkenar', 'dik'], ['cesitkenar', 'genis'],
      ['ikizkenar', 'dar'], ['ikizkenar', 'dik'], ['ikizkenar', 'genis'], ['eskenar', 'dar']
    ];
    for (const [kenar, aci] of turler) {
      for (let seed = 1; seed <= 1000; seed += 1) {
        const c = geo.rastgeleUcgen(rngOlustur(seed), { kenar, aci });
        dogrula.equal(c.koseler.length, 3);
        dogrula.equal(geo.disBukeyMi(c), true);
        dogrula.equal(saatYonu(c), true);
        const [A, B, C] = c.koseler;
        dogrula.ok(Math.abs((A.x + B.x + C.x) / 3) < 1e-6);
        dogrula.ok(Math.abs((A.y + B.y + C.y) / 3) < 1e-6);
        dogrula.deepEqual(geo.ucgenTuru(kenarlar(c)), { kenar, aci });
        dogrula.ok(Math.min(...geo.icAcilar(c)) >= 15 - 1e-6);
        for (const yon of yonler(c)) {
          dogrula.ok([0, 90, 180, 270].every((eksen) => geo.aciFark(yon, eksen) > 3));
        }
      }
    }
  });

  it('Eşkenarda eksik açı türünü dar seçer ve olanaksız tür çiftlerini reddeder.', () => {
    const c = geo.rastgeleUcgen(rngOlustur(1), { kenar: 'eskenar' });
    dogrula.deepEqual(geo.ucgenTuru(kenarlar(c)), { kenar: 'eskenar', aci: 'dar' });
    for (const aci of ['dik', 'genis', 'tam']) {
      dogrula.throws(() => geo.rastgeleUcgen(rngOlustur(1), { kenar: 'eskenar', aci }), HATA);
    }
    dogrula.throws(() => geo.rastgeleUcgen(rngOlustur(1), { kenar: 'dortgen' }), HATA);
  });
});

describe('rastgeleKolUzunlugu', () => {
  it('Dar açıda uzun kolun ve geniş açıda kısa kolun payını verilen bantta tutar.', () => {
    for (const aci of [40, 130]) {
      let sayac = 0;
      for (let seed = 1; seed <= 1000; seed += 1) {
        const uzunluk = geo.rastgeleKolUzunlugu(rngOlustur(seed), aci);
        dogrula.ok(Number.isInteger(uzunluk) && uzunluk >= 120 && uzunluk <= 320);
        if (aci === 40 ? uzunluk >= 260 : uzunluk <= 180) sayac += 1;
      }
      dogrula.ok(sayac / 1000 >= 0.50 && sayac / 1000 <= 0.70);
    }
  });
});

describe('rastgeleCemberParametre', () => {
  it('Bin çemberde merkez ızgara çizgilerinden uzak ve yarıçap aralıkta kalır.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const { merkez, r } = geo.rastgeleCemberParametre(rngOlustur(seed));
      izgaraDisi(merkez);
      dogrula.ok(Number.isInteger(r) && r >= 120 && r <= 320);
    }
  });
});

describe('lazerSenaryosu', () => {
  it('Bin sahnede sensörler aynı doğruya dizilir ve alarmlar bu doğrudan ayrılır.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const { mod, sensor, alarm } = geo.lazerSenaryosu(rngOlustur(seed));
      dogrula.ok(['parca', 'isin', 'dogru'].includes(mod));
      dogrula.ok(sensor.length >= 2 && sensor.length <= 4);
      dogrula.ok(alarm.length >= 1 && alarm.length <= 2);
      const noktalar = [...sensor, ...alarm];
      noktalar.forEach(izgaraDisi);
      const d = { A: sensor[0], yon: geo.yonAci(sensor[0], sensor[1]) };
      dogrula.ok(sensor.every((P) => geo.dogruUzerindeMi(P, d, 1e-6)));
      dogrula.ok(alarm.every((P) => geo.noktaDogruUzakligi(P, d) >= 40 - 1e-6));
      for (let i = 0; i < noktalar.length; i += 1) {
        for (let j = i + 1; j < noktalar.length; j += 1) {
          dogrula.ok(geo.uzaklik(noktalar[i], noktalar[j]) >= 40 - 1e-6);
        }
      }
    }
  });
});

describe('rastgeleAci', () => {
  it('Çirkin ve güzel kümeleri ayırır ve geçmiş komşuluğunu dışlar.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const cirkin = geo.rastgeleAci(rngOlustur(seed), [10, 80],
        { cirkin: 1, haric: [40], adim: 1 });
      const guzel = geo.rastgeleAci(rngOlustur(seed), [10, 80],
        { cirkin: 0, haric: [40], adim: 1 });
      dogrula.ok(cirkin % 5 !== 0 && Math.abs(cirkin - 40) > 5);
      dogrula.ok(guzel % 5 === 0 && Math.abs(guzel - 40) > 5);
    }
  });

  it('Seçilen küme boşsa ötekini kullanır ve bütün adaylar dışlanırsa reddeder.', () => {
    dogrula.equal(geo.rastgeleAci(rngOlustur(1), [10, 10], { cirkin: 1 }), 10);
    dogrula.equal(geo.rastgeleAci(rngOlustur(1), [11, 11], { cirkin: 0 }), 11);
    dogrula.throws(() => geo.rastgeleAci(rngOlustur(1), [10, 20], { haric: [15] }), HATA);
    const adimli = geo.rastgeleAci(rngOlustur(42), [10, 20], { adim: 3 });
    dogrula.ok([10, 13, 16, 19].includes(adimli));
  });
});

describe('rastgeleYon', () => {
  it('Bin başlangıçta tam yönleri izin verilen aralıkta üretir.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const yon = geo.rastgeleYon(rngOlustur(seed));
      dogrula.ok(Number.isInteger(yon) && yon >= 0 && yon < 360);
    }
  });
});

describe('rastgeleEgim', () => {
  it('Bin başlangıçta yalnız iki izinli eğim aralığından değer verir.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const egim = geo.rastgeleEgim(rngOlustur(seed));
      dogrula.ok(Number.isInteger(egim));
      dogrula.ok((egim >= 10 && egim <= 80) || (egim >= 100 && egim <= 170));
    }
  });
});

describe('rastgeleUcgen', () => {
  it('Yalnız dik veya geniş açı istendiğinde bin başlangıçta uygun kenar türünü seçer.', () => {
    for (const aci of ['dik', 'genis']) {
      for (let seed = 1; seed <= 1000; seed += 1) {
        const c = geo.rastgeleUcgen(rngOlustur(seed), { aci });
        dogrula.equal(geo.ucgenTuru(kenarlar(c)).aci, aci);
      }
    }
  });

  it('Boş tür isteğiyle bin başlangıçta geçerli üçgen üretir.', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const c = geo.rastgeleUcgen(rngOlustur(seed), {});
      dogrula.equal(c.koseler.length, 3);
      dogrula.equal(geo.disBukeyMi(c), true);
      const tur = geo.ucgenTuru(kenarlar(c));
      dogrula.ok(['cesitkenar', 'ikizkenar', 'eskenar'].includes(tur.kenar));
      dogrula.ok(['dar', 'dik', 'genis'].includes(tur.aci));
    }
  });
});
