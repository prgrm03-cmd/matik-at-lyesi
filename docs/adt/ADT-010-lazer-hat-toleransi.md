# ADT-010 · Lazer hattı toleransı (birim tabanlı hüküm + pim yapışması)

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem · **Düzenek/bilet:** D02 / GM-D PR #6 (f0162a3); CX-M yeni bilet "ADT-010 hatBirim + snap" · **Tür:** düzeltici · **Durum:** BAĞLAYICI

## Bağlam
D02, hat–nokta geometrik kontrolünü (`lazer.gecerMi`) `pxToBirim(pimYakalamaPx)` ile yapıyor. `olcek = 1000/genislik` olduğundan tolerans cihaza göre 8–50 birim arasında oynuyor; 360 px'te ≈44, 320 px'te ≈50 birim → `EN_AZ_ARALIK = 40` aşılıyor. Doğru kurulmuş hat alarmı "geçer" sayabiliyor ve aynı seed farklı cihazda farklı sonuç veriyor. Px toleransı yalnız dokunma/yakalama içindir (`motor/giris.js` doğru kullanıyor); geometrik hükme sızması hatadır. Tahtada (≈8–16 birim) sorun görülmez.

## Karar
**Seçenek (c):** sabit birim toleransı + pimin sensöre yapışması (snap). (b) üretim uzayını daraltmak reddedildi: kök nedeni (px'e bağlı hüküm) gidermez.

- `geo/tolerans.js` içine **`hatBirim: 12`** eklenir (tezgâh birimi, px dönüşümü yok). `hatBirim` tek kaynaktan okunur; D02 içinde yeniden tanımlanmaz.
- **Değişmez (I-010):** `2 · TOLERANS.hatBirim < EN_AZ_ARALIK` → 24 < 40. İkisi birlikte değişir; değişmez testle korunur.
- Pim, bırakıldığında bir sensöre/hedefe `pimYakalamaPx` içindeyse **tam koordinatına yapışır** (sapma 0). Sensör doğrusu kesin olur; alarm uzaklığı ≥ 40 > 12 → yanlış "geçer" imkânsız.
- Düzenekler (D02 dâhil) geometrik hükümde `pxToBirim` **kullanamaz**; px → birim dönüşümü yalnız `motor/giris.js`'te yapılır.

## Uygulayıcının izleyeceği kural
1. **CX-M (önce):** `geo/tolerans.js` → `hatBirim: 12`; `geo/uretici.js` → `EN_AZ_ARALIK` yanına I-010 yorumu ve `assert(2 * TOLERANS.hatBirim < EN_AZ_ARALIK)`.
2. **CX-M:** `motor/giris.js` → bırakma anında yakalama varsa pim konumu hedefin tam koordinatına atanır; `pimYakalamaPx` olduğu gibi kalır.
3. **CX-M:** `widget/lazer.js` → `gecerMi(noktalar, tol)` imzası değişmez; belgesine "tol birim cinsindendir" notu.
4. **GM-D (CX-M birleşince):** `duzenekler/D02/D02.js` `toleransBirim` → `return ctx.geo.TOLERANS.hatBirim;` Diğer kullanım satırları aynen bu değeri alır; D02 içinde `pxToBirim` çağrısı kalmaz.
5. Sözleşme: "Düzenek API" bölümüne **T-3** maddesi (Hakem yazar): *"Px tabanlı toleranslar (`pimYakalamaPx`, `capCubuguPx`) düzenek geometrik hükmünde kullanılamaz; düzenek yalnız birim toleransları (`hatBirim`, `kesisimEps`, …) alır."*
6. Sıra: CX-M bileti → PR #6 güncellenir → GM-D tek satır düzeltme → Hakem onayı → birleşme.

## Testler
- **Değişmez:** `2*hatBirim < EN_AZ_ARALIK` geçer; `hatBirim` 20'ye çekilince test kırılır.
- **gecerMi:** sensör doğrusundan 40 birim uzak alarm, tol=12 → `false`; sensörler (uzaklık 0) → `true`; 11.9 → `true`, 12.1 → `false`.
- **Snap (`motor/giris.js`):** genişlik 360: sensörden 15 px bırakılan pim → koordinat sensöre tam eşit; 17 px → yapışmaz. Aynısı 320 ve 1920 px'te.
- **Seed:** seed 1..500 × genişlik {320, 360, 1080, 1920}: sensörlerden hat kur, `gecerMi(sensorler)=true`, `gecerMi(alarmlar)=false`; dört genişlikte sonuç bit-bit aynı.
- **Statik:** `duzenekler/**` içinde `pxToBirim` çağrısı yok (grep testi).

## Etkilenen dosyalar / bilet
`geo/tolerans.js`, `geo/uretici.js`, `motor/giris.js`, `widget/lazer.js` (belge notu) — **CX-M**, yeni bilet "ADT-010 hatBirim + snap" (D02'nin `docs/kapsam.json`'a eklenmesi aynı bilette). `duzenekler/D02/D02.js` — **GM-D**, PR #6 düzeltmesi (CX-M'e bağımlı). Sözleşme T-3 — Hakem.
