# ADT-003 · Araç açma sırası ve klavye döndürme

Tarih: 2 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: D01 / K-02
Tür: ekleyici (öneri; sınıflandırma karar bekliyor)
Durum: açık; numara geçicidir, Matematikçe kesinleştirir.

İstenen: Öğrenci modunun başlangıç açıkları, araç açılma koşulları,
araç harflerinin fabrika adlarıyla eşlemesi ve seçili aracı klavyeyle
döndürme protokolü tanımlansın.

Neden: `ilerleme.js` yıldız, kilit ve araç sırasından sorumludur;
ancak açılma eşikleri verilmemiştir. §10.2'de R/E tuşları açıölçer
ve pergeli bir derece döndürür; §3.1.3 `Olay` tipinde tuş veya
dönüş değeri yoktur ve §3.3 ortak widget arayüzü döndürme metodu
tanımlamaz.

Sözleşmede var mı? Var ama yetersiz:
- §3.1.1 yalnız `araclar.kemer` ve `araclar.kilitli` dizilerini;
  §5.3 yalnız `ilerleme.aciklar` kaydını ve pilot modunda Robot
  Kolu'nun ilk araç olacağını belirtir.
- §4.3 `arac` için A–H harflerini kabul eder; tam fabrika eşlemesi
  ve tamamlanma eşiği yoktur. K-06'daki C harfi de Matematikçe
  doğrulamasına bırakılmıştır.
- §10.2 tuşları sürükle/tik olayına çevirmeyi ister; dönüş merkezi,
  tutamaç seçimi ve açıölçer/pergel için ortak uyarlama kuralı yoktur.

Etkilenen dosyalar: `motor/ilerleme.js`, `motor/giris.js`,
`motor/motor.js`; ileride `widget/aciolcer.js` ve
`widget/pergel.js`. Düzeneklerin genel `Olay` imzası etkilenebilir.

Geçici çözüm: K-02'nin görünür kapsamı yalnız D01'dir. Mevcut
açıklar korunur; yeni yıldız eşiği, gizli A–H eşlemesi veya pilot
sırası uydurulmaz. Tahta tüm görünür düzenekleri açar; ölçü kilidi
§4.2/7 uyarınca korunur. D01 pimleri Tab ve ok tuşlarıyla
kullanılabilir; Enter ve ipucu kısayolu tanımlı motor komutlarıdır.
K-02 widget fabrikaları zaten `IMZA_EKSIK` yer tutucularıdır;
R/E ile gerçek araç döndürme sonraki widget entegrasyonuna bağlıdır.

Alternatif: Doğrudan widget iç durumuna yazmak ortak arayüzü aşar;
uydurulmuş `olay.tus` veya `olay.donus` alanı eklemek de imzayı
değiştirir. İmzayı değiştirmeden çözüm seçilecekse dönüş tutamacına
çevrilen mantıksal sürüklemenin ortak kuralı önce belgelenmelidir.

--- Matematikçe ---
Ön karar: bekliyor; geçici ADT numarası, araç eşlemesi ve açılma
politikasının sahibi kesinleştirilecek. Bu kayıt bir onay değildir.

--- CX-M ---
Uygulandı: `cx-m/K-02-motor` dalında D01 kapsamı ve mevcut kilit
kuralları; yeni açılma eşiği veya klavye alanı uygulanmadı.
PR bağlantısı teslimde eklenir.
Sözleşme notu: v1.0-taslak; sözleşme dosyası değiştirilmedi.

--- Fable (yalnız bozucu/tolerans) ---
Karar: bekliyor. Mevcut `Olay` veya widget arayüzü değişirse
etki ve tür yeniden değerlendirilecek.
