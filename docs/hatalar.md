# Hata kodları

Kaynak: [Sözleşme v1, §6.5](sozlesme_v1.md#65-tanımlı-hata-kodları-docshatalarmd-cx-m-başlatır).
Kodlar motor ve geo tarafından `throw new Error('KOD')` biçiminde kullanılır.

| Kod | Açıklama |
| --- | --- |
| `SEMA_HATASI` | Düzenek verisi sözleşmedeki JSON şemasını veya çapraz doğrulama kurallarını sağlamaz. |
| `DUZENEK_YOK` | İstenen düzenek yüklenememiştir. |
| `IMZA_EKSIK` | Beklenen modül dışa aktarımı veya işlev imzası eksiktir ya da sözleşmeye uymaz. |
| `MATIK_ANAHTAR_YOK` | İstenen metin anahtarı düzeneğin izin verilen metin alanlarında bulunmaz. |
| `OLCU_KILIDI_IHLALI` | Ölçü kilidinin izin vermediği bir ölçme veya sayı gösterme işlemi denenmiştir. |
| `PARAMETRE_ARALIK_DISI` | Bir parametre izin verilen aralığın dışındadır veya kısıtları sağlayan değer kalmamıştır. |
| `RNG_SEED_GECERSIZ` | Rastgele sayı üretecinin başlangıç değeri geçerli bir uint32 değildir. |
| `KAYIT_SEMA_GOCU` | Saklanan kaydın şema sürümü güncel kayıt biçimine dönüştürülmelidir. |
| `SAHNE_ID_CAKISMA` | Aynı sahnede birden fazla öğe aynı kimliği kullanır. |
| `WIDGET_AYAR_GECERSIZ` | Araç fabrikasına verilen ayarlar sözleşmedeki gereksinimleri sağlamaz. |
