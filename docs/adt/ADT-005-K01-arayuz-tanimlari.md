# ADT-005 · K-01 geometri arayüzlerinin eksik tanımları

Tarih: 2 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: K-01 · Tür: ekleyici (açıklık)

Durum: Fable kararı GEÇTİ. Aşağıdaki talep metni karar öncesi kayıttır;
uygulamada KARARLAR bloğu esas alınır. Sözleşme dosyası değiştirilmemiştir.

## Talep (karar öncesi)

İstenen: Aşağıdaki mevcut işlevlerin girdi/dönüş tipleri ve davranış koşulları,
adları ve parametre sayıları korunarak sözleşmede tamamlanmalıdır.

Neden: K-01 tüm imza ve dönüş şekillerinin birebir uygulanmasını istiyor.
Aşağıdaki eksikler, geçerli girdiler için birden fazla gözlenebilir davranışa
izin veriyor. Birini kodda seçmek sonraki düzeneklerin arayüzünü kendiliğinden belirler.

Sözleşmede var mı? §3.2'de işlevler var ama aşağıdaki tanımlar yetersizdir.
§6.3 ve bilet setinin tamamı da bu noktaları kesinleştirmiyor.

## 1. Açı kolları ve ölçek okuması

- `aciOlc(merkez, kol1, kol2, yon)`: `kol1/kol2` birer `Nokta` mı,
  yoksa derece cinsinden yön mü? JSDoc parametre tipleri yazılmalıdır.
- `aciOku(merkez, kol1Yon, kol2Yon, olcekYonu)`: kolların sayısal yön olduğu
  açık; ancak ölçek seçiminin `ic/dis` değerlerini nasıl eşlediği açık değildir.
  Aynı kollar ve iki farklı `olcekYonu` için örnek dönüş nesneleri gerekir.
- Örnek karar girdileri: merkez `{x:0,y:0}`, yönler `0/40`,
  ölçekler `'ic'/'dis'`; ters yön için `0/320`.
- Bilet K-05, `ic+dis===180` ve `dogru===olcekYonu` koşullarını verir;
  bu koşullar hangi ölçeğin 40, hangisinin 140 olduğunu tek başına belirlemez.

## 2. Özel kesişim sonuçları

- `kesisimParcaParca(p1,p2)` dönüş tipi belirtilmemiştir.
  Kesişmeyen, tek noktada kesişen ve kısmen/tam örtüşen parçalar için
  dönüş değerleri tanımlanmalıdır.
- `kesisimDogruParca(d,p)` için `Nokta|null` belirtilir; parçanın
  tamamı doğru üzerinde olduğunda hangi sonuç beklendiği açıklanmalıdır.
- `ardisikKesisim(dogrular)` için `kopuk:number[]` verilmiştir.
  İndisin doğruyu mu, ardışık doğru çiftini mi gösterdiği ve son-ilk çiftinin
  nasıl temsil edildiği bir açık ve bir kapalı çit örneğiyle belirlenmelidir.

## 3. Üretici arayüzleri ve dağılım koşulları

- `rastgeleDisBukeyCokgen(rng,n,secenek)` ve `rastgeleUcgen(rng,tur)`
  dönüşü `Cokgen` mi, `Nokta[]` mı? Çokgen `secenek` alanları,
  isteğe bağlılıkları ve varsayılanları tanımlanmalıdır.
- `rastgeleAci` için `cirkin` olasılığı yazılıdır; hangi açıların
  “çirkin” kümesine girdiği ve bu küme boşsa davranış belirlenmemiştir.
- `rastgeleKolUzunlugu` için dönüş tipi, uzunluk aralığı ve “%40 ters
  orantı tuzağı”nın ölçülebilir koşulu eksiktir.
- Çokgenin “kenar oranı 0,6–1,6” koşulunun referans uzunluğu tanımlanmalıdır.
- `rastgeleCemberParametre` için “ızgara dışı”nı belirleyen ızgara adımı
  ve izin verilen merkez bölgesi eksiktir.
- Bu tanımlar olmadan rastgele üretim aralıkları veya seçenek adları uydurulmayacaktır.

Etkilenen dosyalar: `geo/aci.js`, `geo/kesisim.js`, `geo/uretici.js`,
`geo/index.js`, ilgili `test/` dosyaları (CX-M);
`docs/sozlesme_v1.md` açıklamaları (Fable/Matematikçe).

Geçici çözüm: Bağımsız `motor/rng.js`, `geo/nokta.js`,
`geo/tolerans.js`, bunların testleri, `package.json` ve
`docs/hatalar.md` ilerletilir. Eksik tanımlı işlevlere yer tutucu veya
varsayımsal davranış eklenmez. K-01'in tam kabulü bu kararlar olmadan bloke.

Alternatif: Mevcut sayısal parametre sayıları korunarak yalnız JSDoc ve
örneklerin tamamlanması yeterlidir; yeni işlev veya ek parametre talep edilmiyor.


--- Matematikçe ---

Ön karar: Fable'a; ekleyici teyit (ADT-001…004 PR #2'de kullanıldı)

--- Fable ---

KARARLAR (ADT-005, Fable, kodlanacak metin):
GENEL · geo/ içinde göreli import serbest ('./nokta.js', './tolerans.js'); geo/ dışından import yok. Her dosyada iç EPS=1e-6 birim; paralellik: birim vektör çapraz çarpımı |cross|≤1e-9. Sıfır uzunluklu parça/kol/yön ve geçersiz enum → throw new Error('PARAMETRE_ARALIK_DISI'). Math.PI yalnız aci.js'de tek yerde; nokta.js DERECE_RADYAN kalır. uretici.js trigonometri kullanmaz: ilerle/yonAci/uzaklik/kesisimDogruDogru ile inşa eder.
ACI · aciOlc(merkez:Nokta, kol1:Nokta, kol2:Nokta, yon:'saat'|'ters') → number ham [0,360): a1=yonAci(merkez,kol1), a2=yonAci(merkez,kol2); 'saat'→aciNormalize(a2−a1), 'ters'→aciNormalize(a1−a2). Örnek merkez{0,0}, kol1{100,0}, kol2=ilerle(merkez,40,100): saat 40, ters 320; kol2 yön 320: saat 320, ters 40; kol1=kol2 → 0; kol=merkez → PARAMETRE_ARALIK_DISI.
aciOku(merkez, kol1Yon, kol2Yon, olcekYonu) → {ic,dis,dogru}: olcekYonu = sıfırı kol1'e hizalı ölçek. dar=aciFark(kol1Yon,kol2Yon); okunan=Math.round(dar); diğer=180−okunan. 'ic'→{ic:okunan,dis:180−okunan,dogru:'ic'}; 'dis'→{ic:180−okunan,dis:okunan,dogru:'dis'}. ic+dis===180 ve dogru===olcekYonu daima; merkez yalnız doğrulanır. Örnekler: (0,40,'ic')→{40,140,'ic'}; (0,40,'dis')→{140,40,'dis'}; (0,320,'ic')→{40,140,'ic'}; (0,320,'dis')→{140,40,'dis'}; (0,0,'ic')→{0,180,'ic'}; (0,180,'dis')→{0,180,'dis'}; 40.4→40, 40.5→41. Tolerans karşılaştırması aciOku'da yapılmaz.
aciTuru(d): d<0∨d>360 → PARAMETRE_ARALIK_DISI; 0 'sifir', (0,90) 'dar', 90 'dik', (90,180) 'genis', 180 'dogru', (180,360) 'genis', 360 'tam'. aciTuruTol(d,tol): d≤tol 'sifir'; |d−90|≤tol 'dik'; |d−180|≤tol 'dogru'; |d−360|≤tol 'tam'; aksi aciTuru(d).
KESISIM · kesisimDogruDogru: paralel ayrık null; paralel ve noktaDogruUzakligi(d2.A,d1)≤EPS → 'cakisik'. kesisimDogruParca(d,p) → Nokta|null: t∈[−1e-9,1+1e-9] ise nokta; parça tamamen doğru üzerindeyse p.A; paralel ayrık null. kesisimParcaParca(p1,p2) → Nokta|null|'cakisik': kesişmeyen null; tek nokta (iç, uç, uç-uç, kolineer tek uçta değme) Nokta; kolineer örtüşme > EPS → 'cakisik'. Örnekler {0,0}-{100,0} ∩: {50,0}-{150,0}→'cakisik'; {100,0}-{200,0}→{100,0}; {101,0}-{200,0}→null; {50,−10}-{50,10}→{50,0}; kendisi→'cakisik'.
ardisikKesisim(dogrular) → {kapali,koseler,kopuk}: n<3 → PARAMETRE_ARALIK_DISI. Çift i=(dogrular[i], dogrular[(i+1)%n]), i=n−1 son–ilk. kopuk = tek kesişim noktası olmayan (paralel/'cakisik') çiftlerin i indisleri, artan. koseler = var olan kesişimler çift sırasıyla (null yok), uzunluk n−kopuk.length. kapali = kopuk.length===0. Açık örnek [{A:{0,0},yon:0},{A:{100,0},yon:90},{A:{0,100},yon:0}] → {kapali:false, koseler:[{100,0},{100,100}], kopuk:[2]}. Kapalı örnek [+{A:{0,0},yon:90}] → {kapali:true, koseler:[{100,0},{100,100},{0,100},{0,0}], kopuk:[]}.
COKGEN · ucgenTuru(kenarlar:number[3]): tol=TOLERANS.uzunlukOran·enUzun; üçü ikişer ≤tol farklı 'eskenar'; bir çift 'ikizkenar'; aksi 'cesitkenar'. Açı: en uzun kenar karşısı, üçgen ilerle/kesisimDogruDogru ile kurulup yonAci+aciFark ile ölçülür; |açı−90|≤TOLERANS.dikme 'dik'; >90+dikme 'genis'; aksi 'dar'. Üçgen eşitsizliği bozuksa PARAMETRE_ARALIK_DISI (iç kontrol, ayrı fonksiyon yok).
URETICI · rastgeleAci(rng, aralik:[min,max], secenek={cirkin:0.5,haric:[],adim:1}): adaylar min..max adım adim; haric ±TOLERANS.tekrarKomsulugu komşuluğuyla dışlanır; çirkin küme = d%5!==0, güzel = 5'in katları; rng.bool(cirkin) doğruysa çirkinden, değilse güzelden rng.sec; seçilen küme boşsa diğeri; ikisi de boşsa PARAMETRE_ARALIK_DISI. rastgeleYon → rng.tam(0,359). rastgeleEgim → rng.bool()?rng.tam(10,80):rng.tam(100,170).
rastgeleKolUzunlugu(rng, aci) → number [120,320]: rng.bool(0.4) ve aci<90 → rng.tam(260,320); doğru ve aci>90 → rng.tam(120,180); aksi rng.tam(120,320). Test: aci=40, 1000 seed, ≥260 payı ∈[0.50,0.70]; aci=130, ≤180 payı ∈[0.50,0.70].
rastgeleDisBukeyCokgen(rng, n 3–8, secenek={merkez:{0,0},yaricap:160}) → Cokgen: L0 = uzaklik(ilerle(merkez,0,yaricap), ilerle(merkez,360/n,yaricap)); her kenar/L0 ∈[0.6,1.6]; disBukeyMi true; en uzun kenar yönü için min(aciFark(yon,0),aciFark(yon,180)) > TOLERANS.aciOkuma. İnşa: donme=rng.tam(0,359); s=floor(360/n·0.2); a_i=donme+i·360/n+rng.tam(−s,s); r_i=yaricap·rng.tam(80,120)/100; kose_i=ilerle(merkez,a_i,r_i); saat yönü. Değişmez bozulursa aynı rng ile tekrar, 100'de olmazsa PARAMETRE_ARALIK_DISI. n aralık dışı/merkez-yaricap geçersiz → PARAMETRE_ARALIK_DISI.
rastgeleUcgen(rng, tur={kenar?,aci?}) → Cokgen (3 köşe, ağırlık merkezi {0,0}, saat yönü): eksik alan rng.sec(['cesitkenar','ikizkenar','eskenar']) / rng.sec(['dar','dik','genis']); eskenar+dik/genis → PARAMETRE_ARALIK_DISI; eskenar+aci yok → 'dar'. Açılar tam derece: eskenar 60/60/60; dik A=90, B=ikizkenar?45:rng.tam(20,70) (cesitkenar B≠45); genis A=rng.tam(100,140), ikizkenar B=C=(180−A)/2 (A çift), cesitkenar B=rng.tam(15,180−A−15) ve |B−C|≥5; dar ikizkenar B=C=rng.tam(50,80) A=180−2B≠B, cesitkenar üçü <90 ikişer ≥5 farklı. İnşa: taban rng.tam(140,260), B={0,0}, C=ilerle(B,0,taban), A=kesisimDogruDogru({A:B,yon:−aciB},{A:C,yon:180+aciC}); ağırlık merkezine taşı; donme=rng.tam(0,359) ile ilerle(merkez, yonAci(merkez,P)+donme, uzaklik) döndür. Prototipik duruş = bir kenar yönü 0/90/180/270'e ±TOLERANS.aciOkuma içinde → yalnız donme yeniden (≤100). Test 1000 seed: disBukeyMi, ucgenTuru istenen türü verir, prototipik duruş yok.
kesisimGarantiliParametre(rng, tur) → {r1,r2,AB} tam sayı: eps=TOLERANS.kesisimEps·min(r1,r2); esik=TOLERANS.uzunlukOran·max(r1,r2,AB). eskenar r1=r2=AB=rng.tam(120,320). ikizkenar r1=r2=rng.tam(120,320), AB=rng.tam(floor(eps)+1, ceil(2r1−eps)−1), |AB−r1|>esik olana dek. cesitkenar r1,r2=rng.tam(120,320) |r1−r2|>esik; AB=rng.tam(floor(|r1−r2|+eps)+1, ceil(r1+r2−eps)−1), AB iki yarıçaptan >esik uzak olana dek. Geçersiz tur → PARAMETRE_ARALIK_DISI. Test: {merkez:{0,0},r:r1},{merkez:{AB,0},r:r2} → kesisimCemberCember tam 2 nokta, 3 tür×1000 seed.
rastgeleCemberParametre(rng) → Cember: IZGARA_ADIM=50; bölge x∈[−300,300], y∈[−200,200]; ızgara dışı = en yakın ızgara çizgisine >7 birim: x=rng.tamHaric(−300,300,[−300,−250,…,300],7), y=rng.tamHaric(−200,200,[−200,…,200],7), r=rng.tam(120,320). Test 1000 seed: |x%50|,|y%50| ∈[8,42].
lazerSenaryosu(rng) → {mod:rng.sec(['parca','isin','dogru']), sensor: 2–4 nokta, alarm: 1–2 nokta}; noktalar aynı bölge/ızgara dışı kuralıyla, ikişer uzaklık ≥40 (aksi yeniden, ≤100).
RNG · seedUret imzası: export function seedUret(duzenekId, tekrarSayaci, zaman = Date.now()); JSDoc @param {number} [zaman]; gövdedeki 'an' üç-yollu satır kalkar. haricSec döngü sonuna throw new Error('PARAMETRE_ARALIK_DISI') ekle. Test: seedUret('D01',2) uint32 tam sayı; seedUret('D01',2,1700000000000)===hash32('D01:2:1700000000000').

Karar: GEÇTİ · ekleyici, mini kontrol gerekmez · sözleşmeye §3.2.2 olarak girer (4 Kas sabah toplusu)

--- CX-M ---

Uygulandı: `cx-m/K-01-geo-rng` dalı; [PR #3 (taslak)](https://github.com/prgrm03-cmd/matik-at-lyesi/pull/3).
Geometri/RNG ve Node test kaynakları tamamlandı; 76 V8 test gövdesi geçti.
Node 20 sonucu alınmadan PR hazır işaretlenmez; main'e birleştirilmez.
