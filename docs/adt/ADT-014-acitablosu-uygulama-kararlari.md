# ADT-014 · aciTablosu uygulama kararları (aciTablosuOlustur(ayar, konum), yalnız sahne çizimi)

**Tarih:** 3 Kas 2026 · **Yazan:** Matematikçe (Hakem kararıyla) · **Düzenek/bilet:** K-08 · **Tür:** ekleyici · **Sözleşme:** v1.0.x, §3.3 AciTablosu · **Durum:** BAĞLAYICI

## Bağlam
K-08, `widget/aciTablosu.js` widget'ını ve motor bağlamasını getirir. Sözleşme §3.3 `AciTablosu` arayüzünü tanımlar, ancak modül export adını tanımlamaz ve doldurma protokolünü yalnızca "sürükle-bırak (açı bölgesi → satır)" diye anar.

Sözleşmede bir çelişki vardır: §3.3'teki "(HTML katmanı; sahne yalnız konum)" notu, §2.2'deki "widget yalnız geo import eder, çizim sahne üzerinden" kuralıyla çelişir. v1'de HTML katmanı yoktur. Bu ADT çelişkiyi §2.2 lehine çözer ve uygulama ayrıntılarını bağlar.

## Karar
1. **Dışa aktarım adı:** `aciTablosuOlustur(ayar, konum)`, `Function.length` 2. `konum = {x, y, genislik}` tezgâh birimi; `undefined` → iç varsayılan. Motor sarmalayıcısı düzen moduna göre verir, ctxSahte `undefined` verir. (§3.3 modül export adı tanımlamıyor; ADT-011 kalıbı.)
2. **Çizim yalnız sahne ile.** §3.3'teki "(HTML katmanı; sahne yalnız konum)" notu §2.2 ("widget yalnız geo import eder, çizim sahne üzerinden") ile çelişir; v1'de HTML katmanı yok, tablo `sahne.cokgen/etiket/sayi/aciYayi` ile çizilir. HTML katmanı v1.1 ekleyici. Sözleşme satırına `~~HTML katmanı~~ sahne [v1.0.x, ADT-014]` işlenir.
3. **Doldurma protokolü** (§3.3 "sürükle-bırak (açı bölgesi → satır)" ayrıntısı): `olay.hedef` `'aci:<ad>'` → ad hücresi; `'okuma:<sayı>'` → olcu hücresi; tur ve iliski hücreleri tik ile döngü (tur döngüsü `dar→dik→genis→dogru`, `tam/sifir` yok). Düzenekler açı bölgesi ve okuma öğelerine bu id'leri verir.
4. **Satır id'leri:** `'tablo:'+i`, bölümlü `'tablo:'+bolum+':'+i`.
5. **Etiket anahtarları:** aciTablosu'nun `iliski` sütunu kullanan düzenek JSON'unda `etiketler` altında `iliski:ters`, `iliski:komsuButunler`, `iliski:komsuTumler` zorunlu (npm run sema'ya bu çapraz kural sonraki CX-M bileti ile eklenir; o zamana kadar ctxSahte/kuru koşuda görünür).
6. **`ayniKartaKoy`** yan etkisiz `false`; `'bolumAyri'` cümlesini düzenek söyler, widget `matik` bilmez.
7. **`karsilastir` kuralı:** ad eşleşmesi + `aciFark ≤ tolAci` (yuvarlama öncesi) + `aciTuruTol` + iliski eşitliği; her gerçek öğe en çok bir satırla eşleşir; boş satır yanlış.
8. **`otomatikDoldur`** yalnız null hücreleri doldurur; aralık dışı `PARAMETRE_ARALIK_DISI`.
9. **Ölçü kilidi:** kilitli düzenekte `'olcu'` sütunu isteği `WIDGET_AYAR_GECERSIZ`; aciTablosu D08/D17/D18'de kullanılmaz.
10. imzaListesi `moduller` girdisi K-08 PR'ında doldurulur; `sozlesmeSurumu` değişmez (ekleyici, v1.0.x satırı docs/degisiklik.md'ye).

## Uygulayıcının izleyeceği kural
1. İmza tam olarak `aciTablosuOlustur(ayar, konum)`; `konum` verilmezse iç varsayılan kullanılır.
2. `widget/aciTablosu.js` içinde DOM, HTML, `document` geçmez; çizim yalnız `sahne.cokgen/etiket/sayi/aciYayi` ile (§2.2).
3. Hedef id'leri `'aci:<ad>'`, `'okuma:<sayı>'`; satır id'leri `'tablo:'+i` / `'tablo:'+bolum+':'+i`.
4. Widget `matik` bilmez; `ayniKartaKoy` yan etkisiz `false` döner.
5. `karsilastir`, `otomatikDoldur` ve ölçü kilidi davranışı Karar 7–9'daki gibi; hata kodları `PARAMETRE_ARALIK_DISI`, `WIDGET_AYAR_GECERSIZ`.
6. `araclar/imzaListesi.json` aciTablosu girdisi `kaynak:"ADT-014"` ile; `sozlesmeSurumu` değişmez.

## Etkilenen dosyalar / bilet
- `widget/aciTablosu.js` (yeni) — K-08
- `motor/baglam.js` (widget sarmalayıcısı, `konum`), `motor/ctxSahte.js` (`konum` undefined)
- `araclar/imzaListesi.json` — `moduller` girdisi (K-08 PR'ı)
- `docs/sozlesme_v1.md` §3.3 — `~~HTML katmanı~~ sahne [v1.0.x, ADT-014]`; `docs/degisiklik.md` — v1.0.x satırı
- aciTablosu kullanan düzenek JSON'ları (D11–D16, ileride) — `iliski:*` etiketleri
- Sonraki CX-M bileti — `npm run sema` çapraz kuralı
