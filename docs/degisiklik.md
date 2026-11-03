# Sözleşme değişiklik günlüğü

Biçim (sözleşme, sürümleme bölümü): `sürüm · tarih · ADT · değişiklik · etkilenen · bozucu`. Sözleşme gövdesinde ilgili satırın sonuna aynı etiket eklenir; eski metin silinmez, üstü çizilir.

- v1.0.x · 3 Kas · ADT-013 · §3.3'e pergel/gönye fabrika eşlemesi: `pergelOlustur(ayar, ortam)`, `gonyeOlustur(ayar, ortam)`, `ortam` alanları, sabit sahne id'leri; ölçü kilidi denetimi sarmalayıcıda · etkilenen: widget/pergel.js, widget/gonye.js, motor/baglam.js, motor/ctxSahte.js, araclar/imzaListesi.json · bozucu: hayır
- v1.0.x · 3 Kas · ADT-014 · §3.3 AciTablosu.ciz notu `~~HTML katmanı~~ sahne`; dışa aktarım `aciTablosuOlustur(ayar, konum)`; ölçü kilidi denetimi sarmalayıcıda · etkilenen: widget/aciTablosu.js, motor/baglam.js, motor/ctxSahte.js, araclar/imzaListesi.json · bozucu: hayır
- v1.0.x · 3 Kas · ADT-015 · §3.4'e defter fabrika eşlemesi: `defterOlustur(ortam)` ve dört alt fabrika, `DefterOrtam`, `sina` seed'i `~~rng.alt('sina', sayac)~~ rng.alt('sina:'+c)` (§5.1), `durum.gorulen` düzeneğe ait, `hucreKoy`/`disliCevir`; bayrak denetimi sarmalayıcıda · etkilenen: defter/*.js, motor/baglam.js, motor/ctxSahte.js, motor/motor.js, araclar/imzaListesi.json · bozucu: hayır
