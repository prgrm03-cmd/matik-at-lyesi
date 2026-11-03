# ADT-006 · K-03 kuru koşu ve lazer iç bağlantıları

Tarih: 3 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: K-03
Tür: ekleyici (açıklık) · Durum: açık; aşağıdaki geçici çözümler uygulanır.

İstenen: K-03 biletindeki çelişen JSON sayısı, lazer fabrikasının iç
bağlantısı ve seed denetiminin gözlem yolu açıkça kaydedilsin.

Neden: Sözleşme §4.3 ve K-03 “20” JSON der; ancak açık kimlik listesi
25 dosyadır. §3.3 fabrika dışa aktarım adını, ilk pim durumunu ve çark
olay hedefini belirtmez. §6.2/8 parametre denetimi ister; ADT-002 üretilen
değerlerin durum içindeki yolunu ve geçmiş aktarımını açık bırakır.

Sözleşmede var mı? §3.3, §4.3, §6.4 ve K-03'te var ama aşağıdaki
ayrıntılar yoktur. ADT-005'in onaylı geometri kararları değiştirilmez.

Etkilenen dosyalar: motor/ctxSahte.js, sahteSahne.js, sahteKayit.js,
baglam.js; widget/lazer.js; araclar/kuru*.js, seed*.js, semaDogrula.js;
iskelet.js; ilgili testler, package.json ve .github/workflows/test.yml.

Geçici çözüm:

1. İskelet üretici açık listenin tamamını üretir: D01–D08 (8),
   D09a–f (6), D10a–b (2), D11/D12/D12b (3), D13–D18 (6): 25.
   Var olan dosyalar exclusive-create ile korunur. Üretilmiş düzenekler
   commit edilmez, docs/kapsam.json'a eklenmez. Metinler TODO-R1 kalır.
   ADT-003'teki A–H eşlemesi beklediğinden bilinmeyenler A/false teknik
   yer tutucusudur; bunun pedagojik eşleme olduğu iddia edilmez.
   Bilette açıkça tanımlı D09 için C/true kullanılır. Kart sayısı sıfır,
   tur sayısı bir, diğer bayraklar false olur.
2. Motor içi fabrika lazerOlustur(ayar, sembol) adını kullanır. İkinci
   parametre K-03 isteminde açıkça istenir; LazerAyar'a alan eklenmez.
   Motor fabrikayı giriş kuyruğuna kaydeder; sahte ctx aynı gerçek
   fabrikayı kullanır. Mod varsayılanı parca, donenIsin false,
   carkAdim 1 (pozitif tamsayı); A/B başlangıçta null, yon sıfır.
   donenIsin yalnız isin ile kullanılır; bu halde A ve yon ışını
   belirler. Normal modlarda iki farklı pim gerekir.
   Çark hedefi lazerCark; dx * carkAdim yöne eklenir, tam dereceye
   yuvarlanır ve normalize edilir. A/B hedefleri biletteki lazerA/lazerB.
   tolBirim doğruya dik uzaklığa uygulanır; parça/ışın uç sınırları
   uzatılmaz. durum/yukle yalnız mod, A, B, yon değerlerini kopyalar;
   ayarlar ve sürükleme yakalaması kalıcı duruma eklenmez.
3. Sahte sahne mantıksal 1000×1000 ve ölçek 1 kullanır; her metot
   çağrısını anlık argüman kopyasıyla kaydeder. temizle kayıt defterini
   silmez. hayalet çizicisini çalıştırır. Kilitteki sayi çağrıları da
   sayılır; gerçek sahnenin sessiz çizim yasağı denetimden kaçmaz.
   Bekleyen fabrikaların Error('IMZA_EKSIK') nesneleri modül içi
   WeakSet ile işaretlenir. Yalnız bu hatalar atlanır; bozuk imza veya
   bozuk sonuç aynı kodu taşısa da kırmızıdır.
4. Kuru koşu iç gözlem kaydı geo çağrılarının ad/arg/sonuc/asama
   alanlarını, tamHaric girdileri ve sonucunu, oluşturulmuş tabloları
   ve rafları tutar. Sarmalayıcılar gerçek işlevlere delege eder;
   Ctx veya düzenek dışa aktarımlarına yeni alan eklenmez.
   D01 parametre adaptörü mevcut pimler dizisindeki başlangıç x/y
   değerlerini konum aralığına karşı denetler. Yeni düzenekte parametre
   varsa ve adaptörü yoksa kuru koşu sürer; CLI "denetimsiz" uyarısı
   verir, seed özeti parametreDenetimsiz listesinde kimliği bir kez tutar.
   Bu parametrelerin denetlendiği iddia edilmez; başka ihlaller yine
   hatadır. Fable'ın PR #4 incelemesinden iletilen zorunlu düzeltme
   uygulanır (3 Kasım). Varsayılan durum alanı uydurulmaz.
   Halka tampon denetimi tamHaric çağrısının gerçek haric/komsuluk
   girdilerini denetler. Motorun kayıttan geçmiş aktarımı hâlâ ADT-002
   kapsamındadır; bu PR onu çözülmüş saymaz.
   D13 son sahnenin çokgeni; D14 köşe sayısı ve genel tablo nesnesi;
   D12b genel ayniKartaKoy arayüzü; D17/D18 gerçek çember/kesişim
   gözlemleri denetlenir. Gerekli gözlem yokluğu başarı sayılmaz.
   Prototipik duruş ölçütleri yalnız ADT-005 üreticilerine uygulanır;
   rastgeleYon'un 0…359 aralığı daraltılmaz.
5. Node araçlarının iç yardımcıları iskeletVerisi(id),
   iskeletOlustur(kok), veriDogrula(veri), semaDogrula(kok) ve kuru/seed
   yardımcılarıdır; düzenek API'si değildir. İskelet CLI isteğe bağlı
   çıktı kökü alır; testler geçici klasörde çalışır. *.kuru.json şema
   taraması dışındadır; kuru olay dosyası en çok 2 kB'dir.
   sema.json §4.3'ten birebir alınır; çapraz kurallar ayrı uygulanır.
6. Node 20 doğrulaması için PR dalında GitHub Actions npm test,
   npm run sema ve npm run seed çalıştırır. npm run check'in diğer
   aşamaları K-04 kapsamındadır; bu PR onları yeşil göstermeyecektir.

Alternatif: 25 kimliğin beşini çıkarmak teslim listesini eksiltir.
Yeni zorunlu durum alanları ADT-002'yi gizlice çözer. Denetlenmeyen
parametreleri sessizce denetlenmiş saymak seed raporunu yanıltır.
Bu yollar uygulanmaz.

--- Matematikçe ---
Ön karar: bekliyor; kayıt Fable onayı anlamına gelmez.

--- CX-M ---
Uygulandı: cx-m/K-03-sahte-seed; yukarıdaki iç bağlantılar ve geçici
çözümler. Sözleşme gövdesi, RNG ve geometri imzaları değiştirilmez.
Fable'ın devrettiği etiketler notu §4.3'e doğrudan uyularak kapatılır:
motorun eksik etiketli kontrolleri gizlenir; açık sahne çağrıları
bilinmeyen anahtarda hata vermeyi sürdürür.
D01 R1/tam düzenek bileti gelene kadar tamam:false/yarimKaldi döner.

--- Fable (yalnız bozucu/tolerans) ---
Karar: bekliyor; bu belge onay veya sözleşme sürümü artışı ilan etmez.
