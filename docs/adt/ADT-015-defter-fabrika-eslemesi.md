# ADT-015 · Defter fabrika eşlemesi (defterOlustur(ortam) ve dört alt fabrika)

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem (Matematikçe yazar) · **Düzenek/bilet:** K-09 · **Tür:** ekleyici · **Sözleşme:** v1.0.x · **Durum:** BAĞLAYICI

## Bağlam
K-09 `defter/` altındaki beş dosyayı ve `motor/baglam.js` / `motor/ctxSahte.js` bağlamasını getirir. Sözleşme §3.4 nesneleri ve `sina` kuralını tanımlar; ancak modül export adlarını, fabrikaların ikinci parametresini, `rng.alt('sina', sayac)` kaynağını, `durum.gorulen`'in sahibini (§3.1.1: motor `ctx.durum`'a yazmaz), `kalipAnahtari` çözümünü ve HTML panelinin K-09 kapsamında olup olmadığını tanımlamaz. `imzaListesi.json` beş satırda `disarim:null`. §5.1 (`rng.alt('sina:'+n)`) ile §3.4 (`rng.alt('sina', sayac)`) yazımı çelişir; bu ADT §5.1 biçimini esas alır.

## Karar
1. Export adları ve imzalar (modülde başka export yok):
   - `defter/defter.js` → `export function defterOlustur(ortam)`, `length === 1`; §3.4 `Defter` nesnesini kurar, kardeş dört dosyayı import eder.
   - `defter/tahminRafi.js` → `tahminRafiOlustur(ayar, ortam)`, `length === 2`.
   - `defter/kuralKarti.js` → `kuralKartiOlustur(ayar, ortam)`, `length === 2`.
   - `defter/sinama.js` → `sinaOlustur(ortam)`, `length === 1`; `(kart, uretici, n=3)=>Promise<Sinama>` döndürür.
   - `defter/kisayolYuvasi.js` → `kisayolYuvasiOlustur(ayar, ortam)`, `length === 2`.
2. Tek `ortam` ailesi: `DefterOrtam = { bayraklar, kartlar, rng:Rng, sahne:Sahne, matik:Matik, arayuz:{defterAc,defterKapat}, kayit:(n)=>void }`. `baglam.js` kurar, `defter.js` alt fabrikalara aynı nesneyi (kuralKarti'ye `kalip` eklenmiş kopyasını) geçirir. Alt fabrikalar yalnız ihtiyaç duydukları alanı okur; `ortam.rng/sahne/matik` eksikse kurulumda `WIDGET_AYAR_GECERSIZ`.
3. `sina` seed: `defter.js` kapanımında (modül düzeyinde değil) çağrı sayacı `c` tutulur; çağrı `c` için `kok = ortam.rng.alt('sina:'+c)`, örnek `i` için `uretici(kok.alt('ornek:'+i))`; `sonuclar[i].seed` bu alt akışın tohumudur (`Rng.seed`). Düzenek `sina` dışında kendi seed üretmez (§5.1).
4. `durum.gorulen` **düzeneğe** aittir: düzenek gösterdiği örneği `ctx.durum.gorulen`'e kendisi yazar; `uretici` düzenek kapanımıdır ve dışlamayı kendisi yapar. `sina` `ctx.durum`'u ne okur ne yazar; motor da yazmaz (§3.1.1 korunur).
5. `sina` akışı: `ortam.matik.soyle('sinamaBasladi')` → `n` örnek eşzamanlı hesaplanır; `tuttu = kart.ayar()` ile `beklenen` tam eşleşme (`dogruMu` kuralı) → tümü tuttuysa `basarili:true`, `karsiOrnek:null`, `soyle('sinamaTamam')`; ilk tutmayan örnek `karsiOrnek` olur, `sonuc.ciz(ortam.sahne)` çağrılır, `soyle('karsiOrnek')`. Dönüş `Promise.resolve(sinama)`; arayüz animasyonu beklenmez. `uretici` fonksiyon değilse ya da `n < 1` ise `WIDGET_AYAR_GECERSIZ` (senkron throw). `'kartUymaz'`ı `kisayolYuvasi.tak` söyler; `'bolumAyri'` düzenekte kalır.
6. `kalipAnahtari`: `defter.js` `ortam.kartlar[anahtar]`'ı arar; yoksa ya da `.kalip` string değilse `WIDGET_AYAR_GECERSIZ`. `kuralKartiOlustur` yalnız `ortam.kalip` görür; `kart.anahtar = kalipAnahtari`.
7. Bayrak denetimi **sarmalayıcıda** (`defter.js`; motor ve ctxSahte aynı yolu kullanır): `bayraklar.tahminRafi === false` iken `tahminRafi(…)`, `bayraklar.sinama === false` iken `sina(…)`, `bayraklar.sensorSokme === false` iken `kisayolYuvasi.sok(…)`, kart sayısı `bayraklar.kartSayisi`'ni aşarsa `kuralKarti(…)` → `WIDGET_AYAR_GECERSIZ`.
8. Katman: `defter/` yalnız `geo` (ve kardeş defter dosyaları) import eder; `motor/`, `widget/`, DOM yok. K-09 **yalnız mantık + sahne**: Defter nesneleri çizmez, `girdi` tanımlamaz; tek çizim `uretici.ciz(ortam.sahne)` (madde 5). Tarayıcı paneli (`ac/kapat`'ın açtığı çekmece/sütun, hücre/dişli görünümü) **arayüz** katmanındadır ve ayrı CX-M biletidir; `ac/kapat` `arayuz.defterAc/defterKapat` çağrısı olarak kalır.
9. Sözleşme dışı ek üyeler (ekleyici, panel ve sahte sınama için gerekli): `TahminRafi.hucreKoy(ad, deger)` — kilit sonrası `WIDGET_AYAR_GECERSIZ`; `KuralKarti.disliCevir(ad, deger)` — `secenekler` dışı değer `WIDGET_AYAR_GECERSIZ`. Başka üye eklenmez; `deger()`/`ayar()` kopya döndürür.
10. Girdi dağıtımı: `defter.js` her kurulan nesneyi `ortam.kayit` ile `hizmetler.defterler`'e yazar; `girdi` yok, `girdiDagit` `?.` ile zaten tolere eder — **değişmez**.
11. `ctxSahte`: `hizmetleriOlustur` artık `ctx.defter = defterOlustur({…, sahne: ctx.sahne, …})` kurar; sahte sahne geçtiği için nesneler kendiliğinden gerçektir, `karsiOrnek` çizimi `cagrilar`'a düşer. ctxSahte'de defter için üst yazma yapılmaz; `bekleyen` defter satırları `baglam.js`'den kalkar.
12. `tahminRafi.kilitle`: `motor.js` Çalıştır'da `hizmetler.defterler` içindeki `kilitle` tanımlı nesneleri kilitler; bu küçük `motor.js` değişikliği **K-09 kapsamındadır** (sözleşme "motor çağırır" diyor; aksi hâlde kilit davranışı sınanamaz).
13. Yeni hata kodu **yok** (§6.5): Defter fabrikaları `WIDGET_AYAR_GECERSIZ`, Matik anahtarı `MATIK_ANAHTAR_YOK` kullanır.
14. `araclar/imzaListesi.json` beş defter satırı `kaynak:"ADT-015"` ile dolar; `sozlesmeSurumu` değişmez. Sözleşme §3.4'e ek satırlar (fabrika adları, `DefterOrtam`, seed kalıbı, `gorulen` sahibi, `hucreKoy/disliCevir`) `[v1.0.x, ADT-015]` etiketiyle; eski metin silinmez. Bu düzenlemeler Matematikçe'nin ayrı docs PR'ıdır (ADT-013 Karar 9 kalıbı); K-09 PR'ı `docs/sozlesme_v1.md` ve `docs/degisiklik.md`'ye dokunmaz; docs PR'ı K-09 birleşmeden önce açılır.
15. Bozucu etki: yok (mevcut düzenekler Defter kullanmaz; `girdiDagit` ve widget bağlaması değişmez).

## Uygulayıcının izleyeceği kural
1. İmzalar tam olarak madde 1'deki gibi; `Function.length` değerleri eşleşir; modüllerde başka export yok.
2. `defter/` içinde yalnız `geo` ve kardeş dosya import'u; `querySelector`, `document`, `motor/`, `widget/` geçmez. Modül düzeyinde durum yok; `sina` sayacı `defter.js` kapanımında.
3. Seed yalnız `ortam.rng.alt('sina:'+c)` ve `kok.alt('ornek:'+i)`; `durum.gorulen` okunmaz/yazılmaz, dışlama üreticinin işi.
4. Bayrak ve `kalipAnahtari` denetimi `defter.js`'de, kod `WIDGET_AYAR_GECERSIZ`; yeni hata kodu tanımlanmaz.
5. Matik anahtarları: `sinamaBasladi/sinamaTamam/karsiOrnek` → `sina`; `kartUymaz` → `kisayolYuvasi.tak`; hepsi `ortam.matik.soyle` ile.
6. `karsiOrnek` çizimi `ciz(ortam.sahne)`; Defter nesneleri başka çizim yapmaz, `girdi` tanımlamaz; panel/DOM K-09 dışı.
7. `motor.js` Çalıştır'da `defterler` üzerinde `kilitle()` döngüsü; `girdiDagit` değişmez.
8. `imzaListesi.json` defter satırları `kaynak:"ADT-015"`; `sozlesmeSurumu` değişmez; docs dosyalarına dokunulmaz.

## Etkilenen dosyalar / bilet
- `defter/defter.js`, `defter/tahminRafi.js`, `defter/kuralKarti.js`, `defter/sinama.js`, `defter/kisayolYuvasi.js` (yeni) — K-09
- `motor/baglam.js` (`ctx.defter = defterOlustur(ortam)`, `bekleyen` satırları kalkar), `motor/ctxSahte.js` (üst yazma yok; gerçek nesne doğrulaması), `motor/motor.js` (Çalıştır → `kilitle`) — K-09
- `araclar/imzaListesi.json` — beş defter satırı (kaynak ADT-015)
- `docs/sozlesme_v1.md` §3.4 — ek satırlar `[v1.0.x, ADT-015]` (Matematikçe, ayrı docs PR'ı)
- Bağlantılı: ADT-013 (ortam kalıbı), ADT-011 Ek A (`rng.alt` tüketmez), §3.1.1, §5.1, §6.4, §8.3; Defter HTML paneli ayrı CX-M bileti

## Ek soru
Hayır — PR gövdesinin `env` üzerinden `PR_BODY`'ye taşınması zaten doğru (enjeksiyonu önleyen) kalıptır ve K-09'a workflow dokunuşu eklenmez; sahiplik denetimine ilişkin bir düzeltme gerekirse CX-M'nin ayrı bakım PR'ı olur.