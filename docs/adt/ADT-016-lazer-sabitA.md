# ADT-016 · LazerAyar.sabitA (lazer kafası sabit)

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem (Matematikçe yazar) · **Düzenek/bilet:** K-10e (bağlantılı G-02b/G-02c, D03) · **Tür:** ekleyici · **Sözleşme:** v1.0.x · **Durum:** BAĞLAYICI

## Bağlam
D03 Dönen Işın'da lazer kafası kapağa vidalıdır: A öğrenciye sürüklenebilir olmamalı. `widget/lazer.js` `hedefGecerli` `lazerA`'yı her modda sürüklenebilir sayar; widget olayı önce tükettiği için D03 `girdi` içinde A'yı geri oturtuyor (düzenek sınırında yama). PR #22 incelemesi düzeltme yerini widget olarak belirledi.

## Karar
1. `LazerAyar`'a `sabitA?: boolean` eklenir; varsayılan `false`. Ekleyicidir: mevcut çağrılar ve davranış değişmez.
2. `donenIsin`'den bağımsızdır; `parca`, `isin`, `dogru` modlarının üçünde de geçerlidir.
3. `sabitA` bir ayardır; `durum()` çıktısına yazılmaz. `yukle` A'yı yine yükler (kafa "sabit"tir, "yok" değildir).
4. `sabitA` iken `lazerA` hedefli hiçbir olay (`bas` dahil) seçim başlatmaz; `girdi` `false` döner, hata atmaz (olay düzeneğe düşer). `lazerB` / `lazerCark` davranışı değişmez.
5. `ciz`: `sabitA` iken A pimi pasif çizilir (tutamaç işareti yok); A noktası ve ışın çizimi aynen.
6. `ctx.widget.lazer` imzası (`(a:LazerAyar)=>Lazer`) ve `araclar/imzaListesi.json` değişmez.
7. Sözleşme §3.3 (satır 388) typedef'ine `sabitA?:boolean` eki `[v1.0.x, ADT-016]` etiketiyle Matematikçe'nin ayrı docs PR'ıdır; eski metin silinmez. K-10e PR'ı `docs/` dosyalarına dokunmaz.
8. D03'teki geri-sabitlemenin kaldırılması ve `sabitA:true` geçirilmesi GM-D'nindir (G-02b ya da G-02c); CX-M `duzenekler/` altına dokunmaz.
9. Bozucu etki: yok.

## Uygulayıcının izleyeceği kural
1. `ayarDogrula`: `sabitA` verilmiş ve boolean değilse `WIDGET_AYAR_GECERSIZ`.
2. `hedefGecerli`: `hedef === 'lazerA' && sabitA` → `false`.
3. `durum`/`yukle`/`hat`/`gecerMi` davranışı değişmez; `durum()` `sabitA` anahtarı içermez.
4. Yeni hata kodu yok; imzaListesi değişmez.

## Etkilenen dosyalar / bilet
- `widget/lazer.js`, `test/lazer.test.js` — K-10e (CX-M)
- `docs/sozlesme_v1.md` §3.3 satır 388 — Matematikçe docs PR'ı
- Bağlantılı: `duzenekler/D03/D03.js` (GM-D, G-02b/G-02c), ADT-006 §2
