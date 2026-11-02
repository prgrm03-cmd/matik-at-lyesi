import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { uzaklik, ortaNokta, yonAci, ilerle, esitMi } from '../geo/nokta.js';

describe('uzaklik', () => {
  it('İki nokta arasındaki uzaklığı her iki yönde aynı bulur.', () => {
    const P = { x: -1, y: 2 };
    const Q = { x: 2, y: 6 };
    dogrula.equal(uzaklik(P, Q), 5);
    dogrula.equal(uzaklik(Q, P), 5);
    dogrula.equal(uzaklik(P, P), 0);
  });
});

describe('ortaNokta', () => {
  it('Orta noktayı girdileri değiştirmeden yeni bir nesnede döndürür.', () => {
    const P = Object.freeze({ x: -3, y: 5 });
    const Q = Object.freeze({ x: 7, y: -1 });
    dogrula.deepEqual(ortaNokta(P, Q), { x: 2, y: 2 });
    dogrula.notEqual(ortaNokta(P, P), P);
  });
});

describe('yonAci', () => {
  it('Ekranda aşağı yönü doksan derece ve saat yönünü pozitif sayar.', () => {
    const P = { x: 0, y: 0 };
    const noktalar = [
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }
    ];
    dogrula.deepEqual(noktalar.map((Q) => yonAci(P, Q)), [0, 90, 180, 270]);
    dogrula.equal(yonAci(P, { x: 1, y: -1 }), 315);
  });

  it('Hesaplanan yönü tam dereceye yuvarlamaz.', () => {
    const yon = yonAci({ x: 0, y: 0 }, { x: 3, y: 1 });
    dogrula.ok(Math.abs(yon - 18.43494882292201) < 1e-12);
  });
});

describe('ilerle', () => {
  it('Aşağı yönlü ilerlemede yalnız düşey konumu artırır.', () => {
    const P = Object.freeze({ x: 10, y: 20 });
    const Q = ilerle(P, 90, 50);
    dogrula.ok(Math.abs(Q.x - 10) < 1e-12);
    dogrula.equal(Q.y, 70);
  });

  it('Tam turları aynı konuma taşır ve başlangıç noktasını değiştirmez.', () => {
    const P = Object.freeze({ x: 10, y: 20 });
    dogrula.deepEqual(ilerle(P, 0, 50), { x: 60, y: 20 });
    dogrula.deepEqual(ilerle(P, 360, 50), { x: 60, y: 20 });
    dogrula.deepEqual(ilerle(P, -360, 50), { x: 60, y: 20 });
    dogrula.notEqual(ilerle(P, 0, 0), P);
  });

  it('Her tam yönde istenen uzaklığı ve yönü korur.', () => {
    const P = { x: 137, y: 251 };
    for (let yon = 0; yon < 360; yon += 1) {
      const Q = ilerle(P, yon, 250);
      const fark = Math.abs(yonAci(P, Q) - yon);
      dogrula.ok(Math.abs(uzaklik(P, Q) - 250) < 1e-10);
      dogrula.ok(Math.min(fark, 360 - fark) < 1e-10);
    }
  });
});

describe('esitMi', () => {
  it('Tolerans sınırını kabul eder ve sınırın dışını reddeder.', () => {
    const P = { x: 0, y: 0 };
    const Q = { x: 3, y: 4 };
    dogrula.equal(esitMi(P, Q, 5), true);
    dogrula.equal(esitMi(P, Q, 4.999), false);
    dogrula.equal(esitMi(P, P, 0), true);
  });
});
