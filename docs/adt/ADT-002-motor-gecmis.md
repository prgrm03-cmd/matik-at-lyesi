# ADT-002 · Motor geçmişi ve tur alt akışı

Tarih: 2 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: D01 / K-02
Tür: ekleyici (öneri; sınıflandırma karar bekliyor)
Durum: açık; numara geçicidir, Matematikçe kesinleştirir.

İstenen: Geçmişin düzeneğe hangi anda ve hangi arayüzle verileceği,
gerçekleşen ana parametrenin motora nasıl bildirileceği ve tur alt akış
etiketi tek biçimde tanımlansın.

Neden: Sözleşme §3.1.1 motorun `ctx.durum` içine yazmasını yasaklar ve
`kur` öncesi boş nesne ister. §4.2/6 ve §5.1 ise motorun
`durum.gecmis` sağlamasını ister. §4.4'te düzenek `kur` içinde durumu
yeniden oluşturur. Bu yüzden kur öncesi eklenen geçmiş kaybolabilir; kur
sonrası eklenen geçmiş de parametre üretimi için geç kalır.

Sözleşmede var mı? Var ama çelişkili:
- §5.1 kayıt yolunu `kayit.son5[duzenekId]` diye anlatır; §5.3'teki
  gerçek şema `kayit.duzenekler[id].son5` biçimindedir.
- §5.1 ana parametreyi JSON `parametreler` nesnesinin ilk anahtarıyla
  belirler; üretilmiş değerin `durum` içindeki yolu veya bildirim
  arayüzü tanımlanmamıştır.
- §3.1.4 tur alt akışını `rng.alt('tur'+tur)`, §5.1 ise
  `rng.alt('tur:'+tur)` olarak tanımlar. Aynı seed için farklı
  sahneler üretirler. K-02 doğrudan §3.1.4'e atıf yapar.

Etkilenen dosyalar: `motor/motor.js`, `motor/kayit.js`,
`duzenekler/D01/D01.js`; sonraki çok turlu düzenekler ve
`motor/ctxSahte.js`. K-01 `motor/rng.js` imzası değişmez.

Geçici çözüm: K-02 kapsamındaki D01 tek turludur ve geçmişe bağlı
parametre seçmez; kendi durumunda boş geçmiş tutabilir. Kayıt §5.3
şeklini korur. Motor, tanımsız bir `durum` yolundan ana değer
çıkarmaz ve geçmişi doldurduğunu iddia etmez. Tur akışında K-02'nin
atıf yaptığı §3.1.4 etiketi kullanılır; §5.1 ile uyum kararı bekler.

Alternatif: Geçmişi `kur` öncesinde gizlice duruma eklemek veya
`kur` sonrasında düzeltmek iki bölümden birini ihlal eder. Yeni
zorunlu durum alanı veya kayıt şeması tahmin edilmez. Geçmiş kullanan
düzenek entegrasyonundan önce tek aktarım protokolü kararlaştırılmalıdır.

--- Matematikçe ---
Ön karar: bekliyor; geçici ADT numarası ve türü kesinleştirilecek.
Bu kayıt bir onay değildir.

--- CX-M ---
Uygulandı: `cx-m/K-02-motor` dalında yalnız yukarıdaki geçici
çözüm; yeni geçmiş API'si uygulanmadı. PR bağlantısı teslimde eklenir.
Sözleşme notu: v1.0-taslak; sözleşme dosyası değiştirilmedi.

--- Fable (yalnız bozucu/tolerans) ---
Karar: bekliyor. Alt akış etiketi veya mevcut durum sözleşmesi
değişecekse bozucu etki değerlendirilmelidir.
