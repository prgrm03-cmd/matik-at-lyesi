# ADT-004 · Motor iç sınırları, DOM istisnaları ve kayıt zamanı

Tarih: 2 Kasım 2026 · Yazan: CX-M · Düzenek/bilet: D01 / K-02
Tür: ekleyici (açıklık talebi; sınıflandırma karar bekliyor)
Durum: açık; numara geçicidir, Matematikçe kesinleştirir.

İstenen: Motor iç bağlantı metotlarının genel Ctx API'sinden ayrımı,
giriş ve köprü için zorunlu DOM erişimleri ve kayıt oluşturma
zamanının kaynağı açıkça tanımlansın.

Neden: §5.2 yalnız `sahne.js` ve `giris.js` için DOM erişimi
öngörürken §10.4 `kopru.js` içinde `document.referrer` ve
`window.parent.postMessage` ister. §3.1.4 `baslat` çağrısına
HTMLElement verilmesini, §1 ise `main.js` dosyasının yalnız
`baslat` çağırmasını ister. DOM kökünü seçen başlangıç erişiminin
lint sınırı açık değildir.

Sözleşmede var mı? Var ama yetersiz veya çelişkili:
- K-02, köprüde referrer kökenine dışa bildirim yapılmasını açıkça
  tekrarlar. Bu erişim §5.2'de istisna olarak sayılmamıştır.
- §3.1.2 genel Sahne API'sini tanımlar; sahne oluşturma, çizim
  kuyruğunu tamamlama, hedef listesi, olay bağlama ve temizleme gibi
  motor iç bağlantı imzalarını listelemez.
- §5.1 `Date.now()` kullanımını `seedUret` içine sınırlar;
  §5.3 ise `Kayit.olusturma` için `Date.now()` ister. Zamanın
  kayıt metadatası olarak kullanılması rastgelelik değildir; yine
  de açık bir istisna veya kaynak tanımı gerekir.

Etkilenen dosyalar: `main.js`, `motor/motor.js`,
`motor/sahne.js`, `motor/giris.js`, `motor/kopru.js`,
`motor/kayit.js`; K-04'te ilgili lint kapsamı. K-01 RNG
dosyasına bu bilette değişiklik yapılmaz.

Geçici çözüm: K-02'nin açık köprü talimatı uygulanır; arayüz DOM
işlemleri sahne/giriş katmanında tutulur. Motor iç oluşturma,
çizimi bitirme ve olay temizleme yardımcıları düzeneğe verilen
`ctx.sahne`, `ctx.widget` veya `ctx.defter` nesnelerine yeni
genel metot olarak eklenmez. `ctx.durum` genel API'si genişletilmez.
Kayıt zamanı §5.3'te açıkça istenen `Date.now()` ile üretilir;
rastgelelik kaynağı olarak kullanılmaz. Yeni kayıt alanı veya
cihaz kimliği eklenmez. §5.1 kısıtı için bu istisnanın sözleşmede
netleştirilmesi bekler.

Alternatif: Köprüyü tamamen giriş dosyasına taşımak K-02'nin dosya
sorumluluğunu değiştirir. İç yardımcıları genel Sahne API'sine
eklemek de düzenek imzasını gereksiz yere büyütür. Kayıt zamanını
sabit veya sahte tarihle doldurmak §5.3 anlamını karşılamaz.

--- Matematikçe ---
Ön karar: bekliyor; geçici ADT numarası ve kapsam kesinleştirilecek.
Bu kayıt bir onay değildir. İç yardımcılar için ayrı bir genel
düzenek API'si önerilmemektedir.

--- CX-M ---
Uygulandı: `cx-m/K-02-motor` dalında K-02'nin açık modül
görevleri; genel motor/düzenek imzaları korunur.
PR bağlantısı teslimde eklenir.
Sözleşme notu: v1.0-taslak; sözleşme dosyası değiştirilmedi.
§5.3 kayıt zamanı uygulanır; §5.1 istisnasının sözleşmede
netleştirilmesi bekler.

--- Fable (yalnız bozucu/tolerans) ---
Karar: bekliyor. Mevcut genel API veya kayıt alanının anlamı
değişirse bozucu etki değerlendirilmelidir.
