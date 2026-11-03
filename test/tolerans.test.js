import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import { TOLERANS, tAci, toleransIcinde } from '../geo/tolerans.js';

describe('TOLERANS', () => {
  it('Sözleşme ve ADT-010 anahtarlarını değiştirilemez olarak sunar.', () => {
    dogrula.deepEqual(Object.keys(TOLERANS).sort(), [
      'aciRaf', 'aciOkuma', 'dikme', 'uzunlukOran', 'teraziToplam',
      'pimYakalamaPx', 'capCubuguPx', 'tekrarKomsulugu', 'kesisimEps', 'hatBirim'
    ].sort());
    dogrula.ok(Object.isFrozen(TOLERANS));
    dogrula.equal(TOLERANS.aciRaf, tAci);
    dogrula.throws(() => { TOLERANS.aciOkuma = 4; }, TypeError);
  });

  it('Açıları dereceyle ve uzunluk oranlarını sözleşmedeki birimle verir.', () => {
    dogrula.equal(TOLERANS.aciOkuma, 3);
    dogrula.equal(TOLERANS.dikme, 2);
    dogrula.equal(TOLERANS.uzunlukOran * 200, 4);
    dogrula.equal(TOLERANS.teraziToplam, 6);
    dogrula.equal(TOLERANS.pimYakalamaPx, 16);
    dogrula.equal(TOLERANS.capCubuguPx, 4);
    dogrula.equal(TOLERANS.tekrarKomsulugu, 5);
    dogrula.equal(TOLERANS.kesisimEps * 100, 8);
    dogrula.equal(TOLERANS.hatBirim, 12);
  });
});

describe('tAci', () => {
  it('Üç zorluk rafında sırasıyla sekiz, altı ve dört derece verir.', () => {
    dogrula.deepEqual([16, 12, 8].map(tAci), [8, 6, 4]);
  });

  it('Raf yarı genişliğini üç ile sekiz derece arasında sınırlar.', () => {
    dogrula.deepEqual([0, 2, 6, 7, 16, 100].map(tAci), [3, 3, 3, 3.5, 8, 8]);
  });
});

describe('toleransIcinde', () => {
  it('Her iki sınırı kabul eder ve ham açıyı yuvarlamadan karşılaştırır.', () => {
    dogrula.equal(toleransIcinde(87, 90, TOLERANS.aciOkuma), true);
    dogrula.equal(toleransIcinde(93, 90, TOLERANS.aciOkuma), true);
    dogrula.equal(toleransIcinde(93.01, 90, TOLERANS.aciOkuma), false);
    dogrula.equal(toleransIcinde(86.99, 90, TOLERANS.aciOkuma), false);
    dogrula.equal(toleransIcinde(90, 90, 0), true);
  });
});
