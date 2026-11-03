# ADT-017 · DefterOrtam.kayit ikinci parametre `tanim` (panel kaydı)

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem (Fable taslak, Matematikçe yazar) · **Düzenek/bilet:** K-10g · **Tür:** ekleyici · **Sözleşme:** v1.0.x · **Durum:** BAĞLAYICI

## Bağlam
ADT-015 m.8 Defter panelini arayüz katmanına ve ayrı CX-M biletine bırakır. Panel hücre/dişli çizmek için tanıma (min/max/secenekler, kalıp) muhtaçtır; `TahminRafi.deger()`/`KuralKarti.ayar()` yalnız değer verir, m.9 başka üye eklenmesini yasaklar, m.2 `kayit:(n)=>void` yalnız nesneyi taşır. `KuralKartiAyar.dogru` ve `KisayolAyar.cozucu` DOM'a geçmemelidir.

## Karar
1. `DefterOrtam.kayit` imzası `(nesne, tanim)=>void` olur; ikinci parametre ekleyicidir, eski `kayit` uygulamaları (ctxSahte, testler) yok sayabilir.
2. `tanim` doğrulanmış kopyadır: tahminRafi → `{tur:'tahminRafi', hucreler:Hucre[], etiketAnahtari}`; kuralKarti → `{tur:'kuralKarti', disliler:Disli[], kalip:string, anahtar}`; kisayolYuvasi → `{tur:'kisayolYuvasi', kabulEdilen:string[], sensorler:string[]}`. `dogru` ve `cozucu` hiçbir koşulda geçmez.
3. `defter.js` sarmalayıcısı `kayit`'ı kurulumdan sonra, nesne ile birlikte çağırır; alt fabrikalar değişmez (m.9 korunur: nesneye üye eklenmez).
4. Panel kancaları `defterKayit/defterTemizle/defterKilitle` motor-içi `arayuzBagla` üyeleridir; §3.4 `Defter` nesnesi, `ac/kapat`, `girdiDagit` (ADT-015 m.10) ve `ctx.defter` imzası değişmez. Defter nesneleri `girdi` tanımlamaz; panel olayları DOM'dan nesneye gider, `giris.js` olay akışına girmez.
5. `motor.js` Çalıştır'da `kilitle` döngüsünden sonra `arayuz.defterKilitle?.()` çağrılır (ADT-015 m.12 eki).
6. Yeni hata kodu yok; `araclar/imzaListesi.json` değişmez (`kayit` geri çağrıdır, dışa aktarım değildir).
7. §3.4 `DefterOrtam` satırına `kayit:(nesne, tanim)=>void` eki `[v1.0.x, ADT-017]` etiketiyle Matematikçe'nin docs PR'ıdır; K-10g `docs/`'a dokunmaz.
8. Bozucu etki: yok.

## Uygulayıcının izleyeceği kural
1. `tanim` kopyadır; `hucreler`/`disliler` dizileri ve `secenekler` yeni dizilerdir.
2. `dogru`/`cozucu` sızıntısı test edilir (DOM metninde ve `tanim` anahtarlarında yok).
3. ctxSahte yolunda `kayit` aynı; ikinci parametre denetlenmez.

## Etkilenen dosyalar / bilet
- `defter/defter.js`, `motor/baglam.js`, `motor/giris.js`, `motor/motor.js`, `motor/defterPanel.js` (yeni), `index.html`, `stil/*` — K-10g (CX-M)
- `docs/sozlesme_v1.md` §3.4 `DefterOrtam` — Matematikçe docs PR'ı
- Bağlantılı: ADT-015 m.2, m.8–12; §10.1; §6.1 erişilebilirlik
