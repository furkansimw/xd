# ⚡ SocketChat

Gerçek zamanlı, veritabanısız sohbet uygulaması.  
**Node.js + Express + Socket.IO** — tüm veriler bellekte tutulur.

---

## 🚀 Kurulum & Çalıştırma

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Sunucuyu başlat
npm start

# veya geliştirme modunda (otomatik yeniden başlatma)
npm run dev
```

Tarayıcıda aç: **http://localhost:3000**

Birden fazla sekme / tarayıcı açarak test edebilirsin.

---

## 🗂️ Proje Yapısı

```
socketio-chat/
├── server.js          ← Express + Socket.IO sunucusu
├── package.json
└── public/
    ├── index.html     ← Tek sayfa uygulama
    ├── style.css      ← Dark terminal teması
    └── app.js         ← Socket.IO istemci mantığı
```

---

## ✨ Özellikler

| Özellik | Detay |
|---|---|
| **Çoklu oda** | genel / teknoloji / oyun / müzik |
| **Gerçek zamanlı mesajlaşma** | Socket.IO WebSocket |
| **Yazıyor göstergesi** | Renkli kullanıcı adıyla |
| **Oda geçmişi** | Son 50 mesaj (bellekte) |
| **Online kullanıcı listesi** | Odaya özel, renkli |
| **Bağlantı durumu** | Canlı badge |
| **Sistem mesajları** | Katılım / ayrılma |
| **Benzersiz renkler** | Her kullanıcıya otomatik |

---

## 🛠️ Socket Olayları

### Sunucu → İstemci
| Olay | Açıklama |
|---|---|
| `history` | Oda geçmişi (son 50 mesaj) |
| `message` | Yeni mesaj (chat veya system) |
| `room:users` | Odadaki kullanıcı listesi |
| `rooms:update` | Tüm odaların meta bilgisi |
| `typing` | Kullanıcı yazıyor |
| `typing:stop` | Kullanıcı yazmayı bıraktı |
| `error` | Hata mesajı |

### İstemci → Sunucu
| Olay | Açıklama |
|---|---|
| `user:join` | Odaya katıl |
| `room:switch` | Oda değiştir |
| `message:send` | Mesaj gönder |
| `typing:start` | Yazıyor bildir |
| `typing:stop` | Yazmayı bırak |

---

> **Not:** Sunucu yeniden başlatıldığında tüm mesajlar silinir.  
> Kalıcılık için Redis veya bir veritabanı entegre edebilirsin.
