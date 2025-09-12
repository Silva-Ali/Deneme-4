# Silva | Aktif Stok Takip Sistemi

Bu depo, **Firebase Realtime Database** kullanan tek sayfalık bir stok takip uygulaması içerir. Ürünleri listeleme, yeni ürün ekleme, düzenleme ve silme gibi temel işlemleri destekler. Arayüz tamamen tarayıcıda çalışır ve herhangi bir arka uç servisine ihtiyaç duymaz.

## Kurulum
1. Depoyu klonlayın veya indirin:
   ```bash
   git clone <repo-url>
   cd Deneme-4
   ```
2. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni bir proje oluşturun.
3. Proje ayarlarından **Realtime Database**'i etkinleştirin ve erişim kurallarını düzenleyin.

## Kullanım
1. `index.html` dosyasını doğrudan tarayıcıda açabilir veya basit bir statik sunucu ile çalıştırabilirsiniz:
   ```bash
   # Python ile
   python -m http.server
   ```
2. Tarayıcıda `http://localhost:8000/index.html` adresini ziyaret edin.
3. Ürün formundan yeni kayıtlar ekleyin; panel üzerinden listeyi filtreleyin veya dışa aktarın.

## Firebase Yapılandırması
Uygulama Firebase bağlantı bilgilerini doğrudan `index.html` içerisinde tutar. Aşağıdaki nesneyi kendi proje bilgilerinizle güncelleyin:
```html
<script>
    const firebaseConfig = {
        apiKey: "<API_KEY>",
        authDomain: "<AUTH_DOMAIN>",
        databaseURL: "<DATABASE_URL>",
        projectId: "<PROJECT_ID>",
        storageBucket: "<STORAGE_BUCKET>",
        messagingSenderId: "<SENDER_ID>",
        appId: "<APP_ID>",
        measurementId: "<MEASUREMENT_ID>"
    };
    firebase.initializeApp(firebaseConfig);
</script>
```
Aynı bölüm `index.html` dosyasında **335-349** satırları arasında bulunur.

## Örnek Veri
`sample-data.json` dosyası, Firebase Realtime Database'e aktarabileceğiniz örnek ürün verilerini içerir. Konsoldaki **Import JSON** seçeneği ile içeri aktarabilirsiniz.

```json
{
  "products": {
    "sample1": {
      "name": "Örnek Ürün",
      "sku": "ORNEK-001",
      "price": 100,
      "quantity": 50,
      "status": "Stokta",
      "date": "2024-05-26"
    }
  }
}
```

## Lisans
Bu proje açık kaynaklıdır ve dilediğiniz gibi uyarlayabilirsiniz.
