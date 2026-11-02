import { describe, it } from 'node:test';
import { strict as dogrula } from 'node:assert';
import * as geo from '../geo/index.js';

const O = Object.freeze({ x: 0, y: 0 });
const HATA = /^Error: PARAMETRE_ARALIK_DISI$/;
const KARE = { koseler: [O, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] };

function yakin(gercek, beklenen, tol = 1e-6) {
  dogrula.ok(Math.abs(gercek - beklenen) <= tol);
}

function noktaYakin(gercek, beklenen) {
  dogrula.ok(gercek && typeof gercek === 'object');
  yakin(gercek.x, beklenen.x);
  yakin(gercek.y, beklenen.y);
}

describe('uzaklik', () => {
  it('İki nokta arasındaki uzaklığı her iki yönde aynı bulur.', () => {
    const P = { x: -1, y: 2 };
    const Q = { x: 2, y: 6 };
    dogrula.equal(geo.uzaklik(P, Q), 5);
    dogrula.equal(geo.uzaklik(Q, P), 5);
    dogrula.equal(geo.uzaklik(P, P), 0);
  });
});

describe('ortaNokta', () => {
  it('Orta noktayı girdileri değiştirmeden yeni bir nesnede döndürür.', () => {
    const P = Object.freeze({ x: -3, y: 5 });
    const Q = Object.freeze({ x: 7, y: -1 });
    dogrula.deepEqual(geo.ortaNokta(P, Q), { x: 2, y: 2 });
    dogrula.notEqual(geo.ortaNokta(P, P), P);
  });
});

describe('yonAci', () => {
  it('Ekranda aşağı yönü doksan derece ve saat yönünü pozitif sayar.', () => {
    const noktalar = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
    dogrula.deepEqual(noktalar.map((P) => geo.yonAci(O, P)), [0, 90, 180, 270]);
    dogrula.equal(geo.yonAci(O, { x: 1, y: -1 }), 315);
    yakin(geo.yonAci(O, { x: 3, y: 1 }), 18.43494882292201, 1e-12);
    dogrula.throws(() => geo.yonAci(O, O), HATA);
  });
});

describe('ilerle', () => {
  it('Tam turları aynı konuma taşır ve başlangıç noktasını değiştirmez.', () => {
    const P = Object.freeze({ x: 10, y: 20 });
    noktaYakin(geo.ilerle(P, 90, 50), { x: 10, y: 70 });
    dogrula.throws(() => geo.ilerle(P, 0, 0), HATA);
    dogrula.throws(() => geo.ilerle(P, 0, -1), HATA);
    for (const yon of [0, 360, -360]) {
      dogrula.deepEqual(geo.ilerle(P, yon, 50), { x: 60, y: 20 });
    }
  });

  it('Her tam yönde istenen uzaklığı ve yönü korur.', () => {
    const P = { x: 137, y: 251 };
    for (let yon = 0; yon < 360; yon += 1) {
      const Q = geo.ilerle(P, yon, 250);
      yakin(geo.uzaklik(P, Q), 250, 1e-10);
      yakin(geo.aciFark(geo.yonAci(P, Q), yon), 0, 1e-10);
    }
  });
});

describe('esitMi', () => {
  it('Tolerans sınırını kabul eder ve sınırın dışını reddeder.', () => {
    const Q = { x: 3, y: 4 };
    dogrula.equal(geo.esitMi(O, Q, 5), true);
    dogrula.equal(geo.esitMi(O, Q, 4.999), false);
    dogrula.equal(geo.esitMi(O, O, 0), true);
  });
});

describe('aciNormalize', () => {
  it('Negatif yönü ve tam turları sıfır dahil üç yüz altmış hariç aralığa taşır.', () => {
    dogrula.deepEqual([-30, 0, 180, 360, 720].map(geo.aciNormalize), [330, 0, 180, 0, 0]);
  });
});

describe('aciFark', () => {
  it('Sıfır çizgisini aşan ve zıt yönlerde en küçük farkı bulur.', () => {
    dogrula.equal(geo.aciFark(350, 10), 20);
    dogrula.equal(geo.aciFark(10, 350), 20);
    dogrula.equal(geo.aciFark(0, 180), 180);
  });
});

describe('aciOlc', () => {
  it('Nokta kollarını saat ve ters yönde ham açıyla ölçer.', () => {
    const kol1 = { x: 100, y: 0 };
    for (const [yon, saat, ters] of [[40, 40, 320], [320, 320, 40], [40.4, 40.4, 319.6]]) {
      const kol2 = geo.ilerle(O, yon, 100);
      yakin(geo.aciOlc(O, kol1, kol2, 'saat'), saat);
      yakin(geo.aciOlc(O, kol1, kol2, 'ters'), ters);
    }
    dogrula.equal(geo.aciOlc(O, kol1, kol1, 'saat'), 0);
  });

  it('Sıfır uzunluklu kolu ve tanımsız dönüş yönünü reddeder.', () => {
    const kol = { x: 100, y: 0 };
    dogrula.throws(() => geo.aciOlc(O, O, kol, 'saat'), HATA);
    dogrula.throws(() => geo.aciOlc(O, kol, O, 'ters'), HATA);
    dogrula.throws(() => geo.aciOlc(O, kol, kol, 'sag'), HATA);
  });
});

describe('aciOku', () => {
  it('Fable örneklerinde sıfırı hizalı ölçeği doğru seçip tam dereceye yuvarlar.', () => {
    const ornekler = [
      [40, 'ic', 40, 140], [40, 'dis', 140, 40],
      [320, 'ic', 40, 140], [320, 'dis', 140, 40],
      [0, 'ic', 0, 180], [180, 'dis', 0, 180],
      [40.4, 'ic', 40, 140], [40.5, 'ic', 41, 139]
    ];
    for (const [yon, olcek, ic, dis] of ornekler) {
      const sonuc = geo.aciOku(O, 0, yon, olcek);
      dogrula.deepEqual(sonuc, { ic, dis, dogru: olcek });
      dogrula.equal(sonuc.ic + sonuc.dis, 180);
    }
    dogrula.throws(() => geo.aciOku(O, 0, 40, 'saat'), HATA);
    dogrula.throws(() => geo.aciOku({ x: NaN, y: 0 }, 0, 40, 'ic'), HATA);
  });
});

describe('aciTuru', () => {
  it('Sıfır, dar, dik, geniş, doğru ve tam açı sınırlarını ayırır.', () => {
    const sayilar = [0, 40, 90, 92, 180, 270, 360];
    const turler = ['sifir', 'dar', 'dik', 'genis', 'dogru', 'genis', 'tam'];
    dogrula.deepEqual(sayilar.map(geo.aciTuru), turler);
    for (const d of [-1, 361]) dogrula.throws(() => geo.aciTuru(d), HATA);
  });
});

describe('aciTuruTol', () => {
  it('Ham ölçüdeki sınır komşuluklarını toleransla sınıflandırır.', () => {
    dogrula.equal(geo.aciTuruTol(92, 3), 'dik');
    dogrula.equal(geo.aciTuru(92), 'genis');
    dogrula.equal(geo.aciTuruTol(2, 3), 'sifir');
    dogrula.equal(geo.aciTuruTol(182, 3), 'dogru');
    dogrula.equal(geo.aciTuruTol(358, 3), 'tam');
    dogrula.equal(geo.aciTuruTol(93.01, 3), 'genis');
  });
});

describe('dikMi', () => {
  it('Dikliği yönü ters çevrilmiş kollarda da toleransla bulur.', () => {
    dogrula.equal(geo.dikMi(10, 100, 2), true);
    dogrula.equal(geo.dikMi(10, 280, 2), true);
    dogrula.equal(geo.dikMi(10, 102.1, 2), false);
  });
});

describe('paralelMi', () => {
  it('Aynı ve zıt yönlü paralelleri kabul edip eğik doğruyu reddeder.', () => {
    dogrula.equal(geo.paralelMi(5, 185, 2), true);
    dogrula.equal(geo.paralelMi(359, 1, 2), true);
    dogrula.equal(geo.paralelMi(0, 3, 2), false);
  });
});

describe('dikme', () => {
  it('Dikme ayağı doğru üstünde kalır ve doğruya uzaklığı verir.', () => {
    const d = { A: O, yon: 30 };
    const P = { x: 40, y: 90 };
    const { ayak, parca } = geo.dikme(d, P);
    dogrula.equal(geo.dogruUzerindeMi(ayak, d, 1e-6), true);
    yakin(geo.uzaklik(P, ayak), geo.noktaDogruUzakligi(P, d));
    dogrula.ok(geo.esitMi(parca.A, P, 1e-6) && geo.esitMi(parca.B, ayak, 1e-6));
  });
});

describe('hangiTarafta', () => {
  it('Doğru üstünü sıfır, yönün sağını bir ve solunu eksi bir olarak bildirir.', () => {
    const d = { A: O, yon: 0 };
    dogrula.equal(geo.hangiTarafta({ x: 50, y: 0 }, d), 0);
    dogrula.equal(geo.hangiTarafta({ x: 50, y: 10 }, d), 1);
    dogrula.equal(geo.hangiTarafta({ x: 50, y: -10 }, d), -1);
    dogrula.equal(geo.hangiTarafta({ x: -10, y: 50 }, { A: O, yon: 90 }), 1);
  });
});

describe('dogruKenarKesisimi', () => {
  it('Tezgâhın iki kenarındaki noktaları aynı doğru üzerinde bulur.', () => {
    const d = { A: { x: 500, y: 500 }, yon: 0 };
    const noktalar = geo.dogruKenarKesisimi(d).sort((a, b) => a.x - b.x);
    noktaYakin(noktalar[0], { x: 0, y: 500 });
    noktaYakin(noktalar[1], { x: 1000, y: 500 });
  });
});

describe('kesisimDogruDogru', () => {
  it('Paralel ayrık doğruları ayırıp çakışan doğruları bildirir.', () => {
    const d = { A: O, yon: 0 };
    dogrula.equal(geo.kesisimDogruDogru(d, { A: { x: 0, y: 10 }, yon: 180 }), null);
    dogrula.equal(geo.kesisimDogruDogru(d, { A: { x: 50, y: 0 }, yon: 180 }), 'cakisik');
    noktaYakin(geo.kesisimDogruDogru(d, { A: { x: 50, y: 10 }, yon: 90 }), { x: 50, y: 0 });
  });
});

describe('kesisimDogruParca', () => {
  it('Parçanın dışındaki kesişimi reddeder ve doğru üstündeki parçanın ilk ucunu verir.', () => {
    const p = { A: O, B: { x: 100, y: 0 } };
    dogrula.equal(geo.kesisimDogruParca({ A: { x: 101, y: 0 }, yon: 90 }, p), null);
    noktaYakin(geo.kesisimDogruParca({ A: O, yon: 0 }, p), O);
    noktaYakin(geo.kesisimDogruParca({ A: { x: 50, y: 0 }, yon: 90 }, p), { x: 50, y: 0 });
    dogrula.throws(() => geo.kesisimDogruParca({ A: O, yon: 0 }, { A: O, B: O }), HATA);
  });
});

describe('kesisimParcaParca', () => {
  it('Fable örneklerinde örtüşme, tek uç, ayrıklık ve iç kesişimi ayırır.', () => {
    const p = { A: O, B: { x: 100, y: 0 } };
    const parca = (x, son) => ({ A: { x, y: 0 }, B: { x: son, y: 0 } });
    dogrula.equal(geo.kesisimParcaParca(p, parca(50, 150)), 'cakisik');
    noktaYakin(geo.kesisimParcaParca(p, parca(100, 200)), { x: 100, y: 0 });
    dogrula.equal(geo.kesisimParcaParca(p, parca(101, 200)), null);
    const dik = { A: { x: 50, y: -10 }, B: { x: 50, y: 10 } };
    noktaYakin(geo.kesisimParcaParca(p, dik), { x: 50, y: 0 });
    dogrula.equal(geo.kesisimParcaParca(p, p), 'cakisik');
    dogrula.throws(() => geo.kesisimParcaParca(p, { A: O, B: O }), HATA);
  });
});

describe('kesisimCemberCember', () => {
  it('Dış ve iç teğetlikte bir nokta, ayrıklıkta ve iç içelikte sıfır nokta verir.', () => {
    const c = { merkez: O, r: 100 };
    noktaYakin(geo.kesisimCemberCember(c, { merkez: { x: 200, y: 0 }, r: 100 })[0],
      { x: 100, y: 0 });
    dogrula.equal(geo.kesisimCemberCember(c, { merkez: { x: 200, y: 0 }, r: 100 }).length, 1);
    dogrula.equal(geo.kesisimCemberCember(c, { merkez: { x: 50, y: 0 }, r: 50 }).length, 1);
    dogrula.deepEqual(geo.kesisimCemberCember(c, { merkez: { x: 250, y: 0 }, r: 100 }), []);
    dogrula.deepEqual(geo.kesisimCemberCember(c, { merkez: { x: 10, y: 0 }, r: 20 }), []);
    dogrula.deepEqual(geo.kesisimCemberCember(c, { merkez: O, r: 20 }), []);
  });
});

describe('kesisimCemberDogru', () => {
  it('Kesene iki, teğete bir ve dışarıdaki doğruya sıfır nokta verir.', () => {
    const c = { merkez: O, r: 100 };
    dogrula.equal(geo.kesisimCemberDogru(c, { A: O, yon: 0 }).length, 2);
    dogrula.equal(geo.kesisimCemberDogru(c, { A: { x: 0, y: 100 }, yon: 0 }).length, 1);
    dogrula.deepEqual(geo.kesisimCemberDogru(c, { A: { x: 0, y: 101 }, yon: 0 }), []);
  });
});

describe('ardisikKesisim', () => {
  it('Açık çitte son ve ilk çiftin indisini bildirip kapalı çitte dört köşe verir.', () => {
    const dogrular = [
      { A: O, yon: 0 }, { A: { x: 100, y: 0 }, yon: 90 },
      { A: { x: 0, y: 100 }, yon: 0 }
    ];
    const acik = geo.ardisikKesisim(dogrular);
    dogrula.equal(acik.kapali, false);
    dogrula.deepEqual(acik.kopuk, [2]);
    dogrula.equal(acik.koseler.length, 2);
    noktaYakin(acik.koseler[0], { x: 100, y: 0 });
    noktaYakin(acik.koseler[1], { x: 100, y: 100 });
    const kapali = geo.ardisikKesisim([...dogrular, { A: O, yon: 90 }]);
    dogrula.equal(kapali.kapali, true);
    dogrula.deepEqual(kapali.kopuk, []);
    const beklenen = [{ x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, O];
    dogrula.equal(kapali.koseler.length, 4);
    kapali.koseler.forEach((P, i) => noktaYakin(P, beklenen[i]));
    dogrula.throws(() => geo.ardisikKesisim(dogrular.slice(0, 2)), HATA);
  });
});

describe('kesenMi', () => {
  it('Kesişimler aynı noktaya düştüğünde aynı nokta bayrağını açar.', () => {
    const sonuc = geo.kesenMi({ A: O, yon: 45 }, { A: O, yon: 0 }, { A: O, yon: 90 });
    dogrula.equal(sonuc.ayniNokta, true);
    noktaYakin(sonuc.A, O);
    noktaYakin(sonuc.B, O);
  });
});

describe('cemberUzerindeMi', () => {
  it('Yarıçap oranı toleransını uygular ve daire içini çemberden ayırır.', () => {
    const c = { merkez: O, r: 100 };
    dogrula.equal(geo.cemberUzerindeMi({ x: 102, y: 0 }, c, 0.02), true);
    dogrula.equal(geo.cemberUzerindeMi({ x: 102.01, y: 0 }, c, 0.02), false);
    dogrula.equal(geo.cemberIcindeMi({ x: 99, y: 0 }, c), true);
    dogrula.equal(geo.cemberIcindeMi({ x: 100, y: 0 }, c), false);
  });
});

describe('yayUzerindeMi', () => {
  it('Çember üstünde olup yay dışında kalan noktayı reddeder.', () => {
    const y = { merkez: O, r: 100, bas: 350, bit: 10, yon: 'saat' };
    dogrula.equal(geo.yayUzerindeMi({ x: 100, y: 0 }, y, 0.02), true);
    dogrula.equal(geo.yayUzerindeMi({ x: -100, y: 0 }, y, 0.02), false);
    dogrula.equal(geo.yayUzerindeMi({ x: -100, y: 0 }, { ...y, yon: 'ters' }, 0.02), true);
    dogrula.throws(() => geo.yayUzerindeMi({ x: 100, y: 0 }, { ...y, yon: 'ic' }, 0.02), HATA);
  });
});

describe('kesisimYayIsin', () => {
  it('Işının gerisindeki ve yayın dışındaki kesişimleri eler.', () => {
    const y = { merkez: O, r: 100, bas: 270, bit: 90, yon: 'saat' };
    const noktalar = geo.kesisimYayIsin(y, { A: O, yon: 0 });
    dogrula.equal(noktalar.length, 1);
    noktaYakin(noktalar[0], { x: 100, y: 0 });
    dogrula.deepEqual(geo.kesisimYayIsin(y, { A: O, yon: 180 }), []);
  });
});

describe('disBukeyMi', () => {
  it('Dış bükey beşgeni kabul edip içe çöken beşgeni reddeder.', () => {
    const dis = { koseler: [O, { x: 100, y: 0 }, { x: 150, y: 80 },
      { x: 70, y: 150 }, { x: -30, y: 80 }] };
    const ic = { koseler: [O, { x: 100, y: 0 }, { x: 40, y: 40 },
      { x: 100, y: 100 }, { x: 0, y: 100 }] };
    dogrula.equal(geo.disBukeyMi(dis), true);
    dogrula.equal(geo.disBukeyMi(ic), false);
    dogrula.ok(geo.icAcilar(ic).some((aci) => aci > 180));
  });
});

describe('kendiniKeserMi', () => {
  it('Papyon biçimli dörtgeni kendini kesmeyen kareden ayırır.', () => {
    const papyon = { koseler: [O, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }] };
    dogrula.equal(geo.kendiniKeserMi(papyon), true);
    dogrula.equal(geo.kendiniKeserMi(KARE), false);
  });
});

describe('duzgunMu', () => {
  it('Döndürülmüş kareyi kabul eder ama eşkenar dörtgeni reddeder.', () => {
    const kare = { koseler: geo.sekliDondur(KARE.koseler, O, 23, false) };
    const eskenar = { koseler: [O, { x: 100, y: 0 }, { x: 160, y: 80 }, { x: 60, y: 80 }] };
    dogrula.equal(geo.duzgunMu(kare, 3, 0.02), true);
    dogrula.equal(geo.duzgunMu(eskenar, 3, 0.02), false);
    geo.icAcilar(kare).forEach((aci) => yakin(aci, 90));
    yakin(geo.disAci(kare, 0), 90);
    dogrula.equal(geo.komsuMu(kare, 0, 3), true);
    dogrula.equal(geo.komsuMu(kare, 0, 2), false);
  });
});

describe('ucgenKapanir', () => {
  it('Eşitlik sınırında kapanmaz ve iki altmış dereceyle kapanır.', () => {
    dogrula.equal(geo.ucgenKapanir(90, 90), false);
    dogrula.equal(geo.ucgenKapanir(60, 60), true);
    dogrula.equal(geo.ucgenKapanir(100, 80), false);
  });
});

describe('ucgenTuru', () => {
  it('Kenar ve açı türlerini birlikte belirler ve kapanmayan kenarları reddeder.', () => {
    dogrula.deepEqual(geo.ucgenTuru([3, 4, 5]), { kenar: 'cesitkenar', aci: 'dik' });
    dogrula.deepEqual(geo.ucgenTuru([100, 100, 100]), { kenar: 'eskenar', aci: 'dar' });
    dogrula.deepEqual(geo.ucgenTuru([100, 100, 180]), { kenar: 'ikizkenar', aci: 'genis' });
    dogrula.throws(() => geo.ucgenTuru([1, 2, 3]), HATA);
    dogrula.throws(() => geo.ucgenTuru([0, 2, 2]), HATA);
  });
});

describe('icAcilar', () => {
  it('Ondalıklı iç açıyı yuvarlamadan korur.', () => {
    const c = { koseler: [O, { x: 4, y: 0 }, { x: 4, y: 3 }] };
    yakin(geo.icAcilar(c)[0], 36.86989764584402);
  });
});

describe('disAci', () => {
  it('Ondalıklı dış açıyı yuvarlamadan korur.', () => {
    const c = { koseler: [O, { x: 4, y: 0 }, { x: 4, y: 3 }] };
    yakin(geo.disAci(c, 0), 143.13010235415598);
  });
});
