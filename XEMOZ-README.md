# OpenCode with Xemoz REST API Engine

Modifikasi OpenCode untuk menggunakan **Xemoz REST API** sebagai AI engine.

## API Format

```
GET https://api-xemoz-official.my.id/api/ai/{model}.php?pesan={message}
```

**Response:**
```json
{
    "creator": "xemoz",
    "result": {
        "reply": "AI response here"
    }
}
```

## Yang Dimodifikasi

1. **`packages/core/src/plugin/provider/xemoz-rest-client.ts`** - Client library untuk Xemoz REST API
2. **`packages/core/src/plugin/provider/xemoz-rest.ts`** - Plugin registration
3. **`packages/core/src/plugin/provider.ts`** - Menambahkan XemozRestPlugin ke provider list
4. **`packages/opencode/src/provider/provider.ts`** - Menambahkan custom loader untuk xemoz-rest
5. **`opencode.jsonc`** - Konfigurasi default menggunakan xemoz-rest

## Cara Pakai

### Opsi A — Termux (proot Ubuntu), sekali command

Masuk dulu ke proot Ubuntu-mu (`proot-distro login ubuntu`), lalu:

```bash
export OPENCODE_XEMOZ_REPO=https://github.com/<user>/<repo>.git
curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/setup-termux.sh | bash
```

Ganti `<user>/<repo>` dengan repo GitHub tempat kamu push fork ini. Script `setup-termux.sh` akan otomatis: install `git`/`curl`/`unzip` kalau belum ada, install Bun, clone repo, `bun install`, dan bikin command pendek `opencode-xemoz` yang bisa dipanggil dari mana saja.

Setelah selesai:
```bash
source ~/.bashrc   # sekali saja, biar PATH ke-reload
opencode-xemoz
```

Kalau kamu sudah clone manual duluan, tinggal masuk ke folder-nya dan jalankan `bash setup-termux.sh` tanpa perlu set `OPENCODE_XEMOZ_REPO`.

### Opsi B — Manual (semua platform)

```bash
bun install
bun run packages/opencode/src/index.ts
```

Atau build dulu:
```bash
bun run packages/opencode/script/build.ts
```

### Konfigurasi

Edit `opencode.jsonc` untuk mengubah model atau endpoint. Field `"npm": "xemoz-rest"` **wajib ada** di level provider — tanpa ini, opencode akan salah pilih SDK dan provider Xemoz tidak akan pernah terpanggil:

```jsonc
{
  "provider": {
    "xemoz-rest": {
      "npm": "xemoz-rest",
      "options": {
        "baseURL": "https://api-xemoz-official.my.id/api/ai",
        "model": "gpt-5.5",
        "timeout": 60000
      }
    }
  },
  "model": "xemoz-rest/gpt-5.5"
}
```

## Fitur

- ✅ Text generation (non-streaming)
- ✅ Simulated streaming (balasan lengkap dikirim sebagai satu chunk)
- ✅ Riwayat percakapan multi-turn (termasuk balasan assistant sebelumnya)
- ✅ Retry otomatis dengan pemotongan pesan kalau URL kepanjangan (403/414)
- ✅ Timeout handling
- ✅ Error handling
- ❌ Tool calling (API tidak support)
- ❌ Image/PDF input (API hanya text)
- ❌ Reasoning/thinking mode

## Struktur File

```
opencode/
├── packages/
│   ├── core/
│   │   └── src/plugin/provider/
│   │       ├── xemoz-rest-client.ts    # Client library
│   │       ├── xemoz-rest.ts           # Plugin definition
│   │       └── provider.ts             # Updated with XemozRestPlugin
│   ├── opencode/
│   │   └── src/provider/
│   │       └── provider.ts             # Updated with xemoz loader
│   └── ... (other packages)
├── opencode.jsonc                       # Config file
├── setup-termux.sh                      # Installer sekali-command untuk Termux (proot Ubuntu)
└── XEMOZ-README.md                      # This file
```

## Notes

- API ini menggunakan GET request, bukan POST seperti OpenAI
- Tidak ada streaming native; balasan penuh dikirim sebagai satu chunk teks
- Pesan yang sangat panjang otomatis dipotong bertahap (8000 → 2000 → 500 karakter) kalau server menolak karena URL kepanjangan
- Context window tergantung limit API server
- Gratis tanpa API key — tapi karena itu juga rawan down/limit/berubah sewaktu-waktu di luar kendali kita

## Troubleshooting

Jika error "No providers available":
1. Pastikan `opencode.jsonc` ada di root folder
2. Pastikan `enabled_providers` includes `"xemoz-rest"` (atau tidak diisi sama sekali, artinya semua provider yang ada di config diizinkan)
3. Pastikan `"npm": "xemoz-rest"` ada di config provider
4. Pastikan format JSON valid (hapus komentar jika perlu)

Jika timeout:
- Increase `timeout` di options (default 60 detik)
- Cek koneksi internet ke API server

Jika `bun install` gagal di Termux/proot:
- Pastikan sudah `apt-get update` dan storage cukup (`df -h`)
- Coba jalankan ulang `setup-termux.sh` — bun install aman di-retry
