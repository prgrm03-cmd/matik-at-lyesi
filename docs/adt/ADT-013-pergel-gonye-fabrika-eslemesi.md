# ADT-013 · Pergel ve Gönye fabrika eşlemesi (pergelOlustur(ayar, ortam), gonyeOlustur(ayar, ortam))

**Tarih:** 3 Kas 2026 · **Yazan:** Hakem (Matematikçe yazar) · **Düzenek/bilet:** K-07 · **Tür:** ekleyici · **Sözleşme:** v1.0.x · **Durum:** BAĞLAYICI

## Bağlam
Set 2'nin ilk biletlerinden K-07, `widget/pergel.js` ve `widget/gonye.js` widget'larını ve motor bağlamasını getirir. Sözleşme §3.3 `PergelAyar` / `GonyeAyar` alanlarını tanımlar, ancak modül dışa aktarım adlarını, fabrikanın ikinci parametresini, sabit sahne id'lerini ve ölçü kilidinin nerede denetleneceğini tanımlamaz. Mevcut aile iki kalıp içerir: `lazerOlustur` ikinci parametresi (ADT-006 §2) ve `aciolcerOlustur(ayar, rng)` (ADT-011). Bu ADT pergel ve gönye için eşlemeyi bağlar; ADT-011'i kapsamaz.

## Karar
1. `widget/pergel.js` → `export function pergelOlustur(ayar, ortam)`; `widget/gonye.js` → `export function gonyeOlustur(ayar, ortam)`. Her ikisi `Function.length === 2`. Başka export yok.
2. `ortam = { pxToBirim:(px)=>number, sembol?:Sembol }`. `lazerOlustur` ikinci parametresiyle (ADT-006 §2) aynı aile; `aciolcerOlustur(ayar, rng)` (ADT-011) **değişmez**, bu karar onu kapsamaz. `pxToBirim` yoksa `WIDGET_AYAR_GECERSIZ`.
3. `ayar` §3.3 `PergelAyar` / `GonyeAyar` ile birebir; alan eklenmez. `PergelAyar.olcuKilidi` ve `GonyeAyar.dogru` zorunlu, eksikse `WIDGET_AYAR_GECERSIZ`.
4. Ölçü kilidi: `veri.bayraklar.olcuKilidi === true` iken `ctx.widget.pergel({olcuKilidi:false})` → `OLCU_KILIDI_IHLALI`, **sarmalayıcıda** (motor + ctxSahte). `olcuKilidi:true` pergel `sahne.sayi` çağırmaz. Gönye kilit kuralına tabi değil.
5. Sabit sahne id'leri: `pergelMerkez`, `pergelUc`, `pergelKilit`, `gonye`, `gonyeKose`. Düzenekler `vurgula`/`olay.hedef` için bunları kullanır; değiştirilmesi bozucudur.
6. `kopyala` ve `acikligiAl` kilidi öğrenci tıkıyla açılamaz (`kilitKaynagi`); yalnız `kilitli` ayarıyla ya da elle `kilitle()` ile konan kilit açılabilir. D07/D08/D17 bu kurala güvenir.
7. `pergel.cemberCiz/yayCiz` sahneye çizmez, `Cember`/`Yay` nesnesi döner; `yayCiz` `yon` varsayılanı `'saat'`.
8. `gonye.oturdu`: uzun kenar ↔ doğru `paralelMi(…, TOLERANS.dikme)` **ve** dik köşe doğruya `pxToBirim(TOLERANS.pimYakalamaPx)` içinde; `t` dik köşe ayağının `dogru.A`'dan imzalı uzaklığı.
9. `araclar/imzaListesi.json` pergel/gonye satırları bu ADT kaynağıyla dolar; `sozlesmeSurumu` değişmez. Sözleşme §3.3'e üç satır ek (fabrika adı, `ortam`, id listesi) `[v1.0.x, ADT-013]` etiketiyle; eski metin silinmez.
10. Bozucu etki: yok (hiçbir mevcut düzenek değişmez; D02/D09a bu widget'ları kullanmaz).

## Uygulayıcının izleyeceği kural
1. İmzalar tam olarak `pergelOlustur(ayar, ortam)` ve `gonyeOlustur(ayar, ortam)`; `Function.length === 2`; modülde başka export yok.
2. `ortam.pxToBirim` yoksa ya da `PergelAyar.olcuKilidi` / `GonyeAyar.dogru` eksikse kurulumda `WIDGET_AYAR_GECERSIZ`.
3. `OLCU_KILIDI_IHLALI` denetimi widget'ta değil sarmalayıcıda (`motor/baglam.js` ve `motor/ctxSahte.js`) yapılır.
4. Sahne id'leri (`pergelMerkez`, `pergelUc`, `pergelKilit`, `gonye`, `gonyeKose`) sabittir; `cemberCiz/yayCiz` sahneye çizmez, nesne döner.
5. `gonye.oturdu` toleransları `TOLERANS.dikme` ve `pxToBirim(TOLERANS.pimYakalamaPx)` ile; sihirli sayı yok.
6. `araclar/imzaListesi.json` pergel/gonye satırları `kaynak:"ADT-013"` ile; `sozlesmeSurumu` değişmez.

## Etkilenen dosyalar / bilet
- `widget/pergel.js`, `widget/gonye.js` (yeni) — K-07
- `motor/baglam.js` (widget sarmalayıcısı), `motor/ctxSahte.js` — bağlama, `OLCU_KILIDI_IHLALI` denetimi
- `araclar/imzaListesi.json` — pergel/gonye satırları (kaynak ADT-013)
- `docs/sozlesme_v1.md` §3.3 — üç satır ek `[v1.0.x, ADT-013]` (eski metin silinmez)
- Bağlantılı: ADT-006 §2, ADT-011 (değişmez); D07/D08/D17 (kilit kuralına güvenir)
