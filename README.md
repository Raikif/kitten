# 🐱💣 Exploding Kittens - Multiplayer Web Game

Game kartu multiplayer berbasis web dengan Firebase Realtime Database. Versi digital dari permainan kartu populer Exploding Kittens!

## 🎮 Cara Bermain

### Setup Game
1. **Host** membuka `host.html` di layar besar/proyektor
2. Host akan mendapatkan **kode room 6 digit** dan **QR Code**
3. **Player** (2-8 orang) membuka `player.html` di ponsel/device masing-masing
4. Player scan QR atau masukkan kode room
5. Host mulai game ketika semua pemain sudah siap

### Aturan Permainan

#### Tujuan
Jangan sampai mengambil kartu **Exploding Kitten** 💣! Pemain terakhir yang survive adalah pemenangnya! 🏆

#### Jenis Kartu

**Kartu Aksi:**
- **🛡️ Defuse** - Jinakkan Exploding Kitten dan masukkan kembali ke deck
- **⚔️ Attack** - Akhiri giliran tanpa ambil kartu. Pemain berikutnya ambil 2x kartu
- **⏭️ Skip** - Akhiri giliran tanpa ambil kartu
- **🎁 Favor** - Paksa pemain lain memberikan 1 kartu pilihan mereka
- **🔀 Shuffle** - Kocok ulang deck
- **🔮 See Future** - Lihat 3 kartu teratas deck
- **🚫 Nope** - Batalkan aksi pemain lain (kecuali Exploding/Defuse)

**Kartu Kucing (Cat Cards):**
- 🌮 Taco Cat
- 🍈 Melon Cat  
- 🥔 Potato Cat
- 🧔 Beard Cat
- 🌈 Rainbow Cat

*Mainkan 2 kartu kucing yang sama untuk mencuri 1 kartu random dari pemain lain!*

#### Giliran Bermain
1. **Mainkan kartu aksi** (optional) - mainkan sebanyak yang kamu mau
2. **Ambil kartu** dari deck (wajib untuk mengakhiri giliran)
3. Jika ambil **Exploding Kitten** 💣:
   - Gunakan **Defuse** untuk survive
   - Atau kamu **meledak** dan keluar dari game! 💥

## 🚀 Fitur

✅ **Multiplayer Real-time** - 2-8 pemain  
✅ **QR Code Join** - Scan untuk join dengan cepat  
✅ **Responsive Design** - Bisa dimainkan di ponsel dan desktop  
✅ **Firebase Realtime** - Sinkronisasi instant  
✅ **Animasi Smooth** - UI menarik dengan efek visual  
✅ **Game Log** - Track semua aksi pemain  
✅ **Auto Turn Timer** - Giliran otomatis berganti  

## 🛠️ Setup Lokal

### Requirement
- Web browser modern (Chrome, Firefox, Safari, Edge)
- Koneksi internet (untuk Firebase)
- Local web server (optional, bisa langsung buka file HTML)

### Cara Menjalankan

#### Opsi 1: Langsung Buka File
```bash
# Buka index.html langsung di browser
start index.html  # Windows
open index.html   # Mac
```

#### Opsi 2: Menggunakan Live Server (Recommended)
```bash
# Install Live Server extension di VS Code
# Atau gunakan Python HTTP server
python -m http.server 8000

# Atau gunakan Node.js http-server
npx http-server -p 8000
```

Kemudian buka: `http://localhost:8000`

### Firebase Configuration
Firebase sudah dikonfigurasi di `js/firebase-config.js`. Jika ingin menggunakan Firebase project sendiri:

1. Buat project di [Firebase Console](https://console.firebase.google.com/)
2. Aktifkan **Realtime Database**
3. Setup rules untuk development:
```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```
4. Ganti config di `js/firebase-config.js` dengan config dari project kamu

## 📁 Struktur File

```
exploiding-kittens/
├── index.html          # Main menu
├── host.html           # Host screen (layar besar)
├── player.html         # Player screen (ponsel)
├── css/
│   └── style.css       # Semua styling & animasi
├── js/
│   ├── firebase-config.js  # Firebase setup
│   ├── cards.js           # Definisi kartu & deck logic
│   ├── game.js            # Core game mechanics
│   ├── host.js            # Host controller
│   └── player.js          # Player controller
└── assets/            # (optional untuk gambar/audio)
```

## 🎨 Teknologi

- **HTML5** - Struktur
- **CSS3** - Styling dengan animasi & gradien
- **Vanilla JavaScript** - Game logic
- **Firebase Realtime Database** - Real-time multiplayer sync
- **QRCode.js** - QR code generation
- **Google Fonts** - Fredoka One & Nunito

## 🐛 Troubleshooting

### Room code tidak berfungsi?
- Pastikan Firebase CDN sudah loaded (cek Console)
- Cek koneksi internet
- Refresh halaman dan coba lagi

### QR code tidak muncul?
- QRCode.js library akan load fallback text jika gagal
- Bisa langsung ketik kode room manual

### Player tidak bisa join?
- Pastikan kode room benar (6 karakter)
- Pastikan host belum start game
- Maksimal 8 pemain per room

### Game lag/lambat?
- Cek koneksi internet
- Firebase free tier cukup untuk casual play
- Untuk production, upgrade Firebase plan

## 🎯 Roadmap & Ideas

- [ ] Sound effects & background music
- [ ] Custom avatar selection
- [ ] Game statistics & leaderboard
- [ ] Replay system
- [ ] More card variants
- [ ] Tournament mode
- [ ] Chat system
- [ ] Spectator mode

## 📝 License

Free to use and modify for personal and educational purposes.

## 🙏 Credits

Inspired by the original **Exploding Kittens** card game by Elan Lee, Shane Small, and Matthew Inman (The Oatmeal).

---

**Selamat bermain! Jangan sampai meledak! 💥🐱**
