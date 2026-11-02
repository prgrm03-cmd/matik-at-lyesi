# Matik'in Atölyesi – Tema 1 · Bilet Seti 1 (3–7 Kasım)

*Yazar: Claude Fable · 3 Kasım 2026 09:30 · Dayanak: Sözleşme v1.0-taslak · Yapıştıran: Matematikçe · Durum: KN1 (5 Kas 19:00) ve KN2 (7 Kas 19:00) için*

**Not (Fable, sahiplik eki):** `araclar/`, `test/`, `docs/hatalar.md` ve `motor/ctxSahte.js` sahibi **CX-M**'dir; §2.1 tablosuna KN1'de bu satır eklenir, ADT gerekmez. `araclar/imzaListesi.json` ilk sürümünü CX-M sözleşmeden türetir, sonraki güncellemeler Fable'ındır.

---

## 0. Sıra ve bağımlılık

| No | Ajan | İş | Bağımlı olduğu | Başlangıç | Son saat | Dal |
|---|---|---|---|---|---|---|
| K-01 | CX-M | `geo/` + `motor/rng.js` + `tolerans` + Node testleri | — (yalnız sözleşme) | 3 Kas 10:00 | **4 Kas 12:00** | `cx-m/K-01-geo-rng` |
| K-02 | CX-M | Motor çekirdeği (sahne, giriş, yükleyici, kayıt, sunum, tahta, köprü) + `index.html` + D01 iskeleti | K-01 (`geo/index.js` imzaları; paralel başlanır, birleşme K-01'den sonra) | 3 Kas 10:00 | **4 Kas 19:00** | `cx-m/K-02-motor` |
| K-03 | CX-M | `ctxSahte.js` + `araclar/kuru.js` + `seedTesti.js` + `sema.json` + `iskelet.js` + `widget/lazer.js` (asgari) | K-01, K-02 (yalnız `Sahne` tipi) | 4 Kas 12:00 | **5 Kas 15:00** | `cx-m/K-03-sahte-seed` |
| K-04 | CX-M | `npm run check` iskeleti (9 komut, lint, yasak, sahiplik, imza, metin, boyut) | K-03 (`sema.json`, `seedTesti`) | 4 Kas 15:00 | **5 Kas 17:00** → KN1 19:00 | `cx-m/K-04-check` |
| G-01 | GM-D | D02 Lazer Hattı, kuru yazım | Yalnız sözleşme; kuru koşu K-03 birleşince Matematikçe koşar | 5 Kas 09:00 | **5 Kas 18:00** (teslim) · kuru koşu 6 Kas 10:00 | `gm/G-01-D02` (Matematikçe açar) |
| K-05 | CX-A | `widget/aciolcer.js` + Node testi | K-01, K-02, K-03 (`main`'de olmalı) | 6 Kas 09:00 | **6 Kas 19:00** | `cx-a/K-05-aciolcer` |
| K-06 | CX-A | D09a (Robot Kolu, varyant a) | K-05 birleşmiş, K-04 yeşil | 7 Kas 09:00 | **7 Kas 17:00** → KN2 19:00 | `cx-a/K-06-D09a` |

**Birleştirme sırası:** K-01 → K-02 → K-03 → K-04 → (G-01, K-05 paralel) → K-06. K-01 ve K-02 aynı anda açılır; K-02, `geo/index.js`'i K-01'in imza listesinden okuyarak yazar, gövdeyi beklemez. G-01 motoru hiç beklemez. KN1 kararı K-01…K-04 birleşmiş `main` üstünden verilir.

**Her bilet için ortak kabul:** (a) sözleşmedeki imza/ad/dönüş şekli birebir (§3, §4.1); (b) dosya ≤ 400 satır, fonksiyon ≤ 40 satır, satır ≤ 100 (§6.1); (c) commit mesajı §7.2 biçiminde, PR şablonu §7.3 eksiksiz; (d) K-04 birleştikten sonra `npm run check` 9/9 yeşil; öncesinde `npm test` yeşil + Matematikçe'nin elle kontrolü; (e) sözleşmede olmayan bir şey gerekirse kod uydurulmaz, `docs/adt/ADT-NNN` yazılır (§11.2); geçici çözüm varsa bilet bloke sayılmaz.

---

## K-01 · CX-M · `geo/` + `motor/rng.js` + tolerans + Node birim testleri

- **Düzenek/modül:** `geo/` (9 dosya), `motor/rng.js`, `test/`, `package.json`, `docs/hatalar.md` (başlangıç).
- **Girdi dosyaları:** `sozlesme.md` §0, §1, §2.2, §3.2, §3.2.1, §5.1, §6.1, §6.3, §6.5, §9 (7, 9, 13. satırlar).
- **Beklenen çıktı:**
  - `geo/nokta.js`, `geo/aci.js`, `geo/dogru.js`, `geo/cember.js`, `geo/kesisim.js`, `geo/cokgen.js`, `geo/tolerans.js`, `geo/uretici.js`, `geo/index.js`
  - `motor/rng.js` (`rngOlustur`, `hash32`, `seedUret`)
  - `test/geo.test.js` (10 sn'yi aşarsa `test/geo.hizli.test.js` + `test/geo.seed.test.js`), `test/rng.test.js`
  - `package.json` (`"type":"module"`, `scripts.test = "node --test test/"`, Node 20 `engines`)
  - `docs/hatalar.md` (§6.5 listesi + Türkçe açıklama)
- **Kabul ölçütü:**
  1. `npm test` yeşil, toplam ≤ 10 sn; §6.3'teki 20 durumun **tamamı** `describe(fonksiyonAdi)` / `it('Türkçe cümle')` ile var.
  2. `geo/` içinde hiç `import` yok; `document/window/canvas/performance/Date/Math.random` yok (`grep` ile Matematikçe bakar).
  3. `geo/cokgen.js`'de iç açı toplamı, dış açı toplamı, köşegen sayısı, `ucgenEsitsizligi`, alan, çevre fonksiyonu **yok**; `Math.PI` yalnız `geo/aci.js`'de tek yerde.
  4. `kesisimGarantiliParametre` 1000 seed × 3 tür (`cesitkenar`, `ikizkenar`, `eskenar`) → `kesisimCemberCember` her birinde tam 2 nokta.
  5. `rastgeleDisBukeyCokgen` 1000 seed'de `disBukeyMi === true`, taban yatay değil (en uzun kenar yönü 0°/180°'ye ±3° içinde değil); `rastgeleUcgen` aynı şekilde prototipik duruş üretmez.
  6. `tamHaric(min,max,haric,komsuluk)` 5 çağrıda komşuluk ihlali 0; boş `haric` ile 1000 çağrıda her değer en az bir kez.
  7. `aciOlc` ham (ondalık) döner, `aciOku` yuvarlanmış tam sayı döner (§6.1).
  8. `rngOlustur(42).sayi()` ilk 5 değeri `test/rng.test.js`'de sabit olarak yazılır (determinizm kanıtı; başka cihazda aynı çıkar).
  9. `TOLERANS` `Object.freeze`'li, §3.2.1'in 9 anahtarı var.
  10. Hakan testi: **yok** (geo PR'ında gerekmez, §7.4).
- **Son saat:** 4 Kas 12:00.
- **Dal:** `cx-m/K-01-geo-rng`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-M'sin (Codex). Proje: Matik'in Atölyesi, Tema 1. Ekli sozlesme.md tek dayanağındır;
belge ile çelişen hiçbir şey yazma, belge yanlışsa kod değil ADT yazılır (§11.2).

GÖREV K-01: geo/ kütüphanesini, motor/rng.js'yi ve Node birim testlerini yaz.
Okuman gerekenler: §0, §1, §2.2, §3.2 (tüm imzalar), §3.2.1, §5.1, §6.1, §6.3, §6.5, §9.

Kurallar:
- Saf ES2020 modül, bağımlılık yok, Node 20. geo/ hiçbir şeyi import etmez; DOM, Date,
  performance, Math.random yok. uretici.js fonksiyonları rng'yi PARAMETRE olarak alır.
- §3.2'deki her fonksiyon adı, parametre sırası/sayısı ve dönüş şekli birebir. geo/index.js
  hepsini dışa aktarır. Fazla export yok (npm run imza kırmızı sayar).
- cokgen.js'de iç/dış açı toplamı, köşegen sayısı, alan, çevre, üçgen eşitsizliği fonksiyonu
  YAZMA (§9 dışlamalar 1, 2, 3, 7, 9). Math.PI yalnız aci.js içinde tek yerde (derece↔radyan).
- Koordinat: y aşağı, açı derece [0,360), pozitif yön saat yönü (§0). aciOlc ham döner,
  aciOku Math.round ile tam sayı döner ama tolerans karşılaştırması yuvarlamadan önce.
- Kesişim garantisi: |r1−r2|+ε < |AB| < r1+r2−ε, ε = 0.08·min(r1,r2); eşkenar siparişinde
  r1 = r2 = |AB| kesişir.
- rng.js: mulberry32, hash32 FNV-1a, alt(etiket) = rngOlustur(hash32(seed+':'+etiket)),
  karistir Fisher–Yates yeni dizi, tamHaric halka tampon (§5.1).
- Hata: throw new Error('KOD_BUYUK_HARF'); kodlar §6.5'ten; yeni kod uydurma.
- Dosya ≤ 400 satır, fonksiyon ≤ 40 satır, satır ≤ 100, tek tırnak, noktalı virgül, 2 boşluk,
  tanımlayıcılar ASCII Türkçe (aciOlc, disBukeyMi), her export JSDoc'lu, sözleşmedeki
  @typedef adlarıyla.
- Testler node:test; describe adı fonksiyon adı, it adı Türkçe düz cümle; §6.3'teki 20 durumun
  tamamı; rastgelelik yalnız rngOlustur(1..1000) döngüsü; npm test ≤ 10 sn (aşarsa seed'i
  düşürme, dosyayı böl).
- package.json: "type":"module", scripts.test, engines.node ">=20". node_modules commit etme.
- docs/hatalar.md: §6.5'teki 10 kodu Türkçe tek cümleyle açıkla.

Teslim: dal cx-m/K-01-geo-rng, commit mesajları §7.2 ("geo(kesisim): …"), PR §7.3 şablonu;
PR gövdesine npm test çıktısını ve süreyi yapıştır. Sözleşmede eksik/çelişki gördüğün her
noktayı PR gövdesinde "ADT adayı:" başlığıyla listele, kodda kendin çözme.
```

---

## K-02 · CX-M · Motor çekirdeği + `index.html` + D01 iskeleti

- **Düzenek/modül:** `motor/` (`rng.js` ve `ctxSahte.js` hariç), `index.html`, `main.js`, `stil/`, `duzenekler/D01/` (iskelet).
- **Girdi dosyaları:** `sozlesme.md` §0, §1, §2, §3.1 (tamamı), §3.5, §4.1, §4.2, §5.1–5.3, §6.1, §6.5, §10 (tamamı); K-01'in `geo/index.js` export listesi.
- **Beklenen çıktı:**
  - `motor/motor.js`, `sahne.js`, `giris.js`, `yukleyici.js`, `ilerleme.js`, `ipucu.js`, `sembolPaneli.js`, `sunum.js`, `tahta.js`, `kopru.js`, `kayit.js`
  - `index.html` (dolap; `?mod=tahta&duzenek=&seed=` okur), `main.js` (yalnız `baslat`)
  - `stil/stil.css`, `stil/tahta.css`
  - `duzenekler/D01/D01.js` + `D01.json` (§4.4 bölüm sırasında, 9 export, çalışan asgari: iki pim + parça, `basari` tamam döner; tam D01 tasarımı sonraki bilet)
  - `docs/kapsam.json` (dolapta görünen düzenek listesi; başta `["D01"]`)
- **Kabul ölçütü:**
  1. §3.1.1 `Ctx`, §3.1.2 `Sahne`, §3.1.3 `Olay`, §3.1.4 motor imzaları birebir; `ctx.veri` `Object.freeze`; `ctx.durum` kur öncesi `{}`.
  2. `canvas`/`getContext` yalnız `sahne.js` ve `giris.js`'de; `localStorage` yalnız `kayit.js`'de (K-04 lint bunu doğrulayacak).
  3. Pim yakalama 16 px (`pxToBirim(16)`); olay sırası: `ust` katman widget → Defter → `duzenek.girdi`.
  4. `?mod=tahta` ile: kayıt okunmaz/yazılmaz, ses kapalı, `metinOlcek` 1,5, 16:9 düzen; `&seed=17` iki açılışta aynı sahne.
  5. Telefon 360 × 640'ta: tezgâh genişliğe oturur, Matik şeridi ≥ 56 px, kemer ≥ 64 px, `touch-action:none` yalnız canvas, `devicePixelRatio` ≤ 2.
  6. `kayit.js` §5.3 şemasını yazar; `semaSurumu` farklıysa göç; "kayıt bozuk" hatası hiç göstermez; iframe `sandbox="allow-scripts"` altında `localStorage` hatasını yutar.
  7. `kopru.js` yalnız `window.parent.postMessage`, mesaj şekli §10.4; `window.top`/`parent.document` yok.
  8. `ctx.widget.*` ve `ctx.defter.*` motor sarmalayıcıları: `veri.bayraklar.olcuKilidi === true` iken `aciolcer({kilitli:false})` → `throw 'OLCU_KILIDI_IHLALI'`; `sahne.sayi` kilitte sessizce çizmez. Widget/defter fabrikaları bu bilette **yer tutucu** (`throw 'WIDGET_AYAR_GECERSIZ'` değil, `'IMZA_EKSIK'`) — gerçekleri K-03 (lazer), K-05 (aciolcer) ve sonraki set.
  9. `index.html` içinde tek Türkçe cümle ("tarayıcını güncelle"); `.js` dosyalarında Türkçe cümle yok.
  10. İlk yükleme kümesi ≤ 2 MB (henüz varlık yok, ≤ 200 kB beklenir); düzenekler dinamik `import()`.
  11. Matematikçe testi: statik sunucuda (`npx serve .` ya da `python3 -m http.server`) `index.html?mod=tahta&duzenek=D01&seed=1` açılır, pim sürüklenir, Çalıştır basılır, yıldız çıkmaz (tahta), konsolda hata yok; telefon dikeyde aynı sayfa.
  12. Hakan testi: **yok** (motor PR'ı).
- **Son saat:** 4 Kas 19:00.
- **Dal:** `cx-m/K-02-motor`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-M'sin (Codex). Ekli sozlesme.md tek dayanağındır. K-01 (geo/ + rng) ayrı dalda
yazılıyor; geo/index.js'in dışa aktarım listesi §3.2'dedir, gövdesini bekleme, imzayı kullan.

GÖREV K-02: motor çekirdeğini, index.html, main.js, stil/ ve D01 iskeletini yaz.
Oku: §0, §1, §2, §3.1 (tamamı), §3.5, §4.1, §4.2, §5.1–5.3, §6.1, §6.5, §10.

Dosyalar: motor/motor.js, sahne.js, giris.js, yukleyici.js, ilerleme.js, ipucu.js,
sembolPaneli.js, sunum.js, tahta.js, kopru.js, kayit.js; index.html; main.js (yalnız
motor.baslat çağırır); stil/stil.css, stil/tahta.css; duzenekler/D01/D01.js + D01.json;
docs/kapsam.json. motor/rng.js ve motor/ctxSahte.js bu bilette DEĞİL.

Kurallar:
- Bağımlılık yönü: geo ← widget ← motor ← main; motor her şeyi bağlar. canvas/getContext
  YALNIZ sahne.js ve giris.js'de; localStorage YALNIZ kayit.js'de.
- Ctx, Sahne, Olay, baslat/duzenekAc/calistir/ipucuVer imzaları §3.1 ile birebir. Sahne
  renkleri isimle ('mavi','turuncu','yesil','kirmizi','gri','sari'); tahta paleti
  sunum.js/tahta.js'de eşlenir. sahne.sayi ölçü kilidinde sessizce çizmez. id verilen her öğe
  vurgula(id) ve olay.hedef için yakalanır; SAHNE_ID_CAKISMA aynı karede çift id'de fırlatılır.
- Koordinat: tezgâh 1000×1000 birim, y aşağı; sahne birim→px çevirir, düzenek piksel bilmez.
  Döndürme/ayna sunum.js'de; v1'de sekliDondur çağrılmaz, altyapı dursun.
- Giriş: pointer events (dokunma + fare); yakalama 16 px → pxToBirim(16); tutulan pim 24 px
  yukarı ofsetli hayalet ile çizilir; klavye (§10.2) tuşları sürükle/tik olayına çevrilir.
  Olay sırası: katman 'ust' widget (girdi→true tüketir) → Defter → duzenek.girdi.
- yukleyici.js: duzenekler/<kod>/<kod>.js + <id>.json dinamik import(); 9 export yoksa
  IMZA_EKSIK; JSON'u Object.freeze. (Şema doğrulama K-03/K-04'te gelecek; şimdilik
  'required' alan var mı diye bak, SEMA_HATASI fırlat.)
- Tur mantığı §3.1.4; ipucu seviyeleri §3.1.4/§4.1; yıldız yalnız tamam/yanParca (§4.2 m.9).
- ctx.widget.* ve ctx.defter.* sarmalayıcıları bu bilette yer tutucu; ama olcuKilidi=true iken
  aciolcer({kilitli:false}) çağrısı OLCU_KILIDI_IHLALI fırlatmalı (sarmalayıcıda, widget'ta
  değil). ctx.matik.soyle anahtarı veri.matik ∪ veri.nedenler ∪ veri.etiketler'de arar, yoksa
  MATIK_ANAHTAR_YOK.
- kayit.js: anahtar 'matik.atolye.tema1', şema §5.3, kimlik alanı yok, ≤ 8 kB, yazma yalnız
  basari().tamam sonrası ve ayar değişince, yıldız yalnız artar, göç kuralı, erişim hatasını
  yut (iframe sandbox). ?mod=tahta: okuma/yazma yok, gecmis = [].
- tahta.js: §10.2 URL parametreleri ve varsayılanları birebir; tolerans/dondur v1'de yok sayılır.
- kopru.js: yalnız window.parent.postMessage, mesaj şekli §10.4, document.referrer kökenine,
  referrer yoksa göndermez; window.top yasak.
- Telefon dikey birinci hedef (§10.1): 360×640 taban, Matik şeridi ≥ 56 px, kemer ≥ 64 px,
  Defter alt çekmece ≤ %60, safe-area, touch-action:none yalnız canvas, dpr ≤ 2, px+clamp()
  (rem yok), prefers-reduced-motion'da kare(1) doğrudan. Tahta 1920×1080: sol 1080 tezgâh,
  sağ 840 sütun (§10.2).
- .js dosyalarında Türkçe cümle yok; index.html'de tek cümle ("tarayıcını güncelle") serbest.
- D01 iskeleti: §4.4 bölüm sırası, 9 export, modül düzeyinde let yok, import yok, yalnız ctx;
  iki pim + parça çizer, basari {tamam:true, yanParca:false, neden:'tamam'} döner;
  D01.json §4.3 required alanların tamamı, metinler "TODO-R1". Bu bir şablondur; Gemini
  bunu kopyalayarak başlayacak, o yüzden yorumlar açık ve Türkçe olsun.
- Dosya ≤ 400 satır (sahne.js aşarsa sahneCizim.js'e böl), fonksiyon ≤ 40, hata kodları §6.5.

Teslim: dal cx-m/K-02-motor, §7.2 commit, §7.3 PR. PR gövdesinde: statik sunucuda
?mod=tahta&duzenek=D01&seed=1 ve telefon dikey için ne denediğin; ilk yükleme kB;
"ADT adayı:" listesi.
```

---

## K-03 · CX-M · `ctxSahte.js` + `kuru.js` + `seedTesti.js` + `sema.json` + `iskelet.js` + `widget/lazer.js`

- **Düzenek/modül:** `motor/ctxSahte.js`, `araclar/kuru.js`, `araclar/seedTesti.js`, `sema.json`, `iskelet.js`, `widget/lazer.js`.
- **Girdi dosyaları:** `sozlesme.md` §3.1.2, §3.3 (lazer), §3.5, §4 (tamamı), §5.1, §6.2 (8. satır), §6.4, §9; K-01 `geo/`, K-02 `motor/`.
- **Beklenen çıktı:**
  - `motor/ctxSahte.js` (`ctxSahteOlustur`, `sahneKaydi`)
  - `araclar/kuru.js` (`node araclar/kuru.js <js> <json> <seed> [--tahta] [--dokum]`)
  - `araclar/seedTesti.js` (`npm run seed`)
  - `sema.json` (§4.3 birebir) + `iskelet.js` (20 geçerli boş JSON: D01–D08, D09a–f, D10a–b, D11, D12, D12b, D13–D18 → `duzenekler/Dxx/Dxx.json`, var olanı ezmez)
  - `widget/lazer.js` (§3.3 `Lazer`; `ciz`, `girdi`, `durum`, `yukle`, `hat`, `gecerMi`)
  - `test/lazer.test.js`, `test/ctxSahte.test.js`
  - `package.json` scripts: `seed`, `sema` (yalnız şema kontrolü K-04'e kadar `semaDogrula.js` yoksa `ajv` ile geçici), `iskelet`
- **Kabul ölçütü:**
  1. `node araclar/kuru.js duzenekler/D01/D01.js duzenekler/D01/D01.json 42 --dokum` çalışır; sahne çağrılarını satır satır basar; `kur → ciz → girdi → calistir → basari` zinciri.
  2. `npm run seed`: D01 × 1000 seed ≤ 10 sn; §6.2/8'deki tüm doğrulamalar kodda var (ileriki düzenekler için `D13/D14/D12b/D17/D18` kuralları düzenek id'sine göre koşullu, şimdilik atlanır ama fonksiyon olarak yazılır).
  3. `ctxSahte`: gerçek `geo` + gerçek `rng`; `sahne.*` her çağrıyı kaydeder, `sayac['sayi']` sayar; `matik.soyle` bilinmeyen anahtarda `MATIK_ANAHTAR_YOK`; `widget.lazer` gerçek nesne döndürür; `widget.aciolcer/aciTablosu/pergel/gonye` ve `defter.*` K-05/sonraki sete kadar `IMZA_EKSIK` fırlatır (seed testi bunu "atlandı" sayar, kırmızı değil).
  4. `Dxx.kuru.json` varsa olaylar sırayla `duzenek.girdi`'ye verilir; yoksa yalnız ipucu zinciri.
  5. `lazer.js`: üç mod; `hat()` `Parca|Isin|Dogru|null`; `gecerMi(noktalar, tolBirim)` `geo.dogruUzerindeMi` + parça/ışın sınırlarıyla; `ciz` uç kapaklarını moda göre (`sahne.parca/isin/dogru`); mod değişince `sembol.goster` çağırır (sembol nesnesi fabrikaya ayar ile verilir — `ctx.widget.lazer` sarmalayıcısı iletir); `girdi`: A/B pim sürükleme, `donenIsin` modunda çark; `durum()/yukle()`.
  6. `test/lazer.test.js`: 1000 seed `lazerSenaryosu` → sensörler tek doğru üzerinde, alarmlar üzerinde değil; `gecerMi` üç modda doğru sınır (parça dışı sensöre `false`).
  7. `iskelet.js` çıktısı `sema.json`'a karşı 20/20 geçerli; `kartSayisi=0`, `turSayisi=1`, `bayraklar` tümü `false`, `aciolcerGorunur` arac'a göre.
  8. Hakan testi: yok.
- **Son saat:** 5 Kas 15:00 (GM-D kuru koşusu 6 Kas 10:00 buna bağlı).
- **Dal:** `cx-m/K-03-sahte-seed`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-M'sin (Codex). Ekli sozlesme.md tek dayanağındır. main'de K-01 (geo, rng) ve K-02
(motor) var; onlara dokunma, yalnız import et.

GÖREV K-03: motor/ctxSahte.js, araclar/kuru.js, araclar/seedTesti.js, sema.json, iskelet.js
ve widget/lazer.js. Oku: §3.1.2, §3.3 (Lazer), §3.5, §4 tamamı, §5.1, §6.2 (satır 8), §6.4, §9.

1) sema.json: §4.3'teki JSON Schema'yı BİREBİR kopyala (draft-07). Ekleme/çıkarma yok.
2) iskelet.js: 20 geçerli JSON üret (D01–D08, D09a–f, D10a, D10b, D11, D12, D12b, D13–D18),
   metinler "TODO-R1", required alanların tamamı, var olan dosyayı ezme. npm run iskelet.
3) motor/ctxSahte.js: §6.4 imzaları birebir. Gerçek geo + gerçek rng; sahte sahne (her çağrı
   cagrilar'a, sayac[ad]++, çizim yok), sahte ses/matik/sembol/mod; matik.soyle anahtarı
   veri.matik ∪ nedenler ∪ etiketler'de yoksa MATIK_ANAHTAR_YOK fırlatır. widget.lazer gerçek
   Lazer döndürür; henüz yazılmamış widget/defter fabrikaları IMZA_EKSIK fırlatır. Node'da ve
   tarayıcıda çalışır (DOM yok).
4) araclar/kuru.js: node araclar/kuru.js <js> <json> <seed> [--tahta] [--dokum]. Zincir:
   kur → ciz → (Dxx.kuru.json varsa olaylar → girdi) → ipucu(1) → ciz → ipucu(3) → ciz →
   calistir().kare(0,.5,1) → bitti → basari. --dokum sahne çağrılarını satır satır basar.
   Kırmızı: istisna, olcuKilidi iken sayac.sayi>0, basari şekli bozuk, parametre aralık dışı.
5) araclar/seedTesti.js (npm run seed): docs/kapsam.json'daki her düzenek × varyant × seed
   1…1000 aynı zincir; §6.2 satır 8'deki tüm doğrulamaları yaz (D12b/D13/D14/D17/D18 kuralları
   id'ye göre koşullu; prototipik duruş ve halka tampon kontrolü genel). Çıktı özet + ilk 10
   hata; süre hedefi ≤ 90 sn/24 birim.
6) widget/lazer.js: §3.3 Lazer imzası birebir + ortak kalıp (ciz, girdi→boolean, durum(),
   yukle()). hat() moda göre Parca/Isin/Dogru; gecerMi geo.dogruUzerindeMi + parça/ışın sınırı;
   ciz uç kapaklarını moda göre çizer (sahne.parca / isin / dogru) ve katman 'ust'; mod değişince
   sembol.goster('[AB]'|'[AB'|'AB') — sembol nesnesi fabrika ayarıyla gelir (motor ve ctxSahte
   sarmalayıcıları iletir; LazerAyar'a alan EKLEME, ikinci parametre olarak ver ve bunu PR'da
   ADT adayı olarak not et). girdi: A/B pim sürükle (olay.hedef 'lazerA'/'lazerB'), donenIsin
   modunda çark (olay.dx → yon, carkAdim ile). Yalnız geo import eder.
7) Testler: test/lazer.test.js (1000 seed lazerSenaryosu tutarlılığı; gecerMi üç modda sınır),
   test/ctxSahte.test.js (kayıt defteri, MATIK_ANAHTAR_YOK).

Genel: dosya ≤ 400, fonksiyon ≤ 40, hata kodları §6.5, Math.random yok, .js'de Türkçe cümle
yok. Teslim: dal cx-m/K-03-sahte-seed, §7.2 commit, §7.3 PR; PR'a D01 için kuru.js --dokum
ilk 30 satırını ve npm run seed süresini yapıştır.
```

---

## K-04 · CX-M · `npm run check` iskeleti

- **Düzenek/modül:** `araclar/check.js`, `lint.config.js`, `yasak.js`, `sahiplik.js`, `satir.js`, `semaDogrula.js`, `imza.js`, `imzaListesi.json`, `boyut.js`, `metin.js`; `docs/yasakSozcuk.txt`; `package.json` scripts; `docs/check/`.
- **Girdi dosyaları:** `sozlesme.md` §1 (boyutlar), §2.1 (sahiplik), §3 (imza listesi kaynağı), §4.1 (9 export), §4.3 (şema notları), §5.2 (yasaklar), §6.1–6.2, §7.1 (dal önekleri), §8.4 (yasak sözcük), §9.
- **Beklenen çıktı:** 9 komutun tamamı çalışır; `npm run check` ilk kırmızıda durmaz, 9 satırlık rapor üretir ve `docs/check/<dal>-<tarih>.txt`'e yazar.
- **Kabul ölçütü:**
  1. `main` + D01 üzerinde `npm run check` **9/9 yeşil**.
  2. Kanıt testleri (`test/check.test.js`): `duzenekler/` altına geçici dosya ile her yasak satırı (`Math.random`, `localStorage` dizgisi, `document`, `import`, `setTimeout`, `console.log`, `#ff0000`, Türkçe literal, modül düzeyi `let`, `/geo/` yolu) tek tek kırmızı; `geo/`'ya `document` kırmızı; `motor/x.js`'ye `localStorage` kırmızı, `motor/kayit.js`'ye yeşil.
  3. `npm run imza`: `araclar/imzaListesi.json` (`sozlesmeSurumu: "1.0-taslak"`) §3.2/3.3/3.4 listesinden türetilmiş; D01 9 export ve `length` kontrolü; fazla export kırmızı.
  4. `npm run sema`: Ajv draft-07; §4.3 çapraz kuralları (`kartSayisi` ↔ `kartlar`, `sinama→kartSayisi≥1`, `olcuKilidi→aciolcerGorunur=false`, `.js surum === .json surum`); JS'deki `matik.soyle('x')`, `sahne.etiket(…, 'x')`, `neden:'x'` literal anahtarları JSON'da aranır.
  5. `npm run sahiplik`: dal önekinden ajan, `git diff --name-only main...HEAD`, §2.1 tablosu + Fable eki (`araclar/`, `test/` → CX-M); `m/` ve `sozlesme/` için JSON metin / `sozlesme.md` kuralı.
  6. `npm run metin`: ≤ 140, HTML yok, `docs/yasakSozcuk.txt` (§8.4 listesi birebir), `{ad}` dışı yer tutucu yok, `olcuKilidi=true` düzeneklerde rakam yok, D15 JSON'unda `180` yok.
  7. `npm run satir` ve `boyut`: §1 sınırları; ilk yükleme kümesi tanımı (`index + main + motor + geo + widget + defter + stil + varlik/matik`).
  8. Süre: `npm run check` D01 ile ≤ 60 sn. `devDependencies` yalnız `eslint`, `ajv`; `node_modules` commit yok.
  9. Hakan testi: yok.
- **Son saat:** 5 Kas 17:00 (KN1 19:00'da Matematikçe `main` üstünde koşar).
- **Dal:** `cx-m/K-04-check`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-M'sin (Codex). Ekli sozlesme.md tek dayanağındır. main'de K-01, K-02, K-03 var.

GÖREV K-04: npm run check iskeleti (§6.2 tablosu, 9 komut, sıra sabit, ilk kırmızıda durmaz,
hepsini raporlar). Oku: §1, §2.1, §3, §4.1, §4.3 notları, §5.2, §6.1–6.2, §7.1, §8.4, §9.

Dosyalar: araclar/check.js, lint.config.js (ESLint flat), yasak.js, sahiplik.js, satir.js,
semaDogrula.js, imza.js, imzaListesi.json, boyut.js, metin.js; docs/yasakSozcuk.txt;
package.json scripts (check, lint, yasak, sahiplik, satir, sema, imza, test, seed, boyut);
test/check.test.js. devDependencies yalnız eslint ve ajv.

1) lint: §6.2 satır 1 kuralları; duzenekler/** için no-restricted-globals/properties/syntax
   ile §5.2 listesi + no-restricted-imports ["*"]; geo/** için DOM globalleri yasak;
   files filtresi: canvas/getContext yalnız motor/sahne.js, motor/giris.js; localStorage
   yalnız motor/kayit.js; Math.PI yalnız geo/aci.js. Modül düzeyi let/var duzenekler'de yasak.
2) yasak.js: regex taraması — "localStorage" dizgisi, window['document'], /geo/ /motor/
   /defter/ /widget/ yol dizgileri, Türkçe karakterli literal, 3+ sözcüklü literal, #rrggbb,
   rgb(, querySelector, sekliDondur (düzenekte), console.
3) sahiplik.js: dal öneki → ajan (§7.1), git diff --name-only main...HEAD, §2.1 tablosu;
   ek: araclar/, test/, docs/hatalar.md, motor/ctxSahte.js → CX-M. araclar/imzaListesi.json
   değiştiyse PR gövdesinde "ADT-" aranır (CI'da PR gövdesi env ile gelir; yoksa uyar).
4) satir.js / boyut.js: §1 sınırları, ilk yükleme kümesi, varlik/ ≤ 1,2 MB, JSON ≤ 12 kB.
5) semaDogrula.js: Ajv draft-07 + §4.3 notlarındaki çapraz kurallar + JS literal anahtar
   taraması (matik.soyle, sahne.etiket, neden:, sahne.dugme anahtar) ↔ JSON.
6) imza.js: imzaListesi.json'u §3.2, §3.3, §3.4 ve §4.1'den üret (ad + parametre sayısı);
   her düzeneği import() et, tam 9 export; geo/index.js, widget/*, defter/* listeyle birebir
   (henüz yazılmamış widget/defter dosyaları "bekleniyor" olarak sarı, kırmızı değil).
7) metin.js: §8 makineyle ölçülebilen kısım; docs/yasakSozcuk.txt §8.4 listesi birebir.
8) check.js: 9 komutu sırayla koşar, her biri için ✓/✗ + ilk 10 bulgu, docs/check/<dal>-<tarih>.txt
   yazar, çıkış kodu kırmızı sayısı.
9) test/check.test.js: geçici dosya ile her yasağın gerçekten yakalandığını kanıtla.

Teslim: dal cx-m/K-04-check, PR'a main üstünde npm run check 9 satırını yapıştır. ESLint
kuralı sözleşmedeki bir yasağı karşılayamıyorsa yasak.js regex'iyle kapat ve PR'da belirt.
```

---

## G-01 · GM-D · D02 Lazer Hattı (kuru yazım, motor yok)

- **Düzenek/modül:** `duzenekler/D02/D02.js`, `D02.json`, isteğe bağlı `D02.kuru.json`.
- **Girdi dosyaları:** `sozlesme.md` §0, §2, §3.1 (`ctx`, `Sahne`, `Olay`), §3.3 (yalnız `Lazer`), §3.4 (bu düzenekte Defter kullanılmaz), §4 (tamamı; §4.4 şablon sırası), §5, §6.1, §6.4, §8, §9. K-02 `D01.js` iskeleti (şablon olarak; Matematikçe yapıştırır).
- **Beklenen çıktı:** Sohbet çıktısı; her dosya `// DOSYA: duzenekler/D02/D02.js · satır: N` başlığıyla. Matematikçe `gm/G-01-D02` dalına yazar, K-03 birleşince `node araclar/kuru.js … 42 --dokum` koşar; kırmızıysa `docs/check` çıktısıyla Gemini'ye döner.
- **Tasarım çerçevesi (Fable):** Her tur `ctx.geo.lazerSenaryosu(rng)` → `{mod, sensor[], alarm[]}`. Sipariş: lazer kafası `mod`'a göre hat kursun (parça: iki uçlu, ışın: bir uç, doğru: iki uç açık); hat **tüm sensörlerden geçsin, hiç alarma değmesin**. Öğrenci A ve B pimlerini sürükler (lazer widget'ı), hazır olunca Çalıştır; `calistir` ışığın A'dan hat boyunca akışını `t` ile çizer; `basari` `lazer.gecerMi(sensor, tol)` hepsi `true` ve `gecerMi(alarm, tol)` hepsi `false` → `tamam`; aksi `sensorKacti` / `alarmYandi` / `yarimKaldi`. Mod şalteri **sipariş tarafından verilir**, öğrenci seçmez (v1); üç tur, her turda farklı mod (`rng.karistir(['parca','isin','dogru'])`). Kapsam `5.3.1`. Ölçü kilidi yok, açıölçer görünmez, kart yok. Tolerans: `TOLERANS.pimYakalamaPx` → `sahne.pxToBirim`. Dışlama: koordinat etiketi yok (§9/12), hat uzunluğu sayısı yok.
- **Kabul ölçütü:**
  1. 9 export, §4.4 bölüm sırası, `import` yok, modül düzeyi `let` yok, yalnız `ctx`.
  2. `kur` çizmez; `ciz` durum değiştirmez; `calistir` `{sure, kare, bitti}`; `basari` yan etkisiz.
  3. `D02.json` §4.3 şemasıyla geçerli; metinler §8 tonunda (giriş: "Lazer kafası kapağa takıldı. Hattı kur, sensörler ışığı görsün."); `ipucu[2].ne` düz Türkçe; `nedenler.tamam/sensorKacti/alarmYandi/yarimKaldi`.
  4. `ipucu(1)` hattın değmediği sensörü/alarma değdiği yeri `vurgula`; `ipucu(2)` `{anahtar:'i2'}`; `ipucu(3)` A pimini ilk sensöre oturtur (ilk adım; B'ye dokunmaz).
  5. Kuru koşu seed 42, 7, 1000: istisna yok, `sayi` çağrısı 0, `basari` şekli doğru, `ipucu(3)` sonrası `basari().tamam` hâlâ `false` (ilk adım tam çözüm değil).
  6. `D02.kuru.json` (≤ 2 kB): A ve B'yi doğru yere sürükleyen olay dizisi; bununla `basari().tamam === true`.
  7. ≤ 400 satır, fonksiyon ≤ 40; sihirli tolerans sayısı yok.
  8. Hakan testi (6 Kas, `?mod=tahta&duzenek=D02&seed=42`, Matematikçe telefonda da açar): üç satır — "sipariş anlaşılıyor mu / ışın-doğru-parça farkı görülüyor mu / Matik'in cümlesi 5. sınıfa uygun mu".
- **Son saat:** 5 Kas 18:00 teslim; kuru koşu 6 Kas 10:00; KN2 7 Kas.
- **Dal:** `gm/G-01-D02` (Matematikçe açar).
- **Yapıştırılacak ilk istem:**

```
Sen GM-D'sin (Gemini, düzenek yazarı). Depoya dokunmazsın; çıktını sohbette verirsin,
Matematikçe commit eder. Ekli sozlesme.md tek dayanağındır. Motor henüz yok: sözleşmeye
karşı "kuru" yazacaksın; Matematikçe teslimini node araclar/kuru.js ile sahte ctx üzerinde
koşturacak. Ekli D01.js iskeleti bölüm sırası için şablondur; kopyalayarak başla.

GÖREV G-01: D02 Lazer Hattı. Oku: §0, §2, §3.1 (Ctx, Sahne, Olay), §3.3 yalnız Lazer,
§4 tamamı, §5, §6.1, §6.4, §8, §9.

Tasarım (değişmez): Her tur ctx.geo.lazerSenaryosu(ctx.rng) → {mod, sensor[], alarm[]}.
Sipariş: lazer kafası mod'a göre hat kursun (parca: iki uç kapaklı, isin: bir uç açık,
dogru: iki uç açık); hat TÜM sensörlerden geçsin, HİÇ alarma değmesin. Öğrenci A ve B pimini
sürükler (widget kendi tüketir: ctx.widget.lazer({mod}) nesnesi ctx.durum.lazer'de; ciz'de
durum.lazer.ciz(ctx.sahne)); Çalıştır düğmesi (sahne.dugme, anahtar etiketler'den). calistir:
ışık A'dan hat boyunca akar, kare(t) ilerleme oranını durum'a yazar, bitti() ışığı sonda
bırakır. basari: lazer.gecerMi(sensor, tol) hepsi true ve gecerMi(alarm, tol) hepsi false →
{tamam:true, yanParca:false, neden:'tamam'}; değilse neden 'sensorKacti' | 'alarmYandi';
A veya B yoksa 'yarimKaldi'. Mod öğrenciye seçtirilmez, sipariş verir; turSayisi 3, her turda
farklı mod (rng.karistir). kapsam ["5.3.1"], arac "A", zorluk 1, bayraklar hepsi false
(aciolcerGorunur false), kartSayisi 0. Tolerans: TOLERANS.pimYakalamaPx →
ctx.sahne.pxToBirim; sayı yazma.

Kurallar (ihlal = teslim geri döner):
- Tam 9 export (id, surum, kur, ciz, girdi, calistir, basari, ipucu, tahta); §4.4 bölüm
  sırası; import satırı YOK; modül düzeyinde let/var YOK; her şey ctx'ten.
- kur çizmez, DOM bilmez, rng'yi yeniden seed'lemez. ciz durum değiştirmez. basari yan etkisiz.
- §5.2 yasaklar: Math.random, document, window, canvas, setTimeout, Date, console, fetch,
  hex renk, Türkçe karakterli string literal, 3+ sözcüklü literal, Object.assign(ctx.veri).
  Metin yalnız JSON'da; kodda ctx.matik.soyle('anahtar'), ctx.sahne.etiket(P, 'anahtar').
- Renk adla: 'mavi','turuncu','yesil','kirmizi','gri','sari'. id'li öğeler: 'sensor0'…,
  'alarm0'…, 'lazerA', 'lazerB'; vurgula(id) bunlarla.
- ipucu(1): hattın değmediği ilk sensörü ya da değdiği alarmı vurgula; ipucu(2): {anahtar:'i2'};
  ipucu(3): yalnız A'yı ilk sensöre oturt (ilk adım; tam çözüm değil). tahta(ctx, ayarlar):
  boş bırakabilirsin ama export et.
- Tanımlayıcı ASCII Türkçe (sensorler, alarmlar, isikOrani), camelCase, tek tırnak, noktalı
  virgül, 2 boşluk, satır ≤ 100, dosya ≤ 400, fonksiyon ≤ 40, sihirli tolerans sayısı yok.
- D02.json: §4.3 şemasına birebir; semaSurumu "1.0", id "D02", kod "D02", surum "1.0.0"
  (JS ile aynı). Metinler §8: sen hitabı, ≤ 140 karakter, soru/puan/yanlış dili yok, Matik
  gözlem söyler, çözüm söylemez. Zorunlu: matik.giris ("Lazer kafası kapağa takıldı. Hattı
  kur, sensörler ışığı görsün."), basari, tekrar; nedenler.tamam, sensorKacti, alarmYandi,
  yarimKaldi; ipucu[0].vurgu, ipucu[1].metin, ipucu[2].ne (Hakan için düz Türkçe);
  etiketler.calistir "Çalıştır"; parametreler ilk anahtar ana parametre; notlar: "sınır:
  hat uzunluğu ve koordinat gösterilmez".
- D02.kuru.json (≤ 2 kB): A ve B'yi seed 42'de doğru yere sürükleyen olay dizisi
  [{tur:'bas',x,y,hedef:'lazerA'},{tur:'surukle',…},{tur:'birak',…}, …, {tur:'dugme',
  dugmeId:'calistir'}]; koordinatları lazerSenaryosu'nun seed 42 çıktısına göre açıkla.

Teslim biçimi: üç blok, her biri ilk satırda // DOSYA: duzenekler/D02/<ad> · satır: N.
Sonra 5 satırlık "Dışlama kontrolü" (§9'dan 12, 15) ve varsa "ADT adayı" (sözleşmede
bulamadığın şey; kodda uydurma, geçici çözümü yaz). Sözleşmede ne eksik gördüysen sor,
tahmin etme.
```

---

## K-05 · CX-A · `widget/aciolcer.js` + Node testi

- **Düzenek/modül:** `widget/aciolcer.js`, `test/aciolcer.test.js`.
- **Girdi dosyaları:** `sozlesme.md` §0 (açı yönü), §2.2, §3.1.2–3.1.3, §3.2 (`aci.js`, `tolerans.js`), §3.2.1, §3.3 (`Aciolcer`), §3.5, §6.1, §6.4, §9 (8, 13), §10.1 (dokunma), §10.5. `main`'deki `geo/`, `motor/ctxSahte.js`, `widget/lazer.js` (kalıp örneği).
- **Beklenen çıktı:** `widget/aciolcer.js` (≤ 400; aşarsa `widget/aciolcerCizim.js`), `test/aciolcer.test.js`.
- **Kabul ölçütü:**
  1. §3.3 `Aciolcer` imzası birebir + ortak kalıp (`ciz`, `girdi→boolean`, `durum()`, `yukle()`); `AciolcerAyar` dışında ayar yok.
  2. `hizasiz` varsayılan `true`: 1000 seed'de dönüş 0–359 düzgün, kayma ±240 birim içinde, soket üstüne denk gelen (merkez yakalama içinde) başlangıç yok.
  3. `olcekYonu:'rastgele'` 1000 seed'de yaklaşık yarı yarıya `'ic'/'dis'`.
  4. `hizaliMi(soket, baslangicYon)`: merkez `pimYakalamaPx` birimi içinde, sıfır çizgisi `aciOkuma` (±3°) içinde → `{merkezTamam, sifirTamam}`; iki koşul ayrı raporlanır.
  5. `okuma(kolYon)` `geo.aciOku` ile tutarlı: `dogru` alanı `olcekYonu`'na eşit; `ic + dis === 180` (0 ve 180 hariç).
  6. `hizala()` sonrası `hizaliMi` ikisi de `true`.
  7. `kilitli:true` iken `ciz` hiçbir sahne çağrısı yapmaz, `girdi` `false` döner.
  8. `ciz`: katman `'ust'`; yarım daire gövde, iç ve dış ölçek **farklı desen** (renk tek başına bilgi taşımaz, §10.5), 10°'lik çentik, 0/90/180 kalın; **ölçek sayıları** `sahne.sayi` ile değil `sahne.etiket`/çizgi ile — yani açıölçer üstündeki rakamlar `sahne.sayi` çağrısı değildir (ölçü kilidi sayacı yalnız düzenek okumasını sayar) → bu ayrım için `sahne.gorsel('aciolcer', 'varlik/ui/aciolcer.svg', …)` tercih edilir, varlık gelene kadar çizgi+etiket.
  9. `girdi`: merkez tutma → sürükle; kenar tutma (merkezden `r·0,7` dışı) → döndür (`yonAci` farkı); 16 px yakalama `sahne.pxToBirim`.
  10. Ayna/dönüş yok: widget mantıksal koordinatta; `aciOku` yön soyutlamasını kullanır.
  11. `npm run check` 9/9 yeşil; `imza` widget satırı yeşil (sarıdan çıkar).
  12. Hakan testi: 7 Kas D09a ile birlikte.
- **Son saat:** 6 Kas 19:00.
- **Dal:** `cx-a/K-05-aciolcer`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-A'sın (Codex). Sahipliğin: widget/aciolcer.js ve duzenekler/D09/. Başka dosyaya
dokunamazsın; ihtiyaç varsa ADT (§11.2). Ekli sozlesme.md tek dayanağındır. main'de geo/,
motor/, motor/ctxSahte.js, widget/lazer.js ve npm run check var.

GÖREV K-05: widget/aciolcer.js + test/aciolcer.test.js. Oku: §0 (açı yönü, y aşağı), §2.2,
§3.1.2–3.1.3, §3.2 aci.js ve tolerans.js, §3.2.1, §3.3 Aciolcer, §3.5, §6.1, §6.4, §9 (8, 13),
§10.1, §10.5. widget/lazer.js'yi ortak kalıp örneği olarak oku.

Kurallar:
- Yalnız geo import eder; DOM yok; çizim verilen sahne üzerinden, katman 'ust'.
- Fabrika ayarı §3.3 AciolcerAyar ile birebir; alan ekleme. Nesne: merkez, donus, olcekYonu,
  hizaliMi, okuma, hizala, ciz, girdi + ortak kalıp durum()/yukle().
- hizasiz (varsayılan true): rng ile dönüş 0–359, kayma ±240 birim; rng parametre olarak
  ayarla gelmiyor → ikinci parametre olarak rng al (motor/ctxSahte sarmalayıcısı iletir),
  PR'da ADT adayı olarak yaz.
- hizaliMi(soket, baslangicYon): merkez ≤ pimYakalamaPx birimi (sahne.pxToBirim(16)), sıfır
  çizgisi ≤ TOLERANS.aciOkuma; iki alan ayrı.
- okuma(kolYon): geo.aciOku(merkez, donus, kolYon, olcekYonu) → {ic, dis, dogru}. Yön
  soyutlaması aci.js'dedir; "ekranda sağ mı" diye bakma.
- kilitli: ciz hiçbir şey çizmez, girdi false döner. Sayılar: ölçek rakamları sahne.sayi ile
  DEĞİL (o çağrı ölçü kilidi sayacıdır); varlik/ui/aciolcer.svg gelene kadar çizgi + etiket.
- İç/dış ölçek eş renk değil ve farklı desen (§10.5); 10° çentik, 0/90/180 kalın.
- girdi: merkez tutunca sürükle, kenar tutunca döndür (geo.yonAci farkı); sürükleme olay.dx/dy;
  tüketince true.
- Derece tam sayı; donus Math.round; toleranslar TOLERANS'tan, sihirli sayı yok.
- Test: node:test, ctxSahteOlustur ile sahte sahne; 1000 seed (rngOlustur) hizasiz dağılımı,
  olcekYonu oranı, hizaliMi/hizala, okuma tutarlılığı (ic+dis=180), kilitli davranışı.
- Dosya ≤ 400 (aşarsa widget/aciolcerCizim.js, yine senin sahipliğinde — ADT ile bildir),
  fonksiyon ≤ 40, ASCII tanımlayıcı, .js'de Türkçe cümle yok.

Teslim: dal cx-a/K-05-aciolcer, §7.2 commit ("widget(aciolcer): …"), §7.3 PR, npm run check
9/9 çıktısı, ADT adayları.
```

---

## K-06 · CX-A · D09a (Robot Kolu, varyant a)

- **Düzenek/modül:** `duzenekler/D09/D09.js`, `D09a.json`, `D09a.kuru.json`.
- **Girdi dosyaları:** `sozlesme.md` §3.1, §3.2, §3.2.1 (`aciRaf`, `tAci`), §3.3 (`Aciolcer`; robot kolu widget değildir), §4 (tamamı), §5, §6.1, §6.4, §8 (D09 örnekleri), §9. `main`'deki `widget/aciolcer.js` (K-05), `duzenekler/D01/D01.js` şablonu, `duzenekler/D02/` (karşılaştırma).
- **Tasarım çerçevesi (Fable):** Tezgâhta A pimi (kol ekseni), kol1 sabit yönde (`rastgeleYon`), sipariş rafı: hedef açı `rastgeleAci(rng, parametreler.aci, {cirkin:…, haric:gecmis})`, raf genişliği zorluk 1 → 16° (`tAci = 8`). Açıölçer hizasız gelir (`hizasiz:true`, `olcekYonu:'rastgele'`). Öğrenci: (1) açıölçeri A'ya oturtur, sıfırı kol1'e getirir; (2) kol2'yi (robot kolu, `sahne.isin/gorsel` ile düzenek çizer) sürükleyerek açıölçerde siparişi okur; (3) Çalıştır → kol hedefe döner (`kare(t)` kol yönünü ara değere getirir), **tutma**: kol hedef rafın içinde durursa parça alınır. `basari`: `aciFark(gercek, hedef) ≤ tAci` → `tamam`; `hizaliMi` ikisi `false` ise `aciolcerYerinde Degil`; okuma yanlış ölçekten (`okuma().dogru !== olcekYonu` ve fark ≈ 180−hedef) → `olcekTers`; aksi `rafDisi`. Kol uzunluğu `rastgeleKolUzunlugu` (ters orantı tuzağı: uzun kol dar açı). `turSayisi` 2. Kapsam `5.3.2`. Sayı: açıölçer okuması ekranda `sahne.sayi` ile gösterilir (ölçü kilidi kapalı), hedef rafta sayı yazılır. Varyant b–f ayrı bilet.
- **Kabul ölçütü:**
  1. 9 export, `id='D09'`, JSON `id:'D09a'`, `kod:'D09'`, `surum` eşit; §4.4 sırası; `import` yok; modül düzeyi `let` yok.
  2. `kur`: `ctx.widget.aciolcer({soket:A, hizasiz:true, olcekYonu:'rastgele'})`; hedef `rng.tamHaric(min,max,durum.gecmis,5)`; `parametreler.aci` ilk anahtar; `ipucu(1)` açıölçer merkezini/`A`'yı vurgular; `ipucu(3)` yalnız `aciolcer.hizala()` (ilk adım; kol2'ye dokunmaz); `ipucu[2].ne`: "Açıölçerin merkezi A pimine oturtulur, sıfır çizgisi kol üstüne getirilir."
  3. `basari` nedenleri: `tamam`, `olcekTers`, `rafDisi`, `aciolcerYerindeDegil`, `yarimKaldi`; §8 tonunda (D09 `olcekTers` örneği birebir).
  4. Prototipik duruş yok: kol1 yönü 0/90/180/270 ±3° üretilmez (`uretici` sağlar; test kanıtlar).
  5. `npm run seed` D09a × 1000 ≤ 10 sn, kırmızı yok; halka tampon komşuluğu (5°) ihlal edilmez.
  6. `D09a.kuru.json`: açıölçeri hizalayıp kol2'yi hedefe getiren olay dizisi → `tamam:true`; ikinci dizi (yanlış ölçek) → `olcekTers`.
  7. `npm run check` 9/9 yeşil; ≤ 400 satır (D09.js varyant b–f'yi de taşıyacak, **bu bilette ≤ 300** hedefle).
  8. Matematikçe: telefon dikeyde (360 px) açıölçer parmakla döndürülebiliyor, kol sürüklenebiliyor; tahtada `?mod=tahta&duzenek=D09a&seed=17`, `seed=42`, `seed=101`.
  9. Hakan testi (7 Kas, KN2 öncesi, üç satır): "hizasız açıölçeri öğrenci kendisi oturtur mu / iç-dış ölçek karışıklığı Matik'in cümlesiyle fark edilir mi / sipariş rafı 16° makul mu (§11.1 tolerans kararı)".
- **Son saat:** 7 Kas 17:00 → KN2 19:00.
- **Dal:** `cx-a/K-06-D09a`.
- **Yapıştırılacak ilk istem:**

```
Sen CX-A'sın (Codex). Sahipliğin: widget/aciolcer.js (main'de, K-05) ve duzenekler/D09/.
Ekli sozlesme.md tek dayanağındır; motor, geo, ctxSahte, kuru.js ve npm run check main'de.

GÖREV K-06: duzenekler/D09/D09.js + D09a.json + D09a.kuru.json (yalnız varyant a; b–f sonra).
Oku: §3.1, §3.2 (aci.js, uretici.js, tolerans.js), §3.2.1 aciRaf/tAci, §3.3 Aciolcer ve
"robot kolu widget değildir" notu, §4 tamamı, §5, §6.1, §6.4, §8 (D09 örnek cümleleri), §9.
duzenekler/D01/D01.js'yi şablon sırası için, D02'yi kuru.json örneği için oku.

Tasarım (değişmez): A pimi kol ekseni; kol1 sabit (geo.rastgeleYon, prototipik duruş yok);
sipariş rafı: hedef açı rng.tamHaric(parametreler.aci.min, .max, durum.gecmis, 5) +
rastgeleAci cirkin oranı; raf genişliği zorluk 1 → 16°, tol = TOLERANS.tAci(16) = 8.
Açıölçer: ctx.widget.aciolcer({soket:A, hizasiz:true, olcekYonu:'rastgele'}) durum'da,
ciz'de aciolcer.ciz(ctx.sahne). Robot kolu widget DEĞİL: kol2'yi sahne.isin/parca/gorsel ile
sen çiz, id 'kol2' ile sürüklenir (girdi: olay.hedef==='kol2' → durum.kol2Yon = yonAci(A, P)).
Kol uzunluğu geo.rastgeleKolUzunlugu (ters orantı tuzağı). Okuma: aciolcer.okuma(kol2Yon),
ekranda sahne.sayi ile (ölçü kilidi kapalı). Çalıştır → calistir: kare(t) kolu mevcut yönden
hedef yöne ara değerde çizer, bitti() nihai yönü yazar. basari:
  - A/kol2 yoksa 'yarimKaldi'
  - aciolcer.hizaliMi(A, kol1Yon) ikisi false → 'aciolcerYerindeDegil'
  - aciFark(kol2'nin kol1'e göre açısı, hedef) ≤ tol → tamam
  - okuma().dogru !== olcekYonu VE aciFark(180−okunan, hedef) ≤ tol → 'olcekTers'
  - aksi 'rafDisi'
turSayisi 2, kapsam ["5.3.2"], arac "C" (JSON'daki arac harfini Matematikçe doğrular),
zorluk 1, bayraklar: olcuKilidi false, aciolcerGorunur true, diğerleri false, kartSayisi 0.
ipucu(1): aciolcer merkezi hizasızsa 'pimA' vurgula, hizalıysa 'raf'; ipucu(2) {anahtar:'i2'}
("Sıfır çizgisi kolun üstünde mi? Açıölçer iki yerden sıfır başlatır." tonunda);
ipucu(3): yalnız aciolcer.hizala() — kol2'ye dokunma.

Kurallar: 9 export, export const id='D09' (JSON id 'D09a', kod 'D09', surum ikisinde
'1.0.0'); §4.4 bölüm sırası; import yok; modül düzeyi let yok; §5.2 yasakları; renk adla;
toleranslar TOLERANS'tan; metin yalnız JSON'da (§8: giris "Açıölçeri geçen vardiyadan dönük
bırakmışım. Önce onu yerine oturt.", nedenler.olcekTers "Kol durdu ama sipariş rafının
dışında. Açıölçerin öbür sırasına baktın galiba."); ipucu[2].ne Hakan için düz Türkçe; notlar:
"sınır: yalnız tam derece, ölçek yönü iç/dış". D09.js ≤ 300 satır hedef (b–f sığacak);
fonksiyon ≤ 40. D09a.kuru.json: iki olay dizisi (tamam ve olcekTers) seed 42 için, koordinat
gerekçesi yorumla.

Teslim: dal cx-a/K-06-D09a, §7.2 commit ("duzenek(D09a): …"), §7.3 PR; PR'a npm run check
9/9, npm run seed D09a süresi, kuru.js --dokum seed 42 ilk 30 satır, Hakan bağlantıları
(?mod=tahta&duzenek=D09a&seed=17 / 42 / 101), dışlama kontrolü (§9: 8, 12, 13), ADT adayları.
```

---

*Bilet seti 1 sonu. KN1 (5 Kas 19:00): K-01…K-04 `main`'de, `npm run check` 9/9. KN2 (7 Kas 19:00): G-01 ve K-06 `main`'de, Hakan'ın üçer satırı `docs/kn/kn2.md`'de. Sonraki set (K-07…: aciTablosu, pergel, gonye, defter, D01 tam, D10 ve D03–D05 GM-D) KN1 kararıyla birlikte yazılır.*