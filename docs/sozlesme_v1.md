# Matik'in Atölyesi – Tema 1 · Sözleşme v1

*Yazar: Claude Fable · 3 Kasım 2026 Salı 09:00 · Durum: **v1.0-taslak** (KN3'te, 9 Kasım 19:00, v1.0 olarak dondurulur; sonrası yalnız ekleyici) · Depo: `github.com/prgrm03-cmd/matik-at-lyesi` (public) · Dosya: `sozlesme.md`*

**Bu belge ne?** Codex (CX-M, CX-A, CX-Z) ve Gemini (GM-D, GM-T, GM-E) aynı metinden başlar. Matematikçe bunu `sozlesme.md` olarak commit eder; `npm run check` bu belgedeki kuralların makineyle denetlenebilen kısmını uygular. Belge yanlışsa kod değil belge düzeltilir (Bölüm 11, ADT). Bu belgede kod yoktur; imzalar JSDoc tipi olarak verilir, gövdeleri yazımcı doldurur.

**Okuma sırası:** Codex CX-M → tamamı. Gemini GM-D → 0, 2, 3.1 (`ctx`), 3.3, 3.4, 4, 5, 6, 8, 9. Matematikçe → 1, 2, 6, 7, 11. Hakan → 8, 9, 10.

---

## 0. Teknik zemin (değişmez kararlar)

| Karar | Değer |
|---|---|
| Dil | Saf JavaScript, ES2020 modülleri (`import`/`export`), **derleyici/paketleyici yok** (Vite yok) |
| Yayın | GitHub Pages, `main` dalının kökü; tarayıcı dosyaları olduğu gibi yükler |
| Çalışma zamanı bağımlılığı | **Sıfır.** CDN, font, kütüphane yok. `node_modules` yalnız `npm run check` için |
| Node | 20 LTS; `package.json` → `"type": "module"` |
| Çizim | Tek `<canvas>` (sahne) + HTML katmanı (Defter, sembol paneli, düğmeler). Düzenek `canvas`'a dokunmaz |
| Koordinat | **Birim** (mantıksal): tezgâh 1000 × 1000 birim, köşe (0,0) sol-üst, **y aşağı**. Motor birimi piksele çevirir |
| Açı | Derece, `[0, 360)`; 0° = +x (sağ); pozitif yön ekranda **saat yönü** (y aşağı olduğu için). Yön şalteri değerleri `'saat'` / `'ters'` |
| Rastgelelik | Yalnız `ctx.rng` (seed'li, Bölüm 5) |
| Kayıt | Yalnız motor, `localStorage`, anahtar `matik.atolye.tema1` (Bölüm 5) |
| Hedef cihaz | Telefon **dikey** birinci; tahta 16:9 ikinci; tablet üçüncü |
| Metin | Türkçe cümleler yalnız düzenek JSON'unda; `.js` içinde yok |
| Tanımlayıcı adları | Türkçe sözcük, **ASCII** harf: `ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u` (`aciolcer`, `kesisim`, `disBukeyMi`). camelCase; sınıf/tip PascalCase; sabit UPPER_SNAKE |
| Dosya adları | ASCII, kebab yok, camelCase (`aciTablosu.js`), düzenek klasörleri `D01`…`D18`, `D10b`, `D12b` |

---

## 1. Depo klasör yapısı

```
/
├─ index.html              Giriş: dolap/menü, ?mod=tahta, &duzenek=, &seed=
├─ main.js                 Yalnız motor.baslat() çağırır
├─ sozlesme.md             Bu belge
├─ sema.json               Düzenek JSON şeması (Bölüm 4.3)
├─ iskelet.js              Node betiği: 20 geçerli boş JSON üretir
├─ package.json            scripts: check, test, seed, sema, sahiplik
├─ test.html               GM-T: 50-seed regresyon düğmesi (tarayıcı)
├─ motor/                  CX-M
│   ├─ motor.js            baslat, sahne döngüsü, mod seçimi
│   ├─ sahne.js            çizim API'si (Bölüm 3.1.2)
│   ├─ giris.js            dokunma/fare → olay (Bölüm 3.1.3)
│   ├─ rng.js              mulberry32 + yardımcılar (Bölüm 5.1)
│   ├─ kayit.js            localStorage şeması (Bölüm 5.3)
│   ├─ yukleyici.js        düzenek .js + .json yükler, şema doğrular
│   ├─ ilerleme.js         yıldız, kilit, araç sırası
│   ├─ ipucu.js            İ1–İ3 akışı
│   ├─ sembolPaneli.js     [AB] [AB AB |AB| ⊥ // m(ABC) r °
│   ├─ sunum.js            ayna + döndürme, tahta ölçeği
│   ├─ tahta.js            ?mod=tahta ayarları
│   ├─ kopru.js            iframe postMessage (Bölüm 10.2)
│   └─ ctxSahte.js         Node ve kuru koşu için sahte ctx (Bölüm 6.4)
├─ geo/                    CX-M · saf fonksiyonlar, DOM yok
│   ├─ nokta.js  dogru.js  cember.js  aci.js  cokgen.js
│   ├─ kesisim.js  uretici.js  tolerans.js  index.js
├─ widget/                 CX-M (aciolcer: CX-A)
│   ├─ aciolcer.js  aciTablosu.js  pergel.js  gonye.js  lazer.js
├─ defter/                 CX-M
│   ├─ defter.js  tahminRafi.js  kuralKarti.js  sinama.js  kisayolYuvasi.js
├─ duzenekler/
│   ├─ D01/D01.js  D01/D01.json          … (her düzenek tek .js + tek .json)
│   ├─ D09/D09.js  D09/D09a.json … D09f.json
│   ├─ D10/D10.js  D10/D10a.json  D10/D10b.json
│   ├─ D12b/D12b.js  D12b/D12b.json
│   └─ EK'ler kendi düzeneğinin dosyasında (D04-EK → D04.js/json)
├─ varlik/                 A2 görselleri: matik/ (3 ifade + kıvılcım), ikon/ (8), ui/
├─ stil/                   stil.css (tek dosya), tahta.css
├─ araclar/                npm run check betikleri (Node)
│   ├─ check.js  lint.config.js  yasak.js  sahiplik.js  satir.js
│   ├─ semaDogrula.js  imza.js  seedTesti.js  boyut.js  metin.js
├─ test/                   geo birim testleri (node:test)
└─ docs/                   biletler/, adt/, cihaz/, butce.csv, degisiklik.md
```

**Boyut sınırları:** düzenek `.js` ≤ 400 satır, `.json` ≤ 12 kB; motor/geo/widget/defter dosyaları ≤ 400 satır (bölünür); `varlik/` toplam ≤ 1,2 MB; ilk yükleme (index + motor + geo + widget + defter + stil + Matik görselleri) ≤ 2 MB; düzenekler tembel yüklenir (dinamik `import()`).

---

## 2. Modül sınırları ve dosya sahipliği

### 2.1 Sahiplik tablosu

| Yol | Sahip | Gemini GM-D | Codex CX-A / CX-Z | GM-T / GM-E | Matematikçe | Fable |
|---|---|---|---|---|---|---|
| `motor/`, `geo/`, `defter/`, `widget/` (aciolcer hariç), `iskelet.js`, `sema.json`, `package.json`, `index.html`, `main.js`, `stil/` | **CX-M** | Dokunamaz → ADT | Dokunamaz → ADT | Dokunamaz | Commit | Karar |
| `widget/aciolcer.js` | **CX-A** | Dokunamaz → ADT | CX-Z dokunamaz | — | Commit | Karar |
| `duzenekler/D01, D09, D10*` | CX-M (D01), CX-A (D09) | D10 → GM-D | CX-A: D09 | — | JSON metin alanları (R1) | Okur |
| `duzenekler/D02–D07, D14, D15` | **GM-D** | Yalnız kendi düzeneği | Dokunamaz | — | JSON metin | Okur |
| `duzenekler/D08, D11, D12, D12b, D13, D16, D17, D18` | **CX-Z** | Dokunamaz | Yalnız kendi düzeneği | — | JSON metin | Okur |
| `test.html`, `docs/cihaz/` | **GM-T / GM-E** | — | — | Yazar | Commit | Okur |
| `varlik/` | A2 (Matematikçe yükler) | — | — | — | Yazar | — |
| `sozlesme.md` | **Fable** | Okur | Okur | Okur | Commit | **Tek yazar** |
| `docs/biletler`, `docs/adt`, `butce.csv`, `docs/degisiklik.md` | **Matematikçe** | — | — | — | Yazar | Okur |

`npm run sahiplik` dal adından ajanı çıkarır (`cx-m/`, `cx-a/`, `cx-z/`, `gm/`, `m/`) ve değişen dosyaları bu tabloyla eşler; uyumsuzluk = kırmızı.

### 2.2 Bağımlılık yönü (tek yönlü, geri dönüş yok)

```
geo  ←  widget  ←  motor  ←  main
geo  ←  defter  ←  motor
duzenekler  →  (hiçbir şeyi import etmez; yalnız ctx)
```

- `geo/` hiçbir şeyi import etmez; `document`, `window`, `canvas`, `performance` kullanmaz; Node'da çalışır.
- `widget/` ve `defter/` yalnız `geo/` import eder; çizimi `sahne` üzerinden yapar (kendisine verilen `ctx.sahne`).
- `motor/` her şeyi bağlar; `canvas`'a yalnız `sahne.js` dokunur.
- **Düzenek dosyasında `import` satırı yoktur.** İhtiyacı olan her şey `ctx` içinde gelir. `npm run check` bunu doğrudan tarar.

---

## 3. API imzaları

Tipler JSDoc `@typedef` ile verilir; `geo/index.js` tümünü tek noktadan dışa aktarır. Gövde yazmak yazımcının işidir; **imza, ad ve dönüş şekli** buradakiyle birebir olmalıdır (`npm run imza` kontrol eder).

### 3.1 Motor

#### 3.1.1 `ctx` yapısı

```js
/**
 * @typedef {Object} Ctx  Motor tarafından her düzeneğe verilir; düzenek yalnız bunu kullanır.
 * @property {string}   id        'D09a' gibi (varyant dahil)
 * @property {Veri}     veri      Düzenek JSON'u (şema doğrulanmış, salt okunur)
 * @property {Object}   durum     Düzeneğin tüm değişken durumu; kur() içinde sıfırdan kurulur
 * @property {Rng}      rng       Seed'li üretici (Bölüm 5.1)
 * @property {Sahne}    sahne     Çizim ve vurgu API'si (3.1.2)
 * @property {Geo}      geo       geo/index.js'in tamamı
 * @property {Widget}   widget    Widget fabrikaları (3.3)
 * @property {Defter}   defter    Defter fabrikaları (3.4)
 * @property {Sembol}   sembol    sembol.goster('[AB]'), sembol.temizle()
 * @property {Ses}      ses       ses.cal('tik'|'pat'|'carpma'|'alarm') — tahta modunda sessiz
 * @property {Matik}    matik     matik.soyle(anahtar, ek?), matik.ifade('mutlu'|'saskin'|'uzgun'), matik.kivilcim()
 * @property {Mod}      mod       { tahta:boolean, pilot:boolean, ipucuKapali:boolean, metinOlcek:number }
 * @property {number}   tur       Kaçıncı tur (0'dan); çok turlu düzeneklerde motor artırır
 * @property {Araclar}  araclar   araclar.kemer: string[] (karışık sıra), araclar.kilitli: string[]
 */
```

- `ctx.durum` düzeneğe aittir; motor ona yazmaz, yalnız `kur` öncesi `{}` verir. **Modül düzeyinde `let`/değişken durumu yasak** (Sınama aynı düzeneği yeniden kurar; durum çakışmamalı).
- `ctx.veri` dondurulmuştur (`Object.freeze`); düzenek içine yazamaz.
- `ctx.matik.soyle(anahtar)` metni `veri.matik[anahtar]` ya da `veri.nedenler[anahtar]`'dan alır; anahtar yoksa `npm run check` kırmızı.

#### 3.1.2 Sahne (çizim)

```js
/**
 * @typedef {Object} Sahne
 * @property {number}  genislik   Tezgâh: 1000 birim
 * @property {number}  yukseklik  1000 birim
 * @property {number}  olcek      birim / px (güncel); pim yakalama için
 * @property {(px:number)=>number} pxToBirim
 * @property {(P:Nokta, secenek?:{ad?:string, renk?:string, boyut?:'kucuk'|'normal'|'buyuk', id?:string})=>void} pim
 * @property {(A:Nokta, B:Nokta, secenek?:CizgiSecenek)=>void} parca     İki uçta kapak
 * @property {(A:Nokta, yon:number, secenek?:CizgiSecenek)=>void} isin   Kenara kadar uzar, bir uç açık
 * @property {(A:Nokta, yon:number, secenek?:CizgiSecenek)=>void} dogru  İki uç açık
 * @property {(c:Cember, secenek?:CizgiSecenek & {dolgu?:boolean})=>void} cember
 * @property {(y:Yay, secenek?:CizgiSecenek)=>void} yay
 * @property {(k:Nokta[], secenek?:CizgiSecenek & {dolgu?:boolean})=>void} cokgen
 * @property {(merkez:Nokta, kol1:number, kol2:number, secenek?:{r?:number, renk?:string})=>void} aciYayi  Açı işareti
 * @property {(P:Nokta, anahtar:string, secenek?:{boyut?:string})=>void} etiket  Metin JSON'dan (anahtar), sayı değil
 * @property {(P:Nokta, deger:number|string)=>void} sayi   Yalnız ölçü kilidi kapalıysa çalışır; kilitliyse sessizce çizmez
 * @property {(ad:string, kaynak:string, P:Nokta, secenek?:{w?:number, h?:number, donus?:number})=>void} gorsel  varlik/ altından
 * @property {(id:string, secenek?:{sure?:number})=>void} vurgula   İ1: id'li öğe yanıp söner
 * @property {()=>void} vurguTemizle
 * @property {(cizici:(s:Sahne)=>void)=>void} hayalet   Yarı saydam katman (hizalama ipucu)
 * @property {(sayfa:'ust'|'alt')=>void} katman  Varsayılan 'alt'; widget'lar 'ust'
 * @property {(dugme:{id:string, anahtar:string, konum:'alt'|'sag', etkin?:boolean})=>void} dugme  HTML düğme; metin anahtardan
 * @property {()=>void} temizle   Motor her karede çağırır; düzenek çağırmaz
 */
/** @typedef {{renk?:string, kalinlik?:'ince'|'normal'|'kalin', kesik?:boolean, id?:string, ad?:string}} CizgiSecenek */
```

- Renkler isimle: `'mavi' | 'turuncu' | 'yesil' | 'kirmizi' | 'gri' | 'sari'`; hex yasak (tahta modunda kalınlık ve kontrast motor tarafından değiştirilir).
- `id` verilen her öğe `vurgula(id)` ve `girdi.hedef` için kullanılır.
- Sahne döndürme/ayna uygular (`sunum.js`); düzenek kendi döndürmesini yapmaz, **mantıksal koordinatta çalışır**. Açı okumalarında ayna yönü `ctx.geo.aci*` tarafından soyutlanmıştır; düzenek "ekranda sağ mı sol mu" bilmez.

#### 3.1.3 Giriş olayı

```js
/**
 * @typedef {Object} Olay
 * @property {'bas'|'surukle'|'birak'|'tik'|'dugme'|'tus'} tur
 * @property {number} x        birim
 * @property {number} y        birim
 * @property {string} [hedef]  Yakalanan öğe id'si (pim yakalama yarıçapı içinde ise)
 * @property {string} [dugmeId]
 * @property {number} [dx]     surukle: önceki olaya göre fark (birim)
 * @property {number} [dy]
 */
```

Sıra: motor olayı önce `katman:'ust'` widget'lara (`widget.girdi(olay) → true` ise tüketildi), sonra Defter'e, sonra `duzenek.girdi(ctx, olay)`'a verir. **Pim yakalama: 16 px** (telefon/tahta aynı; plandaki 12 px kullanılmaz) → `sahne.pxToBirim(16)`.

#### 3.1.4 Motor üst düzey

```js
/** @param {{kok:HTMLElement, url:URLSearchParams}} ayar @returns {Promise<void>} */
export function baslat(ayar) {}
/** @param {string} id @param {number} seed @returns {Promise<Ctx>}  Yükle, doğrula, kur */
export function duzenekAc(id, seed) {}
/** @param {Ctx} ctx @returns {Promise<Sonuc>}  calistir → animasyon → basari → kayıt */
export function calistir(ctx) {}
/** @param {Ctx} ctx @param {1|2|3} seviye @returns {void} */
export function ipucuVer(ctx, seviye) {}
/** @typedef {{tamam:boolean, yanParca:boolean, neden:string, tur:number}} Sonuc */
```

Tur mantığı: `veri.turSayisi` > 1 ise motor başarılı turdan sonra `ctx.tur++` ve `kur(ctx, rng.alt('tur'+tur).seed)` çağırır; yıldız tüm turlar bitince verilir.

### 3.2 Geometri (`geo/`)

```js
/** @typedef {{x:number, y:number}} Nokta */
/** @typedef {{A:Nokta, B:Nokta}} Parca */
/** @typedef {{A:Nokta, yon:number}} Isin             yon: derece */
/** @typedef {{A:Nokta, yon:number}} Dogru            sonsuz; A üzerinde bir nokta */
/** @typedef {{merkez:Nokta, r:number}} Cember */
/** @typedef {{merkez:Nokta, r:number, bas:number, bit:number, yon:'saat'|'ters'}} Yay */
/** @typedef {{koseler:Nokta[]}} Cokgen                sıralı, kapalı sayılır */
/** @typedef {'dar'|'dik'|'genis'|'dogru'|'tam'|'sifir'} AciTuru */

// nokta.js
export function uzaklik(P, Q) {}                         // @returns {number}
export function ortaNokta(P, Q) {}                       // iç kullanım (inşa değil); düzenek çağırmaz, lint uyarır
export function yonAci(P, Q) {}                          // P→Q derece [0,360)
export function ilerle(P, yon, uzunluk) {}               // @returns {Nokta}
export function esitMi(P, Q, tolBirim) {}                // @returns {boolean}

// aci.js
export function aciNormalize(d) {}                       // [0,360)
export function aciFark(a, b) {}                         // en küçük mutlak fark [0,180]
export function aciOlc(merkez, kol1, kol2, yon) {}       // kol1'den kol2'ye yon yönünde dönen açı [0,360)
/** @param {Nokta} merkez @param {number} kol1Yon @param {number} kol2Yon
 *  @param {'ic'|'dis'} olcekYonu  Açıölçerin okunacak ölçeği
 *  @returns {{ic:number, dis:number, dogru:'ic'|'dis'}}  Her iki ölçeğin gösterdiği sayı + hangisi doğru */
export function aciOku(merkez, kol1Yon, kol2Yon, olcekYonu) {}
export function aciTuru(d) {}                            // @returns {AciTuru}; 90 → 'dik', 180 → 'dogru', 360 → 'tam'
export function aciTuruTol(d, tol) {}                    // |d−90| ≤ tol → 'dik' (okuma toleransıyla)
export function dikMi(yon1, yon2, tol) {}
export function paralelMi(yon1, yon2, tol) {}

// dogru.js
export function dogruUzerindeMi(P, d, tolBirim) {}
export function dikme(d, P) {}                           // @returns {{ayak:Nokta, parca:Parca}}
export function noktaDogruUzakligi(P, d) {}
export function dogruKenarKesisimi(d) {}                 // tezgâh kenarlarıyla [N1,N2]; çizim için
export function hangiTarafta(P, d) {}                    // -1 | 0 | 1

// cember.js
export function cemberUzerindeMi(P, c, tolOran) {}       // |uzaklik−r| ≤ r·tolOran
export function cemberIcindeMi(P, c) {}                  // kesin iç (daire – çember)
export function yayUzerindeMi(P, y, tolOran) {}

// kesisim.js
export function kesisimDogruDogru(d1, d2) {}             // @returns {Nokta|null|'cakisik'}
export function kesisimDogruParca(d, p) {}               // @returns {Nokta|null}
export function kesisimParcaParca(p1, p2) {}
export function kesisimCemberCember(c1, c2) {}           // @returns {Nokta[]}  0, 1 veya 2 nokta
export function kesisimCemberDogru(c, d) {}              // @returns {Nokta[]}
export function kesisimYayIsin(y, i) {}                  // @returns {Nokta[]}  D08 ardışık kesim
export function ardisikKesisim(dogrular) {}              // @returns {{kapali:boolean, koseler:Nokta[], kopuk:number[]}}  D13
export function kesenMi(m, d, k) {}                      // @returns {{kesen:boolean, A:Nokta|null, B:Nokta|null, ayniNokta:boolean}}  D12b

// cokgen.js
export function disBukeyMi(c) {}
export function kendiniKeserMi(c) {}
export function icAcilar(c) {}                           // number[] (iç), köşe sırasıyla
export function disAci(c, i) {}                          // kenar uzatılınca oluşan açı; motor "toplam" hesaplamaz, düzenek de yapmaz
export function komsuMu(c, i, j) {}
export function duzgunMu(c, tolAci, tolOran) {}          // kenarlar eş VE açılar eş
export function ucgenKapanir(aci1, aci2) {}              // aci1+aci2 < 180 → true; D15 imkânsız sipariş
export function ucgenTuru(kenarlar) {}                   // {kenar:'cesitkenar'|'ikizkenar'|'eskenar', aci:'dar'|'dik'|'genis'}
export function sekliDondur(noktalar, merkez, derece, ayna) {}  // sunum; düzenek çağırmaz

// tolerans.js
export const TOLERANS = Object.freeze({ /* Bölüm 3.2.1 tablosu */ });
export function toleransIcinde(gercek, hedef, tol) {}
export function tAci(rafGenisligi) {}                    // clamp(rafGenisligi/2, 3, 8)

// uretici.js  (hepsi rng alır, Math.random yok)
export function rastgeleAci(rng, aralik, secenek) {}     // secenek: {cirkin:0.5, haric:number[], adim:1}
export function rastgeleYon(rng) {}                      // [0,360)
export function rastgeleEgim(rng) {}                     // 10–80 ∪ 100–170
export function rastgeleKolUzunlugu(rng, aci) {}         // %40 ters orantı tuzağı
export function rastgeleDisBukeyCokgen(rng, n, secenek) {}   // kenar oranı 0,6–1,6, döndürülmüş, taban yatay değil
export function rastgeleUcgen(rng, tur) {}               // tur: {kenar?, aci?}; prototipik duruş yok
export function kesisimGarantiliParametre(rng, tur) {}   // {r1, r2, AB} — iki çember kesinlikle 2 noktada kesişir
export function rastgeleCemberParametre(rng) {}          // r 120–320 birim, merkez ızgara dışı
export function lazerSenaryosu(rng) {}                   // {mod:'parca'|'isin'|'dogru', sensor:Nokta[], alarm:Nokta[]}
```

**Kesişim garantisi tanımı (D17/D18):** `|r1 − r2| + ε < |AB| < r1 + r2 − ε`, `ε = 0.08 · min(r1, r2)`; eşkenar siparişinde `r1 = r2 = |AB|` kesişir (ε tanımı bunu kapsar). `npm run seed` 1000 seed'de her tür için 2 kesişim noktası doğrular.

**Dışlama sınırı (geo):** `cokgen.js` **iç açı toplamı**, **dış açı toplamı**, **köşegen sayısı** döndüren fonksiyon içermez; `icAcilar` diziyi verir, toplamı hiç kimse göstermez. `geo/` içinde `π`, alan, çevre yoktur.

#### 3.2.1 Tolerans tablosu (`TOLERANS`)

| Anahtar | Değer | Kullanım |
|---|---|---|
| `aciRaf(genislik)` | `tAci` = genişlik/2, clamp ±3°…±8° | D09, raf genişliği 8–16° (zorluk 1: 16, 2: 12, 3: 8) |
| `aciOkuma` | ±3° | Tabloya okunan değer (D10, D11, D12, D12b, D14, D15, D16) |
| `dikme` | ±2° | D06, D07, D12b(2) |
| `uzunlukOran` | %2 · r | Pergel/çember/çap/eş parça (D04, D05, D07, D08) |
| `teraziToplam` | ±6° | D15 (üç okumanın toplamı) |
| `pimYakalamaPx` | 16 px | Tüm cihazlar; birime `sahne.pxToBirim` |
| `capCubuguPx` | 4 px | D04 çap çubuğu merkezden geçer |
| `tekrarKomsulugu` | ±5° / ±%5 | Halka tampon (Bölüm 5.1) |
| `kesisimEps` | 0,08 · min(r) | Kesişim garantisi |

Değerler `TOLERANS` sabitinden okunur; düzenek içinde sayı olarak yazılması (`3`, `0.02`) lint ile yasaktır (`no-magic-number` yalnız tolerans bağlamında; 0, 1, 2, 90, 180, 360 serbest).

### 3.3 Widget'lar (`widget/`)

Ortak kalıp: fabrika `ctx.widget.X(ayar) → Nesne`; nesne `ciz(sahne)`, `girdi(olay) → boolean`, `durum()` (serileştirilebilir düz nesne) ve `yukle(durum)` sunar. Düzenek widget'ı `ctx.durum` içinde tutar, `ciz(ctx)` içinde `w.ciz(ctx.sahne)` çağırır.

```js
/** @typedef {Object} Widget
 * @property {(a:AciolcerAyar)=>Aciolcer} aciolcer
 * @property {(a:AciTablosuAyar)=>AciTablosu} aciTablosu
 * @property {(a:PergelAyar)=>Pergel} pergel
 * @property {(a:GonyeAyar)=>Gonye} gonye
 * @property {(a:LazerAyar)=>Lazer} lazer
 */

// aciolcer.js (CX-A)
/** @typedef {{ soket?:Nokta, hizasiz?:boolean (varsayılan true: rng ile dönme 0–359, kayma ±240 birim),
 *             olcekYonu?:'ic'|'dis'|'rastgele' (varsayılan 'rastgele'), kilitli?:boolean (ölçü kilidi: çizilmez),
 *             toleransGoster?:boolean (yalnız tahta; v1.1) }} AciolcerAyar */
/** @typedef {Object} Aciolcer
 * @property {Nokta}  merkez
 * @property {number} donus            0° çizgisinin yönü
 * @property {'ic'|'dis'} olcekYonu    Bu turda sağdan/soldan sıfır
 * @property {(soket:Nokta, baslangicYon:number)=>{merkezTamam:boolean, sifirTamam:boolean}} hizaliMi   Pim yakalama + aciOkuma toleransı
 * @property {(kolYon:number)=>{ic:number, dis:number, dogru:'ic'|'dis'}} okuma   Kolun ölçekte gösterdiği
 * @property {()=>void} hizala         İ3: kendini hizalar
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi   Sürükle (merkez) + döndür (kenar tutma)
 */

// aciTablosu.js
/** @typedef {{ satir:number, sutunlar:('ad'|'tur'|'olcu'|'iliski')[], bolumler?:string[] (D12b: ['A','B']),
 *             iliskiSecenek?:('ters'|'komsuButunler'|'komsuTumler')[] }} AciTablosuAyar */
/** @typedef {Object} AciTablosu
 * @property {{bolum?:string, ad:string|null, tur:AciTuru|null, olcu:number|null, iliski:string|null}[]} satirlar
 * @property {()=>boolean} doluMu
 * @property {(gercek:{ad:string, olcu:number, iliski?:string}[], tolAci:number)=>{dogru:number, yanlis:number[]}} karsilastir
 * @property {(bolumA:number, bolumB:number)=>false} ayniKartaKoy   D12b: her zaman false döner, matik 'bolumAyri' söyler
 * @property {(i:number, veri:Object)=>void} otomatikDoldur   İ3
 * @property {(sahne:Sahne)=>void} ciz   (~~HTML katmanı; sahne yalnız konum~~ sahne: yalnız `sahne.cokgen/etiket/sayi/aciYayi`; HTML katmanı v1.1) [v1.0.x, ADT-014]
 * @property {(olay:Olay)=>boolean} girdi   Sürükle-bırak (açı bölgesi → satır)
 */

// pergel.js
/** @typedef {{ merkez?:Nokta, aciklik?:number, kilitli?:boolean, renk?:'mavi'|'turuncu', olcuKilidi:boolean }} PergelAyar */
/** @typedef {Object} Pergel
 * @property {Nokta}  merkez
 * @property {number} aciklik
 * @property {boolean} kilit
 * @property {()=>void} kilitle
 * @property {(kaynak:Pergel)=>void} kopyala          r₂ := r₁ (D17 kilidi)
 * @property {(A:Nokta, B:Nokta)=>void} acikligiAl     r := |AB| (Öklid I.1 kilidi; D07, D08, D17)
 * @property {()=>Cember} cemberCiz
 * @property {(bas:number, bit:number, yon?:'saat'|'ters')=>Yay} yayCiz
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi   Merkez sürükle; açıklık sürgüsü; kilit düğmesi
 */
// Not: olcuKilidi=true iken açıklık sayısı hiçbir yerde görünmez; pergel yalnız görsel açıklık gösterir.
// Fabrika: `widget/pergel.js` → `pergelOlustur(ayar, ortam)`, `widget/gonye.js` → `gonyeOlustur(ayar, ortam)`; Function.length 2, başka export yok. [v1.0.x, ADT-013]
// `ortam = { pxToBirim:(px)=>number, sembol?:Sembol }` (lazer ailesi, ADT-006 §2); `pxToBirim` yoksa WIDGET_AYAR_GECERSIZ; ölçü kilidi denetimi sarmalayıcıda (OLCU_KILIDI_IHLALI). [v1.0.x, ADT-013]
// Sabit sahne id'leri: `pergelMerkez`, `pergelUc`, `pergelKilit`, `gonye`, `gonyeKose`; değiştirilmesi bozucudur. [v1.0.x, ADT-013]

// gonye.js
/** @typedef {{ dogru:Dogru, kilitli?:boolean }} GonyeAyar */
/** @typedef {Object} Gonye
 * @property {boolean} oturdu      Bir kenarı doğruya yapışık (hizaliMi dikme toleransı ±2°)
 * @property {number}  t           Doğru üzerindeki konum (birim, A'dan)
 * @property {(P:Nokta)=>Parca|null} dikmeBirak   Oturmamışsa null; oturduysa P'den doğruya dikme
 * @property {()=>void} otur       İ3
 * @property {(sahne:Sahne)=>void} ciz
 * @property {(olay:Olay)=>boolean} girdi
 */

// lazer.js
/** @typedef {{ mod?:'parca'|'isin'|'dogru', donenIsin?:boolean (D03), carkAdim?:number }} LazerAyar */
/** @typedef {Object} Lazer
 * @property {'parca'|'isin'|'dogru'} mod
 * @property {Nokta|null} A
 * @property {Nokta|null} B
 * @property {number} yon               donenIsin modunda çark açısı
 * @property {()=>Parca|Isin|Dogru|null} hat
 * @property {(noktalar:Nokta[], tolBirim:number)=>boolean[]} gecerMi   Hangi sensör/alarmdan geçiyor
 * @property {(sahne:Sahne)=>void} ciz   Uç kapakları moda göre; sembol paneline bildirir
 * @property {(olay:Olay)=>boolean} girdi
 */
```

**Robot kolu widget değildir** (v1): `D09.js` kendi kolunu `sahne.parca/isin/gorsel` ile çizer; D10 (Gemini) de aynı şekilde basit bir kol çizer. KN2 sonrası ekleyici ADT ile `widget/robotKolu.js`'ye çıkarılabilir.

### 3.4 Defter (`defter/`)

```js
/** @typedef {Object} Defter
 * @property {(a:TahminRafiAyar)=>TahminRafi} tahminRafi
 * @property {(a:KuralKartiAyar)=>KuralKarti} kuralKarti
 * @property {(kart:KuralKarti, uretici:Uretici, n?:number)=>Promise<Sinama>} sina   n varsayılan 3
 * @property {(a:KisayolAyar)=>KisayolYuvasi} kisayolYuvasi
 * @property {()=>void} ac   Defter panelini açar (telefonda alt çekmece, tahtada sağ sütun)
 * @property {()=>void} kapat
 */

/** @typedef {{ hucreler:{ad:string, tur:'sayac', min:number, max:number}|{ad:string, tur:'secim', secenekler:string[]}[] ,
 *             etiketAnahtari:string }} TahminRafiAyar */
/** @typedef {Object} TahminRafi
 * @property {()=>Record<string, number|string>} deger
 * @property {()=>void} kilitle          Çalıştır'a basınca motor çağırır; sonrası değiştirilemez
 * @property {(sonuc:Record<string, number|string>)=>void} sonucKoy    Sonuç rafı
 * @property {()=>{eslesen:string[], farkli:string[]}} karsilastir     Yeşil hücreler; yıldıza etki etmez
 */

/** @typedef {{ kalipAnahtari:string,  // veri.kartlar[anahtar].kalip: "İki noktadan [1] doğru geçer"
 *             disliler:{ad:string, secenekler:(string|number)[]}[], dogru:Record<string,string|number> }} KuralKartiAyar */
/** @typedef {Object} KuralKarti
 * @property {string} anahtar
 * @property {()=>Record<string, string|number>} ayar
 * @property {()=>boolean} dogruMu           ayar === dogru (tam eşleşme)
 * @property {boolean} takili
 * @property {()=>void} tak
 * @property {()=>void} otomatikDoldur       İ3
 */

/** @typedef {(rng:Rng)=>{ornek:Object, beklenen:Record<string,string|number>, ciz:(s:Sahne)=>void}} Uretici
 *  Düzenek yazar: yeni örnek üretir, bu örnekte kartın doğru ayarını hesaplar (ctx.geo ile), örneği çizebilir. */
/** @typedef {{ basarili:boolean, sonuclar:{seed:number, tuttu:boolean}[], karsiOrnek:Object|null }} Sinama */

/** @typedef {{ kabulEdilen:string[] (kart anahtarları), sensorler:string[],
 *             cozucu:(kalan:Record<string,number>, kart:KuralKarti)=>{tamam:boolean, doldurulan:string[], eksik:string[]} }} KisayolAyar */
/** @typedef {Object} KisayolYuvasi
 * @property {KuralKarti|null} kart
 * @property {(k:KuralKarti)=>boolean} tak        Kabul listesinde değilse false, matik 'kartUymaz'
 * @property {string[]} sokulen
 * @property {(sensor:string)=>void} sok
 * @property {(sensor:string)=>void} tak_sensor   geri tak
 * @property {()=>{lamba:boolean, kurtarilan:number, eksik:string[]}} degerlendir   Gerekçe lambası + sayaç; eksik varsa tabloda '?'
 */
```

- **Sınama kuralı:** `sina` her çağrıda `rng.alt('sina', sayac)` ile **yeni** örnek üretir; öğrenci gördüğü örnek `durum.gorulen` listesinde tutulur, üretici onu dışlar. Kart tutmazsa ilk tutmayan örnek `karsiOrnek` olarak çizilir; Matik `'karsiOrnek'` anahtarını söyler.
- **Defter iç yapısına erişim yok:** düzenek Defter'in DOM'una, CSS'ine, modül dosyalarına dokunmaz; yalnız yukarıdaki nesneler. `npm run check` `duzenekler/` içinde `defter/` yolu ya da `querySelector` geçmesini yasaklar.
- "Geri sar şeridi" (son 3 denemenin hayaleti) **v1'de yok** (plan 8.2'de kesik); JSON'da alan ayrılmaz.

### 3.5 Ses, Matik, sembol

- `ctx.ses.cal(ad)`: `'tik' | 'pat' | 'carpma' | 'alarm' | 'dusme' | 'lamba'`; tahta modunda ses kapalı, `ses.cal` sessizce döner.
- `ctx.matik.soyle(anahtar, ek?)`: `ek` nesne, metindeki `{ad}` yer tutucuları doldurur (yalnız pim adı, sayı değil — ölçü kilidinde zaten sayı yok). İfade: `'mutlu' | 'saskin' | 'uzgun'` (3 ifade) + `kivilcim()`.
- `ctx.sembol.goster(sembol)`: `'[AB]' | '[AB' | 'AB' | '|AB|' | '⊥' | '//' | 'm(ABC)' | 'r' | '°'`; harfler düzenekten (`'[AB]'` yerine `sembol.goster('parca', 'A', 'B')`). Lazer modu değişince `lazer.js` kendisi çağırır.

---

## 4. Düzenek sözleşmesi

### 4.1 Dosya ve dışa aktarım

Konum: `duzenekler/Dxx/Dxx.js` + `duzenekler/Dxx/Dxx.json`. Varyantlı düzenekler: `D09/D09.js` + `D09a.json … D09f.json`; `D10/D10.js` + `D10a.json`, `D10b.json`. EK'ler ana dosyada (`D04.js` D04-EK'i de içerir; JSON'da `bolumler` ile ayrılır).

```js
/** @type {string} */ export const id = 'D07';          // JSON id ile aynı; varyantlıda 'D09' (JSON'lar 'D09a'…)
/** @type {string} */ export const surum = '1.0.0';     // Bölüm 11.3
/** @param {Ctx} ctx @param {number} seed  Durumu sıfırdan kurar; widget/defter nesnelerini oluşturur; çizmez */
export function kur(ctx, seed) {}
/** @param {Ctx} ctx  Her karede; yalnız ctx.sahne çağırır; durum değiştirmez */
export function ciz(ctx) {}
/** @param {Ctx} ctx @param {Olay} olay @returns {void}  Widget'lar tüketmediyse gelir */
export function girdi(ctx, olay) {}
/** @param {Ctx} ctx @returns {Calistirma}  Deterministik animasyon tanımı; fizik yok */
export function calistir(ctx) {}
/** @typedef {{ sure:number (ms), kare:(t:number)=>void (t∈[0,1], durum'u ara konuma getirir), bitti:()=>void }} Calistirma */
/** @param {Ctx} ctx @returns {{tamam:boolean, yanParca:boolean, neden:string}}  neden: veri.nedenler anahtarı; tamam=true → 'tamam' */
export function basari(ctx) {}
/** @param {Ctx} ctx @param {1|2|3} seviye @returns {{anahtar?:string}}
 *  1: ctx.sahne.vurgula(...) çağırır; 2: {anahtar:'i2'} döner (metin JSON'dan, motor gösterir); 3: durum'u yarım çözüme getirir */
export function ipucu(ctx, seviye) {}
/** @param {Ctx} ctx @param {TahtaAyar} ayarlar  Tahta modunda kur'dan sonra; büyük düğme/etiket düzeni, kilit yok */
export function tahta(ctx, ayarlar) {}
/** @typedef {{ metinOlcek:number, ipucuKapali:boolean, seed:number, toleransGoster:boolean, dondur:boolean }} TahtaAyar */
```

Yalnız bu 9 dışa aktarım; fazlası/eksiği `npm run imza`'da kırmızı. Yardımcı fonksiyonlar modül içinde `export`suz kalır.

### 4.2 Davranış kuralları

1. `kur` **çizmez**, DOM'a dokunmaz, `ctx.rng`'yi verilen seed ile kullanır (motor `rng`'yi seed'ler; düzenek `rng.seed` okuyabilir ama yeniden seed'lemez).
2. `ciz` saf çizimdir; `durum`u değiştiren `ciz` lint ile değil KN'de yakalanır — KALDI nedenidir.
3. `calistir` `kare(t)` ile ara durum üretir; kol dönüşü, damla hareketi, tren: hepsi `t`'nin fonksiyonu. `bitti()` nihai durumu yazar; motor sonra `basari` çağırır.
4. `basari` yan etkisizdir; aynı durumda aynı sonucu verir (1000-seed testi `kur → İ3 ×k → basari` zincirini de dener).
5. `ipucu(…, 3)` tam çözüm değil **ilk adım**dır (plan: "makine ilk adımı kendi yapar"); her düzenek JSON'unda `ipucu[2].ne` alanı ne yapıldığını düz Türkçe yazar (Hakan okur).
6. Çok turlu düzenekte her tur yeni parametre; `durum.gecmis` motor tarafından `kayit.son5` ile beslenir (Bölüm 5.1 halka tampon).
7. Ölçü kilidi (`bayraklar.olcuKilidi: true`, D08/D17/D18): `sahne.sayi` çizmez, açıölçer `kilitli:true` olmadan oluşturulamaz, `araclar.kilitli = ['aciolcer','cetvel']`. Düzenek bunun üstüne sayı basarsa `npm run seed` kırmızı (sahte sahne `sayi` çağrısını sayar).
8. Düzenek **sipariş sırasını** `rng.karistir(veri.siparisler)` ile karıştırır (D11–D16).
9. Yıldız: `basari().tamam` → ⭐ tamamlandı; `yanParca` → ⭐ yan parça; başka yıldız yok. Tahmin rafı, ipucu, deneme sayısı yıldıza etki etmez.

### 4.3 Düzenek JSON şeması (`sema.json`, JSON Schema draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "matik-atolyesi/sema/duzenek/v1",
  "title": "Matik Düzenek Verisi",
  "type": "object",
  "additionalProperties": false,
  "required": ["semaSurumu","id","kod","surum","arac","baslik","zorluk","sureDk","kapsam","bayraklar","matik","ipucu","nedenler","parametreler","turSayisi"],
  "properties": {
    "semaSurumu": { "const": "1.0" },
    "id":   { "type": "string", "pattern": "^D(0[1-9]|1[0-8])[a-f]?$" },
    "kod":  { "type": "string", "pattern": "^D(0[1-9]|1[0-8])b?$", "description": "Hangi .js dosyası" },
    "surum": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "arac": { "enum": ["A","B","C","D","E","F","G","H"] },
    "baslik": { "type": "string", "maxLength": 40 },
    "zorluk": { "type": "integer", "minimum": 1, "maximum": 3 },
    "sureDk": { "type": "number", "minimum": 0.5, "maximum": 8 },
    "kapsam": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^5\\.3\\.[1-7][a-dç]?$" } },
    "turSayisi": { "type": "integer", "minimum": 1, "maximum": 6 },
    "bayraklar": {
      "type": "object", "additionalProperties": false,
      "required": ["olcuKilidi","kartSayisi","tahminRafi","sinama","sensorSokme","aciolcerGorunur"],
      "properties": {
        "olcuKilidi": { "type": "boolean" },
        "kartSayisi": { "type": "integer", "minimum": 0, "maximum": 3 },
        "tahminRafi": { "type": "boolean" },
        "sinama": { "type": "boolean" },
        "sensorSokme": { "type": "boolean" },
        "aciolcerGorunur": { "type": "boolean" },
        "yanParca": { "type": "boolean", "default": false }
      }
    },
    "matik": {
      "type": "object", "additionalProperties": { "$ref": "#/definitions/metin" },
      "required": ["giris","basari","tekrar"],
      "properties": { "giris": {}, "basari": {}, "tekrar": {}, "yanlisArac": {}, "kilit": {} }
    },
    "ipucu": {
      "type": "array", "minItems": 3, "maxItems": 3,
      "items": [
        { "type": "object", "additionalProperties": false, "required": ["vurgu"], "properties": { "vurgu": { "type": "array", "items": { "type": "string" } }, "ne": { "$ref": "#/definitions/metin" } } },
        { "type": "object", "additionalProperties": false, "required": ["metin"], "properties": { "metin": { "$ref": "#/definitions/metin" } } },
        { "type": "object", "additionalProperties": false, "required": ["ne"], "properties": { "ne": { "$ref": "#/definitions/metin" } } }
      ]
    },
    "nedenler": { "type": "object", "required": ["tamam"], "additionalProperties": { "$ref": "#/definitions/metin" } },
    "siparisler": {
      "type": "array", "maxItems": 9,
      "items": { "type": "object", "additionalProperties": false, "required": ["id","metin"],
        "properties": { "id": { "type": "string" }, "metin": { "$ref": "#/definitions/metin" }, "parametre": { "type": "object" }, "imkansiz": { "type": "boolean" } } }
    },
    "kartlar": {
      "type": "object",
      "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["kalip","disliler","dogru"],
        "properties": {
          "kalip": { "type": "string", "pattern": "\\[\\w+\\]" },
          "disliler": { "type": "array", "items": { "type": "object", "required": ["ad","secenekler"], "properties": { "ad": { "type": "string" }, "secenekler": { "type": "array", "minItems": 2, "maxItems": 5 } } } },
          "dogru": { "type": "object" }
        } }
    },
    "tahminRafi": { "type": "array", "items": { "type": "object", "required": ["ad","tur"], "properties": { "ad": {}, "tur": { "enum": ["sayac","secim"] }, "min": {}, "max": {}, "secenekler": {}, "etiket": { "$ref": "#/definitions/metin" } } } },
    "parametreler": {
      "type": "object",
      "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["min","max"],
        "properties": { "min": { "type": "number" }, "max": { "type": "number" }, "adim": { "type": "number", "default": 1 }, "haric": { "type": "array", "items": { "type": "number" } }, "cirkinOran": { "type": "number", "minimum": 0, "maximum": 1 } } }
    },
    "yanParca": { "type": "object", "additionalProperties": false, "properties": { "metin": { "$ref": "#/definitions/metin" }, "basari": { "$ref": "#/definitions/metin" } } },
    "bolumler": { "type": "array", "items": { "type": "string" }, "description": "D04: ['kapak','ek']; D12b: ['A','B']" },
    "etiketler": { "type": "object", "additionalProperties": { "$ref": "#/definitions/metin" }, "description": "sahne.etiket anahtarları, düğme metinleri" },
    "notlar": { "type": "string", "maxLength": 600, "description": "R1/Hakan için; koda girmez" }
  },
  "definitions": {
    "metin": { "type": "string", "minLength": 1, "maxLength": 140, "pattern": "^[^<>]*$" }
  }
}
```

Şema notları: tüm metin ≤ 140 karakter (tahta %150'de iki satıra sığar); HTML yok; `kartSayisi` ile `kartlar` nesnesinin anahtar sayısı `npm run sema`'da çapraz doğrulanır; `bayraklar.sinama=true` ise `kartSayisi ≥ 1`; `olcuKilidi=true` ise `aciolcerGorunur=false` zorunlu. `iskelet.js` bu şemaya göre 20 geçerli JSON üretir (metinler `"TODO-R1"` ile), Matematimatikçe 6 Kas'ta commit eder; sahipler doldurur, R1 metinleri yazar.

### 4.4 D01 şablonu (düzyazı; Gemini bunu kopyalayarak başlar)

D01.js'nin bölüm sırası sabittir ve diğer tüm düzenekler bu sırayı izler:

1. Başlık yorumu: `// D01 · Dolap Düzeni · sahip CX-M · sözleşme v1.0`.
2. `export const id`, `export const surum`.
3. `kur`: `ctx.durum = {}` içine: parametreler (`rng` ile), öğe listeleri (id'li), widget nesneleri, `tur`, `asama`.
4. Modül içi yardımcılar (çizim parçaları, yakalama, sipariş mantığı) — `export`suz, ≤ 40 satır her biri.
5. `ciz`: arka plan öğeleri → hareketli öğeler → widget `ciz` → vurgu (motor). Hiç `if (durum.x) durum.x = …` yok.
6. `girdi`: `switch (olay.tur)`; sürükleme `olay.hedef` ile; düğmeler `olay.dugmeId`.
7. `calistir`: `{sure, kare, bitti}` döner.
8. `basari`, `ipucu`, `tahta`.

Gemini'nin kuru koşusu (5–7 Kas, motor yokken): `node araclar/kuru.js duzenekler/D02/D02.js D02.json 42` komutu `ctxSahte` ile `kur → ciz → girdi (betikli olay dizisi) → calistir → basari` zincirini koşar, sahne çağrılarını listeler. Kırmızı çıkan çağrı (`sayi` kilitli alanda, bilinmeyen anahtar) teslim öncesi düzeltilir.

---

## 5. Rastgelelik, yasaklar, kayıt

### 5.1 Seed'li RNG (`motor/rng.js`)

```js
/** @typedef {Object} Rng
 * @property {number} seed                 uint32
 * @property {()=>number} sayi             [0,1)  — mulberry32
 * @property {(min:number, max:number, adim?:number)=>number} tam   kapalı aralık, adım
 * @property {(p?:number)=>boolean} bool   p varsayılan 0.5
 * @property {<T>(dizi:T[])=>T} sec
 * @property {<T>(dizi:T[])=>T[]} karistir   Fisher–Yates, yeni dizi
 * @property {(etiket:string)=>Rng} alt     Bağımsız alt akış: seed = hash32(seed + ':' + etiket)
 * @property {(min:number, max:number, haric:number[], komsuluk:number)=>number} tamHaric   Halka tampon için
 */
export function rngOlustur(seed) {}
export function hash32(metin) {}            // FNV-1a
export function seedUret(duzenekId, tekrarSayaci, zaman) {}   // öğrenci modu: hash32(id+':'+tekrar+':'+Date.now())
```

- Algoritma **mulberry32** (tek kaynak, 32-bit, 15 satır). Aynı seed → aynı düzenek, her cihazda, her tarayıcıda.
- Seed kaynağı: öğrenci modunda `seedUret` (motor); tahta modunda `&seed=`; Sınama'da `rng.alt('sina:'+n)`; tur için `rng.alt('tur:'+tur)`. Düzenek `rng.alt` ile kendi alt akışlarını açabilir, asla kendi seed üretmez.
- **Halka tampon ("tekrar etmeme hafızası"):** motor, düzenek başına son 5 ana parametre değerini `kayit.son5[duzenekId]` olarak tutar ve `ctx.durum.gecmis` olarak verir; düzenek ana parametresini `rng.tamHaric(min, max, gecmis, komsuluk)` ile üretir (`komsuluk`: açı için 5, uzunluk için `%5·aralık`). Hangi parametrenin "ana" olduğu JSON `parametreler` içinde ilk anahtardır. Tahta modu tampona yazmaz.
- Date, performance, Math.random **asla** rastgelelik kaynağı değildir; `Date.now()` yalnız `seedUret` içinde, motor'da.

### 5.2 Düzenek kodunda yasaklar (`npm run yasak`, `duzenekler/**`)

| Yasak | Neden | Ne kullanılır |
|---|---|---|
| `Math.random` | Determinizm | `ctx.rng` |
| `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` | Tek kayıt noktası, gizlilik | `ctx.durum` (geçici), motor kaydeder |
| `document`, `window`, `navigator`, `querySelector`, `getElementById`, `addEventListener` | Düzenek DOM bilmez | `ctx.sahne.dugme`, `ctx.defter` |
| `canvas`, `getContext`, `CanvasRenderingContext2D`, `Path2D`, `requestAnimationFrame` | Çizim yalnız sahne | `ctx.sahne.*`, `calistir().kare` |
| `import`, `require`, `fetch`, `XMLHttpRequest`, `WebSocket` | Bağımlılık yok | `ctx.geo`, `ctx.widget`, `ctx.defter` |
| `setTimeout`, `setInterval`, `Date`, `performance` | Zaman determinizmi | `calistir().sure` ve `kare(t)` |
| `console.*` | Temiz çıktı | Yok; hata `throw new Error('KOD')` |
| `eval`, `new Function`, `innerHTML` | Güvenlik | — |
| Türkçe karakterli string literal (`[çğıöşüÇĞİÖŞÜ]`) ve 3+ sözcüklü string | Metin JSON'da | `ctx.matik.soyle(anahtar)` |
| `Object.assign(ctx.veri …)`, `ctx.veri.x = ` | Veri salt okunur | `ctx.durum` |
| `#rrggbb`, `rgb(` | Tema/tahta kontrastı motorda | Renk adları |
| Modül düzeyinde `let`/`var` | Yeniden kurulabilirlik | `ctx.durum` |
| `/geo/`, `/motor/`, `/defter/`, `/widget/` yol dizgileri | Erişim ctx'ten | — |

Aynı yasakların DOM kısmı `geo/` için de geçerlidir (Node'da koşar). `motor/sahne.js` ve `motor/giris.js` canvas/DOM'a dokunan tek dosyalardır; `motor/kayit.js` localStorage'a dokunan tek dosyadır (lint `files` filtresiyle).

### 5.3 localStorage şeması (`motor/kayit.js`)

Anahtar: `matik.atolye.tema1` · Değer: JSON · **İsim, e-posta, cihaz kimliği, IP yok.** Tahta modu **okumaz, yazmaz**.

```js
/** @typedef {Object} Kayit
 * @property {1} semaSurumu
 * @property {"TYMM-2026"} curriculumVersion
 * @property {string} uygulamaSurumu            "1.0.0"; etiketle aynı
 * @property {number} olusturma                 Date.now() (yalnız şema göçü için; kimlik değil)
 * @property {boolean} pilotMode                true: Robot Kolu ilk araç
 * @property {{ses:boolean, metinOlcek:1|1.25}} ayarlar
 * @property {Record<string, DuzenekKaydi>} duzenekler   anahtar: 'D09a', 'D12b'…
 * @property {{aciklar:string[]}} ilerleme       Açık araç harfleri ['A','B'…]
 */
/** @typedef {Object} DuzenekKaydi
 * @property {boolean} tamam
 * @property {boolean} yanParca
 * @property {number}  tekrar          Kaç kez tamamlandı
 * @property {number[]} son5           Ana parametrenin son 5 değeri (halka)
 * @property {number}  sonSeed         Yeniden oynama değil; hata bildirimi için
 */
```

- Yazma: yalnız `basari().tamam` sonrasında ve ayar değişince. Boyut ≤ 8 kB.
- Yıldız yalnız artar: `tamam = tamam || yeni`.
- Şema göçü: `semaSurumu` farklıysa `kayit.js` eski kaydı dönüştürür, dönüştüremezse yalnız `duzenekler` yıldızlarını taşır, gerisini sıfırlar; hiçbir zaman "kayıt bozuk" diye siler.
- Öğretmen özeti (QR, anonim yıldız sayımı) v1.1'dir; şemaya alan eklenmez (ekleyici değişiklikle gelir).

---

## 6. Kodlama standartları ve `npm run check`

### 6.1 Standartlar

- ES2020, `'use strict'` gerekmez (modül). Noktalı virgül var, 2 boşluk girinti, tek tırnak, satır ≤ 100 karakter.
- Fonksiyon ≤ 40 satır; dosya ≤ 400 satır (boş ve yorum satırları dahil). Daha uzunsa bölünür; düzenek bölünemez → tasarım sadeleşir ya da widget ADT'si.
- Her dışa aktarım JSDoc'lu; tipler bu belgedeki `@typedef` adlarını kullanır (`Nokta`, `Ctx`…). `// @ts-check` **yok** (v1); JSDoc belge içindir, `npm run imza` adları ve parametre sayılarını denetler.
- Hata: `throw new Error('KOD_BUYUK_HARF')`; mesaj Türkçe cümle değil kod; motor kodu `docs/hatalar.md`'de açıklar.
- Açı değerleri derece **tam sayı** (`rng.tam` ile); hesaplanan açılar `Math.round` ile tam sayıya yuvarlanır ancak tolerans karşılaştırması yuvarlamadan önce yapılır (`aciOlc` ham döner, `aciOku` yuvarlanmış döner).
- Sihirli sayı yok: toleranslar `TOLERANS`'tan, aralıklar `veri.parametreler`'den.
- Yorumlar Türkçe (ASCII zorunlu değil; yorumda `ç ş` serbest). Kod tanımlayıcıları ASCII.
- Varlık yolu: `sahne.gorsel(ad, 'varlik/ikon/pergel.svg', …)`; SVG tercih, PNG ≤ 100 kB.
- Erişilebilirlik: her `sahne.dugme` HTML `<button>`; dokunma hedefi ≥ 44 px; renk tek başına bilgi taşımaz (ters açı eş renk **+** eş desen); odak sırası soldan sağa.

### 6.2 `npm run check` (Matematikçe her teslimde; PR'da zorunlu yeşil)

Sıra sabittir, ilk kırmızıda durmaz, hepsini raporlar:

| # | Komut | Ne yapar | Kırmızı ölçütü |
|---|---|---|---|
| 1 | `npm run lint` | ESLint (flat config, `araclar/lint.config.js`): `no-undef`, `no-unused-vars`, `no-var`, `prefer-const`, `eqeqeq`, `no-implicit-globals`, `max-lines:400`, `max-lines-per-function:40`, `max-len:100`; `duzenekler/**` için `no-restricted-globals/properties/syntax` (Bölüm 5.2 listesi), `no-restricted-imports: ["*"]` | Herhangi bir hata |
| 2 | `npm run yasak` | `araclar/yasak.js`: regex taraması (lint'in kaçırdığı dizgi biçimleri: `"localStorage"` string'i, `window['document']`, yol dizgileri, Türkçe literal, hex renk) | Eşleşme |
| 3 | `npm run sahiplik` | Dal adı → ajan; `git diff --name-only main...HEAD` → Bölüm 2.1 tablosu | Yetkisiz dosya |
| 4 | `npm run satir` | Dosya ≤ 400 satır; JSON ≤ 12 kB; `varlik/` ≤ 1,2 MB; ilk yükleme kümesi ≤ 2 MB | Aşım |
| 5 | `npm run sema` | Ajv ile her `duzenekler/**/*.json` ↔ `sema.json` + çapraz kurallar (4.3 notları) + JS'deki `matik.soyle/etiket/nedenler` anahtarları JSON'da var mı (statik tarama) | Şema hatası, eksik anahtar |
| 6 | `npm run imza` | Her düzeneği `import()` eder; tam 9 dışa aktarım, isim ve `length` (parametre sayısı) kontrolü; `geo/index.js`, `widget/*`, `defter/*` dışa aktarımları bu belgedeki listeyle birebir (`araclar/imzaListesi.json`, Fable günceller) | Eksik/fazla/ad farkı |
| 7 | `npm run test` | `node --test test/`: geo birim testleri (kesişim, dış bükeylik, `aciOku` iç/dış, `ucgenKapanir`, `kesisimGarantiliParametre`, `tamHaric`) | Başarısız test |
| 8 | `npm run seed` | `araclar/seedTesti.js`: her düzenek × her varyant × seed 1…1000, `ctxSahte` ile `kur → ciz → ipucu(1) → ciz → ipucu(3) → ciz → calistir().kare(0, .5, 1) → bitti → basari`. Doğrular: istisna yok; `basari` şekli; her parametre `veri.parametreler` aralığında; `olcuKilidi` iken `sahne.sayi` 0 çağrı; D13 `disBukeyMi` yalnız dış bükeyde `tamam`; D17/D18 kesişim 2 nokta; D12b `ayniKartaKoy` hiç `true` dönmez; D14 tabloda toplam satırı yok (`satirlar.length === koseSayisi`); hiç prototipik duruş (taban yatay ±3°) üretilmez; halka tampon komşuluğu ihlal edilmez | Herhangi biri |
| 9 | `npm run boyut` | Pages kümesi boyut raporu | ≤ 2 MB |

Çıktı: `docs/check/<dal>-<tarih>.txt` (Matematimatikçe PR'a yapıştırır). Süre hedefi ≤ 90 sn (1000 seed × 24 birim).

### 6.3 Node birim testleri (CX-M yazar, 4–5 Kas)

`test/geo.test.js` en az şu 20 durumu içerir: paralel/çakışık doğru, teğet çember (1 nokta), kesişmeyen çember, iç içe çember, kenar-dışı kesişim, 0°/180°/360° açı, iç/dış ölçek karşılaştırması, saat/ters yön, dış bükey ↔ iç bükey beşgen, kendini kesen dörtgen, `ucgenKapanir(90, 90) === false`, ` `ucgenKapanir(60, 60) === true`, `ucgenKapanir(100, 80) === false` (sınır: eşitlik kapanmaz), `kesisimGarantiliParametre` ile üretilen 1000 parametrede `kesisimCemberCember` tam 2 nokta, `tamHaric` 5 çağrıda komşuluk ihlali sıfır ve boş `haric` ile eşit dağılım, `aciTuruTol(92, 3) === 'dik'` fakat `aciTuru(92) === 'genis'`, `dikme` ayağının doğru üzerinde olması (`dogruUzerindeMi` ile), `hangiTarafta` üç değer, `ardisikKesisim` kopuk dizisinin kapanmayan çitte dolu dönmesi, `kesenMi` iki kesişim noktası çakışınca `ayniNokta:true`, `duzgunMu` döndürülmüş karede `true` / eşkenar dörtgende `false`, `yayUzerindeMi` yay dışında kalan çember noktasında `false`, `aciNormalize(-30) === 330`, `aciFark(350, 10) === 20`.

Her test `node:test` ile yazılır; `describe` adı fonksiyon adıdır (`describe('kesisimCemberCember')`), `it` adı Türkçe düz cümledir. Testlerde `Math.random` yok; rastgelelik gereken testler `rngOlustur(1)…rngOlustur(1000)` döngüsü kullanır. `npm run test` 10 saniyeyi geçmez; geçerse seed sayısı 1000'den düşürülmez, test bölünür (`test/geo.hizli.test.js` + `test/geo.seed.test.js`).

### 6.4 Sahte bağlam (`motor/ctxSahte.js`)

Node'da ve tarayıcıda "kuru koşu" için motor olmadan `ctx` üretir. GM-D 5–7 Kas'ta motor yokken bununla yazar; `npm run seed` 1000-seed zincirini bununla koşar.

```js
/** @param {string} id @param {Veri} veri @param {number} seed @param {{tahta?:boolean}} [secenek]
 *  @returns {Ctx}  Gerçek geo + gerçek rng; sahte sahne/widget/defter/matik/ses */
export function ctxSahteOlustur(id, veri, seed, secenek) {}
/** @param {Ctx} ctx @returns {{cagrilar:{ad:string, arg:unknown[]}[], sayac:Record<string, number>}}  sahne kayıt defteri */
export function sahneKaydi(ctx) {}
```

Davranış:

- `sahne.*` her çağrıyı `cagrilar` listesine ekler, hiçbir şey çizmez; `sayac['sayi']` ölçü kilidi denetimi için okunur.
- `widget.*` ve `defter.*` fabrikaları gerçek nesneleri döndürür (widget'lar `geo`'ya dayanır, DOM'a değil; `ciz` sahte sahneye yazar). `aciTablosu` ve `kuralKarti` HTML katmanı olmadan çalışır: `satirlar`/`ayar` düz nesnedir.
- `matik.soyle(anahtar)` anahtarı `veri.matik ∪ veri.nedenler ∪ veri.etiketler` içinde arar; yoksa `throw new Error('MATIK_ANAHTAR_YOK')` — `npm run seed` bunu kırmızı sayar.
- `ses.cal` boş; `mod.tahta` seçenekten.
- `giris` yok; kuru koşu betiği olayları doğrudan `duzenek.girdi(ctx, olay)`'a verir. Betik olay dizisi `duzenekler/Dxx/Dxx.kuru.json` (isteğe bağlı, ≤ 2 kB, şema dışı; `npm run seed` varsa kullanır, yoksa yalnız ipucu zinciri).

`araclar/kuru.js`: `node araclar/kuru.js <js> <json> <seed> [--tahta] [--dokum]`. `--dokum` sahne çağrılarını satır satır basar; GM-D teslim mesajına bu dökümün ilk 30 satırını ekler.

### 6.5 Tanımlı hata kodları (`docs/hatalar.md`, CX-M başlatır)

Motor ve geo `throw new Error('KOD')` kullanır; kod listesi ve Türkçe açıklaması `docs/hatalar.md`'de. v1 çekirdek listesi: `SEMA_HATASI`, `DUZENEK_YOK`, `IMZA_EKSIK`, `MATIK_ANAHTAR_YOK`, `OLCU_KILIDI_IHLALI`, `PARAMETRE_ARALIK_DISI`, `RNG_SEED_GECERSIZ`, `KAYIT_SEMA_GOCU`, `SAHNE_ID_CAKISMA`, `WIDGET_AYAR_GECERSIZ`. Düzenek yeni kod uyduramaz; yeni kod gerekirse ADT (ekleyici).

---

## 7. Dal, commit ve PR kuralları

### 7.1 Dallar

| Ajan | Dal öneki | Örnek | Kim açar |
|---|---|---|---|
| CX-M | `cx-m/` | `cx-m/K-07-defter` | Codex cloud ya da Matematikçe |
| CX-A | `cx-a/` | `cx-a/K-12-D09b` | Codex cloud |
| CX-Z | `cx-z/` | `cx-z/K-21-D12b` | Codex cloud |
| GM-D / GM-T / GM-E | `gm/` | `gm/G-04-D04`, `gm/G-T2-ihlal-avi` | **Matematikçe** (Gemini depoya dokunmaz) |
| Matematikçe (R1 metin, biletler, varlık) | `m/` | `m/R1-D05-metin`, `m/varlik-ikon` | Matematikçe |
| Fable | `sozlesme/` | `sozlesme/v1.0.2` | Matematikçe (Fable'ın metniyle) |

Dal adı: `<önek><bilet no>-<kısa ASCII ad>`; `npm run sahiplik` öneki okur. Bir dalda **tek bilet, tek düzenek** (D09 varyantları tek dal olabilir: `cx-a/K-13-D09b-f`). Dal `main`'den açılır, PR öncesi `main` üstüne **rebase** edilir (merge commit yok); `--force-with-lease` yalnız kendi dalında, `main`'de asla.

`main` korumalıdır: doğrudan push kapalı, PR zorunlu, `npm run check` durum kontrolü yeşil zorunlu, birleştirmeyi yalnız Matematikçe yapar (**squash**). Pages `main` kökünden yayınlar; her birleştirme yayındır, bu yüzden kırık `main` = kırık Pages; KALDI alan iş `main`'e girmez.

### 7.2 Commit mesajı

```
<alan>(<kapsam>): <Türkçe, ≤ 72 karakter, mastar değil geniş zaman>

<isteğe bağlı gövde: ne, neden; ≤ 10 satır>

Bilet: K-21 · Sözleşme: v1.0 · Check: yeşil
```

`<alan>`: `motor | geo | widget | defter | duzenek | metin | varlik | test | arac | sozlesme | docs`. `<kapsam>`: dosya ya da düzenek id (`duzenek(D12b)`, `geo(kesisim)`). Örnek: `duzenek(D12b): kesen sınırı ve aynı nokta reddi eklenir`. Bir commit tek konudur; "düzeltmeler" tek başına mesaj değildir.

### 7.3 PR şablonu (`.github/PULL_REQUEST_TEMPLATE.md`, Matematikçe 3 Kas'ta koyar)

```
Bilet: K-21 · Ajan: CX-Z · Sözleşme: v1.0 · Düzenek: D12b (surum 1.0.0)
Değişen dosyalar: (liste; sahiplik tablosuna uygun)
npm run check: (docs/check/<dal>-<tarih>.txt bağlantısı; 9 satırın tamamı)
Kuru koşu / seed: (1000 seed süresi, sayi çağrısı sayısı)
Dışlama kontrolü: (Bölüm 9'dan ilgili maddeler; her biri "yok / nasıl sağlandı")
Hakan için bağlantı: ?mod=tahta&duzenek=D12b&seed=…
Bilinen eksik: (varsa; bilet no ile)
```

Şablonun bir alanı boşsa Matematikçe PR'ı incelemeye almaz. Gemini teslimleri sohbet çıktısıdır; Matematikçe `gm/` dalına yazar, şablonu Gemini'nin ilk satır başlığından (`// DOSYA: … · satır: 312`) doldurur, `npm run check` koşar, kırmızıysa **PR açmadan** Gemini'ye döner (`docs/check` çıktısını yapıştırarak).

### 7.4 İnceleme ve birleştirme sırası

1. `npm run check` yeşil (durum kontrolü otomatik).
2. Matematikçe tarayıcıda 1 dk: Pages önizlemesi (`?mod=tahta&duzenek=…&seed=42`), telefonda dikey.
3. Hakan üç satır (düzenek PR'larında; motor/geo PR'larında gerekmez).
4. Squash + `main`. Birleştirme mesajı PR başlığıdır.
5. KN günlerinde Fable kararı **birleştirilmiş** `main` üstünden verilir; KALDI alan düzenek `main`'den geri alınmaz, `index.html` dolabından **gizlenir** (`veri.bayraklar` değil, `docs/kapsam.json` listesi; motor bu listede olmayanı yüklemez).

### 7.5 Yasaklar

- `main`'e doğrudan commit; `node_modules`, `docs/check` dışı üretilmiş dosya, `.DS_Store`, kişisel yapılandırma commit'i.
- Bir PR'da iki ajanın sahiplik alanı (motor + düzenek birlikte → iki PR; önce motor).
- İmza değiştiren PR'ın açıklamasında ADT numarası yoksa kırmızı (`npm run imza` + `sahiplik` çapraz: `araclar/imzaListesi.json` değişmişse PR gövdesinde `ADT-` geçmeli).
- "WIP" PR yok; bitmemiş iş dalda bekler, PR yalnız bilet kabul ölçütü karşılanınca.

---

## 8. Türkçe metin üslubu ve Matik'in tonu

Bu bölüm R1 (Matematikçe) ve Hakan içindir; JSON'daki her `metin` alanı buna göre yazılır. `npm run metin` (`araclar/metin.js`) makineyle ölçülebilen kısmı denetler: uzunluk ≤ 140, HTML yok, yasak sözcük listesi, `{ad}` dışı yer tutucu yok, ölçü kilidi düzeneklerinde rakam yok.

### 8.1 Genel üslup (tüm metinler)

1. **Hitap "sen".** "Pimi tut", "deneyelim". "Siz" yok; "öğrenci", "kullanıcı" yok.
2. **Kısa.** Bir cümle, en fazla iki. 140 karakter tahta %150'de iki satır; telefonda üç satırı geçen metin R1'de kısalır.
3. **Soru/şık/puan dili yok.** "Doğru cevap", "yanlış", "puan", "başarısız", "test", "sınav", "soru" sözcükleri yasak listesinde. Düzenek bir **sipariş**tir; makine **çalışır** ya da **takılır**. Yıldız "kazanılmaz", parça **tamamlanır**.
4. **Terim TYMM ile aynı.** Doğru, doğru parçası, ışın, açı, açıölçer, pergel, gönye, çember, daire, köşe, kenar, dik, paralel, eş. "Segment", "ray", "vertex" yok. "Çevre", "alan", "toplam" düzenek metninde geçmez (Bölüm 9).
5. **Sayı yazımı.** Rakamla: `90°`, `3 cm` (yalnız ölçü kilidi kapalı düzeneklerde ve yalnız `sahne.sayi` yerine metinde gerekiyorsa). Ölçü kilidi düzeneklerinde (D08, D17, D18) metinde **hiç rakam yok** (`metin.js` tarar). Ondalık virgül.
6. **Yer tutucu** yalnız `{ad}` (pim adı, tek harf); sayı, ölçü, renk yer tutucusu yok.
7. **Büyük harf.** Cümle başı; "Matik", "Defter", "Dolap", "Robot Kolu" özel ad; araç adları küçük (açıölçer, pergel).
8. **Noktalama.** Ünlem en fazla bir; üç nokta "…" tek karakter; emoji yok (Matik'in ifadesi görselden gelir).
9. **Cinsiyet, isim, yaş, sınıf yok.** "Arkadaşım", "usta" hitabı olmaz; Matik adı söylemez.
10. **Düğme metni** (`etiketler`): mastar değil emir, en fazla iki sözcük: `Çalıştır`, `Yeniden kur`, `Defteri aç`, `Sipariş al`.

### 8.2 Matik kimdir

Atölyenin tamirci robotu. Makineleri sever, öğrenciyi **ortağı** sayar. Üç ifadesi var (mutlu, şaşkın, üzgün) ve kıvılcım. Şakacıdır ama **espriyi makineye ve kendine yapar, öğrenciye yapmaz**. Açıklama yapmaz, **gözlem** söyler: ne olduğunu, makinenin ne "hissettiğini". Çözümü söylemez (o İ3'ün işi, o da ilk adım). Konu anlatımı yapmaz; "doğru parçası iki ucu olan…" cümlesi Matik'in ağzından **çıkmaz** — bu Defter kartının işidir ve kart da bunu öğrencinin dişlileriyle kurdurur.

**Ses tonu kuralları:**

| Yapar | Yapmaz |
|---|---|
| Makineyi kişileştirir: "Kol itiraz ediyor." | Öğrenciyi yargılar: "Yanlış yaptın." |
| Kendi beceriksizliğine güler: "Ben de ilk gün açıölçeri ters tuttum." | Alay eder: "Bu kadar basit bir şeyi…" |
| Merak eder: "Acaba bu sefer nereye gidecek?" | Soru sorar gibi sınar: "Sence kaç derece?" |
| Teşvik eder: "Bir tur daha, ben buradayım." | Baskı kurar: "Çabuk ol", "Son şansın" |
| Somut gözlem: "Damla raya değmedi, yana kaçtı." | Soyut ders: "Dikme en kısa yoldur." |
| Tahmini över: "Tahmin rafı dolu, çalıştıralım." | Tahmini değerlendirir: "Tahminin tuttu, aferin." |

### 8.3 Anahtar başına örnekler

Zorunlu anahtarlar: `giris`, `basari`, `tekrar`. Sık kullanılanlar: `yanlisArac`, `kilit`; `nedenler.*`; `ipucu[1].metin`; `yanParca.basari`; Defter: `karsiOrnek`, `kartUymaz`, `bolumAyri`.

**`giris`** (sipariş geldi; Matik mutlu/şaşkın; ne istendiğini değil **durumu** söyler):
- D02: "Lazer kafası kapağa takıldı. Hattı kur, sensörler ışığı görsün."
- D06: "Yağ damlası tam raya inmeli. Gönye tezgâhta, biraz tozlu."
- D08: "Bu tezgâhta cetvel yok, açıölçer yok. Pergel var, o yeter dedim."
- D09a: "Açıölçeri geçen vardiyadan dönük bırakmışım. Önce onu yerine oturt."
- D13: "Çit makinesine dört kazık verdim, kapalı bir avlu istiyorum. Keçi kaçmasın."

**`basari`** (makine çalıştı; Matik mutlu + kıvılcım; **neden** çalıştığını ima eder, formül vermez):
- D04: "Kapak tam oturdu. Merkeze olan uzaklık her yerde aynıydı, demek ki."
- D07: "İki ray hiç buluşmadı, tren rahat. Paralellik böyle bir şey."
- D11: "Tablodaki bütün açılar yerini buldu. Kol artık tıkırdamıyor."
- D17: "Üç kenar birbirine eş çıktı, hiç ölçmeden. Pergelin işi bu."

**`tekrar`** (yeni tur ya da yeniden kurma; Matik mutlu; kısa):
- "Aynı makine, başka sipariş. Parçalar yeni."
- "Kolu sıfırladım. Bu sefer açı başka yere bakıyor."
- "Yeni halka geldi, eskisini sakladım."

**`nedenler.*`** (`basari().tamam === false`; Matik üzgün ya da şaşkın; **gözlem + makine**; çözüm yok, "yanlış" yok):
- D02 `sensorKacti`: "Işık ikinci sensörün yanından geçti, değmedi. Sensör küstü."
- D05 `aciklikDegisti`: "Bant ilk halkadan geniş çıktı. Pergel yolda açılmış olmalı."
- D09 `olcekTers`: "Kol durdu ama sipariş rafının dışında. Açıölçerin öbür sırasına baktın galiba."
- D12b `ayniNokta`: "İki tel aynı noktada kesti. Bu düzenekte iki ayrı pim lazım."
- D13 `icBukey`: "Avlu içe çöktü, keçi köşeden kaçar. Çit makinesi böyle avluyu boyamaz."
- D15 `imkansiz`: "Bu sipariş kapanmıyor; iki kol birbirine hiç ulaşmaz. Fişi geri yollayalım."
- D16 `olmaz`: "Pano bu parçayı reddetti. 'Olmaz' mührü kendi kendine bastı."
- `yarimKaldi` (ortak): "Bir şey eksik. Makine çalıştı, yarı yolda sustu."

**`yanlisArac`** (kemerden uygun olmayan araç alındı):
- "Bu iş için cetvel ağır kalır. Kemerde başka bir şey var."
- "Açıölçer bu tezgâhta kilitli; pergel bakıyor sana."

**`kilit`** (araç ya da düzenek kilitli):
- "Bu makine henüz dolaptan çıkmadı. Öncekiler bitince anahtarı veririm."
- "Ölçü kilidi takılı. Bugün göz kararı değil, pergel kararı."

**`ipucu[1].metin`** (İ2; **ne yapılacağını değil nereye bakılacağını** söyler; Matik şaşkın):
- D06: "Gönyenin bir kenarı raya tam yapışmalı; arada hava var."
- D09b: "Sıfır çizgisi kolun üstünde mi? Açıölçer iki yerden sıfır başlatır."
- D14: "Köşegen yalnız komşu olmayan köşeleri bağlar. Komşuyu tutunca kenar olur."
- D18: "Önce pergeli |AB| kadar aç, sonra merkezi değiştir; açıklık kilitli kalsın."

**`ipucu[2].ne`** (İ3; Hakan için düz Türkçe, Matik söylemez): "Açıölçerin merkezi A pimine oturtulur; sıfır çizgisi serbest bırakılır." — kodda `ipucu(ctx, 3)` bunu yapar.

**`yanParca.basari`** (⭐ yan parça, v1.1'de etkin; metin şimdiden yazılabilir): "Ekstra parça da yerine geçti. Dolapta boş kanca kalmadı."

**Defter anahtarları** (`matik` nesnesinde; Defter motor üzerinden çağırır):
- `karsiOrnek`: "Kart bu örnekte tutmadı. Bak, burada aynı kural başka bir şey diyor."
- `kartUymaz`: "Bu kart bu yuvaya girmiyor; dişleri farklı."
- `bolumAyri`: "A tablosu ile B tablosu ayrı. Bu düzenekte iki pim birbirini tanımıyor."
- `sinamaBasladi`: "Üç yeni örnek üretiyorum, kartı bunlarda deneyelim."
- `sinamaTamam`: "Üçte üç. Kartı tak, makine kısayol tanır."

### 8.4 Yasak sözcük listesi (`araclar/metin.js`)

`soru, cevap, yanlış, hata, puan, not, sınav, test, başarısız, kaybettin, kazandın, aferin, bravo, tebrikler, çabuk, acele, son şans, formül, toplam, alan, çevre, pi, π, derece toplamı, köşegen sayısı, yöndeş, iç ters, dış ters, kural şu, unutma ki, bilmelisin`. Liste `docs/yasakSozcuk.txt`'te; R1 ekleyebilir, çıkaramaz (çıkarma ADT'siz yalnız Fable). "Aferin/bravo" yasağı tonla ilgilidir: Matik över ama ödül dağıtmaz; övgü makineye ya da sürece gider ("Makine ilk seferde tuttu").

### 8.5 Tahta modu metni

Aynı JSON, aynı metin; motor `metinOlcek` uygular. Tahta için ayrı "öğretmen cümlesi" yoktur (v1). Metin 140 karakterde iki satıra sığmıyorsa R1 kısaltır; tahta metni telefon metnini belirler, tersi değil.

---

## 9. TYMM dışlamalar listesi

Tema 1 kapsamı `5.3.1–5.3.7` (JSON `kapsam` alanı). Aşağıdaki kavramlar bu temada **yok**: ekranda görünmez, Matik söylemez, Defter kartı kurdurmaz, `geo/` fonksiyon olarak sunmaz. Astra (A1) 18–21 Kas'ta bu listeye karşı imzalar; `npm run seed` ve `npm run metin` makineyle denetlenebilen maddeleri uygular. Liste **ekleyici değişikliğe açıktır** (madde eklenir), madde çıkarmak bozucudur (Bölüm 11).

| # | Dışlanan | Nerede sızabilir | Nasıl kapatıldı | Denetim |
|---|---|---|---|---|
| 1 | **Çokgen iç açılar toplamı** (ve `(n−2)·180` formülü) | D14 tablo "toplam" satırı; D13 açılar | `icAcilar` dizi verir, toplam fonksiyonu yok; `aciTablosu` satır sayısı = köşe sayısı; "toplam" yasak sözcük | `seed`: D14 `satirlar.length === koseSayisi`; `metin` |
| 2 | **Dış açılar toplamı (360°)** | D14 `disAci` | `disAci(c, i)` tek köşe; toplam yok | `imza`, `metin` |
| 3 | **Köşegen sayısı formülü** `n(n−3)/2` | D14 Köşe Tamiri | Köşegen **tek tek** çizilir; sayı istenmez, sayaç yok | `seed`: D14 tahmin rafında `koseGenSayisi` hücresi yok |
| 4 | **Üçgen iç açıları toplamı 180°** | D15 Üçgen Terazisi | `ucgenKapanir(aci1, aci2)` yalnız "kapanır/kapanmaz" döner; terazi **görsel** dengelenir (`teraziToplam ±6°`), sayı 180 ekranda yazılmaz | `metin`: "180" D15 JSON'unda yasak; `seed`: `sahne.sayi(180)` çağrısı yok |
| 5 | **Kesen doğrunun paralellerle yaptığı açılar** (yöndeş, iç ters, dış ters, karşı durumlu) — 7. sınıf | D12b Kesen Tel | Düzenek iki pimi **ayrı tablolarda** (`bolumler:['A','B']`) işler; `ayniKartaKoy` her zaman `false`; A'daki açı ile B'deki açı arasında ilişki satırı yok (`iliskiSecenek` yalnız `ters`, `komsuButunler`, `komsuTumler` — **aynı pim içinde**) | `seed`: `ayniKartaKoy` hiç `true` dönmez; `metin`: yöndeş/iç ters yasak |
| 6 | **İç bükey çokgen** (kavram olarak) | D13 Çit, D14 | İç bükey üretilmez (`rastgeleDisBukeyCokgen`), öğrenci çizerse **ret** (`icBukey` nedeni); "iç bükey/dış bükey" sözcükleri Matik'te geçmez, yalnız "avlu içe çöktü" | `seed`: D13 `disBukeyMi === false` → `tamam === false` |
| 7 | **Çember/daire çevre ve alanı, π** | D04 Kapak, D04-EK, D17/D18 | `geo/` içinde π, alan, çevre yok; Kapak "merkeze eş uzaklık" ile tamamlanır; daire–çember ayrımı pim yerleştirmeyle (10.9 varsayılanı: iç/üzeri) | `yasak`: `Math.PI` düzenek ve geo'da yalnız derece↔radyan çevrimi için `aci.js` içinde tek yerde |
| 8 | **Ölçülü açı çizimi ve ölçme "sayısı" (ölçü kilidi düzeneklerinde)** | D08, D17, D18 | `olcuKilidi:true` → `sahne.sayi` çizmez, açıölçer/cetvel kilitli, metinde rakam yok. Öklid I.1 **ölçmeden** kurulur | `seed`: `sayac['sayi'] === 0`; `metin` |
| 9 | **Üçgen eşitsizliği** (kenar toplamı karşılaştırması) | D15, D17 | D15 yalnız açı ile "kapanır/kapanmaz"; kenar uzunluğu karşılaştırması yok | `imza`: `geo/`de `ucgenEsitsizligi` yok |
| 10 | **Simetri, öteleme, dönme (dönüşüm geometrisi)** | `sekliDondur`, ayna | `sunum.js` iç işi; öğrenci "döndür" komutu vermez; D10b çizimli nesne kesik | `yasak`: `sekliDondur` düzenekte çağrılamaz |
| 11 | **Benzerlik/eşlik ispatı, KAK vb.** | D17 eş kenar | "Eş" yalnız `uzunlukOran` toleransıyla **görsel** karşılaştırma; kural kartı "iki pergel açıklığı eşse parçalar eştir"den öteye gitmez | KN5 |
| 12 | **Koordinat sistemi, (x, y) etiketi** | Her yer | Birim koordinat motor içi; ekranda eksen, ızgara numarası yok; pimler harfle adlandırılır | `seed`: `sahne.etiket` anahtarı `x`/`y` ile başlayamaz |
| 13 | **Açı ölçü birimi dönüşümü (radyan, grad), dakika/saniye** | Açıölçer | Yalnız tam derece | `imza` |
| 14 | **Çokgen adlandırma sınıflamaları** (yamuk, paralelkenar, deltoid özellik listesi) | D16 İstek Panosu | D16 panosu yalnız "kenar eş / açı dik / kenar paralel" kilitlerini birleştirir; isim verilmez, "Olmaz" mührü geometri ile | `metin`: yamuk/paralelkenar/deltoid yasak; KN5 |
| 15 | **Soru–şık–puan ve "doğru/yanlış" geri bildirimi** | Tüm metinler | Sipariş/çalıştır/takıldı dili; yıldız yalnız tamamlanma | `metin` yasak sözcük |
| 16 | **Kimlikli kayıt** (ad, sınıf, e-posta, cihaz kimliği) | `kayit.js` | Şema alanı yok; tahta modu kayıt tutmaz | `yasak` + KN6 |

**Kapsam içi ve sınırda kalanlar (yanlış anlaşılmasın):** komşu, tümler, bütünler, ters açı **aynı pim üstünde** kapsam içidir (D11, D12, D12-EK); dik/paralel kapsam içidir; düzgün çokgen "kenarlar eş ve açılar eş" olarak kapsam içidir (D14 Düzgün Yapıcı); çember üzerinde/içinde nokta kapsam içidir (D04-EK). Sınırdaki her madde için düzenek JSON'unun `notlar` alanında "sınır nerede" bir cümleyle yazılır; Astra okur.

---

## 10. Tahta modu, iframe ve cihaz gereksinimleri

### 10.1 Telefon dikey (birinci hedef)

- **Tasarım tabanı:** 360 × 640 CSS px (en dar hedef); 390 × 844 ve 412 × 915 doğrulama cihazları (GM-E listesi). Tezgâh karesi genişliğe oturur (360 px → `olcek = 1000/360 ≈ 2,78 birim/px`), üstte Matik şeridi (≥ 56 px), altta araç kemeri (≥ 64 px), Defter **alt çekmece** (ekranın en çok %60'ı; açıkken sahne küçülür, kaymaz).
- **Dokunma:** hedef ≥ 44 × 44 px; pim yakalama 16 px (Bölüm 3.1.3); sürüklemede parmağın altında kalmaması için tutulan pim 24 px yukarı **ofsetli hayalet** ile çizilir (`sahne.hayalet`); `touch-action: none` yalnız canvas'ta.
- **Yatay tutulursa:** kilit yok; motor tezgâhı yüksekliğe oturtur, Defter sağa geçer. Ama **tasarım dikeye göre yapılır**; yatayda "çalışıyor" yeter.
- **Güvenli alan:** `env(safe-area-inset-*)`; alt kemer çentik/çubuk altında kalmaz.
- **Performans:** 60 Hz hedef, ≤ 30 Hz'de de oynanır; `calistir().kare(t)` zaman tabanlı (kare sayısı değil `t`), bu yüzden yavaş cihazda animasyon uzamaz, seyrekleşir. Canvas `devicePixelRatio` ≤ 2 ile sınırlı (3× cihazda 2× çizilir).
- **Yükleme:** ilk ekran (dolap) ≤ 2 MB, 3G'de ≤ 8 sn; düzenek tembel; `varlik/` SVG. Çevrimdışı: yüklenmiş düzenek kayıt olmadan tekrar açılır (önbellek tarayıcıya bırakılır; service worker **yok**, v1).
- **Tarayıcı tabanı:** iOS Safari 15+, Android Chrome 100+, Samsung Internet 17+; ES2020 modül + dinamik `import()` + `Object.freeze` yeter. Polyfill yok. Eski cihazda açılmıyorsa `index.html` düz HTML "tarayıcını güncelle" cümlesi gösterir (tek Türkçe cümle `.html` içinde; `metin.js` bu dosyayı taramaz).

### 10.2 Tahta modu (`?mod=tahta`, ikinci hedef)

URL parametreleri (`motor/tahta.js` okur, `ctx.mod` ve `TahtaAyar`'a yazar):

| Parametre | Değer | Varsayılan | Etki |
|---|---|---|---|
| `mod` | `tahta` | — | Tahta düzeni açılır; `kayit.js` **okumaz/yazmaz**; ses kapalı; kilit yok (tüm düzenekler ve araçlar açık) |
| `duzenek` | `D09a`, `D12b`… | dolap | Doğrudan düzenek açılır |
| `seed` | uint32 | `1` | `rng` bu seed ile; aynı seed = aynı düzenek (sınıf listesi için) |
| `ipucu` | `0 \| 1` | `1` | `0`: ipucu düğmesi gizlenir (`mod.ipucuKapali`) |
| `metin` | `100 \| 150` | `150` | `metinOlcek` 1,5: tüm metin %150; düğmeler ≥ 64 px |
| `tolerans` | `0 \| 1` | `0` | v1.1: raf/tolerans bandı görünür (`toleransGoster`); v1'de yok sayılır |
| `dondur` | `0 \| 1` | `0` | v1.1: tahta dondur/hayalet; v1'de yok sayılır |
| `kontrast` | `0 \| 1` | `1` | Kalın çizgi, koyu zemin üzerinde açık renk; renk adları motor tarafından tahta paletine eşlenir |

- **Düzen:** 16:9, 1920 × 1080 tasarım tabanı; sol 1080 × 1080 tezgâh, sağ 840 px sütun: üstte Matik (büyük), ortada Defter (**her zaman açık**, çekmece değil), altta düğmeler. Araç kemeri tezgâhın altında yatay.
- **Dokunmatik tahta:** aynı 16 px yakalama (tahta pikseli büyük, parmak büyük; 12 px plan değeri kullanılmaz). Fare ile sürükleme desteklenir (`giris.js` pointer events).
- **Projeksiyon (dokunmasız):** klavye: `Tab` öğe sırası, ok tuşları seçili pimi 5 birim taşır, `Shift+ok` 1 birim, `R`/`E` seçili açıölçer/pergeli ±1° döndürür, `Enter` Çalıştır, `?` ipucu (ipucu kapalı değilse). `olay.tur:'tus'` ile düzeneğe gelir; düzenek klavye bilmek zorunda değildir, motor tuşu sürükle/tik olayına çevirir.
- **Seed listesi:** Matematikçe `docs/seed/sinif-13kas.md`: her düzenek için 5 seed + beklenen "çirkin" parametre; tahtada açılan seed URL'de görünür, Hakan not alır.
- **`tahta(ctx, ayarlar)`** düzenek çengeli: büyük etiket/düğme düzeni; **ipucu ve kilit mantığına dokunmaz**, bunlar motor işidir. Boş bırakılabilir (ama dışa aktarılmalı).
- **Halka tampon** tahta modunda okunmaz/yazılmaz; `ctx.durum.gecmis = []`.

### 10.3 Tablet (üçüncü hedef)

Telefon dikey düzeni 768 px genişliğe kadar; üstünde tahta düzeni (Defter sağda). Ayrı tasarım yok; GM-E tur 2'de bakılır, P1 üstü bulgu v1.1.

### 10.4 iframe gömme (`motor/kopru.js`)

Okul sitesi (`docs/cihaz/site.md`'de adres) uygulamayı iframe ile gömer:

```html
<iframe src="https://prgrm03-cmd.github.io/matik-at-lyesi/?mod=tahta&duzenek=D09a&seed=17"
        width="100%" style="aspect-ratio:16/9;border:0"
        allow="fullscreen" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>
```

- **`allow-same-origin` gerekir** (öğrenci modunda `localStorage` için; Pages kökeni kendi kökeni olduğundan veri siteye sızmaz). Tahta modunda `localStorage` kullanılmadığı için `sandbox="allow-scripts"` yeterlidir; `kayit.js` erişim hatasını yutar, kaydı atlar (**"kayıt bozuk" hatası gösterilmez**).
- **Köprü (`postMessage`):** yalnız dışa bildirim, içe komut **yok** (v1). Mesaj şekli: `{kaynak:'matik', tur:'hazir'|'duzenekAcildi'|'tamamlandi'|'boyut', id?:string, seed?:number, tamam?:boolean, yanParca?:boolean, yukseklikPx?:number}`. Hedef köken: `kopru.js` `document.referrer` kökenine gönderir; referrer yoksa göndermez. Kimlik, yıldız sayımı, süre **gönderilmez**.
- `boyut` mesajı ile ana sayfa iframe yüksekliğini dikey telefonda ayarlar (16:9 sabit oran telefonda uygun değil; `aspect-ratio` yalnız tahta gömmesinde).
- **Üst sayfa stil sızıntısı yok:** iframe kendi `stil.css`'ini yükler; `rem` yerine `px` + `clamp()`; `viewport-fit=cover`.
- **Doğrudan bağlantı yedeği:** iframe açılmazsa (CSP, eski site) Pages adresi QR olarak `docs/cihaz/qr.svg`; 9 Kas'ta gerçek sitede deneme (KN3 girdisi).
- **Yasak:** `window.top`, `parent.document` erişimi; `kopru.js` yalnız `window.parent.postMessage`. `X-Frame-Options` Pages'te yoktur; kontrol üst sitededir.

### 10.5 Erişilebilirlik asgarisi (GM-E listesi, v1)

- Renk tek başına bilgi taşımaz: ters açılar eş renk **ve** eş tarama deseni; dik işareti kare; paralel çift çentik.
- Her `sahne.dugme` `<button>`; `aria-label` metin anahtarından; odak halkası görünür.
- Metin ölçeği 1,25 öğrenci modunda ayar (`ayarlar.metinOlcek`), 1,5 tahtada.
- Hareket azaltma (`prefers-reduced-motion`): animasyon süresi `sure` yerine 300 ms'ye kısalır, `kare(1)` doğrudan; `calistir` bundan habersizdir.
- Ekran okuyucu: v1'de sahne için yok (canvas); Defter ve düğmeler okunur. Tam destek Aralık.

---

## 11. Değişiklik usulü (ADT) ve sürümleme

### 11.1 Ne değişebilir, kim değiştirir

| Alan | KN3 öncesi (3–9 Kas) | KN3 sonrası (v1.0 donduruldu) |
|---|---|---|
| Bölüm 3 imzaları, `sema.json`, Bölüm 5.3 kayıt şeması | Fable günceller (`v1.0-taslak.n`), CX-M uygular; günde en fazla bir toplu güncelleme (sabah) | **Yalnız ekleyici**: yeni isteğe bağlı parametre, yeni fonksiyon, yeni isteğe bağlı JSON alanı, yeni hata kodu, yeni `matik` anahtarı. Mevcut ad/parametre/dönüş şekli/zorunlu alan değişmez |
| Bölüm 0, 2, 7 (zemin, sahiplik, dal) | Fable | Değişmez (v1.0 ömrü boyunca) |
| Bölüm 8 yasak sözcükler, Bölüm 9 dışlamalar | Fable / R1 ekler | Madde eklenir; çıkarma bozucudur |
| Bölüm 10 URL parametreleri | Fable | Yeni parametre ekleyici; mevcut varsayılan değişmez |
| Tolerans değerleri (3.2.1) | Hakan 3 Kas (10.5); sonra Fable | Değer değişikliği **bozucu sayılmaz** (1000 seed yeniden koşar) ama ADT ister; KN kararına bağlanır |
| Düzenek JSON metinleri | R1 serbest | R1 serbest (`npm run metin` yeşilse) |
| Düzenek `.js` gövdesi | Sahibi | Sahibi; imza sabit |

**Ekleyici** = eski düzenek kodu değişmeden derlenir ve aynı davranır. **Bozucu** = en az bir mevcut düzenek değişmek zorunda kalır ya da eski kayıt/JSON doğrulamayı geçemez. KN3 sonrası bozucu değişiklik yalnız Fable mini kontrolüyle ve varsayılan cevap **hayır**dır; evet ise Bölüm 11.4'teki sürüm sıçraması uygulanır.

### 11.2 ADT (Arayüz Değişiklik Talebi) biçimi

Dosya: `docs/adt/ADT-NNN-<kisa-ad>.md` (NNN sıralı; Matematikçe numara verir). Kim yazar: ihtiyacı olan ajan (GM-D, CX-A, CX-Z, R1, GM-E); CX-M kendi için de yazar (motor içi bile olsa imza etkileniyorsa).

```
# ADT-014 · pergel.yayCiz yön parametresi varsayılanı
Tarih: 8 Kas · Yazan: GM-D · Düzenek/bilet: D05 / G-05 · Tür: ekleyici | bozucu | tolerans | metin
İstenen: (tek cümle; imza varsa JSDoc satırı)
Neden: (hangi düzenek, hangi davranış, sözleşmede neden yok; "sözleşme §3.3" atfıyla)
Sözleşmede var mı? (ADT yazan önce arar; §… "yok" ya da "var ama yetersiz: …")
Etkilenen dosyalar: (sahiplik tablosundan)
Geçici çözüm: (düzenek ADT beklemeden nasıl ilerler; yoksa "bloke")
Alternatif: (imzayı değiştirmeden çözüm var mı)
--- Matematikçe ---
Ön karar: kapandı (sözleşmede var §…) | CX-M'ye | Fable'a (mini kontrol)
--- CX-M ---
Uygulandı: dal, PR, sözleşme notu v1.0.x
--- Fable (yalnız bozucu/tolerans) ---
Karar: GEÇTİ | KALDI · gerekçe (≤ 3 satır) · sözleşme sürümü
```

**Akış:**

1. Ajan ADT'yi yazar; bileti "bloke" işaretlemek yalnız geçici çözüm yoksa.
2. **Matematimatikçe aynı gün** bakar: sözleşmede varsa ADT'yi "kapandı" ile kapatır, ajana § numarasını yollar (ADT'lerin yarısının böyle kapanması beklenir). Yoksa türünü doğrular.
3. **Ekleyici** → CX-M kuyruğu; sabah toplu, günde bir kez; CX-M küçük PR + `sozlesme.md`'ye **Fable'ın yazdığı** ek satır (Matematikçe Fable'a ADT özetini atar, Fable 3 satır metin döner; API değil, claude.ai). Aynı gün `araclar/imzaListesi.json` güncellenir, `npm run imza` yeşil.
4. **Bozucu / tolerans** → Fable mini kontrolü (çağır koşulu b); günde en fazla 1, toplam 8 çağrının içinde. Karar sözleşmeye işlenir.
5. **Metin türü** (yasak sözcük, Matik anahtarı ekleme) → R1 ile Matematikçe arası; Fable'a gelmez.
6. Reddedilen ADT silinmez; `docs/adt/` içinde kalır, gerekçesiyle.

Kaçak değişiklik (ADT'siz imza/şema değişikliği) `npm run sahiplik` + `imza` ile kırmızıdır; geri alınır, bilet sahibine döner.

### 11.3 Düzenek sürümü (`export const surum`, JSON `surum`)

Semver, düzenek başına; `.js` ve `.json` **aynı** sürümü taşır (`npm run sema` çapraz kontrol).

- **Yama** `1.0.x`: davranış aynı, hata düzeltme, metin değişikliği (R1 yalnız bunu artırır).
- **Küçük** `1.x.0`: yeni parametre aralığı, yeni sipariş, yan parça ⭐ eklenmesi, yeni ipucu metni; eski seed aynı sonucu vermeyebilir → `docs/seed/` listesi yenilenir.
- **Büyük** `x.0.0`: düzenek sözleşme sürümü değişti (v2 sözleşme) — Tema 1 v1 ömründe olmaz.

`kayit.js` düzenek sürümünü saklamaz; yıldız sürümden bağımsızdır.

### 11.4 Sözleşme ve uygulama sürümü

| Nesne | Biçim | Kim artırır | Ne zaman |
|---|---|---|---|
| Sözleşme (`sozlesme.md` başlık) | `v1.0-taslak.n` → `v1.0` (9 Kas) → `v1.0.x` (ekleyici ADT) → `v1.1` (v1.1 teslimiyle; yalnız yeni bölüm/alan) | Fable | Her ADT uygulanınca `v1.0.x` + `docs/degisiklik.md` satırı |
| Şema (`semaSurumu` const) | `"1.0"` sabit v1 boyunca; ekleyici alanlar `additionalProperties` genişletilerek eklenir, `required` listesi büyümez | Fable (ADT) | Yalnız bozucu kararla `"1.1"` → `yukleyici.js` eski JSON'u kabul etmeye devam eder (eksik alan varsayılan) |
| Kayıt (`Kayit.semaSurumu`) | `1`; göç `kayit.js` | CX-M (ADT) | Yalnız alan silinirse/anlam değişirse `2`; alan eklemek sürüm artırmaz |
| Uygulama (`uygulamaSurumu`, git etiketi, Pages) | `v0.5` (12 Kas) · `v0.8` (18 Kas) · `v1.0` (22 Kas) · `v1.1` (29 Kas) · `v1.2` (Aralık); aralarda `v0.8.1` gibi yamalar | Matematikçe | KN kararından sonra; etiket mesajı KN kararının ilk satırı |
| `imzaListesi.json` | `sozlesmeSurumu` alanı sözleşmeyle aynı | Fable günceller, Matematikçe commit | Her sözleşme sürümüyle |

**Donma kuralları (KN3 sonrası):** `required` alan eklenmez; mevcut `enum` değeri silinmez; fonksiyon parametresi eklenirse sona ve isteğe bağlı; dönüş nesnesine alan eklenebilir, alan silinemez/yeniden adlandırılamaz; tolerans değeri değişirse 1000 seed ve `docs/seed` listesi yenilenir; URL parametresi varsayılanı değişmez; `localStorage` anahtarı `matik.atolye.tema1` değişmez.

**`docs/degisiklik.md`** her sürüm satırı: `v1.0.3 · 11 Kas · ADT-014 · pergel.yayCiz yon varsayılanı 'saat' · etkilenen: widget/pergel.js · bozucu: hayır`. Dondurmadan sonra bu dosya sözleşmenin tek değişiklik günlüğüdür; sözleşme gövdesine değişiklik işlenirken ilgili satırın sonuna `[v1.0.3, ADT-014]` eklenir, eski metin **silinmez**, üstü çizilir (`~~eski~~ yeni`), böylece v1.0 ile yazılmış düzenek neyi kaçırdığını görür.

**Tema 2 hazırlığı:** Tema 2 sözleşmesi bu belgeyi `import` eder gibi okur: Bölüm 0, 2, 3.1, 3.2, 5, 6, 7 ortak; Bölüm 3.3–3.4, 4.3, 8, 9 tema başına yeniden yazılır. Bu belge Tema 2 için değiştirilmez; `sozlesme-tema2.md` ayrı dosya, Aralık'ta.

---

*Sözleşme v1.0-taslak sonu. Sonraki söz: 5 Kas 19:00, KN1 kararı.*