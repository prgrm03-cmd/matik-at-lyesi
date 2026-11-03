# ADT-011 · Widget fabrikası ikinci parametre rng (aciolcerOlustur(ayar, rng))

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem · **Düzenek/bilet:** K-05 / PR #8 (84f4aa2); bağlantı: K-05b · **Tür:** ekleyici · **Durum:** BAĞLAYICI

## Bağlam
PR #8'de `widget/aciolcer.js` fabrikası `aciolcerOlustur(ayar, rng)` imzasıyla geldi. Widget, `hizasiz:true` ayarında başlangıç dönüşünü rastgele seçmek için bir rastgelelik kaynağına ihtiyaç duyuyor. İki yol vardı: (a) widgetın `ctx.rng` ana akışını doğrudan tüketmesi, (b) rastgelelik kaynağının fabrikaya ikinci parametre olarak dışarıdan verilmesi. (a) yolu, düzeneğin tekrar üretilebilir parametre akışını kaydırır: widget ana akıştan bir değer çektiğinde, ondan sonra gelen tüm düzenek parametreleri bir sıra kayar ve tohum bazlı yeniden oynatma bozulur. Ayrıca `imzaListesi.json` fabrika için parametre sayısını 1 olarak tutuyordu; imza testi PR #8'i düşürüyordu.

Hangi akışın verileceği (ana `ctx.rng` mi, `rng.alt('widget:aciolcer')` alt akışı mı) widgetın değil, düzeneği kuran katmanın (CX-M) sorusudur ve K-05b bağlantı PR'ında karara bağlanacaktır. Bu ADT yalnızca widget tarafındaki sözleşmeyi bağlar.

## Karar
1. Widget fabrikaları rastgelelik kaynağını **ikinci parametre** olarak alır: `aciolcerOlustur(ayar, rng)`. Widget içinde `ctx.rng`, global rng veya `Math.random` tüketimi yasaktır.
2. `imzaListesi.json` kaydı `aciolcerOlustur: 2` olarak güncellenir; bu güncelleme PR #8'den **önce** ayrı bir küçük PR ile birleşir (imza testi yeşile döndükten sonra PR #8 rebase edilip birleşir).
3. `rng`, `hizasiz:false` ayarında tüketilmez; bu durumda `undefined` geçilmesi geçerlidir. `hizasiz:true` ayarında `rng` zorunludur; yoksa fabrika kurulumda açık hata atar (sessiz geri dönüş yok).
4. Widget, `rng`'nin ana akış mı alt akış mı olduğunu bilmez ve sorgulamaz. Alt akış tercihi (`rng.alt('widget:aciolcer')`) **CX-M** kararıdır, K-05b bağlantı PR'ında yazılır; o karar bu ADT'ye "ek" olarak iliştirilir, bu ADT değişmez.
5. Bu kural tüm yeni widget fabrikalarına genelleşir: rastgelelik gerekiyorsa ikinci parametre `rng`; gerekmiyorsa ikinci parametre yoktur (imza 1 kalır). Üçüncü parametre açılmaz; ek bağımlılık gerekirse `ayar` içinde taşınır.

## Uygulayıcının izleyeceği kural
1. Fabrika imzası tam olarak `aciolcerOlustur(ayar, rng)` olacak; `rng` yalnızca `hizasiz:true` dalında okunacak.
2. Widget dosyasında `ctx`, `ctx.rng`, `Math.random` geçmeyecek; gözden geçirmede grep ile doğrulanır.
3. `hizasiz:true && rng == null` → kurulumda hata; mesaj widget adını ve "rng gerekli" ifadesini içerir.
4. `araclar/imzaListesi.json` → `widget/aciolcer.js`: `disarim {aciolcerOlustur:2}`, `fabrika aciolcerOlustur`, `argumanlar [{hizasiz:false, olcekYonu:"ic"}]`. Önce bu PR birleşir, sonra PR #8.
5. Düzenek tarafında (D-kuran kod) `aciolcerOlustur(ayar, <akış>)` çağrısındaki `<akış>` seçimi K-05b'de CX-M tarafından yapılana kadar PR #8 düzenek dosyasına dokunmaz; widget tek başına birleşir.
6. Tohum testi: aynı tohumla kurulan düzenekte açıölçer `hizasiz:true` iken düzeneğin **sonraki** parametreleri değişmiyorsa kural sağlanmış demektir. Bu testin yazılması K-05b kapsamındadır.

## Etkilenen dosyalar / bilet
- `widget/aciolcer.js` (PR #8, 84f4aa2) — imza sabit, rng kullanım dalı
- `araclar/imzaListesi.json` — `aciolcerOlustur:2` (PR #8'den önce ayrı PR)
- K-05 (PR #8) — birleşme sırası: imza PR → PR #8
- K-05b (bağlantı PR'ı) — CX-M: ana akış / `rng.alt('widget:aciolcer')` kararı, tohum testi
- `docs/sozlesme_v1.md` §3.3 — "fabrika ikinci parametre rng" maddesi (Hakem yazar)
