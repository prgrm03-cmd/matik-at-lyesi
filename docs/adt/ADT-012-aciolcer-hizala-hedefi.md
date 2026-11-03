# ADT-012 · Açıölçer hizala() hedefi

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem · **Düzenek/bilet:** K-05 / PR #8 (84f4aa2) · **Tür:** düzeltici · **Durum:** BAĞLAYICI

## Bağlam
Widget sözleşmesi açıölçer için parametresiz `hizala()` tanımlıyor; ama "neye hizalanacağı" sözleşmede yok. Kod gerçeği şu: başlangıç hedefi `{soket: ayar.soket, yon: 0}`; `hizaliMi(soket, baslangicYon)` her çağrıda `durum.hedef`'i bu değerlerle günceller; `hizala()` ise `merkez = hedef.soket`, `donus = hedef.yon`, `secim = null` yapar. Yani `hizala()`'nın hedefi, son `hizaliMi` çağrısından (veya hiç çağrılmadıysa başlangıç hedefinden) gelir. Bu, örtük bir sözleşme olarak çalışıyor ama belgelenmemiş; ayrıca gözden geçirmede "sorgu metodunda yan etki" notu düşüldü: `hizaliMi` bir sorgu (bool döner) ama yazıyor.

## Karar
1. `hizala()` **parametresiz kalır** (`hizala.length === 0` sözleşme gereği). Hedefi `durum.hedef`'tir; `durum.hedef` başlangıçta `{soket: ayar.soket, yon: 0}`'dır ve yalnızca `hizaliMi(soket, baslangicYon)` tarafından yazılır. Bu ilişki sözleşmeye açıkça yazılır.
2. `hizaliMi`'nin `durum.hedef` yazması **kabul edilen, sınırlı bir istisnadır**. Gerekçe: `hedef` bir "son sorulan soru" kaydıdır, widgetın görünür durumu değildir; `hizaliMi`'nin dönüş değeri önceki `hedef`'e bağlı değildir (aynı argümanla ardışık çağrılar aynı sonucu verir); `hedef` yazımı `merkez / donus / secim`'i değiştirmez. Bu üç koşul bozulursa istisna düşer ve ayrı ADT gerekir.
3. `durum()` çıktısı **değişmez**: `hedef` `durum()`'a eklenmez. `hedef` dış dünyaya yalnızca `hizala()`'nın etkisi üzerinden görünür; doğrulama `hizala()` sonrası `durum().merkez / durum().donus / durum().secim` ile yapılır. (Gerekçe: `durum()` anlık görüntü testlerinde kullanılıyor; alan eklemek tüm düzenek anlık görüntülerini kırar ve "hedef"i yanlışlıkla kalıcı durum sayar.)
4. `hizala(soket?, yon?)` isteğe bağlı genişletme **serbesttir, zorunlu değildir**. Uygulanırsa: argüman verilirse önce `durum.hedef` güncellenir, sonra hizalanır; verilmezse 1. madde geçerli; `hizala.length` 0 kalır (varsayılanlı parametre ya da `arguments` üzerinden). PR #8 bu genişletmeyi içermiyorsa eklemek zorunda değil.
5. `hizala()` sonrası `secim = null` sözleşmeye "hizala seçimi temizler" olarak yazılır; bu bir yan etki değil, tanımın parçasıdır.

## Uygulayıcının izleyeceği kural
1. `durum.hedef` yalnızca iki yerde yazılır: fabrika başlangıcı (`{soket: ayar.soket, yon: 0}`) ve `hizaliMi`. Başka hiçbir metot (`ciz`, `girdi`, `surukle`, `hizala` dâhil) `hedef`'e dokunmaz.
2. `hizaliMi` yalnızca `durum.hedef`'i yazar; `merkez`, `donus`, `secim` ve `durum()`'da görünen hiçbir alanı değiştirmez. Birim testi: `hizaliMi` öncesi ve sonrası `durum()` derin-eşit.
3. `hizaliMi` saf sorgu gibi test edilir: aynı `(soket, yon)` ile iki ardışık çağrı aynı bool'u döner; farklı sıra ile çağrılar sonucu etkilemez.
4. `hizala()` davranışı: `merkez = hedef.soket`, `donus = hedef.yon`, `secim = null`. Hiç `hizaliMi` çağrılmadan `hizala()` → `{ayar.soket, 0}`. Her ikisi için sözleşme testi yazılır.
5. `hizala.length === 0` imza testi korunur; `hizala(soket?, yon?)` eklenirse varsayılanlı parametre kullanılır, zorunlu parametre açılmaz.
6. `durum()` çıktısına `hedef` eklenmez; eklemek isteyen ayrı ADT açar.
7. Sözleşme metnine "hedef" kavramı ve 2. maddedeki üç koşul (hedef görünür durum değildir / hizaliMi sonucu hedefe bağlı değildir / hedef yazımı görünür durumu değiştirmez) Hakem tarafından yazılır; uygulayıcı sözleşmeyi değiştirmez.

## Etkilenen dosyalar / bilet
- `widget/aciolcer.js` (PR #8, 84f4aa2) — `hedef` yazım noktaları, `hizala()`; kod değişikliği gerekmez, test eklenir
- `test/aciolcer.test.js` — kural 2, 3, 4 testleri (PR #8 içinde)
- `docs/sozlesme_v1.md` §3.3 — açıölçer bölümü: "hedef", "hizaliMi hedef kaydı istisnası", "hizala seçimi temizler" (Hakem yazar)
- K-05 (PR #8) — "sorgu metodunda yan etki" gözden geçirme notu bu ADT ile kapanır
