# K-04 doğrulaması

`npm ci && npm run check` Node 20 üzerinde çalışır. Dokuz komutun sırası
sözleşme §6.2'dir: lint, yasak, sahiplik, satir, sema, imza, test, seed, boyut.
Bir hata sonraki komutları durdurmaz. Çıkış kodu kırmızı komut sayısıdır.
Her satır ✓/✗, komut ve en fazla ilk on bulguyu içerir. Rapor dosyası
`docs/check/<dal>-<YYYY-MM-DD>.txt`; dalın eğik çizgileri tireye çevrilir,
tarih Europe/Istanbul saat dilimindedir. CI ayrıca raporları artifact olarak saklar.

`npm run metin` bağımsız çalışır ve `sema` komutuna bağlıdır. Böylece metin
ihlali dokuz satırlık raporda sema aşamasını kırmızı yapar.
Kaynak sözleşme bu depoda `docs/sozlesme_v1.md` adındadır; kökte ikinci bir
sözleşme kopyası üretilmez. ADT-004 motor iç DOM istisnalarını, ADT-005 geometri
arayüzlerini, ADT-006 mevcut lazer fabrikası ve kuru koşu davranışını açıklar.

## Kapsam

- ESLint yapısal yasakları, regex denetimi dizgi biçimlerini denetler.
  Yasak örnekleri ve izin verilen karşı örnekler `test/check.test.js` içindedir.
- `imzaListesi.json` §3.2/3.3/3.4/4.1 kaynaklarını ve ADT-006 lazer eşlemesini
  içerir. Eksik planlı widget/defter dosyası “bekleniyor” uyarısıdır;
  mevcut modülün eksik/fazla dışa aktarımı veya yanlış parametre sayısı hatadır.
- Şema denetimi JSON-only iskelet üretimini korur; eşleşen JS varsa sürüm ve
  literal anahtarlar da denetlenir. Çalışan düzenek dışa aktarımları imza
  aşamasında ayrıca yüklenir.
- Boyutlar sıkıştırılmamış UTF-8/dosya baytıdır: kB=1000, MB=1000000.
  İlk küme index.html, main.js, motor/, geo/, widget/, defter/, stil/,
  varlik/matik/ dosyalarının toplamıdır. Düzenekler bu toplamda yoktur.
- Sahiplik gerçek `git diff --name-only main...HEAD` sonucunu kullanır.
  CI tam geçmişi ve PR head commit'ini alır, PR gövdesini `PR_BODY` ile verir.
  İmza listesi değiştiğinde gövdede ADT- gerekir; yerelde gövde yoksa uyarı verir.
  K-04 altyapısı olarak kilit dosyası, workflow, yasak sözcük listesi ve check
  raporları biletin izin verdiği kapsama dahildir.
- `m/` dallarında düzenek JSON değişikliği yalnız metin alanlarında olabilir;
  teknik veri, kimlik ve yapı değişiklikleri reddedilir. Sözleşme dosyaları
  yalnız `sozlesme/` dalında değişebilir.

Testler geçici klasörlerde çalışır; depodaki D01'e veya diğer testlerin dosyalarına
yazmaz. Dev bağımlılıkları yalnız eslint ve ajv'dir; node_modules commit edilmez.
Hakan testi bu altyapı biletinin kapsamına girmez.

## K-04 kayıtlı kanıt

3 Kasım 2026: kaynak commit `c810f1a8e2447f802d1d966c7a8f481cf2f4acc4`,
[Node 20 CI](https://github.com/prgrm03-cmd/matik-at-lyesi/actions/runs/41582600663).
Rapor aynı koşunun konsol çıktısından aynen alınmıştır:
[cx-m-K-04-check-2026-11-03.txt](./cx-m-K-04-check-2026-11-03.txt).
Dokuz komut yeşil; 318/318 test (mevcut 218 + yeni 100); 1000/1000 seed,
0 hata, 0 sayi çağrısı. Check 9,75 saniye; Node testleri 4,84 saniye.
Bu kayıt commit'i yalnız rapor ve bu açıklamayı ekler.
Push koşusunda PR gövdesi yokluğu uyarıdır; PR koşusunda gövde ADT- ile denetlenir.
