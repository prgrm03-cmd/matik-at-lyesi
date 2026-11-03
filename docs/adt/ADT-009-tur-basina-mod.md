# ADT-009 · Çok turlu düzenekte tur başına mod seçimi

**Tarih:** 4 Kas 2026 · **Yazan:** Hakem · **Düzenek/bilet:** G-01 D02 · **Tür:** düzeltici (bilet metni askıya alınır) · **Durum:** BAĞLAYICI

## Bağlam
Motor her turda `ctx.durum = {}` ve `ctx.rng = rngOlustur(alt('tur'+tur).seed)` kurar; düzeneğe ana seed ya da tur-arası hafıza verilmez. Bilet "her turda farklı mod (`rng.karistir`)" ister; bu mevcut API'de garanti edilemez (turlar bağımsız rng ile karıştırır, mod tekrar edebilir).

## Karar
v1'de mod **`ctx.tur`'dan sabit döngüyle** seçilir; `lazerSenaryosu`'nun `mod` alanı yok sayılır (rng tüketimi korunur, sensör/alarm üretimi değişmez). Seed'e bağlı permütasyon v1 kapsamı dışıdır; istenirse motor değişikliği gerektirir ve **K-03** sahiplenir.

## Uygulayıcının izleyeceği kural
1. `const MOD_SIRASI = ['parca', 'isin', 'dogru'];` (modül düzeyi `const` sabit).
2. `kur`: `const senaryo = ctx.geo.lazerSenaryosu(ctx.rng);` çağrısı **aynen** kalır (rng akışı değişmesin). Ardından `ctx.durum.mod = MOD_SIRASI[ctx.tur % MOD_SIRASI.length];`. `senaryo.mod` kullanılmaz; `karistir`, `oncekiModlar`, `|| senaryo.mod` dalları kaldırılır.
3. `ctx.widget.lazer({ mod: ctx.durum.mod })` bu değerle kurulur. `ctx.tur` tanımsızsa (`kuru.js` sahte ctx) `0` sayılır: `(ctx.tur || 0)`.
4. Üç tur → `parca`, `isin`, `dogru`; farklılık yapısal olarak garantidir; sıra tüm seed'lerde aynıdır (v1 kabulü).
5. `kuru.js` (Matematikçe): sahte ctx'te `tur: 0` açıkça verilir; isteğe bağlı `--tur 1|2` denetimi K-03'e not.
6. Seed-bağımlı sıra istenirse (v2): motor `ctx.kokRng = rngOlustur(oturum.seed).alt('duzenek')` verir (K-03 sahibi); D02 o zaman 2. maddeyi tek satırla `ctx.kokRng.karistir(MOD_SIRASI)[ctx.tur]` yapar. Bu ADT olmadan düzenek kendi rng'sini kurmaz.

**Erteleme notu (Matematikçe, 3 Kas):** Seed'e bağlı mod sırası (`ctx.kokRng`) G-01 kapsamında uygulanmaz; sonraki bir motor biletine ertelenmiştir. K-03 birleşmiş olduğundan sahiplik yeni motor biletinde belirlenir.

**Koordinat notu:** `karistir` kaldırılınca rng tüketimi değişti; seed 42 tur 0 kuru uç noktaları tezgâh uzayında (342,659)/(640,423)'tür (Gemini teslim v3).

## Etkilenen dosyalar / bilet
`duzenekler/D02/D02.js` (`kur`), G-01 bilet metni ("rng.karistir" ibaresi askıda); `araclar/kuru.js` sahte ctx `tur:0` (K-03); v2 için motor/`baglam.js` (K-03, henüz açılmadı).

