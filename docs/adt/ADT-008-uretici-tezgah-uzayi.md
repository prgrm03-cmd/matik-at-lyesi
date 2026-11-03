# ADT-008 · Üretici uzayı ↔ tezgâh uzayı (D02 ve sonrası)

**Tarih:** 4 Kas 2026 · **Yazan:** Hakem · **Düzenek/bilet:** G-01 D02 (geçerlilik: tüm `geo/uretici.js` tüketicileri) · **Tür:** ekleyici (açıklık) · **Durum:** BAĞLAYICI

## Bağlam
§0 tezgâhı 1000×1000, orijin sol-üst, y aşağı tanımlar. ADT-005 ise üreticileri (`rastgeleCemberParametre`, `lazerSenaryosu`) x∈[−300,300], y∈[−200,200] bölgesinde, yani merkez orijinli üretir. İki uzay yazılı olarak bağlanmamıştı; `Sahne`'de öteleme API'si yoktur ve şu an motor değişikliği yoktur.

## Karar
İki uzay vardır: **üretici uzayı** (merkez orijinli, y aşağı, ölçek 1) ve **tezgâh uzayı** (§0). Dönüşüm yalnız **öteleme** `(+500, +500)`'dür ve **düzenekte, `kur` içinde, tek yerde** yapılır. Sahne öteleme yapmaz. Düzenek üretici çıktısı dışında her şeyi tezgâh uzayında görür/çizer/olay alır.

## Uygulayıcının izleyeceği kural
1. Düzenek modül düzeyinde `const TEZGAH_MERKEZ = { x: 500, y: 500 };` tanımlar (§0'dan türetilmiş adlandırılmış sabit; sihirli sayı sayılmaz; `let/var` yasağı `const` sabite uygulanmaz).
2. `kur`: `lazerSenaryosu(ctx.rng)` sonucundaki her `sensor`/`alarm` noktası `{ x: P.x + TEZGAH_MERKEZ.x, y: P.y + TEZGAH_MERKEZ.y }` ile taşınır ve `ctx.durum`'a **yalnız tezgâh uzayında** yazılır. Üretici uzayındaki ham noktalar durumda tutulmaz.
3. `ciz`, `girdi`, `calistir`, `basari`, `ipucu`, `vurgula`, `etiket`, `lazer.gecerMi` ve widget pim konumları: tümü tezgâh uzayı. Motor olayları (`x, y`) tezgâh uzayıdır; düzenek geri dönüşüm yapmaz.
4. y ekseni her iki uzayda aşağı; ölçek değişmez; ızgara/uzaklık değişmezleri (≥40, ızgara dışı) ötelemeden etkilenmez.
5. `Dxx.kuru.json` olay koordinatları **tezgâh uzayında** yazılır; yorum satırı yerine `"not"` alanında üretici koordinatı belirtilebilir.
6. Aynı kural D17/D18 (`rastgeleCemberParametre`, `kesisimGarantiliParametre`) için de geçerlidir; `geo/` değişmez. İleride ortak yardımcı (`tezgahaTasi(P)`) istenirse `geo/nokta.js`'e K-01 ek bileti ile girer; o zamana dek düzenek içi.

## Etkilenen dosyalar / bilet
`duzenekler/D02/D02.js` (`kur`), `duzenekler/D02/D02.kuru.json` (G-01, teslim 2); `docs/sozlesme_v1.md` §3.2.2 not satırı (Fable/Matematikçe); D17/D18 biletlerine atıf.

