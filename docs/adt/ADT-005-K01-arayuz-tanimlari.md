# ADT-001 · K-01 geometri arayüzlerinin eksik tanımları

Tarih: 2 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: K-01 · Tür: ekleyici

Durum: karar bekliyor. Depoda mevcut ADT bulunmadığından 001 önerilmiştir;
kesin numarayı Matematikçe verir (§11.2). Sözleşme metni değiştirilmemiştir.

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

Ön karar: bekleniyor; numara ve sınıflandırma teyit edilmedi.

--- CX-M ---

Uygulandı: arayüz kararı uygulanmadı; yalnız ADT ve bağımsız işler
`cx-m/K-01-geo-rng` dalında hazırlanır. K-01 tamamlanmış değildir.
Sözleşme sürümü değiştirilmedi; PR açılmadı.

--- Fable (yalnız bozucu/tolerans) ---

Karar: verilmedi; mevcut tüketicileri etkileyen bir karar çıkarsa mini kontrol gerekir.
